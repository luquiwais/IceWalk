"""¿Alguna variable del terreno predice la profundidad medida en los cráteres?

Compara, con validación cruzada por bloques espaciales, un modelo base (solo media y varianza
de `log d`) contra el mismo modelo con variables. Mide el acierto como verosimilitud en los
cráteres que quedaron afuera: profundidad medida en los de fondo plano, y cota en los demás.

Se usa un modelo sin estructura espacial porque los cráteres casi no la tienen a escala del sitio
(ver `docs/EXPERIMENTS.md`). Así la prueba responde solo a la pregunta de las variables.

Uso: `python -m gp.covariate_test` lee el catálogo y las variables ya calculadas.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize
from scipy.special import log_ndtr

from gp.craters import DEFAULT_CATALOG, REPO_ROOT, CraterCatalog, load_catalog, to_observations

LOG_SQRT_2PI = 0.5 * math.log(2 * math.pi)
BLOCK_M = 2000.0
N_FOLDS = 5
RESULT = REPO_ROOT / "data" / "processed" / "s1094b" / "covariate_test.json"


@dataclass(frozen=True)
class Sites:
    """Datos en `log d`: `signs` 0 = profundidad medida, 1 = cota inferior."""

    targets: np.ndarray
    sigmas: np.ndarray
    signs: np.ndarray

    def subset(self, mask: np.ndarray) -> Sites:
        return Sites(self.targets[mask], self.sigmas[mask], self.signs[mask])


def sites_from_catalog(catalog: CraterCatalog) -> Sites:
    observations = to_observations(catalog)
    return Sites(
        np.log([o.depth_m for o in observations]),
        np.array([o.sigma_log for o in observations]),
        np.array([0.0 if o.kind == "depth" else 1.0 for o in observations]),
    )


def site_loglik(beta: np.ndarray, log_var: float, design: np.ndarray, sites: Sites) -> np.ndarray:
    """Verosimilitud de cada dato, con `log d ~ N(design @ beta, var)` más el error del dato."""
    scale2 = sites.sigmas**2 + math.exp(log_var)
    residual = sites.targets - design @ beta
    exact = -0.5 * residual**2 / scale2 - 0.5 * np.log(scale2) - LOG_SQRT_2PI
    bound = log_ndtr(-residual / np.sqrt(scale2))
    return np.where(sites.signs == 0, exact, bound)


def fit(design: np.ndarray, sites: Sites) -> tuple[np.ndarray, float]:
    """Máxima verosimilitud, con un prior débil sobre los coeficientes para no desbordar."""

    def objective(params: np.ndarray) -> float:
        beta, log_var = params[:-1], params[-1]
        penalty = 0.5 * np.sum(beta[1:] ** 2) / 10.0**2
        return -np.sum(site_loglik(beta, log_var, design, sites)) + penalty

    start = np.r_[np.zeros(design.shape[1]), math.log(0.1)]
    start[0] = float(np.median(sites.targets))
    result = minimize(objective, start, method="L-BFGS-B")
    return result.x[:-1], float(result.x[-1])


def block_folds(
    x_m: np.ndarray,
    y_m: np.ndarray,
    block_m: float = BLOCK_M,
    n_folds: int = N_FOLDS,
    seed: int = 0,
) -> np.ndarray:
    """Asigna bloques cuadrados de `block_m` a pliegues al azar, todos con datos."""
    block = np.floor(x_m / block_m).astype(int) * 100_000 + np.floor(y_m / block_m).astype(int)
    unique = np.unique(block)
    rng = np.random.default_rng(seed)
    assignment = dict(zip(unique, rng.permutation(len(unique)) % n_folds, strict=True))
    return np.array([assignment[b] for b in block])


def standardize(columns: list[np.ndarray], train: np.ndarray) -> np.ndarray:
    """Matriz con intercepto y variables escaladas con la media y el desvío del entrenamiento."""
    parts = [np.ones(len(columns[0])) if columns else np.ones(len(train))]
    for column in columns:
        mean, std = column[train].mean(), column[train].std()
        parts.append((column - mean) / (std if std > 0 else 1.0))
    return np.column_stack(parts)


def cross_validated(columns: list[np.ndarray], sites: Sites, folds: np.ndarray) -> np.ndarray:
    """Verosimilitud de cada dato cuando su pliegue quedó afuera."""
    heldout = np.empty(len(sites.targets))
    for fold in np.unique(folds):
        test = folds == fold
        design = standardize(columns, ~test)
        beta, log_var = fit(design[~test], sites.subset(~test))
        heldout[test] = site_loglik(beta, log_var, design[test], sites.subset(test))
    return heldout


def compare(
    covariates: dict[str, np.ndarray],
    sites: Sites,
    folds: np.ndarray,
    n_permutations: int = 200,
    seed: int = 0,
) -> dict[str, dict[str, float]]:
    """Para cada variable sola: ganancia media por dato frente al modelo base, y su p.

    Solo se usan los cráteres con la variable disponible. La permutación desordena la variable entre
    cráteres y repite todo: dice qué ganancia aparece por azar.
    """
    rng = np.random.default_rng(seed)
    results = {}
    for name, values in covariates.items():
        ok = np.isfinite(values)
        if ok.sum() < 30:
            continue
        sub, sub_folds, column = sites.subset(ok), folds[ok], values[ok]
        base = cross_validated([], sub, sub_folds)
        gain = float(np.mean(cross_validated([column], sub, sub_folds) - base))
        null = np.array(
            [
                np.mean(cross_validated([rng.permutation(column)], sub, sub_folds) - base)
                for _ in range(n_permutations)
            ]
        )
        beta, _ = fit(standardize([column], np.ones(ok.sum(), bool)), sub)
        results[name] = {
            "n": int(ok.sum()),
            "gain_per_crater": gain,
            "p_permutation": float((1 + np.sum(null >= gain)) / (1 + n_permutations)),
            "null_95": float(np.percentile(null, 95)),
            "coefficient_std": float(beta[1]),
        }
    return results


def compare_all(
    covariates: dict[str, np.ndarray], sites: Sites, folds: np.ndarray
) -> dict[str, float]:
    """Todas las variables juntas, en los cráteres que tienen todas."""
    names = list(covariates)
    ok = np.all([np.isfinite(covariates[n]) for n in names], axis=0)
    sub, sub_folds = sites.subset(ok), folds[ok]
    base = cross_validated([], sub, sub_folds)
    full = cross_validated([covariates[n][ok] for n in names], sub, sub_folds)
    return {"n": int(ok.sum()), "gain_per_crater": float(np.mean(full - base))}


if __name__ == "__main__":
    from gp.covariates import read_covariates

    catalog = load_catalog(DEFAULT_CATALOG)
    sites = sites_from_catalog(catalog)
    folds = block_folds(catalog.x_m, catalog.y_m)
    covariates = read_covariates()
    single = compare(covariates, sites, folds)
    together = compare_all(covariates, sites, folds)
    RESULT.write_text(json.dumps({"single": single, "all": together}, indent=2), encoding="utf-8")
    print(f"pliegues: {np.bincount(folds).tolist()} cráteres")
    print("variable          n   ganancia/cráter   p     azar 95%   coef")
    for name, r in single.items():
        print(
            f"{name:16s} {r['n']:3d}   {r['gain_per_crater']:+.4f}        {r['p_permutation']:.3f}"
            f"   {r['null_95']:+.4f}   {r['coefficient_std']:+.3f}"
        )
    print(f"todas juntas: n={together['n']}, ganancia/cráter {together['gain_per_crater']:+.4f}")
