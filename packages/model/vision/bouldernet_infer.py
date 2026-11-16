"""BoulderNet (Mask R-CNN de Prieur et al. 2023) sobre los recortes de Marte y sobre S1094b.

Corre en un entorno aparte con detectron2, nunca en el de la API: ver
`docs/plans/vision-bouldernet.md`. Los pesos y la configuración salen de `best_model.zip`
(Zenodo 8171052, CC BY 4.0) extraído en `data/raw/bouldernet/best_model/`.

Uso (desde packages/model):
    # 1. Elegir el umbral de score en la partición de validación (nunca en la de test)
    python -m vision.bouldernet_infer eval --split validation
    # 2. Medir una sola vez en test, con el umbral ya elegido, contra el detector de sombras
    python -m vision.bouldernet_infer eval --split test --score-thresh 0.5
    # 3. Catálogo y capas de S1094b, en una carpeta aparte para comparar
    python -m vision.bouldernet_infer site --score-thresh 0.5

Lo que se puntúa es lo mismo que en `vision.bouldernet`: centros y diámetro equivalente, con el
emparejamiento de `vision.evaluate.score`, así que los números se comparan con los de sombras.
La altura no sale de BoulderNet: se toma del catálogo de sombras cuando hay pareja; si no, va
`null` (el planificador lo trata como obstáculo).
"""

from __future__ import annotations

import argparse
import json
import math
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

from vision.bouldernet import BOULDERNET_DIR, Patch, load_patches, scored, shifted
from vision.boulders import snap_bounds
from vision.crops import read_window
from vision.evaluate import score
from vision.grid import REPO_ROOT, Grid, load_grid
from vision.labels import Label
from vision.pds import read_label
from vision.rasterize import rasterize_catalog, write_cog
from vision.run import PROCESSED_DIR, RAW_DIR, SITES

MODEL_DIR = BOULDERNET_DIR / "best_model"
WEIGHTS = "model_0055999.pth"
"""Los autores recomiendan este y no el último (`model_0063999.pth`), para no sobreajustar."""
PATCH_PX = 500
"""Tamaño de los recortes de entrenamiento: cada ventana de inferencia tiene el mismo."""
RES_M = 0.5
"""BoulderNet se entrenó con HiRISE a ~0.5 m/px; los ortos de 25 cm se promedian de a 2 × 2."""
DETECTION_LIMIT_PX = 6
"""Mismo criterio que el detector de sombras (`vision.boulders.DETECTION_LIMIT_M`): 6 píxeles."""
TRAIN_LEVELS = (48.0, 210.0)
"""Percentiles 1 y 99 de los píxeles con dato de los recortes de Marte de la partición `train`
(39 recortes, 9.6 M píxeles). Los ortos de S1094b vienen estirados distinto (abril: mediana 219,
desvío 8; los recortes, 115-157 y 9-59): se llevan a este rango antes de inferir."""
SWEEP = (0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)
GENERATED_BY = (
    "packages/model/vision/bouldernet_infer.py (BoulderNet Mask R-CNN, Prieur et al. 2023, "
    "Zenodo 8171052, CC BY 4.0)"
)


@dataclass(frozen=True)
class Found:
    """Una máscara de BoulderNet: centro y diámetro equivalente, en las unidades del llamador."""

    x: float
    y: float
    diameter: float
    score: float


# --- Modelo -------------------------------------------------------------------------------


def find_config(model_dir: Path) -> Path:
    """`config.yaml`: la configuración completa (base + Mars-Moon-Earth) con la que entrenaron."""
    for candidate in sorted(model_dir.rglob("config.yaml")):
        return candidate
    raise FileNotFoundError(f"No hay config.yaml en {model_dir}: extraé best_model.zip ahí")


class _Inert:
    """Lo que no es tensor en el checkpoint (optimizador, scheduler): se ignora sin ejecutarlo."""

    def __new__(cls, *args, **kwargs):
        return object.__new__(cls)

    def __init__(self, *args, **kwargs):
        pass

    def __call__(self, *args, **kwargs):
        return _Inert()

    def __setstate__(self, state):
        pass


