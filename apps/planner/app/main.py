"""IceWalk API. Los endpoints y formatos son el contrato (`plan.schema.json` en packages/contracts).

`/plan` y `/replan` usan el planificador real (`app/eva_planner.py`: GP + transitabilidad) cuando
existen las capas del terreno en `data/processed/`; si no, el planificador MOCK.
"""

from __future__ import annotations

import json
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from gp.observations import from_measurement
from pydantic import BaseModel

from . import eva_planner, mock_planner
from .contracts import CONTRACTS, ROOT, tool_catalog, tools_by_id
from .ice import IceModel
from .traverse.params import default_params
from .traverse.route import TraverseMap, cached_map

app = FastAPI(title="IceWalk API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DEFAULT_STM = json.loads((CONTRACTS / "examples" / "stm.s1094b.json").read_text())
_PLANS: dict[str, dict] = {}  # plan_id -> {"plan", "stm", "measurements", "completed"}

# Evento histórico de partículas solares (DONKI) para el modo demo.
DEMO_SEP_EVENT = {
    "activityID": "2023-08-07T22:19:00-SEP-001",
    "eventTime": "2023-08-07T22:19Z",
    "linked": ["2023-08-07T20:30:00-FLR-001 (X1.5)", "2023-08-07T20:48:00-CME-001"],
    "source": "NASA CCMC DONKI",
}


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


def _ice_model(stm: dict, measurements: list[dict]) -> IceModel:
    """Prior + cráteres + todas las mediciones de la EVA, como observaciones del GP."""
    catalog = tools_by_id()
    obs = []
    for m in measurements:
        tool = catalog.get(m.get("tool", ""))
        if tool is not None:
            o = from_measurement(m, tool)
            if o is not None:
                obs.append(o)
    base = _base_model(eva_planner.ice_threshold(stm))
    return base.with_observations(obs) if obs else base


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


@app.get("/maps/{kind}")
def maps(kind: str) -> dict:
    if kind not in {"probability", "uncertainty", "value"}:
        raise HTTPException(404, "kind must be probability, uncertainty or value")
    return {"kind": kind, "status": "pending", "note": "Raster URL served once the model exists"}


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


@app.get("/spaceweather")
def spaceweather(demo: bool = True) -> dict:
    if demo:
        return {"mode": "demo", "event": DEMO_SEP_EVENT,
                "alert": {"level": "warning",
                          "message": "Solar energetic particle event. Return to habitat.",
                          "source": "DONKI"}}
    return {"mode": "live", "endpoint": "https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP",
            "note": "Live fetch not implemented yet"}
