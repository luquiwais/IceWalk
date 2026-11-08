"""Catálogo de cráteres de Dundas et al. 2023: profundidad a la capa resistente y observaciones.

La tabla del suplemento trae `X, Y` en píxeles de `ESP_073077_2155_RED.JP2`, y diámetros en metros
del cráter y de su fondo plano (`-1`: sin capa resistente). Este módulo la lleva a la grilla del
sitio y la convierte en observaciones del GP.

Valores:
- `K_RIM = 0.86` y la forma de `resistant_depth`: inferidos porque reproducen las estadísticas del
  paper (0.969 ± 0.254 m y 0.151 m por píxel). No se contrastaron con Bart 2014.
- `REPOSE_DEG = 33`: Dundas et al. 2023, citando a Shaw et al. 2009.

Uso, para regenerar el catálogo en la grilla (necesita la imagen RED y el orto en `data/raw/`):
    python -m gp.craters
"""

from __future__ import annotations

import csv
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from gp.observations import NON_FLAT_RATIO, Observation, deeper_than, flat_floor_crater

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW = REPO_ROOT / "data" / "raw"
DEFAULT_CATALOG = REPO_ROOT / "data" / "processed" / "s1094b" / "craters_dundas2023.csv"
K_RIM = 0.86
REPOSE_DEG = 33.0
PIXEL_M = 0.25


@dataclass(frozen=True)
class CraterCatalog:
    """Cráteres en metros de la grilla. `floor_m <= 0` significa sin fondo plano."""

    x_m: np.ndarray
    y_m: np.ndarray
    diameter_m: np.ndarray
    floor_m: np.ndarray

    def __post_init__(self) -> None:
        sizes = {a.shape for a in (self.x_m, self.y_m, self.diameter_m, self.floor_m)}
        if len(sizes) != 1 or self.x_m.ndim != 1:
            raise ValueError("Las columnas del catálogo deben ser vectores del mismo largo")
        if not all(np.isfinite(a).all() for a in (self.x_m, self.y_m, self.diameter_m)):
            raise ValueError("Posición y diámetro deben ser finitos")
        if (self.diameter_m <= 0).any():
            raise ValueError("Hay diámetros no positivos")
        if (self.floor_m >= self.diameter_m).any():
            raise ValueError("Hay un fondo plano igual o mayor que el cráter")

    def __len__(self) -> int:
        return self.x_m.size

    @property
    def flat(self) -> np.ndarray:
        return self.floor_m > 0


def resistant_depth(
    diameter_m: np.ndarray, floor_m: np.ndarray, k: float = K_RIM, repose_deg: float = REPOSE_DEG
) -> np.ndarray:
    """Profundidad a la capa resistente con fondo plano: (k D - Df) / 2 · tan(reposo)."""
    return (
        (k * np.asarray(diameter_m) - np.asarray(floor_m)) / 2 * math.tan(math.radians(repose_deg))
    )


def load_catalog(path: Path = DEFAULT_CATALOG) -> CraterCatalog:
    """Lee el catálogo ya llevado a la grilla (columnas `x_m, y_m, d_crater_m, d_resistant_m`)."""
    with Path(path).open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise ValueError(f"{path} no tiene filas")

    def column(name: str) -> np.ndarray:
        return np.array([float(r[name]) for r in rows])

    return CraterCatalog(
        column("x_m"), column("y_m"), column("d_crater_m"), column("d_resistant_m")
    )


def to_observations(catalog: CraterCatalog, ratio: float = NON_FLAT_RATIO) -> list[Observation]:
    """Fondo plano: profundidad medida. Sin fondo plano: `d > ratio · D`."""
    depth = resistant_depth(catalog.diameter_m, np.maximum(catalog.floor_m, 0))
    observations = []
    for i in range(len(catalog)):
        x, y = float(catalog.x_m[i]), float(catalog.y_m[i])
        if catalog.flat[i]:
            if depth[i] <= 0:
                raise ValueError(f"Cráter {i}: profundidad no positiva con fondo plano")
            observations.append(flat_floor_crater(x, y, float(depth[i])))
        else:
            observations.append(
                deeper_than(x, y, ratio * float(catalog.diameter_m[i]), "non_flat_crater")
            )
    return observations


