"""Ventana de EVA: cuándo salir (PRD, funcionalidad 12; DECISIONS 2026-11-04 y 2026-11-08).

El clima cambia poco dentro del sitio, así que no es una capa del mapa: decide la hora. Para cada
momento se evalúan cinco factores con niveles advisory, caution y warning (`config/eva_window.yaml`,
todos supuestos):

- Luz: elevación del Sol en S1094b con el algoritmo de Mars24 (`app/marstime.py`).
- Temperatura y viento: climatología del Viking Lander 2 por estación y hora (`data/`, análogo).
- Polvo: opacidad que reporta la tripulación; si no hay, el fondo típico (supuesto).
- Clima espacial: DONKI en vivo, o el evento de agosto de 2023 en modo demo (`app/donki.py`).

Se busca la primera hora de salida en los próximos soles con el peor nivel más bajo durante toda
la EVA y, con un plan, las condiciones en cada estación. Respuesta: `eva_window.schema.json`.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path

import yaml

from . import donki
from .contracts import grid
from .marstime import SOL_S, mars_time, next_ltst

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "config" / "eva_window.yaml"
CLIMATE = ROOT / "data" / "vl2_climatology.json"
LEVELS = ("none", "advisory", "caution", "warning")
RANK = {lv: i for i, lv in enumerate(LEVELS)}


@lru_cache
def window_config(path: Path = CONFIG) -> dict[str, dict[str, float | None]]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return {group: {k: None if v["value"] is None else float(v["value"])
                    for k, v in items.items()}
            for group, items in raw.items()}


@lru_cache
def climate(path: Path = CLIMATE) -> dict:
    return json.loads(path.read_text())


def site() -> tuple[float, float]:
    """(longitud este, latitud) del centro del sitio, de `grid.json`."""
    crs = grid()["crs"]
    return crs["center_lon_east_deg"], crs["center_lat_deg"]


def _climate_at(ls_deg: float, ltst_h: float) -> tuple[float, float, float]:
    """(T p50, T p10, viento p95) de la climatología, por estación y hora (el bin que toca)."""
    c = climate()
    s = int(ls_deg // c["ls_bin_deg"]) % len(c["temperature_k"]["p50"])
    h = int(ltst_h) % 24
    t = c["temperature_k"]
    return t["p50"][s][h], t["p10"][s][h], c["wind_mps"]["p95"][s][h]


@dataclass
class Moment:
    t: datetime
    ltst_h: float
    ls_deg: float
    sun_elevation_deg: float
    temperature_k: float
    temperature_p10_k: float
    wind_p95_mps: float
    levels: dict[str, str]
    why: dict[str, str]  # factor -> motivo, solo los que tienen nivel

    @property
    def level(self) -> str:
        return max(self.levels.values(), key=RANK.__getitem__)

    @property
    def reasons(self) -> list[str]:
        return list(self.why.values())

    def as_dict(self, sol: int | None = None) -> dict:
        out = {
            "utc": self.t.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "ltst": _hhmm(self.ltst_h),
            "ls_deg": round(self.ls_deg, 1),
            "sun_elevation_deg": round(self.sun_elevation_deg, 1),
            "temperature_k": self.temperature_k,
            "temperature_p10_k": self.temperature_p10_k,
            "wind_p95_mps": self.wind_p95_mps,
            "levels": self.levels,
            "level": self.level,
            "reasons": self.reasons,
        }
        if sol is not None:
            out = {"sol": sol, **out}
        return out


def _hhmm(hours: float) -> str:
    m = int(round(hours * 60)) % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"


def _below(value: float, limits: list[tuple[str, float | None]]) -> str:
    """Nivel más alto cuyo límite queda por encima de `value` (límites "por debajo de")."""
    for level, limit in limits:
        if limit is not None and value < limit:
            return level
    return "none"


def _above(value: float, limits: list[tuple[str, float | None]]) -> str:
    for level, limit in limits:
        if limit is not None and value > limit:
            return level
    return "none"


def assess(t: datetime, dust_tau: float, sw: donki.SpaceWeather, cfg: dict | None = None) -> Moment:
    """Condiciones y niveles en un instante, en el centro del sitio."""
    cfg = cfg or window_config()
    lon, lat = site()
    mt = mars_time(t, lon, lat)
    t50, t10, wind = _climate_at(mt.ls_deg, mt.ltst_h)
    levels: dict[str, str] = {}
    why: dict[str, str] = {}

    li = cfg["light"]
    levels["light"] = _below(mt.sun_elevation_deg, [("warning", li["warning_below_deg"]),
                                                    ("caution", li["caution_below_deg"])])
    if levels["light"] == "warning":
        why["light"] = "Sun below the horizon"
    elif levels["light"] == "caution":
        why["light"] = f"Low sun ({mt.sun_elevation_deg:.0f} deg): long shadows"

    te = cfg["temperature"]
    levels["temperature"] = _below(t10, [("caution", te["caution_below_k"]),
                                         ("advisory", te["advisory_below_k"])])
    if levels["temperature"] != "none":
        why["temperature"] = f"Cold: {t10:.0f} K on 1 sol in 10 ({t10 - 273.15:.0f} C)"

    wi = cfg["wind"]
    levels["wind"] = _above(wind, [("caution", wi["caution_above_mps"]),
                                   ("advisory", wi["advisory_above_mps"])])
    if levels["wind"] != "none":
        why["wind"] = f"Wind up to {wind:.0f} m/s (hourly mean, 1 sol in 20)"

    du = cfg["dust"]
    levels["dust"] = _above(dust_tau, [("warning", du["warning_above_tau"]),
                                       ("caution", du["caution_above_tau"]),
                                       ("advisory", du["advisory_above_tau"])])
    if levels["dust"] != "none":
        why["dust"] = f"Dust opacity tau {dust_tau:g}"

    levels["space_weather"], space = _space_level(t, sw, cfg["space_weather"])
    if space:
        why["space_weather"] = "; ".join(space)
    return Moment(t, mt.ltst_h, mt.ls_deg, mt.sun_elevation_deg, t50, t10, wind, levels, why)


def _space_level(t: datetime, sw: donki.SpaceWeather, cfg: dict) -> tuple[str, list[str]]:
    if sw.status != "ok":
        return "advisory", ["Space weather unavailable (DONKI): check before egress"]
    level, why = "none", []
    sep_h, cme_h = cfg["sep_warning_h"], cfg["cme_window_h"]
    for e in sw.events:
        if e.kind == "sep" and e.time <= t < e.time + timedelta(hours=sep_h):
            level = "warning"
            why.append(f"Solar particle event since {e.time:%Y-%m-%d %H:%M}Z (DONKI)")
        elif e.kind == "cme_arrival" and abs((t - e.time).total_seconds()) <= cme_h * 3600:
            lv = "advisory" if e.glancing else "caution"
            if RANK[lv] > RANK[level]:
                level = lv
            why.append(f"CME at Mars around {e.time:%Y-%m-%d %H:%M}Z (WSA-Enlil, DONKI)")
    return level, why


def _worst(moments: list[Moment]) -> tuple[str, tuple[int, ...], list[str]]:
    """Peor nivel, carga (cuántos factor-momento hay en cada nivel, de warning a advisory) y un
    motivo por factor, el del momento en que ese factor está peor."""
    worst = max((m.level for m in moments), key=RANK.__getitem__)
    load = [0] * len(LEVELS)
    reasons = []
    for factor in moments[0].levels:
        top = max(moments, key=lambda m: RANK[m.levels[factor]])
        for m in moments:
            load[RANK[m.levels[factor]]] += 1
        if factor in top.why:
            reasons.append(top.why[factor])
    return worst, tuple(load[:0:-1]), reasons


def eva_window(
    t0: datetime,
    duration_min: float,
    *,
    dust_tau: float | None = None,
    demo: bool = False,
    plan: dict | None = None,
    sw: donki.SpaceWeather | None = None,
    cfg: dict | None = None,
) -> dict:
    """Condiciones por hora en los próximos soles, mejor hora de salida y estaciones del plan."""
    cfg = cfg or window_config()
    lon, lat = site()
    sols = int(cfg["search"]["sols"])
    step_s = cfg["search"]["step_min"] * 60 * SOL_S / 86400  # minutos marcianos (1/1440 de sol)
    duration = timedelta(minutes=duration_min)
    reported = dust_tau is not None
    tau = dust_tau if reported else cfg["dust"]["default_tau"]
    sw = sw or donki.space_weather(t0, timedelta(seconds=sols * SOL_S) + duration, demo=demo)

    midnight = next_ltst(t0 - timedelta(seconds=SOL_S), 0.0, lon, lat)  # empieza el sol 0
    per_sol = round(SOL_S / step_s)
    n = sols * per_sol + math.ceil(duration.total_seconds() / step_s) + 1
    grid_m = [assess(midnight + timedelta(seconds=i * step_s), tau, sw, cfg) for i in range(n)]
    per_hour = per_sol // 24
    hours = [grid_m[i].as_dict(sol=i // per_sol) for i in range(0, sols * per_sol, per_hour)]

    span = math.ceil(duration.total_seconds() / step_s)
    best = None
    for i in range(sols * per_sol):
        if grid_m[i].t < t0:
            continue
        worst, load, reasons = _worst(grid_m[i : i + span + 1])
        key = (RANK[worst], *load, i)
        if best is None or key < best[0]:
            best = (key, i, worst, reasons)
    recommended = None
    if best is not None:
        _, i, worst, reasons = best
        start, end = grid_m[i], grid_m[min(i + span, n - 1)]
        recommended = {
            "sol": i // per_sol,
            "start_utc": start.as_dict()["utc"],
            "end_utc": (start.t + duration).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "start_ltst": _hhmm(start.ltst_h),
            "end_ltst": _hhmm(end.ltst_h),
            "level": worst,
            "go": worst != "warning",
            "reasons": reasons,
        }

    stations = []
    if plan is not None and recommended is not None:
        stations = _stations(plan, grid_m[best[1]].t, tau, sw, cfg)

    return {
        "site_id": grid()["site_id"],
        "lonlat": [lon, lat],
        "mode": sw.mode,
        "requested_utc": t0.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "plan_id": plan["plan_id"] if plan else None,
        "eva_duration_min": round(duration_min, 1),
        "dust": {"tau": tau, "reported": reported},
        "space_weather": {
            "source": "NASA CCMC DONKI",
            "status": sw.status,
            "events": [{"kind": e.kind, "id": e.id,
                        "time_utc": e.time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                        "detail": e.detail, "link": e.link} for e in sw.events],
            **({"note": sw.note} if sw.note else {}),
        },
        "hours": hours,
        "recommended": recommended,
        "stations": stations,
        "climate_source": climate()["source"],
        "is_assumption": True,
        "notes": "All thresholds are assumptions (no official Mars EVA limits). Temperature and "
                 "wind are a Viking Lander 2 climatology (48N), an analogue for the site.",
    }


def _stations(plan: dict, start, tau, sw, cfg) -> list[dict]:
    """Condiciones en cada estación del plan si la EVA sale a la hora recomendada."""
    t0 = min((e["t_start_min"] for e in plan["timeline"]), default=0.0)
    out = []
    for e in plan["timeline"]:
        if e["kind"] != "station":
            continue
        arrive = start + timedelta(minutes=e["t_start_min"] - t0)
        leave = start + timedelta(minutes=e["t_end_min"] - t0)
        ms = [assess(arrive, tau, sw, cfg), assess(arrive + (leave - arrive) / 2, tau, sw, cfg),
              assess(leave, tau, sw, cfg)]
        worst, _, reasons = _worst(ms)
        first = ms[0].as_dict()
        out.append({"station_id": e["station_id"], "arrival_utc": first["utc"],
                    "arrival_ltst": first["ltst"],
                    "sun_elevation_deg": first["sun_elevation_deg"],
                    "temperature_k": first["temperature_k"],
                    "wind_p95_mps": first["wind_p95_mps"], "level": worst, "reasons": reasons})
    return out
