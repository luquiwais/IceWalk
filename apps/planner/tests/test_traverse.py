"""Transitabilidad sobre terreno sintético (no necesita el DTM real)."""

import math

import numpy as np
import pytest
from vision.grid import Grid

from app.traverse.params import TraverseParams, default_params
from app.traverse.route import NoRouteError, TraverseMap
from app.traverse.terrain import reduce_cells, slope_deg

CELL = 10.0


def make_grid(rows: int = 20, cols: int = 30) -> Grid:
    return Grid(
        site_id="test",
        proj4="+proj=eqc +R=3389574.3490888 +units=m +no_defs",
        radius_m=3389574.3490888,
        lat0_deg=0.0,
        lon0_deg=0.0,
        xmin=0.0,
        xmax=cols * CELL,
        ymin=-rows * CELL,
        ymax=0.0,
        cell_size_m=CELL,
        nodata=-9999.0,
    )


PARAMS = TraverseParams(
    max_slope_deg=20.0,
    min_corridor_width_m=1.02,
    walking_speed_kmh=3.6,  # 1 m/s: tiempos fáciles de verificar
    speed_slope_coeff_mps_per_deg=0.01,
    min_speed_mps=0.1,
)


def flat_map(grid: Grid, **kw) -> TraverseMap:
    shape = (grid.height, grid.width)
    return TraverseMap(grid, np.zeros(shape), np.zeros(shape), PARAMS, **kw)


def center(row: int, col: int) -> tuple[float, float]:
    return (col + 0.5) * CELL, -(row + 0.5) * CELL


# --- parámetros ----------------------------------------------------------------------------


def test_config_values_are_sourced():
    p = default_params()
    assert p.max_slope_deg == 20
    assert p.min_corridor_width_m == pytest.approx(1.02)
    assert p.speed_slope_coeff_mps_per_deg == pytest.approx(0.01)


def test_stm_overrides_slope_and_speed():
    p = PARAMS.with_stm({"constraints": {"max_slope_deg": 15, "walking_speed_kmh": 2.0}})
    assert p.max_slope_deg == 15
    assert p.flat_speed_mps == pytest.approx(2.0 / 3.6)
    assert PARAMS.with_stm(None) is PARAMS


# --- capas del terreno ---------------------------------------------------------------------


def test_slope_of_known_plane():
    grade = math.tan(math.radians(12))
    rows, cols = np.mgrid[0:40, 0:40]
    plane = cols * grade  # sube hacia el este, 1 m por píxel
    s = slope_deg(plane, 1.0, offset_px=5)
    assert s.shape == (30, 30)
    assert np.allclose(s, 12.0)


def test_reduce_cells_plane_and_missing_block():
    factor, k = 10, 5
    grade = math.tan(math.radians(8))
    rows, cols = np.mgrid[0 : 2 * factor + 2 * k, 0 : 3 * factor + 2 * k]
    fine = rows * grade  # baja hacia el norte
    fine[k : k + factor, k : k + factor] = np.nan  # primera celda sin datos
    out = reduce_cells(fine.astype(float), factor, 1.0, k)
    assert out["terrain_elevation_m"].shape == (2, 3)
    assert np.isnan(out["terrain_elevation_m"][0, 0])
    assert out["terrain_valid_fraction"][0, 0] == 0.0
    assert out["terrain_slope_max_deg"][1, 1] == pytest.approx(8.0)
    assert out["terrain_roughness_m"][1, 1] == pytest.approx(0.0, abs=1e-9)


# --- grafo y rutas -------------------------------------------------------------------------


def test_flat_route_time_is_distance_over_speed():
    m = flat_map(make_grid())
    r = m.route(center(5, 2), center(5, 22))
    assert r.distance_m == pytest.approx(200.0)
    assert r.time_s == pytest.approx(200.0)  # 1 m/s
    assert r.xy == [center(5, 2), center(5, 22)]  # tramo recto simplificado


def test_speed_drops_with_slope():
    m = flat_map(make_grid())
    assert m.edge_speed_mps(np.array([0.0, 10.0, -10.0])) == pytest.approx([1.0, 0.9, 0.9])


def test_route_avoids_steep_wall():
    grid = make_grid()
    slope = np.zeros((grid.height, grid.width))
    slope[:-2, 15] = 30.0  # muro con un hueco abajo
    m = TraverseMap(grid, np.zeros_like(slope), slope, PARAMS)
    r = m.route(center(2, 5), center(2, 25))
    assert r.distance_m > 200.0
    # baja hasta el hueco (las dos últimas filas) para cruzar el muro
    assert min(y for _, y in r.xy) < -(grid.height - 2) * CELL
    # ningún vértice cae sobre una celda excluida
    for x, y in r.xy:
        assert m.passable.flat[m.cell(x, y)]


