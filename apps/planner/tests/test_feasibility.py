"""Factibilidad de un plan sobre terreno sintético: suelo, esfuerzo, carga y línea de vista."""

import numpy as np
from vision.grid import Grid

from app import feasibility

CELL = 10.0


def make_grid(rows: int = 10, cols: int = 60) -> Grid:
    return Grid(site_id="test", proj4="+proj=eqc +R=3389574.3490888 +units=m +no_defs",
                radius_m=3389574.3490888, lat0_deg=0.0, lon0_deg=0.0, xmin=0.0,
                xmax=cols * CELL, ymin=-rows * CELL, ymax=0.0, cell_size_m=CELL, nodata=-9999.0)


GRID = make_grid()
FLAT = np.zeros((GRID.height, GRID.width))
HAB = (5.0, -45.0)  # centro de la celda (fila 4, columna 0)


def ridge() -> np.ndarray:
    z = FLAT.copy()
    z[:, 30] = 20.0  # una loma de 20 m a 300 m del hábitat
    return z


def test_line_of_sight_flat_ridge_and_nodata():
    far = np.array([[555.0, -45.0]])
    assert feasibility.line_of_sight(FLAT, GRID, HAB, 3, far, 2, 10)[0] == 1.0
    assert feasibility.line_of_sight(ridge(), GRID, HAB, 3, far, 2, 10)[0] == 0.0
    near = np.array([[205.0, -45.0]])  # antes de la loma: se ve
    assert feasibility.line_of_sight(ridge(), GRID, HAB, 3, near, 2, 10)[0] == 1.0
    z = FLAT.copy()
    z[4, 55] = np.nan
    assert np.isnan(feasibility.line_of_sight(z, GRID, HAB, 3, far, 2, 10)[0])


def test_densify_keeps_ends_and_step():
    pts = feasibility.densify([(0, 0), (25, 0), (25, 10)], 10)
    assert tuple(pts[0]) == (0, 0) and tuple(pts[-1]) == (25, 10)
    assert np.all(np.hypot(*np.diff(pts, axis=0).T) <= 10 + 1e-9)


def test_soil_classes():
    cfg = feasibility.config()
    assert feasibility.soil_class(60, cfg) == ("dust", cfg["soil"]["eta_dust"])
    assert feasibility.soil_class(150, cfg)[0] == "loose"
    assert feasibility.soil_class(480, cfg) == ("firm", cfg["soil"]["eta_firm"])
    assert feasibility.soil_class(float("nan"), cfg) == ("unknown", 1.0)


def run(elevation=FLAT, soil=None, equipment=None, minutes=10.0, end=(555.0, -45.0)):
    legs = [{"xy": [HAB, end], "distance_m": abs(end[0] - HAB[0]), "minutes": minutes}]
    stations = [{"id": "S1", "position": list(end)}]
    equipment = equipment if equipment is not None else [
        {"tool": "core_drill", "count": 1, "mass_kg": 13.6},
        {"tool": "gpr", "count": 1, "mass_kg": 3.455}]
    return feasibility.assess(legs=legs, segments=[{"minutes": 30.0}], stations=stations,
                              equipment=equipment, crew=2, habitat_xy=HAB, elevation=elevation,
                              grid=GRID, soil=np.full_like(FLAT, 480.0) if soil is None else soil)


def test_firm_flat_light_plan_is_walkable():
    summary, alerts, per_station = run()
    assert summary["mobility"]["mode"] == "walk" and not alerts
    assert summary["soil"]["class"] == "firm" and summary["comms"]["route_los_fraction"] == 1.0
    assert per_station["S1"] == {"comm_los": True, "soil_ti": 480}
    e = summary["effort"]
    assert e["peak_btu_h"] > e["average_btu_h"] > 0 and e["o2_kg_per_crew"] > 0
    assert summary["carry"]["per_crew_kg"] == round((13.6 + 3.455) / 2, 1)


def test_dust_suggests_rover():
    summary, alerts, _ = run(soil=np.full_like(FLAT, 60.0))
    assert summary["mobility"]["mode"] == "rover" and summary["soil"]["dust_fraction"] == 1.0
    assert any("rover" in a["message"] for a in alerts)
    firm, _, _ = run()
    assert summary["effort"]["peak_btu_h"] > firm["effort"]["peak_btu_h"]  # el polvo cuesta más


def test_heavy_load_suggests_cart():
    heavy = [{"tool": "core_drill", "count": 1, "mass_kg": 30.0},
             {"tool": "gpr", "count": 1, "mass_kg": 20.0}]
    summary, alerts, _ = run(equipment=heavy)
    assert summary["mobility"]["mode"] == "cart"
    assert any("cart" in a["message"] for a in alerts)


def test_long_stretch_behind_a_ridge_raises_caution():
    summary, alerts, per_station = run(elevation=ridge(), minutes=60.0)
    assert per_station["S1"]["comm_los"] is False
    assert summary["comms"]["stations_without_los"] == ["S1"]
    assert summary["comms"]["max_min_without_los"] > summary["comms"]["limit_min"]
    assert any(a["level"] == "caution" and "line of sight" in a["message"] for a in alerts)
