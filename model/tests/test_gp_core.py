import json
import math
from pathlib import Path

import numpy as np
import pytest
from scipy.special import log_ndtr

from gp.kernel import Matern32
from gp.observations import (
    Observation,
    deeper_than,
    flat_floor_crater,
    from_measurement,
    measured_depth,
    non_flat_crater,
    shallower_than,
)
from gp.posterior import Prior, posterior

EXAMPLES = Path(__file__).resolve().parents[2] / "contracts" / "examples"
TOOLS = {t["id"]: t for t in json.loads((EXAMPLES / "tools.catalog.json").read_text("utf-8"))}
MEASUREMENT = json.loads((EXAMPLES / "measurement.example.json").read_text("utf-8"))
PRIOR = Prior(mean_log_depth=-0.03, kernel=Matern32(sill=0.25, range_m=200.0))


def measurement(tool, result, depth_m=None, position=(0.0, 0.0)):
    return {**MEASUREMENT, "tool": tool, "result": result, "depth_m": depth_m, "position": position}


def exact_by_sampling(prior, observations, x_query, n=400_000, seed=0):
    """Verdad de referencia: muestras del prior pesadas por la verosimilitud de cada dato."""
    x_obs = np.array([o.x_m for o in observations])
    y_obs = np.array([o.y_m for o in observations])
    x_all = np.concatenate([x_obs, x_query])
    y_all = np.concatenate([y_obs, np.zeros_like(x_query)])
    cov = prior.kernel(x_all, y_all, x_all, y_all) + 1e-10 * np.eye(x_all.size)
    rng = np.random.default_rng(seed)
    z = prior.mean_log_depth + rng.standard_normal((n, x_all.size)) @ np.linalg.cholesky(cov).T
    log_w = np.zeros(n)
    for i, o in enumerate(observations):
        target = math.log(o.depth_m)
        if o.kind == "depth":
            log_w += -0.5 * ((z[:, i] - target) / o.sigma_log) ** 2
        else:
            sign = 1.0 if o.kind == "deeper_than" else -1.0
            log_w += log_ndtr(sign * (z[:, i] - target) / o.sigma_log)
    w = np.exp(log_w - log_w.max())
    w /= w.sum()
    z_query = z[:, x_obs.size :]
    mean = w @ z_query
    return mean, np.sqrt(w @ (z_query - mean) ** 2), w @ (z_query <= 0.0)


# Observaciones


def test_error_de_profundidad_pasa_a_log():
    assert flat_floor_crater(1.0, 2.0, 1.5).sigma_log == pytest.approx(0.1)


def test_crater_sin_fondo_plano_es_cota_inferior():
    obs = non_flat_crater(0.0, 0.0, diameter_m=20.0)
    assert obs.kind == "deeper_than"
    assert obs.depth_m == pytest.approx(4.0)
    assert non_flat_crater(0.0, 0.0, diameter_m=20.0, ratio=0.1).depth_m == pytest.approx(2.0)


@pytest.mark.parametrize(
    "x_m, depth_m, sigma_log",
    [
        (math.nan, 1.0, 0.1),
        (0.0, 0.0, 0.1),
        (0.0, -1.0, 0.1),
        (0.0, 1.0, 0.0),
        (0.0, math.inf, 0.1),
    ],
)
def test_observacion_invalida_se_rechaza(x_m, depth_m, sigma_log):
    with pytest.raises(ValueError):
        Observation(x_m, 0.0, "depth", depth_m, sigma_log, "test")


def test_tipo_desconocido_se_rechaza():
    with pytest.raises(ValueError):
        Observation(0.0, 0.0, "maybe", 1.0, 0.1, "test")


def test_ejemplo_del_contrato_se_traduce():
    obs = from_measurement(MEASUREMENT, TOOLS[MEASUREMENT["tool"]])
    assert (obs.kind, obs.x_m, obs.y_m) == ("deeper_than", 420, 610)
    assert obs.depth_m == TOOLS["neutron_spectrometer"]["depth_m"]


