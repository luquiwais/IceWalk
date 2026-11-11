"""Clima espacial de DONKI (NASA CCMC) para la ventana de EVA.

API sin key en `https://ccmc.gsfc.nasa.gov/DONKI-API/get/` (DECISIONS 2026-10-28). Se usan dos
fuentes:

- `SEP`: eventos de partículas solares. Los detectan instrumentos cerca de la Tierra (GOES, SOHO,
  STEREO); que lleguen a Marte depende de la conexión magnética, así que se toman como aviso para
  todo el sistema solar interior (supuesto conservador, PRD: «un aviso de evento de partículas
  dispara volver al hábitat»).
- `WSAEnlilSimulations`: el modelo WSA-Enlil predice cuándo llega cada eyección de masa coronal
  (CME) a Marte (`impactList`, `location: Mars`). Se toma la corrida más nueva de cada CME.

Modo demo: el evento de agosto de 2023 guardado en `data/donki_demo_2023-08.json`, sin red.
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

from .marstime import utc

BASE = "https://ccmc.gsfc.nasa.gov/DONKI-API/get"
DEMO = Path(__file__).resolve().parents[1] / "data" / "donki_demo_2023-08.json"
TIMEOUT_S = 10
CACHE_S = 15 * 60
SEP_LOOKBACK_D = 3
ENLIL_LOOKBACK_D = 7

_CACHE: dict[tuple, tuple[float, object]] = {}


@dataclass(frozen=True)
class SolarEvent:
    kind: str  # "sep" (partículas, desde `time`) o "cme_arrival" (llegada prevista a Marte)
    id: str
    time: datetime
    detail: str
    known: datetime  # cuándo se publicó: al planificar solo cuenta lo ya publicado
    glancing: bool = False  # solo CME: roce o impacto menor según WSA-Enlil
    link: str | None = None


@dataclass
class SpaceWeather:
    mode: str  # "live" o "demo"
    status: str  # "ok" o "unavailable"
    events: list[SolarEvent] = field(default_factory=list)
    note: str | None = None


def _get(endpoint: str, start: datetime, end: datetime) -> list:
    q = urllib.parse.urlencode({"startDate": start.date().isoformat(),
                                "endDate": end.date().isoformat()})
    key = (endpoint, q)
    hit = _CACHE.get(key)
    if hit and time.monotonic() - hit[0] < CACHE_S:
        return hit[1]  # type: ignore[return-value]
    with urllib.request.urlopen(f"{BASE}/{endpoint}?{q}", timeout=TIMEOUT_S) as r:
        body = r.read()
    data = json.loads(body) if body.strip() else []
    _CACHE[key] = (time.monotonic(), data)
    return data


def parse_sep(raw: list[dict]) -> list[SolarEvent]:
    """Un evento por fulguración/CME de origen: varios instrumentos reportan el mismo."""
    groups: dict[str, list[dict]] = {}
    for e in raw:
        linked = [x["activityID"] for x in (e.get("linkedEvents") or [])]
        groups.setdefault(linked[0] if linked else e["sepID"], []).append(e)
    out = []
    for origin, evs in groups.items():
        first = min(evs, key=lambda e: e["eventTime"])
        instruments = sorted({i["displayName"] for e in evs for i in (e.get("instruments") or [])})
        out.append(SolarEvent("sep", first["sepID"], utc(first["eventTime"]),
                              f"Solar energetic particle event linked to {origin}; "
                              f"detected by {', '.join(instruments[:3])}",
                              known=utc(first["eventTime"]), link=first.get("link")))
    return sorted(out, key=lambda e: e.time)


def parse_enlil(raw: list[dict]) -> list[SolarEvent]:
    """Llegadas previstas a Marte, con la corrida más nueva de cada CME."""
    latest: dict[str, tuple[str, dict, dict]] = {}
    for sim in raw:
        for imp in sim.get("impactList") or []:
            if imp.get("location") != "Mars":
                continue
            cme = ",".join(sorted(c["cmeStartTime"] for c in sim.get("cmeInputs") or []))
            if cme not in latest or sim["modelCompletionTime"] > latest[cme][0]:
                latest[cme] = (sim["modelCompletionTime"], sim, imp)
    out = []
    for cme, (_, sim, imp) in latest.items():
        glancing = bool(imp.get("isGlancingBlow") or imp.get("isMinorImpact"))
        kind = "glancing blow" if imp.get("isGlancingBlow") else (
            "minor impact" if imp.get("isMinorImpact") else "impact")
        out.append(SolarEvent("cme_arrival", sim["simulationID"], utc(imp["arrivalTime"]),
                              f"CME ({cme or 'unlisted'}) predicted at Mars by WSA-Enlil: {kind}",
                              known=utc(sim["modelCompletionTime"]), glancing=glancing,
                              link=sim.get("link")))
    return sorted(out, key=lambda e: e.time)


def demo_time() -> datetime:
    return utc(json.loads(DEMO.read_text())["demo_utc"])


def space_weather(t0: datetime, horizon: timedelta, demo: bool = False) -> SpaceWeather:
    """Eventos ya publicados en `t0` que pueden afectar la EVA hasta `t0 + horizon`."""
    if demo:
        raw = json.loads(DEMO.read_text())
        events = parse_sep(raw["sep"]) + parse_enlil(raw["enlil"])
        return SpaceWeather("demo", "ok", [e for e in events if e.known <= t0],
                            note="Historical DONKI events (August 2023) replayed for the demo, "
                                 "as known at the planning time.")
    try:
        sep = _get("SEP", t0 - timedelta(days=SEP_LOOKBACK_D), t0 + horizon)
        enlil = _get("WSAEnlilSimulations", t0 - timedelta(days=ENLIL_LOOKBACK_D), t0)
    except (OSError, ValueError) as exc:  # sin red, timeout o respuesta rota
        return SpaceWeather("live", "unavailable", note=f"DONKI unavailable: {exc}")
    events = [e for e in parse_sep(sep) + parse_enlil(enlil) if e.known <= t0]
    return SpaceWeather("live", "ok", events)
