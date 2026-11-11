"""IceWalk API. Los endpoints y formatos son el contrato (`plan.schema.json` en packages/contracts).

`/plan` y `/replan` usan el planificador real (`app/eva_planner.py`: GP + transitabilidad) cuando
existen las capas del terreno en `data/processed/`; si no, el planificador MOCK. `/maps` sirve el
mapa de hielo del GP (`app/maps.py`, `map.schema.json`) con o sin terreno.
"""

from __future__ import annotations

import json
import threading
from contextlib import asynccontextmanager
from datetime import timedelta
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from gp.observations import Observation, from_measurement
from pydantic import BaseModel

from . import donki, eva_planner, eva_window, maps, mock_planner
from .contracts import CONTRACTS, ROOT, tool_catalog, tools_by_id
from .ice import IceModel
from .marstime import utc
from .traverse.params import default_params
from .traverse.route import TraverseMap, cached_map

DEFAULT_STM = json.loads((CONTRACTS / "examples" / "stm.s1094b.json").read_text())
_PLANS: dict[str, dict] = {}  # plan_id -> {"plan", "stm", "measurements", "completed", "map"}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # El mapa base tarda ~1 s: se arma en segundo plano al arrancar, no en el primer pedido.
    threading.Thread(target=lambda: _map(DEFAULT_STM), daemon=True).start()
    yield


app = FastAPI(title="IceWalk API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)  # el mapa: ~250 kB, comprime bien


class PlanRequest(BaseModel):
    stm: dict | None = None
    measurements: list[dict] = []


class ReplanRequest(BaseModel):
    plan_id: str
    measurement: dict
    elapsed_min: float
    stm: dict | None = None


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
    habitat = eva_planner.eva_config().habitat_xy
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


def _store(plan: dict, stm: dict, measurements: list[dict], completed: list[dict]) -> dict:
    _PLANS[plan["plan_id"]] = {"plan": plan, "stm": stm, "measurements": measurements,
                               "completed": completed}
    return plan


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
    tmap = _traverse_map(stm)
    if tmap is None:
        return _store(mock_planner.build_plan(stm), stm, list(req.measurements), [])
    p = eva_planner.build(stm, tmap, _ice_model(stm, req.measurements))
    return _store(p, stm, list(req.measurements), [])


@app.post("/replan")
def replan(req: ReplanRequest) -> dict:
    entry = _PLANS.get(req.plan_id)
    if entry is None:
        raise HTTPException(404, "Unknown plan_id")
    stm = req.stm or entry["stm"]
    current, meas = entry["plan"], req.measurement
    measurements = [*entry["measurements"], meas]
    tmap = _traverse_map(stm)
    if tmap is None or current["summary"].get("is_mock"):
        p = mock_planner.replan(stm, current, meas, req.elapsed_min)
        return _store(p, stm, measurements, entry["completed"])

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
        completed=completed, replanned_from=current["plan_id"],
    )
    result = {"ice": "Ice", "no_ice": "No ice", "inconclusive": "Inconclusive result"}
    p["alerts"].insert(0, {"level": "advisory", "source": "planner",
                           "message": f"{result[meas['result']]} at {meas['station_id']}. "
                                      "EVA replanned."})
    return _store(p, stm, measurements, completed)


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
