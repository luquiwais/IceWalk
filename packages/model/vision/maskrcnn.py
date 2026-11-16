"""Detector aprendido de bloques: Mask R-CNN (torchvision) entrenado en GPU con datos de BoulderNet.

El detector de sombras da F1 0.13-0.49 contra los bloques marcados a mano de BoulderNet
(`docs/EXPERIMENTS.md`, 2026-11-14). Acá se entrena un Mask R-CNN propio con los mismos datos
(Prieur et al. 2023, Zenodo 8171052, CC BY 4.0) y se mide **dejando una imagen de Marte entera
afuera**: el modelo nunca ve un recorte de la imagen con la que se lo mide. Los pesos publicados de
BoulderNet se entrenaron con todo el dataset y usan detectron2; por eso no se usan para medir.

Partición por pliegue (una imagen HiRISE afuera):
- entrenamiento: todos los recortes de la Luna y la Tierra, y los recortes `train` de las otras tres
  imágenes de Marte;
- validación: los recortes `validation` de esas tres imágenes. Solo sirven para elegir el umbral de
  score, antes de mirar el test;
- test: **todos** los recortes de la imagen dejada afuera.

Uso (desde packages/model, en un entorno con torch y CUDA):
    python -m vision.maskrcnn cv                    # los 4 pliegues, tabla de F1
    python -m vision.maskrcnn cv --holdout ESP_037018_2170
    python -m vision.maskrcnn train --out ../../data/processed/maskrcnn/final.pt   # todo Marte

Pesos de partida: Mask R-CNN v2 de torchvision preentrenado en COCO (BSD-3). Nada de código de
terceros: del zip de BoulderNet se leen solo GeoTIFF y JSON.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio

from vision.bouldernet import (
    BOULDERNET_DIR,
    DATASET,
    decode_rle,
    image_id_of,
    load_patches,
    mask_to_label,
    scored,
    shifted,
)
from vision.grid import REPO_ROOT
from vision.labels import Label

MODEL_DIR = REPO_ROOT / "data" / "processed" / "maskrcnn"
MARS_IMAGES = ("ESP_017355_2260", "ESP_025650_2165", "ESP_028537_2270", "ESP_037018_2170")
UPSCALE = 2.0
"""Se agranda al doble: un bloque de 2 m mide ~4 px a 0.5 m/px."""
CROP_PX = 256
"""Entrenamiento con recortes aleatorios: menos máscaras por imagen, cuatro veces menos memoria."""
THRESHOLDS = (0.3, 0.4, 0.5, 0.6, 0.7, 0.8)
MASK_THRESHOLD = 0.5


@dataclass
class Sample:
    name: str
    group: str
    """Imagen de origen: id HiRISE para Marte, prefijo del archivo para Luna y Tierra."""
    split: str
    image: np.ndarray
    """float32 en [0, 1], ya estirada por percentiles."""
    masks: np.ndarray
    """bool, (n, alto, ancho)."""


def stretch(image: np.ndarray) -> np.ndarray:
    """Percentiles 1-99 a [0, 1]: los recortes vienen en 8 y 16 bits y con brillos distintos."""
    values = image.astype(np.float32)
    valid = values[values > 0]
    if valid.size < 100:
        valid = values.ravel()
    low, high = np.percentile(valid, [1, 99])
    return np.clip((values - low) / max(high - low, 1e-6), 0.0, 1.0)


def group_of(file_name: str) -> str:
    return image_id_of(file_name) or file_name.rsplit("_", 2)[0]


def load_samples(root: Path = BOULDERNET_DIR) -> list[Sample]:
    """Todos los recortes (Marte, Luna, Tierra) con sus máscaras."""
    base = root / "extracted" / DATASET
    records = json.loads((base / "json" / f"{DATASET}.json").read_text(encoding="utf-8"))
    samples = []
    for record in records:
        tif = base / "preprocessing" / record["dataset"] / "images"
        tif = tif / record["file_name"].replace(".png", ".tif")
        with rasterio.open(tif) as src:
            image = src.read(1)
        masks = []
        for annotation in record["annotations"]:
            height, width = annotation["segmentation"]["size"]
            mask = decode_rle(annotation["segmentation"]["counts"], height, width)
            if mask.sum() >= 4:
                masks.append(mask)
        samples.append(
            Sample(
                name=record["file_name"].removesuffix("_image.png"),
                group=group_of(record["file_name"]),
                split=record["dataset"],
                image=stretch(image),
                masks=np.stack(masks) if masks else np.zeros((0, *image.shape), bool),
            )
        )
    return samples


def split_fold(samples: list[Sample], holdout: str | None):
    train, val, test = [], [], []
    for sample in samples:
        if holdout is not None and sample.group == holdout:
            test.append(sample)
        elif sample.group in MARS_IMAGES and sample.split != "train":
            val.append(sample)
        else:
            train.append(sample)
    return train, val, test


# --- Modelo -------------------------------------------------------------------------------------


def build_model(pretrained: bool = True):
    import torchvision
    from torchvision.models.detection import maskrcnn_resnet50_fpn_v2
    from torchvision.models.detection.anchor_utils import AnchorGenerator
    from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
    from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor

    coco = torchvision.models.detection.MaskRCNN_ResNet50_FPN_V2_Weights.COCO_V1
    weights = coco if pretrained else None
    size = int(500 * UPSCALE)
    model = maskrcnn_resnet50_fpn_v2(
        weights=weights,
        min_size=size,
        max_size=size,
        box_detections_per_img=600,
        rpn_pre_nms_top_n_train=4000,
        rpn_post_nms_top_n_train=2000,
        rpn_pre_nms_top_n_test=4000,
        rpn_post_nms_top_n_test=2000,
        box_batch_size_per_image=512,
        box_score_thresh=0.05,
    )
    # Bloques chicos: anclas de 8 a 128 px (en la imagen agrandada) en vez de 32 a 512.
    model.rpn.anchor_generator = AnchorGenerator(
        sizes=((8,), (16,), (32,), (64,), (128,)), aspect_ratios=((0.5, 1.0, 2.0),) * 5
    )
    in_features = model.roi_heads.box_predictor.cls_score.in_features
    model.roi_heads.box_predictor = FastRCNNPredictor(in_features, 2)
    model.roi_heads.mask_predictor = MaskRCNNPredictor(256, 256, 2)
    return model


def set_input_size(model, pixels: int) -> None:
    """El transform de torchvision agranda cada imagen a este lado (UPSCALE veces el original)."""
    size = int(pixels * UPSCALE)
    model.transform.min_size = (size,)
    model.transform.max_size = size


def _augment(image: np.ndarray, masks: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Recorte aleatorio, giros de 90° y espejos: el dataset trae soles de muchas direcciones."""
    rows, cols = image.shape
    r0 = random.randrange(rows - CROP_PX + 1)
    c0 = random.randrange(cols - CROP_PX + 1)
    image = image[r0:r0 + CROP_PX, c0:c0 + CROP_PX]
    masks = masks[:, r0:r0 + CROP_PX, c0:c0 + CROP_PX]
    # Bloques cortados por el borde: quedan si conservan al menos 4 px.
    kept = masks.sum(axis=(1, 2))
    masks = masks[kept >= 4]
    k = random.randrange(4)
    image, masks = np.rot90(image, k), np.rot90(masks, k, axes=(1, 2))
    if random.random() < 0.5:
        image, masks = image[:, ::-1], masks[:, :, ::-1]
    gain = random.uniform(0.85, 1.15)
    bias = random.uniform(-0.05, 0.05)
    image = np.clip(image * gain + bias, 0, 1)
    return np.ascontiguousarray(image), np.ascontiguousarray(masks)


