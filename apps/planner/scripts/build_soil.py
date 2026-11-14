"""Capa de firmeza del suelo: inercia térmica de THEMIS sobre la grilla del sitio.

La inercia térmica (J m⁻² K⁻¹ s⁻½) se relaciona con el tamaño de grano, la cohesión y la
densidad del suelo: el polvo suelto da valores bajos y la roca, el suelo cementado o el hielo
cerca de la superficie, altos. Los sitios de aterrizaje de MER y MSL descartaron las superficies
dominadas por polvo (inercia < ~100) por no ser seguras para aterrizar ni para circular
(Golombek et al. 2003 y 2005; Fergason et al. 2012). `app/feasibility.py` la usa para el costo
de caminar y para sugerir un rover.

Lee a distancia solo la ventana del sitio del mosaico cuantitativo de THEMIS a 100 m (tesela
30N180E, Fergason et al. 2006, dominio público; anterior al impacto de 2021), reproyectada a la
grilla, y la repite a 10 m. Escribe `data/processed/s1094b/soil_thermal_inertia.tif`.

Uso (desde apps/planner/): python scripts/build_soil.py
"""

import math
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.vrt import WarpedVRT

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vision.grid import load_grid  # noqa: E402
from vision.rasterize import write_cog  # noqa: E402

from app.traverse.terrain import OUT_DIR  # noqa: E402

THEMIS_TI = ("/vsicurl/https://asc-astropedia.s3.us-west-2.amazonaws.com/Mars/Odyssey/"
             "THEMIS-Global-Thermal-Inertia-Mosaic/Quantitative-32-Bit/"
             "THEMIS_TI_Mosaic_Quant_30N180E_100mpp.cub")
RES_M = 100.0
OUT = OUT_DIR / "soil_thermal_inertia.tif"


def main() -> None:
    grid = load_grid()
    step = round(RES_M / grid.cell_size_m)
    w, h = math.ceil(grid.width / step), math.ceil(grid.height / step)
    env = {"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".cub"}
    with rasterio.Env(**env), rasterio.open(THEMIS_TI) as src, WarpedVRT(
        src, crs=CRS.from_proj4(grid.proj4),
        transform=Affine(RES_M, 0, grid.xmin, 0, -RES_M, grid.ymax),
        width=w, height=h, resampling=Resampling.bilinear,
    ) as vrt:
        coarse = vrt.read(1).astype(float)
        nodata = src.nodata
    bad = ~np.isfinite(coarse) | (coarse <= 0) | (coarse > 5000)
    if nodata is not None:
        bad |= np.isclose(coarse, nodata)
    coarse[bad] = np.nan
    fine = np.repeat(np.repeat(coarse, step, axis=0), step, axis=1)[: grid.height, : grid.width]
    data = np.where(np.isfinite(fine), fine, grid.nodata).astype("float32")
    write_cog(OUT, data, grid, {"source": "THEMIS TI mosaic 30N180E 100 m (Fergason et al. 2006)",
                                "derived_by": "apps/planner scripts/build_soil.py",
                                "units": "J m-2 K-1 s-1/2"})
    ok = coarse[np.isfinite(coarse)]
    print(f"ok {OUT.name}: {ok.size} celdas de 100 m, inercia {ok.min():.0f}-{ok.max():.0f} "
          f"(mediana {np.median(ok):.0f}); < 100: {(ok < 100).mean():.1%}")


if __name__ == "__main__":
    main()
