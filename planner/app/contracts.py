"""Carga de contratos compartidos (grid, catálogo) y conversión de coordenadas."""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTRACTS = ROOT / "contracts"


@lru_cache
def grid() -> dict:
    return json.loads((CONTRACTS / "grid.json").read_text())


@lru_cache
def tool_catalog() -> list[dict]:
    return json.loads((CONTRACTS / "examples" / "tools.catalog.json").read_text())


def tools_by_id() -> dict[str, dict]:
    return {t["id"]: t for t in tool_catalog()}


def xy_to_lonlat(x: float, y: float) -> tuple[float, float]:
    """Metros de la grilla (desde el centro del sitio) -> (lon este, lat) en grados."""
    crs = grid()["crs"]
    r = crs["sphere_radius_m"]
    lat0 = crs["center_lat_deg"]
    lon0 = crs["center_lon_east_deg"]
    lat = lat0 + math.degrees(y / r)
    lon = lon0 + math.degrees(x / (r * math.cos(math.radians(lat0))))
    return round(lon, 6), round(lat, 6)
