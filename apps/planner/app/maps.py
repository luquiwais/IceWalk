"""Mapas de hielo para la web (`GET /maps`, `map.schema.json`): el GP de Luqui servido por la API.

Todo el cálculo es de `gp.maps` (`ice_maps`, `update_window`, `map_payload`); acá se elige la
ventana, se cachea y se ponen las lon/lat (`docs/plans/planner.md`, "Mapas de hielo").

Ventana: el hábitat ± `map_half_m` (`config/eva.yaml`), ampliada si alguna estación, opción de un
punto de decisión o medición del plan queda a menos de `map_margin_m` del borde, alineada a las
celdas de 10 m de `grid.json` y recortada al sitio. Lo alcanzable a pie en una EVA de 8 h es casi
todo el sitio (~590 000 celdas, ~6.5 s y ~1.5 MB): no se manda entero, se manda lo que el plan usa.

Caché: el mapa base (cráteres y prior) por umbral, cráteres y ventana; el de cada plan, con sus
mediciones aplicadas con `update_window` alrededor de cada una, lo guarda quien llama.
"""

from __future__ import annotations

import math
import threading
from collections import OrderedDict
from collections.abc import Iterable
from functools import lru_cache
from pathlib import Path

import yaml
from gp.maps import IceMaps, MapGrid, ice_maps, map_payload, update_window

from .contracts import grid, xy_to_lonlat
from .ice import IceModel

CONFIG = Path(__file__).resolve().parents[1] / "config" / "eva.yaml"
BASE_CACHE_SIZE = 8

_BASE: OrderedDict[tuple, IceMaps] = OrderedDict()
_LOCK = threading.Lock()


@lru_cache
def map_config(path: Path = CONFIG) -> tuple[float, float]:
    """(map_half_m, map_margin_m) de `config/eva.yaml`."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return float(raw["map_half_m"]["value"]), float(raw["map_margin_m"]["value"])


def site_grid() -> MapGrid:
    return MapGrid.from_grid_json(grid())


def map_window(
    habitat_xy: tuple[float, float],
    points: Iterable[tuple[float, float]] = (),
    half_m: float | None = None,
    margin_m: float | None = None,
    site: MapGrid | None = None,
) -> MapGrid:
    """Caja con el hábitat ± `half_m` y cada punto ± `margin_m`, sobre las celdas del sitio."""
    cfg_half, cfg_margin = map_config()
    half = cfg_half if half_m is None else half_m
    margin = cfg_margin if margin_m is None else margin_m
    site = site or site_grid()
    hx, hy = habitat_xy
    x0, x1, y0, y1 = hx - half, hx + half, hy - half, hy + half
    for px, py in points:
        x0, x1 = min(x0, px - margin), max(x1, px + margin)
        y0, y1 = min(y0, py - margin), max(y1, py + margin)
    c = site.cell_m
    # Bordes sobre las celdas del sitio, para que cada celda del mapa sea una del terreno.
    x0 = site.xmin + math.floor((x0 - site.xmin) / c) * c
    x1 = site.xmin + math.ceil((x1 - site.xmin) / c) * c
    y1 = site.ymax - math.floor((site.ymax - y1) / c) * c
    y0 = site.ymax - math.ceil((site.ymax - y0) / c) * c
    x0, x1 = max(x0, site.xmin), min(x1, site.xmin + site.width * c)
    y0, y1 = max(y0, site.ymax - site.height * c), min(y1, site.ymax)
    return MapGrid(x0, x1, y0, y1, c)


def base_maps(base: IceModel, window: MapGrid) -> IceMaps:
    """Probabilidad e incertidumbre con cráteres y prior en la ventana; se calcula una vez."""
    key = (base.threshold_m, base.craters, window)
    with _LOCK:
        if key in _BASE:
            _BASE.move_to_end(key)
            return _BASE[key]
    maps = ice_maps(base.post, window, base.threshold_m)
    with _LOCK:
        _BASE[key] = maps
        while len(_BASE) > BASE_CACHE_SIZE:
            _BASE.popitem(last=False)
    return maps


def plan_points(plan: dict, measurements: list[dict]) -> list[tuple[float, float]]:
    """Posiciones que el mapa del plan tiene que mostrar: estaciones, opciones y mediciones."""
    pts = [tuple(s["position"]) for s in plan.get("stations", [])]
    for dp in plan.get("decision_points") or []:
        for opt in dp["options"]:
            pts += [tuple(s["position"]) for s in opt.get("next_stations", [])]
    pts += [tuple(m["position"]) for m in measurements if m.get("position")]
    return pts


def payload(
    maps: IceMaps, model: IceModel, plan_id: str | None = None, measurements_in_model: int = 0
) -> dict:
    """La respuesta de `GET /maps`, con las lon/lat de las esquinas."""
    g = maps.grid
    west, south = xy_to_lonlat(g.xmin, g.ymax - g.height * g.cell_m)
    east, north = xy_to_lonlat(g.xmin + g.width * g.cell_m, g.ymax)
    notes = None
    if model.craters == 0:
        notes = "Crater catalog not loaded: the map is the prior plus any measurements."
    return map_payload(
        maps,
        site_id=grid()["site_id"],
        bounds_lonlat={"west": west, "south": south, "east": east, "north": north},
        plan_id=plan_id,
        craters_in_model=model.craters,
        measurements_in_model=measurements_in_model,
        notes=notes,
    )


def ice_map(
    base: IceModel,
    habitat_xy: tuple[float, float],
    model: IceModel | None = None,
    points: list[tuple[float, float]] | None = None,
    measured: list[tuple[float, float]] | None = None,
    plan_id: str | None = None,
) -> dict:
    """Mapa base (sin `model`) o el de un plan: `model` con sus mediciones, en `measured`."""
    window = map_window(habitat_xy, points or ())
    maps = base_maps(base, window)
    measured = measured or []
    if model is not None and measured:
        maps = update_window(maps, model.post, measured)
    return payload(maps, model or base, plan_id, len(measured))