_ALLOWED = {
    ("collections", "OrderedDict"),
    ("collections", "defaultdict"),
    ("__builtin__", "dict"),
    ("builtins", "dict"),
    ("torch._utils", "_rebuild_tensor_v2"),
    ("torch._utils", "_rebuild_parameter"),
}


class _RestrictedPickle:
    """`pickle_module` para `torch.load`: solo reconstruye tensores y diccionarios.

    El checkpoint publicado guarda también el estado del entrenamiento, y ahí un `getattr` sobre
    el scheduler (`CyclicLR.scale_fn`), por eso `weights_only=True` lo rechaza. Datos de terceros =
    datos: en vez de habilitar `getattr`, todo lo que no está en `_ALLOWED` se vuelve inerte.
    """

    import pickle as _pickle

    class Unpickler(_pickle.Unpickler):
        def find_class(self, module, name):
            if (module, name) in _ALLOWED:
                return super().find_class(module, name)
            return _Inert

    load = _pickle.load


def clean_weights(model_dir: Path = MODEL_DIR) -> Path:
    """`model_0055999.pth` -> `model_0055999.model_only.pth`, solo con los pesos del modelo.

    El archivo limpio se carga con `weights_only=True` (lo que hace detectron2 con torch >= 2.6).
    """
    import torch

    source = next(model_dir.rglob(WEIGHTS), None)
    if source is None:  # Solo el archivo limpio, copiado de otra máquina.
        cleaned = next(model_dir.rglob(WEIGHTS.replace(".pth", ".model_only.pth")), None)
        if cleaned is not None:
            return cleaned
        raise FileNotFoundError(f"No está {WEIGHTS} en {model_dir}: extraé best_model.zip ahí")
    target = source.with_name(source.stem + ".model_only.pth")
    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        return target
    checkpoint = torch.load(
        source, map_location="cpu", weights_only=False, pickle_module=_RestrictedPickle
    )
    state = checkpoint["model"]
    if not state or not all(isinstance(v, torch.Tensor) for v in state.values()):
        raise ValueError(f"{source.name}: 'model' no es un diccionario de tensores")
    torch.save({"model": dict(state), "__author__": "Prieur et al. 2023 (CC BY 4.0)"}, target)
    torch.load(target, map_location="cpu", weights_only=True)  # Que cargue en modo seguro.
    return target


class Predictor:
    """Lo mismo que `detectron2.engine.DefaultPredictor`, sin importar `detectron2.engine`.

    `engine` arrastra el evaluador COCO, que necesita la extensión compilada (`detectron2._C`).
    Mask R-CNN no la usa (ROIAlign y NMS vienen de torchvision), así que con esto detectron2 anda
    sin compilar: en Windows no hacen falta MSVC ni el toolkit de CUDA.
    """

    def __init__(self, cfg):
        import detectron2.data.transforms as T
        from detectron2.checkpoint import DetectionCheckpointer
        from detectron2.modeling import build_model

        self.cfg = cfg
        self.model = build_model(cfg).eval()
        DetectionCheckpointer(self.model).load(cfg.MODEL.WEIGHTS)
        self.resize = T.ResizeShortestEdge(
            [cfg.INPUT.MIN_SIZE_TEST, cfg.INPUT.MIN_SIZE_TEST], cfg.INPUT.MAX_SIZE_TEST
        )

    def __call__(self, image: np.ndarray) -> dict:
        import torch

        with torch.no_grad():
            if self.cfg.INPUT.FORMAT == "RGB":
                image = image[:, :, ::-1]
            height, width = image.shape[:2]
            resized = self.resize.get_transform(image).apply_image(image)
            tensor = torch.as_tensor(resized.astype("float32").transpose(2, 0, 1))
            inputs = {"image": tensor.to(self.cfg.MODEL.DEVICE), "height": height, "width": width}
            return self.model([inputs])[0]


