"""Radar primero, taladro después: ¿cuánto rinde perforar donde el radar marca hielo somero?

El ×2.8 de la simulación necesitaba que un cráter informara sobre las celdas a 50-100 m, y los
cráteres reales no lo muestran (`docs/EXPERIMENTS.md`, 2026-11-08). Esta cuenta no depende de esa
estructura: radar y taladro miden **en el mismo punto**.

Modelo, en un punto cualquiera del sitio:
- Verdad: `log d ~ N(mean, variance)` (en S1094b, el prior de los 349 cráteres).
- Radar: con chance `1 - false_p` ve el techo del hielo, con error `log d + e`,
  `e ~ N(0, sqrt((resolution / d)² + permittivity_sigma²))`, si el hielo está dentro de su alcance.
  Con chance `false_p` ve un reflector que no es hielo, a una profundidad independiente sacada de la
  misma distribución del sitio. Es la mezcla exacta que EP aproxima ensanchando el error
  (`gp/observations.py`).
- Regla: perforar solo donde el radar marca un reflector a `flag_m` o menos.

Todos los parámetros del radar son supuestos documentados (`docs/SOURCES.md`,
`docs/research/radar-confiabilidad.md`). Las EVAs hasta confirmar suponen estaciones
independientes: en S1094b la mitad de la varianza es nugget, así que es razonable entre puntos
separados, pero no está probado. `soundings` (50 por EVA, uno cada ~40 m en 2 km) también es un
supuesto: el radar mide de forma continua, pero los sondeos cercanos no son independientes.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from scipy.stats import binom

from gp.observations import CRATER_ERROR_M, RADAR_FALSE_REFLECTOR_P, RADAR_PERMITTIVITY_SIGMA_LOG
from gp.planning import FITTED


@dataclass(frozen=True)
class RadarDrillResult:
    p_blind: float  # P(hielo a <= drill_m) perforando en cualquier punto
    p_flag: float  # P(el radar marca un reflector a <= flag_m) en un sondeo
    p_hit_given_flag: float  # P(hielo a <= drill_m | el radar marcó)
    stations: int
    soundings: int  # sondeos de radar independientes por EVA

    @property
    def lift(self) -> float:
        return self.p_hit_given_flag / self.p_blind

    def p_eva(self, p: float) -> float:
        """P(al menos una estación con hielo) en una EVA de `stations` perforaciones."""
        return 1 - (1 - p) ** self.stations

    def p_eva_guided(self) -> float:
        """Igual, perforando donde el radar marcó; si marcó en menos lugares, el resto a ciegas."""
        k = np.arange(self.stations + 1)
        pmf = binom.pmf(k, self.soundings, self.p_flag)
        pmf[-1] += binom.sf(self.stations, self.soundings, self.p_flag)  # más marcas que estaciones
        miss = (1 - self.p_hit_given_flag) ** k * (1 - self.p_blind) ** (self.stations - k)
        return float(1 - np.sum(pmf * miss))

    def evas_to_confirm(self, guided: bool) -> float:
        """EVAs esperadas hasta la primera estación con hielo (geométrica)."""
        return 1 / (self.p_eva_guided() if guided else self.p_eva(self.p_blind))


def radar_then_drill(
    drill_m: float = 1.0,
    flag_m: float = 1.0,
    mean_log: float = FITTED["mean"],
    variance_log: float = FITTED["variance"],
    false_p: float = RADAR_FALSE_REFLECTOR_P,
    permittivity_sigma: float = RADAR_PERMITTIVITY_SIGMA_LOG,
    resolution_m: float = CRATER_ERROR_M,
    radar_range_m: float = 10.0,
    stations: int = 6,
    soundings: int = 50,
    n: int = 400_000,
    seed: int = 0,
) -> RadarDrillResult:
    """Monte Carlo de la regla "perforar solo donde el radar marca hielo a `flag_m` o menos"."""
    for name, value in (("drill_m", drill_m), ("flag_m", flag_m), ("radar_range_m", radar_range_m)):
        if not (math.isfinite(value) and value > 0):
            raise ValueError(f"{name} debe ser positivo: {value}")
    if not 0 <= false_p < 1:
        raise ValueError(f"false_p debe estar en [0, 1): {false_p}")
    if variance_log <= 0 or permittivity_sigma < 0 or stations < 1 or soundings < 1:
        raise ValueError("varianza positiva, error no negativo, estaciones y sondeos")
    rng = np.random.default_rng(seed)
    sd = math.sqrt(variance_log)
    log_d = rng.normal(mean_log, sd, n)
    d = np.exp(log_d)
    err = np.sqrt((resolution_m / d) ** 2 + permittivity_sigma**2)
    seen = np.exp(log_d + err * rng.standard_normal(n))
    true_hit = d <= radar_range_m  # el radar no ve hielo más allá de su alcance
    false = rng.random(n) < false_p
    false_depth = np.exp(rng.normal(mean_log, sd, n))
    reported = np.where(false, false_depth, np.where(true_hit, seen, np.inf))
    flagged = reported <= flag_m
    ice = d <= drill_m
    if not flagged.any():
        raise ValueError("ningún sondeo marcó: subí n o flag_m")
    return RadarDrillResult(
        p_blind=float(ice.mean()),
        p_flag=float(flagged.mean()),
        p_hit_given_flag=float(ice[flagged].mean()),
        stations=stations,
        soundings=soundings,
    )


def sensitivity(**kwargs) -> list[dict]:
    """Rendimiento de la regla con los supuestos del radar en sus rangos documentados."""
    rows = []
    for false_p in (0.10, RADAR_FALSE_REFLECTOR_P, 0.45):
        for sigma in (0.10, RADAR_PERMITTIVITY_SIGMA_LOG, 0.30):
            r = radar_then_drill(false_p=false_p, permittivity_sigma=sigma, **kwargs)
            rows.append({
                "false_p": false_p,
                "permittivity_sigma": sigma,
                "p_blind": r.p_blind,
                "p_hit_given_flag": r.p_hit_given_flag,
                "lift": r.lift,
                "evas_blind": r.evas_to_confirm(guided=False),
                "evas_guided": r.evas_to_confirm(guided=True),
            })
    return rows