def test_espectrometro_con_si_es_cota_superior_por_su_alcance():
    obs = from_measurement(
        measurement("neutron_spectrometer", "ice"), TOOLS["neutron_spectrometer"]
    )
    assert obs.kind == "shallower_than"
    assert obs.depth_m == TOOLS["neutron_spectrometer"]["depth_m"]


def test_taladro_que_toca_da_profundidad():
    obs = from_measurement(measurement("core_drill", "ice", 0.8), TOOLS["core_drill"])
    assert (obs.kind, obs.depth_m) == ("depth", 0.8)


def test_taladro_que_no_toca_usa_lo_alcanzado():
    obs = from_measurement(measurement("core_drill", "no_ice", 0.7), TOOLS["core_drill"])
    assert (obs.kind, obs.depth_m) == ("deeper_than", 0.7)


def test_taladro_que_no_toca_y_no_informa_lo_alcanzado_usa_su_alcance():
    obs = from_measurement(measurement("core_drill", "no_ice"), TOOLS["core_drill"])
    assert (obs.kind, obs.depth_m) == ("deeper_than", TOOLS["core_drill"]["depth_m"])


def test_taladro_que_no_profundizo_no_informa():
    assert from_measurement(measurement("core_drill", "no_ice", 0), TOOLS["core_drill"]) is None


def test_radar_usa_su_resolucion_vertical():
    obs = from_measurement(measurement("gpr", "ice", 1.5), TOOLS["gpr"])
    assert obs.sigma_log == pytest.approx(TOOLS["gpr"]["vertical_resolution_m"] / 1.5)


@pytest.mark.parametrize(
    "tool, result",
    [("core_drill", "inconclusive"), ("camera_spectrometer", "ice"), ("sample_kit", "no_ice")],
)
def test_lo_que_no_informa_sobre_la_tabla_devuelve_none(tool, result):
    assert from_measurement(measurement(tool, result), TOOLS[tool]) is None


def test_medicion_con_otra_herramienta_se_rechaza():
    with pytest.raises(ValueError):
        from_measurement(measurement("gpr", "ice"), TOOLS["core_drill"])


# Kernel


def test_kernel_en_cero_y_en_el_alcance():
    kernel = Matern32(sill=0.25, range_m=200.0)
    x1, zero = np.array([0.0]), np.array([0.0])
    assert kernel(x1, zero, x1, zero)[0, 0] == pytest.approx(0.25)
    assert kernel(x1, zero, np.array([200.0]), zero)[0, 0] == pytest.approx(0.25 * 0.05, rel=1e-3)


def test_kernel_simetrico_y_definido_positivo():
    rng = np.random.default_rng(3)
    x, y = rng.uniform(0, 1000, 40), rng.uniform(0, 1000, 40)
    cov = Matern32(0.25, 200.0)(x, y, x, y)
    assert np.allclose(cov, cov.T)
    assert np.linalg.eigvalsh(cov).min() > -1e-9


@pytest.mark.parametrize("sill, range_m", [(0.0, 200.0), (0.25, -1.0), (math.nan, 200.0)])
def test_kernel_invalido_se_rechaza(sill, range_m):
    with pytest.raises(ValueError):
        Matern32(sill, range_m)


# Posterior


def test_sin_observaciones_devuelve_el_prior():
    result = posterior(PRIOR, [])
    mean, variance = result.predict([0.0, 500.0], [0.0, 0.0])
    assert result.converged
    assert np.allclose(mean, PRIOR.mean_log_depth)
    assert np.allclose(variance, PRIOR.kernel.sill)


