"""Qué cambió con un re-plan y si conviene seguir o volver al hábitat.

Compara las estaciones que faltaban en el plan anterior con las del nuevo, el margen de regreso
antes y después, y las alertas del plan nuevo. Recomienda `return_to_habitat` (en la interfaz,
"EVA TERMINATE": vuelta ordenada, nunca ABORT; xEVA Con Ops 9.3) cuando:

- no queda ninguna estación alcanzable con margen de regreso;
- el margen nuevo queda bajo el umbral de caution de la STM (empezar el walkback);
- el plan nuevo trae una alerta de nivel warning (por ejemplo, un evento de partículas de DONKI).

Si cambió más de la fracción configurada de las estaciones (`config/eva.yaml`, supuesto), no manda
a volver: NASA no termina una EVA por un replan grande, lo decide el IV (Get Aheads, tareas borradas
por prioridad; el replan grande va entre EVAs). Marca `iv_decision`.

Si la medición encontró hielo, lo marca como objetivo cumplido (informativo: el resto de las
estaciones sirve para acotar su extensión). La decisión final es de la tripulación.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

CONFIG = Path(__file__).resolve().parents[1] / "config" / "eva.yaml"


@lru_cache
def return_fraction(path: Path = CONFIG) -> float:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return float(raw["replan_return_changed_fraction"]["value"])


def _remaining(previous: dict, station_id: str) -> list[str]:
    stations = previous.get("stations", [])
    hit = next((s for s in stations if s["id"] == station_id), None)
    if hit is None:
        return [s["id"] for s in stations]
    return [s["id"] for s in stations if s["order"] > hit["order"]]


def assess(previous: dict, new: dict, measurement: dict, stm: dict,
           changed_limit: float | None = None) -> dict:
    """Bloque `replan` del plan nuevo (`plan.schema.json`)."""
    limit = return_fraction() if changed_limit is None else changed_limit
    caution = float(stm["constraints"].get("walkback_caution_min", 0.0))
    sid = measurement["station_id"]
    old = _remaining(previous, sid)
    new_ids = [s["id"] for s in new.get("stations", [])]
    kept = [i for i in new_ids if i in old]
    added = [i for i in new_ids if i not in old]
    dropped = [i for i in old if i not in new_ids]
    union = len(set(old) | set(new_ids))
    changed = (len(added) + len(dropped)) / union if union else 0.0
    before = previous["summary"].get("min_walkback_margin_min")
    after = new["summary"].get("min_walkback_margin_min")

    reasons: list[str] = []
    if not new_ids:
        reasons.append("No station is left within the walkback limit.")
    if new_ids and after is not None and after < caution:
        reasons.append(f"Walkback margin drops to {after:.0f} min, below the {caution:g} min "
                       "caution limit: begin the walkback.")
    reasons.extend(f"Warning: {a['message']}" for a in new.get("alerts", [])
                   if a.get("level") == "warning")
    recommendation = "return_to_habitat" if reasons else "continue"
    iv_decision = bool(old and new_ids and changed > limit)
    if iv_decision:
        reasons.append(f"Large replan: {len(added) + len(dropped)} station changes ({changed:.0%} "
                       f"of the plan, above {limit:.0%}). IV decision before going on.")
    objective_met = measurement.get("result") == "ice"
    if objective_met:
        reasons.append(f"Ice found at {sid}: primary objective met. The remaining stations bound "
                       "its extent.")
    if recommendation == "continue" and not objective_met and not iv_decision:
        reasons.append("Changes are within the briefed plan and the walkback margin holds.")
    return {
        "from_plan_id": previous.get("plan_id"),
        "trigger": {"station_id": sid, "result": measurement.get("result")},
        "stations_kept": kept,
        "stations_added": added,
        "stations_dropped": dropped,
        "changed_fraction": round(changed, 3),
        "changed_fraction_limit": limit,
        "margin_before_min": before,
        "margin_after_min": after,
        "objective_met": objective_met,
        "iv_decision": iv_decision,
        "recommendation": recommendation,
        "reasons": reasons,
        "is_assumption": True,
    }
