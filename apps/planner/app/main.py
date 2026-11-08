"""IceWalk API. Hoy responde con el planificador MOCK; los endpoints y formatos son el contrato."""

from __future__ import annotations

import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import mock_planner
from .contracts import CONTRACTS, ROOT, tool_catalog

app = FastAPI(title="IceWalk API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DEFAULT_STM = json.loads((CONTRACTS / "examples" / "stm.s1094b.json").read_text())
_PLANS: dict[str, dict] = {}

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


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "planner": "mock"}


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
    p = mock_planner.build_plan(stm)
    _PLANS[p["plan_id"]] = p
    return p


@app.post("/replan")
def replan(req: ReplanRequest) -> dict:
    current = _PLANS.get(req.plan_id)
    if current is None:
        raise HTTPException(404, "Unknown plan_id")
    p = mock_planner.replan(req.stm or DEFAULT_STM, current, req.measurement, req.elapsed_min)
    _PLANS[p["plan_id"]] = p
    return p


@app.get("/spaceweather")
def spaceweather(demo: bool = True) -> dict:
    if demo:
        return {"mode": "demo", "event": DEMO_SEP_EVENT,
                "alert": {"level": "warning",
                          "message": "Solar energetic particle event. Return to habitat.",
                          "source": "DONKI"}}
    return {"mode": "live", "endpoint": "https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP",
            "note": "Live fetch not implemented yet"}
