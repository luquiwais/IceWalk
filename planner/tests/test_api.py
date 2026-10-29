import json

import jsonschema
from fastapi.testclient import TestClient

from app.contracts import CONTRACTS
from app.main import app

client = TestClient(app)
PLAN_SCHEMA = json.loads((CONTRACTS / "schemas" / "plan.schema.json").read_text())
MEAS = json.loads((CONTRACTS / "examples" / "measurement.example.json").read_text())


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_catalog():
    tools = client.get("/catalog/tools").json()
    assert {t["id"] for t in tools} >= {"neutron_spectrometer", "gpr", "core_drill"}


def test_layers_manifest():
    data = client.get("/layers").json()
    assert "layers" in data and len(data["layers"]) > 0


def test_plan_matches_contract_and_limits():
    plan = client.post("/plan", json={}).json()
    jsonschema.validate(plan, PLAN_SCHEMA)
    s = plan["summary"]
    assert s["duration_min"] <= 8 * 60
    assert s["min_walkback_margin_min"] >= 0
    assert len(plan["stations"]) >= 3
    assert plan["branches"]


def test_replan_after_negative_measurement():
    plan = client.post("/plan", json={}).json()
    first = plan["stations"][0]
    meas = {**MEAS, "station_id": first["id"], "position": first["position"]}
    new = client.post("/replan", json={"plan_id": plan["plan_id"], "measurement": meas,
                                       "elapsed_min": 120}).json()
    jsonschema.validate(new, PLAN_SCHEMA)
    assert new["replanned_from"] == plan["plan_id"]
    assert first["id"] not in [st["id"] for st in new["stations"]]
    assert any(a["level"] == "advisory" for a in new["alerts"])


def test_spaceweather_demo():
    assert client.get("/spaceweather").json()["alert"]["level"] == "warning"
