"""Tarjeta de sitio en el plan (`site_assessment`, cuestión 58)."""

import copy
import json

import jsonschema
from fastapi.testclient import TestClient

from app.contracts import CONTRACTS
from app.main import DEFAULT_STM, app
from app.site_card import site_card, subsurface_tools

client = TestClient(app)
PLAN_SCHEMA = json.loads((CONTRACTS / "schemas" / "plan.schema.json").read_text())
MEAS = json.loads((CONTRACTS / "examples" / "measurement.example.json").read_text())


def test_subsurface_tools_from_catalog():
    tools = subsurface_tools()
    assert tools == {"neutron_spectrometer": 0.6, "gpr": 10.0, "core_drill": 1.0}


def test_plan_carries_site_card_with_verdict():
    plan = client.post("/plan", json={}).json()
    jsonschema.validate(plan, PLAN_SCHEMA)
    card = plan["site_assessment"]
    assert card["min_p"] == 0.5  # de la STM de ejemplo
    assert card["status"] == "ok"
    tools = card["tools"]
    # S1094b a 35°N: el hielo casi nunca está a menos de 1 m, y casi siempre a menos de 10 m.
    assert tools["neutron_spectrometer"]["verdict"] == "NO_GO"
    assert tools["core_drill"]["verdict"] == "NO_GO"
    assert tools["gpr"]["verdict"] == "GO"
    assert card["verdict"] == "GO"  # el sitio toma el de la mejor herramienta
    lo, hi = tools["gpr"]["p_ice_90"]
    assert lo <= tools["gpr"]["p_ice"] <= hi


def test_replan_keeps_site_card():
    plan = client.post("/plan", json={}).json()
    meas = {**MEAS, "station_id": plan["stations"][0]["id"],
            "position": plan["stations"][0]["position"], "result": "no_ice"}
    replan = client.post("/replan", json={"plan_id": plan["plan_id"], "measurement": meas,
                                          "elapsed_min": 60}).json()
    jsonschema.validate(replan, PLAN_SCHEMA)
    assert replan["site_assessment"] == plan["site_assessment"]


def test_without_min_p_only_numbers():
    stm = copy.deepcopy(DEFAULT_STM)
    stm["constraints"].pop("site_min_p")
    card = site_card(stm)
    assert "verdict" not in card and "min_p" not in card
    assert all("verdict" not in t for t in card["tools"].values())


def test_site_card_is_not_shared_between_plans():
    a = site_card(DEFAULT_STM)
    a["tools"]["gpr"]["p_ice"] = -1
    assert site_card(DEFAULT_STM)["tools"]["gpr"]["p_ice"] > 0
