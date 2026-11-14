"""Detector de sombras sobre escenas sintéticas con verdad de terreno conocida.

La escena imita al orto de S1094b: poco rango entre sombra y suelo, imagen blanda, ondulaciones
que se oscurecen sin ser bloques y cráteres chicos. Estas métricas no reemplazan a las de las
etiquetas a mano (`python -m vision.evaluate labels`).
"""

import numpy as np
import pytest
import rasterio
from rasterio.crs import CRS
from rasterio.transform import Affine

from vision.boulders import (
    DEFAULT_PARAMS,
    dark_regions,
    detect_boulders,
    detect_epochs_in_window,
    detect_in_window,
    ellipsoid_from_shadow,
    snap_bounds,
)
from vision.evaluate import score
from vision.grid import load_grid
from vision.labels import Label
from vision.pds import ImageGeometry
from vision.synthetic import (
    SyntheticBoulder,
    SyntheticCrater,
    render_scene,
    scatter_scene,
)

RES_M = 0.25
SIZE_M = 250.0
SHAPE = (1000, 1000)
APRIL = (238.451, 67.71)  # Sol e incidencia reales de ESP_073578_2155.
FEBRUARY = (248.290, 63.41)  # ESP_073077_2155.


def geometry(sun_azimuth_deg: float, incidence_deg: float) -> ImageGeometry:
    return ImageGeometry(
        product_id="TEST",
        start_time="",
        projection="EQUIRECTANGULAR",
        map_scale_m=RES_M,
        radius_m=3389574.35,
        center_lat_deg=35.0,
        center_lon_deg=180.0,
        incidence_deg=incidence_deg,
        sun_azimuth_deg=sun_azimuth_deg,
    )


def as_labels(items) -> list[Label]:
    return [Label(item.x_m, item.y_m, item.diameter_m) for item in items]


def firm(detections):
    return [d for d in detections if d.firm]


@pytest.fixture(scope="module")
def scene():
    """60 bloques y 8 cráteres sobre terreno ondulado, con el sol de abril de 2022."""
    boulders, craters = scatter_scene(SIZE_M, n_boulders=60, n_craters=8, seed=11)
    image = render_scene(SHAPE, RES_M, *APRIL, boulders, craters, seed=5, hummock_m=0.35)
    detections = detect_boulders(image, RES_M, geometry(*APRIL), (0.0, SIZE_M))
    return boulders, craters, image, detections


def test_f1_for_two_metre_boulders_meets_the_acceptance_criterion(scene):
    boulders, _, _, detections = scene
    result = score(as_labels(boulders), as_labels(firm(detections)), min_diameter_m=2.0)
    assert result.n_labels >= 20
    assert result.f1 >= 0.70, result
    assert result.precision >= 0.70, result
    assert result.recall >= 0.70, result


def test_diameter_error_stays_within_two_pixels(scene):
    boulders, _, _, detections = scene
    result = score(as_labels(boulders), as_labels(firm(detections)), min_diameter_m=2.0)
    assert result.median_diameter_error_px <= 2.0


def test_height_comes_out_of_the_shadow_length(scene):
    boulders, _, _, detections = scene
    errors = []
    for boulder in (b for b in boulders if b.diameter_m >= 2.0):
        near = [
            d for d in firm(detections)
            if np.hypot(d.x_m - boulder.x_m, d.y_m - boulder.y_m) <= boulder.diameter_m / 2
        ]
        if near:
            errors.append(abs(near[0].height_m - boulder.height_m) / boulder.height_m)
    assert len(errors) >= 15
    assert np.median(errors) <= 0.30


def test_position_is_the_boulder_not_its_shadow(scene):
    boulders, _, _, detections = scene
    offsets = []
    for boulder in (b for b in boulders if b.diameter_m >= 2.0):
        distances = [np.hypot(d.x_m - boulder.x_m, d.y_m - boulder.y_m) for d in firm(detections)]
        if distances and min(distances) <= boulder.diameter_m / 2:
            offsets.append(min(distances))
    assert np.median(offsets) <= 0.75  # Tres píxeles.


def test_small_craters_are_not_reported_as_boulders(scene):
    _, craters, _, detections = scene
    for crater in craters:
        inside = [
            d for d in firm(detections)
            if np.hypot(d.x_m - crater.x_m, d.y_m - crater.y_m) <= crater.diameter_m / 2
        ]
        assert not inside, f"Cráter de {crater.diameter_m:.1f} m detectado como bloque"


