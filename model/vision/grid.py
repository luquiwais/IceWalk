"""Lectura de contracts/grid.json y conversiones de coordenadas de la grilla."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

from rasterio.transform import Affine

REPO_ROOT = Path(__file__).resolve().parents[2]
GRID_PATH = REPO_ROOT / "contracts" / "grid.json"


@dataclass(frozen=True)
class Grid:
    site_id: str
    proj4: str
    radius_m: float
    lat0_deg: float
    lon0_deg: float
    xmin: float
    xmax: float
    ymin: float
    ymax: float
    cell_size_m: float
    nodata: float

    @property
    def width(self) -> int:
        return round((self.xmax - self.xmin) / self.cell_size_m)

    @property
    def height(self) -> int:
        return round((self.ymax - self.ymin) / self.cell_size_m)

    @property
    def transform(self) -> Affine:
        """Norte arriba: la fila 0 es el borde ymax."""
        return Affine(self.cell_size_m, 0, self.xmin, 0, -self.cell_size_m, self.ymax)

    def xy_to_lonlat(self, x_m: float, y_m: float) -> tuple[float, float]:
        """Metros de la grilla -> (lon este, lat) en grados."""
        lat = self.lat0_deg + math.degrees(y_m / self.radius_m)
        lon = self.lon0_deg + math.degrees(
            x_m / (self.radius_m * math.cos(math.radians(self.lat0_deg)))
        )
        return round(lon, 6), round(lat, 6)


def load_grid(path: Path = GRID_PATH) -> Grid:
    raw = json.loads(path.read_text(encoding="utf-8"))
    crs = raw["crs"]
    extent = raw["extent_m"]
    grid = Grid(
        site_id=raw["site_id"],
        proj4=crs["proj4"],
        radius_m=crs["sphere_radius_m"],
        lat0_deg=crs["center_lat_deg"],
        lon0_deg=crs["center_lon_east_deg"],
        xmin=extent["xmin"],
        xmax=extent["xmax"],
        ymin=extent["ymin"],
        ymax=extent["ymax"],
        cell_size_m=raw["cell_size_m"],
        nodata=raw["nodata"],
    )
    for span in (grid.xmax - grid.xmin, grid.ymax - grid.ymin):
        if span <= 0 or span % grid.cell_size_m:
            raise ValueError(f"Extensión de {path} no múltiplo de la celda: {span}")
    return grid
