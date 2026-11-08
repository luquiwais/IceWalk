"""Simulación del paso 7: ¿elegir dónde medir rinde más que métodos simples?

Genera "Marte posibles" coherentes con los cráteres, hace la misma EVA con varias estrategias y
compara qué consiguen. En cada mundo se conoce la profundidad real en todas las celdas candidatas.

Simplificaciones (todas declaradas, ver `docs/EXPERIMENTS.md`):
- Caminata en línea recta desde el hábitat y de vuelta, con un presupuesto de distancia. La ruta
  real (A*, pendientes, exclusión) es de Planificador.
- Celdas candidatas cada 100 m, dentro de un radio de caminata.
- La herramienta mide hasta su alcance: si el hielo está más arriba, da la profundidad con error;
  si no, da "no hay hielo hasta el alcance".
- Para planificar, la estrategia de información trata cada medición como profundidad con error,
  sin cota. La medición simulada sí respeta la cota.
- Los mundos se sacan de la aproximación gaussiana de EP condicionada a los cráteres, más el
  nugget. Con `misspecified=True`, la verdad usa otro alcance y otra parte espacial que el modelo.

Uso: `python -m gp.simulation` escribe `data/processed/s1094b/simulation.json`.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, replace

import numpy as np
from scipy.special import entr, ndtr

from gp.craters import DEFAULT_CATALOG, REPO_ROOT, load_catalog, to_observations
from gp.kernel import Matern32
from gp.observations import Observation, deeper_than, measured_depth
from gp.posterior import Prior, posterior

RESULT = REPO_ROOT / "data" / "processed" / "s1094b" / "simulation.json"
GH_NODES, GH_WEIGHTS = np.polynomial.hermite_e.hermegauss(7)
GH_WEIGHTS = GH_WEIGHTS / GH_WEIGHTS.sum()

# Ajuste de la prueba de estructura con d > 0.2 D (docs/EXPERIMENTS.md, 2026-11-05).
FITTED = {"mean": 0.86, "variance": 0.299, "rho": 0.5, "range_m": 100.0}
ADAPTIVE = ("max_variance", "information", "targets", "potential_uncertainty")
STRATEGIES = ("random", "spread", "nearest", *ADAPTIVE)


@dataclass(frozen=True)
class Scenario:
    """Una EVA. Los valores por defecto son supuestos, no reglas de NASA."""

    start_x: float
    start_y: float
    reach_m: float = 1.0
    radius_m: float = 2000.0
    spacing_m: float = 100.0
    budget_m: float = 8000.0
    stations: int = 6
    tool_error_m: float = 0.05
    crater_margin_m: float = 500.0


def make_prior(mean: float, variance: float, rho: float, range_m: float) -> Prior:
    return Prior(mean, Matern32(rho * variance, range_m), nugget=(1 - rho) * variance)


def candidates(scenario: Scenario) -> tuple[np.ndarray, np.ndarray]:
    steps = np.arange(-scenario.radius_m, scenario.radius_m + 1e-9, scenario.spacing_m)
    gx, gy = np.meshgrid(steps, steps)
    inside = np.hypot(gx, gy) <= scenario.radius_m
    return gx[inside] + scenario.start_x, gy[inside] + scenario.start_y


def local(observations: list[Observation], scenario: Scenario) -> list[Observation]:
    """Cráteres que pueden influir en la zona: con alcance corto, los lejanos no aportan."""
    limit = scenario.radius_m + scenario.crater_margin_m
    return [
        o
        for o in observations
        if math.hypot(o.x_m - scenario.start_x, o.y_m - scenario.start_y) <= limit
    ]


def sample_world(
    prior: Prior, observations: list[Observation], x: np.ndarray, y: np.ndarray, rng
) -> np.ndarray:
    """`log d` real en cada candidata: parte espacial condicionada a los datos más nugget."""
    post = posterior(prior, observations)
    mean, _ = post.predict(x, y)
    cov = post.covariance(x, y)
    vals, vecs = np.linalg.eigh(0.5 * (cov + cov.T))
    spatial = mean + vecs @ (np.sqrt(np.clip(vals, 0, None)) * rng.standard_normal(len(x)))
    return spatial + rng.standard_normal(len(x)) * math.sqrt(prior.nugget)


def measure(x: float, y: float, true_log_d: float, scenario: Scenario, rng) -> Observation:
    depth = math.exp(true_log_d)
    if depth <= scenario.reach_m:
        noisy = max(depth + rng.normal(0, scenario.tool_error_m), 0.01)
        return measured_depth(x, y, noisy, scenario.tool_error_m, "tool")
    return deeper_than(x, y, scenario.reach_m, "tool", sigma_log=0.05)


def binary_entropy(p: np.ndarray) -> np.ndarray:
    return (entr(p) + entr(1 - p)) / math.log(2)


def expected_entropy_drop(
    mean: np.ndarray, cov: np.ndarray, nugget: float, noise: float, threshold: float
) -> np.ndarray:
    """Para cada candidata, cuánto baja en promedio la ambigüedad total si se mide ahí.

    Usa una medición gaussiana de `log d` con varianza `noise + nugget`: la varianza a posteriori
    no depende del resultado, y la media se reparte según lo esperable (Gauss-Hermite).
    """
    var = np.clip(np.diag(cov), 1e-12, None)
    log_t = math.log(threshold)
    before = binary_entropy(ndtr((log_t - mean) / np.sqrt(var + nugget))).sum()
    drops = np.empty(len(mean))
    for i in range(len(mean)):
        gain = cov[i] ** 2 / (var[i] + nugget + noise)
        new_var = np.clip(var - gain, 1e-12, None)
        shift = np.sqrt(gain)[None, :] * GH_NODES[:, None]
        p = ndtr((log_t - (mean[None, :] + shift)) / np.sqrt(new_var + nugget)[None, :])
        drops[i] = before - (GH_WEIGHTS @ binary_entropy(p)).sum()
    return drops


def scores(
    strategy: str, post, prior: Prior, x, y, pos, visited, scenario: Scenario, rng
) -> np.ndarray:
    if strategy == "random":
        return rng.random(len(x))
    if strategy == "nearest":
        return -np.hypot(x - pos[0], y - pos[1])
    if strategy == "spread":
        sx = np.r_[scenario.start_x, x[visited]]
        sy = np.r_[scenario.start_y, y[visited]]
        return np.min(np.hypot(x[:, None] - sx[None, :], y[:, None] - sy[None, :]), axis=1)
    mean, var = post.predict(x, y)
    total = var + prior.nugget
    log_t = math.log(scenario.reach_m)
    if strategy == "max_variance":
        return var
    if strategy == "targets":
        return ndtr((log_t - mean) / np.sqrt(total))
    if strategy == "potential_uncertainty":
        return -(mean - np.sqrt(total))  # profundidad optimista: la más somera posible
    if strategy == "information":
        noise = (scenario.tool_error_m / scenario.reach_m) ** 2
        return expected_entropy_drop(
            mean, post.covariance(x, y), prior.nugget, noise, scenario.reach_m
        )
    raise ValueError(f"Estrategia desconocida: {strategy}")


def run_eva(
    strategy: str,
    prior: Prior,
    craters: list[Observation],
    truth: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    scenario: Scenario,
    rng,
) -> dict[str, float]:
    observations = list(craters)
    post = posterior(prior, observations)
    log_t = math.log(scenario.reach_m)
    mean0, var0 = post.predict(x, y)
    entropy0 = binary_entropy(ndtr((log_t - mean0) / np.sqrt(var0 + prior.nugget))).sum()

    pos = (scenario.start_x, scenario.start_y)
    walked, visited = 0.0, np.zeros(len(x), bool)
    hits = 0
    for _ in range(scenario.stations):
        step = np.hypot(x - pos[0], y - pos[1])
        back = np.hypot(x - scenario.start_x, y - scenario.start_y)
        feasible = (~visited) & (walked + step + back <= scenario.budget_m)
        if not feasible.any():
            break
        score = scores(strategy, post, prior, x, y, pos, visited, scenario, rng)
        score = np.where(feasible, score, -np.inf)
        i = int(np.argmax(score))
        walked += step[i]
        pos = (x[i], y[i])
        visited[i] = True
        hits += math.exp(truth[i]) <= scenario.reach_m
        observations.append(measure(x[i], y[i], truth[i], scenario, rng))
        if strategy in ADAPTIVE:
            post = posterior(prior, observations)
    walked += math.hypot(pos[0] - scenario.start_x, pos[1] - scenario.start_y)
    post = posterior(prior, observations)

    mean1, var1 = post.predict(x, y)
    p1 = ndtr((log_t - mean1) / np.sqrt(var1 + prior.nugget))
    entropy1 = binary_entropy(p1).sum()
    unvisited = np.flatnonzero(~visited)
    best = unvisited[np.argmax(p1[unvisited])]
    return {
        "hits": float(hits),
        "any_hit": float(hits > 0),
        "entropy_drop_pct": float(100 * (entropy0 - entropy1) / entropy0),
        "next_site_ok": float(math.exp(truth[best]) <= scenario.reach_m),
        "walked_km": walked / 1000,
        "stations": float(visited.sum()),
    }


def summarize(rows: list[dict[str, float]], baseline: list[dict[str, float]] | None) -> dict:
    out = {}
    for key in rows[0]:
        values = np.array([r[key] for r in rows])
        entry = {"mean": float(values.mean())}
        if baseline is not None and key != "stations":
            diff = values - np.array([b[key] for b in baseline])
            se = diff.std(ddof=1) / math.sqrt(len(diff))
            entry["diff_vs_spread"] = float(diff.mean())
            entry["diff_90ci"] = [float(diff.mean() - 1.645 * se), float(diff.mean() + 1.645 * se)]
        out[key] = entry
    return out


def run(
    scenarios: list[Scenario],
    n_worlds: int,
    seed: int = 0,
    misspecified: bool = False,
    strategies: tuple[str, ...] = STRATEGIES,
) -> dict:
    catalog = load_catalog(DEFAULT_CATALOG)
    craters = to_observations(catalog)
    model = make_prior(**FITTED)
    truth_prior = (
        make_prior(FITTED["mean"], FITTED["variance"], 0.8, 200.0) if misspecified else model
    )
    rng = np.random.default_rng(seed)
    results = {}
    for scenario in scenarios:
        x, y = candidates(scenario)
        near = local(craters, scenario)
        rows = {s: [] for s in strategies}
        for _ in range(n_worlds):
            truth = sample_world(truth_prior, near, x, y, rng)
            for strategy in strategies:
                eva_rng = np.random.default_rng(rng.integers(1 << 32))
                rows[strategy].append(
                    run_eva(strategy, model, near, truth, x, y, scenario, eva_rng)
                )
        key = f"start=({scenario.start_x:.0f},{scenario.start_y:.0f}) reach={scenario.reach_m} m"
        base = rows.get("spread")
        results[key] = {
            "craters_nearby": len(near),
            "candidates": int(len(x)),
            "strategies": {
                s: summarize(r, base if s != "spread" else None) for s, r in rows.items()
            },
        }
    return results


def default_scenarios() -> list[Scenario]:
    """Tres hábitats a más de 2 km del cráter principal, dentro de la zona con cráteres."""
    starts = [(-600.0, 2600.0), (300.0, -2200.0), (-300.0, -4600.0)]
    return [Scenario(sx, sy, reach_m=reach) for sx, sy in starts for reach in (1.0, 3.0)]


if __name__ == "__main__":
    import sys

    worlds = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    output = {
        "fitted_model": FITTED,
        "well_specified": run(default_scenarios(), worlds, seed=1),
        "misspecified": run(
            [replace(s) for s in default_scenarios() if s.reach_m == 3.0],
            worlds,
            seed=2,
            misspecified=True,
        ),
    }
    RESULT.write_text(json.dumps(output, indent=1), encoding="utf-8")
    for block in ("well_specified", "misspecified"):
        print(f"\n=== {block}")
        for scen, res in output[block].items():
            print(
                f"\n{scen}  cráteres cerca {res['craters_nearby']}, candidatas {res['candidates']}"
            )
            print("estrategia              hielo/EVA  P(alguno)  baja ambig.%  próx. sitio  km")
            for name, m in res["strategies"].items():
                print(
                    f"{name:22s}  {m['hits']['mean']:6.2f}    {m['any_hit']['mean']:6.2f}"
                    f"     {m['entropy_drop_pct']['mean']:6.2f}"
                    f"      {m['next_site_ok']['mean']:6.2f}"
                    f"   {m['walked_km']['mean']:5.1f}"
                )
