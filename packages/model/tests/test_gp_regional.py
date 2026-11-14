"""Prior regional por latitud (Daubar 2022) y tarjeta de sitio."""

import math
from dataclasses import replace

import numpy as np
import pytest

from gp.planning import FITTED, regional_prior
from gp.regional import (
    MIN_LAT_DEG,
    NoRegionalData,
    RegionalFit,
    bootstrap_fit,
    fit_censored,
    load_fit,
    nearby_check,
    regional_estimate,
    site_assessment,
)

S1094B_LAT = 35.11


def _synthetic(n=3000, b0=0.5, b1=-1.1, sigma=0.6, ratio=0.1, seed=1):
    """Cráteres con la verdad conocida: hielo si la profundidad sorteada es menor que r·D."""
    rng = np.random.default_rng(seed)
    lat = rng.uniform(20, 75, n)
    diam = np.exp(rng.normal(math.log(8.0), 0.8, n))
    log_d = b0 + b1 * (lat - 40) / 10 + rng.normal(0, sigma, n)
    return lat, diam, log_d < np.log(ratio * diam)


def test_fit_recovers_known_coefficients():
    lat, diam, ice = _synthetic()
    beta, sigma = fit_censored(lat, diam, ice)
    assert beta[0] == pytest.approx(0.5, abs=0.15)
    assert beta[1] == pytest.approx(-1.1, abs=0.15)
    assert sigma == pytest.approx(0.6, abs=0.12)


def test_fit_rejects_bad_input():
    with pytest.raises(ValueError):
        fit_censored([30.0, 40.0], [5.0, 6.0], [True, True])  # sin cráteres sin hielo
    with pytest.raises(ValueError):
        fit_censored([30.0, 40.0], [5.0, -1.0], [True, False])
    with pytest.raises(ValueError):
        fit_censored([30.0], [5.0, 6.0], [True, False])


def test_bootstrap_gives_valid_covariance_and_roundtrip():
    lat, diam, ice = _synthetic(n=800)
    fit = bootstrap_fit(lat, diam, ice, n_boot=40)
    cov = np.asarray(fit.beta_cov)
    assert np.linalg.eigvalsh(cov).min() >= 0 and cov[0, 0] > 0
    assert fit.n_craters == 800 and fit.n_ice == int(ice.sum())
    assert fit.ice_lat_min_deg == pytest.approx(lat[ice].min())
    assert RegionalFit.from_json(fit.to_json()) == fit


def test_committed_fit_loads_and_is_sane():
    fit = load_fit()
    assert fit.ratio == pytest.approx(0.1)
    assert fit.beta[1] < 0  # más al norte, hielo más somero
    assert fit.lat_range_deg[0] >= MIN_LAT_DEG
    assert fit.meta["assumption"] is True and "CC BY 4.0" in fit.meta["source"]
    assert fit.lat_range_deg[0] < fit.ice_lat_min_deg < 40  # 39.1°N en Daubar 2022


def test_status_marks_latitudes_without_ice_detections():
    fit = load_fit()
    south = regional_estimate(fit.ice_lat_min_deg - 0.5)
    north = regional_estimate(fit.ice_lat_min_deg + 0.5)
    assert south.status == "extrapolated" and north.status == "ok"
    assert regional_estimate(30.0, replace(fit, ice_lat_min_deg=None)).status == "ok"


def test_s1094b_agrees_with_site_prior():
    """Control externo: el sitio (349 cráteres que el regional no usa) da mediana 2.36 m."""
    est = regional_estimate(S1094B_LAT)
    lo, hi = est.median_interval_m()
    assert lo < math.exp(FITTED["mean"]) < hi
    # Al sur del impacto con hielo más austral: coincide, pero se marca como extrapolado.
    assert est.status == "extrapolated"
    assert any("No ice-exposing impact south of 39.1" in w for w in est.warnings)
    assert 0.02 < est.p_within(1.0) < 0.15


def test_estimate_gets_shallower_north_and_warns_outside_data():
    south, north = regional_estimate(30.0), regional_estimate(60.0)
    assert north.median_m < south.median_m
    assert north.p_within(1.0) > south.p_within(1.0)
    far = regional_estimate(85.0)
    assert far.status == "extrapolated" and any("extrapolated" in w for w in far.warnings)
    assert far.sd_coef > regional_estimate(45.0).sd_coef