def _target(masks: np.ndarray, device):
    import torch

    boxes, keep = [], []
    for index, mask in enumerate(masks):
        rows, cols = np.nonzero(mask)
        if rows.size == 0:
            continue
        x0, x1, y0, y1 = cols.min(), cols.max() + 1, rows.min(), rows.max() + 1
        if x1 - x0 < 1 or y1 - y0 < 1:
            continue
        boxes.append([x0, y0, x1, y1])
        keep.append(index)
    masks = masks[keep]
    return {
        "boxes": torch.tensor(boxes, dtype=torch.float32, device=device).reshape(-1, 4),
        "labels": torch.ones(len(keep), dtype=torch.int64, device=device),
        "masks": torch.from_numpy(masks.astype(np.uint8)).to(device),
    }


def _tensor(image: np.ndarray, device):
    import torch

    return torch.from_numpy(np.repeat(image[None], 3, axis=0).astype(np.float32)).to(device)


GPU_MEMORY_FRACTION = 0.8
"""Tope de VRAM. En Windows, pasarse no da error: desborda a memoria compartida y cada paso
tarda minutos (pasó con 8 GB, 2026-11-14). Con tope, el asignador libera caché antes."""


def train_model(train: list[Sample], epochs: int, batch: int = 6, lr: float = 0.01, seed: int = 0,
                log_every: int = 50):
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type == "cuda":
        torch.cuda.set_per_process_memory_fraction(GPU_MEMORY_FRACTION)
    model = build_model().to(device)
    set_input_size(model, CROP_PX)
    params = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.SGD(params, lr=lr, momentum=0.9, weight_decay=1e-4)
    usable = [s for s in train if len(s.masks)]
    steps_per_epoch = math.ceil(len(usable) / batch)
    total = epochs * steps_per_epoch
    warmup = min(300, total // 10)

    def lr_at(step: int) -> float:
        if step < warmup:
            return 0.001 + (1 - 0.001) * step / warmup
        return 0.5 * (1 + math.cos(math.pi * (step - warmup) / max(1, total - warmup)))

    scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_at)
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    model.train()
    step, start = 0, time.time()
    for epoch in range(epochs):
        random.shuffle(usable)
        for i in range(0, len(usable), batch):
            images, targets = [], []
            for sample in usable[i:i + batch]:
                image, masks = _augment(sample.image, sample.masks)
                images.append(_tensor(image, device))
                targets.append(_target(masks, device))
            with torch.autocast(device.type, enabled=device.type == "cuda"):
                losses = model(images, targets)
                loss = sum(losses.values())
            optimizer.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(params, 10.0)
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()
            step += 1
            if step % log_every == 0 or step == total:
                print(
                    f"  época {epoch + 1}/{epochs} paso {step}/{total} pérdida {loss.item():.3f} "
                    f"({time.time() - start:.0f} s)",
                    flush=True,
                )
    return model


