import math

import numpy as np
import pytest

from gp.kernel import Matern32
from gp.observations import flat_floor_crater
from gp.posterior import Prior, posterior
from gp.simulation import (
    STRATEGIES,
    Scenario,
    candidates,
    expected_entropy_drop,
    make_prior,
    measure,
    run_campaign,
    run_eva,
    sample_world,
    scores,
)

SCENARIO = Scenario(0.0, 0.0, reach_m=3.0, radius_m=600.0, spacing_m=100.0, budget_m=2400.0)
PRIOR = make_prior(0.86, 0.299, 0.5, 100.0)


def test_candidatas_dentro_del_radio_y_espaciadas():
    x, y = candidates(SCENARIO)
    assert np.hypot(x, y).max() <= 600.0
    assert len(x) == np.sum(
        np.hypot(*np.meshgrid(np.arange(-600, 601, 100), np.arange(-600, 601, 100))) <= 600
    )


def test_prior_reparte_la_varianza():
    prior = make_prior(0.86, 0.3, 0.5, 100.0)
    assert prior.kernel.sill == pytest.approx(0.15)
    assert prior.nugget == pytest.approx(0.15)


def test_medicion_somera_da_profundidad_y_profunda_da_cota():
    rng = np.random.default_rng(0)
    shallow = measure(0.0, 0.0, math.log(1.2), SCENARIO, rng)
    deep = measure(0.0, 0.0, math.log(5.0), SCENARIO, rng)
    assert shallow.kind == "depth" and abs(shallow.depth_m - 1.2) < 0.3
    assert deep.kind == "deeper_than" and deep.depth_m == SCENARIO.reach_m


def test_informacion_es_mayor_donde_hay_ambiguedad():
    # Celda 0 ambigua (media en el umbral), celda 1 casi segura; independientes.
    mean = np.array([math.log(3.0), math.log(30.0)])
    cov = np.diag([0.3, 0.3])
    drop = expected_entropy_drop(mean, cov, nugget=0.0, noise=0.01, threshold=3.0)
    assert drop[0] > drop[1]
    assert drop[1] == pytest.approx(0.0, abs=1e-3)


def test_medir_una_celda_no_informa_a_otra_independiente():
    mean = np.array([math.log(3.0), math.log(3.0)])
    cov = np.diag([0.3, 0.3])
    single = expected_entropy_drop(mean[:1], cov[:1, :1], 0.0, 0.01, 3.0)[0]
    pair = expected_entropy_drop(mean, cov, 0.0, 0.01, 3.0)[0]
    assert pair == pytest.approx(single, rel=1e-6)


def test_repartida_y_cercana_eligen_lo_esperado():
    x, y = np.array([100.0, 500.0]), np.array([0.0, 0.0])
    visited = np.zeros(2, bool)
    rng = np.random.default_rng(0)
    post = posterior(PRIOR, [])
    spread = scores("spread", post, PRIOR, x, y, (0.0, 0.0), visited, SCENARIO, rng)
    near = scores("nearest", post, PRIOR, x, y, (0.0, 0.0), visited, SCENARIO, rng)
    assert np.argmax(spread) == 1 and np.argmax(near) == 0


def test_blancos_prefieren_el_crater_somero():
    craters = [flat_floor_crater(300.0, 0.0, 0.8)]
    x, y = np.array([300.0, -300.0]), np.array([0.0, 0.0])
    post = posterior(PRIOR, craters)
    s = scores("targets", post, PRIOR, x, y, (0.0, 0.0), np.zeros(2, bool), SCENARIO, None)
    assert np.argmax(s) == 0


@pytest.mark.parametrize("strategy", STRATEGIES)
def test_eva_respeta_presupuesto_y_devuelve_metricas(strategy):
    rng = np.random.default_rng(1)
    x, y = candidates(SCENARIO)
    craters = [flat_floor_crater(200.0, 100.0, 1.0)]
    truth = sample_world(PRIOR, craters, x, y, rng)
    result = run_eva(strategy, PRIOR, craters, truth, x, y, SCENARIO, rng)
    assert result["walked_km"] <= SCENARIO.budget_m / 1000 + 1e-9
    assert 1 <= result["stations"] <= SCENARIO.stations
    assert 0 <= result["hits"] <= result["stations"]
    assert result["any_hit"] in (0.0, 1.0)


def test_mundos_respetan_un_dato_preciso():
    rng = np.random.default_rng(2)
    prior = Prior(0.86, Matern32(0.15, 100.0), nugget=0.0)
    craters = [flat_floor_crater(0.0, 0.0, 1.0, error_m=0.01)]
    x, y = np.array([0.0, 1000.0]), np.array([0.0, 0.0])
    samples = np.array([sample_world(prior, craters, x, y, rng) for _ in range(200)])
    assert abs(samples[:, 0].mean() - 0.0) < 0.02
    assert samples[:, 1].std() == pytest.approx(math.sqrt(0.15), rel=0.2)


def test_geologo_va_al_crater_somero_cercano():
    craters = [flat_floor_crater(300.0, 0.0, 0.6), flat_floor_crater(-300.0, 0.0, 2.0)]
    x, y = np.array([300.0, -300.0, 0.0]), np.array([0.0, 0.0, 500.0])
    post = posterior(PRIOR, craters)
    s = scores(
        "geologist", post, PRIOR, x, y, (0.0, 0.0), np.zeros(3, bool), SCENARIO, None, craters
    )
    assert np.argmax(s) == 0
    assert s[2] < s[1]  # sin cráter cerca queda por debajo


def test_geologo_sin_crateres_reparte():
    x, y = np.array([100.0, 500.0]), np.array([0.0, 0.0])
    post = posterior(PRIOR, [])
    s = scores("geologist", post, PRIOR, x, y, (0.0, 0.0), np.zeros(2, bool), SCENARIO, None, [])
    assert np.argmax(s) == 1


def test_campana_no_repite_estaciones_y_cuenta_la_primera_eva():
    rng = np.random.default_rng(3)
    x, y = candidates(SCENARIO)
    craters = [flat_floor_crater(200.0, 100.0, 1.0)]
    truth = sample_world(PRIOR, craters, x, y, rng)
    metrics, obs, visited = run_eva(
        "spread", PRIOR, craters, truth, x, y, SCENARIO, rng, None, True
    )
    _, _, visited2 = run_eva("spread", PRIOR, obs, truth, x, y, SCENARIO, rng, visited, True)
    assert visited2.sum() > visited.sum()
    assert (visited2 & visited).sum() == visited.sum()
    result = run_campaign("potential_uncertainty", PRIOR, craters, truth, x, y, SCENARIO, rng, 3)
    assert 0 <= result["campaign_hits"] <= 3 * SCENARIO.stations
    assert 1 <= result["first_hit_eva"] <= 4
