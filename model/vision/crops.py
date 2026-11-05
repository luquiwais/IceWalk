"""Recortes de imágenes HiRISE alrededor del cráter, todos en la misma grilla.

Cada imagen viene en su propia proyección y escala. Para comparar fechas hay que llevarlas al mismo
marco: origen en el cráter, proyección de contracts/grid.json y una escala común.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.vrt import WarpedVRT

from vision.grid import Grid

DEFAULT_HALF_M = 750.0  # Recorte de ~1.5 km: cubre el km² mapeado por Tusberti et al.
DEFAULT_RES_M = 0.5  # La escala de la imagen más gruesa (abril de 2024).


def crop_around_crater(
    path: Path, grid: Grid, half_m: float = DEFAULT_HALF_M, res_m: float = DEFAULT_RES_M
) -> np.ndarray:
    """Primera banda, con norte arriba y el cráter en el centro. 0 = sin dato.

    Conserva el tipo original: los ortos son de 8 bits y los RDR RED, de 16. No los compares ni
    conviertas sin normalizar.
    """
    size = round(2 * half_m / res_m)
    with rasterio.open(path) as src:
        if src.crs is None:
            raise ValueError(f"{Path(path).name} no tiene proyección")
        with WarpedVRT(
            src,
            crs=CRS.from_proj4(grid.proj4),
            transform=Affine(res_m, 0, -half_m, 0, -res_m, half_m),
            width=size,
            height=size,
            resampling=Resampling.bilinear,
            src_nodata=0,
            nodata=0,
        ) as vrt:
            return vrt.read(1)
