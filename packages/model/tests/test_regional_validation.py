"""Validación del prior regional: calibración fuera de muestra, conteos y sitios donde se cavó."""

import numpy as np
import pytest

from gp.regional_validation import (
    LANDERS,
    calibration,
    counts,
    lander_check,
    sector_predictions,
)


def _synthetic(n=1500, seed=3):
    rng = np.random.default_rng(seed)
    lat = rng.uniform(20, 75, n)
    lon = rng.uniform(0, 360, n)
    diam = np.exp(rng.normal(np.log(6.0), 0.7, n))
    log_d = 0.5 - 1.1 * (lat - 40) / 10 + rng.normal(0, 0.6, n)
    return lat, lon, diam, log_d < np.log(0.1 * diam)


def test_out_of_sample_predictions_are_calibrated_on_known_truth():
    lat, lon, diam, ice = _synthetic()
    p = sector_predictions(lat, lon, diam, ice, ratio=0.1)
    cal = calibration(p, ice)
    assert cal["brier"] < cal["brier_constant_rate"]
    assert cal["expected_ice"] == pytest.approx(ice.sum(), rel=0.15)
    for b in cal["bins"]:
        if b["n"] >= 50:
            assert b["observed_90"][0] - 0.05 <= b["predicted"] <= b["observed_90"][1] + 0.05


def test_calibration_rejects_degenerate_input():
    with pytest.raises(ValueError):
        calibration(np.array([0.2, 0.3]), np.array([False, False]))
    with pytest.raises(ValueError):
        calibration(np.array([0.2]), np.array([True, False]))


def test_counts_flags_an_excess():
    p = np.full(100, 0.1)
    ice = np.zeros(100, dtype=bool)
    ice[:25] = True
    c = counts(p, ice, np.ones(100, dtype=bool))
    assert c["expected_ice"] == pytest.approx(10.0) and c["ice"] == 25 and c["z"] > 4


def test_landers_have_sources_and_phoenix_falls_inside():
    assert all("doi" in lander.source or "PIA" in lander.source for lander in LANDERS)
    rows = {r["name"]: r for r in lander_check()}
    phoenix = rows["Phoenix"]
    assert phoenix["observed_inside_predictive_90"] is True  # 4.6 cm medidos
    assert phoenix["p_ice_within_dug"] > 0.8
    viking = rows["Viking Lander 2"]
    assert viking["p_ice_within_dug"] < 0.05  # coherente con "no encontró hielo a 10-15 cm"
    assert "Byrne" in viking["note"]  # y la tensión con Byrne queda escrita