def test_rolling_terrain_alone_gives_almost_nothing():
    image = render_scene(SHAPE, RES_M, *APRIL, [], [], seed=9, hummock_m=0.35)
    found = firm(detect_boulders(image, RES_M, geometry(*APRIL), (0.0, SIZE_M)))
    # 62 500 m² de ondulaciones sin un solo bloque: se toleran muy pocas falsas.
    assert len([d for d in found if d.diameter_m >= 2.0]) <= 2


def test_works_with_another_sun_direction():
    boulders, craters = scatter_scene(SIZE_M, n_boulders=60, n_craters=8, seed=11)
    sun = (120.0, 55.0)
    image = render_scene(SHAPE, RES_M, *sun, boulders, craters, seed=5, hummock_m=0.35)
    detections = firm(detect_boulders(image, RES_M, geometry(*sun), (0.0, SIZE_M)))
    assert score(as_labels(boulders), as_labels(detections)).f1 >= 0.70


def test_black_lines_and_frame_are_not_shadows():
    boulders = [SyntheticBoulder(30.0, 30.0, 3.0, 1.8), SyntheticBoulder(70.0, 70.0, 3.0, 1.8)]
    image = render_scene((400, 400), RES_M, *APRIL, boulders, seed=2)
    image[200:202, :] = 0  # Línea negra, como las del orto real.
    image[:, :20] = 0  # Marco de la huella.
    detections = detect_boulders(image, RES_M, geometry(*APRIL), (0.0, 100.0))
    assert len(firm(detections)) == 2
    for found in detections:
        assert abs(found.y_m - 50.0) > 1.0
        assert found.x_m > 5.0


def test_image_without_data_or_without_contrast_gives_nothing():
    empty = np.zeros((200, 200), dtype=np.uint8)
    flat = np.full((200, 200), 215, dtype=np.uint8)
    assert detect_boulders(empty, RES_M, geometry(*APRIL)) == []
    assert detect_boulders(flat, RES_M, geometry(*APRIL)) == []


def test_only_single_band_images():
    with pytest.raises(ValueError, match="una banda"):
        detect_boulders(np.zeros((3, 50, 50), dtype=np.uint8), RES_M, geometry(*APRIL))


def test_sixteen_bit_images_work_without_rescaling():
    boulders = [SyntheticBoulder(50.0, 50.0, 3.0, 1.8)]
    eight = render_scene((400, 400), RES_M, *APRIL, boulders, seed=2)
    sixteen = eight.astype(np.uint16) * 16  # Los RDR RED son de 16 bits.
    found = firm(detect_boulders(sixteen, RES_M, geometry(*APRIL), (0.0, 100.0)))
    assert len(found) == 1
    assert found[0].diameter_m == pytest.approx(3.0, abs=0.5)


def test_ellipsoid_model_inverts_its_own_shadow():
    radius, height, shadow_per_height = 1.5, 1.2, 2.44
    reach = height * shadow_per_height
    dark_length = reach**2 / np.hypot(radius, reach)
    found_height, start = ellipsoid_from_shadow(
        np.array([2 * radius]), np.array([dark_length]), shadow_per_height
    )
    assert found_height[0] == pytest.approx(height)
    assert start[0] == pytest.approx(radius**2 / np.hypot(radius, reach))


def test_each_dark_region_is_cut_near_half_of_its_own_depth():
    rows, cols = np.mgrid[0:80, 0:160]

    def blob(center_col, depth):
        return depth * np.exp(-((rows - 40) ** 2 + (cols - center_col) ** 2) / (2 * 6.0**2))

    depth = blob(40, 30.0) + blob(120, 8.0)
    labels, n = dark_regions(depth, DEFAULT_PARAMS)
    assert n == 2
    # Una gaussiana cortada a media altura mide 2.355 sigma, sea profunda o no. El corte va entre
    # la mitad y la mitad dividido el paso entre niveles, así que puede salir algo más ancha.
    for center_col in (40, 120):
        width = np.count_nonzero(labels[40, center_col - 30:center_col + 30])
        assert 2.355 * 6.0 - 1 <= width <= 2.355 * 6.0 * 1.45


