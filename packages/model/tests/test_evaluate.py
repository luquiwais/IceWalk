import json

import numpy as np
import pytest

from vision.evaluate import catalog_objects, cumulative_per_km2, power_law_index, score
from vision.labels import Label, load_labels


def test_perfect_detection_scores_one():
    labels = [Label(0, 0, 2.5), Label(10, 0, 3.0)]
    result = score(labels, [Label(0.2, 0.1, 2.4), Label(10.0, 0.3, 3.5)])
    assert (result.true_positives, result.false_positives, result.false_negatives) == (2, 0, 0)
    assert result.f1 == 1.0
    assert result.median_diameter_error_px == pytest.approx((0.1 / 0.25 + 0.5 / 0.25) / 2)


def test_misses_and_false_alarms_lower_f1():
    labels = [Label(0, 0, 2.5), Label(10, 0, 3.0), Label(20, 0, 4.0)]
    found = [Label(0, 0, 2.5), Label(50, 50, 2.2)]
    result = score(labels, found)
    assert (result.true_positives, result.false_positives, result.false_negatives) == (1, 1, 2)
    assert result.precision == 0.5
    assert result.recall == pytest.approx(1 / 3)
    assert result.f1 == pytest.approx(0.4)


def test_small_labels_and_small_detections_do_not_count():
    labels = [Label(0, 0, 1.2), Label(10, 0, 2.5)]
    found = [
        Label(0, 0, 2.3),  # Bloque real pero anotado chico: ni acierto ni falsa alarma.
        Label(10, 0, 1.6),  # Bloque grande detectado chico: acierto (el tamaño se mide aparte).
        Label(40, 40, 1.0),  # Falsa alarma por debajo del umbral: no cuenta.
    ]
    result = score(labels, found, min_diameter_m=2.0)
    assert result.n_labels == 1
    assert (result.true_positives, result.false_positives, result.false_negatives) == (1, 0, 0)


def test_each_detection_matches_at_most_one_label():
    labels = [Label(0, 0, 3.0), Label(1.0, 0, 3.0)]
    result = score(labels, [Label(0.4, 0, 3.0)])
    assert (result.true_positives, result.false_negatives) == (1, 1)


def test_nothing_found_and_nothing_labelled_are_zero_not_an_error():
    assert score([Label(0, 0, 3.0)], []).f1 == 0.0
    assert score([], [Label(0, 0, 3.0)]).precision == 0.0
    assert score([], []).median_diameter_error_px is None


def write_geojson(path, features):
    path.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}), encoding="utf-8"
    )


def test_labels_can_be_lines_points_or_polygons_in_grid_metres(tmp_path):
    path = tmp_path / "labels.geojson"
    square = [[100, -2000], [102, -2000], [102, -1998], [100, -1998], [100, -2000]]
    write_geojson(
        path,
        [
            {  # Una línea de lado a lado del bloque.
                "type": "Feature",
                "properties": {},
                "geometry": {"type": "LineString", "coordinates": [[300, -2200], [303, -2204]]},
            },
            {
                "type": "Feature",
                "properties": {"diameter_m": 2.5},
                "geometry": {"type": "Point", "coordinates": [310, -2210]},
            },
            {
                "type": "Feature",
                "properties": None,
                "geometry": {"type": "Polygon", "coordinates": [square]},
            },
        ],
    )
    line, point, polygon = load_labels(path)
    assert (line.x_m, line.y_m, line.diameter_m) == (301.5, -2202.0, 5.0)
    assert point == Label(310.0, -2210.0, 2.5)
    assert (polygon.x_m, polygon.y_m) == pytest.approx((101.0, -1999.0))
    assert polygon.diameter_m == pytest.approx(2 * np.sqrt(4 / np.pi))


def test_labels_from_csv(tmp_path):
    path = tmp_path / "labels.csv"
    path.write_text("x_m,y_m,diameter_m\n300.5,-2200.25,2.0\n", encoding="utf-8")
    assert load_labels(path) == [Label(300.5, -2200.25, 2.0)]


def test_labels_in_degrees_fail_instead_of_being_read_as_metres(tmp_path):
    path = tmp_path / "labels.geojson"
    write_geojson(
        path,
        [
            {
                "type": "Feature",
                "properties": {"diameter_m": 2.0},
                "geometry": {"type": "Point", "coordinates": [189.83, 35.09]},
            }
        ],
    )
    with pytest.raises(ValueError, match="grados"):
        load_labels(path)


def test_point_without_diameter_fails(tmp_path):
    path = tmp_path / "labels.geojson"
    write_geojson(
        path,
        [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {"type": "Point", "coordinates": [300, -2200]},
            }
        ],
    )
    with pytest.raises(ValueError, match="diameter_m"):
        load_labels(path)


def catalog(*items):
    return {
        "features": [
            {"properties": {"x_m": x, "y_m": y, "diameter_m": d, "persistence": p, "form": f}}
            for x, y, d, p, f in items
        ]
    }


def test_catalog_objects_filter_by_window_circle_visibility_and_form():
    data = catalog(
        (10, 10, 2.0, "persistent", "block"),
        (500, 0, 3.0, "persistent", "block"),
        (20, 20, 4.0, "not_visible_latest", "block"),
        (30, 30, 5.0, "single_epoch", "indeterminate"),
    )
    assert len(catalog_objects(data)) == 3
    assert len(catalog_objects(data, visible_only=False)) == 4
    assert [o.diameter_m for o in catalog_objects(data, radius_m=100)] == [2.0, 5.0]
    assert [o.diameter_m for o in catalog_objects(data, bounds=(0, 0, 25, 25))] == [2.0]
    assert [o.diameter_m for o in catalog_objects(data, blocks_only=True)] == [2.0, 3.0]


def test_cumulative_counts_are_per_square_kilometre():
    diameters = np.array([1.6, 1.9, 2.5, 3.5])
    assert cumulative_per_km2(diameters, [1.8, 3.0], area_km2=0.5) == {1.8: 6.0, 3.0: 2.0}


def test_power_law_index_recovers_a_known_distribution():
    # N(>= D) ~ D^-4.68, como febrero de 2022 en Tusberti et al.
    rng = np.random.default_rng(0)
    diameters = 1.8 * (1 - rng.random(20000)) ** (-1 / 4.68)
    index, error, n = power_law_index(diameters, xmin_m=1.8)
    assert n == 20000
    assert index == pytest.approx(-4.68, abs=3 * error)
    assert error == pytest.approx(4.68 / np.sqrt(20000), rel=0.05)


def test_power_law_needs_blocks_above_xmin():
    with pytest.raises(ValueError, match="menos de 2"):
        power_law_index(np.array([1.0, 1.2, 2.0]), xmin_m=1.8)
