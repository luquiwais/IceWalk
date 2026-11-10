"""Genera packages/contracts/examples/map.example.json con datos sintéticos.

Usa el prior ajustado de S1094b y tres observaciones inventadas (no la tabla de Dundas, cuya
licencia no está confirmada). Es el ejemplo del contrato `map.schema.json`, no un mapa real.

Uso (desde la raíz del repo): python packages/model/scripts/export_map_example.py
"""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "packages" / "model"))

from gp.maps import MapGrid, ice_maps, map_payload  # noqa: E402
from gp.observations import deeper_than, flat_floor_crater, radar_reflector  # noqa: E402
from gp.planning import fitted_prior  # noqa: E402
from gp.posterior import posterior  # noqa: E402

GRID = json.loads((ROOT / "packages" / "contracts" / "grid.json").read_text())
HABITAT = (300.0, -2200.0)  # apps/planner/config/eva.yaml
THRESHOLD_M = 3.0


def xy_to_lonlat(x: float, y: float) -> tuple[float, float]:
    """Misma fórmula que apps/planner/app/contracts.py:xy_to_lonlat."""
    crs = GRID["crs"]
    r, lat0, lon0 = crs["sphere_radius_m"], crs["center_lat_deg"], crs["center_lon_east_deg"]
    lat = lat0 + math.degrees(y / r)
    lon = lon0 + math.degrees(x / (r * math.cos(math.radians(lat0))))
    return round(lon, 6), round(lat, 6)


def main() -> None:
    hx, hy = HABITAT
    obs = [
        flat_floor_crater(hx + 150, hy + 200, 0.8),
        deeper_than(hx - 250, hy - 100, 4.0, "non_flat_crater"),
        radar_reflector(hx + 50, hy - 300, 1.2),
    ]
    grid = MapGrid.around(hx, hy, 500.0, 25.0)
    maps = ice_maps(posterior(fitted_prior(), obs), grid, THRESHOLD_M)
    west, south = xy_to_lonlat(grid.xmin, grid.ymin)
    east, north = xy_to_lonlat(grid.xmax, grid.ymax)
    example = map_payload(
        maps,
        site_id=GRID["site_id"],
        bounds_lonlat={"west": west, "south": south, "east": east, "north": north},
        craters_in_model=2,
        measurements_in_model=1,
        is_mock=True,
        notes="Synthetic example: fitted S1094b prior plus three invented observations.",
    )
    out = ROOT / "packages" / "contracts" / "examples" / "map.example.json"
    out.write_text(json.dumps(example, indent=2) + "\n")
    print("ok", out.relative_to(ROOT), f"{grid.width}x{grid.height}")


if __name__ == "__main__":
    main()
