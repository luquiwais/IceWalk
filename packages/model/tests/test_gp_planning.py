import json
import math
from pathlib import Path

import numpy as np
import pytest

from gp.observations import flat_floor_crater
from gp.planning import (
    add_measurement,
    add_observations,
    fitted_prior,
    rank_candidates,
    simulate_outcome,
    site_posterior,
    tool_yield,
)
from gp.posterior import posterior

EXAMPLES = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "examples"
TOOLS = {t["id"]: t for t in json.loads((EXAMPLES / "tools.catalog.json").read_text("utf-8"))}
MEASUREMENT = json.loads((EXAMPLES / "measurement.example.json").read_text("utf-8"))
PRIOR = fitted_prior()


def test_prior_ajustado_reparte_la_varianza():
    assert PRIOR.kernel.sill == pytest.approx(0.1495)
    assert PRIOR.nugget == pytest.approx(0.1495)


def test_posterior_del_sitio_desde_un_catalogo(tmp_path):
    path = tmp_path / "c.csv"
    path.write_text("x_m,y_m,d_crater_m,d_resistant_m\n0,0,10,5.5\n300,0,6,-1\n", encoding="utf-8")
    post = site_posterior(path)
    assert len(post.observations) == 2


def test_campos_de_candidatas_y_rangos():
    post = posterior(PRIOR, [flat_floor_crater(0.0, 0.0, 0.8)])
    x, y = np.array([0.0, 50.0, 3000.0]), np.zeros(3)
    out = rank_candidates(post, x, y, 3.0)
    for key in ("p_ice", "uncertainty", "value"):
        assert out[key].shape == (3,)
        assert np.all((out[key] >= 0) & (out[key] <= 1))
    assert out["p_ice"][0] > out["p_ice"][2]  # junto al cráter somero


def test_value_ordena_igual_que_el_criterio():
    post = posterior(PRIOR, [flat_floor_crater(0.0, 0.0, 0.8), flat_floor_crater(500.0, 0.0, 2.5)])
    x = np.linspace(-300, 800, 40)
    y = np.zeros_like(x)
    mean, var = post.predict(x, y)
    criterion = -(mean - np.sqrt(var + PRIOR.nugget))
    value = rank_candidates(post, x, y, 3.0)["value"]
    assert (np.argsort(criterion) == np.argsort(value)).all()


def test_umbral_invalido_se_rechaza():
    with pytest.raises(ValueError):
        rank_candidates(posterior(PRIOR, []), np.zeros(1), np.zeros(1), 0.0)


def test_sumar_datos_no_pierde_los_anteriores():
    post = posterior(PRIOR, [flat_floor_crater(0.0, 0.0, 1.0)])
    more = add_observations(post, [flat_floor_crater(100.0, 0.0, 1.5)])
    assert len(post.observations) == 1
    assert len(more.observations) == 2


def test_medicion_del_contrato_se_suma():
    post = posterior(PRIOR, [])
    measurement = {
        **MEASUREMENT,
        "tool": "gpr",
        "result": "ice",
        "depth_m": 1.4,
        "position": [0, 0],
    }
    new, obs = add_measurement(post, measurement, TOOLS["gpr"])
    assert obs.kind == "depth"
    assert len(new.observations) == 1


def test_medicion_que_no_informa_no_cambia_el_posterior():
    post = posterior(PRIOR, [])
    measurement = {
        **MEASUREMENT,
        "tool": "camera_spectrometer",
        "result": "ice",
        "position": [0, 0],
    }
    new, obs = add_measurement(post, measurement, TOOLS["camera_spectrometer"])
    assert obs is None and new is post


def test_resultados_simulados_mueven_en_sentidos_opuestos():
    post = posterior(PRIOR, [])
    x, y = np.array([30.0]), np.array([0.0])
    base = rank_candidates(post, x, y, 3.0)["p_ice"][0]
    ice = rank_candidates(simulate_outcome(post, 0.0, 0.0, 3.0, "ice"), x, y, 3.0)["p_ice"][0]
    no = rank_candidates(simulate_outcome(post, 0.0, 0.0, 3.0, "no_ice"), x, y, 3.0)["p_ice"][0]
    assert ice > base > no
    with pytest.raises(ValueError):
        simulate_outcome(post, 0.0, 0.0, 3.0, "maybe")


def test_rendimiento_por_herramienta():
    post = posterior(PRIOR, [])
    x, y = np.linspace(0, 1000, 11), np.zeros(11)
    out = tool_yield(post, x, y, list(TOOLS.values()))
    assert "camera_spectrometer" not in out  # sin alcance en profundidad
    assert out["gpr"]["p_per_station"] > out["core_drill"]["p_per_station"]
    assert out["core_drill"]["p_per_station"] > out["neutron_spectrometer"]["p_per_station"]
    p = out["core_drill"]["p_per_station"]
    assert out["core_drill"]["stations_for_one_hit"] == pytest.approx(1 / p)
    expected = 0.5 * math.erfc(-(math.log(1.0) - 0.86) / math.sqrt(0.299) / math.sqrt(2))
    assert p == pytest.approx(expected, abs=1e-6)
