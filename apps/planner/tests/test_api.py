import json

import jsonschema
import pytest
from fastapi.testclient import TestClient

from app.contracts import CONTRACTS
from app.main import app

client = TestClient(app)
PLAN_SCHEMA = json.loads((CONTRACTS / "schemas" / "plan.schema.json").read_text())
MEAS = json.loads((CONTRACTS / "examples" / "measurement.example.json").read_text())


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_catalog():
    tools = client.get("/catalog/tools").json()
    assert {t["id"] for t in tools} >= {"neutron_spectrometer", "gpr", "core_drill"}


def test_layers_manifest():
    data = client.get("/layers").json()
    assert "layers" in data and len(data["layers"]) > 0


def test_plan_matches_contract_and_limits():
    plan = client.post("/plan", json={}).json()
    jsonschema.validate(plan, PLAN_SCHEMA)
    s = plan["summary"]
    assert s["duration_min"] <= 8 * 60
    assert s["min_walkback_margin_min"] >= 0
    assert s["walkback_caution_min"] == 15  # de la STM, en el real y en el mock
    assert len(plan["stations"]) >= 3
    assert plan["decision_points"]


def test_replan_after_negative_measurement():
    plan = client.post("/plan", json={}).json()
    first = plan["stations"][0]
    meas = {**MEAS, "station_id": first["id"], "position": first["position"]}
    new = client.post("/replan", json={"plan_id": plan["plan_id"], "measurement": meas,
                                       "elapsed_min": 120}).json()
    jsonschema.validate(new, PLAN_SCHEMA)
    assert new["replanned_from"] == plan["plan_id"]
    assert first["id"] not in [st["id"] for st in new["stations"]]
    assert any(a["level"] == "advisory" for a in new["alerts"])
    r = new["replan"]
    assert r["from_plan_id"] == plan["plan_id"] and r["trigger"]["station_id"] == first["id"]
    assert r["recommendation"] in ("continue", "return_to_habitat") and r["reasons"]


def test_get_plan_and_campaign():
    plan = client.post("/plan", json={}).json()
    assert client.get(f"/plan/{plan['plan_id']}").json()["plan_id"] == plan["plan_id"]
    assert client.get("/plan/plan-missing").status_code == 404
    assert client.get("/plan/not a plan").status_code == 422
    c = client.get("/campaign").json()
    blind, radar = c["series"][0], c["series"][1]
    assert blind["strategy"] == "blind_drill" and radar["strategy"] == "radar_first_50"
    assert all(r > b for r, b in zip(radar["p_confirmed"], blind["p_confirmed"], strict=True))
    assert c["speedup"] > 2
    assert client.get("/campaign?evas=0").status_code == 422


def test_spaceweather_demo():
    assert client.get("/spaceweather").json()["alert"]["level"] == "warning"


def test_strategy_changes_the_plan_and_every_station_says_why():
    learn = client.post("/plan", json={"strategy": "learn"}).json()
    confirm = client.post("/plan", json={"strategy": "confirm"}).json()
    jsonschema.validate(confirm, PLAN_SCHEMA)
    assert learn["summary"]["strategy"] == "learn" and confirm["summary"]["strategy"] == "confirm"
    if not learn["summary"].get("is_mock"):  # sin datos de terreno (CI) corre el mock, sin motivos
        assert all(s.get("reason") for s in learn["stations"] + confirm["stations"])
    assert client.post("/plan", json={"strategy": "guess"}).status_code == 422


REAL = client.get("/health").json()["planner"] == "real"  # CI has no terrain layers: mock planner
needs_terrain = pytest.mark.skipif(not REAL, reason="needs data/processed terrain layers")


def test_every_plan_reports_its_habitat():
    plan = client.post("/plan", json={}).json()
    assert len(plan["habitat_xy"]) == 2 and all(isinstance(v, float) for v in plan["habitat_xy"])


@needs_terrain
def test_plan_reports_its_habitat_and_the_operator_can_move_it():
    base = client.post("/plan", json={}).json()
    assert base["habitat_xy"] == [300.0, -2200.0]
    area = {"xmin": -1200.0, "xmax": 1800.0, "ymin": -3000.0, "ymax": 600.0}
    assert base["habitat_area_m"] == area
    moved = client.post("/plan", json={"habitat_xy": [800, -1200]}).json()
    jsonschema.validate(moved, PLAN_SCHEMA)
    hx, hy = moved["habitat_xy"]
    assert abs(hx - 800) <= 50 and abs(hy + 1200) <= 50  # snapped to walkable ground
    assert {s["id"] for s in moved["stations"]} != {s["id"] for s in base["stations"]}
    # The replan keeps the operator's habitat.
    first = sorted(moved["stations"], key=lambda s: s["order"])[0]
    meas = {**MEAS, "station_id": first["id"], "position": first["position"], "result": "ice"}
    re = client.post("/replan", json={"plan_id": moved["plan_id"], "measurement": meas,
                                      "elapsed_min": 90}).json()
    assert re["habitat_xy"] == moved["habitat_xy"]


@needs_terrain
def test_habitat_outside_the_planning_area_is_rejected_with_a_reason():
    r = client.post("/plan", json={"habitat_xy": [3000, 4000]})
    assert r.status_code == 422
    assert "planning area" in r.json()["detail"]



