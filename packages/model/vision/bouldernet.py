"""Verdad de terreno externa: los bloques de Marte marcados a mano del dataset de BoulderNet.

Prieur et al. (2023) publican recortes de imágenes con el contorno de cada bloque dibujado a mano
(Zenodo 8171052, CC BY 4.0). De Marte trae cuatro imágenes HiRISE, remuestreadas a ~0.5 m/px. Sirve
para medir el detector de sombras con etiquetas que no hicimos nosotros y para entrenar el
clasificador de `vision.classifier`, dejando siempre una imagen entera afuera para medir.

Uso (desde packages/model):
    python -m vision.bouldernet            # F1 del detector por imagen, para diámetro >= 2 y 3 m

Espera el zip `Apr2023-Mars-Moon-Earth-mask-5px.zip` extraído en `data/raw/bouldernet/extracted/`
y los labels PDS de los RDR en `data/raw/bouldernet/labels_pds/` (ver `data/layers.yaml`).
Los datos de terceros se leen como datos: solo GeoTIFF, JSON y labels PDS, nunca código.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio

from vision.grid import REPO_ROOT
from vision.labels import Label
from vision.pds import ImageGeometry, read_label

BOULDERNET_DIR = REPO_ROOT / "data" / "raw" / "bouldernet"
DATASET = "Apr2023-Mars-Moon-Earth-mask-5px"
BORDER_M = 4.0
"""Bloques a menos de esto del borde del recorte no se puntúan: su sombra puede quedar afuera."""


@dataclass(frozen=True)
class Patch:
    name: str
    image_id: str
    """Observación HiRISE, por ejemplo ESP_017355_2260."""
    split: str
    """Partición original del dataset (train, validation, test). Acá se valida por imagen."""
    image: np.ndarray
    res_m: float
    geometry: ImageGeometry
    labels: list[Label]
    """Bloques marcados a mano, en metros desde la esquina noroeste (x al este, y <= 0)."""

    @property
    def size_m(self) -> tuple[float, float]:
        rows, cols = self.image.shape
        return cols * self.res_m, rows * self.res_m

    def inside(self, x_m: float, y_m: float, margin_m: float = BORDER_M) -> bool:
        width, height = self.size_m
        return margin_m <= x_m <= width - margin_m and margin_m <= -y_m <= height - margin_m


def decode_rle(counts: str, height: int, width: int) -> np.ndarray:
    """Máscara de un RLE comprimido de COCO (el formato de `pycocotools`), sin depender de él."""
    runs: list[int] = []
    position = 0
    while position < len(counts):
        value = shift = 0
        more = True
        while more:
            chunk = ord(counts[position]) - 48
            value |= (chunk & 0x1F) << (5 * shift)
            more = bool(chunk & 0x20)
            position += 1
            shift += 1
            if not more and chunk & 0x10:
                value |= -1 << (5 * shift)
        if len(runs) > 2:
            value += runs[-2]
        runs.append(value)
    flat = np.zeros(height * width, dtype=bool)
    start = 0
    for index, length in enumerate(runs):
        if index % 2:
            flat[start:start + length] = True
        start += length
    if start != height * width:
        raise ValueError(f"RLE de {start} píxeles para una máscara de {height} × {width}")
    return flat.reshape(width, height).T  # COCO guarda las máscaras por columnas.


def mask_to_label(mask: np.ndarray, res_m: float) -> Label | None:
    """Centro y diámetro equivalente (círculo de igual área) de un bloque marcado."""
    rows, cols = np.nonzero(mask)
    if rows.size == 0:
        return None
    diameter = 2 * math.sqrt(rows.size / math.pi) * res_m
    return Label((cols.mean() + 0.5) * res_m, -(rows.mean() + 0.5) * res_m, diameter)


def image_id_of(file_name: str) -> str | None:
    """`ESP_017355_2260_RED_1242_image.png` -> `ESP_017355_2260`; None si no es HiRISE."""
    parts = file_name.split("_")
    if parts[0] != "ESP" or len(parts) < 3:
        return None
    return "_".join(parts[:3])


def load_patches(root: Path = BOULDERNET_DIR) -> list[Patch]:
    """Recortes HiRISE de Marte con sus bloques, ordenados por imagen y nombre."""
    base = root / "extracted" / DATASET
    records = json.loads((base / "json" / f"{DATASET}.json").read_text(encoding="utf-8"))
    geometries: dict[str, ImageGeometry] = {}
    patches = []
    for record in records:
        image_id = image_id_of(record["file_name"])
        if image_id is None:
            continue
        if image_id not in geometries:
            geometries[image_id] = read_label(root / "labels_pds" / f"{image_id}_RED.LBL")
        tif = base / "preprocessing" / record["dataset"] / "images"
        tif = tif / record["file_name"].replace(".png", ".tif")
        with rasterio.open(tif) as src:
            image = src.read(1)
            res_m = float(src.res[0])
            if not math.isclose(src.res[0], src.res[1], rel_tol=1e-3):
                raise ValueError(f"{tif.name}: píxeles no cuadrados {src.res}")
        if image.shape != (record["height"], record["width"]):
            raise ValueError(f"{tif.name}: forma {image.shape} distinta de la del JSON")
        labels = []
        for annotation in record["annotations"]:
            segmentation = annotation["segmentation"]
            height, width = segmentation["size"]
            label = mask_to_label(decode_rle(segmentation["counts"], height, width), res_m)
            if label is not None:
                labels.append(label)
        patches.append(
            Patch(
                name=record["file_name"].removesuffix("_image.png"),
                image_id=image_id,
                split=record["dataset"],
                image=image,
                res_m=res_m,
                geometry=geometries[image_id],
                labels=labels,
            )
        )
    if not patches:
        raise FileNotFoundError(f"No hay recortes HiRISE en {base}")
    return sorted(patches, key=lambda p: (p.image_id, p.name))


def scored(patch: Patch, items: list[Label]) -> list[Label]:
    """Solo lo que cae lejos del borde del recorte."""
    return [item for item in items if patch.inside(item.x_m, item.y_m)]


def shifted(items: list[Label], index: int) -> list[Label]:
    """Corre cada recorte a su propio lugar, para emparejar varios recortes de una vez."""
    return [Label(item.x_m + 10_000.0 * index, item.y_m, item.diameter_m) for item in items]


def main() -> None:
    from vision.boulders import detect_boulders
    from vision.evaluate import score

    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--root", type=Path, default=BOULDERNET_DIR)
    args = parser.parse_args()

    patches = load_patches(args.root)
    by_image: dict[str, tuple[list[Label], list[Label]]] = {}
    for index, patch in enumerate(patches):
        found = [
            Label(d.x_m, d.y_m, d.diameter_m)
            for d in detect_boulders(patch.image, patch.res_m, patch.geometry)
            if d.firm
        ]
        truth, detected = by_image.setdefault(patch.image_id, ([], []))
        truth.extend(shifted(scored(patch, patch.labels), index))
        detected.extend(shifted(scored(patch, found), index))
    for image_id, (truth, detected) in by_image.items():
        for min_diameter in (2.0, 3.0):
            result = score(truth, detected, min_diameter, res_m=patches[0].res_m)
            print(
                f"{image_id} >= {min_diameter:.0f} m: etiquetas {result.n_labels:4d} "
                f"P {result.precision:.2f} R {result.recall:.2f} F1 {result.f1:.2f}"
            )


if __name__ == "__main__":
    main()
