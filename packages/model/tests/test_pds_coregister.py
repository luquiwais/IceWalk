import numpy as np
import pytest
from scipy import ndimage

from vision.coregister import align, estimate_shift
from vision.imagery import valid_mask
from vision.pds import parse_label

# Valores reales del label de ESP_073578_2155_RED.
LABEL = """
  PRODUCT_ID = ESP_073578_2155_RED
  START_TIME = 2022-04-07T13:15:22.236
  A_AXIS_RADIUS = 3389.5743490888 <KM>
  MAP_PROJECTION_TYPE = "EQUIRECTANGULAR"
  CENTER_LATITUDE = 35.000 <DEG>
  CENTER_LONGITUDE = 180.000 <DEG>
  MAP_SCALE = 0.25 <METERS/PIXEL>
  INCIDENCE_ANGLE = 67.709655 <DEG>
  SUB_SOLAR_AZIMUTH = 148.451218 <DEG>
  NORTH_AZIMUTH = 270.000000 <DEG>
"""


def test_label_gives_real_units_and_sun_direction():
    geometry = parse_label(LABEL)
    assert geometry.product_id == "ESP_073578_2155_RED"
    assert geometry.radius_m == pytest.approx(3389574.349)
    assert geometry.map_scale_m == 0.25
    assert geometry.projection == "EQUIRECTANGULAR"
    assert geometry.sun_azimuth_deg == pytest.approx(238.451, abs=1e-3)
    assert geometry.shadow_azimuth_deg == pytest.approx(58.451, abs=1e-3)


def test_height_comes_from_shadow_length_and_incidence():
    geometry = parse_label(LABEL)
    assert geometry.shadow_per_height == pytest.approx(2.44, abs=0.01)
    assert geometry.height_from_shadow(2.44) == pytest.approx(1.0, abs=0.01)


def test_sun_azimuth_wraps_around_360():
    label = LABEL.replace("SUB_SOLAR_AZIMUTH = 148.451218", "SUB_SOLAR_AZIMUTH = 280.0")
    assert parse_label(label).sun_azimuth_deg == pytest.approx(10.0)


@pytest.mark.parametrize("field", ["INCIDENCE_ANGLE", "MAP_SCALE", "NORTH_AZIMUTH"])
def test_missing_field_fails_instead_of_assuming(field):
    label = "\n".join(line for line in LABEL.splitlines() if field not in line)
    with pytest.raises(ValueError, match=field):
        parse_label(label)


def test_non_numeric_value_fails():
    with pytest.raises(ValueError):
        parse_label(LABEL.replace("MAP_SCALE = 0.25", "MAP_SCALE = abc"))


def test_sun_below_horizon_fails():
    with pytest.raises(ValueError):
        parse_label(LABEL.replace("INCIDENCE_ANGLE = 67.709655", "INCIDENCE_ANGLE = 95"))


def test_valid_mask_excludes_only_zero():
    assert valid_mask(np.array([0, 1, 255])).tolist() == [False, True, True]


def textured_image(size=1024, seed=0):
    rng = np.random.default_rng(seed)
    field = ndimage.gaussian_filter(rng.normal(size=(size, size)), 3)
    field = (field - field.min()) / (field.max() - field.min())
    return (1 + field * 254).astype(np.uint8)


@pytest.mark.parametrize("shift", [(0.0, 0.0), (7.0, -12.0), (-3.5, 4.5)])
def test_recovers_known_shift(shift):
    reference = textured_image()
    # Corremos la imagen al revés: estimate_shift devuelve lo que hay que aplicarle para alinearla.
    moved = ndimage.shift(reference.astype(float), (-shift[0], -shift[1]), order=3, mode="nearest")
    moving = np.clip(moved, 1, 255).astype(np.uint8)
    result = estimate_shift(reference, moving, tile_px=256)
    assert result.row_px == pytest.approx(shift[0], abs=0.3)
    assert result.col_px == pytest.approx(shift[1], abs=0.3)
    assert result.spread_px < 0.5
    assert result.n_tiles == 16


def test_ignores_tiles_without_enough_data():
    reference = textured_image()
    moving = reference.copy()
    moving[:512, :] = 0
    assert estimate_shift(reference, moving, tile_px=256).n_tiles == 8


def test_seam_lines_do_not_break_the_estimate():
    reference = textured_image()
    moved = ndimage.shift(reference.astype(float), (-5, 3), order=3, mode="nearest")
    moving = np.clip(moved, 1, 255).astype(np.uint8)
    moving[:, 300] = 0  # Línea de valor 0, como las de los JP2 de HiRISE.
    result = estimate_shift(reference, moving, tile_px=256)
    assert result.row_px == pytest.approx(5, abs=0.3)
    assert result.col_px == pytest.approx(-3, abs=0.3)


def test_align_recovers_a_large_shift_like_the_unorthorectified_images():
    # Diciembre de 2022 está corrida ~130 m: a 0.5 m/px son cientos de píxeles.
    reference = textured_image(size=1536)
    moved = ndimage.shift(reference.astype(float), (-260, 40), order=1, mode="nearest")
    moving = np.clip(moved, 1, 255).astype(np.uint16) * 3  # Otra escala, como los RDR de 16 bits.
    aligned, shift = align(reference, moving)
    assert shift.row_px == pytest.approx(260, abs=1)
    assert shift.col_px == pytest.approx(-40, abs=1)
    overlap = aligned > 0
    assert np.corrcoef(aligned[overlap], reference[overlap])[0, 1] > 0.95


def test_align_is_not_fooled_by_a_no_data_band():
    # Como abril de 2024: una franja sin datos no debe dominar la correlación.
    reference = textured_image(size=1536)
    moved = ndimage.shift(reference.astype(float), (-30, 24), order=1, mode="nearest")
    moving = np.clip(moved, 1, 255).astype(np.uint8)
    moving[:, 600:900] = 0
    _, shift = align(reference, moving)
    assert shift.row_px == pytest.approx(30, abs=1)
    assert shift.col_px == pytest.approx(-24, abs=1)


def test_different_shapes_fail():
    with pytest.raises(ValueError):
        estimate_shift(np.ones((10, 10), dtype=np.uint8), np.ones((12, 10), dtype=np.uint8))


def test_no_valid_tiles_fails():
    empty = np.zeros((512, 512), dtype=np.uint8)
    with pytest.raises(ValueError):
        estimate_shift(empty, empty, tile_px=256)
