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

from gp.craters import (
    DEFAULT_CATALOG,
    K_RIM,
    PIXEL_M,
    REPO_ROOT,
    REPOSE_DEG,
    CraterCatalog,
    load_catalog,
    to_observations,
)
from gp.observations import CRATER_ERROR_M, NON_FLAT_RATIO
from gp.posterior import Prior, posterior

RESULT = REPO_ROOT / "data" / "processed" / "s1094b" / "validation.json"
POWER_RESULT = REPO_ROOT / "data" / "processed" / "s1094b" / "validation_power.json"
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


def synthetic_catalog(
    catalog: CraterCatalog, truth: Prior, rng, error_m: float = CRATER_ERROR_M
) -> CraterCatalog:
    """Mismas posiciones y diámetros, con profundidades sorteadas de `truth`.

    Fondo plano si `d < 0.2 D` (la misma cota que usa el modelo para los que no lo tienen); su
    diámetro sale de invertir `resistant_depth`, con `error_m` de error de medición en `d`.
    """
    x, y, diam = catalog.x_m, catalog.y_m, catalog.diameter_m
    cov = truth.kernel(x, y, x, y)
    cov[np.diag_indices_from(cov)] += truth.nugget + 1e-9
    noise = np.linalg.cholesky(cov) @ rng.standard_normal(len(catalog))
    depth = np.exp(truth.mean_log_depth + noise)
    measured = np.maximum(depth + rng.normal(0.0, error_m, depth.size), PIXEL_M)
    floor = K_RIM * diam - 2 * measured / math.tan(math.radians(REPOSE_DEG))
    flat = (depth < NON_FLAT_RATIO * diam) & (floor > 0)
    return CraterCatalog(x.copy(), y.copy(), diam.copy(), np.where(flat, floor, 0.0))


def power_test(
    catalog: CraterCatalog,
    model: Prior,
    truth_rhos: tuple[float, ...] = (1e-6, 0.5),
    observed_auc: float | None = None,
    n_worlds: int = 60,
    threshold_m: float = 1.0,
    seed: int = 0,
) -> dict:
    """¿La validación real distingue "hay estructura" de "no hay"?

    Para cada `rho` verdadero se sortean `n_worlds` catálogos con las posiciones reales y se corre
    la misma validación (leave-one-out con el modelo `model`). Si las distribuciones del AUC se
    pisan, la prueba no tiene potencia y un AUC real cercano a 0.5 no descarta la estructura.
    """
    from gp.planning import fitted_prior

    rng = np.random.default_rng(seed)
    out: dict = {"threshold_m": threshold_m, "n_worlds": n_worlds, "by_rho": {}}
    for rho in truth_rhos:
        variance = model.kernel.sill + model.nugget
        truth = fitted_prior(model.mean_log_depth, variance, rho, model.kernel.range_m)
        aucs = []
        for _ in range(n_worlds):
            synth = synthetic_catalog(catalog, truth, rng)
            labels_ = labels(synth, threshold_m)
            if np.nansum(labels_) < 3:
                continue
            aucs.append(auc(leave_one_out(synth, model, threshold_m), labels_))
        a = np.array(aucs)
        row = {
            "worlds": int(a.size),
            "auc_mean": float(a.mean()),
            "auc_5": float(np.percentile(a, 5)),
            "auc_95": float(np.percentile(a, 95)),
        }
        if observed_auc is not None:
            row["share_at_or_below_observed"] = float(np.mean(a <= observed_auc))
        out["by_rho"][f"{rho:.2f}"] = row
    if observed_auc is not None:
        out["observed_auc"] = observed_auc
    return out


if __name__ == "__main__":
    import sys

    from gp.simulation import FITTED, make_prior

    catalog, model = load_catalog(DEFAULT_CATALOG), make_prior(**FITTED)
    if "--power" in sys.argv:
        real = json.loads(RESULT.read_text(encoding="utf-8")) if RESULT.exists() else {}
        result = power_test(catalog, model, observed_auc=real.get("auc"))
        POWER_RESULT.write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps(result, indent=2))
        raise SystemExit
    result = validate(catalog, model)
    RESULT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    for key, value in result.items():
        print(f"{key:24s} {value:.3f}" if isinstance(value, float) else f"{key:24s} {value}")
