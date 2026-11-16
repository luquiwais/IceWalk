"""BoulderNet sin detectron2: lo que rodea al modelo (escala, solapes, fechas, contrato)."""

import json

import jsonschema
import numpy as np

from vision.bouldernet_infer import Found, build_catalog, dedupe, downsample, predict
from vision.grid import REPO_ROOT, load_grid

GRID = load_grid()
SCHEMA = json.loads(
    (REPO_ROOT / "packages/contracts/schemas/boulders.schema.json").read_text(encoding="utf-8")
)


class _Array:
    def __init__(self, values):
        self._values = np.asarray(values)

    def numpy(self):
        return self._values


class _Instances:
    def __init__(self, masks, scores):
        self.pred_masks = _Array(masks)
        self.scores = _Array(scores)

    def __len__(self):
        return len(self.scores.numpy())

    def to(self, _device):
        return self


class _Predictor:
    """Imita a `DefaultPredictor`: devuelve una máscara fija y guarda lo que recibió."""

    def __init__(self, masks, scores):
        self.instances = _Instances(masks, scores)
        self.seen = None

    def __call__(self, image):
        self.seen = image
        return {"instances": self.instances}


def test_downsample_averages_and_drops_partial_nodata():
    image = np.array([[10, 20, 0, 40], [30, 40, 50, 60]], dtype=np.uint8)
    small, valid = downsample(image, 2)
    assert small.tolist() == [[25, 0]]
    assert valid.tolist() == [[True, False]]


def test_predict_gives_center_and_equal_area_diameter_in_pixels():
    mask = np.zeros((1, 20, 20), dtype=bool)
    mask[0, 4:8, 10:14] = True  # 16 píxeles, centro en (12, 6)
    predictor = _Predictor(mask, [0.9])
    image = np.full((20, 20), 100, dtype=np.uint8)
    valid = np.ones((20, 20), dtype=bool)
    valid[0, 0] = False
    image[0, 0] = 0
    (found,) = predict(predictor, image, valid)
    assert (found.x, found.y) == (12.0, 6.0)
    assert np.isclose(found.diameter, 2 * np.sqrt(16 / np.pi))
    assert predictor.seen.shape == (20, 20, 3)
    assert predictor.seen[0, 0, 0] == 100  # El sin dato se rellena, no queda negro.


def test_dedupe_keeps_highest_score_in_overlaps():
    kept = dedupe([Found(0, 0, 3, 0.4), Found(0.5, 0, 3, 0.8), Found(20, 0, 3, 0.5)])
    assert sorted((f.x, f.score) for f in kept) == [(0.5, 0.8), (20, 0.5)]


def test_catalog_crosses_dates_inherits_shadow_height_and_follows_contract():
    latest = [Found(300.0, -2200.0, 3.0, 0.8), Found(320.0, -2200.0, 2.0, 0.6)]
    earlier = [Found(300.4, -2200.0, 3.4, 0.5), Found(340.0, -2200.0, 2.5, 0.7)]
    shadow = ([Found(300.2, -2200.1, 3.1, 1.0)], [1.4])
    catalog = build_catalog(
        ("ESP_073578_2155", latest), ("ESP_073077_2155", earlier), shadow, GRID, 3.0
    )
    jsonschema.validate(catalog, SCHEMA)
    props = {round(f["properties"]["x_m"]): f["properties"] for f in catalog["features"]}
    assert set(props) == {300, 320, 340}
    both = props[300]
    assert both["persistence"] == "persistent"
    assert np.isclose(both["diameter_m"], 3.2)
    assert np.isclose(both["confidence"], 0.9)
    assert both["height_m"] == 1.4 and both["height_source"] == "shadow"
    assert both["evidence"] == ["appearance", "multitemporal", "shadow"]
    assert props[320]["height_m"] is None and props[320]["height_source"] is None
    assert props[340]["persistence"] == "single_epoch"
    assert props[340]["last_seen_image"] == "ESP_073077_2155"
    assert all(p["method"] == "bouldernet" for p in props.values())


def test_stretch_maps_image_levels_to_training_levels_and_keeps_nodata():
    from vision.bouldernet_infer import TRAIN_LEVELS, levels_of, stretch

    image = np.array([[0, 200, 210], [220, 230, 240]], dtype=np.uint8)
    valid = image > 0
    out = stretch(image, valid, (200.0, 240.0))
    assert out[0, 0] == 0
    assert out[0, 1] == TRAIN_LEVELS[0] and out[1, 2] == TRAIN_LEVELS[1]
    assert np.all(np.diff(out[valid].astype(int)) > 0)
    low, high = levels_of(image, valid)
    assert 200 <= low < high <= 240
