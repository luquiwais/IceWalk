import json

import jsonschema
import numpy as np
import pytest

from vision.boulders import Detection
from vision.catalog import (
    UNCONFIRMED_FACTOR,
    Epoch,
    build_catalog,
    footprint_on_grid,
    form_of,
    merge_epochs,
)
from vision.grid import REPO_ROOT, load_grid
from vision.rasterize import rasterize_catalog

GRID = load_grid()
SCHEMA = json.loads(
    (REPO_ROOT / "packages/contracts/schemas/boulders.schema.json").read_text(encoding="utf-8")
)
BOUNDS = (300.0, -2300.0, 400.0, -2200.0)


def detection(x, y, diameter=2.0, height=1.0, firm=True, confidence=0.8, seen=None, sharp=0.2):
    return Detection(
        x_m=x,
        y_m=y,
        diameter_m=diameter,
        height_m=height,
        shadow_length_m=2.0,
        peak_sigma=6.0,
        highlight_sigma=2.0,
        sharpness=sharp,
        area_px=40,
        confidence=confidence,
        firm=firm,
        shadow_x_m=x + 0.5,
        shadow_y_m=y + 0.3,
        other_depth_sigma=seen,
    )


def epoch(image_id, *detections):
    return Epoch(image_id, list(detections), np.ones((10, 10), dtype=np.float32), BOUNDS)


def by_position(objects):
    return {(round(o.x_m), round(o.y_m)): o for o in objects}


def test_single_image_gives_single_epoch_and_skips_weak_candidates():
    latest = epoch("NEW", detection(310, -2210), detection(320, -2220, firm=False))
    objects = merge_epochs(latest, None)
    assert len(objects) == 1
    assert objects[0].persistence == "single_epoch"
    assert objects[0].last_seen_image == "NEW"
    assert objects[0].evidence == ("shadow",)


def test_seen_on_both_dates_is_persistent_with_averaged_measurements():
    latest = epoch("NEW", detection(310, -2210, diameter=2.0, height=1.0, seen=6.0))
    earlier = epoch("OLD", detection(310.4, -2210.2, diameter=3.0, height=2.0, seen=6.0))
    (found,) = merge_epochs(latest, earlier)
    assert found.persistence == "persistent"
    assert found.last_seen_image == "NEW"
    assert found.evidence == ("shadow", "multitemporal")
    assert (found.diameter_m, found.height_m) == (2.5, 1.5)
    assert found.confidence == pytest.approx(1 - 0.2 * 0.2)


def test_weak_candidate_on_the_other_date_confirms_without_changing_the_measurement():
    latest = epoch("NEW", detection(310, -2210, diameter=2.0, seen=6.0))
    earlier = epoch("OLD", detection(310.3, -2210, diameter=4.0, firm=False, seen=6.0))
    (found,) = merge_epochs(latest, earlier)
    assert found.persistence == "persistent"
    assert found.diameter_m == 2.0


def test_darkness_on_the_other_date_confirms_even_without_a_detection_there():
    # La otra imagen es más borrosa: no detecta, pero muestra algo oscuro donde cae la sombra.
    latest = epoch("NEW")
    earlier = epoch("OLD", detection(310, -2210, seen=3.5))
    (found,) = merge_epochs(latest, earlier)
    assert found.persistence == "persistent"
    assert found.last_seen_image == "NEW"


def test_only_on_the_latest_date_loses_confidence():
    latest = epoch("NEW", detection(310, -2210, confidence=0.8, seen=0.5))
    (found,) = merge_epochs(latest, epoch("OLD"))
    assert found.persistence == "single_epoch"
    assert found.confidence == pytest.approx(0.8 * UNCONFIRMED_FACTOR)


def test_only_on_the_earlier_date_is_not_visible_latest_never_gone():
    earlier = epoch("OLD", detection(310, -2210, confidence=0.8, seen=0.5))
    (found,) = merge_epochs(epoch("NEW"), earlier)
    assert found.persistence == "not_visible_latest"
    assert found.last_seen_image == "OLD"
    assert found.evidence == ("shadow", "multitemporal")
    assert found.confidence == pytest.approx(0.8 * UNCONFIRMED_FACTOR)


def test_other_date_without_data_is_single_epoch_without_penalty():
    latest = epoch("NEW", detection(310, -2210, confidence=0.8, seen=None))
    earlier = epoch("OLD", detection(350, -2250, confidence=0.7, seen=None))
    objects = by_position(merge_epochs(latest, earlier))
    assert objects[(310, -2210)].persistence == "single_epoch"
    assert objects[(310, -2210)].confidence == 0.8
    assert objects[(350, -2250)].persistence == "single_epoch"
    assert objects[(350, -2250)].last_seen_image == "OLD"


