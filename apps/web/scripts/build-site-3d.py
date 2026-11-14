"""Datos de la vista 3D del sitio: relieve del DTM de HiRISE y bloques reales.

Escribe en `apps/web/public/site/`:

- `s1094b-dtm-{overview,detail}.bin`: alturas en uint16 (cm sobre `z_min_m`), filas de norte a
  sur, a 6 m (vista del sitio, con el cráter) y a 2 m (caminata).
- `s1094b-3d.json`: por nivel, caja en metros de la grilla, tamaño, escala y los bloques de visión
  dentro de la caja (`x`, `y`, diámetro, altura, forma, confianza).

Las texturas son las imágenes de `build-site-imagery.py` con las mismas cajas (orto de 1.5 m y de
25 cm).

Fuentes: DTM controlado DTEEC_073578_2155_073077_2155_A01 (copia de USGS, CC0;
NASA/JPL-Caltech/UArizona) en `data/raw/`; catálogo `data/processed/s1094b/boulders.geojson`
(visión, Release `vision-s1094b-2026-11-13`).

Uso (desde la raíz, con el entorno del planificador):
  apps/planner/.venv/Scripts/python.exe apps/web/scripts/build-site-3d.py
"""

import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.vrt import WarpedVRT

ROOT = Path(__file__).resolve().parents[3]
DTM = ROOT / "data" / "raw" / "DTEEC_073578_2155_073077_2155_A01.tif"
BOULDERS = ROOT / "data" / "processed" / "s1094b" / "boulders.geojson"
SITE = ROOT / "apps" / "web" / "public" / "site"


LEVELS = {"overview": 6.0, "detail": 2.0}  # paso del relieve por nivel [m]


def build(level: str, step_m: float, meta: dict, features: list[dict]) -> dict:
    box = meta["images"][level]["box_m"]
    crs = CRS.from_proj4(meta["grid_crs"])
    w = round((box["xmax"] - box["xmin"]) / step_m)
    h = round((box["ymax"] - box["ymin"]) / step_m)
    with rasterio.open(DTM) as src, WarpedVRT(
        src, crs=crs, transform=Affine(step_m, 0, box["xmin"], 0, -step_m, box["ymax"]),
        width=w, height=h, resampling=Resampling.bilinear,
    ) as vrt:
        z = vrt.read(1, masked=True).astype(float).filled(np.nan)
    z[z < -1e4] = np.nan
    valid = float(np.isfinite(z).mean())
    z = np.where(np.isfinite(z), z, np.nanmedian(z))  # fuera de la huella: plano a la mediana
    z_min = float(np.floor(z.min()))
    cm = np.round((z - z_min) * 100).astype(np.uint16)
    name = f"s1094b-dtm-{level}.bin"
    (SITE / name).write_bytes(cm.tobytes())
    boulders = []
    for f in features:
        p = f["properties"]
        if box["xmin"] <= p["x_m"] <= box["xmax"] and box["ymin"] <= p["y_m"] <= box["ymax"]:
            boulders.append([round(p["x_m"], 1), round(p["y_m"], 1), round(p["diameter_m"], 2),
                             round(p["height_m"] or 0.5, 2), p["form"][0],
                             round(p["confidence"], 2)])
    print(f"ok {level}: {w}x{h} a {step_m} m, relieve {z.max() - z_min:.1f} m, "
          f"{valid:.0%} con DTM, {len(boulders)} bloques, {cm.nbytes / 1e3:.0f} kB")
    return {"box_m": box, "step_m": step_m, "size": [w, h], "z_min_m": z_min, "z_scale_m": 0.01,
            "z_range_m": round(float(z.max() - z_min), 2), "dtm_valid_fraction": round(valid, 3),
            "heightmap": f"/site/{name}", "texture": meta["images"][level]["file"],
            "boulders": boulders}


def main() -> None:
    meta = json.loads((SITE / "s1094b.json").read_text(encoding="utf-8"))
    features = json.loads(BOULDERS.read_text(encoding="utf-8"))["features"]
    out = {
        "site_id": meta["site_id"],
        "levels": {lv: build(lv, step, meta, features) for lv, step in LEVELS.items()},
        "boulders_fields": ["x_m", "y_m", "diameter_m", "height_m", "form (b/i)", "confidence"],
        "credit": "HiRISE DTM DTEEC_073578_2155_073077_2155_A01 and orthos ESP_073578_2155 · "
                  "NASA/JPL-Caltech/UArizona · USGS Astrogeology (CC0). Boulders: IceWalk vision "
                  "(shadow detector, ESP_073578_2155 + ESP_073077_2155).",
    }
    (SITE / "s1094b-3d.json").write_text(json.dumps(out, separators=(",", ":")) + "\n",
                                         encoding="utf-8")


if __name__ == "__main__":
    main()
