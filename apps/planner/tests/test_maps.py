"""Mapa de hielo de la API (`GET /maps`, `map.schema.json`)."""

import json
import math

import jsonschema
import numpy as np
import pytest
from fastapi.testclient import TestClient
from gp.maps import MapGrid, decode_layer

from app import maps
from app.contracts import CONTRACTS
from app.main import app

client = TestClient(app)
MAP_SCHEMA = json.loads((CONTRACTS / "schemas" / "map.schema.json").read_text())
MEAS = json.loads((CONTRACTS / "examples" / "measurement.example.json").read_text())
SITE = MapGrid(-1000.0, 1000.0, -1000.0, 1000.0, 10.0)


def layer(payload: dict, kind: str) -> np.ndarray:
    return decode_layer(payload["layers"][kind], (payload["height"], payload["width"]))


def cell_of(payload: dict, x: float, y: float) -> tuple[int, int]:
    b, c = payload["bounds_xy_m"], payload["cell_size_m"]
    return int((b["ymax"] - y) // c), int((x - b["xmin"]) // c)


# --- ventana -------------------------------------------------------------------------------


def test_window_is_habitat_square_on_site_cells():
    w = maps.map_window((3.0, -7.0), half_m=200, margin_m=50, site=SITE)
    assert (w.xmin, w.xmax, w.ymin, w.ymax) == (-200, 210, -210, 200)
    assert w.cell_m == 10
    for edge in (w.xmin, w.xmax, w.ymin, w.ymax):
        assert edge % 10 == 0  # bordes de celda del sitio


def test_window_grows_to_far_points_and_stops_at_site_edge():
    w = maps.map_window((0.0, 0.0), [(600.0, 50.0), (-950.0, -100.0)], half_m=200, margin_m=100,
                        site=SITE)
    assert w.xmax == 700 and w.xmin == -1000  # el segundo punto llega al borde del sitio
    assert (w.ymin, w.ymax) == (-200, 200)


def test_config_values():
    half, margin = maps.map_config()
    assert half == 1500 and margin == 300


# --- API -----------------------------------------------------------------------------------


def test_base_map_matches_contract():
    r = client.get("/maps", headers={"Accept-Encoding": "gzip"})
    assert r.status_code == 200 and r.headers.get("content-encoding") == "gzip"
    m = r.json()
    jsonschema.validate(m, MAP_SCHEMA)
    assert m["plan_id"] is None and m["measurements_in_model"] == 0
    assert m["threshold_m"] == 3  # umbral de la STM de ejemplo
    b = m["bounds_xy_m"]
    assert m["width"] == round((b["xmax"] - b["xmin"]) / 10)
    assert m["height"] == round((b["ymax"] - b["ymin"]) / 10)
    assert m["is_prior_only"] == (m["craters_in_model"] == 0)
    lon = m["bounds_lonlat"]
    assert lon["west"] < lon["east"] and lon["south"] < lon["north"]
    p = layer(m, "probability")
    assert p.shape == (m["height"], m["width"]) and np.isfinite(p).all()


def test_unknown_plan_is_404():
    assert client.get("/maps", params={"plan_id": "plan-nope"}).status_code == 404


def test_replan_map_changes_only_near_the_measurement():
    plan = client.post("/plan", json={}).json()
    first = plan["stations"][0]  # la herramienta la pone la medición, no el plan
    meas = {**MEAS, "station_id": first["id"], "tool": "core_drill", "result": "no_ice",
            "depth_m": 1.0, "weh_percent": None, "position": first["position"]}
    replan = client.post("/replan", json={"plan_id": plan["plan_id"], "measurement": meas,
                                          "elapsed_min": 90}).json()

    before = client.get("/maps", params={"plan_id": plan["plan_id"]}).json()
    after = client.get("/maps", params={"plan_id": replan["plan_id"]}).json()
    jsonschema.validate(after, MAP_SCHEMA)
    assert before["measurements_in_model"] == 0
    assert after["measurements_in_model"] == 1 and after["plan_id"] == replan["plan_id"]

    # Cada estación del plan cae dentro del mapa.
    b = after["bounds_xy_m"]
    for s in replan["stations"]:
        x, y = s["position"]
        assert b["xmin"] <= x <= b["xmax"] and b["ymin"] <= y <= b["ymax"]

    # Sin hielo hasta 1 m (dato censurado: solo dice "más hondo"): donde se midió baja la duda y
    # la probabilidad de hielo a <= 3 m; a más de 3 alcances, nada cambia.
    assert after["bounds_xy_m"] == before["bounds_xy_m"]
    x, y = first["position"]
    r, c = cell_of(after, x, y)
    u0, u1 = layer(before, "uncertainty"), layer(after, "uncertainty")
    p0, p1 = layer(before, "probability"), layer(after, "probability")
    assert u1[r, c] < u0[r, c] and p1[r, c] < p0[r, c]
    far = math.ceil(400 / after["cell_size_m"])
    mask = np.ones(p0.shape, bool)
    mask[max(r - far, 0) : r + far + 1, max(c - far, 0) : c + far + 1] = False
    assert np.array_equal(p0[mask], p1[mask])

    # Mismo pedido: sale de la caché del plan.
    assert client.get("/maps", params={"plan_id": replan["plan_id"]}).json() == after


@pytest.mark.parametrize("stm_file", ["stm.s1094b-eva2.json"])
def test_far_station_widens_the_window(stm_file):
    stm = json.loads((CONTRACTS / "examples" / stm_file).read_text())
    plan = client.post("/plan", json={"stm": stm}).json()
    m = client.get("/maps", params={"plan_id": plan["plan_id"]}).json()
    jsonschema.validate(m, MAP_SCHEMA)
    b = m["bounds_xy_m"]
    for s in plan["stations"]:
        x, y = s["position"]
        assert b["xmin"] + 250 <= x <= b["xmax"] - 250 or b["xmin"] == -3250 or b["xmax"] == 3310
        assert b["ymin"] + 250 <= y <= b["ymax"] - 250 or b["ymin"] == -6740 or b["ymax"] == 4890
