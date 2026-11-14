"""Corre visión sobre un sitio: imágenes HiRISE -> catálogo de bloques y capas de costo reales.

Uso (desde packages/model):
    python -m vision.run --site s1094b                    # zona de la EVA, dos fechas
    python -m vision.run --site s1094b --zone tusberti --out ../../data/processed/s1094b-tusberti
    python -m vision.run --site s1094b --bounds -200 -200 200 200 --image ESP_073077_2155

Lee los ortos y sus labels de `data/raw/` (`python data/download.py --only hirise_ortho_25cm
hirise_feb2022_ortho_25cm hirise_ortho_label hirise_feb2022_label`) y escribe en
`data/processed/<sitio>/`, que no se sube a Git: `boulders.geojson`, las capas de
`rasterize.COST_LAYERS` como COG sobre la grilla y `manifest.json` con todo lo necesario para
repetir la corrida.

Fuera de la ventana procesada las capas van con `nodata`: ahí no se buscó.
"""

from __future__ import annotations

import argparse
import json
import math
import time
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from vision.boulders import (
    DEFAULT_PARAMS,
    DETECTION_LIMIT_M,
    DetectorParams,
    detect_epochs_in_window,
)
from vision.catalog import Epoch, build_catalog, footprint_on_grid, merge_epochs
from vision.grid import REPO_ROOT, Grid, load_grid
from vision.pds import ImageGeometry, read_label
from vision.rasterize import rasterize_catalog, write_cog

GENERATED_BY = "packages/model/vision/run.py (detector de sombras, vision/boulders.py)"
RAW_DIR = REPO_ROOT / "data" / "raw"
PROCESSED_DIR = REPO_ROOT / "data" / "processed"


@dataclass(frozen=True)
class SiteImage:
    image_id: str
    ortho: str
    """Imagen ortorrectificada, alineada con el DTM."""
    label: str
    """Label del RDR: el del orto no trae la geometría del sol."""


@dataclass(frozen=True)
class Site:
    latest: SiteImage
    earlier: SiteImage | None
    """Otra fecha ya alineada con `latest` (mismo par estéreo), o None."""
    zones: dict[str, tuple[float, float, float, float]]
    """Ventanas con nombre: (xmin, ymin, xmax, ymax) en metros de la grilla."""


TUSBERTI_RADIUS_M = math.sqrt(1e6 / math.pi)
"""Radio del círculo de 1 km² centrado en el cráter que mapearon Tusberti et al. (fig. 4)."""

SITES = {
    "s1094b": Site(
        latest=SiteImage(
            "ESP_073578_2155", "ESP_073578_2155_RED_A_01_ORTHO.JP2", "ESP_073578_2155_RED.LBL"
        ),
        earlier=SiteImage(
            "ESP_073077_2155", "ESP_073077_2155_RED_A_01_ORTHO.JP2", "ESP_073077_2155_RED.LBL"
        ),
        zones={
            # Hábitat en (300, -2200) ± 1.5 km: la ventana del mapa del planificador
            # (`habitat_xy` y `map_half_m` en apps/planner/config/eva.yaml).
            "eva": (-1200.0, -3700.0, 1800.0, -700.0),
            "tusberti": (
                -TUSBERTI_RADIUS_M, -TUSBERTI_RADIUS_M, TUSBERTI_RADIUS_M, TUSBERTI_RADIUS_M
            ),
        },
    ),
}


def _detect(
    images: list[SiteImage],
    raw_dir: Path,
    grid: Grid,
    bounds: tuple[float, float, float, float],
    params: DetectorParams,
) -> tuple[list[Epoch], list[ImageGeometry]]:
    for image in images:
        for name in (image.ortho, image.label):
            if not (raw_dir / name).exists():
                raise FileNotFoundError(
                    f"Falta {raw_dir / name}. Ver data/layers.yaml y `python data/download.py`"
                )
    geometries = [read_label(raw_dir / image.label) for image in images]
    paths = [raw_dir / image.ortho for image in images]
    results = detect_epochs_in_window(
        list(zip(paths, geometries, strict=True)), grid, bounds, params=params
    )
    epochs = [
        Epoch(image.image_id, result.detections, result.coverage, result.bounds)
        for image, result in zip(images, results, strict=True)
    ]
    return epochs, geometries


def _clear_mock(out_dir: Path, replace_mock: bool) -> None:
    """Las capas falsas de `vision.mock_layers` no pueden quedar mezcladas con las reales."""
    manifest_path = out_dir / "manifest.json"
    if not manifest_path.exists():
        return
    previous = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not previous.get("is_mock"):
        return
    if not replace_mock:
        raise SystemExit(
            f"{out_dir} tiene capas FALSAS (is_mock). Corré con --replace-mock para borrarlas, "
            "o elegí otra carpeta con --out."
        )
    for layer_id in previous.get("layers", []):
        (out_dir / f"{layer_id}.tif").unlink(missing_ok=True)
    (out_dir / previous.get("catalog", "boulders.geojson")).unlink(missing_ok=True)
    manifest_path.unlink()