def test_datos_con_valor_coinciden_con_kriging_exacto():
    observations = [flat_floor_crater(0.0, 0.0, 1.3), flat_floor_crater(150.0, 40.0, 0.8)]
    x_obs, y_obs = np.array([0.0, 150.0]), np.array([0.0, 40.0])
    x_query, y_query = np.array([70.0, 300.0]), np.array([10.0, -20.0])
    kernel = PRIOR.kernel
    noise = np.diag([(0.15 / 1.3) ** 2, (0.15 / 0.8) ** 2])
    solved = np.linalg.inv(kernel(x_obs, y_obs, x_obs, y_obs) + noise)
    cross = kernel(x_obs, y_obs, x_query, y_query)
    residual = np.log([1.3, 0.8]) - PRIOR.mean_log_depth

    mean, variance = posterior(PRIOR, observations).predict(x_query, y_query)

    assert mean == pytest.approx(PRIOR.mean_log_depth + cross.T @ solved @ residual)
    assert variance == pytest.approx(kernel.sill - np.sum(cross * (solved @ cross), axis=0))


def test_lejos_de_los_datos_vuelve_al_prior():
    result = posterior(PRIOR, [deeper_than(0.0, 0.0, 1.0, "drill")])
    far = result.maps([5000.0], [5000.0])
    prior = posterior(PRIOR, []).maps([5000.0], [5000.0])
    assert far["p_ice"] == pytest.approx(prior["p_ice"], abs=1e-6)
    assert far["depth_sd"] == pytest.approx(prior["depth_sd"], abs=1e-6)


def test_un_si_y_un_no_mueven_el_mapa_en_sentidos_opuestos():
    x, y = np.array([0.0, 50.0, 150.0]), np.zeros(3)
    prior_map = posterior(PRIOR, []).maps(x, y)
    yes = posterior(PRIOR, [shallower_than(0.0, 0.0, 0.6, "spectrometer")]).maps(x, y)
    no = posterior(PRIOR, [deeper_than(0.0, 0.0, 0.6, "spectrometer")]).maps(x, y)
    assert np.all(yes["p_ice"] > prior_map["p_ice"])
    assert np.all(no["p_ice"] < prior_map["p_ice"])


def test_un_si_y_un_no_cambian_distinto_la_incertidumbre():
    x, y = np.array([0.0]), np.array([0.0])
    _, yes_var = posterior(PRIOR, [shallower_than(0.0, 0.0, 0.6, "s")]).predict(x, y)
    _, no_var = posterior(PRIOR, [deeper_than(0.0, 0.0, 0.6, "s")]).predict(x, y)
    assert abs(yes_var[0] - no_var[0]) > 0.05


def test_profundidades_medidas_distintas_dan_mapas_distintos():
    x, y = np.array([0.0, 50.0, 150.0]), np.zeros(3)
    shallow = posterior(PRIOR, [measured_depth(0.0, 0.0, 0.7, 0.15, "gpr")]).maps(x, y)
    deep = posterior(PRIOR, [measured_depth(0.0, 0.0, 1.5, 0.15, "gpr")]).maps(x, y)
    assert np.all(shallow["p_ice"] > deep["p_ice"])
    assert np.all(shallow["depth_mean"] < deep["depth_mean"])
    assert deep["depth_mean"][0] == pytest.approx(1.5, abs=0.1)


def test_una_cota_lejos_de_la_media_igual_cuenta():
    """Laplace ignora este dato: su pico queda donde la cota no pesa y el mapa no cambia."""
    observations = [deeper_than(0.0, 0.0, 0.6, "spectrometer")]
    x_query = np.array([0.0, 50.0])
    mean, _ = posterior(PRIOR, observations).predict(x_query, np.zeros(2))
    exact_mean, _, _ = exact_by_sampling(PRIOR, observations, x_query)
    assert mean[0] > PRIOR.mean_log_depth + 0.1
    assert mean == pytest.approx(exact_mean, abs=0.01)