def write_geotiff(path, image, grid, x_west, y_north):
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=image.shape[0],
        width=image.shape[1],
        count=1,
        dtype=image.dtype,
        crs=CRS.from_proj4(grid.proj4),
        transform=Affine(RES_M, 0, x_west, 0, -RES_M, y_north),
        nodata=0,
    ) as dst:
        dst.write(image, 1)


WINDOW = (300.0, -2300.0, 420.0, -2180.0)  # Dentro de la zona de la EVA.


@pytest.fixture(scope="module")
def two_dates(tmp_path_factory):
    """La misma escena con el sol de abril y el de febrero, escrita en la grilla del sitio."""
    grid = load_grid()
    folder = tmp_path_factory.mktemp("ortos")
    boulders = [
        SyntheticBoulder(20.0, 100.0, 2.0, 1.2),
        SyntheticBoulder(60.0, 62.0, 3.0, 1.8),  # Sobre el borde entre teselas de 60 m.
        SyntheticBoulder(100.0, 20.0, 4.0, 2.4),
    ]
    paths = []
    for name, sun in (("abril", APRIL), ("febrero", FEBRUARY)):
        image = render_scene((480, 480), RES_M, *sun, boulders, seed=3)
        if name == "abril":
            image[:, 440:] = 0  # Franja este sin dato: 10 m.
        path = folder / f"{name}.tif"
        write_geotiff(path, image, grid, WINDOW[0], WINDOW[3])
        paths.append(path)
    return grid, boulders, paths


def test_window_positions_are_grid_metres_and_no_boulder_is_counted_twice(two_dates):
    grid, boulders, paths = two_dates
    result = detect_in_window(
        paths[0], grid, geometry(*APRIL), WINDOW, tile_m=60, margin_m=20
    )
    found = firm(result.detections)
    assert len(found) == len(boulders)
    for boulder in boulders:
        x, y = WINDOW[0] + boulder.x_m, WINDOW[1] + boulder.y_m
        distance = min(np.hypot(d.x_m - x, d.y_m - y) for d in found)
        assert distance <= 0.75


def test_coverage_marks_where_the_image_has_data(two_dates):
    grid, _, paths = two_dates
    result = detect_in_window(paths[0], grid, geometry(*APRIL), WINDOW, tile_m=60, margin_m=20)
    assert result.bounds == WINDOW
    assert result.coverage.shape == (12, 12)
    assert result.coverage[:, :11].min() == 1.0
    assert result.coverage[:, 11].max() == 0.0  # La franja sin dato.


def test_the_other_date_says_whether_the_shadow_is_there(two_dates):
    grid, boulders, paths = two_dates
    april, february = detect_epochs_in_window(
        [(paths[0], geometry(*APRIL)), (paths[1], geometry(*FEBRUARY))],
        grid, WINDOW, tile_m=60, margin_m=20,
    )
    assert len(firm(april.detections)) == len(firm(february.detections)) == len(boulders)
    for found in firm(april.detections) + firm(february.detections):
        assert found.other_depth_sigma >= DEFAULT_PARAMS.presence_sigma


def test_other_date_without_data_is_unknown_not_absent(two_dates):
    grid, _, paths = two_dates
    boulder = [SyntheticBoulder(114.0, 60.0, 3.0, 1.8)]  # En la franja que abril no cubre.
    image = render_scene((480, 480), RES_M, *FEBRUARY, boulder, seed=4)
    path = paths[1].with_name("febrero_franja.tif")
    write_geotiff(path, image, grid, WINDOW[0], WINDOW[3])
    _, february = detect_epochs_in_window(
        [(paths[0], geometry(*APRIL)), (path, geometry(*FEBRUARY))],
        grid, WINDOW, tile_m=60, margin_m=20,
    )
    found = firm(february.detections)
    assert len(found) == 1
    assert found[0].other_depth_sigma is None


def test_window_is_snapped_to_grid_cells_and_must_touch_the_grid():
    grid = load_grid()
    assert snap_bounds((301.0, -2299.0, 419.0, -2181.0), grid) == WINDOW
    with pytest.raises(ValueError, match="fuera de la grilla"):
        snap_bounds((1e6, 1e6, 1e6 + 10, 1e6 + 10), grid)


def test_crater_helper_is_a_depression():
    from vision.synthetic import heightmap

    z = heightmap((200, 200), RES_M, [], [SyntheticCrater(25.0, 25.0, 8.0)])
    assert z.min() == pytest.approx(-1.6, abs=0.05)
    assert z.max() > 0  # El borde levantado.