def load_predictor(model_dir: Path = MODEL_DIR, device: str | None = None, min_score: float = 0.05):
    """Mask R-CNN de detectron2 con los pesos publicados. Import tardío: es opcional."""
    import torch
    from detectron2.config import get_cfg

    config = find_config(model_dir)
    weights = clean_weights(model_dir)
    cfg = get_cfg()
    cfg.set_new_allowed(True)  # El config de MLtools trae claves propias.
    cfg.merge_from_file(str(config))
    cfg.MODEL.WEIGHTS = str(weights)
    cfg.MODEL.DEVICE = device or ("cuda" if torch.cuda.is_available() else "cpu")
    # Umbral bajo acá y el de verdad después: así un barrido usa una sola pasada.
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = min_score
    cfg.TEST.DETECTIONS_PER_IMAGE = max(int(cfg.TEST.DETECTIONS_PER_IMAGE), 2000)
    cfg.freeze()
    return Predictor(cfg), cfg


def to_model_input(image: np.ndarray, valid: np.ndarray | None = None) -> np.ndarray:
    """Gris de 8 bits -> H × W × 3. Sin dato se rellena con la mediana, para no inventar bordes."""
    if image.dtype != np.uint8:
        raise ValueError(f"Se espera uint8 como en el dataset, llegó {image.dtype}")
    image = image.copy()
    if valid is not None and not valid.all():
        image[~valid] = np.uint8(np.median(image[valid])) if valid.any() else 0
    return np.repeat(image[:, :, None], 3, axis=2)


def predict(predictor, image: np.ndarray, valid: np.ndarray | None = None) -> list[Found]:
    """Máscaras -> centro (columna, fila en píxeles, al centro del píxel) y diámetro en píxeles."""
    outputs = predictor(to_model_input(image, valid))["instances"].to("cpu")
    if len(outputs) == 0:
        return []
    masks = outputs.pred_masks.numpy()
    scores = outputs.scores.numpy()
    found = []
    for mask, value in zip(masks, scores, strict=True):
        rows, cols = np.nonzero(mask)
        if rows.size == 0:
            continue
        found.append(
            Found(
                float(cols.mean() + 0.5),
                float(rows.mean() + 0.5),
                2 * math.sqrt(rows.size / math.pi),
                float(value),
            )
        )
    return found


# --- Medición en el dataset ---------------------------------------------------------------


def _labels(found: list[Found], res_m: float, min_score: float) -> list[Label]:
    """Píxeles del recorte -> metros desde la esquina noroeste, como `vision.bouldernet`."""
    return [
        Label(item.x * res_m, -item.y * res_m, item.diameter * res_m)
        for item in found
        if item.score >= min_score
    ]


