"""Planificador de ejemplo (MOCK).

Produce planes con la forma exacta del contrato (packages/contracts/schemas/plan.schema.json)
para que Frontend y Diseño trabajen desde el día 1. Los números son ilustrativos:
el planificador real (valor de medir + A* sobre transitabilidad) reemplaza este módulo
sin cambiar la API.
"""

from __future__ import annotations

import math
import uuid

from .contracts import tools_by_id, xy_to_lonlat

HABITAT_XY = (-1200.0, -900.0)
TORTUOSITY = 1.3  # MOCK: la ruta real sale de A*; acá distancia recta x factor
EGRESS_MIN = 45
INGRESS_MIN = 30
BASE_DOSE_MSV_PER_DAY = 0.67  # RAD/Curiosity, promedio GCR en superficie

# Estaciones candidatas MOCK: (id, x, y, p_ice, incertidumbre, unidad de terreno, objetivos)
CANDIDATES = [
    ("S1", 420.0, 610.0, 0.55, 0.24, 2, [1]),
    ("S2", -350.0, 900.0, 0.62, 0.22, 1, [1, 4]),
    ("S3", 150.0, -420.0, 0.78, 0.15, 3, [1, 2]),
    ("S4", 0.0, 120.0, 0.90, 0.08, 3, [3]),
    ("S5", -700.0, -150.0, 0.48, 0.25, 1, [1]),
    ("S6", 900.0, -200.0, 0.58, 0.23, 2, [1]),
]
DEFAULT_ORDER = ["S5", "S1", "S2", "S4", "S3"]

TOOLS_FOR_OBJECTIVE = {
    1: ["neutron_spectrometer"],
    2: ["core_drill", "sample_kit"],
    3: ["camera_spectrometer"],
    4: ["camera_spectrometer", "sample_kit"],
}


def _dist_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.dist(a, b) / 1000.0


def _value(p: float, u: float) -> float:
    # MOCK de valor de medir: alto cuando hay duda y chance real de hielo.
    return round(u * (0.5 + p), 3)


def _station(sid: str, order: int, cands: dict) -> dict:
    _, x, y, p, u, unit, objs = cands[sid]
    tools: list[str] = []
    for o in objs:
        for t in TOOLS_FOR_OBJECTIVE[o]:
            if t not in tools:
                tools.append(t)
    catalog = tools_by_id()
    duration = sum(catalog[t]["time_min"] for t in tools)
    sensitive = any(catalog[t]["generates_heat"] for t in tools) or p >= 0.75
    ev1 = [f"Run {catalog[t]['name']}" for t in tools if catalog[t]["crew"] >= 1][:2]
    ev2 = ["Document site (photos, notes)", "Monitor consumables and walkback margin"]
    if "core_drill" in tools:
        ev2 = ["Assist core drill", "Seal sample with clean container"]
    return {
        "id": sid,
        "order": order,
        "position": [x, y],
        "lonlat": list(xy_to_lonlat(x, y)),
        "priority": "high" if order <= 2 else ("medium" if order <= 4 else "low"),
        "objective_ranks": objs,
        "tools": tools,
        "tasks": {"EV1": ev1, "EV2": ev2},
        "duration_min": duration,
        "hypothesis": "Shallow ice (<= 1 m) present at this terrain unit"
        if 1 in objs
        else "See objective",
        "p_ice": p,
        "uncertainty": u,
        "value": _value(p, u),
        "planetary_protection": "sensitive" if sensitive else "none",
        "terrain_unit": unit,
    }


