"""¿Se puede hacer caminando? Esfuerzo, carga, suelo, comunicaciones y movilidad de un plan.

La incertidumbre del mapa es sobre el hielo; el terreno ya filtra por dónde se camina (pendiente,
pasillo entre bloques, regreso al hábitat). Esto agrega lo que el planificador no mide en tiempo
(`config/feasibility.yaml`, cada valor con su fuente):

- Suelo: inercia térmica de THEMIS (`scripts/build_soil.py`). Polvo (< 100) puede no soportar
  peso y sube el costo de caminar (coeficiente de terreno de Pandolf).
- Esfuerzo: BTU/h por tramo, escalado desde el regreso a pie medido por NASA (ICES-2026-127) con
  la velocidad del tramo y el coeficiente del suelo; media de la EVA, pico, VO2 y oxígeno.
- Carga: masa de herramientas por tripulante contra la que asume NASA.
- Comunicaciones: línea de vista entre la antena del hábitat y el traje sobre el DTM, en cada
  estación y a lo largo de la ruta (Artemis planifica con un tiempo máximo sin línea de vista).
- Movilidad: caminar, carrito (como el MET del Apollo 14) o rover (LRV, Apollo 15-17).

La pendiente no suma esfuerzo aparte: entra solo por la velocidad (más lento en pendiente), una
simplificación que subestima el costo de subir.
"""

from __future__ import annotations

import math
from functools import lru_cache
from pathlib import Path

import numpy as np
import rasterio
import yaml

from .traverse.terrain import OUT_DIR

CONFIG = Path(__file__).resolve().parents[1] / "config" / "feasibility.yaml"
SOIL = OUT_DIR / "soil_thermal_inertia.tif"
MARS_RADIUS_M = 3389500.0
O2_G_PER_L = 1.429


@lru_cache
def config(path: Path = CONFIG) -> dict[str, dict[str, float]]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return {g: {k: float(v["value"]) for k, v in items.items()} for g, items in raw.items()}


@lru_cache(maxsize=2)
def soil_layer(path: Path = SOIL) -> np.ndarray | None:
    """Inercia térmica en la grilla del sitio, o None si no se corrió `build_soil.py`."""
    if not path.exists():
        return None
    with rasterio.open(path) as src:
        data = src.read(1).astype(float)
        nodata = src.nodata
    if nodata is not None:
        data[np.isclose(data, nodata)] = np.nan
    return data


def _sample(layer: np.ndarray, grid, xy: np.ndarray) -> np.ndarray:
    """Valor de la celda que contiene cada punto (x, y en metros); NaN fuera de la grilla."""
    cols = np.floor((xy[:, 0] - grid.xmin) / grid.cell_size_m).astype(int)
    rows = np.floor((grid.ymax - xy[:, 1]) / grid.cell_size_m).astype(int)
    inside = (rows >= 0) & (rows < grid.height) & (cols >= 0) & (cols < grid.width)
    out = np.full(len(xy), np.nan)
    if layer.shape == (grid.height, grid.width):
        out[inside] = layer[rows[inside], cols[inside]]
    return out


def densify(polyline: list[tuple[float, float]], step_m: float) -> np.ndarray:
    """Puntos cada `step_m` sobre la polilínea, incluidos los extremos."""
    pts = [np.asarray(polyline[0], float)]
    for a, b in zip(polyline[:-1], polyline[1:], strict=True):
        a, b = np.asarray(a, float), np.asarray(b, float)
        n = max(1, math.ceil(np.hypot(*(b - a)) / step_m))
        pts.extend(a + (b - a) * t for t in np.arange(1, n + 1) / n)
    return np.array(pts)


def line_of_sight(elevation: np.ndarray, grid, origin: tuple[float, float], origin_h: float,
                  targets: np.ndarray, target_h: float, step_m: float) -> np.ndarray:
    """Para cada punto, 1.0 si ve la antena del origen, 0.0 si el terreno la tapa, NaN sin DTM.

    Recta entre las dos antenas muestreada cada `step_m`, contra el terreno más la curvatura de
    Marte (d1·d2 / 2R).
    """
    o = np.asarray(origin, float)
    z0 = _sample(elevation, grid, o[None, :])[0]
    zt = _sample(elevation, grid, targets)
    out = np.full(len(targets), np.nan)
    if not np.isfinite(z0):
        return out
    for i, (p, zp) in enumerate(zip(targets, zt, strict=True)):
        if not np.isfinite(zp):
            continue
        d = float(np.hypot(*(p - o)))
        n = math.ceil(d / step_m)
        if n < 2:
            out[i] = 1.0
            continue
        t = np.arange(1, n) / n
        ground = _sample(elevation, grid, o + np.outer(t, p - o))
        ground = ground + t * (1 - t) * d * d / (2 * MARS_RADIUS_M)
        sight = (z0 + origin_h) + ((zp + target_h) - (z0 + origin_h)) * t
        known = np.isfinite(ground)
        out[i] = 0.0 if np.any(ground[known] > sight[known]) else 1.0
    return out


