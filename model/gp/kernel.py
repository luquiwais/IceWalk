"""Covarianza espacial del GP: cuánto dice un punto sobre otro según la distancia."""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

# Solución de (1 + s) * exp(-s) = 0.05: a esta distancia, en unidades del alcance, queda 5 %.
_S_AT_PRACTICAL_RANGE = 4.743865


@dataclass(frozen=True)
class Matern32:
    """Matérn 3/2: más áspero que un gaussiano, sin extrapolar de más entre datos.

    `sill` es la varianza de `log d` lejos de todo dato. `range_m` es el alcance práctico de un
    variograma: a esa distancia, la correlación cae a 5 %.
    """

    sill: float
    range_m: float

    def __post_init__(self) -> None:
        for name in ("sill", "range_m"):
            value = getattr(self, name)
            if not math.isfinite(value) or value <= 0:
                raise ValueError(f"{name} debe ser finito y positivo: {value}")

    def __call__(self, x1: np.ndarray, y1: np.ndarray, x2: np.ndarray, y2: np.ndarray):
        """Matriz de covarianzas de forma (len(x1), len(x2)), para vectores de una dimensión."""
        distance = np.hypot(x1[:, None] - x2[None, :], y1[:, None] - y2[None, :])
        scaled = _S_AT_PRACTICAL_RANGE * distance / self.range_m
        return self.sill * (1.0 + scaled) * np.exp(-scaled)