def fit_linear_shift(
    x_m: np.ndarray, y_m: np.ndarray, shift_x_m: np.ndarray, shift_y_m: np.ndarray
) -> tuple[np.ndarray, np.ndarray, float]:
    """Ajusta el corrimiento como función lineal de la posición: a + b·x + c·y, por eje.

    Devuelve los coeficientes de x, los de y y el residuo cuadrático medio, en metros.
    """
    design = np.c_[np.ones(len(x_m)), x_m, y_m]
    coef_x = np.linalg.lstsq(design, shift_x_m, rcond=None)[0]
    coef_y = np.linalg.lstsq(design, shift_y_m, rcond=None)[0]
    residual = np.r_[shift_x_m - design @ coef_x, shift_y_m - design @ coef_y]
    return coef_x, coef_y, float(np.sqrt(np.mean(residual**2)))


def apply_shift(
    coef_x: np.ndarray, coef_y: np.ndarray, x_m: np.ndarray, y_m: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    design = np.c_[np.ones(len(x_m)), x_m, y_m]
    return x_m + design @ coef_x, y_m + design @ coef_y


def red_table_to_grid(
    table_path: Path = RAW / "dundas2023_craters.csv",
    red_path: Path = RAW / "ESP_073077_2155_RED.JP2",
    ortho_path: Path = RAW / "ESP_073077_2155_RED_A_01_ORTHO.JP2",
) -> tuple[CraterCatalog, float]:
    """Lleva la tabla del suplemento a la grilla, corrigiendo el corrimiento RED-orto.

    El corrimiento se mide con correlación en 12 recortes a lo largo de la franja y se ajusta
    lineal. Devuelve el catálogo y el residuo del ajuste. Comprobación visual: ver EXPERIMENTS.md.
    """
    import rasterio
    from rasterio.crs import CRS
    from rasterio.enums import Resampling
    from rasterio.transform import Affine
    from rasterio.vrt import WarpedVRT
    from rasterio.warp import transform as warp

    from vision.coregister import align
    from vision.grid import load_grid

    grid = load_grid()
    crs_grid = CRS.from_proj4(grid.proj4)
    with Path(table_path).open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    px = np.array([float(r["X"]) for r in rows])
    py = np.array([float(r["Y"]) for r in rows])
    diameter = np.array([float(r["D_crater"]) for r in rows])
    floor = np.array([float(r["D_resistant"]) for r in rows])

    with rasterio.open(red_path) as src:
        centers = [src.transform * (a + 0.5, b + 0.5) for a, b in zip(px, py, strict=True)]
        gx, gy = warp(src.crs, crs_grid, [c[0] for c in centers], [c[1] for c in centers])
    gx, gy = np.asarray(gx), np.asarray(gy)

    def crop(path: Path, cx: float, cy: float, half: float = 600.0, res: float = 0.5):
        size = round(2 * half / res)
        transform = Affine(res, 0, cx - half, 0, -res, cy + half)
        with (
            rasterio.open(path) as src,
            WarpedVRT(
                src,
                crs=crs_grid,
                transform=transform,
                width=size,
                height=size,
                resampling=Resampling.bilinear,
                src_nodata=0,
                nodata=0,
            ) as vrt,
        ):
            return vrt.read(1).astype(float)

    samples = []
    for cy in (4000, 2000, 0, -2000, -4000, -6000):
        for cx in (-1200, 300):
            ortho, red = crop(ortho_path, cx, cy), crop(red_path, cx, cy)
            if min((ortho > 0).mean(), (red > 0).mean()) < 0.6:
                continue
            reference = ortho / np.median(ortho[ortho > 0])
            moving = red / np.median(red[red > 0])
            _, shift = align(reference, moving)
            samples.append((cx, cy, shift.col_px * 0.5, -shift.row_px * 0.5))
    if len(samples) < 3:
        raise ValueError("No hay recortes suficientes para medir el corrimiento")
    s = np.array(samples)
    coef_x, coef_y, residual = fit_linear_shift(s[:, 0], s[:, 1], s[:, 2], s[:, 3])
    fx, fy = apply_shift(coef_x, coef_y, gx, gy)
    return CraterCatalog(fx, fy, diameter, floor), residual


def write_catalog(catalog: CraterCatalog, path: Path = DEFAULT_CATALOG) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["x_m", "y_m", "d_crater_m", "d_resistant_m"])
        for row in zip(
            np.round(catalog.x_m, 1),
            np.round(catalog.y_m, 1),
            catalog.diameter_m,
            catalog.floor_m,
            strict=True,
        ):
            writer.writerow(row)


if __name__ == "__main__":
    built, rms = red_table_to_grid()
    write_catalog(built)
    print(f"{len(built)} cráteres, {built.flat.sum()} con fondo plano; residuo {rms:.2f} m")
