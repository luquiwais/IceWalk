"""Tarjeta de sitio (`site_assessment` del plan): ¿vale ir, y con qué herramienta?

Nivel región de la decisión de los tres niveles (DECISIONS 2026-11-10): P(hielo al alcance) por
herramienta con el prior regional por latitud (`gp.regional.site_assessment`). No usa los cráteres
del sitio ni las mediciones: es lo que se sabe antes de bajar. El umbral para el veredicto lo
declara la STM (`constraints.site_min_p`, supuesto; cuestión 58 y docs/SOURCES.md).
"""

from __future__ import annotations

import copy
from functools import lru_cache
from typing import Any

from gp.regional import site_assessment

from .contracts import grid, tool_catalog


def _round(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, 4)
    if isinstance(value, list):
        return [_round(v) for v in value]
    if isinstance(value, dict):
        return {k: _round(v) for k, v in value.items()}
    return value


def subsurface_tools() -> dict[str, float]:
    """Herramientas del catálogo que miden bajo la superficie, con su alcance en metros."""
    tools = ((t["id"], float(t.get("depth_m") or 0)) for t in tool_catalog())
    return {tool_id: depth for tool_id, depth in tools if depth > 0}


@lru_cache(maxsize=8)
def _card(lat_deg: float, min_p: float | None) -> dict[str, Any]:
    return _round(site_assessment(lat_deg, subsurface_tools(), min_p=min_p))


def site_card(stm: dict) -> dict[str, Any]:
    """Tarjeta del sitio de la grilla, con el `site_min_p` de la STM si lo trae."""
    min_p = stm.get("constraints", {}).get("site_min_p")
    lat = float(grid()["crs"]["center_lat_deg"])
    # Copia profunda: la caché no se comparte entre planes que después se modifiquen.
    return copy.deepcopy(_card(lat, None if min_p is None else float(min_p)))
