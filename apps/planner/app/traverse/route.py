"""Grafo de caminata sobre la grilla de 10 m y rutas de menor tiempo.

Cada celda es un nodo unido a sus 8 vecinas. Una arista existe si las dos celdas son transitables
(DTM válido, pendiente máxima ≤ límite y, si hay capa de visión, pasillo ≥ ancho mínimo) y la
pendiente entre ellas no supera el límite. Su costo es el tiempo de caminata: distancia 3D sobre
la velocidad `V = V_llano - k·|θ|` (ICES-2025-129, ec. 2, con la velocidad en llano de la STM).

Se usa Dijkstra de uno a todos (scipy) en lugar de A*: da la misma ruta óptima y, de una vez, el
tiempo desde un punto a todas las celdas. Con eso salen las distancias a todas las estaciones
candidatas y el tiempo de regreso al hábitat desde cada punto. Toda la grilla tarda ~0.1 s.

Como la velocidad depende de |θ|, el grafo es simétrico: el tiempo de A a B es igual al de B a A,
y el campo desde el hábitat es también el tiempo de regreso.

Limitación: una ruta sobre 8 vecinos puede ser hasta ~8 % más larga que la recta en terreno
abierto (los giros van de a 45°).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
import rasterio
import scipy.sparse as sp
from scipy.sparse.csgraph import dijkstra
from vision.grid import Grid, load_grid

from .params import TraverseParams, default_params
from .terrain import OUT_DIR

_STEPS = ((0, 1), (1, 0), (1, 1), (1, -1))  # el grafo es simétrico: alcanza con la mitad


class NoRouteError(ValueError):
    """No hay camino transitable entre los dos puntos."""


@dataclass(frozen=True)
class Route:
    xy: list[tuple[float, float]]  # polilínea simplificada, metros de la grilla
    time_s: float
    distance_m: float  # sobre el terreno (3D)
    max_slope_deg: float


def _read(path: Path, grid: Grid) -> np.ndarray:
    with rasterio.open(path) as src:
        data = src.read(1).astype(float)
        if data.shape != (grid.height, grid.width):
            raise ValueError(f"{path.name}: forma {data.shape} no coincide con la grilla")
        nodata = src.nodata if src.nodata is not None else grid.nodata
    data[data == nodata] = np.nan
    return data


class TraverseMap:
    def __init__(
        self,
        grid: Grid,
        elevation_m: np.ndarray,
        slope_max_deg: np.ndarray,
        params: TraverseParams | None = None,
        clear_path_width_m: np.ndarray | None = None,
    ) -> None:
        self.grid = grid
        self.params = params or default_params()
        self.elevation = np.asarray(elevation_m, dtype=float)
        shape = (grid.height, grid.width)
        if self.elevation.shape != shape or np.shape(slope_max_deg) != shape:
            raise ValueError(f"Las capas no coinciden con la grilla {shape}")
        passable = np.isfinite(self.elevation) & (slope_max_deg <= self.params.max_slope_deg)
        self.uses_corridor = clear_path_width_m is not None
        if clear_path_width_m is not None:
            # Sin dato de visión (fuera de la imagen) no se prohíbe: manda la pendiente.
            width = np.asarray(clear_path_width_m, dtype=float)
            passable &= ~(np.isfinite(width) & (width < self.params.min_corridor_width_m))
        self.passable = passable
        self.graph = self._build_graph()
        self._fields: dict[int, tuple[np.ndarray, np.ndarray]] = {}

    @classmethod
    def from_processed(
        cls,
        directory: Path = OUT_DIR,
        grid: Grid | None = None,
        params: TraverseParams | None = None,
    ) -> TraverseMap:
        """Lee las capas de `app.traverse.terrain` y, si existe, la de pasillos de visión."""
        grid = grid or load_grid()
        corridor = directory / "clear_path_width_m.tif"
        return cls(
            grid,
            _read(directory / "terrain_elevation_m.tif", grid),
            _read(directory / "terrain_slope_max_deg.tif", grid),
            params,
            _read(corridor, grid) if corridor.exists() else None,
        )

    # --- celdas y coordenadas -------------------------------------------------------------

    def cell(self, x_m: float, y_m: float) -> int:
        g = self.grid
        col = math.floor((x_m - g.xmin) / g.cell_size_m)
        row = math.floor((g.ymax - y_m) / g.cell_size_m)
        if not (0 <= row < g.height and 0 <= col < g.width):
            raise ValueError(f"({x_m}, {y_m}) está fuera de la grilla")
        return row * g.width + col

    def xy(self, cell: int) -> tuple[float, float]:
        g = self.grid
        row, col = divmod(int(cell), g.width)
        return (
            float(g.xmin + (col + 0.5) * g.cell_size_m),
            float(g.ymax - (row + 0.5) * g.cell_size_m),
        )

    def snap(self, x_m: float, y_m: float, max_distance_m: float = 50.0) -> int:
        """Celda transitable más cercana al punto, dentro de `max_distance_m`."""
        cell = self.cell(x_m, y_m)
        if self.passable.flat[cell]:
            return cell
        g = self.grid
        row, col = divmod(cell, g.width)
        r = math.ceil(max_distance_m / g.cell_size_m)
        r0, r1 = max(0, row - r), min(g.height, row + r + 1)
        c0, c1 = max(0, col - r), min(g.width, col + r + 1)
        rows, cols = np.nonzero(self.passable[r0:r1, c0:c1])
        if rows.size == 0:
            raise NoRouteError(f"No hay celda transitable a menos de {max_distance_m} m")
        d = np.hypot(rows + r0 - row, cols + c0 - col) * g.cell_size_m
        best = int(np.argmin(d))
        if d[best] > max_distance_m:
            raise NoRouteError(f"No hay celda transitable a menos de {max_distance_m} m")
        return int((rows[best] + r0) * g.width + cols[best] + c0)

    # --- grafo ----------------------------------------------------------------------------

    def edge_speed_mps(self, slope_deg: np.ndarray) -> np.ndarray:
        p = self.params
        speed = p.flat_speed_mps - p.speed_slope_coeff_mps_per_deg * np.abs(slope_deg)
        return np.maximum(speed, p.min_speed_mps)

    def _build_graph(self) -> sp.csr_matrix:
        g = self.grid
        h, w = g.height, g.width
        idx = np.arange(h * w).reshape(h, w)
        z = self.elevation
        sources, targets, weights = [], [], []
        for dr, dc in _STEPS:
            rs, cs = slice(0, h - dr), slice(max(0, -dc), w - max(0, dc))
            rt, ct = slice(dr, h), slice(max(0, dc), w - max(0, -dc))
            ok = self.passable[rs, cs] & self.passable[rt, ct]
            horizontal = g.cell_size_m * math.hypot(dr, dc)
            with np.errstate(invalid="ignore"):
                dz = z[rt, ct] - z[rs, cs]
            slope = np.degrees(np.arctan(np.abs(dz) / horizontal))
            ok &= slope <= self.params.max_slope_deg
            time = np.hypot(horizontal, dz) / self.edge_speed_mps(slope)
            sources.append(idx[rs, cs][ok])
            targets.append(idx[rt, ct][ok])
            weights.append(time[ok])
        a, b, t = (np.concatenate(v) for v in (sources, targets, weights))
        n = h * w
        return sp.coo_matrix((np.r_[t, t], (np.r_[a, b], np.r_[b, a])), shape=(n, n)).tocsr()

    def field(self, cell: int) -> tuple[np.ndarray, np.ndarray]:
        """Tiempo (s) desde `cell` a cada celda (inf si no se llega) y predecesores."""
        if cell not in self._fields:
            if len(self._fields) > 32:
                self._fields.clear()
            times, pred = dijkstra(self.graph, indices=cell, return_predecessors=True)
            self._fields[cell] = (times, pred)
        return self._fields[cell]

    def time_from(self, x_m: float, y_m: float) -> np.ndarray:
        """Tiempo de caminata (s) desde el punto a cada celda, con forma de la grilla.

        El grafo es simétrico: desde el hábitat, es también el tiempo de regreso desde cada celda.
        """
        times, _ = self.field(self.snap(x_m, y_m))
        return times.reshape(self.grid.height, self.grid.width)

    def route(self, start: tuple[float, float], end: tuple[float, float]) -> Route:
        a, b = self.snap(*start), self.snap(*end)
        times, pred = self.field(a)
        if not np.isfinite(times[b]):
            raise NoRouteError(f"No hay ruta transitable de {start} a {end}")
        cells = [b]
        while cells[-1] != a:
            cells.append(int(pred[cells[-1]]))
        cells.reverse()
        pts = np.array([self.xy(c) for c in cells])
        z = self.elevation.flat[cells]
        horizontal = np.hypot(*np.diff(pts, axis=0).T) if len(cells) > 1 else np.zeros(0)
        dz = np.diff(z)
        slopes = np.degrees(np.arctan2(np.abs(dz), horizontal)) if len(cells) > 1 else [0.0]
        return Route(
            xy=_simplify([tuple(p) for p in pts]),
            time_s=float(times[b]),
            distance_m=float(np.hypot(horizontal, dz).sum()),
            max_slope_deg=float(np.max(slopes)),
        )


@lru_cache(maxsize=1)
def _processed_layers(directory: Path) -> tuple[Grid, np.ndarray, np.ndarray, np.ndarray | None]:
    grid = load_grid()
    corridor = directory / "clear_path_width_m.tif"
    return (
        grid,
        _read(directory / "terrain_elevation_m.tif", grid),
        _read(directory / "terrain_slope_max_deg.tif", grid),
        _read(corridor, grid) if corridor.exists() else None,
    )


@lru_cache(maxsize=4)
def cached_map(params: TraverseParams, directory: Path = OUT_DIR) -> TraverseMap:
    """Mapa de caminata con las capas procesadas, uno por juego de parámetros.

    Lanza `FileNotFoundError` si no se corrió `python -m app.traverse.terrain`.
    """
    if not (directory / "terrain_elevation_m.tif").exists():
        raise FileNotFoundError(f"Faltan las capas del terreno en {directory}")
    grid, elevation, slope, corridor = _processed_layers(directory)
    return TraverseMap(grid, elevation, slope, params, corridor)


def _simplify(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Quita los puntos intermedios de tramos rectos (misma dirección de paso)."""
    if len(points) <= 2:
        return points
    out = [points[0]]
    for prev, cur, nxt in zip(points, points[1:], points[2:], strict=False):
        d1 = (round(cur[0] - prev[0], 6), round(cur[1] - prev[1], 6))
        d2 = (round(nxt[0] - cur[0], 6), round(nxt[1] - cur[1], 6))
        if d1 != d2:
            out.append(cur)
    out.append(points[-1])
    return out
