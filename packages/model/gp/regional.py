"""Prior regional: profundidad de la tabla de hielo según la latitud (cráteres de Daubar 2022).

Cada cráter nuevo excava hasta una profundidad `r × D`. Si expuso hielo, la tabla de hielo está más
arriba (d < r·D); si no, más abajo (d > r·D). Con `log d` normal y media lineal en la latitud, eso
es una regresión probit con `log(r·D)` como offset: la misma lógica censurada del GP. La variación
del diámetro es lo que permite estimar el desvío.

Decisiones (`docs/DECISIONS.md`, 2026-11-10; resultados en `docs/EXPERIMENTS.md`):
- Solo latitud: le ganó a SWIM y a latitud + SWIM en la validación por sectores de longitud.
- Solo hemisferio norte por encima de 20°N: con el sur mezclado el ajuste se vuelve inestable.
- `r = 0.1` es un supuesto (`docs/SOURCES.md`); con 0.2 el regional no coincide con S1094b.

En S1094b manda el prior ajustado con sus 349 cráteres (`planning.fitted_prior`); este prior sirve
para otros sitios, para la tarjeta de sitio y como control.

Los coeficientes viven en `gp/regional_fit.json` y se regeneran con `scripts/fit_regional.py`.
"""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import numpy as np
from scipy.optimize import minimize
from scipy.special import log_ndtr, ndtr

FIT_PATH = Path(__file__).with_name("regional_fit.json")
EXCAVATION_RATIO = 0.1  # supuesto: profundidad excavada / diámetro
LAT_REF_DEG = 40.0  # centro de la variable: (lat - 40) / 10
LAT_SCALE_DEG = 10.0
MIN_LAT_DEG = 20.0  # los datos del ajuste empiezan acá
Z90 = 1.6448536269514722

Status = Literal["ok", "extrapolated", "no_data"]
Verdict = Literal["GO", "CONDITIONAL", "NO_GO", "INSUFFICIENT_DATA"]


class NoRegionalData(ValueError):
    """La latitud cae fuera de lo que cubren los datos regionales (sur o por debajo de 20°N)."""


def _features(lat_deg: np.ndarray) -> np.ndarray:
    lat_deg = np.asarray(lat_deg, dtype=float)
    return np.c_[np.ones(lat_deg.size), (lat_deg - LAT_REF_DEG) / LAT_SCALE_DEG]


def fit_censored(
    lat_deg: Sequence[float],
    diameter_m: Sequence[float],
    ice: Sequence[bool],
    ratio: float = EXCAVATION_RATIO,
) -> tuple[np.ndarray, float]:
    """Máxima verosimilitud de `log d ~ N(b0 + b1·(lat-40)/10, sigma²)` con cotas `r·D`.

    Devuelve `(beta, sigma)`. `ice[i]` verdadero significa d < r·D_i.
    """
    lat = np.asarray(lat_deg, dtype=float)
    diam = np.asarray(diameter_m, dtype=float)
    y = np.asarray(ice, dtype=bool)
    if not (lat.shape == diam.shape == y.shape) or lat.ndim != 1:
        raise ValueError("lat_deg, diameter_m e ice deben ser vectores del mismo largo")
    if not (np.isfinite(lat).all() and np.isfinite(diam).all() and (diam > 0).all()):
        raise ValueError("latitudes y diámetros deben ser finitos; diámetros positivos")
    if not 0 < ratio < 10:
        raise ValueError(f"ratio fuera de rango: {ratio}")
    if y.all() or not y.any():
        raise ValueError("hacen falta cráteres con y sin hielo para estimar el desvío")
    x = _features(lat)
    log_rd = np.log(ratio * diam)

    def nll(p: np.ndarray) -> float:
        z = (log_rd - x @ p[:2]) / math.exp(p[2])
        return -float(np.sum(log_ndtr(z[y])) + np.sum(log_ndtr(-z[~y])))

    res = minimize(nll, np.array([2.0, 0.0, 0.0]), method="L-BFGS-B")
    return res.x[:2].copy(), float(math.exp(res.x[2]))


