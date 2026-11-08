"""Posterior del GP sobre `log d` con datos censurados, y mapas de probabilidad de hielo.

La inferencia usa expectation propagation (EP; Rasmussen y Williams, cap. 3.6): cada dato se
reemplaza por una gaussiana que iguala media y varianza. No se usa Laplace porque se centra en el
pico, y con una cota el pico queda pegado al límite o en la zona donde la cota no pesa: puede
ignorar por completo un "no" (ver `docs/EXPERIMENTS.md`).

Limitación: el posterior es gaussiano. En la celda de una cota y a pocos metros, la distribución
real está truncada y `p_ice` queda corrida, hasta ~0.07 en las pruebas. Más lejos coincide con la
respuesta exacta.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np
from scipy.linalg import cho_solve, cholesky, solve_triangular
from scipy.special import entr, log_ndtr, ndtr

from gp.kernel import Matern32
from gp.observations import Observation

_SIGN = {"depth": 0.0, "deeper_than": 1.0, "shallower_than": -1.0}
_LOG_SQRT_2PI = 0.5 * math.log(2.0 * math.pi)
_CHUNK_CELLS = 50_000
_MIN_CAVITY_PRECISION = 1e-10


@dataclass(frozen=True)
class Prior:
    """Prior constante, para el núcleo sintético. El prior con capas llega en el paso 4.

    `nugget` es la varianza de `log d` que no se correlaciona entre puntos: variación a escala
    menor que la celda. En S1094b es cerca de la mitad del total (ver `docs/EXPERIMENTS.md`). Se
    suma al error de cada dato y a la incertidumbre de cada celda en `maps`.
    """

    mean_log_depth: float
    kernel: Matern32
    nugget: float = 0.0

    def __post_init__(self) -> None:
        if not math.isfinite(self.mean_log_depth):
            raise ValueError("mean_log_depth debe ser finito")
        if not math.isfinite(self.nugget) or self.nugget < 0:
            raise ValueError(f"nugget debe ser finito y no negativo: {self.nugget}")


def _factor(cov: np.ndarray, tau: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Devuelve (sqrt(tau), L), con L L' = I + S K S y S = diag(sqrt(tau))."""
    sqrt_tau = np.sqrt(tau)
    matrix = sqrt_tau[:, None] * cov * sqrt_tau[None, :]
    matrix[np.diag_indices_from(matrix)] += 1.0
    return sqrt_tau, cholesky(matrix, lower=True, check_finite=False)


def _expectation_propagation(
    cov: np.ndarray,
    targets: np.ndarray,
    sigmas: np.ndarray,
    signs: np.ndarray,
    max_iter: int,
    tol: float,
    damping: float,
) -> tuple[np.ndarray, np.ndarray, int, bool]:
    """Ajusta las gaussianas de cada dato, todas a la vez y con amortiguación.

    Devuelve precisiones (tau), precisión por media (nu), iteraciones y si convergió. Un dato con
    valor ya es gaussiano y queda fijo desde el principio; solo se iteran las cotas.
    """
    censored = signs != 0.0
    tau = np.where(censored, 0.0, 1.0 / sigmas**2)
    nu = np.where(censored, 0.0, targets / sigmas**2)
    if not censored.any():
        return tau, nu, 0, True

    previous = None
    for iteration in range(1, max_iter + 1):
        sqrt_tau, chol = _factor(cov, tau)
        half = solve_triangular(chol, sqrt_tau[:, None] * cov, lower=True, check_finite=False)
        variance = np.diag(cov) - np.sum(half**2, axis=0)
        mean = cov @ nu - half.T @ (half @ nu)

        state = np.concatenate([mean, variance])
        if previous is not None and np.max(np.abs(state - previous)) < tol:
            return tau, nu, iteration, True
        previous = state

        # Distribución en cada cota sin contar esa misma cota.
        cav_tau = np.maximum(1.0 / variance - tau, _MIN_CAVITY_PRECISION)[censored]
        cav_nu = (mean / variance - nu)[censored]
        cav_mean, cav_var = cav_nu / cav_tau, 1.0 / cav_tau

        # Media y varianza exactas de esa gaussiana multiplicada por la cota blanda.
        sign, target = signs[censored], targets[censored]
        scale2 = sigmas[censored] ** 2 + cav_var
        z = sign * (cav_mean - target) / np.sqrt(scale2)
        ratio = np.exp(-0.5 * z**2 - _LOG_SQRT_2PI - log_ndtr(z))
        shrink = np.clip(ratio * (ratio + z), 0.0, 1.0)
        tilted_mean = cav_mean + sign * cav_var * ratio / np.sqrt(scale2)
        tilted_var = cav_var - cav_var**2 * shrink / scale2

        new_tau = np.maximum(1.0 / tilted_var - cav_tau, 0.0)
        new_nu = tilted_mean / tilted_var - cav_nu
        tau[censored] += damping * (new_tau - tau[censored])
        nu[censored] += damping * (new_nu - nu[censored])

    return tau, nu, max_iter, False