def evaluate_split(
    split: str,
    thresholds: list[float],
    model_dir: Path,
    device: str | None,
    with_shadow: bool,
    use_stretch: bool = False,
) -> None:
    """F1 por imagen y en conjunto, para cada umbral; y el detector de sombras en los mismos."""
    patches = [p for p in load_patches() if p.split == split]
    if not patches:
        raise SystemExit(f"No hay recortes de Marte en la partición {split}")
    predictor, _ = load_predictor(model_dir, device, min(thresholds))
    raw: list[tuple[Patch, list[Found]]] = []
    started = time.perf_counter()
    for patch in patches:
        image = patch.image
        if use_stretch:  # El mismo estiramiento que en el sitio, con los niveles del recorte.
            valid = image > 0
            image = stretch(image, valid, levels_of(image, valid))
        raw.append((patch, predict(predictor, image)))
    seconds = time.perf_counter() - started
    print(
        f"partición {split}: {len(patches)} recortes de {len({p.image_id for p in patches})} "
        f"imágenes, {sum(len(p.labels) for p in patches)} bloques marcados, "
        f"inferencia {seconds:.1f} s"
    )

    def table(name: str, detected_by_patch: list[list[Label]]) -> dict[float, float]:
        pooled: dict[float, float] = {}
        by_image: dict[str, tuple[list[Label], list[Label]]] = {}
        all_truth: list[Label] = []
        all_found: list[Label] = []
        for index, (patch, found) in enumerate(zip(patches, detected_by_patch, strict=True)):
            truth = shifted(scored(patch, patch.labels), index)
            hits = shifted(scored(patch, found), index)
            by_image.setdefault(patch.image_id, ([], []))[0].extend(truth)
            by_image[patch.image_id][1].extend(hits)
            all_truth.extend(truth)
            all_found.extend(hits)
        res_m = patches[0].res_m
        for image_id, (truth, hits) in sorted(by_image.items()):
            line = []
            for min_diameter in (2.0, 3.0):
                result = score(truth, hits, min_diameter, res_m=res_m)
                line.append(
                    f">= {min_diameter:.0f} m: n {result.n_labels:4d} P {result.precision:.2f} "
                    f"R {result.recall:.2f} F1 {result.f1:.2f}"
                )
            print(f"  {name:<22} {image_id}  " + " | ".join(line))
        for min_diameter in (2.0, 3.0):
            result = score(all_truth, all_found, min_diameter, res_m=res_m)
            pooled[min_diameter] = result.f1
            print(
                f"  {name:<22} TODAS            >= {min_diameter:.0f} m: n {result.n_labels:4d} "
                f"P {result.precision:.2f} R {result.recall:.2f} F1 {result.f1:.2f} "
                f"(TP {result.true_positives} FP {result.false_positives} "
                f"FN {result.false_negatives})"
            )
        return pooled

    best: dict[float, tuple[float, float]] = {}
    for threshold in thresholds:
        print(f"BoulderNet, score >= {threshold:.2f}")
        pooled = table(
            f"bouldernet@{threshold:.2f}",
            [_labels(found, patch.res_m, threshold) for patch, found in raw],
        )
        for min_diameter, f1 in pooled.items():
            if f1 > best.get(min_diameter, (-1.0, 0.0))[0]:
                best[min_diameter] = (f1, threshold)
    if len(thresholds) > 1:
        for min_diameter, (f1, threshold) in sorted(best.items()):
            print(
                f"mejor umbral en {split} para >= {min_diameter:.0f} m: {threshold} "
                f"(F1 {f1:.2f})"
            )
    if with_shadow:
        from vision.boulders import detect_boulders

        print("Detector de sombras (firmes), mismos recortes")
        table(
            "sombras",
            [
                [
                    Label(d.x_m, d.y_m, d.diameter_m)
                    for d in detect_boulders(patch.image, patch.res_m, patch.geometry)
                    if d.firm
                ]
                for patch in patches
            ],
        )


# --- Sitio --------------------------------------------------------------------------------


def downsample(image: np.ndarray, factor: int) -> tuple[np.ndarray, np.ndarray]:
    """Promedio de bloques `factor` × `factor` (no bilineal: así no hay aliasing). 0 = sin dato.

    Un bloque con algún píxel sin dato queda sin dato entero.
    """
    if factor == 1:
        return image, image > 0
    rows, cols = image.shape[0] // factor, image.shape[1] // factor
    blocks = image[: rows * factor, : cols * factor].reshape(rows, factor, cols, factor)
    valid = (blocks > 0).all(axis=(1, 3))
    mean = blocks.astype(np.float32).mean(axis=(1, 3))
    out = np.where(valid, np.clip(np.rint(mean), 1, 255), 0).astype(np.uint8)
    return out, valid


def levels_of(image: np.ndarray, valid: np.ndarray | None = None) -> tuple[float, float]:
    """Percentiles 1 y 99 de los píxeles con dato."""
    values = image[valid] if valid is not None else image[image > 0]
    if values.size == 0:
        raise ValueError("Sin píxeles con dato")
    low, high = np.percentile(values, [1, 99])
    return float(low), float(high)


def stretch(
    image: np.ndarray,
    valid: np.ndarray,
    levels: tuple[float, float],
    target: tuple[float, float] = TRAIN_LEVELS,
) -> np.ndarray:
    """Lineal: `levels` (1 y 99 % de la imagen) -> `target` (1 y 99 % del entrenamiento).

    Sin dato sigue en 0; lo demás queda en 1-255.
    """
    low, high = levels
    if high <= low:
        return image
    scaled = (image.astype(np.float32) - low) / (high - low) * (target[1] - target[0]) + target[0]
    return np.where(valid, np.clip(np.rint(scaled), 1, 255), 0).astype(np.uint8)


