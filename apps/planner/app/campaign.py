"""Campaña de varias EVAs: P(hielo confirmado) tras 1..N EVAs, perforando a ciegas o radar primero.

Usa la simulación de `gp/tool_strategy.py` (prior de S1094b, mezcla exacta del reflector falso del
radar, 6 estaciones por EVA; `docs/EXPERIMENTS.md`, "Radar primero, taladro después"). Cada EVA se
supone independiente: P(confirmado tras k) = 1 - (1 - p_eva)^k. Los parámetros del radar y los
sondeos por EVA son supuestos documentados (`docs/SOURCES.md`).
"""

from __future__ import annotations

from functools import lru_cache

from gp.tool_strategy import radar_then_drill

SOUNDINGS = (50, 20)  # sondeos independientes por EVA: el supuesto base y el pesimista


@lru_cache(maxsize=16)
def curves(drill_m: float = 1.0, evas: int = 6) -> dict:
    blind = radar_then_drill(drill_m=drill_m, flag_m=drill_m, soundings=SOUNDINGS[0])
    p_blind = blind.p_eva(blind.p_blind)
    series = [{"strategy": "blind_drill", "label": "Drill without radar",
               "p_eva": round(p_blind, 3), "evas_to_confirm": round(1 / p_blind, 2)}]
    for n in SOUNDINGS:
        r = radar_then_drill(drill_m=drill_m, flag_m=drill_m, soundings=n)
        p = r.p_eva_guided()
        series.append({"strategy": f"radar_first_{n}", "label": f"Radar first, {n} soundings/EVA",
                       "p_eva": round(p, 3), "evas_to_confirm": round(1 / p, 2)})
    ks = list(range(1, evas + 1))
    for s in series:
        s["p_confirmed"] = [round(1 - (1 - s["p_eva"]) ** k, 3) for k in ks]
    return {
        "site": "S1094b",
        "drill_m": drill_m,
        "stations_per_eva": blind.stations,
        "evas": ks,
        "series": series,
        "speedup": round(series[0]["evas_to_confirm"] / series[1]["evas_to_confirm"], 1),
        "is_assumption": True,
        "source": "Monte Carlo, gp/tool_strategy.py; EVAs assumed independent",
    }
