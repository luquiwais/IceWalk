"""Corre el Mask R-CNN de `vision.maskrcnn` sobre un sitio: catálogo de bloques y capas de costo.

El Mask R-CNN da el **contorno y el diámetro**; la **altura** sale del detector de sombras
(`vision.boulders`), emparejando cada bloque con la sombra más cercana dentro del radio de
`vision.catalog.match_radius_m`. Sin pareja, `height_m` queda en null y `height_source` en null
(el esquema lo permite; el planificador lo trata como obstáculo).

Uso (desde packages/model, en el entorno con torch):
    python -m vision.maskrcnn_run --model ../../data/processed/maskrcnn/final.pt
    python -m vision.maskrcnn_run --model ... --zone tusberti \\
        --out ../../data/processed/s1094b-maskrcnn-tusberti

Escribe por defecto en `data/processed/s1094b-maskrcnn/`: nunca pisa `data/processed/s1094b/`,
que es lo que lee el planificador, hasta que se decida reemplazarlo.

Los ortos se leen por ventanas a su escala nativa, 0.25 m/px, en teselas de 125 m (500 px, como
los recortes de entrenamiento) con margen; cada tesela se queda con los bloques cuyo centro cae en
su interior, así ninguno se cuenta dos veces. A 0.5 m/px el modelo no veía los bloques chicos y
marcaba montículos de 5-25 m (docs/EXPERIMENTS.md, 2026-11-15).
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

from vision.bouldernet import mask_to_label
from vision.boulders import DEFAULT_PARAMS, Detection, detect_epochs_in_window, snap_bounds
from vision.catalog import UNCONFIRMED_FACTOR, Epoch, footprint_on_grid
from vision.crops import read_window
from vision.grid import Grid, load_grid
from vision.imagery import valid_mask
from vision.pds import read_label
from vision.rasterize import rasterize_catalog, write_cog
from vision.run import PROCESSED_DIR, RAW_DIR, SITES, SiteImage

GENERATED_BY = (
    "packages/model/vision/maskrcnn_run.py (Mask R-CNN entrenado con BoulderNet, "
    "vision/maskrcnn.py; alturas del detector de sombras)"
)
RES_M = 0.25
DETECTION_LIMIT_M = 2.0
"""El F1 se midió para diámetro >= 2 m (validación cruzada, docs/EXPERIMENTS.md)."""


@dataclass(frozen=True)
class Found:
    x_m: float
    y_m: float
    diameter_m: float
    score: float


def detect_in_image(model, path: Path, grid: Grid, bounds, threshold: float,
                    tile_m: float = 125.0, margin_m: float = 8.0) -> list[Found]:
    from vision.maskrcnn import predict, stretch

    xmin, ymin, xmax, ymax = bounds
    found = []
    for tile_y1 in np.arange(ymax, ymin, -tile_m):
        tile_y0 = max(tile_y1 - tile_m, ymin)
        for tile_x0 in np.arange(xmin, xmax, tile_m):
            tile_x1 = min(tile_x0 + tile_m, xmax)
            read = (
                max(tile_x0 - margin_m, grid.xmin),
                max(tile_y0 - margin_m, grid.ymin),
                min(tile_x1 + margin_m, grid.xmax),
                min(tile_y1 + margin_m, grid.ymax),
            )
            image = read_window(path, grid, read, RES_M)
            valid = valid_mask(image)
            if valid.mean() < 0.05:
                continue
            for score, mask in predict(model, stretch(image)):
                if score < threshold:
                    continue
                label = mask_to_label(mask, RES_M)
                if label is None:
                    continue
                x, y = read[0] + label.x_m, read[3] + label.y_m
                row, col = int(-label.y_m / RES_M), int(label.x_m / RES_M)
                if not valid[min(row, valid.shape[0] - 1), min(col, valid.shape[1] - 1)]:
                    continue
                if tile_x0 <= x < tile_x1 and tile_y0 <= y < tile_y1:
                    found.append(Found(float(x), float(y), label.diameter_m, score))
    return found


def _pairs(sources: list, targets: list) -> list[int | None]:
    """Pareja más cercana a menos de medio diámetro del mayor (mínimo 1 m)."""
    if not sources or not targets:
        return [None] * len(sources)
    tree = cKDTree([(t.x_m, t.y_m) for t in targets])
    largest = max(t.diameter_m for t in targets)
    out: list[int | None] = []
    for source in sources:
        best = None
        reach = max(1.0, 0.5 * max(source.diameter_m, largest))
        for index in tree.query_ball_point((source.x_m, source.y_m), reach):
            target = targets[index]
            distance = float(np.hypot(source.x_m - target.x_m, source.y_m - target.y_m))
            if distance <= max(1.0, 0.5 * max(source.diameter_m, target.diameter_m)):
                if best is None or distance < best[0]:
                    best = (distance, index)
        out.append(best[1] if best else None)
    return out


def _covered(epoch: Epoch, grid: Grid, x_m: float, y_m: float) -> bool:
    xmin, _, _, ymax = epoch.bounds
    row = int((ymax - y_m) // grid.cell_size_m)
    col = int((x_m - xmin) // grid.cell_size_m)
    rows, cols = epoch.coverage.shape
    return 0 <= row < rows and 0 <= col < cols and epoch.coverage[row, col] >= 0.5


def build_objects(latest: list[Found], earlier: list[Found] | None, earlier_epoch: Epoch | None,
                  latest_epoch: Epoch, ids: tuple[str, str | None], grid: Grid) -> list[dict]:
    """Cruza las dos fechas como `vision.catalog.merge_epochs`, pero con detecciones del modelo."""
    objects = []
    if earlier is None:
        return [dict(found=f, persistence="single_epoch", image=ids[0], confidence=f.score,
                     multitemporal=False) for f in latest]
    in_earlier = _pairs(latest, earlier)
    for found, pair in zip(latest, in_earlier, strict=True):
        if pair is not None:
            other = earlier[pair]
            merged = Found((found.x_m + other.x_m) / 2, (found.y_m + other.y_m) / 2,
                           (found.diameter_m + other.diameter_m) / 2,
                           1 - (1 - found.score) * (1 - other.score))
            objects.append(dict(found=merged, persistence="persistent", image=ids[0],
                                confidence=merged.score, multitemporal=True))
        else:
            seen = _covered(earlier_epoch, grid, found.x_m, found.y_m)
            objects.append(dict(found=found, persistence="single_epoch", image=ids[0],
                                confidence=found.score * (UNCONFIRMED_FACTOR if seen else 1.0),
                                multitemporal=False))
    # Solo en la anterior: `single_epoch`, sin castigo. Nunca `not_visible_latest`: la imagen de
    # abril es más borrosa y el modelo casi no detecta nada en ella (docs/EXPERIMENTS.md,
    # 2026-11-15); que no lo vea no prueba que no esté. Lo mismo resolvió el detector de sombras
    # mirando la sombra en la otra fecha; acá no hay esa segunda evidencia.
    in_latest = _pairs(earlier, latest)
    for found, pair in zip(earlier, in_latest, strict=True):
        if pair is None:
            objects.append(dict(found=found, persistence="single_epoch", image=ids[1],
                                confidence=found.score, multitemporal=False))
    return objects


def attach_heights(objects: list[dict], shadows: list[Detection]) -> None:
    """Altura de la sombra más cercana; si no hay, null."""
    founds = [o["found"] for o in objects]
    for obj, pair in zip(objects, _pairs(founds, shadows), strict=True):
        obj["height_m"] = None if pair is None else shadows[pair].height_m


def to_catalog(objects: list[dict], grid: Grid, source_images: list[str]) -> dict:
    ordered = sorted(objects, key=lambda o: (-o["found"].y_m, o["found"].x_m))
    features = []
    for index, obj in enumerate(ordered):
        found = obj["found"]
        height = obj["height_m"]
        evidence = ["appearance"]
        if height is not None:
            evidence.append("shadow")
        if obj["multitemporal"]:
            evidence.append("multitemporal")
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point",
                         "coordinates": list(grid.xy_to_lonlat(found.x_m, found.y_m))},
            "properties": {
                "id": f"B{index + 1:06d}",
                "x_m": round(found.x_m, 2),
                "y_m": round(found.y_m, 2),
                "diameter_m": round(found.diameter_m, 2),
                "height_m": None if height is None else round(height, 2),
                "height_source": None if height is None else "shadow",
                "composition": "indeterminate",
                "form": "block",
                "persistence": obj["persistence"],
                "last_seen_image": obj["image"],
                "confidence": round(min(max(obj["confidence"], 0.0), 1.0), 3),
                "evidence": evidence,
                "method": "bouldernet",
            },
        })
    return {
        "type": "FeatureCollection",
        "site_id": grid.site_id,
        "is_mock": False,
        "generated_by": GENERATED_BY,
        "detection_limit_m": DETECTION_LIMIT_M,
        "source_images": source_images,
        "features": features,
    }


def run(model_path: Path, site_id: str, bounds, out_dir: Path, raw_dir: Path = RAW_DIR) -> dict:
    import torch

    from vision.maskrcnn import build_model

    grid = load_grid()
    site = SITES[site_id]
    images: list[SiteImage] = [i for i in (site.latest, site.earlier) if i is not None]
    bounds = snap_bounds(bounds, grid)
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=True)
    model = build_model(pretrained=False)
    model.load_state_dict(checkpoint["state_dict"])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()
    threshold = float(checkpoint["threshold"])

    started = time.perf_counter()
    geometries = [read_label(raw_dir / image.label) for image in images]
    shadow = detect_epochs_in_window(
        [(raw_dir / image.ortho, g) for image, g in zip(images, geometries, strict=True)],
        grid, bounds, params=DEFAULT_PARAMS,
    )
    shadow_seconds = time.perf_counter() - started
    epochs = [Epoch(image.image_id, r.detections, r.coverage, r.bounds)
              for image, r in zip(images, shadow, strict=True)]
    started = time.perf_counter()
    found = [detect_in_image(model, raw_dir / image.ortho, grid, bounds, threshold)
             for image in images]
    model_seconds = time.perf_counter() - started

    earlier = found[1] if len(found) > 1 else None
    objects = build_objects(
        found[0], earlier, epochs[1] if len(epochs) > 1 else None, epochs[0],
        (images[0].image_id, images[1].image_id if len(images) > 1 else None), grid,
    )
    shadows = [d for epoch in epochs for d in epoch.detections if d.firm]
    attach_heights(objects, shadows)
    catalog = to_catalog(objects, grid, [image.image_id for image in images])
    footprint = footprint_on_grid(epochs[0], grid)
    layers = rasterize_catalog(catalog, grid, footprint)

    out_dir.mkdir(parents=True, exist_ok=True)
    tags = {
        "is_mock": "false",
        "detection_limit_m": str(DETECTION_LIMIT_M),
        "source_images": ",".join(catalog["source_images"]),
        "credit": "NASA/JPL-Caltech/UArizona; BoulderNet training data Prieur et al. 2023",
    }
    for layer_id, array in layers.items():
        write_cog(out_dir / f"{layer_id}.tif", array, grid, {"layer_id": layer_id, **tags})
    (out_dir / "boulders.geojson").write_text(json.dumps(catalog), encoding="utf-8")

    props = [f["properties"] for f in catalog["features"]]
    diameters = np.array([p["diameter_m"] for p in props])
    persistence = [p["persistence"] for p in props]
    corridor = layers["clear_path_width_m"]
    manifest = {
        "site_id": site_id,
        "is_mock": False,
        "generated_by": GENERATED_BY,
        "created_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "bounds_m": list(bounds),
        "detection_limit_m": DETECTION_LIMIT_M,
        "model": {"path": str(model_path.name), "score_threshold": threshold, "res_m": RES_M},
        "images": [
            {"image_id": image.image_id, "detections_model": len(f),
             "detections_shadow_firm": sum(d.firm for d in e.detections)}
            for image, f, e in zip(images, found, epochs, strict=True)
        ],
        "detection_seconds": {"model": round(model_seconds, 1), "shadow": round(shadow_seconds, 1)},
        "catalog": "boulders.geojson",
        "n_objects": len(props),
        "n_at_or_above_detection_limit": int((diameters >= DETECTION_LIMIT_M).sum()),
        "n_with_shadow_height": sum(p["height_m"] is not None for p in props),
        "persistence": {name: persistence.count(name) for name in sorted(set(persistence))},
        "cells_in_footprint": int(footprint.sum()),
        "cells_with_boulders": int(((layers["boulder_density"] > 0) & footprint).sum()),
        "min_clear_path_width_m": float(corridor[footprint].min()) if footprint.any() else None,
        "layers": sorted(layers),
        "credit": "HiRISE: NASA/JPL-Caltech/UArizona. Training data: Prieur et al. (2023), "
                  "CC BY 4.0",
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--site", default="s1094b", choices=sorted(SITES))
    parser.add_argument("--zone", default="eva")
    parser.add_argument("--raw", type=Path, default=RAW_DIR)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    bounds = SITES[args.site].zones[args.zone]
    out_dir = args.out or PROCESSED_DIR / f"{args.site}-maskrcnn"
    print(json.dumps(run(args.model, args.site, bounds, out_dir, args.raw), indent=2))


if __name__ == "__main__":
    main()
