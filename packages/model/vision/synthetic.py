"""Escena sintética con bloques, cráteres y sombras: la verdad de terreno de los tests.

No imita una imagen real: arma un relieve (bloques como medio elipsoide, cráteres como cuenco con
borde), le tira sombras con la geometría del sol y lo ilumina con una ley de Lambert. Sirve para
probar que el detector recupera posición, diámetro y altura conocidos, y que no confunde un cráter
con un bloque. Las métricas sobre esta escena **no** reemplazan a las de la verdad de terreno
anotada a mano (docs/plans/vision.md, paso 2).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from scipy import ndimage


@dataclass(frozen=True)
class SyntheticBoulder:
    x_m: float
    y_m: float
    diameter_m: float
    height_m: float


@dataclass(frozen=True)
class SyntheticCrater:
    x_m: float
    y_m: float
    diameter_m: float
    depth_ratio: float = 0.2  # Profundidad sobre diámetro de un cráter simple fresco.


def heightmap(
    shape: tuple[int, int],
    res_m: float,
    boulders: list[SyntheticBoulder],
    craters: list[SyntheticCrater] = (),
) -> np.ndarray:
    """Relieve en metros. Origen (0, 0) en la esquina suroeste; la fila 0 es el borde norte."""
    rows, cols = shape
    z = np.zeros(shape, dtype=np.float64)
    for item in (*boulders, *craters):
        radius = item.diameter_m / 2
        reach = radius * (1.6 if isinstance(item, SyntheticCrater) else 1.0) + res_m
        col_c = item.x_m / res_m - 0.5
        row_c = rows - item.y_m / res_m - 0.5
        r0, r1 = max(int(row_c - reach / res_m), 0), min(int(row_c + reach / res_m) + 2, rows)
        c0, c1 = max(int(col_c - reach / res_m), 0), min(int(col_c + reach / res_m) + 2, cols)
        if r0 >= r1 or c0 >= c1:
            continue
        rr, cc = np.mgrid[r0:r1, c0:c1]
        rho = np.hypot(rr - row_c, cc - col_c) * res_m / radius
        if isinstance(item, SyntheticCrater):
            depth = item.depth_ratio * item.diameter_m
            bowl = np.where(rho < 1, -depth * (1 - rho**2), 0.0)
            rim = 0.04 * item.diameter_m * np.exp(-(((rho - 1) / 0.25) ** 2))
            z[r0:r1, c0:c1] += bowl + rim
        else:
            bump = item.height_m * np.sqrt(np.clip(1 - rho**2, 0, None))
            z[r0:r1, c0:c1] = np.maximum(z[r0:r1, c0:c1], bump)
    return z


def cast_shadows(
    z: np.ndarray, res_m: float, sun_azimuth_deg: float, incidence_deg: float
) -> np.ndarray:
    """True donde el relieve tapa al sol. Recorre el rayo hacia el sol, de a un píxel."""
    azimuth = math.radians(sun_azimuth_deg)
    toward_sun = (-math.cos(azimuth), math.sin(azimuth))  # (fila, columna)
    rise_per_px = res_m / math.tan(math.radians(incidence_deg))
    relief = float(z.max() - z.min())
    steps = int(math.ceil(relief / rise_per_px)) + 1
    shadow = np.zeros(z.shape, dtype=bool)
    for k in range(1, steps + 1):
        ahead = ndimage.shift(
            z, (-k * toward_sun[0], -k * toward_sun[1]), order=1, mode="nearest"
        )
        shadow |= ahead > z + k * rise_per_px + 1e-6
    return shadow


def render_scene(
    shape: tuple[int, int],
    res_m: float,
    sun_azimuth_deg: float,
    incidence_deg: float,
    boulders: list[SyntheticBoulder],
    craters: list[SyntheticCrater] = (),
    seed: int = 0,
    background_dn: float = 215.0,
    shadow_dn: float = 185.0,
    texture_dn: float = 2.0,
    noise_dn: float = 1.0,
    psf_px: float = 1.5,
    hummock_m: float = 0.0,
    hummock_scale_m: float = 4.0,
) -> np.ndarray:
    """Imagen de 8 bits como un orto de HiRISE: 0 queda reservado para "sin dato".

    `hummock_m` suma ondulaciones suaves de esa altura típica (desvío) y escala `hummock_scale_m`:
    con el sol bajo, sus caras opuestas al sol se oscurecen sin ser bloques, como en el terreno
    real de S1094b.
    """
    rng = np.random.default_rng(seed)
    z = heightmap(shape, res_m, boulders, craters)
    if hummock_m > 0:
        hummocks = ndimage.gaussian_filter(rng.normal(size=shape), hummock_scale_m / res_m)
        z = z + hummocks * (hummock_m / hummocks.std())
    shadow = cast_shadows(z, res_m, sun_azimuth_deg, incidence_deg)

    d_row, d_col = np.gradient(z, res_m)
    normal = np.stack([-d_col, d_row, np.ones_like(z)])  # (este, norte, arriba)
    normal /= np.linalg.norm(normal, axis=0)
    azimuth, incidence = math.radians(sun_azimuth_deg), math.radians(incidence_deg)
    sun = np.array(
        [
            math.sin(azimuth) * math.sin(incidence),
            math.cos(azimuth) * math.sin(incidence),
            math.cos(incidence),
        ]
    )
    lambert = np.clip(np.tensordot(sun, normal, axes=1), 0, None) / math.cos(incidence)

    texture = ndimage.gaussian_filter(rng.normal(size=shape), 12)
    texture += 0.5 * ndimage.gaussian_filter(rng.normal(size=shape), 2) * 2 / 12
    texture *= texture_dn / texture.std()
    # Como en el orto: el nivel de sombra es el piso, y la luz directa se suma encima.
    image = shadow_dn + (background_dn - shadow_dn + texture) * lambert
    image[shadow | (lambert <= 0)] = shadow_dn
    image = ndimage.gaussian_filter(image, psf_px)
    image += rng.normal(0, noise_dn, shape)
    return np.clip(np.rint(image), 1, 255).astype(np.uint8)


def scatter_scene(
    size_m: float,
    n_boulders: int,
    n_craters: int,
    seed: int = 0,
    margin_m: float = 12.0,
) -> tuple[list[SyntheticBoulder], list[SyntheticCrater]]:
    """Bloques y cráteres al azar, sin pisarse, en un cuadrado de `size_m` de lado.

    Diámetros de bloque de 1.5 a 5 m, con más chicos que grandes; alto de 0.4 a 0.8 del diámetro.
    """
    rng = np.random.default_rng(seed)
    boulders: list[SyntheticBoulder] = []
    craters: list[SyntheticCrater] = []

    def is_free(x: float, y: float, reach: float) -> bool:
        return all(
            np.hypot(x - item.x_m, y - item.y_m) > reach + 3 * item.diameter_m
            for item in (*boulders, *craters)
        )

    while len(craters) < n_craters:
        x, y = rng.uniform(margin_m, size_m - margin_m, 2)
        diameter = float(rng.uniform(3, 9))
        if is_free(x, y, 3 * diameter):
            craters.append(SyntheticCrater(float(x), float(y), diameter))
    while len(boulders) < n_boulders:
        x, y = rng.uniform(margin_m, size_m - margin_m, 2)
        diameter = float(np.clip(1.5 * (1 + rng.pareto(2.0)), 1.5, 5.0))
        if is_free(x, y, 3 * diameter):
            height = diameter * float(rng.uniform(0.4, 0.8))
            boulders.append(SyntheticBoulder(float(x), float(y), diameter, height))
    return boulders, craters