@dataclass(frozen=True)
class RegionalFit:
    """Coeficientes del prior regional y su incertidumbre (covarianza bootstrap de `beta`)."""

    beta: tuple[float, float]
    sigma_log: float
    beta_cov: tuple[tuple[float, float], tuple[float, float]]
    lat_range_deg: tuple[float, float]
    ratio: float = EXCAVATION_RATIO
    n_craters: int = 0
    n_ice: int = 0
    meta: dict[str, Any] = field(default_factory=dict, compare=False)

    def __post_init__(self) -> None:
        cov = np.asarray(self.beta_cov, dtype=float)
        if cov.shape != (2, 2) or not np.allclose(cov, cov.T):
            raise ValueError("beta_cov debe ser una matriz simétrica de 2 × 2")
        if np.linalg.eigvalsh(cov).min() < -1e-12:
            raise ValueError("beta_cov debe ser semidefinida positiva")
        if not (math.isfinite(self.sigma_log) and self.sigma_log > 0):
            raise ValueError(f"sigma_log debe ser positivo: {self.sigma_log}")
        lo, hi = self.lat_range_deg
        if not lo < hi:
            raise ValueError(f"lat_range_deg mal ordenado: {self.lat_range_deg}")

    def to_json(self) -> dict[str, Any]:
        return {
            "beta": list(self.beta),
            "sigma_log": self.sigma_log,
            "beta_cov": [list(r) for r in self.beta_cov],
            "lat_range_deg": list(self.lat_range_deg),
            "ratio": self.ratio,
            "n_craters": self.n_craters,
            "n_ice": self.n_ice,
            **self.meta,
        }

    @classmethod
    def from_json(cls, data: dict[str, Any]) -> RegionalFit:
        known = {"beta", "sigma_log", "beta_cov", "lat_range_deg", "ratio", "n_craters", "n_ice"}
        cov = data["beta_cov"]
        return cls(
            beta=(float(data["beta"][0]), float(data["beta"][1])),
            sigma_log=float(data["sigma_log"]),
            beta_cov=((float(cov[0][0]), float(cov[0][1])), (float(cov[1][0]), float(cov[1][1]))),
            lat_range_deg=(float(data["lat_range_deg"][0]), float(data["lat_range_deg"][1])),
            ratio=float(data.get("ratio", EXCAVATION_RATIO)),
            n_craters=int(data.get("n_craters", 0)),
            n_ice=int(data.get("n_ice", 0)),
            meta={k: v for k, v in data.items() if k not in known},
        )


def bootstrap_fit(
    lat_deg: Sequence[float],
    diameter_m: Sequence[float],
    ice: Sequence[bool],
    ratio: float = EXCAVATION_RATIO,
    n_boot: int = 500,
    seed: int = 0,
) -> RegionalFit:
    """Ajuste más covarianza de `beta` por bootstrap de cráteres (remuestreo con reemplazo)."""
    lat = np.asarray(lat_deg, dtype=float)
    diam = np.asarray(diameter_m, dtype=float)
    y = np.asarray(ice, dtype=bool)
    beta, sigma = fit_censored(lat, diam, y, ratio)
    rng = np.random.default_rng(seed)
    draws = []
    for _ in range(n_boot):
        i = rng.integers(0, y.size, y.size)
        if y[i].all() or not y[i].any():
            continue
        draws.append(fit_censored(lat[i], diam[i], y[i], ratio)[0])
    if len(draws) < 10:
        raise ValueError("el bootstrap no dio suficientes ajustes válidos")
    cov = np.cov(np.array(draws), rowvar=False)
    return RegionalFit(
        beta=(float(beta[0]), float(beta[1])),
        sigma_log=sigma,
        beta_cov=((float(cov[0, 0]), float(cov[0, 1])), (float(cov[1, 0]), float(cov[1, 1]))),
        lat_range_deg=(float(lat.min()), float(lat.max())),
        ratio=ratio,
        n_craters=int(y.size),
        n_ice=int(y.sum()),
    )


def load_fit(path: Path = FIT_PATH) -> RegionalFit:
    return RegionalFit.from_json(json.loads(path.read_text(encoding="utf-8")))


@dataclass(frozen=True)
class RegionalEstimate:
    """`log d` esperado en una latitud.

    `sd_total` suma el desvío residual y el de los coeficientes.
    """

    lat_deg: float
    mean_log_depth: float
    sd_residual: float
    sd_coef: float
    status: Status
    warnings: tuple[str, ...] = ()

    @property
    def sd_total(self) -> float:
        return math.hypot(self.sd_residual, self.sd_coef)

    @property
    def median_m(self) -> float:
        return math.exp(self.mean_log_depth)

    def median_interval_m(self) -> tuple[float, float]:
        """Intervalo del 90 % de la mediana (solo incertidumbre de los coeficientes)."""
        lo = self.mean_log_depth - Z90 * self.sd_coef
        hi = self.mean_log_depth + Z90 * self.sd_coef
        return math.exp(lo), math.exp(hi)

    def p_within(self, depth_m: float) -> float:
        """P(d <= depth_m), predictiva: con el desvío total."""
        return _p_within(self.mean_log_depth, self.sd_total, depth_m)

    def p_within_interval(self, depth_m: float) -> tuple[float, float]:
        """Intervalo del 90 % de P(d <= depth_m) por la incertidumbre de los coeficientes."""
        hi = _p_within(self.mean_log_depth - Z90 * self.sd_coef, self.sd_residual, depth_m)
        lo = _p_within(self.mean_log_depth + Z90 * self.sd_coef, self.sd_residual, depth_m)
        return lo, hi


