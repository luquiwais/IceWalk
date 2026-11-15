"""Wide HiRISE image for the 2D map: the whole ESP_073578_2155 RED ortho strip at 2.5 m/px.

The overview image (1.5 m) covers 3.6 x 4.2 km and also textures the 3D view, so it stays as it
is. This adds the full strip of the same observation (6.6 x 11.6 km in the site grid) so zooming
out on the 2D map shows sharp HiRISE terrain instead of the 100 m THEMIS context. Same stretch as
the overview, so the two blend without a jump in brightness.

Writes `apps/web/public/site/s1094b-wide.webp` and adds `images.wide` to `s1094b.json`.
Run after build-site-imagery.py, from the repo root:
  uv run --with rasterio --with pillow --with numpy python apps/web/scripts/build-site-wide.py
"""

import importlib.util
import json
from pathlib import Path

import rasterio

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("imagery", HERE / "build-site-imagery.py")
imagery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(imagery)

PRODUCT = "ESP_073578_2155_RED_C_01_ORTHO"
BOX = (-3300.0, -6700.0, 3300.0, 4800.0)  # the ortho's extent in the site grid, rounded inward
M_PER_PX = 2.5
QUALITY = 50


def main():
    meta_path = imagery.OUT / "s1094b.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    st = meta["stretch"]
    with rasterio.Env(**imagery.GDAL_ENV):
        data, valid = imagery.read_grid(PRODUCT, BOX, M_PER_PX)
    path = imagery.OUT / "s1094b-wide.webp"
    imagery.to_image(data, valid, st["dn_low"], st["dn_high"]).save(path, "WEBP", quality=QUALITY, method=6)
    xmin, ymin, xmax, ymax = BOX
    meta["images"]["wide"] = {
        "file": f"/site/{path.name}", "product": PRODUCT,
        "box_m": {"xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax}, "m_per_px": M_PER_PX,
        "width_px": int(data.shape[1]), "height_px": int(data.shape[0]),
        "valid_fraction": round(float(valid.mean()), 4), "bytes": path.stat().st_size,
    }
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.name}: {data.shape[1]}x{data.shape[0]} px, valid {valid.mean():.0%}, {path.stat().st_size / 1024:.0f} kB")


if __name__ == "__main__":
    main()
