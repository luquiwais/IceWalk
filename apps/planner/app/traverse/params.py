"""Parámetros de transitabilidad (`config/traverse.yaml`), con la STM por encima."""

from __future__ import annotations

from dataclasses import dataclass, replace
from functools import lru_cache
from pathlib import Path

import yaml

CONFIG = Path(__file__).resolve().parents[2] / "config" / "traverse.yaml"


@dataclass(frozen=True)
class TraverseParams:
    max_slope_deg: float
    min_corridor_width_m: float
    walking_speed_kmh: float
    speed_slope_coeff_mps_per_deg: float
    min_speed_mps: float

    @property
    def flat_speed_mps(self) -> float:
        return self.walking_speed_kmh / 3.6

    def with_stm(self, stm: dict | None) -> TraverseParams:
        """Aplica `constraints.max_slope_deg` y `constraints.walking_speed_kmh` de la STM."""
        c = (stm or {}).get("constraints", {})
        changes = {k: float(c[k]) for k in ("max_slope_deg", "walking_speed_kmh") if k in c}
        return replace(self, **changes) if changes else self


@lru_cache
def default_params(path: Path = CONFIG) -> TraverseParams:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return TraverseParams(
        max_slope_deg=float(raw["max_slope_deg"]["value"]),
        min_corridor_width_m=float(raw["min_corridor_width_m"]["value"]),
        walking_speed_kmh=float(raw["walking_speed_kmh"]["value"]),
        speed_slope_coeff_mps_per_deg=float(raw["speed_slope_coeff_mps_per_deg"]["value"]),
        min_speed_mps=float(raw["min_speed_mps"]["value"]),
    )
