"""Detecciones de una o dos fechas -> catálogo `boulders.geojson` y huella sobre la grilla.

Con dos imágenes alineadas (los dos ortos del par estéreo), cada bloque se busca en la otra fecha.
La otra fecha lo confirma si tiene una detección propia en el mismo lugar o, al menos, algo oscuro
donde cae su sombra (`Detection.other_depth_sigma`): una imagen más borrosa puede no medir un
bloque y aun así mostrar que está.

- confirmado por las dos: `persistent`; con dos detecciones firmes, las medidas se promedian;
- solo en la última, y la anterior no muestra nada ahí: `single_epoch`, con menos confianza
  (ruido o un rasgo que depende de la luz);
- solo en la anterior, y la última no muestra nada ahí: `not_visible_latest`. No es
  "desapareció": puede ser hielo que sublimó, que quedó cubierto, o una detección falsa. El
  planificador lo trata como no resuelto;
- la otra fecha no tiene dato ahí: `single_epoch`, sin castigo.

La composición queda `indeterminate`: sin color no se distingue roca de hielo (Wójcicka et al.
2025), y este catálogo sale de la banda roja.

La forma es `block` si la sombra es chica o de borde nítido, e `indeterminate` si es ancha y de
borde blando: hay relieve con sombra, pero puede ser un montículo del terreno y no un bloque
suelto. Las dos cuentan como obstáculo en `rasterize`.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.spatial import cKDTree

from vision.boulders import DEFAULT_PARAMS, DETECTION_LIMIT_M, Detection
from vision.grid import Grid

UNCONFIRMED_FACTOR = 0.6
"""Baja de confianza de un bloque que la otra fecha, con dato en el lugar, no muestra.
Sin calibrar."""
MIN_COVERAGE = 0.5
"""Fracción mínima de píxeles con dato para decir que una celda está dentro de la huella."""


@dataclass(frozen=True)
class Epoch:
    image_id: str
    detections: list[Detection]
    coverage: np.ndarray
    """Fracción con dato por celda de la grilla, dentro de `bounds` (fila 0 = borde norte)."""
    bounds: tuple[float, float, float, float]


@dataclass(frozen=True)
class CatalogObject:
    x_m: float
    y_m: float
    diameter_m: float
    height_m: float
    persistence: str
    last_seen_image: str
    confidence: float
    evidence: tuple[str, ...]
    form: str = "block"


def form_of(*detections: Detection) -> str:
    """`block` si alguna de las medidas es chica o nítida; si no, `indeterminate`."""
    for found in detections:
        if (
            found.diameter_m <= DEFAULT_PARAMS.large_diameter_m
            or found.sharpness >= DEFAULT_PARAMS.pair_sharpness
        ):
            return "block"
    return "indeterminate"


def match_radius_m(a: Detection, b: Detection) -> float:
    """Dos detecciones son el mismo bloque si sus centros distan menos que medio diámetro."""
    return max(1.0, 0.5 * max(a.diameter_m, b.diameter_m))


def _nearest(sources: list[Detection], targets: list[Detection]) -> list[int | None]:
    """Para cada detección de `sources`, el índice de su pareja más cercana en `targets`."""
    if not sources or not targets:
        return [None] * len(sources)
    tree = cKDTree([(t.x_m, t.y_m) for t in targets])
    largest = max(max(d.diameter_m for d in sources), max(d.diameter_m for d in targets))
    pairs: list[int | None] = []
    for source in sources:
        best = None
        for index in tree.query_ball_point((source.x_m, source.y_m), max(1.0, 0.5 * largest)):
            target = targets[index]
            distance = float(np.hypot(source.x_m - target.x_m, source.y_m - target.y_m))
            if distance <= match_radius_m(source, target) and (best is None or distance < best[0]):
                best = (distance, index)
        pairs.append(best[1] if best else None)
    return pairs


def _both(a: float, b: float) -> float:
    """Confianza de dos evidencias independientes."""
    return 1 - (1 - a) * (1 - b)


def _other_date(found: Detection, paired: bool, presence_sigma: float) -> str:
    """Qué dice la otra fecha de un bloque: "confirmed", "absent" o "unknown" (sin dato)."""
    if paired:
        return "confirmed"
    if found.other_depth_sigma is None:
        return "unknown"
    return "confirmed" if found.other_depth_sigma >= presence_sigma else "absent"


def merge_epochs(
    latest: Epoch,
    earlier: Epoch | None,
    presence_sigma: float = DEFAULT_PARAMS.presence_sigma,
) -> list[CatalogObject]:
    """Cruza las detecciones de la última imagen con las de una anterior ya alineada."""

    def item(
        found, diameter, height, persistence, image_id, confidence, multitemporal, other=None
    ):
        evidence = ("shadow", "multitemporal") if multitemporal else ("shadow",)
        measures = (found, other) if other is not None and other.firm else (found,)
        return CatalogObject(
            found.x_m, found.y_m, diameter, height, persistence, image_id, confidence, evidence,
            form_of(*measures),
        )

    if earlier is None:
        return [
            item(d, d.diameter_m, d.height_m, "single_epoch", latest.image_id, d.confidence, False)
            for d in latest.detections
            if d.firm
        ]

    objects = []
    in_earlier = _nearest(latest.detections, earlier.detections)
    for found, pair in zip(latest.detections, in_earlier, strict=True):
        if not found.firm:
            continue
        diameter, height, confidence = found.diameter_m, found.height_m, found.confidence
        status = _other_date(found, pair is not None, presence_sigma)
        other = None
        if pair is not None:
            other = earlier.detections[pair]
            confidence = _both(confidence, other.confidence)
            if other.firm:  # Dos medidas con distinta incidencia: se promedian.
                diameter = (diameter + other.diameter_m) / 2
                height = (height + other.height_m) / 2
        if status == "confirmed":
            objects.append(
                item(
                    found, diameter, height, "persistent", latest.image_id, confidence, True,
                    other,
                )
            )
        else:
            factor = UNCONFIRMED_FACTOR if status == "absent" else 1.0
            objects.append(
                item(
                    found, diameter, height, "single_epoch", latest.image_id,
                    confidence * factor, False,
                )
            )

    in_latest = _nearest(earlier.detections, latest.detections)
    for found, pair in zip(earlier.detections, in_latest, strict=True):
        if not found.firm:
            continue
        confidence = found.confidence
        if pair is not None:
            other = latest.detections[pair]
            if other.firm:
                continue  # Ya entró arriba, desde la última imagen.
            confidence = _both(confidence, other.confidence)
        status = _other_date(found, pair is not None, presence_sigma)
        if status == "confirmed":  # La última imagen lo muestra, pero no llega a medirlo.
            objects.append(
                item(
                    found, found.diameter_m, found.height_m, "persistent", latest.image_id,
                    confidence, True,
                )
            )
        elif status == "absent":
            objects.append(
                item(
                    found, found.diameter_m, found.height_m, "not_visible_latest",
                    earlier.image_id, confidence * UNCONFIRMED_FACTOR, True,
                )
            )
        else:
            objects.append(
                item(
                    found, found.diameter_m, found.height_m, "single_epoch", earlier.image_id,
                    confidence, False,
                )
            )
    return objects


def build_catalog(
    objects: list[CatalogObject],
    grid: Grid,
    source_images: list[str],
    generated_by: str,
    detection_limit_m: float = DETECTION_LIMIT_M,
) -> dict:
    """GeoJSON según `packages/contracts/schemas/boulders.schema.json`. Nunca `is_mock`."""
    ordered = sorted(objects, key=lambda o: (-o.y_m, o.x_m))
    features = [
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": list(grid.xy_to_lonlat(item.x_m, item.y_m)),
            },
            "properties": {
                "id": f"B{index + 1:06d}",
                "x_m": round(item.x_m, 2),
                "y_m": round(item.y_m, 2),
                "diameter_m": round(item.diameter_m, 2),
                "height_m": round(item.height_m, 2),
                "height_source": "shadow",
                "composition": "indeterminate",
                "form": item.form,
                "persistence": item.persistence,
                "last_seen_image": item.last_seen_image,
                "confidence": round(min(max(item.confidence, 0.0), 1.0), 3),
                "evidence": list(item.evidence),
                "method": "shadow",
            },
        }
        for index, item in enumerate(ordered)
    ]
    return {
        "type": "FeatureCollection",
        "site_id": grid.site_id,
        "is_mock": False,
        "generated_by": generated_by,
        "detection_limit_m": detection_limit_m,
        "source_images": source_images,
        "features": features,
    }


def footprint_on_grid(epoch: Epoch, grid: Grid) -> np.ndarray:
    """True en las celdas de la grilla que la imagen cubre dentro de la ventana procesada.

    Fuera de la ventana queda False: ahí no se buscó, así que las capas van con `nodata`
    (desconocido), nunca con 0.
    """
    footprint = np.zeros((grid.height, grid.width), dtype=bool)
    xmin, _, _, ymax = epoch.bounds
    row = round((grid.ymax - ymax) / grid.cell_size_m)
    col = round((xmin - grid.xmin) / grid.cell_size_m)
    rows, cols = epoch.coverage.shape
    footprint[row:row + rows, col:col + cols] = epoch.coverage >= MIN_COVERAGE
    return footprint
