import numpy as np
import pytest

from gp.craters import CraterCatalog
from gp.simulation import make_prior
from gp.validation import auc, labels, leave_one_out, top_k_hits, validate

PRIOR = make_prior(0.86, 0.299, 0.5, 100.0)


def catalog(x, y, d, f):
    return CraterCatalog(*(np.asarray(v, dtype=float) for v in (x, y, d, f)))


def test_etiquetas_con_umbral_de_un_metro():
    # Fondo plano somero, fondo plano profundo, sin fondo plano con cota >= 1 m, y con cota < 1 m.
    cat = catalog([0, 1, 2, 3], [0, 0, 0, 0], [8, 14, 6, 6], [5.5, 4.0, -1, -1])
    out = labels(cat, 1.0)
    assert out[0] == 1 and out[1] == 0 and out[2] == 0
    out_3m = labels(cat, 3.0)
    assert np.isnan(out_3m[2])  # cota 1.2 m < 3 m: no se sabe


def test_auc_perfecta_y_al_azar():
    truth = np.array([1, 1, 0, 0, np.nan])
    assert auc(np.array([0.9, 0.8, 0.2, 0.1, 0.5]), truth) == 1.0
    assert auc(np.array([0.5, 0.5, 0.5, 0.5, 0.5]), truth) == 0.5


def test_top_k_ignora_los_desconocidos():
    truth = np.array([1, 0, np.nan, 1])
    assert top_k_hits(np.array([0.9, 0.8, 0.99, 0.1]), truth, 2) == 1.0


def test_leave_one_out_no_usa_el_propio_crater():
    # Un cráter somero aislado: sin vecinos, su predicción vuelve al prior.
    cat = catalog([0.0, 5000.0], [0.0, 0.0], [8.0, 8.0], [6.0, 6.0])
    p = leave_one_out(cat, PRIOR, 1.0)
    assert p[0] == pytest.approx(p[1])


def test_detecta_estructura_en_un_caso_inventado():
    # Cráteres someros agrupados al oeste y profundos al este: los vecinos predicen.
    rng = np.random.default_rng(0)
    n = 80
    x = np.r_[rng.uniform(0, 400, n // 2), rng.uniform(3000, 3400, n // 2)]
    y = rng.uniform(0, 400, n)
    d = np.full(n, 10.0)
    f = np.r_[
        np.full(n // 2, 6.5), np.full(n // 2, -1.0)
    ]  # oeste: d ~ 0.9 m; este: sin fondo plano
    result = validate(catalog(x, y, d, f), PRIOR, 1.0, n_permutations=20, k=10)
    assert result["auc"] > 0.9
    assert result["p_auc"] < 0.1
