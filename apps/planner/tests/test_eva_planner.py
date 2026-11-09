"""Planificador real sobre terreno y cráteres sintéticos (no necesita datos del sitio)."""

import copy
import json
import math

import jsonschema
import numpy as np
import pytest
from gp.observations import deeper_than, flat_floor_crater
from vision.grid import Grid

from app import eva_planner
from app.contracts import CONTRACTS, tools_by_id
from app.eva_planner import EvaConfig, EvaPlanner, requirements, station_id
from app.ice import IceModel
from app.traverse.params import TraverseParams
from app.traverse.route import TraverseMap

STM = json.loads((CONTRACTS / "examples" / "stm.s1094b.json").read_text())
# Segunda EVA: sublimación del hielo expuesto junto al cráter (decisión 2026-11-08, cuestión 43).
STM_EVA2 = json.loads((CONTRACTS / "examples" / "stm.s1094b-eva2.json").read_text())
PLAN_SCHEMA = json.loads((CONTRACTS / "schemas" / "plan.schema.json").read_text())
HALF = 1500.0
CELL = 10.0
SHALLOW = (600.0, 300.0)  # zona con cráteres de fondo plano a 0.3 m
CONFIG = EvaConfig(
    habitat_xy=(0.0, 0.0), egress_min=45, ingress_min=30, sensitive_p_ice=0.5,
    min_station_separation_m=50, believer_error_m=0.15,
)


@pytest.fixture(scope="module")
def tmap() -> TraverseMap:
    grid = Grid(
        site_id="test", proj4="+proj=eqc +R=3389574.3490888 +units=m +no_defs",
        radius_m=3389574.3490888, lat0_deg=0.0, lon0_deg=0.0,
        xmin=-HALF, xmax=HALF, ymin=-HALF, ymax=HALF, cell_size_m=CELL, nodata=-9999.0,
    )
    shape = (grid.height, grid.width)
    params = TraverseParams(20.0, 1.02, 2.0, 0.01, 0.1)
    return TraverseMap(grid, np.zeros(shape), np.zeros(shape), params)


@pytest.fixture(scope="module")
def model() -> IceModel:
    rng = np.random.default_rng(3)
    obs = []
    for _ in range(12):  # hielo somero agrupado
        x, y = np.array(SHALLOW) + rng.normal(0, 40, 2)
        obs.append(flat_floor_crater(float(x), float(y), 0.3))
    for _ in range(60):  # en el resto, cráteres que no llegaron a la capa: d > 2 m
        x, y = rng.uniform(-1400, 1400, 2)
        if math.dist((x, y), SHALLOW) > 300:
            obs.append(deeper_than(float(x), float(y), 2.0, "non_flat_crater"))
    return IceModel(obs, threshold_m=1.0, craters=len(obs))


def build(tmap, model, stm=STM, **kw):
    return eva_planner.build(stm, tmap, model, config=CONFIG, **kw)


# --- requisitos ----------------------------------------------------------------------------


def test_tools_follow_the_stm_requirement():
    catalog = tools_by_id()
    reqs, alerts = requirements(STM, catalog)
    by_rank = {r.rank: r for r in reqs}
    assert by_rank[1].tools == ["core_drill"]  # radar en la caminata; el taladro confirma
    assert by_rank[1].carried == ["gpr"]
    assert by_rank[1].is_survey and by_rank[1].min_stations == 4
    assert by_rank[3].tools == ["camera_spectrometer", "sample_kit"]  # pide muestra
    assert len(reqs) == 3  # la sublimación va en la EVA 2
    assert not alerts

    shallow = copy.deepcopy(STM)
    shallow["objectives"][0]["measurement"]["depth_max_m"] = 0.5
    assert requirements(shallow, catalog)[0][0].tools == ["neutron_spectrometer"]

    # Radar como herramienta principal (decisión del 2026-11-08): si llega al umbral, el taladro
    # confirma donde alcanza y no hay aviso.
    deep = copy.deepcopy(STM)
    deep["objectives"][0]["measurement"]["depth_max_m"] = 5
    reqs, alerts = requirements(deep, catalog)
    assert reqs[0].tools == ["core_drill"] and reqs[0].carried == ["gpr"]
    assert not any("no tool reaches" in a["message"] for a in alerts)

    beyond = copy.deepcopy(STM)
    beyond["objectives"][0]["measurement"]["depth_max_m"] = 20
    reqs, alerts = requirements(beyond, catalog)
    assert reqs[0].tools == ["core_drill"]
    assert any("no tool reaches" in a["message"] for a in alerts)


def test_station_ids_are_stable_by_position():
    assert station_id(400, 600) == "E04N06"
    assert station_id(-1200, -900) == "W12S09"
    assert station_id(0, 120) == "E00N01"


# --- plan ----------------------------------------------------------------------------------