def _p_within(mean_log: float, sd_log: float, depth_m: float) -> float:
    if not (math.isfinite(depth_m) and depth_m > 0):
        raise ValueError(f"depth_m debe ser finito y positivo: {depth_m}")
    return float(ndtr((math.log(depth_m) - mean_log) / sd_log))


def regional_estimate(lat_deg: float, fit: RegionalFit | None = None) -> RegionalEstimate:
    """Estimación regional en una latitud. Lanza `NoRegionalData` en el sur o debajo de 20°N."""
    if not (isinstance(lat_deg, (int, float)) and math.isfinite(lat_deg) and -90 <= lat_deg <= 90):
        raise ValueError(f"lat_deg debe estar entre -90 y 90: {lat_deg}")
    fit = fit or load_fit()
    lo, hi = fit.lat_range_deg
    if lat_deg < max(lo, MIN_LAT_DEG):
        where = "el hemisferio sur" if lat_deg < 0 else f"latitudes menores a {max(lo, 20):.0f}°N"
        raise NoRegionalData(f"Sin datos regionales para {where} ({lat_deg:.2f}°)")
    x = _features(np.array([lat_deg]))[0]
    mean = float(x @ np.asarray(fit.beta))
    sd_coef = float(math.sqrt(max(x @ np.asarray(fit.beta_cov) @ x, 0.0)))
    status: Status = "ok"
    warnings: list[str] = [f"Assumes excavation depth = {fit.ratio:g} x crater diameter"]
    if lat_deg > hi:
        status = "extrapolated"
        warnings.append(f"Latitude beyond the regional data ({hi:.1f}°N): extrapolated")
    return RegionalEstimate(lat_deg, mean, fit.sigma_log, sd_coef, status, tuple(warnings))


def site_assessment(
    lat_deg: float,
    tool_depths_m: dict[str, float],
    min_p: float | None = None,
    fit: RegionalFit | None = None,
) -> dict[str, Any]:
    """Números de la tarjeta de sitio: P(hielo al alcance) por herramienta, antes de ir.

    `min_p` es la probabilidad mínima para ir con esa herramienta. **No tiene fuente**: la declara
    la STM (`docs/research/viabilidad-expediciones.md`). Sin `min_p` no hay veredicto `GO`/`NO_GO`,
    solo números. Con `min_p`: `GO` si todo el intervalo del 90 % la supera, `NO_GO` si queda todo
    por debajo y `CONDITIONAL` si la cruza. Sin datos regionales: `INSUFFICIENT_DATA`.
    """
    if min_p is not None and not (math.isfinite(min_p) and 0 < min_p < 1):
        raise ValueError(f"min_p debe estar entre 0 y 1: {min_p}")
    if not tool_depths_m:
        raise ValueError("hace falta al menos una herramienta con su alcance")
    try:
        est = regional_estimate(lat_deg, fit)
    except NoRegionalData:
        return {
            "lat_deg": lat_deg,
            "status": "no_data",
            "verdict": "INSUFFICIENT_DATA",
            # En inglés: va a la interfaz. El detalle en castellano queda en la excepción.
            "warnings": [f"No regional data at {lat_deg:.2f}°: the fit covers northern latitudes "
                         "from 20°N only"],
            "tools": {},
        }
    tools: dict[str, dict[str, Any]] = {}
    for tool, depth in tool_depths_m.items():
        p = est.p_within(depth)
        lo, hi = est.p_within_interval(depth)
        entry: dict[str, Any] = {"depth_m": depth, "p_ice": p, "p_ice_90": [lo, hi]}
        if min_p is not None:
            entry["verdict"] = "GO" if lo >= min_p else "NO_GO" if hi < min_p else "CONDITIONAL"
        tools[tool] = entry
    out: dict[str, Any] = {
        "lat_deg": lat_deg,
        "status": est.status,
        "median_depth_m": est.median_m,
        "median_depth_90_m": list(est.median_interval_m()),
        "sd_log_total": est.sd_total,
        "warnings": list(est.warnings),
        "tools": tools,
    }
    if min_p is not None:
        order = {"GO": 0, "CONDITIONAL": 1, "NO_GO": 2}
        out["verdict"] = min((t["verdict"] for t in tools.values()), key=order.__getitem__)
        out["min_p"] = min_p
    return out