def run(
    site_id: str,
    bounds: tuple[float, float, float, float],
    out_dir: Path,
    raw_dir: Path = RAW_DIR,
    image_id: str | None = None,
    params: DetectorParams = DEFAULT_PARAMS,
    replace_mock: bool = False,
    grid: Grid | None = None,
    site: Site | None = None,
) -> dict:
    """Detecta, arma el catálogo, rasteriza y escribe todo en `out_dir`. Devuelve el manifiesto."""
    grid = grid or load_grid()
    site = site or SITES[site_id]
    if grid.site_id != site_id:
        raise ValueError(f"La grilla es de {grid.site_id}, no de {site_id}")
    _clear_mock(out_dir, replace_mock)

    images = [image for image in (site.latest, site.earlier) if image is not None]
    if image_id is not None:
        images = [image for image in images if image.image_id == image_id]
        if not images:
            raise ValueError(f"{image_id} no es una imagen de {site_id}")

    started = time.perf_counter()
    epochs, geometries = _detect(images, raw_dir, grid, bounds, params)
    seconds = time.perf_counter() - started
    latest = epochs[0]
    earlier = epochs[1] if len(epochs) > 1 else None

    objects = merge_epochs(latest, earlier, params.presence_sigma)
    catalog = build_catalog(objects, grid, [epoch.image_id for epoch in epochs], GENERATED_BY)
    footprint = footprint_on_grid(latest, grid)
    layers = rasterize_catalog(catalog, grid, footprint)

    out_dir.mkdir(parents=True, exist_ok=True)
    tags = {
        "is_mock": "false",
        "detection_limit_m": str(DETECTION_LIMIT_M),
        "source_images": ",".join(catalog["source_images"]),
        "credit": "NASA/JPL-Caltech/UArizona",
    }
    for layer_id, array in layers.items():
        write_cog(out_dir / f"{layer_id}.tif", array, grid, {"layer_id": layer_id, **tags})
    (out_dir / "boulders.geojson").write_text(json.dumps(catalog), encoding="utf-8")

    diameters = np.array([f["properties"]["diameter_m"] for f in catalog["features"]])
    persistence = [f["properties"]["persistence"] for f in catalog["features"]]
    corridor = layers["clear_path_width_m"]
    manifest = {
        "site_id": site_id,
        "is_mock": False,
        "generated_by": GENERATED_BY,
        "created_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "bounds_m": list(latest.bounds),
        "detection_limit_m": DETECTION_LIMIT_M,
        "images": [
            {
                "image_id": epoch.image_id,
                "start_time": geometry.start_time,
                "incidence_deg": geometry.incidence_deg,
                "sun_azimuth_deg": round(geometry.sun_azimuth_deg, 3),
                "detections_firm": sum(d.firm for d in epoch.detections),
                "detections_weak": sum(not d.firm for d in epoch.detections),
            }
            for epoch, geometry in zip(epochs, geometries, strict=True)
        ],
        "detection_seconds": round(seconds, 1),
        "params": asdict(params),
        "catalog": "boulders.geojson",
        "n_objects": len(catalog["features"]),
        "n_at_or_above_detection_limit": int((diameters >= DETECTION_LIMIT_M).sum()),
        "persistence": {name: persistence.count(name) for name in sorted(set(persistence))},
        "cells_in_footprint": int(footprint.sum()),
        "cells_with_boulders": int(((layers["boulder_density"] > 0) & footprint).sum()),
        "min_clear_path_width_m": float(corridor[footprint].min()) if footprint.any() else None,
        "layers": sorted(layers),
        "credit": "HiRISE: NASA/JPL-Caltech/UArizona",
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--site", default="s1094b", choices=sorted(SITES))
    parser.add_argument("--zone", default="eva", help="Ventana con nombre del sitio (ver SITES)")
    parser.add_argument(
        "--bounds", type=float, nargs=4, metavar=("XMIN", "YMIN", "XMAX", "YMAX"),
        help="Ventana a mano, en metros de la grilla. Pisa a --zone",
    )
    parser.add_argument("--image", help="Solo esta imagen, sin cruzar fechas")
    parser.add_argument("--raw", type=Path, default=RAW_DIR)
    parser.add_argument("--out", type=Path, help="Por defecto, data/processed/<sitio>")
    parser.add_argument("--replace-mock", action="store_true", help="Borra capas falsas previas")
    args = parser.parse_args()

    site = SITES[args.site]
    if args.bounds:
        bounds = tuple(args.bounds)
    elif args.zone in site.zones:
        bounds = site.zones[args.zone]
    else:
        parser.error(f"--zone debe ser una de {sorted(site.zones)}")
    out_dir = args.out or PROCESSED_DIR / args.site
    manifest = run(args.site, bounds, out_dir, args.raw, args.image, replace_mock=args.replace_mock)
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