def test_plan_goes_to_shallow_ice_and_respects_limits(tmap, model):
    plan = build(tmap, model)
    jsonschema.validate(plan, PLAN_SCHEMA)
    stations = plan["stations"]
    survey = [s for s in stations if s["kind"] == "survey"]
    assert len(survey) >= 4
    # El orden es para caminar menos; la mejor estación de hielo está en el grupo somero.
    best = max(survey, key=lambda st: st["p_ice"])
    assert math.dist(best["position"], SHALLOW) < 200
    assert best["p_ice"] > 0.5
    far = model.evaluate([-1000.0], [-1000.0])["p_ice"][0]
    assert best["p_ice"] > far

    s = plan["summary"]
    budget = STM["constraints"]["eva_max_h"] * 60 * (1 - STM["constraints"]["reserve"])
    assert s["duration_min"] <= budget + 1e-6
    assert s["min_walkback_margin_min"] >= 0
    assert all(e["walkback_margin_min"] >= 0 for e in plan["timeline"] if e["kind"] == "station")
    assert s["is_mock"] is False and s["craters_in_model"] == len(model.observations)
    assert plan["route"]["features"][0]["properties"]["routing"] == "dtm"
    # El taladro genera calor: estación sensible (protección planetaria).
    assert all(st["planetary_protection"] == "sensitive" for st in survey)


def test_stations_are_spread_out(tmap, model):
    pts = [st["position"] for st in build(tmap, model, decisions=False)["stations"]]
    for i, a in enumerate(pts):
        for b in pts[i + 1 :]:
            assert math.dist(a, b) >= CONFIG.min_station_separation_m


def test_second_eva_photographs_the_exposed_ice():
    reqs, alerts = requirements(STM_EVA2, tools_by_id())
    assert [r.tools for r in reqs] == [["camera_spectrometer"]]
    assert reqs[0].targets == [(0.0, 120.0), (-80.0, -60.0)]
    assert not alerts

def test_targets_inserted_when_near_and_objectives_attached(tmap, model):
    # Se agrega a la EVA 1 el objetivo con puntos fijos de la EVA 2, en un punto cercano.
    stm = copy.deepcopy(STM)
    fixed = copy.deepcopy(STM_EVA2["objectives"][0])
    fixed["rank"] = 4
    fixed["measurement"]["targets"] = [[150.0, -100.0]]
    stm["objectives"].append(fixed)
    plan = build(tmap, model, stm, decisions=False)
    ranks = [r for st in plan["stations"] for r in st["objective_ranks"]]
    assert {1, 2, 3, 4} <= set(ranks)
    target = next(st for st in plan["stations"] if 4 in st["objective_ranks"])
    assert math.dist(target["position"], (150.0, -100.0)) < 15
    best = max((st for st in plan["stations"] if st["kind"] == "survey"), key=lambda s: s["p_ice"])
    assert 2 in best["objective_ranks"]  # pureza: en el sitio más confiable


def test_decision_points_structure(tmap, model):
    plan = build(tmap, model)
    jsonschema.validate(plan, PLAN_SCHEMA)
    points = plan["decision_points"]
    assert 1 <= len(points) <= eva_planner.MAX_DECISION_POINTS
    ids = [st["id"] for st in plan["stations"]]
    ice = [st["id"] for st in plan["stations"] if "core_drill" in st["tools"]]
    assert [p["station_id"] for p in points] == ice[: len(points)]
    for point in points:
        at = next(e for e in plan["timeline"]
                  if e["kind"] == "station" and e["station_id"] == point["station_id"])
        # Bingo time: fin de la estación más su margen de regreso.
        assert point["decide_by_min"] == pytest.approx(
            at["t_end_min"] + at["walkback_margin_min"], abs=0.11)
        ranks = [o["rank"] for o in point["options"]]
        assert ranks == list(range(1, len(ranks) + 1))
        assert point["default_option"] in ranks
        for option in point["options"]:
            assert point["station_id"] not in option["next_station_ids"]
            for extra in option.get("next_stations", []):
                assert extra["id"] not in ids
        if point["options"][0]["if_result"] == "any":
            assert len(point["options"]) == 1


def test_decision_point_options_when_the_measurement_is_the_only_information(tmap):
    """Sin cráteres, un sí o un no en la primera estación cambia hacia dónde sigue la EVA.

    Con un grupo de cráteres cerca pueden coincidir (opción `any`): un dato más casi no mueve el
    mapa allí.
    """
    plan = build(tmap, IceModel([], threshold_m=1.0, craters=0))
    point = plan["decision_points"][0]
    by = {o["if_result"]: o for o in point["options"]}
    assert set(by) == {"ice", "no_ice", "inconclusive"}
    assert by["ice"]["next_station_ids"] != by["no_ice"]["next_station_ids"]
    assert by["ice"]["probability"] + by["no_ice"]["probability"] == pytest.approx(1, abs=2e-3)
    probs = [o["probability"] for o in point["options"][:2]]
    assert probs == sorted(probs, reverse=True)  # ordenadas por chance
    nominal = [st["id"] for st in plan["stations"]]
    k = nominal.index(point["station_id"])
    assert by["inconclusive"]["next_station_ids"] == nominal[k + 1 :]
    default = next(o for o in point["options"] if o["rank"] == point["default_option"])
    assert default["next_station_ids"] == nominal[k + 1 :]


