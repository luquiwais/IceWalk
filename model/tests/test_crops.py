import numpy as np
import pytest
import rasterio
from rasterio.crs import CRS
from rasterio.transform import Affine

from vision.crops import crop_around_crater
from vision.grid import load_grid

GRID = load_grid()


def write_image(path, crs, transform, data):
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=data.shape[0],
        width=data.shape[1],
        count=1,
        dtype="uint8",
        crs=crs,
        transform=transform,
        nodata=0,
    ) as dst:
        dst.write(data, 1)


def test_bright_mark_at_the_crater_lands_in_the_center(tmp_path):
    # Imagen a 1 m, en otra escala que el recorte, con una marca en el origen de la grilla.
    data = np.full((400, 400), 50, dtype=np.uint8)
    data[195:205, 195:205] = 250
    path = tmp_path / "image.tif"
    write_image(path, CRS.from_proj4(GRID.proj4), Affine(1, 0, -200, 0, -1, 200), data)

    crop = crop_around_crater(path, GRID, half_m=100, res_m=0.5)

    assert crop.shape == (400, 400)
    rows, cols = np.nonzero(crop > 150)
    assert rows.mean() == pytest.approx(199.5, abs=1.5)
    assert cols.mean() == pytest.approx(199.5, abs=1.5)


def test_north_stays_up(tmp_path):
    data = np.full((400, 400), 50, dtype=np.uint8)
    data[:200, :] = 200  # Mitad norte brillante.
    path = tmp_path / "image.tif"
    write_image(path, CRS.from_proj4(GRID.proj4), Affine(1, 0, -200, 0, -1, 200), data)

    crop = crop_around_crater(path, GRID, half_m=100, res_m=1.0)

    assert crop[:90].mean() > crop[110:].mean()


def test_outside_the_image_is_no_data(tmp_path):
    data = np.full((20, 20), 100, dtype=np.uint8)
    path = tmp_path / "image.tif"
    write_image(path, CRS.from_proj4(GRID.proj4), Affine(1, 0, -10, 0, -1, 10), data)

    crop = crop_around_crater(path, GRID, half_m=100, res_m=1.0)

    assert crop[0, 0] == 0
    assert crop[100, 100] == 100


def test_image_without_projection_fails(tmp_path):
    path = tmp_path / "image.tif"
    write_image(path, None, Affine(1, 0, 0, 0, -1, 0), np.ones((5, 5), dtype=np.uint8))
    with pytest.raises(ValueError, match="no tiene proyección"):
        crop_around_crater(path, GRID)