def test_edge_steeper_than_limit_is_blocked():
    """Un escalón entre celdas vecinas también corta, aunque la capa de pendiente diga llano."""
    grid = make_grid()
    z = np.zeros((grid.height, grid.width))
    z[:, 15:] = 10.0  # 10 m en 10 m: 45° en toda la columna
    m = TraverseMap(grid, z, np.zeros_like(z), PARAMS)
    with pytest.raises(NoRouteError):
        m.route(center(5, 5), center(5, 25))


def test_routes_are_symmetric():
    rng = np.random.default_rng(1)
    grid = make_grid()
    z = rng.normal(0, 0.5, (grid.height, grid.width)).cumsum(axis=1) * 0.3
    m = TraverseMap(grid, z, np.zeros_like(z), PARAMS)
    a, b = center(3, 3), center(16, 27)
    assert m.route(a, b).time_s == pytest.approx(m.route(b, a).time_s)


def test_time_from_has_grid_shape_and_inf_outside():
    grid = make_grid()
    z = np.zeros((grid.height, grid.width))
    z[:, :3] = np.nan  # fuera de la huella del DTM
    m = TraverseMap(grid, z, np.zeros_like(z), PARAMS)
    t = m.time_from(*center(5, 10))
    assert t.shape == (grid.height, grid.width)
    assert np.isinf(t[:, :3]).all()
    assert t[5, 10] == 0.0


def test_snap_moves_off_excluded_cell_and_fails_when_far():
    grid = make_grid()
    slope = np.zeros((grid.height, grid.width))
    slope[4:7, 4:7] = 30.0
    m = TraverseMap(grid, np.zeros_like(slope), slope, PARAMS)
    snapped = m.snap(*center(5, 5), max_distance_m=50)
    assert m.passable.flat[snapped]
    assert math.dist(m.xy(snapped), center(5, 5)) == pytest.approx(20.0)
    with pytest.raises(NoRouteError):
        m.snap(*center(5, 5), max_distance_m=5)
    with pytest.raises(ValueError):
        m.cell(-50.0, -50.0)


def test_corridor_rule():
    grid = make_grid()
    width = np.full((grid.height, grid.width), np.nan)  # sin dato de visión: no prohíbe
    width[:, 15] = 0.8  # pasillo más angosto que 1.02 m en toda la columna
    m = flat_map(grid, clear_path_width_m=width)
    assert m.uses_corridor
    assert not m.passable[:, 15].any()
    assert m.passable[:, 14].all()
    with pytest.raises(NoRouteError):
        m.route(center(5, 5), center(5, 25))


# --- integración con el planificador -------------------------------------------------------


def test_plan_uses_routes_and_drops_unreachable_station(monkeypatch):
    """Con un mapa de caminata, /plan usa rutas reales y avisa si una estación no tiene camino."""
    import json

    import jsonschema
    from fastapi.testclient import TestClient

    from app import mock_planner
    from app.contracts import CONTRACTS
    from app.main import app

    half = 1500.0
    grid = Grid(
        site_id="test", proj4="+proj=eqc +R=3389574.3490888 +units=m +no_defs",
        radius_m=3389574.3490888, lat0_deg=0.0, lon0_deg=0.0,
        xmin=-half, xmax=half, ymin=-half, ymax=half, cell_size_m=CELL, nodata=-9999.0,
    )
    shape = (grid.height, grid.width)
    slope = np.zeros(shape)
    # Encierra la estación S6 (900, -200) en un anillo de pendiente > 20°.
    yy, xx = np.mgrid[0 : grid.height, 0 : grid.width]
    x = grid.xmin + (xx + 0.5) * CELL
    y = grid.ymax - (yy + 0.5) * CELL
    ring = np.abs(np.hypot(x - 900, y + 200) - 150) < 15
    slope[ring] = 35.0
    tmap = TraverseMap(grid, np.zeros(shape), slope, PARAMS)
    monkeypatch.setattr(mock_planner, "_traverse_map", lambda stm: tmap)

    order = ["S5", "S6", "S1"]
    plan = mock_planner.build_plan(
        json.loads((CONTRACTS / "examples" / "stm.s1094b.json").read_text()), order=order
    )
    jsonschema.validate(plan, json.loads((CONTRACTS / "schemas" / "plan.schema.json").read_text()))
    assert [s["id"] for s in plan["stations"]] == ["S5", "S1"]
    assert plan["route"]["features"][0]["properties"]["routing"] == "dtm"
    assert any(a["level"] == "caution" and "S6" in a["message"] for a in plan["alerts"])
    # A 1 m/s, el tramo hábitat -> S5 (901 m en recta) tarda ~15-16 min.
    first = next(e for e in plan["timeline"] if e["kind"] == "traverse")
    assert 15.0 <= first["t_end_min"] - first["t_start_min"] <= 16.5
    assert TestClient(app).get("/health").status_code == 200
