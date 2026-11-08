"""DTM de HiRISE (1 m) -> capas del terreno en la grilla de 10 m.

Cada celda de 10 m guarda la elevación media, la pendiente máxima y media, y la rugosidad (desvío
respecto de un plano ajustado a la celda). La pendiente máxima decide la exclusión.

**Base de la pendiente: 10 m, no 2 m.** El PRD pide la pendiente máxima "desde el DTM de 1 m".
Medida a 2 m de base, el ruido del DTM la domina: con una precisión vertical de decenas de cm
(~0.2 m), el error de la pendiente es ~√2·0.2/2 ≈ 8°, y el máximo de 100 píxeles por celda supera
20° en la mitad del sitio, que es casi plano. A 10 m el error baja a ~1.6° y la exclusión queda en
el cráter, otros cráteres y relieve real (ver `docs/EXPERIMENTS.md`, 2026-11-08). Los escalones
cortos (bloques) llegan por la capa de pasillo de visión, no por la pendiente.

El DTM se lleva a la grilla con `vision.grid` (la función compartida de reproyección) y se
procesa por franjas para no cargar los ~76 millones de píxeles de 1 m a la vez.

Uso (desde apps/planner/): `python -m app.traverse.terrain` escribe
`data/processed/s1094b/terrain_*.tif`.
"""

from __future__ import annotations

import argparse
import warnings
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.vrt import WarpedVRT
from vision.grid import REPO_ROOT, Grid, load_grid
from vision.rasterize import write_cog

DTM = REPO_ROOT / "data" / "raw" / "DTEEC_073578_2155_073077_2155_A01.tif"
OUT_DIR = REPO_ROOT / "data" / "processed" / "s1094b"
FINE_M = 1.0
SLOPE_BASELINE_M = 10.0
MIN_VALID_FRACTION = 0.9  # Celdas con menos píxeles de 1 m válidos quedan sin dato.
LAYERS = (
    "terrain_elevation_m",
    "terrain_slope_max_deg",
    "terrain_slope_mean_deg",
    "terrain_roughness_m",
    "terrain_valid_fraction",
)
STRIP_CELLS = 64


def slope_deg(elevation: np.ndarray, res_m: float, offset_px: int) -> np.ndarray:
    """Pendiente en grados con diferencias centrales de base `2 * offset_px` píxeles.

    Devuelve un arreglo recortado `offset_px` en cada borde. NaN se propaga.
    """
    k = offset_px
    base = 2 * k * res_m
    d_col = (elevation[k:-k, 2 * k :] - elevation[k:-k, : -2 * k]) / base
    d_row = (elevation[2 * k :, k:-k] - elevation[: -2 * k, k:-k]) / base
    return np.degrees(np.arctan(np.hypot(d_row, d_col)))


def _plane_residual_projector(k: int) -> np.ndarray:
    """Matriz que quita a un bloque k×k (aplanado) su plano de mejor ajuste."""
    rows, cols = np.mgrid[0:k, 0:k]
    design = np.c_[np.ones(k * k), cols.ravel(), rows.ravel()].astype(float)
    return np.eye(k * k) - design @ np.linalg.pinv(design)


def reduce_cells(
    fine: np.ndarray, factor: int, res_m: float, offset_px: int
) -> dict[str, np.ndarray]:
    """Bloques `factor`×`factor` de un DTM fino -> capas por celda.

    `fine` lleva `offset_px` píxeles extra en cada borde, para la pendiente en el borde de la
    celda: forma `(h*factor + 2*offset_px, w*factor + 2*offset_px)`.
    """
    k = offset_px
    h = (fine.shape[0] - 2 * k) // factor
    w = (fine.shape[1] - 2 * k) // factor
    slope = slope_deg(fine, res_m, k)
    core = fine[k:-k, k:-k]

    def blocks(a: np.ndarray) -> np.ndarray:
        return a.reshape(h, factor, w, factor).swapaxes(1, 2).reshape(h, w, factor * factor)

    z = blocks(core)
    s = blocks(slope)
    valid = np.isfinite(z)
    frac = valid.mean(axis=2)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)  # bloques sin datos: NaN
        elevation = np.nanmean(z, axis=2)
        slope_max = np.nanmax(s, axis=2)
        slope_mean = np.nanmean(s, axis=2)
    # Rugosidad: solo en bloques completos (el plano ajustado necesita todos los píxeles).
    full = valid.all(axis=2)
    roughness = np.full((h, w), np.nan)
    if full.any():
        resid = z[full] @ _plane_residual_projector(factor).T
        roughness[full] = resid.std(axis=1)
    keep = frac >= MIN_VALID_FRACTION
    out = {
        "terrain_elevation_m": elevation,
        "terrain_slope_max_deg": slope_max,
        "terrain_slope_mean_deg": slope_mean,
        "terrain_roughness_m": roughness,
    }
    out = {name: np.where(keep, array, np.nan) for name, array in out.items()}
    out["terrain_valid_fraction"] = frac
    return out


def build(
    dtm_path: Path = DTM, grid: Grid | None = None, baseline_m: float = SLOPE_BASELINE_M
) -> dict[str, np.ndarray]:
    grid = grid or load_grid()
    factor = round(grid.cell_size_m / FINE_M)
    k = max(1, round(baseline_m / FINE_M / 2))
    out = {name: np.full((grid.height, grid.width), np.nan, dtype=np.float32) for name in LAYERS}
    with rasterio.open(dtm_path) as src:
        for r0 in range(0, grid.height, STRIP_CELLS):
            r1 = min(r0 + STRIP_CELLS, grid.height)
            with WarpedVRT(
                src,
                crs=CRS.from_proj4(grid.proj4),
                transform=Affine(
                    FINE_M, 0, grid.xmin - k * FINE_M,
                    0, -FINE_M, grid.ymax - r0 * grid.cell_size_m + k * FINE_M,
                ),
                width=grid.width * factor + 2 * k,
                height=(r1 - r0) * factor + 2 * k,
                resampling=Resampling.bilinear,
                src_nodata=src.nodata,
                nodata=np.nan,
            ) as vrt:
                fine = vrt.read(1).astype(float)
            fine[~np.isfinite(fine) | (fine < -1e30)] = np.nan
            strip = reduce_cells(fine, factor, FINE_M, k)
            for name in LAYERS:
                out[name][r0:r1] = strip[name]
    return out


def write(layers: dict[str, np.ndarray], grid: Grid, out_dir: Path = OUT_DIR) -> list[Path]:
    paths = []
    tags = {"source": DTM.name, "derived_by": "apps/planner app.traverse.terrain",
            "slope_baseline_m": str(SLOPE_BASELINE_M)}
    for name, array in layers.items():
        data = np.where(np.isfinite(array), array, grid.nodata)
        path = out_dir / f"{name}.tif"
        write_cog(path, data, grid, tags)
        paths.append(path)
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dtm", type=Path, default=DTM)
    parser.add_argument("--out", type=Path, default=OUT_DIR)
    args = parser.parse_args()
    grid = load_grid()
    layers = build(args.dtm, grid)
    for path in write(layers, grid, args.out):
        print("ok", path)


if __name__ == "__main__":
    main()