class Posterior:
    """Estado del GP condicionado a las observaciones. Consultar no lo modifica."""

    def __init__(
        self,
        prior: Prior,
        x_m: np.ndarray,
        y_m: np.ndarray,
        tau: np.ndarray,
        nu: np.ndarray,
        iterations: int,
        converged: bool,
    ) -> None:
        self.prior = prior
        self.iterations = iterations
        self.converged = converged
        self._x, self._y = x_m, y_m
        self._sqrt_tau, self._chol = None, None
        self._alpha = np.empty(0)
        if x_m.size:
            cov = prior.kernel(x_m, y_m, x_m, y_m)
            self._sqrt_tau, self._chol = _factor(cov, tau)
            solved = cho_solve((self._chol, True), self._sqrt_tau * (cov @ nu), check_finite=False)
            self._alpha = nu - self._sqrt_tau * solved

    def _predict_flat(self, x_m: np.ndarray, y_m: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        if self._chol is None:
            return np.full(x_m.size, self.prior.mean_log_depth), np.full(
                x_m.size, self.prior.kernel.sill
            )
        cross = self.prior.kernel(self._x, self._y, x_m, y_m)
        half = solve_triangular(
            self._chol, self._sqrt_tau[:, None] * cross, lower=True, check_finite=False
        )
        mean = self.prior.mean_log_depth + self._alpha @ cross
        return mean, self.prior.kernel.sill - np.sum(half**2, axis=0)

    def covariance(self, x_m, y_m) -> np.ndarray:
        """Covarianza a posteriori de la parte espacial de `log d` entre los puntos (sin nugget)."""
        x_m = np.asarray(x_m, dtype=float).ravel()
        y_m = np.asarray(y_m, dtype=float).ravel()
        prior_cov = self.prior.kernel(x_m, y_m, x_m, y_m)
        if self._chol is None:
            return prior_cov
        cross = self.prior.kernel(self._x, self._y, x_m, y_m)
        half = solve_triangular(
            self._chol, self._sqrt_tau[:, None] * cross, lower=True, check_finite=False
        )
        return prior_cov - half.T @ half

    def predict(self, x_m, y_m, chunk_cells: int = _CHUNK_CELLS) -> tuple[np.ndarray, np.ndarray]:
        """Media y varianza de la parte espacial de `log d` (sin nugget). Cualquier forma."""
        x_m, y_m = np.asarray(x_m, dtype=float), np.asarray(y_m, dtype=float)
        if x_m.shape != y_m.shape:
            raise ValueError(f"x e y con formas distintas: {x_m.shape} y {y_m.shape}")
        if not (np.isfinite(x_m).all() and np.isfinite(y_m).all()):
            raise ValueError("x e y deben ser finitos")
        x_flat, y_flat = x_m.ravel(), y_m.ravel()
        mean, variance = np.empty(x_flat.size), np.empty(x_flat.size)
        for start in range(0, x_flat.size, chunk_cells):
            stop = start + chunk_cells
            mean[start:stop], variance[start:stop] = self._predict_flat(
                x_flat[start:stop], y_flat[start:stop]
            )
        return mean.reshape(x_m.shape), np.maximum(variance, 1e-12).reshape(x_m.shape)

    def maps(self, x_m, y_m, threshold_m: float = 1.0) -> dict[str, np.ndarray]:
        """Mapas en las celdas pedidas, sea una ventana o la grilla completa.

        `p_ice` es P(d ≤ threshold_m). `depth_mean` y `depth_sd` están en metros, con `d`
        lognormal. `entropy` es la entropía de `p_ice` en bits: 1 es el máximo de ambigüedad.
        """
        if not math.isfinite(threshold_m) or threshold_m <= 0:
            raise ValueError(f"threshold_m debe ser finito y positivo: {threshold_m}")
        mean, variance = self.predict(x_m, y_m)
        variance = variance + self.prior.nugget
        p_ice = ndtr((math.log(threshold_m) - mean) / np.sqrt(variance))
        depth_mean = np.exp(mean + 0.5 * variance)
        return {
            "p_ice": p_ice,
            "depth_mean": depth_mean,
            "depth_sd": depth_mean * np.sqrt(np.expm1(variance)),
            "entropy": (entr(p_ice) + entr(1.0 - p_ice)) / math.log(2.0),
        }


def posterior(
    prior: Prior,
    observations: Sequence[Observation],
    *,
    max_iter: int = 200,
    tol: float = 1e-5,
    damping: float = 0.5,
) -> Posterior:
    """Condiciona el prior a las observaciones. Sin observaciones, devuelve el prior.

    Si EP no converge, el resultado queda con `converged=False`: quien lo usa decide qué hacer.
    """
    if not 0 < damping <= 1:
        raise ValueError(f"damping debe estar en (0, 1]: {damping}")
    x_m = np.array([o.x_m for o in observations], dtype=float)
    y_m = np.array([o.y_m for o in observations], dtype=float)
    if not observations:
        return Posterior(prior, x_m, y_m, np.empty(0), np.empty(0), 0, True)

    targets = np.array([math.log(o.depth_m) for o in observations]) - prior.mean_log_depth
    # El nugget se integra como error independiente de cada dato: también vale para las cotas.
    sigmas = np.sqrt(np.array([o.sigma_log for o in observations], dtype=float) ** 2 + prior.nugget)
    signs = np.array([_SIGN[o.kind] for o in observations])
    cov = prior.kernel(x_m, y_m, x_m, y_m)
    tau, nu, iterations, converged = _expectation_propagation(
        cov, targets, sigmas, signs, max_iter, tol, damping
    )
    return Posterior(prior, x_m, y_m, tau, nu, iterations, converged)
