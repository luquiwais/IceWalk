import json

import jsonschema
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