def test_a_boulder_seen_twice_enters_the_catalog_once():
    latest = epoch("NEW", detection(310, -2210, seen=6.0), detection(330, -2230, seen=6.0))
    earlier = epoch("OLD", detection(310.2, -2210, seen=6.0), detection(330, -2230.3, seen=6.0))
    assert len(merge_epochs(latest, earlier)) == 2


def test_far_apart_detections_are_different_boulders():
    latest = epoch("NEW", detection(310, -2210, seen=0.0))
    earlier = epoch("OLD", detection(313, -2210, seen=0.0))  # 3 m: más que medio diámetro.
    objects = merge_epochs(latest, earlier)
    assert sorted(o.persistence for o in objects) == ["not_visible_latest", "single_epoch"]


def test_wide_soft_shadow_is_indeterminate_and_small_or_crisp_is_block():
    assert form_of(detection(0, 0, diameter=2.0, sharp=0.12)) == "block"
    assert form_of(detection(0, 0, diameter=5.0, sharp=0.20)) == "block"
    assert form_of(detection(0, 0, diameter=5.0, sharp=0.12)) == "indeterminate"
    # Con dos medidas firmes alcanza con que una lo vea como bloque.
    soft, crisp = detection(0, 0, 5.0, sharp=0.12), detection(0, 0, 5.0, sharp=0.20)
    assert form_of(soft, crisp) == "block"


def test_catalog_follows_the_contract_and_is_never_mock():
    latest = epoch("NEW", detection(310, -2210, seen=6.0), detection(330, -2230, 5.0, sharp=0.1))
    earlier = epoch("OLD", detection(310, -2210, seen=6.0), detection(350, -2250, seen=0.0))
    catalog = build_catalog(merge_epochs(latest, earlier), GRID, ["NEW", "OLD"], "test")
    jsonschema.validate(catalog, SCHEMA)
    assert catalog["is_mock"] is False
    assert catalog["site_id"] == GRID.site_id
    assert catalog["detection_limit_m"] == 1.5
    props = [f["properties"] for f in catalog["features"]]
    assert [p["id"] for p in props] == ["B000001", "B000002", "B000003"]
    assert [p["y_m"] for p in props] == sorted((p["y_m"] for p in props), reverse=True)
    assert {p["composition"] for p in props} == {"indeterminate"}  # Sin color no hay "rock".
    assert {p["method"] for p in props} == {"shadow"}
    assert {p["form"] for p in props} == {"block", "indeterminate"}
    lon, lat = catalog["features"][0]["geometry"]["coordinates"]
    assert (lon, lat) == GRID.xy_to_lonlat(props[0]["x_m"], props[0]["y_m"])


def test_layers_have_data_only_inside_the_processed_window():
    coverage = np.ones((10, 10), dtype=np.float32)
    coverage[:, 9] = 0.2  # Columna este casi sin dato.
    latest = Epoch("NEW", [detection(315, -2215, diameter=3.0, height=1.5)], coverage, BOUNDS)
    footprint = footprint_on_grid(latest, GRID)
    assert footprint.shape == (GRID.height, GRID.width)
    assert footprint.sum() == 90

    catalog = build_catalog(merge_epochs(latest, None), GRID, ["NEW"], "test")
    layers = rasterize_catalog(catalog, GRID, footprint)
    diameter = layers["boulder_max_diam_m"]
    assert (diameter[~footprint] == GRID.nodata).all()  # Fuera de la ventana: desconocido.
    assert diameter[footprint].max() == 3.0
    assert np.count_nonzero(diameter[footprint]) == 1  # El resto: nada detectado, no "libre".
    row = int((GRID.ymax - -2215) // GRID.cell_size_m)
    col = int((315 - GRID.xmin) // GRID.cell_size_m)
    assert diameter[row, col] == 3.0
    assert layers["clear_path_width_m"][row, col] < GRID.cell_size_m


def test_not_visible_latest_goes_to_the_unresolved_layer_not_to_obstacles():
    earlier = epoch("OLD", detection(315, -2215, diameter=3.0, seen=0.0))
    catalog = build_catalog(merge_epochs(epoch("NEW"), earlier), GRID, ["NEW", "OLD"], "test")
    layers = rasterize_catalog(catalog, GRID)
    assert layers["boulder_unresolved_density"].max() > 0
    assert layers["boulder_max_diam_m"].max() == 0
    assert layers["clear_path_width_m"].min() == GRID.cell_size_m
