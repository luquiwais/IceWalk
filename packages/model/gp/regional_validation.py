"""Validación del prior regional con datos que el ajuste no vio.

1. **Calibración fuera de muestra.** Cada impacto de Daubar 2022 se predice con un ajuste que dejó
   afuera su sector de 60° de longitud. "Cuando decimos 30 %, ¿pasa ~30 %?": diagrama por tramos,
   puntaje de Brier contra una tasa fija y AUC.
2. **Conteos esperados contra observados** por franja de latitud y en una caja elegida.
3. **Sitios donde una misión cavó** (`LANDERS`). El ajuste usa impactos vistos desde órbita; estos
   datos vienen del suelo y nunca entraron al ajuste.

Uso: `python scripts/validate_regional.py` (necesita la tabla de Daubar en `data/processed/`).
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from scipy.special import ndtr

from gp.regional import Z90, RegionalFit, _features, fit_censored, load_fit, regional_estimate


@dataclass(frozen=True)
class Lander:
    """Lo que encontró una misión al cavar. `ice_depth_m` None: no encontró hielo hasta `dug_m`."""

    name: str
    lat_deg: float
    lon_e_deg: float
    dug_m: float
    ice_depth_m: float | None
    source: str
    note: str = ""


LANDERS: tuple[Lander, ...] = (
    Lander(
        "Phoenix",
        68.22,
        234.25,
        dug_m=0.18,
        ice_depth_m=0.046,
        source="Mellon et al. (2009) JGR 114, E00E07, doi:10.1029/2009JE003417: hielo bajo suelo "
        "suelto a 4.6 cm de profundidad media, con variación de más de 10 veces entre zanjas",
    ),
    Lander(
        "Viking Lander 2",
        47.97,
        134.26,
        dug_m=0.15,
        ice_depth_m=None,
        source="NASA/JPL PIA12214 (2009): zanja de 10-15 cm, sin hielo",
        note="Byrne et al. (2009) Science 325:1674, doi:10.1126/science.1175307, estiman que con "
        "un poco más de profundidad habría llegado al hielo (estimación con modelo, no medida)",
    ),
)


def sector_predictions(
    lat: np.ndarray,
    lon: np.ndarray,
    diam: np.ndarray,
    ice: np.ndarray,
    ratio: float,
    sector_deg: float = 60.0,
) -> np.ndarray:
    """P(hielo) de cada impacto con un ajuste que dejó afuera su sector de longitud."""
    out = np.empty(ice.size)
    sectors = np.floor(np.asarray(lon) / sector_deg).astype(int)
    for s in np.unique(sectors):
        train, test = sectors != s, sectors == s
        beta, sigma = fit_censored(lat[train], diam[train], ice[train], ratio)
        z = (np.log(ratio * diam[test]) - _features(lat[test]) @ beta) / sigma
        out[test] = ndtr(z)
    return np.clip(out, 1e-9, 1 - 1e-9)


def in_sample_predictions(lat, diam, fit: RegionalFit) -> np.ndarray:
    mean = _features(lat) @ np.asarray(fit.beta)
    return ndtr((np.log(fit.ratio * np.asarray(diam)) - mean) / fit.sigma_log)


def _auc(scores: np.ndarray, truth: np.ndarray) -> float:
    pos, neg = scores[truth], scores[~truth]
    greater = (pos[:, None] > neg[None, :]).sum() + 0.5 * (pos[:, None] == neg[None, :]).sum()
    return float(greater / (pos.size * neg.size))


def _wilson(k: int, n: int, z: float = Z90) -> tuple[float, float]:
    """Intervalo del 90 % de una proporción (Wilson), que no se rompe con 0 o n aciertos."""
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    center = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return (max(0.0, center - half), min(1.0, center + half))


def calibration(
    p: np.ndarray, ice: np.ndarray, edges: Sequence[float] = (0, 0.05, 0.2, 0.5, 0.8, 1.0001)
) -> dict:
    """Diagrama de calibración por tramos de probabilidad, Brier y AUC."""
    p, ice = np.asarray(p, dtype=float), np.asarray(ice, dtype=bool)
    if p.shape != ice.shape or not ice.any() or ice.all():
        raise ValueError("hacen falta predicciones del mismo largo, con y sin hielo")
    bins = []
    for lo, hi in zip(edges[:-1], edges[1:], strict=True):
        m = (p >= lo) & (p < hi)
        if not m.any():
            continue
        k, n = int(ice[m].sum()), int(m.sum())
        bins.append({
            "p_range": [lo, min(hi, 1.0)],
            "n": n,
            "predicted": float(p[m].mean()),
            "observed": k / n,
            "observed_90": list(_wilson(k, n)),
            "expected_ice": float(p[m].sum()),
            "ice": k,
        })
    base = ice.mean()
    return {
        "n": int(p.size),
        "n_ice": int(ice.sum()),
        "brier": float(np.mean((p - ice) ** 2)),
        "brier_constant_rate": float(np.mean((base - ice) ** 2)),
        "auc": _auc(p, ice),
        "expected_ice": float(p.sum()),
        "bins": bins,
    }


def counts(p, ice, mask) -> dict:
    """Impactos con hielo esperados contra observados en un subconjunto, con su desvío."""
    p, ice, mask = np.asarray(p), np.asarray(ice, dtype=bool), np.asarray(mask, dtype=bool)
    expected = float(p[mask].sum())
    sd = float(math.sqrt(np.sum(p[mask] * (1 - p[mask]))))
    observed = int(ice[mask].sum())
    return {
        "n": int(mask.sum()),
        "ice": observed,
        "expected_ice": expected,
        "z": (observed - expected) / sd if sd > 0 else float("nan"),
    }


def lander_check(fit: RegionalFit | None = None) -> list[dict]:
    """Predicción del prior regional en cada sitio de `LANDERS`, contra lo que se encontró."""
    fit = fit or load_fit()
    rows = []
    for lander in LANDERS:
        est = regional_estimate(lander.lat_deg, fit)
        lo = math.exp(est.mean_log_depth - Z90 * est.sd_total)
        hi = math.exp(est.mean_log_depth + Z90 * est.sd_total)
        row = {
            "name": lander.name,
            "lat_deg": lander.lat_deg,
            "status": est.status,
            "median_m": est.median_m,
            "median_90_m": list(est.median_interval_m()),
            "predictive_90_m": [lo, hi],
            "p_ice_within_dug": est.p_within(lander.dug_m),
            "dug_m": lander.dug_m,
            "ice_depth_m": lander.ice_depth_m,
            "source": lander.source,
        }
        if lander.ice_depth_m is not None:
            row["observed_inside_predictive_90"] = lo <= lander.ice_depth_m <= hi
        if lander.note:
            row["note"] = lander.note
            row["p_ice_within_2x_dug"] = est.p_within(2 * lander.dug_m)
        rows.append(row)
    return rows
