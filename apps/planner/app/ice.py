"""Mapa de hielo para el planificador: el GP de `packages/model` con los cráteres del sitio.

El GP es de Luqui (`packages/model/gp/`); acá solo se arma y se consulta. El prior usa el ajuste
de la prueba de estructura (`gp.simulation.FITTED`). Los cráteres de Dundas et al. 2023 entran si
existe su catálogo en `data/processed/` (licencia sin confirmar: fuera de Git). Sin catálogo, el
mapa es solo el prior, y el plan lo avisa.

Puntaje de una estación: "potencial + incertidumbre" (DECISIONS 2026-11-08, simulación del paso 7),
la profundidad más somera plausible, `-(media - desvío)` de `log d`. Es el de
`gp.simulation.scores(..., "potential_uncertainty")`.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from gp.craters import DEFAULT_CATALOG, load_catalog, to_observations
from gp.observations import Observation, measured_depth
from gp.posterior import Posterior, posterior
from gp.simulation import FITTED, make_prior
from scipy.special import entr, ndtr

CRATER_MARGIN_M = 500.0  # Cráteres más lejos que esto de la zona no influyen (alcance ~100 m).


@dataclass
class IceModel:
    observations: list[Observation]
    threshold_m: float = 1.0
    craters: int = 0
    prior: object = field(default_factory=lambda: make_prior(**FITTED))
    _post: Posterior | None = field(default=None, init=False, repr=False)

    @classmethod
    def load(
        cls,
        threshold_m: float = 1.0,
        bbox: tuple[float, float, float, float] | None = None,
        catalog_path: Path = DEFAULT_CATALOG,
    ) -> IceModel:
        """Prior + cráteres del catálogo (si existe), recortados a `bbox` más un margen."""
        observations: list[Observation] = []
        if Path(catalog_path).exists():
            observations = to_observations(load_catalog(catalog_path))
            if bbox is not None:
                x0, x1, y0, y1 = bbox
                m = CRATER_MARGIN_M
                observations = [
                    o for o in observations
                    if x0 - m <= o.x_m <= x1 + m and y0 - m <= o.y_m <= y1 + m
                ]
        return cls(observations, threshold_m, craters=len(observations))

    @property
    def post(self) -> Posterior:
        if self._post is None:
            self._post = posterior(self.prior, self.observations)
        return self._post

    def with_observations(self, extra: list[Observation]) -> IceModel:
        return IceModel([*self.observations, *extra], self.threshold_m, self.craters, self.prior)

    def evaluate(self, x_m, y_m) -> dict[str, np.ndarray]:
        """Probabilidad de hielo a ≤ umbral, entropía (bits), desvío y puntaje en cada punto."""
        x_m, y_m = np.asarray(x_m, dtype=float), np.asarray(y_m, dtype=float)
        mean, var = self.post.predict(x_m, y_m)
        total = var + self.prior.nugget
        sd = np.sqrt(total)
        p_ice = ndtr((math.log(self.threshold_m) - mean) / sd)
        return {
            "mean_log_depth": mean,
            "p_ice": p_ice,
            "entropy": (entr(p_ice) + entr(1 - p_ice)) / math.log(2),
            "depth_median_m": np.exp(mean),
            "depth_shallow_m": np.exp(mean - sd),  # profundidad optimista (1 desvío)
            "score": -(mean - sd),
        }

    def believe(self, x_m: float, y_m: float, error_m: float) -> IceModel:
        """Supone medida la profundidad esperada en (x, y): baja la incertidumbre alrededor."""
        mean, _ = self.post.predict(np.array([x_m]), np.array([y_m]))
        depth = float(np.exp(mean[0]))
        return self.with_observations([measured_depth(x_m, y_m, depth, error_m, "planned")])
