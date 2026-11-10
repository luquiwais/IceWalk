"""Interfaz estable del GP para el planificador (`apps/planner`).

El planificador usa solo estas funciones; lo demás de `gp/` puede cambiar sin romperlo. Todo trabaja
en metros de la grilla y con mediciones y herramientas con la forma de los contratos
(`measurement.schema.json` y `tool.schema.json`).

Criterio de selección por defecto: "potencial + incertidumbre", es decir, la profundidad más somera
posible contando la duda (media de `log d` menos un desvío). Ver `docs/DECISIONS.md` y
`docs/EXPERIMENTS.md` (2026-11-08): nunca pierde contra una grilla y gana si hay estructura
espacial. Los cráteres reales no mostraron estructura predictiva, así que no hay que prometer
"dónde" con estos números.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Literal

import numpy as np
from scipy.special import entr, ndtr

from gp.craters import DEFAULT_CATALOG, load_catalog, to_observations

# Mapas para la web (`GET /maps` y `map.schema.json`): detalle en `gp/maps.py`.
from gp.maps import IceMaps, MapGrid, ice_maps, map_payload, update_window  # noqa: F401
from gp.observations import (
    NEUTRON_SIGMA_LOG,
    RADAR_FALSE_REFLECTOR_P,
    Observation,
    deeper_than,
    from_measurement,
    is_neutron,
    is_radar,
    shallower_than,
)
from gp.posterior import Posterior, Prior, posterior

# Ajuste de la prueba de estructura con d > 0.2 D (docs/EXPERIMENTS.md, 2026-11-05).
FITTED = {"mean": 0.86, "variance": 0.299, "rho": 0.5, "range_m": 100.0}
OUTCOME_SIGMA_LOG = 0.05


def fitted_prior(
    mean: float = FITTED["mean"],
    variance: float = FITTED["variance"],
    rho: float = FITTED["rho"],
    range_m: float = FITTED["range_m"],
) -> Prior:
    """Prior ajustado a S1094b: mitad de la varianza espacial (alcance 100 m) y mitad nugget."""
    from gp.kernel import Matern32

    return Prior(mean, Matern32(rho * variance, range_m), nugget=(1 - rho) * variance)


def site_posterior(catalog_path: Path = DEFAULT_CATALOG, prior: Prior | None = None) -> Posterior:
    """Posterior del sitio condicionado a los cráteres del catálogo. Calcularlo una vez."""
    return posterior(prior or fitted_prior(), to_observations(load_catalog(catalog_path)))


def _binary_entropy(p: np.ndarray) -> np.ndarray:
    return (entr(p) + entr(1 - p)) / math.log(2)


def rank_candidates(
    post: Posterior, x_m: np.ndarray, y_m: np.ndarray, threshold_m: float
) -> dict[str, np.ndarray]:
    """Campos de cada candidata para el plan.

    - `p_ice`: P(d <= threshold_m).
    - `uncertainty`: entropía de `p_ice` en bits (1 = máxima ambigüedad).
    - `value`: P(d <= threshold_m) en el caso optimista (un desvío más somero), en [0, 1]. Usa una
      escala fija, el desvío total del prior, para ordenar exactamente igual que el criterio
      "potencial + incertidumbre". Mayor es mejor.
    """
    if not math.isfinite(threshold_m) or threshold_m <= 0:
        raise ValueError(f"threshold_m debe ser finito y positivo: {threshold_m}")
    x_m, y_m = np.asarray(x_m, dtype=float), np.asarray(y_m, dtype=float)
    mean, var = post.predict(x_m, y_m)
    total_sd = np.sqrt(var + post.prior.nugget)
    log_t = math.log(threshold_m)
    p_ice = ndtr((log_t - mean) / total_sd)
    prior_sd = math.sqrt(post.prior.kernel.sill + post.prior.nugget)
    optimistic_log_d = mean - total_sd
    return {
        "p_ice": p_ice,
        "uncertainty": _binary_entropy(p_ice),
        "value": ndtr((log_t - optimistic_log_d) / prior_sd),
    }


def add_observations(post: Posterior, observations: Sequence[Observation]) -> Posterior:
    """Posterior nuevo con datos agregados. El original no cambia."""
    return posterior(post.prior, [*post.observations, *observations])


def add_measurement(
    post: Posterior, measurement: dict[str, Any], tool: dict[str, Any]
) -> tuple[Posterior, Observation | None]:
    """Suma una medición del contrato. Devuelve el posterior y la observación usada.

    Si la medición no informa sobre la tabla de hielo (no concluyente, o herramienta de
    superficie), el posterior no cambia y la observación es None.
    """
    observation = from_measurement(measurement, tool)
    if observation is None:
        return post, None
    return add_observations(post, [observation]), observation


def simulate_outcome(
    post: Posterior,
    x_m: float,
    y_m: float,
    threshold_m: float,
    result: Literal["ice", "no_ice"],
) -> Posterior:
    """Posterior si en (x, y) aparece hielo hasta `threshold_m`, o no aparece. Para las ramas."""
    if result == "ice":
        observation = shallower_than(x_m, y_m, threshold_m, "simulated", OUTCOME_SIGMA_LOG)
    elif result == "no_ice":
        observation = deeper_than(x_m, y_m, threshold_m, "simulated", OUTCOME_SIGMA_LOG)
    else:
        raise ValueError(f"Resultado desconocido: {result!r}")
    return add_observations(post, [observation])


def tool_yield(
    post: Posterior, x_m: np.ndarray, y_m: np.ndarray, tools: Sequence[dict[str, Any]]
) -> dict[str, dict[str, float]]:
    """Para cada herramienta que ve el subsuelo, qué cabe esperar en las candidatas.

    - `p_per_station`: P(d <= alcance) media en las candidatas.
    - `p_best_station`: la mejor candidata.
    - `stations_for_one_hit`: estaciones esperadas hasta encontrar hielo, al azar entre las
      candidatas (1 / p_per_station). Supone estaciones independientes.

    Es el número de "con qué herramienta ir". Las herramientas sin alcance en profundidad
    (`depth_m <= 0`) se omiten. El radar se multiplica por la chance de que el reflector sea hielo,
    y el espectrómetro usa su alcance gradual.
    """
    x_m, y_m = np.asarray(x_m, dtype=float), np.asarray(y_m, dtype=float)
    mean, var = post.predict(x_m, y_m)
    total_sd = np.sqrt(var + post.prior.nugget)
    out = {}
    for tool in tools:
        reach = float(tool["depth_m"])
        if reach <= 0:
            continue
        soft = NEUTRON_SIGMA_LOG if is_neutron(tool) else 0.0
        p = ndtr((math.log(reach) - mean) / np.sqrt(total_sd**2 + soft**2))
        confirms = 1.0 - RADAR_FALSE_REFLECTOR_P if is_radar(tool) else 1.0
        p = p * confirms
        mean_p = float(p.mean())
        out[tool["id"]] = {
            "reach_m": reach,
            "confirms_ice_p": confirms,
            "p_per_station": mean_p,
            "p_best_station": float(p.max()),
            "stations_for_one_hit": (1 / mean_p) if mean_p > 0 else math.inf,
        }
    return out
