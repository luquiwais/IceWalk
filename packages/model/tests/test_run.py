"""Corrida completa de visión sobre un sitio de mentira, escrito en la grilla real."""

import json

import jsonschema
import numpy as np
import pytest
import rasterio
from rasterio.crs import CRS
from rasterio.transform import Affine

from vision.grid import REPO_ROOT, load_grid
from vision.labels import LABEL_CROPS, export_crops
from vision.mock_layers import generate
from vision.rasterize import COST_LAYERS
from vision.run import SITES, Site, SiteImage, run
from vision.synthetic import SyntheticBoulder, render_scene

GRID = load_grid()
SCHEMA = json.loads(
    (REPO_ROOT / "packages/contracts/schemas/boulders.schema.json").read_text(encoding="utf-8")
)
WINDOW = (300.0, -2300.0, 420.0, -2180.0)
RES_M = 0.25
BOULDERS = [
    SyntheticBoulder(20.0, 100.0, 2.0, 1.2),
    SyntheticBoulder(60.0, 62.0, 3.0, 1.8),
    SyntheticBoulder(105.0, 25.0, 4.0, 2.4),  # En el centro de una celda de 10 m.
]
LABEL = """
  PRODUCT_ID = {product}
  START_TIME = 2022-04-07T13:15:22.236
  A_AXIS_RADIUS = 3389.5743490888 <KM>
  MAP_PROJECTION_TYPE = "EQUIRECTANGULAR"
  CENTER_LATITUDE = 35.000 <DEG>
  CENTER_LONGITUDE = 180.000 <DEG>
  MAP_SCALE = 0.25 <METERS/PIXEL>
  INCIDENCE_ANGLE = {incidence} <DEG>
  SUB_SOLAR_AZIMUTH = {azimuth} <DEG>
  NORTH_AZIMUTH = 270.000000 <DEG>
"""
# (nombre, azimut del sol desde el norte, incidencia, bloques que se ven)
DATES = [("NEW", 238.451, 67.71, BOULDERS), ("OLD", 248.290, 63.41, BOULDERS[:2])]


@pytest.fixture(scope="module")
def site(tmp_path_factory):
    """Dos ortos alineados; el bloque de 4 m solo está en la imagen más reciente."""
    raw = tmp_path_factory.mktemp("raw")
    images = []
    for name, azimuth, incidence, boulders in DATES:
        image = render_scene((480, 480), RES_M, azimuth, incidence, boulders, seed=3)
        with rasterio.open(
            raw / f"{name}.tif",
            "w",
            driver="GTiff",
            height=480,
            width=480,
            count=1,
            dtype="uint8",
            crs=CRS.from_proj4(GRID.proj4),
            transform=Affine(RES_M, 0, WINDOW[0], 0, -RES_M, WINDOW[3]),
            nodata=0,
        ) as dst:
            dst.write(image, 1)
        # El label da el azimut medido desde el eje +x de la imagen: desde el norte, +270.
        text = LABEL.format(product=name, incidence=incidence, azimuth=(azimuth + 270) % 360)
        (raw / f"{name}.LBL").write_text(text, encoding="latin-1")
        images.append(SiteImage(name, f"{name}.tif", f"{name}.LBL"))
    return raw, Site(latest=images[0], earlier=images[1], zones={"eva": WINDOW})


@pytest.fixture(scope="module")
def outputs(site, tmp_path_factory):
    raw, fake_site = site
    out = tmp_path_factory.mktemp("processed")
    manifest = run("s1094b", WINDOW, out, raw_dir=raw, site=fake_site)
    return out, manifest


def test_catalog_is_real_and_follows_the_contract(outputs):
    out, manifest = outputs
    catalog = json.loads((out / "boulders.geojson").read_text(encoding="utf-8"))
    jsonschema.validate(catalog, SCHEMA)
    assert catalog["is_mock"] is False
    assert catalog["source_images"] == ["NEW", "OLD"]
    assert manifest["n_objects"] == len(catalog["features"]) == 3
    assert manifest["persistence"] == {"persistent": 2, "single_epoch": 1}

    found = {round(f["properties"]["diameter_m"]): f["properties"] for f in catalog["features"]}
    assert sorted(found) == [2, 3, 4]
    assert found[4]["persistence"] == "single_epoch"  # La fecha anterior no lo muestra.
    assert found[4]["x_m"] == pytest.approx(WINDOW[0] + 105.0, abs=0.75)
    assert found[4]["y_m"] == pytest.approx(WINDOW[1] + 25.0, abs=0.75)
    assert found[3]["height_m"] == pytest.approx(1.8, rel=0.3)
    assert found[3]["evidence"] == ["shadow", "multitemporal"]


