"""Alinea imágenes de distintas fechas: cuánto hay que correr una para que coincida con otra.

Solo febrero y abril de 2022 tienen orto; diciembre de 2022 y abril de 2024 no. El terreno es casi
plano, así que un corrimiento por recorte alcanza, y la mediana de varios lo vuelve robusto.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage
from skimage.registration import phase_cross_correlation

from vision.imagery import valid_mask


@dataclass(frozen=True)
class Shift:
    row_px: float
    col_px: float
    spread_px: float
    """Dispersión entre recortes. Si es alta, un corrimiento único no alcanza."""
    n_tiles: int


def _fill_invalid(image: np.ndarray) -> np.ndarray:
    filled = image.astype(np.float64)
    mask = valid_mask(image)
    filled[~mask] = filled[mask].mean()
    return filled


def estimate_shift(
    reference: np.ndarray,
    moving: np.ndarray,
    tile_px: int = 512,
    min_valid: float = 0.9,
    upsample: int = 10,
) -> Shift:
    """Corrimiento (filas, columnas) que hay que aplicarle a `moving` para alinearla.

    Las dos imágenes deben estar ya a la misma escala y en la misma proyección.
    """
    if reference.shape != moving.shape:
        raise ValueError(f"Formas distintas: {reference.shape} y {moving.shape}")

    shifts = []
    height, width = reference.shape
    for row in range(0, height - tile_px + 1, tile_px):
        for col in range(0, width - tile_px + 1, tile_px):
            ref = reference[row:row + tile_px, col:col + tile_px]
            mov = moving[row:row + tile_px, col:col + tile_px]
            if min(valid_mask(ref).mean(), valid_mask(mov).mean()) < min_valid:
                continue
            found, _, _ = phase_cross_correlation(
                _fill_invalid(ref), _fill_invalid(mov), upsample_factor=upsample
            )
            shifts.append(found)
    if not shifts:
        raise ValueError("Ningún recorte tiene datos válidos suficientes")

    stacked = np.asarray(shifts)
    median = np.median(stacked, axis=0)
    spread = float(np.median(np.linalg.norm(stacked - median, axis=1)))
    return Shift(float(median[0]), float(median[1]), spread, len(shifts))


def estimate_coarse_shift(reference: np.ndarray, moving: np.ndarray, factor: int = 4) -> np.ndarray:
    """Corrimiento grueso (filas, columnas) en píxeles originales, respetando las zonas sin dato.

    Las imágenes sin orto pueden estar corridas más de 100 m: demasiado para ajustar solo por
    recortes. Las máscaras evitan que el borde de una franja sin datos domine la correlación.
    """
    ref = reference[::factor, ::factor].astype(np.float64)
    mov = moving[::factor, ::factor].astype(np.float64)
    found = phase_cross_correlation(
        ref, mov, reference_mask=valid_mask(ref), moving_mask=valid_mask(mov)
    )
    # Con máscaras, skimage puede devolver solo el corrimiento o una tupla, según la versión.
    shift = found[0] if isinstance(found, tuple) else found
    return np.asarray(shift, dtype=np.float64) * factor


def align(
    reference: np.ndarray, moving: np.ndarray, factor: int = 4, tile_px: int = 512
) -> tuple[np.ndarray, Shift]:
    """Alinea `moving`: primero grueso y después fino. Devuelve la imagen corrida y el total.

    Sin dato queda en 0. Devuelve float64 para no perder rango con imágenes de 16 bits.
    """
    coarse = estimate_coarse_shift(reference, moving, factor)
    first = ndimage.shift(moving.astype(np.float64), coarse, order=0, cval=0)
    fine = estimate_shift(reference, first, tile_px=tile_px)
    aligned = ndimage.shift(first, (fine.row_px, fine.col_px), order=1, cval=0)
    total = Shift(
        float(coarse[0] + fine.row_px), float(coarse[1] + fine.col_px), fine.spread_px, fine.n_tiles
    )
    return aligned, total
