"""Ventana de EVA: hora de Marte, DONKI, niveles y mejor hora de salida (sin red)."""

import json
from datetime import UTC, datetime, timedelta

import jsonschema
import pytest
from fastapi.testclient import TestClient

from app import donki, eva_window, marstime
from app.contracts import CONTRACTS
from app.main import app

SCHEMA = json.loads((CONTRACTS / "schemas" / "eva_window.schema.json").read_text())
DEMO = json.loads(donki.DEMO.read_text())
CLEAR = donki.SpaceWeather("live", "ok", [])
SITE_LON, SITE_LAT = eva_window.site()


def at_ltst(day: datetime, hour: float) -> datetime:
    return marstime.next_ltst(day, hour, SITE_LON, SITE_LAT)


# --- hora y Sol (Mars24) -------------------------------------------------------------------


def test_mars24_worked_example(monkeypatch):
    """Ejemplo resuelto de la página de Mars24: 2000-01-06 00:00 UTC, 0°W 0°N."""
    monkeypatch.setattr(marstime, "TT_MINUS_UTC_S", 64.184)  # TT - UTC en esa fecha
    r = marstime.mars_time(datetime(2000, 1, 6, tzinfo=UTC), 0.0, 0.0)
    assert r.ls_deg == pytest.approx(277.18758, abs=1e-4)
    assert r.mst_h == pytest.approx(23.99425, abs=1e-4)
    assert r.ltst_h == pytest.approx(23.64840, abs=1e-4)
    assert r.declination_deg == pytest.approx(-25.22825, abs=1e-4)
    assert r.sun_elevation_deg == pytest.approx(90 - 154.26182, abs=1e-4)
    assert r.sun_azimuth_deg == pytest.approx(191.03905, abs=1e-4)
    assert marstime.equation_of_time_from_ls(r.ls_deg) == pytest.approx(-5.18774, abs=0.01)


def test_next_ltst_and_daylight_at_the_site():
    day = datetime(2026, 11, 14, tzinfo=UTC)
    noon = at_ltst(day, 12.0)
    assert noon >= day
    assert marstime.mars_time(noon, SITE_LON, SITE_LAT).ltst_h == pytest.approx(12.0, abs=0.02)
    # Primavera del norte (Ls ~22°) a 35°N: Sol alto al mediodía, bajo el horizonte a medianoche.
    assert marstime.mars_time(noon, SITE_LON, SITE_LAT).sun_elevation_deg > 55
    assert marstime.mars_time(at_ltst(day, 0.0), SITE_LON, SITE_LAT).sun_elevation_deg < -30
    with pytest.raises(ValueError):
        marstime.j2000_tt_days(datetime(2026, 1, 1))  # sin zona horaria


# --- climatología y DONKI ------------------------------------------------------------------


def test_climatology_table():
    c = eva_window.climate()
    t = c["temperature_k"]
    assert len(t["p50"]) == 12 and all(len(row) == 24 for row in t["p50"])
    # Verano del norte (Ls 90-120) más cálido que el invierno (Ls 270-300) a las 14 h.
    assert t["p50"][3][14] > t["p50"][9][14] + 50
    assert all(t["p10"][s][h] <= t["p50"][s][h] <= t["p90"][s][h]
               for s in range(12) for h in range(24))
    assert max(max(row) for row in c["wind_mps"]["p95"]) < 25  # nunca llega al de saltación


def test_donki_parsing_groups_and_keeps_latest_run():
    seps = donki.parse_sep(DEMO["sep"])
    assert len(DEMO["sep"]) == 12 and len(seps) == 2  # varios instrumentos, dos fulguraciones
    assert seps[1].time == datetime(2023, 8, 7, 22, 9, tzinfo=UTC)
    arrivals = donki.parse_enlil(DEMO["enlil"])
    assert all(e.kind == "cme_arrival" for e in arrivals)
    assert len({e.detail for e in arrivals}) == len(arrivals)  # una por CME
    # Al planificar el 8 de agosto, las corridas posteriores todavía no existían.
    sw = donki.space_weather(donki.demo_time(), timedelta(days=3), demo=True)
    assert all(e.known <= donki.demo_time() for e in sw.events)
    assert len(sw.events) < len(seps) + len(arrivals)


def test_donki_unavailable_is_an_advisory(monkeypatch):
    def boom(*a, **k):
        raise OSError("no network")

    monkeypatch.setattr(donki, "_get", boom)
    sw = donki.space_weather(datetime(2026, 11, 14, tzinfo=UTC), timedelta(days=1))
    assert sw.status == "unavailable"
    m = eva_window.assess(datetime(2026, 11, 14, tzinfo=UTC), 0.5, sw)
    assert m.levels["space_weather"] == "advisory"


# --- niveles -------------------------------------------------------------------------------