@pytest.mark.parametrize(
    "observations",
    [
        [deeper_than(0.0, 0.0, 1.0, "drill", sigma_log=0.05)],
        [shallower_than(0.0, 0.0, 0.6, "spectrometer")],
        [deeper_than(x, 0.0, 1.0, "drill", sigma_log=0.05) for x in (0.0, 60.0, 120.0)],
        [flat_floor_crater(0.0, 0.0, 1.3), deeper_than(80.0, 0.0, 1.0, "drill", sigma_log=0.05)],
    ],
    ids=["no_toca", "si_espectrometro", "tres_no_tocan", "crater_y_taladro"],
)
def test_coincide_con_la_respuesta_exacta(observations):
    x_query = np.array([0.0, 50.0, 150.0, 400.0])
    result = posterior(PRIOR, observations)
    mean, variance = result.predict(x_query, np.zeros_like(x_query))
    p_ice = result.maps(x_query, np.zeros_like(x_query))["p_ice"]
    exact_mean, exact_sd, exact_p = exact_by_sampling(PRIOR, observations, x_query)

    assert result.converged
    assert mean == pytest.approx(exact_mean, abs=0.02)
    assert np.sqrt(variance) == pytest.approx(exact_sd, abs=0.02)
    # Limitación de posterior.py: x = 0 cae sobre una cota y x = 50 puede quedar a 10 m de otra.
    assert p_ice[0] == pytest.approx(exact_p[0], abs=0.08)
    assert p_ice[1] == pytest.approx(exact_p[1], abs=0.04)
    assert p_ice[2:] == pytest.approx(exact_p[2:], abs=0.02)


def test_limitacion_en_la_celda_de_la_cota_queda_acotada():
    """Justo sobre la cota, la gaussiana exagera P(d ≤ 1). Si esto cambia, revisar la nota."""
    observations = [deeper_than(0.0, 0.0, 1.0, "drill", sigma_log=0.05)]
    x_query = np.array([0.0])
    p_ice = posterior(PRIOR, observations).maps(x_query, np.zeros(1))["p_ice"]
    _, _, exact_p = exact_by_sampling(PRIOR, observations, x_query)
    assert exact_p[0] < p_ice[0] < exact_p[0] + 0.1


def test_datos_contradictorios_dan_resultado_finito():
    observations = [
        shallower_than(0.0, 0.0, 0.2, "spectrometer", sigma_log=0.01),
        deeper_than(0.0, 0.0, 5.0, "drill", sigma_log=0.01),
    ]
    result = posterior(PRIOR, observations)
    mean, variance = result.predict([0.0], [0.0])
    assert result.converged
    assert np.isfinite(mean).all()
    assert np.isfinite(variance).all()
    assert variance[0] > 0


def test_dos_datos_en_el_mismo_punto_no_rompen():
    observations = [
        measured_depth(0.0, 0.0, 1.0, 0.15, "a"),
        measured_depth(0.0, 0.0, 1.2, 0.15, "b"),
    ]
    mean, _ = posterior(PRIOR, observations).predict([0.0], [0.0])
    assert math.log(1.0) < mean[0] < math.log(1.2)


def test_sin_convergencia_queda_informado():
    observations = [deeper_than(0.0, 0.0, 1.0, "drill"), deeper_than(50.0, 0.0, 1.5, "drill")]
    assert not posterior(PRIOR, observations, max_iter=1).converged


def test_el_resultado_no_depende_del_tamano_de_bloque():
    observations = [flat_floor_crater(0.0, 0.0, 1.3), deeper_than(80.0, 0.0, 1.0, "drill")]
    result = posterior(PRIOR, observations)
    x = np.linspace(-200.0, 200.0, 23)
    y = np.zeros_like(x)
    whole = result.predict(x, y)
    pieces = result.predict(x, y, chunk_cells=4)
    assert np.allclose(whole[0], pieces[0])
    assert np.allclose(whole[1], pieces[1])


# Mapas


def test_mapas_conservan_la_forma_de_la_grilla():
    result = posterior(PRIOR, [flat_floor_crater(0.0, 0.0, 1.3)])
    x, y = np.meshgrid(np.arange(5.0) * 10, np.arange(3.0) * 10)
    maps = result.maps(x, y)
    assert set(maps) == {"p_ice", "depth_mean", "depth_sd", "entropy"}
    assert all(layer.shape == (3, 5) for layer in maps.values())
    assert np.all((maps["p_ice"] >= 0) & (maps["p_ice"] <= 1))


