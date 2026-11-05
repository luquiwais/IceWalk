import json

import jsonschema
import numpy as np
import pytest
import rasterio
import yaml

from vision.grid import REPO_ROOT, load_grid
from vision.mock_layers import generate, mock_catalog

GRID = load_grid()
SCHEMA = json.loads(
    (REPO_ROOT / "contracts" / "schemas" / "boulders.schema.json").read_text(encoding="utf-8")
)
EXAMPLE = json.loads(
    (REPO_ROOT / "contracts" / "examples" / "boulders.example.json").read_text(encoding="utf-8")
)


@pytest.fixture(scope="module")
def out_dir(tmp_path_factory):
    path = tmp_path_factory.mktemp("mock")
    generate(path, GRID, n=800)
    return path


def manifest_layers(out_dir):
    return json.loads((out_dir / "manifest.json").read_text(encoding="utf-8"))["layers"]


def test_layers_are_cogs_aligned_to_the_grid(out_dir):
    for layer_id in manifest_layers(out_dir):
        with rasterio.open(out_dir / f"{layer_id}.tif") as src:
            assert (src.height, src.width) == (GRID.height, GRID.width)
            assert src.transform == GRID.transform
            assert src.nodata == GRID.nodata
            assert src.dtypes == ("float32",)
            assert src.crs is not None
            assert src.tags()["is_mock"] == "true"
            assert src.tags(ns="IMAGE_STRUCTURE").get("LAYOUT") == "COG"


def test_layers_have_nodata_margins_and_valid_values_inside(out_dir):
    for layer_id in manifest_layers(out_dir):
        with rasterio.open(out_dir / f"{layer_id}.tif") as src:
            data = src.read(1)
        assert (data[:, 0] == GRID.nodata).all()
        assert (data[:, -1] == GRID.nodata).all()
        assert (data[data != GRID.nodata] >= 0).all()


def test_ice_is_nodata_outside_the_color_strip_not_zero(out_dir):
    with rasterio.open(out_dir / "ice_exposure_fraction.tif") as src:
        data = src.read(1)
    middle_row = GRID.height // 2
    assert data[middle_row, 20] == GRID.nodata


def test_catalog_matches_contract(out_dir):
    catalog = json.loads((out_dir / "boulders.geojson").read_text(encoding="utf-8"))
    jsonschema.validate(catalog, SCHEMA)
    assert catalog["is_mock"] is True


def _with(**changes):
    example = json.loads(json.dumps(EXAMPLE))
    example["features"][0]["properties"].update(changes)
    return example


def test_contract_rejects_ice_candidate_without_color():
    bad = _with(composition="ice_candidate", evidence=["shadow"])
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad, SCHEMA)


def test_contract_rejects_height_without_source():
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(_with(height_source=None), SCHEMA)


def test_contract_example_geometry_matches_grid_coordinates():
    for feature in EXAMPLE["features"]:
        props = feature["properties"]
        expected = GRID.xy_to_lonlat(props["x_m"], props["y_m"])
        assert feature["geometry"]["coordinates"] == pytest.approx(list(expected), abs=1e-4)


def test_every_generated_layer_is_registered_with_its_role(out_dir):
    registry = yaml.safe_load((REPO_ROOT / "data" / "layers.yaml").read_text(encoding="utf-8"))
    roles = {layer["id"]: layer["role"] for layer in registry["layers"]}
    expected = {
        "boulder_max_diam_m": "cost",
        "boulder_max_height_m": "cost",
        "cfa_detected": "cost",
        "boulder_density": "cost",
        "boulder_unresolved_density": "cost",
        "clear_path_width_m": "cost",
        "ejecta_zone": "cost",
        "periglacial_landform_score": "evidence",
        "surface_unit": "evidence",
        "ice_exposure_fraction": "evidence",
        "visual_anomaly_score": "visual",
    }
    assert set(manifest_layers(out_dir)) == set(expected)
    assert {layer: roles[layer] for layer in expected} == expected


def test_same_seed_is_reproducible():
    assert mock_catalog(GRID, seed=3, n=50) == mock_catalog(GRID, seed=3, n=50)


def test_boulders_concentrate_near_the_crater(out_dir):
    with rasterio.open(out_dir / "boulder_density.tif") as src:
        density = src.read(1)
    row, col = GRID.height - round((0 - GRID.ymin) / 10), round((0 - GRID.xmin) / 10)
    near = density[row - 50:row + 50, col - 50:col + 50]
    far = density[:100, 50:550]
    assert near.mean() > far.mean()
    assert np.isfinite(density).all()
