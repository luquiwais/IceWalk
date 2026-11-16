"""Regional context image for SiteScene: THEMIS daytime IR (100 m) around the site.

The HiRISE images cover only 3.6 x 4.2 km; outside them the 2D map was black. This builds a
20 x 20 km grayscale context image from NASA Mars Trek's THEMIS Day IR controlled mosaic
(Edwards et al. 2011, 100 m/px), reprojected to the site grid, so zooming out still shows the
real terrain. HiRISE stays on top where it exists.

Writes `apps/web/public/site/s1094b-context.webp` and adds `images.context` to `s1094b.json`.
Run from the repo root (needs numpy and Pillow):
  uv run --with numpy --with pillow python apps/web/scripts/build-site-context.py
"""

import io
import json
import math
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
GRID = json.loads((ROOT / "packages/contracts/grid.json").read_text(encoding="utf-8"))
SITE = ROOT / "apps/web/public/site"
TILE = ("https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/"
        "1.0.0/default/default028mm/{z}/{y}/{x}.png")
CREDIT = "THEMIS Day IR controlled mosaic, 100 m (NASA/JPL-Caltech/ASU, via NASA Mars Trek)"
ZOOM = 9  # 2^(z+1) x 2^z tiles of 512 px over the globe: ~40 m/px, above THEMIS's 100 m
BOX = (-9700.0, -12200.0, 10300.0, 7800.0)  # 20 x 20 km in grid meters, around the habitat
M_PER_PX = 25.0


def tile(z, y, x):
    with urllib.request.urlopen(TILE.format(z=z, y=y, x=x), timeout=30) as r:
        return np.asarray(Image.open(io.BytesIO(r.read())).convert("L"), np.float32)


def main():
    crs = GRID["crs"]
    R = crs["sphere_radius_m"]
    lat0 = math.radians(crs["center_lat_deg"])
    lon0 = (crs["center_lon_east_deg"] + 180.0) % 360.0 - 180.0
    xmin, ymin, xmax, ymax = BOX
    w, h = round((xmax - xmin) / M_PER_PX), round((ymax - ymin) / M_PER_PX)
    xs = xmin + (np.arange(w) + 0.5) * M_PER_PX
    ys = ymax - (np.arange(h) + 0.5) * M_PER_PX
    gx, gy = np.meshgrid(xs, ys)
    # Inverse equirectangular of the grid (lat_ts = lat_0 = site latitude).
    lon = lon0 + np.degrees(gx / (R * math.cos(lat0)))
    lat = math.degrees(lat0) + np.degrees(gy / R)
    cols, rows = 2 ** (ZOOM + 1), 2 ** ZOOM
    fx = (lon + 180.0) / 360.0 * cols
    fy = (90.0 - lat) / 180.0 * rows
    tx0, tx1 = int(fx.min()), int(fx.max())
    ty0, ty1 = int(fy.min()), int(fy.max())
    tiles = {(ty, tx): tile(ZOOM, ty, tx) for ty in range(ty0, ty1 + 1) for tx in range(tx0, tx1 + 1)}
    size = next(iter(tiles.values())).shape[0]
    mosaic = np.zeros(((ty1 - ty0 + 1) * size, (tx1 - tx0 + 1) * size), np.float32)
    for (ty, tx), a in tiles.items():
        mosaic[(ty - ty0) * size:(ty - ty0 + 1) * size, (tx - tx0) * size:(tx - tx0 + 1) * size] = a
    px = (fx - tx0) * size - 0.5
    py = (fy - ty0) * size - 0.5
    x0, y0 = np.floor(px).astype(int), np.floor(py).astype(int)
    ax, ay = px - x0, py - y0
    x0 = np.clip(x0, 0, mosaic.shape[1] - 2)
    y0 = np.clip(y0, 0, mosaic.shape[0] - 2)
    out = (mosaic[y0, x0] * (1 - ax) * (1 - ay) + mosaic[y0, x0 + 1] * ax * (1 - ay)
           + mosaic[y0 + 1, x0] * (1 - ax) * ay + mosaic[y0 + 1, x0 + 1] * ax * ay)
    lo, hi = np.percentile(out, [1, 99])
    img = np.clip((out - lo) / max(hi - lo, 1e-6), 0, 1)
    path = SITE / "s1094b-context.webp"
    Image.fromarray((img * 255).astype(np.uint8), "L").save(path, "WEBP", quality=70, method=6)
    meta_path = SITE / "s1094b.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta["images"]["context"] = {
        "file": "/site/s1094b-context.webp", "product": "THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018",
        "box_m": {"xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax}, "m_per_px": M_PER_PX,
        "width_px": w, "height_px": h, "credit": CREDIT, "bytes": path.stat().st_size,
    }
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.name}: {w}x{h} px, {len(tiles)} tiles, {path.stat().st_size / 1024:.0f} kB")


if __name__ == "__main__":
    main()