def soil_class(ti: float, cfg: dict) -> tuple[str, float]:
    s = cfg["soil"]
    if not np.isfinite(ti):
        return "unknown", 1.0
    if ti < s["dust_below_ti"]:
        return "dust", s["eta_dust"]
    if ti < s["loose_below_ti"]:
        return "loose", s["eta_loose"]
    return "firm", s["eta_firm"]


def _alert(level: str, message: str) -> dict:
    return {"level": level, "message": message, "source": "planner"}


def assess(*, legs: list[dict], segments: list[dict], stations: list[dict],
           equipment: list[dict], crew: int, habitat_xy: tuple[float, float],
           elevation: np.ndarray, grid, soil: np.ndarray | None = None,
           cfg: dict | None = None) -> tuple[dict, list[dict], dict[str, dict]]:
    """Factibilidad de un plan armado.

    `legs`: tramos de caminata en orden, con `xy` (polilínea), `distance_m`, `minutes` y
    `t_start_min`. `segments`: el resto del tiempo de la EVA (egress, estaciones, ingress) con
    `minutes`. Devuelve el resumen `feasibility`, alertas y, por estación, `comm_los` y `soil_ti`.
    """
    cfg = cfg or config()
    ef, ca, co = cfg["effort"], cfg["carry"], cfg["comms"]
    step = co["sample_step_m"]
    soil = soil_layer() if soil is None else soil
    alerts: list[dict] = []

    # Suelo y comunicaciones a lo largo de la ruta.
    leg_eta, ti_route, los_runs = [], [], []
    run, longest = 0.0, 0.0
    for leg in legs:
        pts = densify(leg["xy"], step) if len(leg["xy"]) > 1 else np.asarray(leg["xy"], float)
        ti = _sample(soil, grid, pts) if soil is not None else np.full(len(pts), np.nan)
        ti_route.append(ti)
        leg_eta.append(soil_class(float(np.nanmedian(ti)) if np.isfinite(ti).any() else np.nan,
                                  cfg)[1])
        los = line_of_sight(elevation, grid, habitat_xy, co["habitat_antenna_m"], pts,
                            co["suit_antenna_m"], step)
        los_runs.append(los)
        dt = leg["minutes"] / max(len(pts) - 1, 1)
        for v in los:
            run = run + dt if v == 0.0 else 0.0
            longest = max(longest, run)
    all_ti = np.concatenate(ti_route) if ti_route else np.zeros(0)
    all_los = np.concatenate(los_runs) if los_runs else np.zeros(0)
    known_ti = all_ti[np.isfinite(all_ti)]
    median_ti = float(np.median(known_ti)) if known_ti.size else math.nan
    klass, eta = soil_class(median_ti, cfg)
    dust = known_ti < cfg["soil"]["dust_below_ti"]
    dust_fraction = float(dust.mean()) if known_ti.size else 0.0

    per_station: dict[str, dict] = {}
    if stations:
        xy = np.array([s["position"] for s in stations], float)
        st_los = line_of_sight(elevation, grid, habitat_xy, co["habitat_antenna_m"], xy,
                               co["suit_antenna_m"], step)
        st_ti = _sample(soil, grid, xy) if soil is not None else np.full(len(xy), np.nan)
        for s, los, ti in zip(stations, st_los, st_ti, strict=True):
            per_station[s["id"]] = {
                "comm_los": None if not np.isfinite(los) else bool(los),
                "soil_ti": None if not np.isfinite(ti) else round(float(ti)),
            }
    no_los = [sid for sid, v in per_station.items() if v["comm_los"] is False]

    # Esfuerzo: tareas a ritmo de estación; caminata escalada por velocidad y suelo.
    task, walk, v_ref = ef["task_btu_h"], ef["walk_btu_h_ref"], ef["walk_speed_ref_kmh"]
    btu = sum(s["minutes"] for s in segments) * task / 60
    minutes = sum(s["minutes"] for s in segments)
    peak = task if segments else 0.0
    for leg, eta_leg in zip(legs, leg_eta, strict=True):
        if leg["minutes"] <= 0:
            continue
        v = leg["distance_m"] / 1000 / (leg["minutes"] / 60)
        rate = task + (walk - task) * (v / v_ref) * eta_leg
        btu += rate * leg["minutes"] / 60
        minutes += leg["minutes"]
        peak = max(peak, rate)
    avg = btu / (minutes / 60) if minutes > 0 else 0.0
    per_kg = (0.961 + 0.275 * ef["rer"]) * ef["crew_mass_kg"]  # BTU/h por ml/(kg·min)
    vo2_avg = avg / per_kg
    o2_kg = btu / per_kg * 60 * ef["crew_mass_kg"] / 1000 * O2_G_PER_L / 1000  # por tripulante

    # Carga.
    known = [e for e in equipment if e.get("mass_kg") is not None]
    total = sum(e["mass_kg"] * e.get("count", 1) for e in known)
    heaviest = max(known, key=lambda e: e["mass_kg"], default=None)
    per_crew = total / max(crew, 1)

    # Movilidad.
    rover, cart = [], []
    if dust_fraction > 0:
        rover.append(f"{dust_fraction:.0%} of the route on dust-dominated soil "
                     f"(thermal inertia < {cfg['soil']['dust_below_ti']:.0f}): may not bear "
                     "weight and costs more to walk")
    if peak > ef["peak_limit_btu_h"]:
        rover.append(f"Walking peaks at {peak:.0f} BTU/h, above {ef['peak_limit_btu_h']:.0f}")
    if avg > ef["average_limit_btu_h"]:
        rover.append(f"EVA average {avg:.0f} BTU/h, above the {ef['average_limit_btu_h']:.0f} "
                     "BTU/h design average")
    if per_crew > ca["allowance_per_crew_kg"]:
        cart.append(f"{per_crew:.1f} kg of tools per crewmember, above the "
                    f"{ca['allowance_per_crew_kg']:.0f} kg NASA assumes")
    if heaviest and heaviest["mass_kg"] > ca["single_item_limit_kg"]:
        cart.append(f"{heaviest['tool']} weighs {heaviest['mass_kg']:.1f} kg, above the "
                    f"{ca['single_item_limit_kg']:.0f} kg lifting limit")
    mode = "rover" if rover else ("cart" if cart else "walk")
    reasons = rover + cart or ["Effort, load, soil and distance are within walking limits"]
    if mode == "rover":
        alerts.append(_alert("advisory", "Consider an unpressurized rover: " + "; ".join(rover)
                             + ". Stations stay within the walkback limit in case it fails."))
    elif mode == "cart":
        alerts.append(_alert("advisory", "Consider a hand cart for the tools (as Apollo 14's "
                             "MET): " + "; ".join(cart)))

    if longest > co["max_min_without_los"]:
        alerts.append(_alert("caution", f"{longest:.0f} min in a row without line of sight to the "
                             f"habitat antenna (limit {co['max_min_without_los']:.0f} min): relay "
                             "through the EV partner or a portable repeater"))
    if no_los:
        alerts.append(_alert("advisory", "No line of sight to the habitat at "
                             + ", ".join(no_los) + ": keep the EV partner as relay"))

    summary = {
        "mobility": {"mode": mode, "reasons": reasons},
        "effort": {
            "average_btu_h": round(avg), "peak_btu_h": round(peak),
            "average_limit_btu_h": ef["average_limit_btu_h"],
            "peak_limit_btu_h": ef["peak_limit_btu_h"],
            "vo2max_fraction": round(vo2_avg / ef["vo2max_ml_kg_min"], 2),
            "vo2max_fraction_limit": ef["vo2_fraction_limit"],
            "o2_kg_per_crew": round(o2_kg, 2),
        },
        "carry": {
            "per_crew_kg": round(per_crew, 1),
            "allowance_kg": ca["allowance_per_crew_kg"],
            "heaviest": None if heaviest is None else {"tool": heaviest["tool"],
                                                       "mass_kg": heaviest["mass_kg"]},
            "unknown_mass": [e["tool"] for e in equipment if e.get("mass_kg") is None],
        },
        "soil": {
            "class": klass,
            "thermal_inertia_median": None if not math.isfinite(median_ti) else round(median_ti),
            "terrain_coefficient": eta,
            "dust_fraction": round(dust_fraction, 3),
            "source": "THEMIS thermal inertia, 100 m (Fergason et al. 2006)"
                      if soil is not None else None,
        },
        "comms": {
            "route_los_fraction": None if not np.isfinite(all_los).any()
            else round(float(np.nanmean(all_los)), 3),
            "max_min_without_los": round(longest, 1),
            "limit_min": co["max_min_without_los"],
            "stations_without_los": no_los,
        },
        "is_assumption": True,
    }
    return summary, alerts, per_station