@pytest.mark.parametrize("lat", [-45.0, 0.0, MIN_LAT_DEG - 1])
def test_no_regional_data_south_or_low_latitude(lat):
    with pytest.raises(NoRegionalData, match="Sin datos regionales"):
        regional_estimate(lat)


def test_estimate_rejects_invalid_latitude():
    for lat in (float("nan"), 91.0, "35"):
        with pytest.raises(ValueError):
            regional_estimate(lat)


def test_p_interval_brackets_point_estimate():
    est = regional_estimate(S1094B_LAT)
    for depth in (1.0, 3.0, 10.0):
        lo, hi = est.p_within_interval(depth)
        assert lo <= hi
        assert lo - 0.05 <= est.p_within(depth) <= hi + 0.05


def test_site_assessment_without_threshold_has_no_verdict():
    card = site_assessment(S1094B_LAT, {"core_drill": 1.0, "gpr": 10.0})
    assert "verdict" not in card
    assert card["tools"]["gpr"]["p_ice"] > card["tools"]["core_drill"]["p_ice"]
    assert card["status"] == "extrapolated"
    assert site_assessment(45.0, {"gpr": 10.0})["status"] == "ok"


def test_site_assessment_verdicts_follow_the_interval():
    card = site_assessment(S1094B_LAT, {"core_drill": 1.0, "gpr": 10.0}, min_p=0.5)
    assert card["tools"]["core_drill"]["verdict"] == "NO_GO"
    assert card["tools"]["gpr"]["verdict"] == "GO"
    assert card["verdict"] == "GO"  # basta con una herramienta que alcance
    p3 = site_assessment(S1094B_LAT, {"drill_3m": 3.0}, min_p=0.5)
    assert p3["tools"]["drill_3m"]["verdict"] == "CONDITIONAL"  # P ~0.52, intervalo cruza 0.5


def test_site_assessment_without_data_is_insufficient():
    card = site_assessment(-40.0, {"gpr": 10.0}, min_p=0.5)
    assert card["verdict"] == "INSUFFICIENT_DATA" and card["tools"] == {}
    assert card["warnings"][0].startswith("No regional data")  # en inglés: va a la interfaz
    with pytest.raises(ValueError):
        site_assessment(S1094B_LAT, {"gpr": 10.0}, min_p=1.5)
    with pytest.raises(ValueError):
        site_assessment(S1094B_LAT, {})


def test_regional_prior_splits_total_variance():
    prior = regional_prior(50.0)
    est = regional_estimate(50.0)
    assert prior.mean_log_depth == pytest.approx(est.mean_log_depth)
    assert prior.kernel.sill + prior.nugget == pytest.approx(est.sd_total**2)
    assert prior.kernel.range_m == FITTED["range_m"]
    with pytest.raises(NoRegionalData):
        regional_prior(-30.0)
    with pytest.raises(ValueError):
        regional_prior(50.0, rho=0.0)


def test_nearby_check_flags_arcadia_but_not_everywhere():
    # Amazonis/Arcadia (46°N, 189°E): sobran impactos con hielo, el prior es conservador ahí.
    arcadia = nearby_check(46.16, 188.8)
    assert arcadia["ice"] > arcadia["expected_ice"] and arcadia["z"] > 2
    # Longitud negativa o mayor a 360 es la misma: la ventana da la vuelta al planeta.
    assert nearby_check(46.16, 188.8 - 360) == arcadia
    card = site_assessment(46.16, {"gpr": 10.0}, lon_e_deg=188.8)
    assert card["nearby_impacts"] == arcadia
    assert any("likely shallower" in w for w in card["warnings"])
    # Alrededor de Viking 2 (134°E) no sobra: el control local no explica la tensión con Byrne.
    vl2 = site_assessment(47.97, {"gpr": 10.0}, lon_e_deg=134.26)
    assert vl2["nearby_impacts"]["z"] < 2
    assert not any("likely shallower" in w for w in vl2["warnings"])
    # Sin longitud no hay control local.
    assert "nearby_impacts" not in site_assessment(47.97, {"gpr": 10.0})
    with pytest.raises(ValueError):
        nearby_check(40.0, float("nan"))
