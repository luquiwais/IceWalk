"""Build the site imagery for SiteScene from the public HiRISE orthoimages.

Reads windows of the USGS Cloud Optimized GeoTIFF copies over /vsicurl/ (the
files are never downloaded whole), reprojects them to the site grid
(packages/contracts/grid.json), stretches the contrast and writes:

    apps/web/public/site/s1094b-overview.webp   RED_C (1.06 m/px) at 1.5 m/px
    apps/web/public/site/s1094b-detail.webp     RED_A (0.27 m/px) at 0.25 m/px
    apps/web/public/site/s1094b.json            boxes, m/px, product, credit, registration

Usage, from the repo root:

    uv run --with rasterio --with pillow --with numpy python apps/web/scripts/build-site-imagery.py

Spec: docs/plans/web-design.md, "Imágenes". Source: USGS Astrogeology ARD
(CC0); HiRISE credit NASA/JPL-Caltech/UArizona.

Why reproject and not crop: the orthos are equirectangular with lat_ts=0 and
R=3396190, the grid uses lat_ts=35.1105 and R=3389574.349. A crop keeps the
source pixels, which are ~22 % too wide in x for the grid, and puts the crater
~150 m off. Both CRS are spheres for the same body with planetocentric
latitude, so PROJ goes through lon/lat without a datum shift.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.crs import CRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject, transform_bounds
from rasterio.windows import Window, from_bounds

ROOT = Path(__file__).resolve().parents[3]
GRID = json.loads((ROOT / "packages/contracts/grid.json").read_text())
OUT = ROOT / "apps/web/public/site"

BASE = (
    "https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/"
    "ESP_073578_2155_ESP_073077_2155/"
)
CREDIT = "HiRISE ESP_073578_2155 · NASA/JPL-Caltech/UArizona"

# Boxes in grid meters (xmin, ymin, xmax, ymax) and output m/px, from the plan.
ASSETS = {
    "overview": {
        "product": "ESP_073578_2155_RED_C_01_ORTHO",
        "box": (-1500.0, -3300.0, 2100.0, 900.0),
        "m_per_px": 1.5,
        # 45: 1.16 MB; no visible difference from 75 at 2x zoom after the scene's
        # darkening (checked 2026-11-10). The terrain texture is what costs bytes.
        "quality": 45,
    },
    "detail": {
        "product": "ESP_073578_2155_RED_A_01_ORTHO",
        "box": (-100.0, -2650.0, 800.0, -1900.0),
        "m_per_px": 0.25,
        "quality": 78,
    },
}

STRETCH_PERCENTILES = (0.5, 99.5)
# Registration check (plan: crater at grid (0, 0) within 20 m).
REGISTRATION_TOLERANCE_M = 20.0
REGISTRATION_WINDOW_M = 300.0

GDAL_ENV = {
    "GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR",
    "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".tif",
    "GDAL_HTTP_MULTIRANGE": "YES",
    "GDAL_HTTP_MERGE_CONSECUTIVE_RANGES": "YES",
    "VSI_CACHE": "TRUE",
    "VSI_CACHE_SIZE": str(256 * 1024 * 1024),
}


def grid_crs() -> CRS:
    """The grid CRS, with lon_0 in -180..180 like the orthos (their x is negative here)."""
    crs = GRID["crs"]
    lon0 = (crs["center_lon_east_deg"] + 180.0) % 360.0 - 180.0
    return CRS.from_proj4(
        f"+proj=eqc +lat_ts={crs['center_lat_deg']} +lat_0={crs['center_lat_deg']} "
        f"+lon_0={lon0} +x_0=0 +y_0=0 +R={crs['sphere_radius_m']} +units=m +no_defs"
    )


def read_grid(product: str, box: tuple[float, float, float, float], m_per_px: float):
    """Window of the source product reprojected onto the grid box. Returns (data, valid)."""
    xmin, ymin, xmax, ymax = box
    width = round((xmax - xmin) / m_per_px)
    height = round((ymax - ymin) / m_per_px)
    dst_crs = grid_crs()
    dst_transform = from_origin(xmin, ymax, m_per_px, m_per_px)

    with rasterio.open(f"/vsicurl/{BASE}{product}.tif") as src:
        # The grid box in source coordinates, padded so the resampling kernel has data.
        sxmin, symin, sxmax, symax = transform_bounds(dst_crs, src.crs, *box, densify_pts=41)
        if not (src.bounds.left < sxmin < src.bounds.right and src.bounds.bottom < symin < src.bounds.top):
            raise SystemExit(f"{product}: grid box falls outside the raster; check lon_0 ({sxmin}, {symin})")
        pad = 16 * src.res[0]
        window = from_bounds(sxmin - pad, symin - pad, sxmax + pad, symax + pad, src.transform)
        window = window.round_offsets().round_lengths()
        window = window.intersection(Window(0, 0, src.width, src.height))
        source = src.read(1, window=window)
        source_transform = src.window_transform(window)
        nodata = src.nodata if src.nodata is not None else 0
        src_crs = src.crs
        print(
            f"  {product}: read {window.width}x{window.height} px "
            f"({src.res[0]:.3f} m/px) -> {width}x{height} at {m_per_px} m/px",
            flush=True,
        )

    data = np.zeros((height, width), dtype=np.float32)
    reproject(
        source.astype(np.float32),
        data,
        src_transform=source_transform,
        src_crs=src_crs,
        src_nodata=nodata,
        dst_transform=dst_transform,
        dst_crs=dst_crs,
        dst_nodata=0,
        resampling=Resampling.lanczos,
    )
    valid = data > 0.5
    return data, valid


def stretch_limits(data: np.ndarray, valid: np.ndarray) -> tuple[float, float]:
    lo, hi = np.percentile(data[valid], STRETCH_PERCENTILES)
    return float(lo), float(hi)


def to_image(data: np.ndarray, valid: np.ndarray, lo: float, hi: float) -> Image.Image:
    """Stretched gray. Alpha only if there is nodata in the box (it costs ~10 % in size)."""
    gray = np.clip((data - lo) / (hi - lo), 0.0, 1.0)
    gray = np.round(gray * 255).astype(np.uint8)
    gray[~valid] = 0
    if valid.all():
        return Image.fromarray(gray, mode="L").convert("RGB")
    alpha = np.where(valid, 255, 0).astype(np.uint8)
    return Image.fromarray(np.dstack([gray, gray, gray, alpha]), mode="RGBA")


def box_blur(image: np.ndarray, radius: int) -> np.ndarray:
    """Separable box blur with edge padding (numpy only)."""
    out = image.astype(np.float64)
    size = 2 * radius + 1
    for axis in (0, 1):
        widths = [(radius + 1, radius) if a == axis else (0, 0) for a in (0, 1)]
        cumulative = np.cumsum(np.pad(out, widths, mode="edge"), axis=axis)
        if axis == 0:
            out = (cumulative[size:, :] - cumulative[:-size, :]) / size
        else:
            out = (cumulative[:, size:] - cumulative[:, :-size]) / size
    return out


def grow_region(mask: np.ndarray, seed: tuple[int, int]) -> np.ndarray:
    """4-connected component of `mask` that contains `seed` (numpy only)."""
    region = np.zeros_like(mask)
    region[seed] = True
    count = 1
    while True:
        grown = region.copy()
        grown[1:] |= region[:-1]
        grown[:-1] |= region[1:]
        grown[:, 1:] |= region[:, :-1]
        grown[:, :-1] |= region[:, 1:]
        grown &= mask
        new_count = int(grown.sum())
        if new_count == count:
            return grown
        region, count = grown, new_count


def measure_registration(data: np.ndarray, valid: np.ndarray, box, m_per_px: float) -> dict:
    """Where the 2021 impact crater lands in the grid; its distance to (0, 0) is the error.

    Acceptance metric: area centroid of the crater bowl, segmented at half
    depth. In a 10 m box blur of the ±300 m window, the bowl is the connected
    region darker than halfway between the window median (background) and the
    darkest point within 100 m of (0, 0).

    Why not the centroid of the darkest pixels: the sun is low in the west, so
    the west inner wall is in shadow and the east wall is lit. The darkest
    pixels are the shadow, about half a radius west of the center (measured
    2026-11-10: x -20.2 m, y -2.4 m). The half-depth bowl includes the lit wall,
    which is still darker than the plain; it gives the same center on RED_C at
    1.5 m/px and RED_A at 0.5 m/px within 1 m. It is reported too, for review.
    """
    xmin, _, _, ymax = box
    col0 = (0.0 - xmin) / m_per_px
    row0 = (ymax - 0.0) / m_per_px
    half = REGISTRATION_WINDOW_M / m_per_px
    r0, r1 = int(row0 - half), int(row0 + half)
    c0, c1 = int(col0 - half), int(col0 + half)
    patch = data[r0:r1, c0:c1].astype(np.float64)
    patch_valid = valid[r0:r1, c0:c1]
    patch[~patch_valid] = np.median(patch[patch_valid])
    smooth = box_blur(patch, max(1, round(5 / m_per_px)))

    rows_i, cols_i = np.mgrid[0 : smooth.shape[0], 0 : smooth.shape[1]]
    gx = xmin + (c0 + cols_i + 0.5) * m_per_px
    gy = ymax - (r0 + rows_i + 0.5) * m_per_px

    # Half-depth bowl (acceptance).
    background = float(np.median(smooth))
    near = np.hypot(gx, gy) <= 100.0
    seed = np.unravel_index(np.argmin(np.where(near, smooth, np.inf)), smooth.shape)
    level = background - 0.5 * (background - smooth[seed])
    bowl = grow_region(smooth <= level, seed)
    x, y = float(gx[bowl].mean()), float(gy[bowl].mean())

    # Darkest 1 % (shadow-biased; reported, not used for acceptance).
    threshold = np.percentile(smooth, 1.0)
    dark = (smooth <= threshold) & (np.hypot(gx - gx[seed], gy - gy[seed]) <= 100.0)
    weights = (threshold - smooth + 1e-6)[dark]
    dark_x = float(np.average(gx[dark], weights=weights))
    dark_y = float(np.average(gy[dark], weights=weights))

    return {
        "method": "area centroid of the crater bowl at half depth (10 m box blur, ±300 m window), on the overview",
        "crater_xy_m": [round(x, 1), round(y, 1)],
        "error_m": round(math.hypot(x, y), 1),
        "tolerance_m": REGISTRATION_TOLERANCE_M,
        "bowl_equivalent_diameter_m": round(2 * math.sqrt(bowl.sum() * m_per_px**2 / math.pi), 1),
        "darkest_1pct_centroid_xy_m": [round(dark_x, 1), round(dark_y, 1)],
        "darkest_1pct_note": "biased toward the shadowed west wall; not the crater center",
    }


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    meta: dict = {
        "site_id": GRID["site_id"],
        "credit": CREDIT,
        "source": BASE,
        "license": "USGS Astrogeology ARD copy, CC0; HiRISE NASA/JPL-Caltech/UArizona",
        "grid_crs": GRID["crs"]["proj4"],
        "generated": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "generator": "apps/web/scripts/build-site-imagery.py",
        "resampling": "lanczos",
        "stretch": {"percentiles": list(STRETCH_PERCENTILES)},
        "images": {},
    }

    with rasterio.Env(**GDAL_ENV):
        print("overview", flush=True)
        ov = ASSETS["overview"]
        ov_data, ov_valid = read_grid(ov["product"], ov["box"], ov["m_per_px"])

        registration = measure_registration(ov_data, ov_valid, ov["box"], ov["m_per_px"])
        meta["registration"] = registration
        cx, cy = registration["crater_xy_m"]
        print(f"  registration: crater at x {cx:+.1f} m, y {cy:+.1f} m (|e| {registration['error_m']} m)")
        if registration["error_m"] > REGISTRATION_TOLERANCE_M:
            print(
                f"Registration error {registration['error_m']} m > {REGISTRATION_TOLERANCE_M} m. "
                "Not writing assets: check the CRS before going on.",
                file=sys.stderr,
            )
            return 1

        # One stretch for both images, from the overview, so the detail fades in
        # without a jump in brightness (same observation, same DN scale).
        lo, hi = stretch_limits(ov_data, ov_valid)
        meta["stretch"].update({"from": "overview", "dn_low": round(lo, 2), "dn_high": round(hi, 2)})
        print(f"  stretch: DN {lo:.1f}..{hi:.1f}")

        print("detail", flush=True)
        dt = ASSETS["detail"]
        dt_data, dt_valid = read_grid(dt["product"], dt["box"], dt["m_per_px"])
        meta["stretch"]["detail_own_dn"] = [round(v, 2) for v in stretch_limits(dt_data, dt_valid)]

        for name, (data, valid) in {"overview": (ov_data, ov_valid), "detail": (dt_data, dt_valid)}.items():
            spec = ASSETS[name]
            path = OUT / f"s1094b-{name}.webp"
            to_image(data, valid, lo, hi).save(path, "WEBP", quality=spec["quality"], method=6)
            xmin, ymin, xmax, ymax = spec["box"]
            meta["images"][name] = {
                "file": f"/site/{path.name}",
                "product": spec["product"],
                "box_m": {"xmin": xmin, "ymin": ymin, "xmax": xmax, "ymax": ymax},
                "m_per_px": spec["m_per_px"],
                "width_px": int(data.shape[1]),
                "height_px": int(data.shape[0]),
                "valid_fraction": round(float(valid.mean()), 4),
                "bytes": path.stat().st_size,
            }
            print(f"  wrote {path.relative_to(ROOT)} ({path.stat().st_size / 1024:.0f} kB)")

    (OUT / "s1094b.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {(OUT / 's1094b.json').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
