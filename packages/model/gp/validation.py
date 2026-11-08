"""Validación con cráteres reales: ¿los vecinos predicen dónde hay hielo somero?

Cada cráter se esconde y se predice con los demás (leave-one-out). Si el modelo distingue los
cráteres con hielo a `threshold_m` o menos de los que no, la estructura espacial que usa la
estrategia "potencial + incertidumbre" existe en los datos reales, no solo en los mundos simulados.

Etiquetas con `threshold_m = 1`: positivo = fondo plano con `d <= 1 m`; negativo = fondo plano con
`d > 1 m`, o sin fondo plano (con `d > 0.2 D >= 1 m`, porque `D >= 5 m`). Las etiquetas solo son
limpias si la cota de todos los cráteres sin fondo plano supera el umbral; si no, se excluyen.

Control: se desordenan las posiciones entre cráteres y se repite. Si la predicción sale igual de
buena, la señal no viene del lugar.

Uso: `python -m gp.validation` escribe `data/processed/s1094b/validation.json`.
"""

from __future__ import annotations

import json
import math

import numpy as np
from scipy.special import ndtr

from gp.craters import DEFAULT_CATALOG, REPO_ROOT, CraterCatalog, load_catalog, to_observations
from gp.observations import NON_FLAT_RATIO
from gp.posterior import Prior, posterior

RESULT = REPO_ROOT / "data" / "processed" / "s1094b" / "validation.json"
NEIGHBOR_RADIUS_M = 600.0


def labels(catalog: CraterCatalog, threshold_m: float, ratio: float = NON_FLAT_RATIO) -> np.ndarray:
    """1 = hielo a `threshold_m` o menos; 0 = no; NaN = no se sabe (cota menor que el umbral)."""
    obs = to_observations(catalog, ratio)
    out = np.full(len(catalog), np.nan)
    for i, o in enumerate(obs):
        if o.kind == "depth":
            out[i] = float(o.depth_m <= threshold_m)
        elif o.depth_m >= threshold_m:
            out[i] = 0.0
    return out


def leave_one_out(
    catalog: CraterCatalog, prior: Prior, threshold_m: float, radius_m: float = NEIGHBOR_RADIUS_M
) -> np.ndarray:
    """P(d <= threshold) en cada cráter, condicionando solo en los demás dentro de `radius_m`."""
    obs = to_observations(catalog)
    x, y = catalog.x_m, catalog.y_m
    log_t = math.log(threshold_m)
    out = np.empty(len(catalog))
    for i in range(len(catalog)):
        near = np.hypot(x - x[i], y - y[i]) <= radius_m
        near[i] = False
        post = posterior(prior, [obs[j] for j in np.flatnonzero(near)])
        mean, var = post.predict([x[i]], [y[i]])
        out[i] = ndtr((log_t - mean[0]) / math.sqrt(var[0] + prior.nugget))
    return out


def auc(scores: np.ndarray, truth: np.ndarray) -> float:
    """Área bajo la curva ROC: probabilidad de que un positivo puntúe más que un negativo."""
    ok = np.isfinite(truth)
    s, t = scores[ok], truth[ok]
    pos, neg = s[t == 1], s[t == 0]
    if not len(pos) or not len(neg):
        return float("nan")
    greater = (pos[:, None] > neg[None, :]).sum() + 0.5 * (pos[:, None] == neg[None, :]).sum()
    return float(greater / (len(pos) * len(neg)))


def top_k_hits(scores: np.ndarray, truth: np.ndarray, k: int) -> float:
    ok = np.flatnonzero(np.isfinite(truth))
    best = ok[np.argsort(-scores[ok])[:k]]
    return float(truth[best].sum())


def shuffled(catalog: CraterCatalog, rng) -> CraterCatalog:
    order = rng.permutation(len(catalog))
    return CraterCatalog(
        catalog.x_m[order], catalog.y_m[order], catalog.diameter_m, catalog.floor_m
    )


def validate(
    catalog: CraterCatalog,
    prior: Prior,
    threshold_m: float = 1.0,
    n_permutations: int = 100,
    seed: int = 0,
    k: int = 29,
) -> dict:
    truth = labels(catalog, threshold_m)
    scores = leave_one_out(catalog, prior, threshold_m)
    observed_auc = auc(scores, truth)
    observed_top = top_k_hits(scores, truth, k)
    rng = np.random.default_rng(seed)
    null_auc, null_top = [], []
    for _ in range(n_permutations):
        moved = shuffled(catalog, rng)
        s = leave_one_out(moved, prior, threshold_m)
        null_auc.append(auc(s, truth))
        null_top.append(top_k_hits(s, truth, k))
    null_auc, null_top = np.array(null_auc), np.array(null_top)
    positives = int(np.nansum(truth))
    known = int(np.isfinite(truth).sum())
    return {
        "threshold_m": threshold_m,
        "craters_labelled": known,
        "positives": positives,
        "auc": observed_auc,
        "auc_null_mean": float(null_auc.mean()),
        "auc_null_95": float(np.percentile(null_auc, 95)),
        "p_auc": float((1 + np.sum(null_auc >= observed_auc)) / (1 + n_permutations)),
        "top_k": k,
        "top_k_hits": observed_top,
        "top_k_random_expected": k * positives / known,
        "top_k_null_mean": float(null_top.mean()),
        "p_top_k": float((1 + np.sum(null_top >= observed_top)) / (1 + n_permutations)),
    }


if __name__ == "__main__":
    from gp.simulation import FITTED, make_prior

    result = validate(load_catalog(DEFAULT_CATALOG), make_prior(**FITTED))
    RESULT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    for key, value in result.items():
        print(f"{key:24s} {value:.3f}" if isinstance(value, float) else f"{key:24s} {value}")
