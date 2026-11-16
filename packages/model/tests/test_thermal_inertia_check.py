"""Prueba de la inercia térmica como covariable: geometría de los mapas y la comparación en sí."""

import math

import numpy as np
import pytest

from gp.thermal_inertia_check import (
    cv_predict,
    make_models,
    mean_metrics,
    permutation_test,
    permute_within_bands,
    stratified_folds,
    tes_pixel,
    themis_tile,
    window_stats,
)


def test_themis_tile_and_coordinates():
    tile, x, y = themis_tile(35.1105, 189.8273)
    assert tile == "30N180E"
    assert x == pytest.approx(3396190.0 * math.radians(189.8273 - 360))
    assert y == pytest.approx(3396190.0 * math.radians(35.1105))
    assert themis_tile(25.0, 10.0)[0] == "00N000E"
    with pytest.raises(ValueError):
        themis_tile(65.0, 10.0)  # el mosaico termina en 60°N


def test_tes_pixel_follows_the_pds_label():
    # Línea 1 en 90°N, muestra 1 en 180°W, 20 px/°.
    assert tes_pixel(89.99, -179.99) == (0, 0)
    assert tes_pixel(0.0, 0.0) == (1800, 3600)
    assert tes_pixel(35.1105, 189.8273) == (1097, 196)  # 189.83°E = 170.17°W, 9.83° desde 180°W


def test_window_stats_ignores_nodata():
    block = np.full((11, 11), 200.0)
    block[5, 5] = -3.4e38
    block[0, :] = np.nan
    stats = window_stats(block, nodata=-3.4e38)
    assert math.isnan(stats["ti_center"])
    assert stats["ti_500m"] == 200.0


def test_permutation_keeps_values_inside_each_band():
    rng = np.random.default_rng(0)
    lat = rng.uniform(20, 60, 200)
    x = lat * 10 + rng.normal(0, 1, 200)
    xp = permute_within_bands(x, lat, rng)
    bands = np.floor(lat / 5).astype(int)
    for b in np.unique(bands):
        assert sorted(xp[bands == b]) == sorted(x[bands == b])


def _synthetic(ti_effect: float, n: int = 500, seed: int = 4):
    """Profundidad que depende de la latitud y, si `ti_effect` ≠ 0, de la TI."""
    rng = np.random.default_rng(seed)
    lat = rng.uniform(20, 70, n)
    diam = np.exp(rng.normal(np.log(6.0), 0.7, n))
    z_ti = rng.normal(0, 1, n)
    log_d = 0.5 - 1.1 * (lat - 40) / 10 + ti_effect * z_ti + rng.normal(0, 0.5, n)
    ice = log_d < np.log(0.1 * diam)
    return np.c_[lat, diam, np.log(200.0) + 0.4 * z_ti], ice


def test_ti_with_real_signal_beats_latitude_and_passes_permutation():
    data, y = _synthetic(ti_effect=-0.8)
    folds = stratified_folds(y, repeats=2, seed=0)
    models = make_models()
    ll = {m: mean_metrics(cv_predict(models[m], data, y, folds), y)["log_loss"]
          for m in ("probit_lat", "probit_lat_ti")}
    assert ll["probit_lat_ti"] < ll["probit_lat"] - 0.01
    pt = permutation_test(models["probit_lat"], models["probit_lat_ti"], data, y, folds,
                          n_perm=19)
    assert pt["p_value"] <= 0.05


def test_ti_without_signal_does_not_help():
    data, y = _synthetic(ti_effect=0.0)
    folds = stratified_folds(y, repeats=2, seed=0)
    models = make_models()
    ll = {m: mean_metrics(cv_predict(models[m], data, y, folds), y)["log_loss"]
          for m in ("logit_lat", "logit_lat_ti")}
    assert ll["logit_lat_ti"] > ll["logit_lat"] - 0.005


def test_folds_are_stratified():
    y = np.r_[np.ones(20, bool), np.zeros(80, bool)]
    folds = stratified_folds(y, k=5, repeats=3, seed=1)
    for r in range(3):
        for f in range(5):
            assert (folds[r][y] == f).sum() == 4
