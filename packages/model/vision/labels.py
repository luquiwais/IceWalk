"""Verdad de terreno: recortes para anotar bloques a mano en QGIS y lectura de lo anotado.

Uso (desde packages/model):
    python -m vision.labels                 # escribe los recortes en data/raw/vision/labels/

Cada recorte es un GeoTIFF en la proyección de la grilla (metros desde el cráter), así que lo que
se dibuje encima en QGIS queda en las mismas coordenadas que el catálogo. Por cada bloque, una
línea de lado a lado (su diámetro) en una capa nueva guardada **en el CRS del recorte** como
`<recorte>.geojson`, en la misma carpeta. También sirven puntos con el atributo `diameter_m`,
polígonos, o un CSV con columnas `x_m, y_m, diameter_m`.

Reglas (docs/plans/vision.md, paso 2): los recortes `test_*` se anotan a ciegas, sin mirar las
detecciones, y **no se usan para ajustar** el detector. Para ajustar está `tune`. Las etiquetas
no van a Git.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from dataclasses import dataclass
from pathlib import Path

import rasterio
from rasterio.crs import CRS
from rasterio.transform import Affine

from vision.crops import read_window
from vision.grid import REPO_ROOT, Grid, load_grid
from vision.run import RAW_DIR, SITES

LABELS_DIR = REPO_ROOT / "data" / "raw" / "vision" / "labels"
CROP_RES_M = 0.25

# 250 × 250 m cada uno, alineados a celdas de la grilla. (xmin, ymin, xmax, ymax).
LABEL_CROPS = {
    "s1094b": {
        # Dentro de la zona de la EVA, al norte del hábitat, hacia la eyecta lejana.
        "test_eva": (150.0, -1050.0, 400.0, -800.0),
        # Eyecta cercana, al noroeste del borde del cráter. Cuadrante que no se miró al ajustar.
        "test_ejecta": (-310.0, 60.0, -60.0, 310.0),
        # Para ajustar: eyecta cercana al suroeste. Acá se eligieron los umbrales del detector
        # (docs/EXPERIMENTS.md, 2026-11-13). No es parte del test.
        "tune": (-330.0, -290.0, -80.0, -40.0),
    }
}


@dataclass(frozen=True)
class Label:
    x_m: float
    y_m: float
    diameter_m: float


def export_crops(out_dir: Path = LABELS_DIR, site_id: str = "s1094b", raw_dir: Path = RAW_DIR,
                 grid: Grid | None = None) -> list[Path]:
    """Escribe un GeoTIFF por recorte, de la imagen más reciente del sitio."""
    grid = grid or load_grid()
    image = SITES[site_id].latest
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for name, bounds in LABEL_CROPS[site_id].items():
        data = read_window(raw_dir / image.ortho, grid, bounds, CROP_RES_M)
        path = out_dir / f"{name}.tif"
        with rasterio.open(
            path,
            "w",
            driver="GTiff",
            height=data.shape[0],
            width=data.shape[1],
            count=1,
            dtype=data.dtype,
            crs=CRS.from_proj4(grid.proj4),
            transform=Affine(CROP_RES_M, 0, bounds[0], 0, -CROP_RES_M, bounds[3]),
            nodata=0,
            compress="DEFLATE",
        ) as dst:
            dst.write(data, 1)
            dst.update_tags(source_image=image.image_id, credit="NASA/JPL-Caltech/UArizona")
        written.append(path)
    return written


def _label_from_geometry(geometry: dict, properties: dict) -> Label:
    kind, coords = geometry["type"], geometry["coordinates"]
    if kind == "Point":
        if properties.get("diameter_m") is None:
            raise ValueError("Un punto necesita el atributo diameter_m")
        return Label(float(coords[0]), float(coords[1]), float(properties["diameter_m"]))
    if kind in ("LineString", "MultiLineString"):
        line = coords if kind == "LineString" else coords[0]
        (x0, y0), (x1, y1) = line[0][:2], line[-1][:2]
        return Label((x0 + x1) / 2, (y0 + y1) / 2, math.hypot(x1 - x0, y1 - y0))
    if kind in ("Polygon", "MultiPolygon"):
        ring = coords[0] if kind == "Polygon" else coords[0][0]
        area = cx = cy = 0.0
        for (x0, y0), (x1, y1) in zip(ring[:-1], ring[1:], strict=True):
            cross = x0 * y1 - x1 * y0
            area += cross
            cx += (x0 + x1) * cross
            cy += (y0 + y1) * cross
        area /= 2
        if area == 0:
            raise ValueError("Polígono sin área")
        # Diámetro del círculo de igual área.
        return Label(cx / (6 * area), cy / (6 * area), 2 * math.sqrt(abs(area) / math.pi))
    raise ValueError(f"Geometría no soportada: {kind}")


def load_labels(path: Path) -> list[Label]:
    """Lee etiquetas de un GeoJSON o un CSV (`x_m, y_m, diameter_m`), en metros de la grilla."""
    if path.suffix.lower() == ".csv":
        with path.open(newline="", encoding="utf-8") as handle:
            labels = [
                Label(float(row["x_m"]), float(row["y_m"]), float(row["diameter_m"]))
                for row in csv.DictReader(handle)
            ]
    else:
        collection = json.loads(path.read_text(encoding="utf-8"))
        labels = [
            _label_from_geometry(feature["geometry"], feature.get("properties") or {})
            for feature in collection["features"]
            if feature.get("geometry")
        ]
    if labels and all(abs(item.x_m) <= 360 and abs(item.y_m) <= 90 for item in labels):
        raise ValueError(
            f"{path.name} parece estar en grados. Guardá la capa en el CRS del recorte (metros)."
        )
    if any(item.diameter_m <= 0 for item in labels):
        raise ValueError(f"{path.name} tiene un diámetro que no es positivo")
    return labels


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--site", default="s1094b", choices=sorted(LABEL_CROPS))
    parser.add_argument("--out", type=Path, default=LABELS_DIR)
    parser.add_argument("--raw", type=Path, default=RAW_DIR)
    args = parser.parse_args()
    for path in export_crops(args.out, args.site, args.raw):
        print(path)


if __name__ == "__main__":
    main()
