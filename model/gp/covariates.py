"""Variables del terreno en la posición de cada cráter, para probar si predicen la profundidad.

Cada variable se mide alrededor del cráter y no sobre él: si mirara el propio cráter, la pendiente o
la textura "verían" el fondo plano y la prueba saldría inflada.

- Terreno (DTM de HiRISE): pendiente media, pendiente hacia el polo y rugosidad, en un anillo
  desde `D` hasta `D + 30 m` del centro.
- THEMIS: inercia térmica a 100 m. El mosaico es anterior al impacto de 2021.
- Distancia al cráter principal.
- Textura (opcional, grupo `ml`): DINOv2 sobre 4 recortes de 24.5 m a 30 m del centro, en el orto
  de feb 2022, resumidos con componentes principales.

Uso: `python -m gp.covariates` escribe `data/processed/s1094b/crater_covariates.csv`.
"""

from __future__ import annotations

import csv
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.vrt import WarpedVRT
from rasterio.warp import transform as warp

from gp.craters import DEFAULT_CATALOG, RAW, REPO_ROOT, CraterCatalog, load_catalog
from vision.grid import Grid, load_grid

DTM = RAW / "DTEEC_073578_2155_073077_2155_A01.tif"
ORTHO = RAW / "ESP_073077_2155_RED_A_01_ORTHO.JP2"
THEMIS_TI = (
    "/vsicurl/https://asc-astropedia.s3.us-west-2.amazonaws.com/Mars/Odyssey/"
    "THEMIS-Global-Thermal-Inertia-Mosaic/Quantitative-32-Bit/"
    "THEMIS_TI_Mosaic_Quant_30N180E_100mpp.cub"
)
OUTPUT = REPO_ROOT / "data" / "processed" / "s1094b" / "crater_covariates.csv"
RING_WIDTH_M = 30.0
TEXTURE_OFFSET_M = 30.0
TEXTURE_TILE_PX = 98  # 7 parches de 14 px de DINOv2; 24.5 m a 0.25 m/px
TEXTURE_COMPONENTS = 5


def _vrt(src, grid: Grid, res_m: float, x0: float, y0: float, width: int, height: int):
    return WarpedVRT(
        src,
        crs=CRS.from_proj4(grid.proj4),
        transform=Affine(res_m, 0, x0, 0, -res_m, y0),
        width=width,
        height=height,
        resampling=Resampling.bilinear,
    )