def test_replan_after_no_ice_moves_away_and_lowers_p(tmap, model):
    plan = build(tmap, model, decisions=False)
    first = plan["stations"][0]
    tool = tools_by_id()["core_drill"]
    from gp.observations import from_measurement

    meas = {"station_id": first["id"], "tool": "core_drill", "result": "no_ice",
            "depth_m": None, "position": first["position"]}
    updated = model.with_observations([from_measurement(meas, tool)])
    p_before = model.evaluate([first["position"][0]], [first["position"][1]])["p_ice"][0]
    p_after = updated.evaluate([first["position"][0]], [first["position"][1]])["p_ice"][0]
    assert p_after < p_before

    end = next(e for e in plan["timeline"] if e["kind"] == "station")["t_end_min"]
    new = build(tmap, updated, start_xy=tuple(first["position"]), elapsed_min=end,
                completed=[first], replanned_from=plan["plan_id"], decisions=False)
    jsonschema.validate(new, PLAN_SCHEMA)
    assert new["replanned_from"] == plan["plan_id"]
    assert first["id"] not in [s["id"] for s in new["stations"]]
    assert new["timeline"][0]["kind"] == "traverse"  # sin egress: la EVA ya empezó
    assert new["timeline"][0]["t_start_min"] == pytest.approx(end)


def test_prior_only_model_warns(tmap):
    plan = build(tmap, IceModel([], threshold_m=1.0, craters=0), decisions=False)
    assert any("prior only" in a["message"] for a in plan["alerts"])


def test_schedule_rejects_unreachable_return(tmap, model):
    planner = EvaPlanner(STM, tmap, model, config=CONFIG)
    planner.plan_stops()
    assert planner.schedule([]) is not None
    far = eva_planner.Stop(1400.0, 1400.0, tmap.cell(1400.0, 1400.0), "survey",
                           [1], ["core_drill"] * 1)
    # Diez estaciones de 40 min en la esquina no entran en el presupuesto.
    assert planner.schedule([far] * 10) is None


def test_improve_removes_zigzag(tmap, model):
    planner = EvaPlanner(STM, tmap, model, config=CONFIG)
    planner.plan_stops()

    def stop(x, y):
        return eva_planner.Stop(x, y, tmap.cell(x, y), "survey", [1], ["camera_spectrometer"])

    zigzag = [stop(500, 0), stop(-500, 0), stop(600, 0), stop(-600, 0)]
    before = planner.schedule(zigzag)
    better = planner.improve(list(zigzag))
    after = planner.schedule(better)
    assert after.end_min < before.end_min - 30  # ahorra más de 30 min de caminata
    assert sorted((s.x, s.y) for s in better) == sorted((s.x, s.y) for s in zigzag)
    assert all(v.margin_min >= 0 for v in after.visits)
    assert planner.improve(list(better)) == better  # ya no mejora


def test_fast_believer_matches_a_full_refit(model):
    """La actualización local del believer da lo mismo que reajustar el GP con el dato supuesto."""
    from gp.observations import measured_depth

    gx, gy = np.meshgrid(np.arange(300.0, 901.0, 50.0), np.arange(0.0, 601.0, 50.0))
    gx, gy = gx.ravel(), gy.ravel()
    fast = full = model
    for x, y in ((600.0, 300.0), (700.0, 250.0), (450.0, 400.0)):
        fast = fast.believe(x, y, 0.15)
        mean, _ = full.post.predict(np.array([x]), np.array([y]))
        depth = float(np.exp(mean[0]))
        full = full.with_observations([measured_depth(x, y, depth, 0.15, "planned")])
    a, b = fast.evaluate(gx, gy), full.evaluate(gx, gy)
    assert np.abs(a["p_ice"] - b["p_ice"]).max() < 0.01
    assert np.abs(a["value"] - b["value"]).max() < 0.01
    assert np.argmax(a["value"]) == np.argmax(b["value"])
    assert fast.post is model.post  # no se reajustó EP
    # Lejos de los puntos supuestos, nada cambia.
    far = model.evaluate([-1200.0], [-1200.0])["p_ice"][0]
    assert fast.evaluate([-1200.0], [-1200.0])["p_ice"][0] == pytest.approx(far)
