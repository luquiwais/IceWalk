"""Planificador de EVA: STM + mapa de hielo + transitabilidad -> plan del contrato.

Del PRD ("Del objetivo al plan") y de las decisiones del 2026-11-08:

1. **Herramientas desde la STM.** Para cada objetivo, las herramientas de estación del catálogo
   que miden su variable y llegan a `depth_max_m`; de ésas, la más rápida. Si pide muestra, se
   suma una herramienta que la trae. Las herramientas `traverse` que miden la variable (radar) se
   llevan en la caminata y no suman tiempo de estación.
2. **Mínimo de cada objetivo, por rango.** Primero las estaciones de hielo hasta `min_stations`,
   eligiendo cada vez la de mejor puntaje "potencial + incertidumbre" entre las que entran en el
   presupuesto con regreso; después los objetivos fijos (`targets`, insertados donde menos
   cuestan) y las tareas en el mejor sitio (`single_best_site`, `highest_value`).
3. **Get Aheads.** Con el tiempo que sobra, más estaciones de hielo al final (Kagey 2024).
4. Entre una elección y la siguiente, la estación elegida se supone medida en su valor esperado
   (kriging believer) para que la próxima no caiga al lado.

Todo tiempo de caminata sale de `TraverseMap` (Dijkstra sobre el DTM). El presupuesto es
`eva_max_h · (1 - reserve)`; una estación entra solo si después se puede volver al hábitat e
ingresar dentro de ese presupuesto (margen de regreso ≥ 0 en cada estación).
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import numpy as np
import yaml

from .contracts import grid as grid_contract
from .contracts import tools_by_id, xy_to_lonlat
from .ice import IceModel
from .traverse.route import TraverseMap

CONFIG = Path(__file__).resolve().parents[1] / "config" / "eva.yaml"
BASE_DOSE_MSV_PER_DAY = 0.67  # RAD/Curiosity, promedio GCR en superficie (Hassler et al. 2014)
ICE_VARIABLES = {"ice_presence", "ice_depth"}
SURVEY_COVERAGE = {"all_terrain_units", "highest_value"}


@dataclass(frozen=True)
class EvaConfig:
    habitat_xy: tuple[float, float]
    egress_min: float
    ingress_min: float
    sensitive_p_ice: float
    min_station_separation_m: float
    believer_error_m: float


@lru_cache
def eva_config(path: Path = CONFIG) -> EvaConfig:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return EvaConfig(
        habitat_xy=tuple(float(v) for v in raw["habitat_xy"]["value"]),
        egress_min=float(raw["egress_min"]["value"]),
        ingress_min=float(raw["ingress_min"]["value"]),
        sensitive_p_ice=float(raw["sensitive_p_ice"]["value"]),
        min_station_separation_m=float(raw["min_station_separation_m"]["value"]),
        believer_error_m=float(raw["believer_error_m"]["value"]),
    )


# --- requisitos de la STM ----------------------------------------------------------------------


@dataclass
class Requirement:
    rank: int
    title: str
    hypothesis: str
    variable: str
    coverage: str
    depth_m: float
    tools: list[str]
    carried: list[str]
    min_stations: int
    targets: list[tuple[float, float]]

    @property
    def is_survey(self) -> bool:
        return self.variable in ICE_VARIABLES and self.coverage in SURVEY_COVERAGE


def requirements(stm: dict, catalog: dict[str, dict]) -> tuple[list[Requirement], list[dict]]:
    """Cruza cada objetivo con el catálogo. Devuelve los requisitos y los avisos."""
    reqs, alerts = [], []
    for obj in sorted(stm["objectives"], key=lambda o: o["rank"]):
        m = obj["measurement"]
        var, depth = m["variable"], float(m.get("depth_max_m") or 0.0)
        able = [t for t in catalog.values() if var in t.get("measures", [])]
        stop = [t for t in able if t["mode"] == "stop"]
        if not stop:
            alerts.append(_alert("caution", f"Objective {obj['rank']}: no station tool in the "
                                 f"catalog measures {var}. Not planned."))
            continue
        reaching = [t for t in stop if t["depth_m"] >= depth]
        mapped = [t for t in able if t["mode"] == "traverse" and t["depth_m"] >= depth]
        if reaching:
            chosen = min(reaching, key=lambda t: t["time_min"])
        else:
            # Decisión del 2026-11-08: el radar (en la caminata) es la herramienta principal; si
            # llega al umbral, la herramienta de estación más honda confirma donde alcanza.
            chosen = max(stop, key=lambda t: t["depth_m"])
            if not mapped:
                alerts.append(_alert(
                    "caution", f"Objective {obj['rank']}: no tool reaches {depth:g} m; "
                    f"using {chosen['name']} ({chosen['depth_m']:g} m)."))
        tools = [chosen["id"]]
        if m.get("sample_return") and not chosen.get("returns_sample"):
            samplers = [
                t for t in catalog.values() if t.get("returns_sample") and t["mode"] == "stop"
            ]
            if samplers:
                tools.append(min(samplers, key=lambda t: t["time_min"])["id"])
        carried = [t["id"] for t in able if t["mode"] == "traverse"]
        coverage = m.get("coverage", "highest_value")
        reqs.append(Requirement(
            rank=obj["rank"], title=obj["title"], hypothesis=obj["hypothesis"], variable=var,
            coverage=coverage, depth_m=depth, tools=tools, carried=carried,
            min_stations=int(m.get("min_stations", 1 if coverage in SURVEY_COVERAGE else 0)),
            targets=[tuple(map(float, t)) for t in m.get("targets", [])],
        ))
    return reqs, alerts


def ice_threshold(stm: dict) -> float:
    """Profundidad del primer objetivo de hielo con `depth_max_m` (1 m por defecto)."""
    for obj in sorted(stm["objectives"], key=lambda o: o["rank"]):
        m = obj["measurement"]
        if m["variable"] in ICE_VARIABLES | {"ice_purity"} and m.get("depth_max_m"):
            return float(m["depth_max_m"])
    return 1.0


# --- estaciones y horario ----------------------------------------------------------------------


@dataclass
class Stop:
    x: float
    y: float
    cell: int
    kind: str  # "survey" (hielo, elegida por el GP) o "target" (posición fija de la STM)
    objectives: list[int] = field(default_factory=list)
    tools: list[str] = field(default_factory=list)

    def add(self, rank: int, tools: list[str]) -> None:
        if rank not in self.objectives:
            self.objectives.append(rank)
        for t in tools:
            if t not in self.tools:
                self.tools.append(t)


@dataclass
class Visit:
    stop: Stop
    depart_min: float  # sale de la estación anterior
    arrive_min: float
    end_min: float
    margin_min: float  # margen de regreso al terminar la estación


@dataclass
class Schedule:
    visits: list[Visit]
    return_start_min: float
    return_end_min: float
    end_min: float  # tras el ingreso


def station_id(x: float, y: float) -> str:
    """Id estable por posición respecto del cráter, en cientos de metros: `E04N06`."""
    ew = "E" if x >= 0 else "W"
    ns = "N" if y >= 0 else "S"
    return f"{ew}{abs(round(x / 100)):02d}{ns}{abs(round(y / 100)):02d}"


def _alert(level: str, message: str) -> dict:
    return {"level": level, "message": message, "source": "planner"}


class EvaPlanner:
    def __init__(
        self,
        stm: dict,
        tmap: TraverseMap,
        model: IceModel,
        *,
        start_xy: tuple[float, float] | None = None,
        elapsed_min: float = 0.0,
        completed: list[dict] | None = None,
        config: EvaConfig | None = None,
        catalog: dict[str, dict] | None = None,
    ) -> None:
        self.stm = stm
        self.tmap = tmap
        self.model = model
        self.cfg = config or eva_config()
        self.catalog = catalog or tools_by_id()
        c = stm["constraints"]
        self.budget_min = c["eva_max_h"] * 60 * (1 - c["reserve"])
        self.crew = int(c.get("crew", 2))
        self.habitat_xy = self.cfg.habitat_xy
        self.hab_cell = tmap.snap(*self.habitat_xy)
        self.start_xy = start_xy or self.habitat_xy
        self.start_cell = tmap.snap(*self.start_xy)
        self.fresh = elapsed_min <= 0
        self.t0 = max(elapsed_min, 0.0) + (self.cfg.egress_min if self.fresh else 0.0)
        self.completed = completed or []
        self.alerts: list[dict] = []
        self.hab_min = tmap.field(self.hab_cell)[0] / 60.0
        self._candidates(c)

    # --- candidatas ----------------------------------------------------------------------------

    def _candidates(self, c: dict) -> None:
        g = self.tmap.grid
        spacing = float(grid_contract().get("station_grid_cell_size_m", 100))
        xs = np.arange(math.ceil(g.xmin / spacing), math.floor(g.xmax / spacing) + 1) * spacing
        ys = np.arange(math.ceil(g.ymin / spacing), math.floor(g.ymax / spacing) + 1) * spacing
        gx, gy = np.meshgrid(xs, ys)
        gx, gy = gx.ravel(), gy.ravel()
        inside = (gx > g.xmin) & (gx < g.xmax) & (gy > g.ymin) & (gy < g.ymax)
        gx, gy = gx[inside], gy[inside]
        cols = np.floor((gx - g.xmin) / g.cell_size_m).astype(int)
        rows = np.floor((g.ymax - gy) / g.cell_size_m).astype(int)
        cells = rows * g.width + cols
        back = self.hab_min[cells]
        speed_mpm = self.tmap.params.flat_speed_mps * 60
        walkback_km = float(c.get("walkback_max_km", math.inf))
        ok = self.tmap.passable.flat[cells] & np.isfinite(back)
        ok &= back * speed_mpm / 1000 <= walkback_km  # tiempo de regreso en km de llano
        ok &= back * 2 + self.cfg.ingress_min <= self.budget_min  # alcanzable ida y vuelta
        self.cx, self.cy, self.ccell = gx[ok], gy[ok], cells[ok]
        done = np.zeros(self.cx.size, bool)
        for st in self.completed:
            done |= self._near(st["position"][0], st["position"][1])
        self.cdone = done

    def _near(self, x: float, y: float) -> np.ndarray:
        return np.hypot(self.cx - x, self.cy - y) < self.cfg.min_station_separation_m

    # --- horario -------------------------------------------------------------------------------

    def leg_min(self, a: int, b: int) -> float:
        return float(self.tmap.field(a)[0][b]) / 60.0

    def duration(self, stop: Stop) -> float:
        return float(sum(self.catalog[t]["time_min"] for t in stop.tools))

    def schedule(self, stops: list[Stop]) -> Schedule | None:
        """Horario con regreso al hábitat; None si alguna estación queda sin margen."""
        t, prev, visits = self.t0, self.start_cell, []
        for s in stops:
            walk = self.leg_min(prev, s.cell)
            if not math.isfinite(walk):
                return None
            arrive = t + walk
            end = arrive + self.duration(s)
            margin = self.budget_min - (end + self.hab_min[s.cell] + self.cfg.ingress_min)
            if margin < 0:
                return None
            visits.append(Visit(s, t, arrive, end, float(margin)))
            t, prev = end, s.cell
        back = self.leg_min(prev, self.hab_cell)
        end_min = t + back + self.cfg.ingress_min
        if not math.isfinite(back) or end_min > self.budget_min + 1e-9:
            return None
        return Schedule(visits, t, t + back, end_min)

    # --- elección de estaciones ----------------------------------------------------------------

    def _taken(self, stops: list[Stop]) -> np.ndarray:
        taken = self.cdone.copy()
        for s in stops:
            taken |= self._near(s.x, s.y)
        return taken

    def next_survey(self, stops: list[Stop], model: IceModel, req: Requirement) -> Stop | None:
        """Mejor candidata por valor por minuto que entra al final del recorrido con regreso."""
        sched = self.schedule(stops)
        if sched is None:
            return None
        last = stops[-1].cell if stops else self.start_cell
        t_end = sched.return_start_min
        dur = sum(self.catalog[t]["time_min"] for t in req.tools)
        leg = self.tmap.field(last)[0][self.ccell] / 60.0
        total = t_end + leg + dur + self.hab_min[self.ccell] + self.cfg.ingress_min
        feasible = np.isfinite(leg) & (total <= self.budget_min) & ~self._taken(stops)
        idx = np.flatnonzero(feasible)
        if idx.size == 0:
            return None
        # Valor por minuto (decisión 4 de plans/gp.md): el puntaje del GP sobre el tiempo que
        # cuesta sumar la estación (caminata desde la anterior + herramientas). Sin esto, con
        # puntajes parecidos se elige una estación lejana por una diferencia mínima y la caminata
        # se come la EVA.
        score = model.evaluate(self.cx[idx], self.cy[idx])["score"]
        rate = score / np.maximum(leg[idx] + dur, 1.0)
        best = idx[np.lexsort((leg[idx], -rate))[0]]  # mejor valor por minuto; empate: más cerca
        stop = Stop(float(self.cx[best]), float(self.cy[best]), int(self.ccell[best]), "survey")
        stop.add(req.rank, req.tools)
        return stop

    def _insert_target(self, stops: list[Stop], req: Requirement, xy) -> bool:
        cell = self.tmap.snap(*xy)
        x, y = self.tmap.xy(cell)
        for s in stops:
            if math.dist((s.x, s.y), (x, y)) < self.cfg.min_station_separation_m:
                before = (list(s.objectives), list(s.tools))
                s.add(req.rank, req.tools)  # ya hay una estación ahí: se le suma la tarea
                if self.schedule(stops) is not None:
                    return True
                s.objectives, s.tools = before
                return False
        stop = Stop(x, y, cell, "target")
        stop.add(req.rank, req.tools)
        best, best_end = None, math.inf
        for i in range(len(stops) + 1):
            trial = [*stops[:i], stop, *stops[i:]]
            sched = self.schedule(trial)
            if sched is not None and sched.end_min < best_end:
                best, best_end = i, sched.end_min
        if best is None:
            return False
        stops.insert(best, stop)
        return True

    def _attach(self, stops: list[Stop], req: Requirement, model: IceModel) -> bool:
        """Suma la tarea a la mejor estación existente donde entre; si no hay, agrega una."""
        survey = [s for s in stops if s.kind == "survey"]
        if survey:
            ev = model.evaluate([s.x for s in survey], [s.y for s in survey])
            key = ev["p_ice"] if req.variable.startswith("ice") else ev["score"]
            for i in np.argsort(-key):
                s = survey[int(i)]
                before = (list(s.objectives), list(s.tools))
                s.add(req.rank, req.tools)
                if self.schedule(stops) is not None:
                    return True
                s.objectives, s.tools = before
        stop = self.next_survey(stops, model, req)
        if stop is None:
            return False
        stop.kind = "survey"
        stops.append(stop)
        return True

    def plan_stops(self) -> list[Stop]:
        self.reqs, alerts = requirements(self.stm, self.catalog)
        self.alerts.extend(alerts)
        done_ranks = {r for st in self.completed for r in st.get("objective_ranks", [])}
        stops: list[Stop] = []
        model = self.model
        survey_reqs = [r for r in self.reqs if r.is_survey]

        def add_survey(req: Requirement) -> bool:
            nonlocal model
            stop = self.next_survey(stops, model, req)
            if stop is None:
                return False
            stops.append(stop)
            model = model.believe(stop.x, stop.y, self.cfg.believer_error_m)
            return True

        # 1. Mínimo de estaciones de hielo, por rango.
        for req in survey_reqs:
            done = sum(1 for st in self.completed if req.rank in st.get("objective_ranks", []))
            need = max(req.min_stations - done, 0)
            got = sum(add_survey(req) for _ in range(need))
            if got < need:
                self.alerts.append(_alert("caution", f"Objective {req.rank}: {done + got} of "
                                          f"{req.min_stations} required stations fit the EVA."))
            if req.coverage == "all_terrain_units":
                self.alerts.append(_alert("advisory", f"Objective {req.rank}: terrain units not "
                                          "available yet; stations chosen by ice potential."))
        # 2. Objetivos fijos y tareas en el mejor sitio, por rango.
        for req in self.reqs:
            if req.is_survey or req.rank in done_ranks:
                continue
            if req.coverage == "targets":
                done_xy = [tuple(st["position"]) for st in self.completed]
                for xy in req.targets:
                    if any(math.dist(xy, d) < self.cfg.min_station_separation_m for d in done_xy):
                        continue
                    if not self._insert_target(stops, req, xy):
                        self.alerts.append(_alert("advisory", f"Objective {req.rank}: target at "
                                                  f"{xy} does not fit the EVA."))
            elif not self._attach(stops, req, model):
                self.alerts.append(
                    _alert("advisory", f"Objective {req.rank} does not fit the EVA.")
                )
        # 3. Get Aheads: más estaciones de hielo con el tiempo que sobra. Reordenar la ruta
        #    libera tiempo, que se vuelve a ofrecer hasta que no entre ninguna más.
        stops[:] = self.improve(stops)
        while True:
            added = False
            for req in survey_reqs:
                while add_survey(req):
                    added = True
            if not added:
                break
            stops[:] = self.improve(stops)
        self.planned_model = model
        return stops

    def improve(self, stops: list[Stop]) -> list[Stop]:
        """Reordena para terminar antes (caminar menos), sin dejar estaciones sin margen.

        Búsqueda local: invertir tramos (2-opt) y mover una estación a otra posición (or-opt),
        mientras alguna de las dos acorte la EVA. Las estaciones no cambian, solo el orden.
        """
        best = self.schedule(stops)
        if best is None or len(stops) < 3:
            return stops
        improved = True
        while improved:
            improved = False
            n = len(stops)
            trials = [stops[:i] + stops[i : j + 1][::-1] + stops[j + 1 :]
                      for i in range(n - 1) for j in range(i + 1, n)]
            for i in range(n):
                rest = stops[:i] + stops[i + 1 :]
                trials += [rest[:j] + [stops[i]] + rest[j:] for j in range(n) if j != i]
            for trial in trials:
                sched = self.schedule(trial)
                if sched is not None and sched.end_min < best.end_min - 1e-6:
                    stops, best, improved = trial, sched, True
                    break
        return stops


# --- salida en el formato del contrato ---------------------------------------------------------


def _tasks(tools: list[str], catalog: dict[str, dict]) -> dict[str, list[str]]:
    ev1, ev2 = [], []
    turn = 0
    for tid in tools:
        t = catalog[tid]
        if t["crew"] >= 2:
            ev1.append(f"Run {t['name']}")
            ev2.append(f"Assist {t['name']}")
        else:
            (ev1 if turn % 2 == 0 else ev2).append(f"Run {t['name']}")
            turn += 1
    if not ev2:
        ev2.append("Document station (photos, notes)")
    ev2.append("Monitor consumables and walkback margin")
    return {"EV1": ev1, "EV2": ev2}


def build(
    stm: dict,
    tmap: TraverseMap,
    model: IceModel,
    *,
    start_xy: tuple[float, float] | None = None,
    elapsed_min: float = 0.0,
    completed: list[dict] | None = None,
    replanned_from: str | None = None,
    branches: bool = True,
    config: EvaConfig | None = None,
) -> dict:
    """Plan completo en el formato de `plan.schema.json`."""
    planner = EvaPlanner(stm, tmap, model, start_xy=start_xy, elapsed_min=elapsed_min,
                         completed=completed, config=config)
    stops = planner.plan_stops()
    sched = planner.schedule(stops)
    catalog, cfg = planner.catalog, planner.cfg
    alerts = planner.alerts
    if model.craters == 0:
        alerts.insert(0, _alert("advisory", "Ice map is the regional prior only: crater catalog "
                                "not loaded. Station choice is weakly informed."))
    if not model.post.converged:
        alerts.append(_alert("caution", "Ice model (EP) did not converge; values approximate."))

    reqs = {r.rank: r for r in planner.reqs}
    ev = model.evaluate([s.x for s in stops], [s.y for s in stops]) if stops else None
    ids: list[str] = []
    stations = []
    for i, visit in enumerate(sched.visits):
        s = visit.stop
        sid = station_id(s.x, s.y)
        while sid in ids:
            sid += "b"
        ids.append(sid)
        p_ice = float(ev["p_ice"][i])
        rank = min(s.objectives)
        heat = any(catalog[t]["generates_heat"] for t in s.tools)
        stations.append({
            "id": sid,
            "order": i + 1,
            "position": [s.x, s.y],
            "lonlat": list(xy_to_lonlat(s.x, s.y)),
            "priority": "high" if rank == 1 else ("medium" if rank <= 3 else "low"),
            "objective_ranks": sorted(s.objectives),
            "tools": s.tools,
            "tasks": _tasks(s.tools, catalog),
            "duration_min": planner.duration(s),
            "hypothesis": reqs[rank].hypothesis,
            "p_ice": round(p_ice, 3),
            "uncertainty": round(float(ev["entropy"][i]), 3),
            "value": round(float(ev["value"][i]), 3),
            "planetary_protection": "sensitive" if heat or p_ice > cfg.sensitive_p_ice else "none",
            "kind": s.kind,
            "depth_median_m": round(float(ev["depth_median_m"][i]), 2),
            "depth_shallow_m": round(float(ev["depth_shallow_m"][i]), 2),
        })

    # Timeline y ruta.
    timeline: list[dict] = []
    if planner.fresh:
        timeline.append({"t_start_min": 0, "t_end_min": cfg.egress_min, "kind": "egress",
                         "label": "Egress", "station_id": None})
    coords = [list(xy_to_lonlat(*tmap.xy(planner.start_cell)))]
    distance_m, prev = 0.0, planner.start_cell
    max_slope = 0.0
    for sid, visit in zip(ids, sched.visits, strict=True):
        route = tmap.route(tmap.xy(prev), (visit.stop.x, visit.stop.y))
        coords.extend(list(xy_to_lonlat(*p)) for p in route.xy[1:])
        distance_m += route.distance_m
        max_slope = max(max_slope, route.max_slope_deg)
        timeline.append({"t_start_min": round(visit.depart_min, 1),
                         "t_end_min": round(visit.arrive_min, 1), "kind": "traverse",
                         "label": f"Traverse to {sid}", "station_id": sid})
        timeline.append({"t_start_min": round(visit.arrive_min, 1),
                         "t_end_min": round(visit.end_min, 1), "kind": "station",
                         "label": f"Station {sid}", "station_id": sid,
                         "walkback_margin_min": round(visit.margin_min, 1)})
        prev = visit.stop.cell
    back = tmap.route(tmap.xy(prev), tmap.xy(planner.hab_cell))
    coords.extend(list(xy_to_lonlat(*p)) for p in back.xy[1:])
    distance_m += back.distance_m
    max_slope = max(max_slope, back.max_slope_deg)
    timeline.append({"t_start_min": round(sched.return_start_min, 1),
                     "t_end_min": round(sched.return_end_min, 1), "kind": "traverse",
                     "label": "Return to habitat", "station_id": None})
    timeline.append({"t_start_min": round(sched.return_end_min, 1),
                     "t_end_min": round(sched.end_min, 1), "kind": "ingress",
                     "label": "Ingress", "station_id": None})
    eva_max = stm["constraints"]["eva_max_h"] * 60
    timeline.append({"t_start_min": round(sched.end_min, 1), "t_end_min": eva_max,
                     "kind": "reserve", "label": "Walkback reserve", "station_id": None})

    # Equipo: herramientas de estación usadas y las de caminata de los objetivos de hielo.
    equipment, seen = [], set()
    for st in stations:
        for tid in st["tools"]:
            if tid not in seen:
                seen.add(tid)
                ranks = sorted({r for s in stations if tid in s["tools"]
                                for r in s["objective_ranks"]})
                equipment.append({"tool": tid, "count": 1, "mass_kg": catalog[tid]["mass_kg"],
                                  "justification": "Objectives " + ", ".join(map(str, ranks))})
    for r in planner.reqs:
        if r.is_survey and stations:
            for tid in r.carried:
                if tid not in seen:
                    seen.add(tid)
                    equipment.append({"tool": tid, "count": 1,
                                      "mass_kg": catalog[tid]["mass_kg"],
                                      "justification": f"Objective {r.rank}: measures "
                                                       f"{r.variable} while walking"})

    # Reducción esperada de ambigüedad (entropía de P(hielo)) en la zona alcanzable.
    before = model.evaluate(planner.cx, planner.cy)["entropy"].sum()
    after = planner.planned_model.evaluate(planner.cx, planner.cy)["entropy"].sum()
    reduction = float((before - after) / before) if before > 0 else 0.0

    hab = planner.habitat_xy
    plan = {
        "mission_id": stm["mission_id"],
        "plan_id": f"plan-{uuid.uuid4().hex[:8]}",
        "replanned_from": replanned_from,
        "stations": stations,
        "route": {
            "type": "FeatureCollection",
            "features": [{"type": "Feature",
                          "properties": {"kind": "traverse", "is_mock": False, "routing": "dtm",
                                         "max_slope_deg": round(max_slope, 1)},
                          "geometry": {"type": "LineString", "coordinates": coords}}],
        },
        "timeline": timeline,
        "branches": [],
        "equipment": equipment,
        "summary": {
            "duration_min": round(sched.end_min, 1),
            "distance_km": round(distance_m / 1000, 2),
            "max_distance_from_habitat_km": round(max((math.dist((s["position"]), hab)
                                                       for s in stations), default=0) / 1000, 2),
            "min_walkback_margin_min": round(min((v.margin_min for v in sched.visits),
                                                 default=0.0), 1),
            "dose_estimate_msv": round(BASE_DOSE_MSV_PER_DAY * sched.end_min / 1440, 3),
            "expected_uncertainty_reduction": round(min(max(reduction, 0.0), 1.0), 4),
            "crew": planner.crew,
            "is_mock": False,
            "ice_threshold_m": model.threshold_m,
            "craters_in_model": model.craters,
        },
        "alerts": alerts,
    }
    if branches and stations:
        plan["branches"] = _branches(stm, tmap, model, planner, stations, sched, config)
    return plan


def _ice_tool(tools: list[str], catalog: dict[str, dict]) -> dict | None:
    return next((catalog[t] for t in tools
                 if set(catalog[t].get("measures", [])) & ICE_VARIABLES), None)


def _branches(stm, tmap, model, planner, stations, sched: Schedule, config) -> list[dict]:
    """Qué sigue tras la primera estación que mide hielo, si da hielo o no (cuestión 23)."""
    from gp.observations import from_measurement

    i = next((k for k, st in enumerate(stations) if _ice_tool(st["tools"], planner.catalog)), None)
    if i is None:
        return []
    first = stations[i]
    tool = _ice_tool(first["tools"], planner.catalog)
    out = []
    for result in ("ice", "no_ice"):
        meas = {"station_id": first["id"], "tool": tool["id"], "result": result,
                "depth_m": None, "position": first["position"]}
        obs = from_measurement(meas, tool)
        branch_model = model.with_observations([obs] if obs else [])
        sub = EvaPlanner(stm, tmap, branch_model, start_xy=tuple(first["position"]),
                         elapsed_min=sched.visits[i].end_min, completed=stations[: i + 1],
                         config=config)
        stops = sub.plan_stops()
        out.append({
            "station_id": first["id"],
            "if_result": result,
            "next_station_ids": [station_id(s.x, s.y) for s in stops],
            "note": "Replanned with the simulated result; ice model updated",
        })
    return out