def sample_raster(path: str | Path, grid: Grid, x_m: np.ndarray, y_m: np.ndarray) -> np.ndarray:
    """Valor de la primera banda en cada punto (vecino más cercano). Sin dato: NaN."""
    env = {"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".cub"}
    with rasterio.Env(**env), rasterio.open(path) as src:
        xs, ys = warp(
            CRS.from_proj4(grid.proj4), src.crs, list(map(float, x_m)), list(map(float, y_m))
        )
        values = np.array([v[0] for v in src.sample(zip(xs, ys, strict=True))], dtype=float)
        bad = ~np.isfinite(values)
        if src.nodata is not None:
            bad |= np.isclose(values, src.nodata) | (values < -1e30)
    values[bad] = np.nan
    return values


def ring_terrain(
    elevation: np.ndarray, res_m: float, inner_m: float, outer_m: float
) -> tuple[float, float, float]:
    """Pendiente media (grados), pendiente hacia el polo (tangente) y rugosidad (m) en un anillo.

    `elevation` es una ventana centrada en el cráter, con norte arriba (fila 0 al norte). La
    pendiente hacia el polo es positiva si el terreno baja hacia el norte. La rugosidad es el
    desvío del terreno respecto de un plano ajustado al anillo.
    """
    size = elevation.shape[0]
    half = (size - 1) / 2
    rows, cols = np.mgrid[0:size, 0:size]
    distance = np.hypot(rows - half, cols - half) * res_m
    ring = (distance >= inner_m) & (distance <= outer_m) & np.isfinite(elevation)
    if ring.sum() < 20:
        return np.nan, np.nan, np.nan
    d_row, d_col = np.gradient(elevation, res_m)
    slope = np.degrees(np.arctan(np.hypot(d_row, d_col)))
    # Fila hacia abajo = sur: d_row > 0 significa que sube hacia el sur, es decir, baja al norte.
    pole = d_row
    east = cols[ring] * res_m
    north = -rows[ring] * res_m
    design = np.c_[np.ones(ring.sum()), east, north]
    coef = np.linalg.lstsq(design, elevation[ring], rcond=None)[0]
    roughness = float(np.std(elevation[ring] - design @ coef))
    return float(np.nanmean(slope[ring])), float(np.nanmean(pole[ring])), roughness


def terrain_covariates(
    catalog: CraterCatalog, grid: Grid, dtm_path: Path = DTM, res_m: float = 1.0
) -> dict[str, np.ndarray]:
    out = {
        name: np.full(len(catalog), np.nan) for name in ("slope_deg", "pole_slope", "roughness_m")
    }
    with rasterio.open(dtm_path) as src:
        nodata = src.nodata
        for i in range(len(catalog)):
            inner = max(float(catalog.diameter_m[i]), 10.0)
            outer = inner + RING_WIDTH_M
            half_px = int(np.ceil(outer / res_m)) + 2
            size = 2 * half_px + 1
            x0 = catalog.x_m[i] - (half_px + 0.5) * res_m
            y0 = catalog.y_m[i] + (half_px + 0.5) * res_m
            with _vrt(src, grid, res_m, x0, y0, size, size) as vrt:
                window = vrt.read(1).astype(float)
            window[(window < -1e30) | (nodata is not None and np.isclose(window, nodata))] = np.nan
            values = ring_terrain(window, res_m, inner, outer)
            for name, value in zip(out, values, strict=True):
                out[name][i] = value
    return out


def texture_embeddings(catalog: CraterCatalog, grid: Grid, ortho_path: Path = ORTHO) -> np.ndarray:
    """Promedio de embeddings de DINOv2 (ViT-S/14) de 4 recortes alrededor de cada cráter."""
    import timm
    import torch

    model = timm.create_model(
        "vit_small_patch14_dinov2.lvd142m",
        pretrained=True,
        num_classes=0,
        img_size=TEXTURE_TILE_PX,
    ).eval()
    res = 0.25
    half = TEXTURE_TILE_PX * res / 2
    with rasterio.open(ortho_path) as src:
        overview = src.read(1, out_shape=(src.height // 32, src.width // 32)).astype(float)
        lo, hi = np.percentile(overview[overview > 0], [1, 99])
        tiles, owners = [], []
        for i in range(len(catalog)):
            for dx, dy in (
                (TEXTURE_OFFSET_M, 0),
                (-TEXTURE_OFFSET_M, 0),
                (0, TEXTURE_OFFSET_M),
                (0, -TEXTURE_OFFSET_M),
            ):
                cx, cy = catalog.x_m[i] + dx, catalog.y_m[i] + dy
                with _vrt(
                    src, grid, res, cx - half, cy + half, TEXTURE_TILE_PX, TEXTURE_TILE_PX
                ) as vrt:
                    tile = vrt.read(1).astype(float)
                if (tile > 0).mean() < 0.9:
                    continue
                tiles.append(np.clip((tile - lo) / (hi - lo), 0, 1))
                owners.append(i)
    mean, std = np.array([0.485, 0.456, 0.406]), np.array([0.229, 0.224, 0.225])
    batch = (np.stack(tiles)[:, None, :, :].repeat(3, axis=1) - mean[:, None, None]) / std[
        :, None, None
    ]
    features = []
    with torch.no_grad():
        for start in range(0, len(batch), 64):
            chunk = torch.tensor(batch[start : start + 64], dtype=torch.float32)
            features.append(model(chunk).numpy())
    features = np.concatenate(features)
    owners = np.array(owners)
    embeddings = np.full((len(catalog), features.shape[1]), np.nan)
    for i in range(len(catalog)):
        mine = owners == i
        if mine.any():
            embeddings[i] = features[mine].mean(axis=0)
    return embeddings


def principal_components(matrix: np.ndarray, n: int) -> np.ndarray:
    """Primeras `n` componentes principales de las filas completas; NaN donde falta la fila."""
    out = np.full((matrix.shape[0], n), np.nan)
    rows = np.isfinite(matrix).all(axis=1)
    centered = matrix[rows] - matrix[rows].mean(axis=0)
    _, _, vt = np.linalg.svd(centered, full_matrices=False)
    out[rows] = centered @ vt[:n].T
    return out


def compute_all(
    catalog: CraterCatalog, grid: Grid, with_texture: bool = True
) -> dict[str, np.ndarray]:
    covariates = {"dist_primary_m": np.hypot(catalog.x_m, catalog.y_m)}
    covariates.update(terrain_covariates(catalog, grid))
    covariates["themis_ti"] = sample_raster(THEMIS_TI, grid, catalog.x_m, catalog.y_m)
    if with_texture:
        components = principal_components(texture_embeddings(catalog, grid), TEXTURE_COMPONENTS)
        for k in range(TEXTURE_COMPONENTS):
            covariates[f"texture_pc{k + 1}"] = components[:, k]
    return covariates


def write_covariates(covariates: dict[str, np.ndarray], path: Path = OUTPUT) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    names = list(covariates)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(names)
        for row in zip(*(covariates[n] for n in names), strict=True):
            writer.writerow([f"{v:.6g}" for v in row])


def read_covariates(path: Path = OUTPUT) -> dict[str, np.ndarray]:
    with path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    return {name: np.array([float(r[name]) for r in rows]) for name in rows[0]}


if __name__ == "__main__":
    import sys

    result = compute_all(
        load_catalog(DEFAULT_CATALOG), load_grid(), with_texture="--no-texture" not in sys.argv
    )
    write_covariates(result)
    for name, values in result.items():
        finite = values[np.isfinite(values)]
        print(f"{name:16s} n={finite.size:3d} mediana {np.median(finite):.3g}")