def test_layers_are_cogs_on_the_grid_with_nodata_outside_the_window(outputs):
    out, manifest = outputs
    assert manifest["layers"] == sorted(COST_LAYERS)
    for layer_id in COST_LAYERS:
        with rasterio.open(out / f"{layer_id}.tif") as src:
            assert (src.height, src.width) == (GRID.height, GRID.width)
            assert src.transform == GRID.transform
            assert src.nodata == GRID.nodata
            assert src.tags()["is_mock"] == "false"
            assert src.tags()["layer_id"] == layer_id
            data = src.read(1)
        assert np.count_nonzero(data != GRID.nodata) == 144  # 12 × 12 celdas de 10 m.

    with rasterio.open(out / "clear_path_width_m.tif") as src:
        corridor = src.read(1)
    inside = corridor[corridor != GRID.nodata]
    assert inside.max() == GRID.cell_size_m
    # El bloque de 4 m en el centro de su celda deja 3 m de cada lado.
    assert 3.0 <= inside.min() <= 7.0
    assert manifest["min_clear_path_width_m"] == pytest.approx(float(inside.min()))


def test_manifest_records_what_is_needed_to_repeat_the_run(outputs):
    _, manifest = outputs
    assert manifest["is_mock"] is False
    assert manifest["bounds_m"] == list(WINDOW)
    assert [image["image_id"] for image in manifest["images"]] == ["NEW", "OLD"]
    assert manifest["images"][0]["incidence_deg"] == 67.71
    assert manifest["images"][0]["sun_azimuth_deg"] == pytest.approx(238.451)
    assert manifest["params"]["seed_sigma"] > manifest["params"]["loose_sigma"]
    assert manifest["cells_in_footprint"] == 144
    assert manifest["cells_with_boulders"] == 3


def test_single_image_run_does_not_cross_dates(site, tmp_path):
    raw, fake_site = site
    manifest = run("s1094b", WINDOW, tmp_path, raw_dir=raw, site=fake_site, image_id="OLD")
    assert [image["image_id"] for image in manifest["images"]] == ["OLD"]
    assert manifest["persistence"] == {"single_epoch": 2}


def test_unknown_image_and_missing_files_fail_clearly(site, tmp_path):
    raw, fake_site = site
    with pytest.raises(ValueError, match="no es una imagen"):
        run("s1094b", WINDOW, tmp_path, raw_dir=raw, site=fake_site, image_id="ESP_000000_0000")
    with pytest.raises(FileNotFoundError, match="Falta"):
        run("s1094b", WINDOW, tmp_path, raw_dir=tmp_path / "vacio", site=fake_site)


def test_refuses_to_mix_real_layers_with_mock_ones(site, tmp_path):
    raw, fake_site = site
    generate(tmp_path, GRID, n=20)  # Capas FALSAS, como las que deja `vision.mock_layers`.
    with pytest.raises(SystemExit, match="FALSAS"):
        run("s1094b", WINDOW, tmp_path, raw_dir=raw, site=fake_site)

    manifest = run("s1094b", WINDOW, tmp_path, raw_dir=raw, site=fake_site, replace_mock=True)
    assert manifest["is_mock"] is False
    assert not (tmp_path / "surface_unit.tif").exists()  # Las falsas que visión no reemplaza.
    with rasterio.open(tmp_path / "clear_path_width_m.tif") as src:
        assert src.tags()["is_mock"] == "false"


def test_real_site_is_configured_with_the_stereo_pair_and_the_eva_zone():
    real = SITES["s1094b"]
    assert real.latest.image_id == "ESP_073578_2155"
    assert real.earlier.image_id == "ESP_073077_2155"
    assert real.zones["eva"] == (-1200.0, -3700.0, 1800.0, -700.0)  # Hábitat ± 1.5 km.
    xmin, ymin, xmax, ymax = real.zones["tusberti"]
    assert np.pi * xmax**2 == pytest.approx(1e6)  # Círculo de 1 km² centrado en el cráter.
    for bounds in (*real.zones.values(), *LABEL_CROPS["s1094b"].values()):
        assert GRID.xmin <= bounds[0] < bounds[2] <= GRID.xmax
        assert GRID.ymin <= bounds[1] < bounds[3] <= GRID.ymax


def test_label_crops_are_written_in_grid_metres_for_qgis(site, tmp_path, monkeypatch):
    raw, fake_site = site
    monkeypatch.setitem(SITES, "s1094b", fake_site)
    monkeypatch.setitem(LABEL_CROPS, "s1094b", {"test_eva": (320.0, -2280.0, 400.0, -2200.0)})
    (path,) = export_crops(tmp_path, raw_dir=raw, grid=GRID)
    with rasterio.open(path) as src:
        assert (src.height, src.width) == (320, 320)
        assert src.res == (RES_M, RES_M)
        assert src.bounds.left == 320.0 and src.bounds.top == -2200.0
        assert src.tags()["source_image"] == "NEW"
        assert src.read(1).min() > 0