def _walkback(plan_id, x, y):
    return client.get("/walkback", params={"plan_id": plan_id, "x": x, "y": y})


def test_walkback_validates_its_input():
    pid = client.post("/plan", json={}).json()["plan_id"]
    assert _walkback("plan-nope", 0, 0).status_code == 404
    assert _walkback("../etc", 0, 0).status_code == 422
    assert _walkback(pid, "nan", 0).status_code == 422
    assert _walkback(pid, "a", 0).status_code == 422


@needs_terrain
def test_walkback_is_the_fastest_route_to_the_habitat():
    plan = client.post("/plan", json={}).json()
    far = max(plan["stations"], key=lambda s: s["order"])
    fx, fy = far["position"]
    r = _walkback(plan["plan_id"], fx, fy)
    assert r.status_code == 200
    body = r.json()
    hx, hy = plan["habitat_xy"]
    end = body["xy"][-1]
    assert abs(end[0] - hx) <= 25 and abs(end[1] - hy) <= 25
    straight = ((fx - hx) ** 2 + (fy - hy) ** 2) ** 0.5
    assert body["distance_m"] >= straight * 0.95 and body["minutes"] > 0
    assert _walkback(plan["plan_id"], 99999, 0).status_code == 422


def _edits(plan, **moves):
    """The plan's stations in order, as /evaluate takes them, with some moved by (dx, dy)."""
    out = []
    for s in sorted(plan["stations"], key=lambda s: s["order"]):
        dx, dy = moves.get(s["id"], (0, 0))
        out.append({"id": s["id"], "position": [s["position"][0] + dx, s["position"][1] + dy]})
    return out


def test_evaluate_validates_its_input():
    assert client.post("/evaluate", json={"plan_id": "plan-nope", "stations": [
        {"position": [0, 0]}]}).status_code == 404
    pid = client.post("/plan", json={}).json()["plan_id"]
    assert client.post("/evaluate", json={"plan_id": pid, "stations": []}).status_code == 422
    assert client.post("/plan", json={"tools": ["laser_sword"]}).status_code == 422


@needs_terrain
def test_evaluate_keeps_untouched_stations_and_scores_a_move():
    base = client.post("/plan", json={}).json()
    same = client.post("/evaluate", json={"plan_id": base["plan_id"], "stations": _edits(base),
                                          "decisions": True})
    assert same.status_code == 200
    same = same.json()
    jsonschema.validate(same, PLAN_SCHEMA)
    order = sorted(base["stations"], key=lambda s: s["order"])
    assert [s["id"] for s in same["stations"]] == [s["id"] for s in order]
    assert abs(same["summary"]["duration_min"] - base["summary"]["duration_min"]) < 1
    assert same["replanned_from"] == base["plan_id"]
    assert same["decision_points"]  # committed edit: bingo and options, as a planned EVA
    # Move the first station 150 m east: it gets a new id, the operator's reason, new numbers.
    first = sorted(base["stations"], key=lambda s: s["order"])[0]
    moved = client.post("/evaluate", json={"plan_id": base["plan_id"],
                                           "stations": _edits(base, **{first["id"]: (150, 0)})})
    moved = moved.json()
    jsonschema.validate(moved, PLAN_SCHEMA)
    new_first = sorted(moved["stations"], key=lambda s: s["order"])[0]
    assert new_first["reason"] == "Placed by the operator."
    assert new_first["id"] != first["id"]
    assert moved["summary"]["distance_km"] != base["summary"]["distance_km"]


@needs_terrain
def test_evaluate_says_why_a_move_is_not_viable():
    base = client.post("/plan", json={}).json()
    pid = base["plan_id"]
    # Out of the terrain model: refused with a reason.
    far = [{"position": [9000, 9000]}]
    r = client.post("/evaluate", json={"plan_id": pid, "stations": far})
    assert r.status_code == 422 and "terrain model" in r.json()["detail"]
    # Far but on the grid: the plan comes back with a negative margin and a warning.
    edits = _edits(base)
    edits.append({"position": [1700, -800]})
    edits.append({"position": [-1100, -3600]})
    plan = client.post("/evaluate", json={"plan_id": pid, "stations": edits}).json()
    jsonschema.validate(plan, PLAN_SCHEMA)
    assert plan["summary"]["min_walkback_margin_min"] < 0
    assert any(a["level"] == "warning" and "Not viable" in a["message"] for a in plan["alerts"])


@needs_terrain
def test_plan_with_the_tools_the_crew_carries():
    all_tools = client.post("/plan", json={}).json()
    no_radar = client.post("/plan", json={"tools": ["core_drill", "sample_kit"]}).json()
    jsonschema.validate(no_radar, PLAN_SCHEMA)
    carried = {e["tool"] for e in no_radar["equipment"]}
    assert carried <= {"core_drill", "sample_kit"}
    assert {e["tool"] for e in all_tools["equipment"]} != carried
    # The replan keeps the crew's tools.
    first = sorted(no_radar["stations"], key=lambda s: s["order"])[0]
    meas = {**MEAS, "station_id": first["id"], "position": first["position"], "result": "no_ice"}
    re = client.post("/replan", json={"plan_id": no_radar["plan_id"], "measurement": meas,
                                      "elapsed_min": 60}).json()
    assert {e["tool"] for e in re["equipment"]} <= {"core_drill", "sample_kit"}