def test_levels_by_factor():
    day = datetime(2026, 11, 14, tzinfo=UTC)
    night = eva_window.assess(at_ltst(day, 0.0), 0.5, CLEAR)
    assert night.levels["light"] == "warning" and night.level == "warning"
    noon = eva_window.assess(at_ltst(day, 13.0), 0.5, CLEAR)
    assert noon.level == "none" and noon.reasons == []
    assert eva_window.assess(at_ltst(day, 13.0), 1.5, CLEAR).levels["dust"] == "advisory"
    assert eva_window.assess(at_ltst(day, 13.0), 3.0, CLEAR).levels["dust"] == "caution"
    assert eva_window.assess(at_ltst(day, 13.0), 6.0, CLEAR).levels["dust"] == "warning"


def test_space_weather_levels():
    t = datetime(2026, 11, 14, 12, tzinfo=UTC)
    sep = donki.SolarEvent("sep", "S", t - timedelta(hours=10), "SEP", known=t)
    hit = donki.SolarEvent("cme_arrival", "C", t + timedelta(hours=6), "CME", known=t)
    graze = donki.SolarEvent("cme_arrival", "G", t - timedelta(hours=6), "CME", known=t,
                             glancing=True)
    cfg = eva_window.window_config()["space_weather"]

    def level(events, when=t):
        return eva_window._space_level(when, donki.SpaceWeather("live", "ok", events), cfg)[0]

    assert level([sep]) == "warning"
    assert level([sep], t + timedelta(hours=39)) == "none"  # pasaron las 48 h
    assert level([sep], t - timedelta(hours=11)) == "none"  # antes del evento
    assert level([hit]) == "caution"
    assert level([graze]) == "advisory"
    assert level([hit], t + timedelta(hours=19)) == "none"


# --- ventana -------------------------------------------------------------------------------


@pytest.fixture(scope="module")
def plan():
    return json.loads((CONTRACTS.parents[1] / "apps" / "web" / "mock" / "plan.json").read_text())


def test_demo_window_waits_for_the_particle_event_to_pass(plan):
    w = eva_window.eva_window(donki.demo_time(), plan["summary"]["duration_min"], demo=True,
                              plan=plan)
    jsonschema.validate(w, SCHEMA)
    assert w["mode"] == "demo" and len(w["hours"]) == 3 * 24
    assert all(h["levels"]["space_weather"] == "warning" for h in w["hours"]
               if h["sol"] == 0 and h["utc"] >= w["requested_utc"])
    rec = w["recommended"]
    assert rec["go"] and rec["sol"] >= 1
    assert rec["start_utc"] >= "2023-08-09T22:09:00Z"  # 48 h después del SEP
    # Toda la EVA de día y sin warnings.
    start, end = marstime.utc(rec["start_utc"]), marstime.utc(rec["end_utc"])
    assert end - start == timedelta(minutes=plan["summary"]["duration_min"])
    for h in w["hours"]:
        if start <= marstime.utc(h["utc"]) <= end:
            assert h["level"] != "warning"
    # Una entrada por estación, en orden y con su nivel.
    assert [s["station_id"] for s in w["stations"]] == [st["id"] for st in plan["stations"]]
    assert all(s["arrival_utc"] >= rec["start_utc"] for s in w["stations"])


def test_window_avoids_night_and_dust_storm_is_no_go():
    t0 = datetime(2026, 11, 14, 12, tzinfo=UTC)
    w = eva_window.eva_window(t0, 300, sw=CLEAR)
    rec = w["recommended"]
    assert rec["go"] and rec["level"] == "none" and rec["start_utc"] >= w["requested_utc"]
    noon = int(rec["start_ltst"][:2]) + 2.5
    assert 6 <= noon <= 18  # alrededor del día
    storm = eva_window.eva_window(t0, 300, dust_tau=6.0, sw=CLEAR)
    assert storm["recommended"]["go"] is False
    assert storm["dust"] == {"tau": 6.0, "reported": True}
    assert any("Dust" in r for r in storm["recommended"]["reasons"])
    assert w["dust"]["reported"] is False


# --- API -----------------------------------------------------------------------------------


def test_api_window_and_spaceweather(monkeypatch):
    def offline(*a, **k):
        raise OSError("no network in tests")

    monkeypatch.setattr(donki, "_get", offline)
    client = TestClient(app)
    plan = client.post("/plan", json={}).json()
    w = client.get("/eva-window", params={"plan_id": plan["plan_id"], "demo": True}).json()
    jsonschema.validate(w, SCHEMA)
    assert w["plan_id"] == plan["plan_id"] and len(w["stations"]) == len(plan["stations"])
    live = client.get("/eva-window", params={"date": "2026-11-14T12:00:00Z"}).json()
    jsonschema.validate(live, SCHEMA)
    assert live["space_weather"]["status"] == "unavailable"
    assert client.get("/eva-window", params={"plan_id": "nope"}).status_code == 404
    assert client.get("/eva-window", params={"date": "tomorrow"}).status_code == 422
    assert client.get("/eva-window", params={"dust_tau": -1}).status_code == 422

    sw = client.get("/spaceweather").json()
    assert sw["mode"] == "demo" and sw["alert"]["level"] == "warning"
    assert client.get("/spaceweather", params={"demo": False}).json()["status"] == "unavailable"