def build_plan(
    stm: dict,
    order: list[str] | None = None,
    cands: dict | None = None,
    replanned_from: str | None = None,
    start_xy: tuple[float, float] = HABITAT_XY,
    elapsed_min: float = 0.0,
) -> dict:
    cands = cands or {c[0]: c for c in CANDIDATES}
    order = order or DEFAULT_ORDER
    c = stm["constraints"]
    speed = c.get("walking_speed_kmh", 2.0)
    budget = c["eva_max_h"] * 60 * (1 - c["reserve"])

    stations = [_station(sid, i + 1, cands) for i, sid in enumerate(order)]

    timeline: list[dict] = []
    t = elapsed_min
    if elapsed_min == 0:
        timeline.append({"t_start_min": 0, "t_end_min": EGRESS_MIN, "kind": "egress",
                         "label": "Egress", "station_id": None})
        t = EGRESS_MIN

    pos = start_xy
    coords = [list(xy_to_lonlat(*pos))]
    total_km = 0.0
    max_from_hab = 0.0
    min_margin = float("inf")
    kept: list[dict] = []
    for st in stations:
        leg = _dist_km(pos, tuple(st["position"])) * TORTUOSITY
        back = _dist_km(tuple(st["position"]), HABITAT_XY) * TORTUOSITY
        walk = leg / speed * 60
        back_min = back / speed * 60
        if t + walk + st["duration_min"] + back_min + INGRESS_MIN > budget:
            continue  # no entra en el techo: se descarta
        timeline.append({"t_start_min": round(t, 1), "t_end_min": round(t + walk, 1),
                         "kind": "traverse", "label": f"Traverse to {st['id']}",
                         "station_id": st["id"]})
        t += walk
        margin = budget - (t + st["duration_min"] + back_min + INGRESS_MIN)
        min_margin = min(min_margin, margin)
        timeline.append({"t_start_min": round(t, 1), "t_end_min": round(t + st["duration_min"], 1),
                         "kind": "station", "label": f"Station {st['id']}",
                         "station_id": st["id"], "walkback_margin_min": round(margin, 1)})
        t += st["duration_min"]
        total_km += leg
        max_from_hab = max(max_from_hab, back / TORTUOSITY)
        pos = tuple(st["position"])
        coords.append(st["lonlat"])
        kept.append(st)

    back = _dist_km(pos, HABITAT_XY) * TORTUOSITY
    timeline.append({"t_start_min": round(t, 1), "t_end_min": round(t + back / speed * 60, 1),
                     "kind": "traverse", "label": "Return to habitat", "station_id": None})
    t += back / speed * 60
    total_km += back
    coords.append(list(xy_to_lonlat(*HABITAT_XY)))
    timeline.append({"t_start_min": round(t, 1), "t_end_min": round(t + INGRESS_MIN, 1),
                     "kind": "ingress", "label": "Ingress", "station_id": None})
    t += INGRESS_MIN
    timeline.append({"t_start_min": round(t, 1), "t_end_min": c["eva_max_h"] * 60,
                     "kind": "reserve", "label": "Walkback reserve", "station_id": None})

    for i, st in enumerate(kept):
        st["order"] = i + 1

    catalog = tools_by_id()
    used: dict[str, int] = {}
    for st in kept:
        for tl in st["tools"]:
            used[tl] = 1
    equipment = [{"tool": tl, "count": n, "mass_kg": catalog[tl]["mass_kg"],
                  "justification": f"Required by stations using {catalog[tl]['name']}"}
                 for tl, n in used.items()]

    branches = []
    if len(kept) >= 2:
        first = kept[0]["id"]
        rest = [s["id"] for s in kept[1:]]
        branches = [
            {"station_id": first, "if_result": "ice", "next_station_ids": rest,
             "note": "Continue nominal plan"},
            {"station_id": first, "if_result": "no_ice",
             "next_station_ids": _alternative_after_negative(first, rest, cands),
             "note": "Drop nearby stations of the same unit; add the next most valuable one"},
        ]

    u0 = sum(cc[4] for cc in cands.values())
    u_red = sum(s["uncertainty"] * 0.7 for s in kept) / u0 if u0 else 0.0

    return {
        "mission_id": stm["mission_id"],
        "plan_id": f"plan-{uuid.uuid4().hex[:8]}",
        "replanned_from": replanned_from,
        "stations": kept,
        "route": {
            "type": "FeatureCollection",
            "features": [{"type": "Feature",
                          "properties": {"kind": "traverse", "is_mock": True},
                          "geometry": {"type": "LineString", "coordinates": coords}}],
        },
        "timeline": timeline,
        "branches": branches,
        "equipment": equipment,
        "summary": {
            "duration_min": round(t, 1),
            "distance_km": round(total_km, 2),
            "max_distance_from_habitat_km": round(max_from_hab, 2),
            "min_walkback_margin_min": round(min_margin, 1) if kept else 0,
            "dose_estimate_msv": round(BASE_DOSE_MSV_PER_DAY * t / 1440, 3),
            "expected_uncertainty_reduction": round(min(u_red, 1.0), 2),
            "crew": c["crew"],
            "is_mock": True,
        },
        "alerts": [],
    }


def _alternative_after_negative(neg_id: str, rest: list[str], cands: dict) -> list[str]:
    nx, ny = cands[neg_id][1], cands[neg_id][2]
    unit = cands[neg_id][5]
    keep = [s for s in rest
            if not (cands[s][5] == unit and math.dist((nx, ny), cands[s][1:3]) < 600)]
    unused = [k for k in cands if k not in rest and k != neg_id]
    if unused:
        best = max(unused, key=lambda k: _value(cands[k][3], cands[k][4]))
        keep.insert(0, best)
    return keep


def replan(stm: dict, current: dict, measurement: dict, elapsed_min: float) -> dict:
    """MOCK de re-planificación: actualiza p_ice/incertidumbre cerca de la medición."""
    cands = {c[0]: list(c) for c in CANDIDATES}
    mx, my = measurement["position"]
    is_ice = measurement["result"] == "ice"
    for cc in cands.values():
        d = math.dist((mx, my), (cc[1], cc[2]))
        w = math.exp(-d / 300.0)  # alcance de ~300 m (supuesto del GP)
        target = 1.0 if is_ice else 0.0
        if measurement["result"] != "inconclusive":
            cc[3] = round(cc[3] + w * (target - cc[3]) * 0.8, 3)
            cc[4] = round(cc[4] * (1 - 0.8 * w), 3)
    cands_t = {k: tuple(v) for k, v in cands.items()}

    done = measurement["station_id"]
    remaining = [s["id"] for s in current["stations"] if s["id"] != done]
    if not is_ice:
        remaining = _alternative_after_negative(done, remaining, cands_t)
    plan = build_plan(stm, order=remaining, cands=cands_t, replanned_from=current["plan_id"],
                      start_xy=(mx, my), elapsed_min=elapsed_min)
    if not is_ice:
        plan["alerts"].append({"level": "advisory",
                               "message": f"No ice at {done}. EVA replanned.",
                               "source": "planner"})
    return plan