def site_levels(
    path: Path,
    grid: Grid,
    bounds: tuple[float, float, float, float],
    n_side: int = 4,
    size_m: float = 150.0,
    native_res_m: float = 0.25,
) -> tuple[float, float]:
    """Percentiles 1 y 99 de una imagen en la ventana, con `n_side`² muestras repartidas.

    Leer la ventana entera no termina (`EXPERIMENTS.md`, 13/11); las muestras alcanzan para dos
    percentiles, y son los mismos para todas las teselas: el estiramiento no cambia de una a otra.
    """
    xmin, ymin, xmax, ymax = bounds
    factor = round(RES_M / native_res_m)
    samples = []
    for fx in (np.arange(n_side) + 0.5) / n_side:
        for fy in (np.arange(n_side) + 0.5) / n_side:
            x = xmin + fx * (xmax - xmin)
            y = ymin + fy * (ymax - ymin)
            half = size_m / 2
            image = read_window(path, grid, (x - half, y - half, x + half, y + half), native_res_m)
            sample, usable = downsample(image, factor)
            samples.append(sample[usable])
    values = np.concatenate(samples)
    if values.size == 0:
        raise ValueError(f"{path.name}: sin dato en las muestras de la ventana")
    low, high = np.percentile(values, [1, 99])
    return float(low), float(high)


def _starts(length: int, patch: int, stride: int) -> list[int]:
    if length <= patch:
        return [0]
    starts = list(range(0, length - patch, stride))
    return starts + [length - patch]


def dedupe(found: list[Found]) -> list[Found]:
    """Las ventanas se solapan: el mismo bloque puede salir dos veces. Gana el de mayor score."""
    if not found:
        return []
    ordered = sorted(found, key=lambda f: -f.score)
    tree = cKDTree([(f.x, f.y) for f in ordered])
    taken = np.zeros(len(ordered), dtype=bool)
    kept = []
    for index, item in enumerate(ordered):
        if taken[index]:
            continue
        kept.append(item)
        for other in tree.query_ball_point((item.x, item.y), max(1.0, 0.5 * item.diameter)):
            taken[other] = True
    return kept


def detect_site(
    predictor,
    path: Path,
    grid: Grid,
    bounds: tuple[float, float, float, float],
    min_score: float,
    tile_m: float = 500.0,
    margin_m: float = 50.0,
    stride_px: int = 400,
    native_res_m: float = 0.25,
    levels: tuple[float, float] | None = None,
) -> tuple[list[Found], np.ndarray]:
    """Detecciones en metros de la grilla y fracción con dato por celda (fila 0 = norte)."""
    factor = round(RES_M / native_res_m)
    cell = grid.cell_size_m
    per_cell = round(cell / native_res_m)
    xmin, ymin, xmax, ymax = bounds
    coverage = np.zeros((round((ymax - ymin) / cell), round((xmax - xmin) / cell)), np.float32)
    found: list[Found] = []
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
            image = read_window(path, grid, read, native_res_m)
            # Cobertura de la tesela, como en `vision.boulders.detect_epochs_in_window`.
            r0 = round((read[3] - tile_y1) / native_res_m)
            c0 = round((tile_x0 - read[0]) / native_res_m)
            rows = round((tile_y1 - tile_y0) / cell)
            cols = round((tile_x1 - tile_x0) / cell)
            core = image[r0:r0 + rows * per_cell, c0:c0 + cols * per_cell] > 0
            row = round((ymax - tile_y1) / cell)
            col = round((tile_x0 - xmin) / cell)
            coverage[row:row + rows, col:col + cols] = core.reshape(
                rows, per_cell, cols, per_cell
            ).mean(axis=(1, 3))
            if not core.any():
                continue

            small, valid = downsample(image, factor)
            if levels is not None:
                small = stretch(small, valid, levels)
            for top in _starts(small.shape[0], PATCH_PX, stride_px):
                for left in _starts(small.shape[1], PATCH_PX, stride_px):
                    window = small[top:top + PATCH_PX, left:left + PATCH_PX]
                    usable = valid[top:top + PATCH_PX, left:left + PATCH_PX]
                    if usable.mean() < 0.2:
                        continue
                    for item in predict(predictor, window, usable):
                        if item.score < min_score:
                            continue
                        r, c = int(item.y), int(item.x)
                        if not usable[min(r, usable.shape[0] - 1), min(c, usable.shape[1] - 1)]:
                            continue
                        x_m = read[0] + (left + item.x) * RES_M
                        y_m = read[3] - (top + item.y) * RES_M
                        if tile_x0 <= x_m < tile_x1 and tile_y0 <= y_m < tile_y1:
                            found.append(Found(x_m, y_m, item.diameter * RES_M, item.score))
    return dedupe(found), coverage