def predict(model, image: np.ndarray, device=None) -> list[tuple[float, np.ndarray]]:
    """(score, máscara bool) por detección, sobre una imagen float [0, 1] de cualquier tamaño."""
    import torch

    device = device or next(model.parameters()).device
    set_input_size(model, max(image.shape))
    model.eval()
    with torch.no_grad(), torch.autocast(device.type, enabled=device.type == "cuda"):
        output = model([_tensor(image, device)])[0]
    scores = output["scores"].float().cpu().numpy()
    masks = (output["masks"][:, 0].float() > MASK_THRESHOLD).cpu().numpy()
    return list(zip(scores.tolist(), masks, strict=True))


def to_labels(detections, res_m: float, threshold: float) -> list[Label]:
    labels = []
    for score_value, mask in detections:
        if score_value < threshold:
            continue
        label = mask_to_label(mask, res_m)
        if label is not None:
            labels.append(label)
    return labels


# --- Medición ------------------------------------------------------------------------------------


def evaluate(model, samples: list[Sample], thresholds=THRESHOLDS) -> dict:
    """F1 a 2 y 3 m por umbral, con el mismo emparejamiento que el detector de sombras."""
    from vision.evaluate import score

    patches = {p.name: p for p in load_patches()}
    truth: list[Label] = []
    found: dict[float, list[Label]] = {t: [] for t in thresholds}
    res_m = None
    for index, sample in enumerate(samples):
        patch = patches[sample.name]
        res_m = patch.res_m
        truth.extend(shifted(scored(patch, patch.labels), index))
        detections = predict(model, sample.image)
        for t in thresholds:
            found[t].extend(shifted(scored(patch, to_labels(detections, patch.res_m, t)), index))
    result = {}
    for t in thresholds:
        result[t] = {d: score(truth, found[t], d, res_m=res_m or 0.5) for d in (2.0, 3.0)}
    return result


def best_threshold(result: dict) -> float:
    """El umbral de mejor F1 medio (2 y 3 m) en validación."""
    return max(result, key=lambda t: (result[t][2.0].f1 + result[t][3.0].f1) / 2)


def run_fold(samples: list[Sample], holdout: str, epochs: int, out_dir: Path) -> dict:
    import torch

    train, val, test = split_fold(samples, holdout)
    print(f"[{holdout}] entrenamiento {len(train)}, validación {len(val)}, test {len(test)}",
          flush=True)
    model = train_model(train, epochs)
    val_result = evaluate(model, val)
    threshold = best_threshold(val_result)
    test_result = evaluate(model, test, thresholds=(threshold,))[threshold]
    out_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), out_dir / f"fold-{holdout}.pt")
    summary = {
        "holdout": holdout,
        "threshold": threshold,
        "val_f1": {t: {d: s.f1 for d, s in r.items()} for t, r in val_result.items()},
        "test": {
            d: {"n_labels": s.n_labels, "precision": s.precision, "recall": s.recall, "f1": s.f1,
                "median_diameter_error_px": s.median_diameter_error_px}
            for d, s in test_result.items()
        },
    }
    for d, s in test_result.items():
        print(f"[{holdout}] umbral {threshold} >= {d:.0f} m: etiquetas {s.n_labels:4d} "
              f"P {s.precision:.2f} R {s.recall:.2f} F1 {s.f1:.2f}", flush=True)
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sub = parser.add_subparsers(dest="command", required=True)
    cv = sub.add_parser("cv", help="validación cruzada dejando una imagen de Marte afuera")
    cv.add_argument("--holdout", nargs="*", default=list(MARS_IMAGES))
    cv.add_argument("--epochs", type=int, default=12)
    cv.add_argument("--out", type=Path, default=MODEL_DIR)
    final = sub.add_parser("train", help="modelo final con todas las imágenes")
    final.add_argument("--epochs", type=int, default=12)
    final.add_argument("--threshold", type=float, required=True,
                       help="umbral elegido en la validación cruzada")
    final.add_argument("--out", type=Path, default=MODEL_DIR / "final.pt")
    args = parser.parse_args()

    samples = load_samples()
    if args.command == "cv":
        summaries = [run_fold(samples, h, args.epochs, args.out) for h in args.holdout]
        args.out.mkdir(parents=True, exist_ok=True)
        (args.out / "cv.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    else:
        import torch

        model = train_model(samples, args.epochs)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        torch.save({"state_dict": model.state_dict(), "threshold": args.threshold,
                    "upscale": UPSCALE}, args.out)
        print(f"modelo en {args.out}")


if __name__ == "__main__":
    main()
