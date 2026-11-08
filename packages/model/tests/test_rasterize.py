import numpy as np
import pytest

from vision.grid import Grid, load_grid
from vision.rasterize import clear_path_width, rasterize_catalog

GRID = Grid(
    site_id="test",
    proj4="+proj=eqc +lat_ts=35 +lat_0=35 +lon_0=189 +R=3389574 +units=m +no_defs",
    radius_m=3389574,
    lat0_deg=35.0,
    lon0_deg=189.0,
    xmin=-50,
    xmax=50,
    ymin=-30,
    ymax=30,
    cell_size_m=10,
    nodata=-9999,
)


def boulder(x, y, diameter=2.0, height=1.0, form="block", persistence="persistent"):
    return {
        "properties": {
            "x_m": x,
            "y_m": y,
            "diameter_m": diameter,
            "height_m": height,
            "form": form,
            "persistence": persistence,
        }
    }


def catalog(*features):
    return {"features": list(features)}


def test_real_grid_contains_the_dtm_footprint_and_the_crater_is_the_origin():
    grid = load_grid()
    assert (grid.height, grid.width) == (1163, 656)
    assert grid.xy_to_lonlat(0, 0) == (189.8273, 35.1105)
    assert grid.xmin < 0 < grid.xmax and grid.ymin < 0 < grid.ymax


def test_north_is_row_zero_and_values_land_in_the_right_cell():
    layers = rasterize_catalog(catalog(boulder(-45, 25, diameter=4.0, height=2.0)), GRID)
    assert layers["boulder_max_diam_m"][0, 0] == 4.0
    assert layers["boulder_max_height_m"][0, 0] == 2.0
    assert layers["boulder_max_diam_m"].sum() == 4.0


def test_cell_keeps_maximum_and_accumulates_area_and_density():
    layers = rasterize_catalog(
        catalog(boulder(5, 5, diameter=2.0, height=1.5), boulder(6, 6, diameter=4.0, height=1.0)),
        GRID,
    )
    row, col = 2, 5
    assert layers["boulder_max_diam_m"][row, col] == 4.0
    assert layers["boulder_max_height_m"][row, col] == 1.5
    expected_fraction = np.pi * (2.0**2 + 4.0**2) / 4 / 100
    assert layers["cfa_detected"][row, col] == pytest.approx(expected_fraction, rel=1e-5)
    # 2 bloques en 100 m2 = 20 000 por km2.
    assert layers["boulder_density"][row, col] == pytest.approx(20000)


def test_cfa_never_exceeds_one():
    layers = rasterize_catalog(catalog(boulder(5, 5, diameter=30.0)), GRID)
    assert layers["cfa_detected"].max() == 1.0


def test_object_not_visible_in_latest_image_is_unresolved_not_obstacle():
    layers = rasterize_catalog(catalog(boulder(5, 5, persistence="not_visible_latest")), GRID)
    assert layers["boulder_unresolved_density"].max() == pytest.approx(10000)
    assert layers["boulder_max_diam_m"].max() == 0
    assert layers["clear_path_width_m"].min() == 10


def test_patch_has_no_relief_and_does_not_block():
    layers = rasterize_catalog(catalog(boulder(5, 5, form="patch", height=None)), GRID)
    assert layers["boulder_max_diam_m"].max() == 0
    assert layers["clear_path_width_m"].min() == 10


@pytest.mark.parametrize("persistence", ["persistent", "fading", "single_epoch"])
def test_visible_blocks_stay_obstacles(persistence):
    layers = rasterize_catalog(catalog(boulder(5, 5, persistence=persistence)), GRID)
    assert layers["boulder_max_diam_m"].max() > 0


def test_missing_height_still_counts_diameter():
    layers = rasterize_catalog(catalog(boulder(5, 5, height=None)), GRID)
    assert layers["boulder_max_diam_m"].max() == 2.0
    assert layers["boulder_max_height_m"].max() == 0


def test_boulders_outside_grid_are_ignored():
    layers = rasterize_catalog(catalog(boulder(51, 0), boulder(0, -30.1), boulder(-51, 0)), GRID)
    for layer_id in ("boulder_max_diam_m", "cfa_detected", "boulder_density"):
        assert layers[layer_id].sum() == 0


def test_footprint_marks_nodata_and_keeps_values_inside():
    footprint = np.ones((GRID.height, GRID.width), dtype=bool)
    footprint[:, 0] = False
    layers = rasterize_catalog(catalog(), GRID, footprint)
    for layer in layers.values():
        assert (layer[:, 0] == GRID.nodata).all()
    assert (layers["boulder_density"][:, 1:] == 0).all()
    assert (layers["clear_path_width_m"][:, 1:] == 10).all()


def test_footprint_with_wrong_shape_fails():
    with pytest.raises(ValueError):
        rasterize_catalog(catalog(), GRID, np.ones((2, 2), dtype=bool))


def props(x, y, diameter):
    return boulder(x, y, diameter)["properties"]


def test_empty_cell_is_fully_clear():
    assert (clear_path_width([], GRID) == 10).all()


def test_single_boulder_leaves_about_seven_meters_of_corridor():
    # El ejemplo del informe: un bloque de 3 m en el centro de una celda de 10 m.
    widths = clear_path_width([props(5, 5, 3.0)], GRID)
    assert widths[2, 5] == pytest.approx(7.0, abs=0.75)


def test_boulder_bigger_than_the_cell_leaves_no_corridor():
    widths = clear_path_width([props(5, 5, 30.0)], GRID)
    assert widths[2, 5] == 0


def test_narrow_gap_reduces_width_but_keeps_it_passable():
    # Dos bloques de 6 m dejan 2 m en el centro y ~4 m bordeándolos por arriba.
    widths = clear_path_width([props(1, 5, 6.0), props(9, 5, 6.0)], GRID)
    assert 2.0 <= widths[2, 5] <= 5.0


def test_boulders_in_neighbor_cells_narrow_the_corridor():
    # Están centrados en las celdas vecinas, pero invaden esta: dejan 6 m entre los dos.
    widths = clear_path_width([props(-1, 5, 6.0), props(11, 5, 6.0)], GRID)
    assert widths[2, 5] == pytest.approx(6.0, abs=0.75)


def test_one_boulder_at_the_edge_leaves_the_cell_fully_passable():
    # El pasillo se corre lejos del bloque: sigue habiendo 10 m de ancho.
    widths = clear_path_width([props(-1, 5, 6.0)], GRID)
    assert widths[2, 5] == 10


def test_far_boulder_does_not_change_the_cell():
    widths = clear_path_width([props(-40, 5, 3.0)], GRID)
    assert widths[2, 5] == 10
