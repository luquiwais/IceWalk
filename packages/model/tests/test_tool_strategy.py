"""Radar primero, taladro después."""

import math

import pytest
from scipy.special import ndtr

from gp.planning import FITTED
from gp.tool_strategy import radar_then_drill, sensitivity


def test_blind_rate_matches_the_site_prior():
    r = radar_then_drill(n=200_000)
    expected = float(ndtr((math.log(1.0) - FITTED["mean"]) / math.sqrt(FITTED["variance"])))
    assert r.p_blind == pytest.approx(expected, abs=0.003)  # ~0.06 en S1094b


def test_perfect_radar_makes_flags_almost_certain_hits():
    r = radar_then_drill(false_p=0.0, permittivity_sigma=1e-3, resolution_m=1e-3, n=200_000)
    assert r.p_hit_given_flag > 0.99


def test_useless_radar_gives_no_lift():
    # Todo reflector es falso: marcar no dice nada del hielo.
    r = radar_then_drill(false_p=0.999, n=200_000)
    assert r.lift == pytest.approx(1.0, abs=0.25)


def test_guided_eva_beats_blind_and_more_soundings_help():
    few, many = radar_then_drill(soundings=10), radar_then_drill(soundings=200)
    assert few.p_eva(few.p_blind) < few.p_eva_guided() < many.p_eva_guided() <= 1
    assert many.evas_to_confirm(guided=True) < many.evas_to_confirm(guided=False)


def test_lift_survives_the_documented_ranges():
    rows = sensitivity(n=100_000)
    assert len(rows) == 9
    assert min(r["lift"] for r in rows) > 4  # 5.7-11.4 con los rangos de SOURCES.md


def test_rejects_bad_inputs():
    for kwargs in ({"drill_m": 0}, {"false_p": 1.0}, {"stations": 0}, {"soundings": 0}):
        with pytest.raises(ValueError):
            radar_then_drill(**kwargs)
