"""Cruce de fechas, alturas y catálogo del Mask R-CNN. No necesita torch ni la GPU."""

import json

import jsonschema
import numpy as np

from vision.boulders import Detection
from vision.catalog import Epoch
from vision.grid import REPO_ROOT, load_grid
from vision.maskrcnn_run import Found, attach_heights, build_objects, to_catalog

SCHEMA = json.loads(
    (REPO_ROOT / "packages/contracts/schemas/boulders.schema.json").read_text(encoding="utf-8")
)


def _epoch(image_id: str) -> Epoch:
    # Ventana de 40 × 40 m con dato en todas sus celdas.
    return Epoch(image_id, [], np.ones((4, 4), np.float32), (0.0, -40.0, 40.0, 0.0))


def _shadow(x: float, y: float, height: float) -> Detection:
    return Detection(x, y, 2.0, height, 3.0, 4.0, 1.0, 1.0, 20, 0.8, True)


def test_two_dates_give_persistent_or_single_but_never_not_visible():
    grid = load_grid()
    latest = [Found(5.0, -5.0, 2.0, 0.9), Found(20.0, -20.0, 3.0, 0.8)]
    earlier = [Found(5.3, -5.1, 2.2, 0.7), Found(30.0, -30.0, 2.5, 0.6)]
    objects = build_objects(
        latest, earlier, _epoch("B"), _epoch("A"), ("A", "B"), grid
    )
    assert len(objects) == 3
    by_image = {(o["persistence"], o["image"]): o for o in objects}
    persistent = by_image[("persistent", "A")]["found"]
    assert abs(persistent.diameter_m - 2.1) < 1e-9
    assert by_image[("persistent", "A")]["confidence"] > 0.9
    # La fecha anterior tenía dato ahí y no lo vio: baja la confianza.
    assert by_image[("single_epoch", "A")]["confidence"] < 0.8
    # Solo en la anterior: la última puede ser más borrosa. Sin castigo y sin "no visible".
    assert by_image[("single_epoch", "B")]["confidence"] == 0.6
    assert all(o["persistence"] != "not_visible_latest" for o in objects)


def test_height_comes_from_the_nearest_shadow_or_stays_null():
    grid = load_grid()
    objects = build_objects([Found(5.0, -5.0, 2.0, 0.9), Found(20.0, -20.0, 3.0, 0.8)],
                            None, None, _epoch("A"), ("A", None), grid)
    attach_heights(objects, [_shadow(5.4, -5.2, 1.1)])
    heights = sorted((o["height_m"] for o in objects), key=lambda h: h is None)
    assert heights == [1.1, None]

    catalog = to_catalog(objects, grid, ["A"])
    jsonschema.validate(catalog, SCHEMA)
    props = {f["properties"]["x_m"]: f["properties"] for f in catalog["features"]}
    assert props[5.0]["height_source"] == "shadow"
    assert props[5.0]["evidence"] == ["appearance", "shadow"]
    assert props[20.0]["height_m"] is None and props[20.0]["height_source"] is None
    assert all(p["method"] == "bouldernet" for p in props.values())
