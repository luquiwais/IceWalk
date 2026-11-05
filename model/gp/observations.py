"""Observaciones de la profundidad a la tabla de hielo.

Cada dato dice algo sobre `d`, la profundidad en metros en un punto de la grilla: un valor con
error, o una cota. Todo se expresa sobre `log d`, que es la variable que modela el GP.

Sin fuente (se ajusta en el paso 5 del plan, con análisis de sensibilidad): `BOUND_SIGMA_LOG`.

Con fuente:
- `CRATER_ERROR_M`, 1 px de error de medición en Dundas et al. 2023. También se usa como error de
  un taladro que no informa el suyo, y ese uso es supuesto.
- `NON_FLAT_RATIO`: Dundas et al. 2023 presenta 0.1 y 0.2. Se usa 0.2 porque es coherente con su
  tabla de 349 cráteres, y 0.1 no (ver `docs/EXPERIMENTS.md`).

La cota blanda no modela una falla del instrumento: eso también queda para el paso 5.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Literal

Kind = Literal["depth", "deeper_than", "shallower_than"]

CRATER_ERROR_M = 0.15
BOUND_SIGMA_LOG = 0.1
NON_FLAT_RATIO = 0.2


@dataclass(frozen=True)
class Observation:
    """`depth`: d ≈ depth_m. `deeper_than`: d > depth_m. `shallower_than`: d < depth_m.

    `sigma_log` es el error del dato en `log d`; en una cota, cuán blando es el límite.
    """

    x_m: float
    y_m: float
    kind: Kind
    depth_m: float
    sigma_log: float
    source: str

    def __post_init__(self) -> None:
        if self.kind not in ("depth", "deeper_than", "shallower_than"):
            raise ValueError(f"Tipo de observación desconocido: {self.kind!r}")
        for name in ("x_m", "y_m"):
            if not math.isfinite(getattr(self, name)):
                raise ValueError(f"{name} debe ser finito")
        for name in ("depth_m", "sigma_log"):
            value = getattr(self, name)
            if not math.isfinite(value) or value <= 0:
                raise ValueError(f"{name} debe ser finito y positivo: {value}")


def measured_depth(x_m: float, y_m: float, depth_m: float, error_m: float, source: str):
    """Profundidad medida. El error pasa a log con `error / profundidad` (primer orden)."""
    if not math.isfinite(depth_m) or depth_m <= 0:
        raise ValueError(f"depth_m debe ser finito y positivo: {depth_m}")
    return Observation(x_m, y_m, "depth", depth_m, error_m / depth_m, source)


def deeper_than(
    x_m: float, y_m: float, depth_m: float, source: str, sigma_log: float = BOUND_SIGMA_LOG
) -> Observation:
    return Observation(x_m, y_m, "deeper_than", depth_m, sigma_log, source)


def shallower_than(
    x_m: float, y_m: float, depth_m: float, source: str, sigma_log: float = BOUND_SIGMA_LOG
) -> Observation:
    return Observation(x_m, y_m, "shallower_than", depth_m, sigma_log, source)


def flat_floor_crater(
    x_m: float, y_m: float, depth_m: float, error_m: float = CRATER_ERROR_M
) -> Observation:
    """Cráter de fondo plano: el fondo marca la capa resistente, interpretada como hielo."""
    return measured_depth(x_m, y_m, depth_m, error_m, "flat_floor_crater")


def non_flat_crater(
    x_m: float, y_m: float, diameter_m: float, ratio: float = NON_FLAT_RATIO
) -> Observation:
    """Cráter sin fondo plano: excavó sin llegar a la capa resistente."""
    if not math.isfinite(ratio) or ratio <= 0:
        raise ValueError(f"ratio debe ser finito y positivo: {ratio}")
    return deeper_than(x_m, y_m, ratio * diameter_m, "non_flat_crater")


def from_measurement(measurement: dict[str, Any], tool: dict[str, Any]) -> Observation | None:
    """Traduce una medición de `measurement.schema.json`, con su herramienta del catálogo.

    Devuelve None si no informa sobre la tabla de hielo: resultado no concluyente, herramienta que
    solo ve la superficie (el hielo expuesto no prueba hielo a poca profundidad), o un `no_ice` que
    no llegó a profundizar.

    `depth_m` es la profundidad del hielo con `ice`, y lo alcanzado con `no_ice`. Si es null, con
    `no_ice` se toma el alcance de la herramienta.
    """
    if measurement["tool"] != tool["id"]:
        raise ValueError(f"La medición es de {measurement['tool']!r}, no de {tool['id']!r}")
    result = measurement["result"]
    if result not in ("ice", "no_ice", "inconclusive"):
        raise ValueError(f"Resultado desconocido: {result!r}")

    reach_m = tool["depth_m"]
    if result == "inconclusive" or reach_m <= 0:
        return None

    x_m, y_m = measurement["position"]
    depth_m = measurement.get("depth_m")
    source = tool["id"]
    if result == "no_ice":
        if depth_m == 0:
            return None
        return deeper_than(x_m, y_m, reach_m if depth_m is None else depth_m, source)
    if depth_m:
        error_m = tool.get("vertical_resolution_m") or CRATER_ERROR_M
        return measured_depth(x_m, y_m, depth_m, error_m, source)
    return shallower_than(x_m, y_m, reach_m, source)