def test_umbral_mayor_da_mas_probabilidad():
    result = posterior(PRIOR, [flat_floor_crater(0.0, 0.0, 1.3)])
    shallow = result.maps([50.0], [0.0], threshold_m=0.5)["p_ice"]
    deep = result.maps([50.0], [0.0], threshold_m=2.0)["p_ice"]
    assert shallow < deep


def test_entropia_maxima_en_la_ambiguedad_y_baja_con_certeza():
    prior = Prior(0.0, Matern32(0.25, 200.0))
    ambiguous = posterior(prior, []).maps([0.0], [0.0], threshold_m=1.0)["entropy"]
    certain = posterior(prior, [measured_depth(0.0, 0.0, 3.0, 0.05, "drill")]).maps(
        [0.0], [0.0], threshold_m=1.0
    )["entropy"]
    assert ambiguous == pytest.approx(1.0)
    assert certain < 0.01


def test_profundidad_sigue_la_lognormal():
    maps = posterior(PRIOR, []).maps([0.0], [0.0])
    expected_mean = math.exp(PRIOR.mean_log_depth + 0.25 / 2)
    assert maps["depth_mean"] == pytest.approx(expected_mean)
    assert maps["depth_sd"] == pytest.approx(expected_mean * math.sqrt(math.expm1(0.25)))


@pytest.mark.parametrize("threshold_m", [0.0, -1.0, math.nan])
def test_umbral_invalido_se_rechaza(threshold_m):
    with pytest.raises(ValueError):
        posterior(PRIOR, []).maps([0.0], [0.0], threshold_m=threshold_m)


def test_coordenadas_invalidas_se_rechazan():
    result = posterior(PRIOR, [])
    with pytest.raises(ValueError):
        result.predict([0.0, 1.0], [0.0])
    with pytest.raises(ValueError):
        result.predict([math.nan], [0.0])


# Nugget y covarianza


def test_nugget_invalido_se_rechaza():
    with pytest.raises(ValueError):
        Prior(0.0, Matern32(0.25, 200.0), nugget=-0.1)


def test_nugget_suma_incertidumbre_en_los_mapas():
    base = Prior(0.0, Matern32(0.25, 200.0))
    noisy = Prior(0.0, Matern32(0.25, 200.0), nugget=0.25)
    sd = posterior(base, []).maps([0.0], [0.0])["depth_sd"][0]
    sd_noisy = posterior(noisy, []).maps([0.0], [0.0])["depth_sd"][0]
    assert sd_noisy > sd


def test_con_nugget_un_dato_no_deja_la_celda_resuelta():
    prior = Prior(0.0, Matern32(0.15, 100.0), nugget=0.15)
    result = posterior(prior, [measured_depth(0.0, 0.0, 1.0, 0.01, "drill")])
    _, variance = result.predict([0.0], [0.0])
    assert variance[0] > 0.05  # sin nugget quedaría en ~0.0001


def test_covarianza_coincide_con_kriging_exacto():
    observations = [flat_floor_crater(0.0, 0.0, 1.3), flat_floor_crater(150.0, 40.0, 0.8)]
    x_obs, y_obs = np.array([0.0, 150.0]), np.array([0.0, 40.0])
    xq, yq = np.array([70.0, 300.0, 20.0]), np.array([10.0, -20.0, 5.0])
    kernel = PRIOR.kernel
    noise = np.diag([(0.15 / 1.3) ** 2, (0.15 / 0.8) ** 2])
    inv = np.linalg.inv(kernel(x_obs, y_obs, x_obs, y_obs) + noise)
    cross = kernel(x_obs, y_obs, xq, yq)
    expected = kernel(xq, yq, xq, yq) - cross.T @ inv @ cross
    cov = posterior(PRIOR, observations).covariance(xq, yq)
    assert cov == pytest.approx(expected, abs=1e-10)
    _, variance = posterior(PRIOR, observations).predict(xq, yq)
    assert np.diag(cov) == pytest.approx(variance, abs=1e-10)