def _radius(a: float, b: float) -> float:
    """Mismo criterio que `vision.catalog.match_radius_m`: medio diámetro del mayor, mínimo 1 m."""
    return max(1.0, 0.5 * max(a, b))


def _pairs(sources: list[Found], targets: list[Found]) -> dict[int, int]:
    """Emparejamiento de a uno, del par más cercano al más lejano."""
    if not sources or not targets:
        return {}
    tree = cKDTree([(t.x, t.y) for t in targets])
    largest = max(t.diameter for t in targets)
    candidates = []
    for i, item in enumerate(sources):
        for j in tree.query_ball_point((item.x, item.y), _radius(item.diameter, largest)):
            other = targets[j]
            distance = math.hypot(item.x - other.x, item.y - other.y)
            if distance <= _radius(item.diameter, other.diameter):
                candidates.append((distance, i, j))
    pairs: dict[int, int] = {}
    used: set[int] = set()
    for _, i, j in sorted(candidates):
        if i not in pairs and j not in used:
            pairs[i] = j
            used.add(j)
    return pairs


def shadow_heights(catalog_path: Path) -> tuple[list[Found], list[float]]:
    """Objetos del catálogo de sombras con altura, para heredarla por emparejamiento."""
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    objects, heights = [], []
    for feature in catalog["features"]:
        props = feature["properties"]
        if props["height_m"] is None or props["persistence"] == "not_visible_latest":
            continue
        objects.append(Found(props["x_m"], props["y_m"], props["diameter_m"], 1.0))
        heights.append(float(props["height_m"]))
    return objects, heights


def build_catalog(
    latest: tuple[str, list[Found]],
    earlier: tuple[str, list[Found]] | None,
    shadow: tuple[list[Found], list[float]],
    grid: Grid,
    detection_limit_m: float,
) -> dict:
    """GeoJSON según `packages/contracts/schemas/boulders.schema.json`, `method: bouldernet`.

    Dos fechas: lo que aparece en las dos es `persistent`; lo que aparece en una sola es
    `single_epoch` en esa fecha. No se marca `not_visible_latest`: que la red no encuentre algo
    no prueba que no esté, y esa etiqueta saca el bloque de los obstáculos.
    """
    latest_id, latest_found = latest
    objects: list[tuple[Found, str, str, bool]] = []  # bloque, persistencia, imagen, dos fechas
    if earlier is None:
        objects = [(f, "single_epoch", latest_id, False) for f in latest_found]
    else:
        earlier_id, earlier_found = earlier
        pairs = _pairs(latest_found, earlier_found)
        for i, item in enumerate(latest_found):
            if i in pairs:
                other = earlier_found[pairs[i]]
                merged = Found(
                    item.x,
                    item.y,
                    (item.diameter + other.diameter) / 2,
                    1 - (1 - item.score) * (1 - other.score),
                )
                objects.append((merged, "persistent", latest_id, True))
            else:
                objects.append((item, "single_epoch", latest_id, False))
        matched = set(pairs.values())
        objects.extend(
            (item, "single_epoch", earlier_id, False)
            for j, item in enumerate(earlier_found)
            if j not in matched
        )

    shadow_objects, heights = shadow
    height_of = _pairs([o for o, *_ in objects], shadow_objects)
    ordered = sorted(enumerate(objects), key=lambda pair: (-pair[1][0].y, pair[1][0].x))
    features = []
    for number, (index, (item, persistence, image_id, both)) in enumerate(ordered, start=1):
        height = heights[height_of[index]] if index in height_of else None
        evidence = ["appearance"]
        if both:
            evidence.append("multitemporal")
        if height is not None:
            evidence.append("shadow")
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": list(grid.xy_to_lonlat(item.x, item.y)),
                },
                "properties": {
                    "id": f"B{number:06d}",
                    "x_m": round(item.x, 2),
                    "y_m": round(item.y, 2),
                    "diameter_m": round(item.diameter, 2),
                    "height_m": None if height is None else round(height, 2),
                    "height_source": None if height is None else "shadow",
                    "composition": "indeterminate",
                    # Entrenado para bloques sobre el terreno: no separa manchas.
                    "form": "block",
                    "persistence": persistence,
                    "last_seen_image": image_id,
                    "confidence": round(min(max(item.score, 0.0), 1.0), 3),
                    "evidence": evidence,
                    "method": "bouldernet",
                },
            }
        )
    return {
        "type": "FeatureCollection",
        "site_id": grid.site_id,
        "is_mock": False,
        "generated_by": GENERATED_BY,
        "detection_limit_m": detection_limit_m,
        "source_images": [latest_id] + ([earlier[0]] if earlier else []),
        "features": features,
    }


