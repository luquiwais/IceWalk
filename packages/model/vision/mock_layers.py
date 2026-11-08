"""Genera capas y catálogo FALSOS con la forma final, para integrar sin esperar a visión.

Uso: python -m vision.mock_layers [--out data/processed/s1094b] [--seed 7]

Los valores son ilustrativos (is_mock): sirven para probar el GP, el planificador y la web, no
para sacar conclusiones. Las capas y el catálogo van a data/processed/, que no se sube a Git.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from scipy import ndimage

from vision.grid import REPO_ROOT, Grid, load_grid
from vision.rasterize import rasterize_catalog, write_cog

DEFAULT_OUT = REPO_ROOT / "data" / "processed" / "s1094b"
DETECTION_LIMIT_M = 1.5
N_OBJECTS = 5000
CRATER_RADIUS_M = 77.5  # S1094b mide ~155 m de diámetro: la eyecta arranca en el borde.
RADIAL_SCALE_M = 250.0
MAX_DIAMETER_M = 8.0
NODATA_MARGIN_M = 100.0  # Deja márgenes nodata, como la huella real de una imagen.
COLOR_STRIP_HALF_WIDTH_M = 500.0
LATEST_IMAGE = "ESP_083099_2155"
FIRST_IMAGE = "ESP_073578_2155"


def _object_properties(index: int, x: float, y: float, rng: np.random.Generator) -> dict:
    """Combinaciones válidas según el contrato: ice_candidate exige evidencia de color."""
    diameter = float(min(DETECTION_LIMIT_M * (1 + rng.pareto(2.5)), MAX_DIAMETER_M))
    composition = str(rng.choice(["rock", "ice_candidate", "indeterminate"], p=[0.7, 0.2, 0.1]))
    persistence = "persistent"
    evidence = ["shadow"]
    last_seen = LATEST_IMAGE
    form = "block"
    height: float | None = round(diameter * float(rng.uniform(0.4, 0.9)), 2)
    if composition == "ice_candidate":
        evidence.append("color")
        persistence = str(rng.choice(["fading", "not_visible_latest"]))
        if persistence == "not_visible_latest":
            evidence = ["color", "multitemporal"]
            last_seen = FIRST_IMAGE
        if rng.random() < 0.3:
            form = "patch"
            height = None
            evidence = [e for e in evidence if e != "shadow"]
    return {
        "id": f"B{index + 1:06d}",
        "x_m": round(x, 2),
        "y_m": round(y, 2),
        "diameter_m": round(diameter, 2),
        "height_m": height,
        "height_source": "shadow" if height is not None else None,
        "composition": composition,
        "form": form,
        "persistence": persistence,
        "last_seen_image": last_seen,
        "confidence": round(float(rng.uniform(0.5, 1.0)), 3),
        "evidence": evidence,
        "method": "mock",
    }


def mock_catalog(grid: Grid, seed: int = 7, n: int = N_OBJECTS) -> dict:
    """Objetos concentrados alrededor del cráter, como eyecta."""
    rng = np.random.default_rng(seed)
    radius = CRATER_RADIUS_M + rng.exponential(RADIAL_SCALE_M, n)
    angle = rng.uniform(0, 2 * np.pi, n)
    xs = radius * np.cos(angle)
    ys = radius * np.sin(angle)
    features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": list(grid.xy_to_lonlat(float(xs[i]), float(ys[i]))),
            },
            "properties": _object_properties(i, float(xs[i]), float(ys[i]), rng),
        }
        for i in range(n)
    ]
    return {
        "type": "FeatureCollection",
        "site_id": grid.site_id,
        "is_mock": True,
        "generated_by": "model/vision/mock_layers.py",
        "detection_limit_m": DETECTION_LIMIT_M,
        "source_images": [],
        "features": features,
    }


def cell_centers(grid: Grid) -> tuple[np.ndarray, np.ndarray]:
    xs = grid.xmin + (np.arange(grid.width) + 0.5) * grid.cell_size_m
    ys = grid.ymax - (np.arange(grid.height) + 0.5) * grid.cell_size_m
    return np.meshgrid(xs, ys)


def _smooth_noise(shape: tuple[int, int], rng: np.random.Generator, sigma: float) -> np.ndarray:
    """Ruido suave en [0, 1]: textura plausible sin pretender ser un dato."""
    field = ndimage.gaussian_filter(rng.normal(size=shape), sigma)
    return (field - field.min()) / (field.max() - field.min())


def mock_surface_layers(grid: Grid, seed: int = 7) -> dict[str, np.ndarray]:
    """Eyecta, formas del terreno, zonas, hielo expuesto y anomalías falsas."""
    rng = np.random.default_rng(seed)
    x, y = cell_centers(grid)
    radius = np.hypot(x, y)
    texture = _smooth_noise(radius.shape, rng, sigma=20)

    ice = np.exp(-((radius / 200.0) ** 2)).astype(np.float32)
    ice[np.abs(x) > COLOR_STRIP_HALF_WIDTH_M] = grid.nodata  # Sin color no se evalúa: no es 0.

    units = np.digitize(texture, [0.4, 0.6]) + 1  # Ids 1, 2 y 3.
    units[radius < 2 * CRATER_RADIUS_M] = 4  # La eyecta proximal es su propia zona.
    anomaly = np.clip(np.exp(-radius / 600.0) + rng.normal(0, 0.03, radius.shape), 0, 1)
    return {
        "ejecta_zone": (radius <= 2 * CRATER_RADIUS_M).astype(np.float32),
        "periglacial_landform_score": texture.astype(np.float32),
        "surface_unit": units.astype(np.float32),
        "ice_exposure_fraction": ice,
        "visual_anomaly_score": anomaly.astype(np.float32),
    }


def generate(out_dir: Path, grid: Grid | None = None, seed: int = 7, n: int = N_OBJECTS) -> dict:
    """Escribe capas, catálogo y manifiesto en out_dir. Devuelve el manifiesto."""
    grid = grid or load_grid()
    catalog = mock_catalog(grid, seed, n)
    x, _ = cell_centers(grid)
    footprint = (x >= grid.xmin + NODATA_MARGIN_M) & (x <= grid.xmax - NODATA_MARGIN_M)

    layers = rasterize_catalog(catalog, grid, footprint)
    for layer_id, array in mock_surface_layers(grid, seed).items():
        array[~footprint] = grid.nodata
        layers[layer_id] = array

    out_dir.mkdir(parents=True, exist_ok=True)
    for layer_id, array in layers.items():
        tags = {"layer_id": layer_id, "is_mock": "true"}
        write_cog(out_dir / f"{layer_id}.tif", array, grid, tags)
    (out_dir / "boulders.geojson").write_text(json.dumps(catalog), encoding="utf-8")

    manifest = {
        "site_id": grid.site_id,
        "is_mock": True,
        "seed": seed,
        "detection_limit_m": DETECTION_LIMIT_M,
        "layers": sorted(layers),
        "catalog": "boulders.geojson",
        "n_objects": len(catalog["features"]),
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()
    print(json.dumps(generate(args.out, seed=args.seed), indent=2))


if __name__ == "__main__":
    main()
