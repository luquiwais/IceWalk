"""Mide un catálogo de bloques: contra etiquetas a mano y contra una distribución publicada.

Uso (desde packages/model):
    python -m vision.evaluate labels --name test_eva
    python -m vision.evaluate sfd --catalog ../../data/processed/s1094b-tusberti/boulders.geojson \\
        --radius 564.19

`labels` da precisión, exhaustividad y F1 para diámetro >= 2 m (criterio de docs/plans/vision.md),
y el error de diámetro en píxeles. `sfd` da el conteo acumulado por km² y el índice de la ley de
potencias, para comparar con Tusberti et al. (febrero de 2022: índice -4.68 ± 0.15 sobre 1.8 m).
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

from vision.grid import REPO_ROOT
from vision.labels import LABEL_CROPS, LABELS_DIR, Label, load_labels

DEFAULT_CATALOG = REPO_ROOT / "data" / "processed" / "s1094b" / "boulders.geojson"
SFD_THRESHOLDS_M = [1.5, 1.8, 2.0, 3.0, 4.0]


@dataclass(frozen=True)
class Score:
    min_diameter_m: float
    n_labels: int
    """Etiquetas con diámetro >= min_diameter_m."""
    true_positives: int
    false_positives: int
    false_negatives: int
    precision: float
    recall: float
    f1: float
    median_diameter_error_px: float | None
    """Mediana de |diámetro detectado - anotado| en los aciertos, en píxeles de la imagen."""


def _match(labels: list[Label], found: list[Label]) -> list[tuple[int, int]]:
    """Empareja de a uno, de la pareja más cercana a la más lejana.

    Dos centros son el mismo bloque si distan menos que medio diámetro del mayor (mínimo 1 m).
    Busca con un árbol espacial: con miles de bloques, comparar todos contra todos no termina.
    """
    if not labels or not found:
        return []
    tree = cKDTree([(item.x_m, item.y_m) for item in found])
    largest = max(item.diameter_m for item in found)
    candidates = []
    for i, label in enumerate(labels):
        reach = max(1.0, 0.5 * max(label.diameter_m, largest))
        for j in tree.query_ball_point((label.x_m, label.y_m), reach):
            item = found[j]
            distance = math.hypot(label.x_m - item.x_m, label.y_m - item.y_m)
            if distance <= max(1.0, 0.5 * max(label.diameter_m, item.diameter_m)):
                candidates.append((distance, i, j))
    pairs, used_labels, used_found = [], set(), set()
    for _, i, j in sorted(candidates):
        if i not in used_labels and j not in used_found:
            used_labels.add(i)
            used_found.add(j)
            pairs.append((i, j))
    return pairs


def score(
    labels: list[Label], found: list[Label], min_diameter_m: float = 2.0, res_m: float = 0.25
) -> Score:
    """F1 para bloques de al menos `min_diameter_m`.

    Un bloque anotado grande cuenta como acierto si algo lo detecta, del tamaño que sea. Una
    detección grande sobre un bloque anotado más chico que el umbral no cuenta ni a favor ni en
    contra: el bloque existe, y el error es de tamaño, que se mide aparte.
    """
    pairs = _match(labels, found)
    matched_labels = {i for i, _ in pairs}
    matched_found = {j for _, j in pairs}
    big_labels = {i for i, label in enumerate(labels) if label.diameter_m >= min_diameter_m}
    tp = len(big_labels & matched_labels)
    fn = len(big_labels - matched_labels)
    fp = sum(
        1 for j, item in enumerate(found)
        if item.diameter_m >= min_diameter_m and j not in matched_found
    )
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    errors = [
        abs(found[j].diameter_m - labels[i].diameter_m) / res_m for i, j in pairs if i in big_labels
    ]
    return Score(
        min_diameter_m, len(big_labels), tp, fp, fn, precision, recall, f1,
        float(np.median(errors)) if errors else None,
    )


def catalog_objects(
    catalog: dict,
    bounds: tuple[float, float, float, float] | None = None,
    radius_m: float | None = None,
    visible_only: bool = True,
    blocks_only: bool = False,
) -> list[Label]:
    """Bloques del catálogo dentro de una ventana o de un círculo centrado en el origen.

    `blocks_only` deja afuera los de forma `indeterminate` (posibles montículos).
    """
    objects = []
    for feature in catalog["features"]:
        props = feature["properties"]
        if visible_only and props["persistence"] == "not_visible_latest":
            continue
        if blocks_only and props["form"] != "block":
            continue
        x, y = props["x_m"], props["y_m"]
        if bounds and not (bounds[0] <= x < bounds[2] and bounds[1] <= y < bounds[3]):
            continue
        if radius_m is not None and math.hypot(x, y) > radius_m:
            continue
        objects.append(Label(x, y, props["diameter_m"]))
    return objects


def cumulative_per_km2(
    diameters: np.ndarray, thresholds_m: list[float], area_km2: float
) -> dict[float, float]:
    """Bloques de diámetro >= cada umbral, por km²."""
    return {t: float((diameters >= t).sum() / area_km2) for t in thresholds_m}


def power_law_index(diameters: np.ndarray, xmin_m: float) -> tuple[float, float, int]:
    """Índice de la distribución acumulada N(>= D) ~ D^índice, su error y cuántos bloques usa.

    Máxima verosimilitud para una ley de potencias continua (Clauset et al. 2009, ec. 3.1), el
    método que cita Tusberti: el exponente diferencial es `1 + n / sum(ln(D / xmin))`, y el de la
    acumulada, uno menos, con signo negativo.
    """
    tail = diameters[diameters >= xmin_m]
    if tail.size < 2:
        raise ValueError(f"Hay menos de 2 bloques de {xmin_m} m o más")
    slope = tail.size / float(np.log(tail / xmin_m).sum())
    return -slope, slope / math.sqrt(tail.size), int(tail.size)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    commands = parser.add_subparsers(dest="command", required=True)

    by_labels = commands.add_parser("labels", help="F1 contra un recorte anotado a mano")
    by_labels.add_argument("--name", required=True, help="Recorte de vision.labels.LABEL_CROPS")
    by_labels.add_argument("--site", default="s1094b")
    by_labels.add_argument("--labels", type=Path, help="Por defecto, <carpeta>/<name>.geojson")
    by_labels.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    by_labels.add_argument("--min-diameter", type=float, default=2.0)

    sfd = commands.add_parser("sfd", help="Conteo acumulado e índice de la ley de potencias")
    sfd.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    sfd.add_argument("--radius", type=float, required=True, help="Círculo centrado en el cráter, m")
    sfd.add_argument("--xmin", type=float, default=1.8)
    sfd.add_argument("--blocks-only", action="store_true", help="Sin los de forma indeterminate")
    args = parser.parse_args()

    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    if args.command == "labels":
        bounds = LABEL_CROPS[args.site][args.name]
        labels = load_labels(args.labels or LABELS_DIR / f"{args.name}.geojson")
        result = score(labels, catalog_objects(catalog, bounds), args.min_diameter)
        print(json.dumps(asdict(result), indent=2))
    else:
        found = catalog_objects(catalog, radius_m=args.radius, blocks_only=args.blocks_only)
        diameters = np.array([item.diameter_m for item in found])
        area_km2 = math.pi * args.radius**2 / 1e6
        index, error, n = power_law_index(diameters, args.xmin)
        report = {
            "area_km2": round(area_km2, 4),
            "n_objects": len(found),
            "cumulative_per_km2": cumulative_per_km2(diameters, SFD_THRESHOLDS_M, area_km2),
            "power_law": {"xmin_m": args.xmin, "index": index, "error": error, "n": n},
        }
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
