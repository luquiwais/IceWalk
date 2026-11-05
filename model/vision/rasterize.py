"""Catálogo de objetos -> capas de costo sobre la grilla común.

Visión mide; el planificador decide. Acá no hay umbrales de "celda prohibida": entregamos el
ancho del mejor pasillo y el planificador lo compara con el ancho mínimo, que es un supuesto suyo.

En las capas de bloques, 0 significa "nada detectado sobre detection_limit_m", no "terreno libre".
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from scipy import ndimage

from vision.grid import Grid

COST_LAYERS = (
    "boulder_max_diam_m",
    "boulder_max_height_m",
    "cfa_detected",
    "boulder_density",
    "boulder_unresolved_density",
    "clear_path_width_m",
)
FINE_CELL_M = 0.5  # A 1 m, un pasillo de ~1 m casi no se resuelve.


def is_unresolved(props: dict) -> bool:
    """Ausente en la última imagen: puede ser hielo sublimado o cubierto. Decide el planificador."""
    return props["persistence"] == "not_visible_latest"


def is_obstacle(props: dict) -> bool:
    """Tiene relieve y sigue visible. Las manchas (patch) no bloquean el paso."""
    return props["form"] != "patch" and not is_unresolved(props)


def _cell_of(x_m: float, y_m: float, grid: Grid) -> tuple[int, int] | None:
    col = int(np.floor((x_m - grid.xmin) / grid.cell_size_m))
    row = int(np.floor((grid.ymax - y_m) / grid.cell_size_m))
    if 0 <= row < grid.height and 0 <= col < grid.width:
        return row, col
    return None


def _crosses(passable: np.ndarray) -> bool:
    """¿Hay un camino de borde a borde opuesto, en alguno de los dos ejes?"""
    labels, n = ndimage.label(passable)
    if n == 0:
        return False
    pairs = (
        (labels[0, :], labels[-1, :]),
        (labels[:, 0], labels[:, -1]),
    )
    return any(bool(np.intersect1d(a[a > 0], b[b > 0]).size) for a, b in pairs)


def _widest_crossing(width_map: np.ndarray) -> float:
    """Mayor ancho w tal que los píxeles con ancho >= w conectan bordes opuestos."""
    candidates = np.unique(width_map)
    low, high = 0, len(candidates) - 1
    best = 0.0
    while low <= high:
        mid = (low + high) // 2
        width = float(candidates[mid])
        if width > 0 and _crosses(width_map >= width):
            best = width
            low = mid + 1
        else:
            high = mid - 1
    return best


def clear_path_width(obstacles: list[dict], grid: Grid, fine_m: float = FINE_CELL_M) -> np.ndarray:
    """Ancho del mejor pasillo que cruza cada celda, con tope en el tamaño de la celda.

    Un bloque de 3 m en una celda de 10 m deja unos 7 m libres. Es por qué no se prohíbe una celda
    por tener un bloque. Limitación: mira cada celda por separado y acepta cruzar en cualquiera de
    los dos ejes; la continuidad entre celdas la resuelve el A* del planificador.
    """
    cell = grid.cell_size_m
    widths = np.full((grid.height, grid.width), cell, dtype=np.float32)
    reach = cell / 2  # Con tope en `cell`, un obstáculo a más de cell/2 no cambia el ancho.

    by_cell: dict[tuple[int, int], list[tuple[float, float, float]]] = defaultdict(list)
    for props in obstacles:
        x, y, radius = props["x_m"], props["y_m"], props["diameter_m"] / 2
        span = radius + reach
        col_lo = int(np.floor((x - span - grid.xmin) / cell))
        col_hi = int(np.floor((x + span - grid.xmin) / cell))
        row_lo = int(np.floor((grid.ymax - y - span) / cell))
        row_hi = int(np.floor((grid.ymax - y + span) / cell))
        for row in range(max(row_lo, 0), min(row_hi, grid.height - 1) + 1):
            for col in range(max(col_lo, 0), min(col_hi, grid.width - 1) + 1):
                by_cell[(row, col)].append((x, y, radius))

    n_cell = round(cell / fine_m)
    n_pad = round(reach / fine_m)
    axis = (np.arange(n_cell + 2 * n_pad) + 0.5 - n_pad) * fine_m
    for (row, col), circles in by_cell.items():
        west = grid.xmin + col * cell
        north = grid.ymax - row * cell
        xx, yy = np.meshgrid(west + axis, north - axis)
        free = np.ones(xx.shape, dtype=bool)
        for x, y, radius in circles:
            free &= (xx - x) ** 2 + (yy - y) ** 2 > radius**2
        if free.all():
            continue
        clearance = ndimage.distance_transform_edt(free, sampling=fine_m)
        inner = clearance[n_pad:n_pad + n_cell, n_pad:n_pad + n_cell]
        widths[row, col] = min(_widest_crossing(2 * inner), cell)
    return widths


def rasterize_catalog(
    catalog: dict, grid: Grid, footprint: np.ndarray | None = None
) -> dict[str, np.ndarray]:
    """Devuelve las capas de costo. `footprint` (bool): True donde la imagen tiene cobertura."""
    shape = (grid.height, grid.width)
    max_diam = np.zeros(shape, dtype=np.float32)
    max_height = np.zeros(shape, dtype=np.float32)
    area_m2 = np.zeros(shape, dtype=np.float64)
    count = np.zeros(shape, dtype=np.int64)
    unresolved = np.zeros(shape, dtype=np.int64)
    obstacles = []

    for feature in catalog["features"]:
        props = feature["properties"]
        cell = _cell_of(props["x_m"], props["y_m"], grid)
        if is_unresolved(props) and cell is not None:
            unresolved[cell] += 1
        if not is_obstacle(props):
            continue
        obstacles.append(props)
        if cell is None:
            continue
        diameter = props["diameter_m"]
        max_diam[cell] = max(max_diam[cell], diameter)
        if props["height_m"] is not None:
            max_height[cell] = max(max_height[cell], props["height_m"])
        area_m2[cell] += np.pi * diameter**2 / 4
        count[cell] += 1

    cell_area_m2 = grid.cell_size_m**2
    per_km2 = 1e6 / cell_area_m2
    layers = {
        "boulder_max_diam_m": max_diam,
        "boulder_max_height_m": max_height,
        # Bloques superpuestos o más grandes que la celda no pueden pasar de 1.
        "cfa_detected": np.minimum(area_m2 / cell_area_m2, 1.0).astype(np.float32),
        "boulder_density": (count * per_km2).astype(np.float32),
        "boulder_unresolved_density": (unresolved * per_km2).astype(np.float32),
        "clear_path_width_m": clear_path_width(obstacles, grid),
    }
    if footprint is not None:
        if footprint.shape != shape:
            raise ValueError(f"footprint {footprint.shape} no coincide con la grilla {shape}")
        for layer in layers.values():
            layer[~footprint] = grid.nodata
    return layers


def write_cog(path: Path, array: np.ndarray, grid: Grid, tags: dict[str, str]) -> None:
    """Escribe un Cloud Optimized GeoTIFF float32 alineado a la grilla."""
    if array.shape != (grid.height, grid.width):
        raise ValueError(f"{path.name}: forma {array.shape} no coincide con la grilla")
    path.parent.mkdir(parents=True, exist_ok=True)
    with rasterio.open(
        path,
        "w",
        driver="COG",
        height=grid.height,
        width=grid.width,
        count=1,
        dtype="float32",
        crs=CRS.from_proj4(grid.proj4),
        transform=grid.transform,
        nodata=grid.nodata,
        compress="DEFLATE",
    ) as dst:
        dst.write(array.astype(np.float32), 1)
        dst.update_tags(**tags)
