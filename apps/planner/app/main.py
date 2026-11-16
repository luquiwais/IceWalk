"""IceWalk API. Los endpoints y formatos son el contrato (`plan.schema.json` en packages/contracts).

`/plan` y `/replan` usan el planificador real (`app/eva_planner.py`: GP + transitabilidad) cuando
existen las capas del terreno en `data/processed/`; si no, el planificador MOCK. `/maps` sirve el
mapa de hielo del GP (`app/maps.py`, `map.schema.json`) con o sin terreno.
"""

from __future__ import annotations

import dataclasses
import json
import math
import os
import re
import threading
from contextlib import asynccontextmanager
from datetime import timedelta
from functools import lru_cache
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from gp.observations import Observation, from_measurement
from pydantic import BaseModel, Field

from . import campaign, donki, eva_planner, eva_window, maps, mock_planner, replan_check
from .contracts import CONTRACTS, ROOT, tool_catalog, tools_by_id
from .eva_link import MAX_MESSAGE_BYTES, LinkError, relay
from .ice import IceModel
from .marstime import utc
from .site_card import site_card
from .traverse.params import default_params
from .traverse.route import NoRouteError, TraverseMap, cached_map

DEFAULT_STM = json.loads((CONTRACTS / "examples" / "stm.s1094b.json").read_text())
PLAN_ID = re.compile(r"plan-[A-Za-z0-9_-]{1,64}")
_PLANS: dict[str, dict] = {}  # plan_id -> {"plan", "stm", "measurements", "completed", "map"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # El mapa base tarda ~1 s: se arma en segundo plano al arrancar, no en el primer pedido.
    threading.Thread(target=lambda: _map(DEFAULT_STM), daemon=True).start()
    yield