def run_site(
    site_id: str,
    zone: str,
    out_dir: Path,
    min_score: float,
    model_dir: Path,
    device: str | None,
    shadow_catalog: Path,
    raw_dir: Path = RAW_DIR,
    bounds: tuple[float, float, float, float] | None = None,
    use_stretch: bool = True,
) -> dict:
    grid = load_grid()
    site = SITES[site_id]
    if grid.site_id != site_id:
        raise ValueError(f"La grilla es de {grid.site_id}, no de {site_id}")
    if out_dir.resolve() == (PROCESSED_DIR / site_id).resolve():
        raise SystemExit(f"No piso {out_dir}: primero se compara (plans/vision-bouldernet.md)")
    window = snap_bounds(bounds or site.zones[zone], grid)
    images = [image for image in (site.latest, site.earlier) if image is not None]
    for image in images:
        for name in (image.ortho, image.label):
            if not (raw_dir / name).exists():
                raise FileNotFoundError(f"Falta {raw_dir / name}. Ver `python data/download.py`")

    predictor, cfg = load_predictor(model_dir, device, min_score)
    per_image = []
    started = time.perf_counter()
    levels = {}
    for image in images:
        path = raw_dir / image.ortho
        levels[image.image_id] = site_levels(path, grid, window) if use_stretch else None
        found, coverage = detect_site(
            predictor, path, grid, window, min_score, levels=levels[image.image_id]
        )
        per_image.append((image, found, coverage))
        print(
            f"{image.image_id}: {len(found)} bloques, niveles {levels[image.image_id]} "
            f"({time.perf_counter() - started:.0f} s)"
        )
    seconds = time.perf_counter() - started

    detection_limit_m = DETECTION_LIMIT_PX * RES_M
    latest = (per_image[0][0].image_id, per_image[0][1])
    earlier = (per_image[1][0].image_id, per_image[1][1]) if len(per_image) > 1 else None
    catalog = build_catalog(latest, earlier, shadow_heights(shadow_catalog), grid,
                            detection_limit_m)

    from vision.catalog import MIN_COVERAGE

    footprint = np.zeros((grid.height, grid.width), dtype=bool)
    row = round((grid.ymax - window[3]) / grid.cell_size_m)
    col = round((window[0] - grid.xmin) / grid.cell_size_m)
    coverage = per_image[0][2]
    footprint[row:row + coverage.shape[0], col:col + coverage.shape[1]] = coverage >= MIN_COVERAGE
    layers = rasterize_catalog(catalog, grid, footprint)

    out_dir.mkdir(parents=True, exist_ok=True)
    tags = {
        "is_mock": "false",
        "detection_limit_m": str(detection_limit_m),
        "source_images": ",".join(catalog["source_images"]),
        "credit": "NASA/JPL-Caltech/UArizona; BoulderNet: Prieur et al. 2023, CC BY 4.0",
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
        "bounds_m": list(window),
        "detection_limit_m": detection_limit_m,
        "model": {
            "weights": WEIGHTS,
            "config": str(find_config(model_dir).relative_to(model_dir)),
            "device": cfg.MODEL.DEVICE,
            "min_score": min_score,
            "res_m": RES_M,
            "patch_px": PATCH_PX,
            "stretch_to_train_levels": list(TRAIN_LEVELS) if use_stretch else None,
        },
        "images": [
            {
                "image_id": image.image_id,
                "incidence_deg": read_label(raw_dir / image.label).incidence_deg,
                "levels_p1_p99": levels[image.image_id],
                "detections": len(found),
            }
            for image, found, _ in per_image
        ],
        "shadow_catalog_for_heights": str(shadow_catalog.relative_to(REPO_ROOT))
        if shadow_catalog.is_relative_to(REPO_ROOT) else str(shadow_catalog),
        "detection_seconds": round(seconds, 1),
        "catalog": "boulders.geojson",
        "n_objects": len(props),
        "n_at_or_above_detection_limit": int((diameters >= detection_limit_m).sum()),
        "n_with_shadow_height": sum(p["height_m"] is not None for p in props),
        "persistence": {name: persistence.count(name) for name in sorted(set(persistence))},
        "cells_in_footprint": int(footprint.sum()),
        "cells_with_boulders": int(((layers["boulder_density"] > 0) & footprint).sum()),
        "min_clear_path_width_m": float(corridor[footprint].min()) if footprint.any() else None,
        "layers": sorted(layers),
        "credit": "HiRISE: NASA/JPL-Caltech/UArizona. BoulderNet: Prieur et al. (2023), CC BY 4.0",
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--model-dir", type=Path, default=MODEL_DIR)
    parser.add_argument("--device", help="cuda o cpu; por defecto, cuda si hay")
    sub = parser.add_subparsers(dest="command", required=True)

    ev = sub.add_parser("eval", help="F1 en una partición del dataset de BoulderNet")
    ev.add_argument("--split", choices=("train", "validation", "test"), default="validation")
    ev.add_argument("--score-thresh", type=float, help="Un solo umbral; sin esto, barre SWEEP")
    ev.add_argument("--no-shadow", action="store_true", help="No correr el detector de sombras")
    ev.add_argument("--stretch", action="store_true",
                    help="Estirar cada recorte a TRAIN_LEVELS, como en el sitio")

    site = sub.add_parser("site", help="Catálogo y capas de un sitio")
    site.add_argument("--site", default="s1094b", choices=sorted(SITES))
    site.add_argument("--zone", default="eva")
    site.add_argument("--bounds", type=float, nargs=4, metavar=("XMIN", "YMIN", "XMAX", "YMAX"))
    site.add_argument("--score-thresh", type=float, required=True,
                      help="El elegido en validación")
    site.add_argument("--shadow-catalog", type=Path,
                      default=PROCESSED_DIR / "s1094b" / "boulders.geojson")
    site.add_argument("--raw", type=Path, default=RAW_DIR)
    site.add_argument("--out", type=Path, help="Por defecto, data/processed/<sitio>-bouldernet")
    site.add_argument("--no-stretch", action="store_true",
                      help="Sin llevar los niveles a los del entrenamiento (como la 1.ª corrida)")
    args = parser.parse_args()

    if args.command == "eval":
        thresholds = [args.score_thresh] if args.score_thresh is not None else list(SWEEP)
        evaluate_split(
            args.split, thresholds, args.model_dir, args.device, not args.no_shadow, args.stretch
        )
    else:
        out_dir = args.out or PROCESSED_DIR / f"{args.site}-bouldernet"
        manifest = run_site(
            args.site, args.zone, out_dir, args.score_thresh, args.model_dir, args.device,
            args.shadow_catalog, args.raw, tuple(args.bounds) if args.bounds else None,
            not args.no_stretch,
        )
        print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
