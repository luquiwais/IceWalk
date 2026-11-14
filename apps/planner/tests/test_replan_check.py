"""Evaluación del re-plan: qué cambió y cuándo recomendar volver al hábitat."""

from app import replan_check

STM = {"constraints": {"walkback_caution_min": 15}}


def plan(ids, margin=30.0, alerts=()):
    return {"plan_id": "plan-a", "summary": {"min_walkback_margin_min": margin},
            "stations": [{"id": i, "order": k + 1} for k, i in enumerate(ids)],
            "alerts": list(alerts)}


def meas(sid="A", result="no_ice"):
    return {"station_id": sid, "result": result}


def test_small_change_continues():
    r = replan_check.assess(plan(["A", "B", "C", "D"]), plan(["B", "C", "D"]), meas(), STM)
    assert r["recommendation"] == "continue"
    assert r["stations_kept"] == ["B", "C", "D"] and not r["stations_added"]
    assert r["changed_fraction"] == 0 and not r["objective_met"]


def test_big_change_low_margin_or_warning_returns():
    old = plan(["A", "B", "C", "D"])
    big = replan_check.assess(old, plan(["X", "Y", "Z"]), meas(), STM)
    assert big["recommendation"] == "return_to_habitat"
    assert big["stations_dropped"] == ["B", "C", "D"] and big["changed_fraction"] == 1.0
    low = replan_check.assess(old, plan(["B", "C"], margin=8), meas(), STM)
    assert low["recommendation"] == "return_to_habitat" and "caution" in low["reasons"][0]
    warn = replan_check.assess(old, plan(["B", "C", "D"], alerts=[
        {"level": "warning", "message": "SEP in progress"}]), meas(), STM)
    assert warn["recommendation"] == "return_to_habitat"
    empty = replan_check.assess(old, plan([]), meas(), STM)
    assert empty["recommendation"] == "return_to_habitat"


def test_ice_marks_objective_met_and_unknown_station_compares_all():
    r = replan_check.assess(plan(["A", "B"]), plan(["A", "B"]), meas("Q", "ice"), STM)
    assert r["objective_met"] and r["stations_kept"] == ["A", "B"]
    assert r["recommendation"] == "continue"
