"""Mapa de hielo para el planificador: el GP de `packages/model` con los cráteres del sitio.

El GP es de Luqui (`packages/model/gp/`); acá solo se arma y se consulta, siempre a través de su
interfaz estable `gp.planning` (prior ajustado y `rank_candidates`). Los cráteres de Dundas et al.
2023 entran si existe su catálogo en `data/processed/` (licencia sin confirmar: fuera de Git). Sin
catálogo, el mapa es solo el prior, y el plan lo avisa.

Puntaje de una estación: "potencial + incertidumbre" (DECISIONS 2026-11-08), la profundidad más
somera plausible. Se usa `value` de `gp.planning.rank_candidates`: está en [0, 1] y ordena igual
que `-(media - desvío)` de `log d`. No promete "dónde": los cráteres reales no mostraron estructura
predictiva (EXPERIMENTS, 2026-11-08), pero el criterio nunca pierde contra una grilla.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from pathlib import Path

import numpy as np
from gp.craters import DEFAULT_CATALOG, load_catalog, to_observations
from gp.observations import Observation, measured_depth
from gp.planning import fitted_prior, rank_candidates
from gp.posterior import Posterior, posterior
from scipy.linalg import cho_factor, cho_solve

CRATER_MARGIN_M = 500.0  # Cráteres más lejos que esto de la zona no influyen (alcance ~100 m).
BELIEVER_REACH_RANGES = 3.0  # A 3 alcances la correlación Matérn 3/2 es ~1e-5: nada que actualizar.


class _CachedPosterior:
    """El posterior del GP con las predicciones ya hechas guardadas por punto.

    Al elegir estaciones se evalúan las mismas candidatas una y otra vez contra el mismo ajuste;
    cada punto se predice una sola vez. Expone `predict`, `covariance` y `prior`.
    """

    def __init__(self, base: Posterior) -> None:
        self.base, self.prior = base, base.prior
        self._cache: dict[tuple[float, float], tuple[float, float]] = {}

    def covariance(self, x_m, y_m):
        return self.base.covariance(x_m, y_m)

    def predict(self, x_m, y_m):
        x_m, y_m = np.asarray(x_m, dtype=float), np.asarray(y_m, dtype=float)
        xf, yf = x_m.ravel(), y_m.ravel()
        keys = list(zip(np.round(xf, 3).tolist(), np.round(yf, 3).tolist(), strict=True))
        missing = [i for i, k in enumerate(keys) if k not in self._cache]
        if missing:
            mean, var = self.base.predict(xf[missing], yf[missing])
            for i, m, v in zip(missing, mean.tolist(), var.tolist(), strict=True):
                self._cache[keys[i]] = (m, v)
        values = np.array([self._cache[k] for k in keys], dtype=float).reshape(-1, 2)
        return values[:, 0].reshape(x_m.shape), values[:, 1].reshape(x_m.shape)


class _BelievedPosterior:
    """El posterior del GP más mediciones supuestas en su propio valor esperado (kriging believer).

    Medir donde el GP ya predice deja la media igual y baja la varianza alrededor. Se calcula con
    una actualización gaussiana local, solo cerca de cada punto supuesto, sobre `predict` y
    `covariance` del posterior: sin volver a ajustar EP, que con 349 cráteres tarda ~0.1 s por
    estación. Expone lo que usa `gp.planning.rank_candidates`: `predict` y `prior`.
    """

    def __init__(self, base, points: tuple[tuple[float, float, float], ...]) -> None:
        self.base, self.prior, self.points = base, base.prior, points
        self.reach_m = BELIEVER_REACH_RANGES * base.prior.kernel.range_m

    def predict(self, x_m, y_m):
        x_m, y_m = np.asarray(x_m, dtype=float), np.asarray(y_m, dtype=float)
        mean, var = self.base.predict(x_m, y_m)
        bx, by, noise = (np.array(v) for v in zip(*self.points, strict=True))
        xf, yf, vf = x_m.ravel(), y_m.ravel(), var.ravel().copy()
        near = np.zeros(xf.size, bool)
        for px, py in zip(bx, by, strict=True):
            near |= np.hypot(xf - px, yf - py) < self.reach_m
        if near.any():
            m = int(near.sum())
            cov = self.base.covariance(np.r_[xf[near], bx], np.r_[yf[near], by])
            cross, joint = cov[:m, m:], cov[m:, m:] + np.diag(noise)
            gain = cho_solve(cho_factor(joint), cross.T)
            vf[near] = np.maximum(vf[near] - np.sum(cross * gain.T, axis=1), 1e-12)
        return mean, vf.reshape(var.shape)


@dataclass
class IceModel:
    observations: list[Observation]
    threshold_m: float = 1.0
    craters: int = 0
    prior: object = field(default_factory=fitted_prior)
    believed: tuple[tuple[float, float, float], ...] = ()  # (x, y, varianza del dato en log d)
    _post: Posterior | None = field(default=None, init=False, repr=False)
    _cached: _CachedPosterior | None = field(default=None, init=False, repr=False)

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

    @property
    def planning_post(self) -> _CachedPosterior | _BelievedPosterior:
        """El posterior con las estaciones ya elegidas supuestas medidas, para elegir la próxima."""
        if self._cached is None:
            self._cached = _CachedPosterior(self.post)
        return _BelievedPosterior(self._cached, self.believed) if self.believed else self._cached

    def with_observations(self, extra: list[Observation]) -> IceModel:
        """Mediciones reales o simuladas: se reajusta el GP. Las supuestas no se arrastran."""
        return IceModel([*self.observations, *extra], self.threshold_m, self.craters, self.prior)

    def evaluate(self, x_m, y_m) -> dict[str, np.ndarray]:
        """Probabilidad de hielo a ≤ umbral, entropía (bits), desvío y puntaje en cada punto."""
        x_m, y_m = np.asarray(x_m, dtype=float), np.asarray(y_m, dtype=float)
        post = self.planning_post
        mean, var = post.predict(x_m, y_m)
        sd = np.sqrt(var + self.prior.nugget)
        ranked = rank_candidates(post, x_m, y_m, self.threshold_m)
        return {
            "mean_log_depth": mean,
            "p_ice": ranked["p_ice"],
            "entropy": ranked["uncertainty"],
            "depth_median_m": np.exp(mean),
            "depth_shallow_m": np.exp(mean - sd),  # profundidad optimista (1 desvío)
            "value": ranked["value"],
            "score": ranked["value"],  # mismo orden que "potencial + incertidumbre"
        }

    def spatial_uncertainty(self, x_m, y_m) -> np.ndarray:
        """Duda espacial que queda en cada punto, como la capa `uncertainty` del mapa (`gp.maps`).

        1 = sin datos cerca (el prior), 0 = como medido justo ahí: el desvío de la parte espacial
        del GP entre lo que deja una medición exacta (sill·nugget / (sill + nugget)) y el prior.
        Incluye las estaciones supuestas medidas (`believe`).
        """
        sill, nugget = self.prior.kernel.sill, self.prior.nugget
        floor = sill * nugget / (sill + nugget)
        _, var = self.planning_post.predict(np.asarray(x_m, float), np.asarray(y_m, float))
        return np.sqrt(np.clip((var - floor) / (sill - floor), 0.0, 1.0))

    def believe(self, x_m: float, y_m: float, error_m: float) -> IceModel:
        """Supone medida la profundidad esperada en (x, y): baja la incertidumbre alrededor."""
        mean, _ = self.planning_post.predict(np.array([x_m]), np.array([y_m]))
        depth = float(np.exp(mean[0]))
        # Misma varianza que tendría ese dato en el GP: error en log más el nugget.
        sigma_log = measured_depth(x_m, y_m, depth, error_m, "planned").sigma_log
        noise = sigma_log**2 + self.prior.nugget
        believed = replace(self, believed=(*self.believed, (x_m, y_m, noise)))
        believed._post, believed._cached = self._post, self._cached  # mismo ajuste: no se rehace
        return believed