app = FastAPI(title="IceWalk API", version="0.1.0", lifespan=lifespan)
# Orígenes permitidos: CORS_ORIGINS="https://web.example,..." en el servidor; local, el dev.
CORS_ORIGINS = [o.strip() for o in os.environ.get(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["GET", "POST"],
                   allow_headers=["Content-Type"])
app.add_middleware(GZipMiddleware, minimum_size=1000)  # el mapa: ~250 kB, comprime bien


class PlanRequest(BaseModel):
    stm: dict | None = None
    measurements: list[dict] = []
    # "learn": bajar la incertidumbre; "confirm": ir donde es más probable el hielo.
    strategy: Literal["learn", "confirm"] = "learn"
    # Hábitat movido por el operador, en metros de la grilla; None: el de config/eva.yaml.
    habitat_xy: tuple[float, float] | None = None
    # Herramientas que lleva la tripulación (ids del catálogo); None: todo el catálogo.
    tools: list[str] | None = Field(default=None, max_length=32)


class EditedStation(BaseModel):
    id: str | None = Field(default=None, max_length=16)
    position: tuple[float, float]
    tools: list[str] | None = Field(default=None, max_length=8)


class EvaluateRequest(BaseModel):
    plan_id: str
    stations: list[EditedStation] = Field(min_length=1, max_length=12)
    # Puntos de decisión (un re-plan por resultado); False para la vista previa al arrastrar.
    decisions: bool = False


class ReplanRequest(BaseModel):
    plan_id: str
    measurement: dict
    elapsed_min: float
    stm: dict | None = None
    strategy: Literal["learn", "confirm"] | None = None  # None: la del plan anterior


def _traverse_map(stm: dict) -> TraverseMap | None:
    try:
        return cached_map(default_params().with_stm(stm))
    except FileNotFoundError:
        return None


@lru_cache(maxsize=4)
def _base_model(threshold_m: float) -> IceModel:
    return IceModel.load(threshold_m)


def _observations(measurements: list[dict]) -> list[Observation]:
    """Las mediciones de la EVA que el GP puede usar, como observaciones."""
    catalog = tools_by_id()
    obs = []
    for m in measurements:
        tool = catalog.get(m.get("tool", ""))
        if tool is not None:
            o = from_measurement(m, tool)
            if o is not None:
                obs.append(o)
    return obs


def _ice_model(stm: dict, measurements: list[dict]) -> IceModel:
    """Prior + cráteres + todas las mediciones de la EVA, como observaciones del GP."""
    obs = _observations(measurements)
    base = _base_model(eva_planner.ice_threshold(stm))
    return base.with_observations(obs) if obs else base


def _map(stm: dict, entry: dict | None = None) -> dict:
    """Mapa base de la STM, o el de un plan guardado con sus mediciones (se cachea en el plan)."""
    base = _base_model(eva_planner.ice_threshold(stm))
    cfg = (entry or {}).get("config") or eva_planner.eva_config()
    habitat = cfg.habitat_xy
    if entry is None:
        return maps.ice_map(base, habitat)
    if "map" not in entry:
        obs = _observations(entry["measurements"])
        entry["map"] = maps.ice_map(
            base, habitat,
            model=base.with_observations(obs) if obs else base,
            points=maps.plan_points(entry["plan"], entry["measurements"]),
            measured=[(o.x_m, o.y_m) for o in obs],
            plan_id=entry["plan"]["plan_id"],
        )
    return entry["map"]


def _store(plan: dict, stm: dict, measurements: list[dict], completed: list[dict],
           strategy: str = "learn", config: eva_planner.EvaConfig | None = None,
           tools: list[str] | None = None) -> dict:
    plan["site_assessment"] = site_card(stm)  # plan y re-plan, real o mock
    plan["summary"].setdefault("strategy", strategy)
    _PLANS[plan["plan_id"]] = {"plan": plan, "stm": stm, "measurements": measurements,
                               "completed": completed, "strategy": strategy,
                               "config": config or eva_planner.eva_config(), "tools": tools}
    return plan


def _catalog(tools: list[str] | None) -> dict[str, dict] | None:
    """El catálogo restringido a lo que lleva la tripulación; 422 si hay ids desconocidos."""
    if tools is None:
        return None
    catalog = tools_by_id()
    unknown = sorted(set(tools) - set(catalog))
    if unknown:
        raise HTTPException(422, f"Unknown tools: {', '.join(unknown[:5])}")
    return {t: catalog[t] for t in dict.fromkeys(tools)}


def _habitat_config(
    xy: tuple[float, float] | None, tmap: TraverseMap
) -> eva_planner.EvaConfig:
    """La config de la EVA con el hábitat del operador, validado; sin hábitat, la de siempre.

    Todo input es malicioso: números finitos, dentro del área declarada (habitat_area_m) y
    sobre suelo transitable. Se lleva a la celda transitable más cercana, como las estaciones.
    """
    cfg = eva_planner.eva_config()
    if xy is None:
        return cfg
    x, y = (float(v) for v in xy)
    if not (math.isfinite(x) and math.isfinite(y)):
        raise HTTPException(422, "Habitat position must be two finite numbers in grid meters")
    area = cfg.habitat_area_m
    if area is not None and not (area[0] <= x <= area[1] and area[2] <= y <= area[3]):
        raise HTTPException(
            422, "Habitat outside the planning area covered by the HiRISE terrain model")
    try:
        cell = tmap.snap(x, y)
    except NoRouteError:
        raise HTTPException(422, "No walkable ground within 50 m of that point") from None
    sx, sy = tmap.xy(cell)
    return dataclasses.replace(cfg, habitat_xy=(float(sx), float(sy)))


@app.get("/health")
def health() -> dict:
    real = _traverse_map(DEFAULT_STM) is not None
    return {"status": "ok", "planner": "real" if real else "mock"}


@app.get("/layers")
def layers() -> dict:
    """Manifiesto de capas. Lee data/layers.yaml si pyyaml está instalado."""
    path = ROOT / "data" / "layers.yaml"
    try:
        import yaml  # type: ignore

        return yaml.safe_load(path.read_text())
    except ImportError:
        return {"error": "pyyaml not installed", "path": str(path)}


@app.get("/catalog/tools")
def catalog() -> list[dict]:
    return tool_catalog()


@app.get("/maps")
def ice_map(plan_id: str | None = None) -> dict:
    """Mapa de hielo (`map.schema.json`): probabilidad e incertidumbre por celda, todo junto.

    Sin `plan_id`, cráteres y prior alrededor del hábitat. Con `plan_id`, además las mediciones de
    ese plan, y la ventana cubre sus estaciones. Después de `/replan`, pedirlo con el plan nuevo.
    """
    if plan_id is None:
        return _map(DEFAULT_STM)
    entry = _PLANS.get(plan_id)
    if entry is None:
        raise HTTPException(404, "Unknown plan_id")
    return _map(entry["stm"], entry)


@app.post("/plan")
def plan(req: PlanRequest) -> dict:
    stm = req.stm or DEFAULT_STM
    catalog = _catalog(req.tools)  # ids desconocidos: 422 también sin terreno
    tmap = _traverse_map(stm)
    if tmap is None:
        if req.habitat_xy is not None:
            raise HTTPException(
                422, "Moving the habitat needs the terrain model, which is not loaded")
        mock = mock_planner.build_plan(stm)
        return _store(mock, stm, list(req.measurements), [], req.strategy)
    cfg = _habitat_config(req.habitat_xy, tmap)
    model = _ice_model(stm, req.measurements)
    p = eva_planner.build(stm, tmap, model, config=cfg, strategy=req.strategy, catalog=catalog)
    return _store(p, stm, list(req.measurements), [], req.strategy, cfg,
                  list(catalog) if catalog is not None else None)


@app.post("/evaluate")
def evaluate(req: EvaluateRequest) -> dict:
    """El plan con las estaciones que editó el operador (posición, orden, herramientas).

    Responde al instante: horario, margen de regreso, factibilidad, P(hielo) y avisos, sin
    reelegir estaciones. Un plan no viable vuelve igual, con su warning. Solo antes de la EVA.
    """
    entry = _PLANS.get(req.plan_id)
    if entry is None:
        raise HTTPException(404, "Unknown plan_id")
    if entry["measurements"]:
        raise HTTPException(409, "Edit the plan before the EVA starts: this plan has measurements")
    stm = entry["stm"]
    tmap = _traverse_map(stm)
    if tmap is None or entry["plan"]["summary"].get("is_mock"):
        raise HTTPException(422, "Editing stations needs the terrain model, which is not loaded")
    edits = [s.model_dump() for s in req.stations]
    try:
        p = eva_planner.evaluate(
            stm, tmap, _ice_model(stm, []), entry["plan"], edits, config=entry.get("config"),
            strategy=entry.get("strategy", "learn"), catalog=_catalog(entry.get("tools")),
            decisions=req.decisions)
    except eva_planner.EditError as err:
        raise HTTPException(422, str(err)) from None
    return _store(p, stm, [], [], entry.get("strategy", "learn"), entry.get("config"),
                  entry.get("tools"))


@app.post("/replan")
def replan(req: ReplanRequest) -> dict:
    entry = _PLANS.get(req.plan_id)
    if entry is None:
        raise HTTPException(404, "Unknown plan_id")
    stm = req.stm or entry["stm"]
    strategy = req.strategy or entry.get("strategy", "learn")
    current, meas = entry["plan"], req.measurement
    measurements = [*entry["measurements"], meas]
    tmap = _traverse_map(stm)
    if tmap is None or current["summary"].get("is_mock"):
        p = mock_planner.replan(stm, current, meas, req.elapsed_min)
        p["replan"] = replan_check.assess(current, p, meas, stm)
        return _store(p, stm, measurements, entry["completed"], strategy)

    # Hechas: las estaciones del plan hasta la medida, inclusive (o el punto medido).
    done = [s for s in current["stations"] if s["id"] == meas["station_id"]]
    if done:
        done = [s for s in current["stations"] if s["order"] <= done[0]["order"]]
    else:
        done = [{"id": meas["station_id"], "position": meas["position"], "objective_ranks": []}]
    completed = [*entry["completed"], *done]
    p = eva_planner.build(
        stm, tmap, _ice_model(stm, measurements),
        start_xy=tuple(meas["position"]), elapsed_min=req.elapsed_min,
        completed=completed, replanned_from=current["plan_id"], strategy=strategy,
        config=entry.get("config"), catalog=_catalog(entry.get("tools")),
    )
    result = {"ice": "Ice", "no_ice": "No ice", "inconclusive": "Inconclusive result"}
    p["alerts"].insert(0, {"level": "advisory", "source": "planner",
                           "message": f"{result[meas['result']]} at {meas['station_id']}. "
                                      "EVA replanned."})
    p["replan"] = replan_check.assess(current, p, meas, stm)
    return _store(p, stm, measurements, completed, strategy, entry.get("config"),
                  entry.get("tools"))


@app.get("/plan/{plan_id}")
def get_plan(plan_id: str) -> dict:
    """Un plan ya armado en esta sesión del servidor (para la lista de puño imprimible)."""
    if not PLAN_ID.fullmatch(plan_id):
        raise HTTPException(422, "Invalid plan_id")
    entry = _PLANS.get(plan_id)
    if entry is None:
        raise HTTPException(404, "Unknown plan_id")
    return entry["plan"]


@app.get("/walkback")
def walkback(plan_id: str, x: float, y: float,
             hx: float | None = None, hy: float | None = None) -> dict:
    """Ruta más rápida al hábitat del plan desde (x, y), sobre el DTM: la de EVA TERMINATE.

    Es la misma búsqueda que arma cada tramo del plan (TraverseMap.route). Con el hábitat
    (`hx`, `hy`), responde aunque el servidor ya no tenga el plan (se reinició o se durmió a
    mitad de la EVA): usa la STM por defecto. Todo input es malicioso: números finitos, dentro
    de la grilla y sobre suelo transitable.
    """
    if not PLAN_ID.fullmatch(plan_id):
        raise HTTPException(422, "Invalid plan_id")
    if not (math.isfinite(x) and math.isfinite(y)):
        raise HTTPException(422, "Position must be two finite numbers in grid meters")
    entry = _PLANS.get(plan_id)
    if entry is None and (hx is None or hy is None):
        raise HTTPException(404, "Unknown plan_id")
    tmap = _traverse_map(entry["stm"] if entry else DEFAULT_STM)
    if tmap is None:
        raise HTTPException(503, "The walkback route needs the terrain layers")
    if entry is not None:
        hab = entry["plan"].get("habitat_xy") or entry["config"].habitat_xy
    else:
        hab = _habitat_config((hx, hy), tmap).habitat_xy
    try:
        route = tmap.route((x, y), (float(hab[0]), float(hab[1])))
    except ValueError:
        raise HTTPException(422, "Position outside the terrain grid") from None
    except NoRouteError:
        raise HTTPException(422, "No walkable route to the habitat from that point") from None
    return {
        "from": [x, y],
        "to": [float(hab[0]), float(hab[1])],
        "xy": [[round(px, 1), round(py, 1)] for px, py in route.xy],
        "distance_m": round(route.distance_m, 1),
        "minutes": round(route.time_s / 60, 1),
        "max_slope_deg": round(route.max_slope_deg, 1),
    }


@app.get("/campaign")
def campaign_endpoint(drill_m: float = 1.0, evas: int = 6) -> dict:
    """P(hielo confirmado) tras 1..N EVAs: perforar a ciegas contra radar primero."""
    if not (0.1 <= drill_m <= 10) or not (1 <= evas <= 12):
        raise HTTPException(422, "drill_m in [0.1, 10] and evas in [1, 12]")
    return campaign.curves(drill_m=drill_m, evas=evas)


@app.get("/eva-window")
def eva_window_endpoint(
    plan_id: str | None = None,
    date: str | None = None,
    dust_tau: float | None = None,
    demo: bool = False,
) -> dict:
    """Cuándo salir (`eva_window.schema.json`): condiciones por hora y mejor hora de salida.

    `date`: momento desde el que se puede salir (ISO 8601, UTC; por defecto ahora; en demo, el
    evento de agosto de 2023). `dust_tau`: opacidad que reporta la tripulación. Con `plan_id`,
    la duración es la del plan y se dan las condiciones en cada estación.
    """
    if dust_tau is not None and not 0 <= dust_tau <= 20:
        raise HTTPException(422, "dust_tau must be between 0 and 20")
    plan_doc = None
    if plan_id is not None:
        entry = _PLANS.get(plan_id)
        if entry is None:
            raise HTTPException(404, "Unknown plan_id")
        plan_doc = entry["plan"]
        duration = plan_doc["summary"]["duration_min"]
    else:
        c = DEFAULT_STM["constraints"]
        duration = c["eva_max_h"] * 60 * (1 - c["reserve"])
    try:
        t0 = donki.demo_time() if demo and date is None else utc(date)
    except ValueError as exc:
        raise HTTPException(422, f"date must be ISO 8601: {exc}") from exc
    return eva_window.eva_window(t0, duration, dust_tau=dust_tau, demo=demo, plan=plan_doc)


@app.get("/spaceweather")
def spaceweather(demo: bool = True) -> dict:
    """Eventos de DONKI de los últimos días y el nivel de alerta ahora (o en la demo)."""
    t0 = donki.demo_time() if demo else utc(None)
    sw = donki.space_weather(t0, timedelta(0), demo=demo)
    moment = eva_window.assess(t0, 0.0, sw)
    level = moment.levels["space_weather"]
    reasons = [r for r in moment.reasons if "DONKI" in r]
    message = {"warning": "Solar energetic particle event. Return to habitat.",
               "caution": "CME arriving at Mars. Monitor and keep the walkback margin.",
               "advisory": reasons[0] if reasons else "Check space weather."}.get(level)
    return {
        "mode": sw.mode,
        "status": sw.status,
        "time_utc": t0.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "events": [{"kind": e.kind, "id": e.id, "time_utc": e.time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "detail": e.detail, "link": e.link} for e in sw.events],
        "alert": {"level": level, "message": message, "source": "DONKI",
                  "reasons": reasons} if message else None,
        **({"note": sw.note} if sw.note else {}),
    }


@app.post("/link/{room}")
async def link_post(room: str, request: Request) -> dict:
    """Enlace EV1-IV entre dispositivos: deja un mensaje en la sala (`app/eva_link.py`).

    Cuerpo: `{"from": id del emisor, "message": {...}}`. Se lee con tope de tamaño antes de
    parsearlo; corre en el event loop, como la espera de `GET /link/{room}`.
    """
    body = b""
    async for chunk in request.stream():
        body += chunk
        if len(body) > MAX_MESSAGE_BYTES + 1000:
            raise HTTPException(413, "Message too large")
    try:
        data = json.loads(body)
        sender, message = data["from"], data["message"]
    except (ValueError, KeyError, TypeError):
        raise HTTPException(422, 'Body must be {"from": str, "message": object}') from None
    if not isinstance(sender, str) or not isinstance(message, dict):
        raise HTTPException(422, 'Body must be {"from": str, "message": object}')
    try:
        return {"seq": relay.post(room, sender, message)}
    except LinkError as exc:
        raise HTTPException(422, str(exc)) from None


@app.get("/link/{room}")
async def link_poll(room: str, after: int | None = None, wait: float = 20.0) -> dict:
    """Mensajes de la sala posteriores a `after`, esperando hasta `wait` s (long polling)."""
    try:
        return await relay.poll(room, after, wait)
    except LinkError as exc:
        raise HTTPException(422, str(exc)) from None
