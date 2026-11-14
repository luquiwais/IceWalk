"""Detector de bloques por sombras sobre imágenes HiRISE.

Un bloque se ve desde órbita como una mancha oscura (su cara en sombra más la sombra que tira al
suelo) con una cara iluminada del lado del sol. El detector:

1. estima el fondo local y cuánto varía el terreno, sin dejarse arrastrar por las propias sombras;
2. busca manchas mucho más oscuras que el fondo y corta cada una a la mitad de su profundidad;
3. mide cada mancha sobre el eje del sol: el ancho perpendicular es el diámetro, y el largo da la
   altura con la incidencia del label (`pds.ImageGeometry`);
4. descarta lo que no tiene forma de sombra de bloque: manchas difusas (la cara en penumbra de
   una ondulación), formas ramificadas y cráteres chicos, que tienen el orden invertido: sombra
   del lado del sol y pared iluminada del lado opuesto.

Modelo de medición: medio elipsoide de radio `r` y altura `h` apoyado en terreno plano. Su zona
oscura va desde el terminador, a `r² / sqrt(r² + T²)` del centro, hasta la punta de la sombra, a
`sqrt(r² + T²)`, con `T = h · tan(incidencia)`. De ahí salen el centro y la altura. Es la idea de
Golombek et al. (sombra → ancho y alto), con el terminador corrido del centro.

Límites declarados: no ve bloques sin sombra medible (bajos, o más chicos que
`DETECTION_LIMIT_M`), un grupo de bloques pegados sale como uno solo y más ancho, y un bloque sobre
una pendiente fuerte sale con la altura corrida. "Nada detectado" nunca es "terreno libre".
"""

from __future__ import annotations

import math
from dataclasses import dataclass, replace
from pathlib import Path

import numpy as np
from scipy import ndimage

from vision.crops import read_window
from vision.grid import Grid
from vision.imagery import valid_mask
from vision.pds import ImageGeometry

DETECTION_LIMIT_M = 1.5
"""Diámetro desde el que la detección es confiable: 6 píxeles a 25 cm (Golombek et al.: ~1.5 m)."""


@dataclass(frozen=True)
class DetectorParams:
    background_m: float = 3.0
    """Sigma del suavizado que estima el fondo. Mayor que un bloque, menor que una duna."""
    seed_sigma: float = 5.0
    """Una mancha es detección firme si su píxel más oscuro pasa `seed_sigma` desvíos del fondo
    (las anchas, además, con cara iluminada: ver `large_diameter_m`)."""
    loose_sigma: float = 3.5
    """Piso de profundidad. Entre `loose_sigma` y `seed_sigma`, una mancha es firme solo si es
    un par nítido (`pair_sharpness`) con cara iluminada del lado del sol (`pair_highlight`);
    si no, queda como candidata, que solo confirma una detección de otra fecha."""
    pair_sharpness: float = 0.16
    pair_highlight: float = 1.0
    large_diameter_m: float = 3.0
    """Una mancha más ancha que esto solo es firme con cara iluminada (`pair_highlight`): un
    bloque así de grande siempre la muestra; la cara en penumbra de una ondulación, no."""
    presence_sigma: float = 3.0
    presence_radius_m: float = 1.0
    """Otra fecha confirma un bloque si, a menos de `presence_radius_m` de su sombra, tiene un
    píxel `presence_sigma` desvíos por debajo del fondo."""
    level_ratio: float = 1.4
    """Paso entre niveles de profundidad. El borde de cada mancha se toma a la mitad de su nivel."""
    min_width_px: float = 3.0
    """Debajo de este ancho de sombra no se mide un diámetro."""
    min_area_px: int = 6
    max_diameter_m: float = 12.0
    """Sombras más anchas son escarpes o cráteres, no bloques sueltos."""
    min_elongation: float = 0.15
    max_elongation: float = 5.0
    """Largo sobre ancho de la sombra, sobre el eje del sol."""
    min_fill: float = 0.45
    """Área de la mancha sobre la de la elipse de sus ejes: descarta formas ramificadas."""
    min_sharpness: float = 0.12
    """Pendiente del borde sobre la profundidad, por píxel. Una sombra tiene borde nítido; la
    cara en penumbra de una ondulación del terreno, no."""
    crater_sigma: float = 1.5
    """Cráter si pasando la sombra hay una zona así de brillante y del lado del sol no."""
    invalid_margin_px: int = 2
    """Margen alrededor de los píxeles sin dato (marco y líneas negras)."""


DEFAULT_PARAMS = DetectorParams()


@dataclass(frozen=True)
class Detection:
    x_m: float
    y_m: float
    diameter_m: float
    height_m: float
    shadow_length_m: float
    """Largo de la zona oscura sobre el eje del sol."""
    peak_sigma: float
    """Desvíos por debajo del fondo del píxel más oscuro."""
    highlight_sigma: float
    """Brillo del lado del sol, en desvíos sobre el fondo: positivo en un bloque."""
    sharpness: float
    """Pendiente del borde de la sombra sobre su profundidad, por píxel."""
    area_px: int
    confidence: float
    """Puntaje 0-1 no calibrado: contraste, tamaño en píxeles y cara iluminada."""
    firm: bool
    """False: candidata débil, que solo sirve para confirmar una detección de otra fecha."""
    shadow_x_m: float = 0.0
    shadow_y_m: float = 0.0
    """Centro de la zona oscura: donde otra fecha tiene que mostrar una sombra."""
    other_depth_sigma: float | None = None
    """Lo más oscuro que muestra la otra fecha en ese lugar, en desvíos bajo su fondo. None si
    no hay otra fecha o no tiene dato ahí. Lo completa `detect_epochs_in_window`."""


def _smooth(values: np.ndarray, weights: np.ndarray, sigma_px: float) -> np.ndarray:
    """Promedio gaussiano que ignora los píxeles con peso 0."""
    total = ndimage.gaussian_filter(weights, sigma_px, mode="nearest")
    mean = ndimage.gaussian_filter(values * weights, sigma_px, mode="nearest")
    return np.divide(mean, total, out=np.zeros_like(mean), where=total > 1e-3)


def shadow_score(
    image: np.ndarray, res_m: float, params: DetectorParams = DEFAULT_PARAMS
) -> tuple[np.ndarray, np.ndarray]:
    """Devuelve (z, usable): desvíos de cada píxel respecto del fondo local y dónde vale.

    El fondo y el desvío se estiman dos veces: la segunda, sin los píxeles que la primera marcó
    como atípicos. Así un campo de bloques no sube su propio umbral.
    """
    values = image.astype(np.float32)
    valid = valid_mask(image)
    usable = valid
    if params.invalid_margin_px > 0 and not valid.all():
        usable = ~ndimage.binary_dilation(~valid, iterations=params.invalid_margin_px)
    if not usable.any():
        return np.zeros(image.shape, dtype=np.float32), usable
    sigma_px = params.background_m / res_m
    weights = usable.astype(np.float32)

    background = _smooth(values, weights, sigma_px)
    residual = (values - background) * weights
    spread = 1.4826 * float(np.median(np.abs(residual[usable])))
    floor = max(spread, 1.0)  # Un nivel digital: el piso de una imagen de 8 bits.

    inliers = weights * (np.abs(residual) < 2.5 * floor)
    background = np.where(
        ndimage.gaussian_filter(inliers, sigma_px, mode="nearest") > 0.05,
        _smooth(values, inliers, sigma_px),
        background,
    )
    residual = values - background
    local = np.sqrt(_smooth(residual**2, inliers, 2 * sigma_px))
    noise = np.maximum(local, 0.5 * floor)
    return np.where(usable, residual / noise, 0).astype(np.float32), usable


def dark_regions(
    depth: np.ndarray, params: DetectorParams = DEFAULT_PARAMS
) -> tuple[np.ndarray, int]:
    """Etiqueta las manchas oscuras, cada una con su borde a media profundidad.

    Un umbral fijo mide de más una sombra profunda (entra la penumbra) y pierde o parte una
    débil. Acá se recorren niveles de profundidad `L`: en cada uno se toman las manchas de
    `depth >= L / 2` cuyo máximo cae entre `L` y el nivel siguiente. Cada mancha queda cortada
    cerca de la mitad de su propia profundidad, que es donde un borde borroso no se corre.
    Las manchas de distintos niveles no se pisan: una que contiene a otra más profunda tiene el
    máximo fuera de su nivel.
    """
    labels = np.zeros(depth.shape, dtype=np.int32)
    total = 0
    top = float(depth.max())
    level = params.loose_sigma
    while level <= top:
        upper = level * params.level_ratio
        found, n = ndimage.label(depth >= level / 2)
        if n:
            peak = ndimage.maximum(depth, found, np.arange(1, n + 1))
            chosen = (peak >= level) & (peak < upper)
            ids = np.zeros(n + 1, dtype=np.int32)
            ids[1:][chosen] = total + 1 + np.arange(int(chosen.sum()))
            labels += ids[found]
            total += int(chosen.sum())
        level = upper
    return labels, total


def ellipsoid_from_shadow(
    width_m: np.ndarray, dark_length_m: np.ndarray, shadow_per_height: float
) -> tuple[np.ndarray, np.ndarray]:
    """(altura, distancia del centro al inicio de la zona oscura) de un medio elipsoide.

    Con `T = h · tan(i)` y radio `r`, la zona oscura mide `L = T² / sqrt(r² + T²)` y empieza a
    `r² / sqrt(r² + T²)` del centro. Se despeja `T` de `L` y `r`.
    """
    radius = np.asarray(width_m, dtype=np.float64) / 2
    length = np.asarray(dark_length_m, dtype=np.float64)
    reach = np.sqrt((length**2 + length * np.sqrt(length**2 + 4 * radius**2)) / 2)
    start = radius**2 / np.sqrt(radius**2 + reach**2)
    return reach / shadow_per_height, start


def detect_boulders(
    image: np.ndarray,
    res_m: float,
    geometry: ImageGeometry,
    origin_xy: tuple[float, float] = (0.0, 0.0),
    params: DetectorParams = DEFAULT_PARAMS,
) -> list[Detection]:
    """Bloques de una imagen con norte arriba. `origin_xy` es (x del borde oeste, y del norte).

    Devuelve detecciones firmes y candidatas débiles (`firm=False`). Las coordenadas salen en las
    mismas unidades que `origin_xy` y `res_m`: metros de la grilla si la imagen viene de
    `crops.read_window`.
    """
    return _detect(image, res_m, geometry, origin_xy, params)[0]


def _detect(
    image: np.ndarray,
    res_m: float,
    geometry: ImageGeometry,
    origin_xy: tuple[float, float],
    params: DetectorParams,
) -> tuple[list[Detection], np.ndarray, np.ndarray]:
    """Detecciones, mapa de profundidad (desvíos bajo el fondo) y máscara de píxeles usables."""
    if image.ndim != 2:
        raise ValueError(f"Se espera una imagen de una banda, no {image.shape}")
    z, usable = shadow_score(image, res_m, params)
    depth = -z
    labels, n = dark_regions(depth, params)
    if n == 0:
        return [], depth, usable

    shadow_azimuth = math.radians(geometry.shadow_azimuth_deg)
    along = np.array([-math.cos(shadow_azimuth), math.sin(shadow_azimuth)])  # (fila, columna)
    across = np.array([math.sin(shadow_azimuth), math.cos(shadow_azimuth)])

    rows, cols = np.nonzero(labels)
    ids = labels[rows, cols]
    index = np.arange(1, n + 1)
    u = rows * along[0] + cols * along[1]
    v = rows * across[0] + cols * across[1]
    count = np.bincount(ids, minlength=n + 1)[1:].astype(np.float64)

    def mean_of(values: np.ndarray) -> np.ndarray:
        return np.bincount(ids, weights=values, minlength=n + 1)[1:] / count

    u_min = ndimage.minimum(u, ids, index)
    u_max = ndimage.maximum(u, ids, index)
    u_mean = mean_of(u)
    v_mean = mean_of(v)
    v_var = np.clip(mean_of(v**2) - v_mean**2, 0, None)
    inside = depth[rows, cols]
    peak = ndimage.maximum(inside, ids, index)
    mean_depth = mean_of(inside)

    # Ancho por momentos (4 sigma = eje de una elipse llena): no depende de un píxel suelto.
    # El 1/12 es la varianza de un píxel; el largo va por extensión, con el píxel de los bordes.
    pixel_span = abs(along[0]) + abs(along[1])
    width_px = 4 * np.sqrt(v_var + 1 / 12)
    length_px = u_max - u_min + pixel_span
    fill = count / (np.pi / 4 * width_px * length_px)

    # Nitidez: pendiente media sobre el borde de la mancha, relativa a su profundidad.
    mask = labels > 0
    edge = mask & ~ndimage.binary_erosion(mask)
    slope = ndimage.gaussian_gradient_magnitude(z, 1.0, mode="nearest")
    edge_ids = labels[edge]
    edge_count = np.bincount(edge_ids, minlength=n + 1)[1:]
    edge_slope = np.bincount(edge_ids, weights=slope[edge], minlength=n + 1)[1:]
    sharpness = edge_slope / np.maximum(edge_count, 1) / peak

    # Manchas que tocan el borde o una zona sin dato: incompletas.
    border = np.zeros(image.shape, dtype=bool)
    border[[0, -1], :] = True
    border[:, [0, -1]] = True
    touched = np.zeros(n + 1, dtype=bool)
    touched[np.unique(labels[(ndimage.binary_dilation(~usable) | border) & mask])] = True

    width_m = width_px * res_m
    length_m = length_px * res_m
    height_m, start_m = ellipsoid_from_shadow(width_m, length_m, geometry.shadow_per_height)
    elongation = length_px / width_px
    keep = (
        ~touched[1:]
        & (count >= params.min_area_px)
        & (width_px >= params.min_width_px - 1)
        & (width_m <= params.max_diameter_m)
        & (elongation >= params.min_elongation)
        & (elongation <= params.max_elongation)
        & (fill >= params.min_fill)
        & (sharpness >= params.min_sharpness)
    )
    if not keep.any():
        return [], depth, usable

    # Centro del bloque: del inicio de la zona oscura, hacia el sol, lo que diga el modelo.
    u_start = u_min - pixel_span / 2
    u_end = u_max + pixel_span / 2
    center_rc = np.outer(u_start - start_m / res_m, along) + np.outer(v_mean, across)
    shadow_rc = np.outer(u_mean, along) + np.outer(v_mean, across)

    # Cráter o bloque: brillo antes de la sombra (lado del sol) y después de su punta.
    smooth_z = ndimage.gaussian_filter(z, 1.0, mode="nearest")
    probe = np.maximum(0.3 * width_px, 1.5)

    def sample(u_pos: np.ndarray) -> np.ndarray:
        points = np.outer(u_pos, along) + np.outer(v_mean, across)
        return ndimage.map_coordinates(smooth_z, points.T, order=1, mode="nearest")

    sunward = np.maximum(sample(u_start - probe), sample(u_start - 2 * probe))
    beyond = np.maximum(sample(u_end + probe), sample(u_end + 2 * probe))
    is_crater = (beyond > params.crater_sigma) & (beyond - sunward > params.crater_sigma)
    keep &= ~is_crater

    lit_face = sunward >= params.pair_highlight
    crisp_pair = (sharpness >= params.pair_sharpness) & lit_face
    deep = (peak >= params.seed_sigma) & ((width_m <= params.large_diameter_m) | lit_face)
    firm = (deep | crisp_pair) & (width_px >= params.min_width_px)
    contrast_q = np.clip((mean_depth - params.loose_sigma / 2) / (2 * params.seed_sigma), 0, 1)
    size_q = np.clip((width_px - params.min_width_px) / (8 - params.min_width_px), 0, 1)
    highlight_q = np.clip(0.5 + sunward / 4, 0, 1)
    confidence = 0.25 + 0.75 * (0.4 * contrast_q + 0.4 * size_q + 0.2 * highlight_q)

    x0, y0 = origin_xy
    detections = []
    for i in np.flatnonzero(keep):
        row, col = center_rc[i]
        detections.append(
            Detection(
                x_m=float(x0 + (col + 0.5) * res_m),
                y_m=float(y0 - (row + 0.5) * res_m),
                diameter_m=float(width_m[i]),
                height_m=float(height_m[i]),
                shadow_length_m=float(length_m[i]),
                peak_sigma=float(peak[i]),
                highlight_sigma=float(sunward[i]),
                sharpness=float(sharpness[i]),
                area_px=int(count[i]),
                confidence=float(confidence[i]),
                firm=bool(firm[i]),
                shadow_x_m=float(x0 + (shadow_rc[i][1] + 0.5) * res_m),
                shadow_y_m=float(y0 - (shadow_rc[i][0] + 0.5) * res_m),
            )
        )
    return detections, depth, usable


@dataclass(frozen=True)
class WindowResult:
    detections: list[Detection]
    coverage: np.ndarray
    """Fracción de píxeles con dato en cada celda de la grilla, dentro de la ventana."""
    bounds: tuple[float, float, float, float]
    """(xmin, ymin, xmax, ymax) realmente procesados, alineados a las celdas de la grilla."""


def snap_bounds(
    bounds: tuple[float, float, float, float], grid: Grid
) -> tuple[float, float, float, float]:
    """Lleva la ventana hacia afuera hasta bordes de celda y la recorta a la grilla."""
    cell = grid.cell_size_m
    xmin, ymin, xmax, ymax = bounds
    xmin = max(grid.xmin, grid.xmin + math.floor((xmin - grid.xmin) / cell) * cell)
    ymin = max(grid.ymin, grid.ymin + math.floor((ymin - grid.ymin) / cell) * cell)
    xmax = min(grid.xmax, grid.xmin + math.ceil((xmax - grid.xmin) / cell) * cell)
    ymax = min(grid.ymax, grid.ymin + math.ceil((ymax - grid.ymin) / cell) * cell)
    if xmin >= xmax or ymin >= ymax:
        raise ValueError(f"La ventana {bounds} queda fuera de la grilla")
    return xmin, ymin, xmax, ymax


def _depth_near(
    depth: np.ndarray,
    usable: np.ndarray,
    res_m: float,
    origin_xy: tuple[float, float],
    x_m: float,
    y_m: float,
    radius_m: float,
) -> float | None:
    """Mayor profundidad a menos de `radius_m` del punto. None si ahí no hay dato."""
    col = int((x_m - origin_xy[0]) / res_m)
    row = int((origin_xy[1] - y_m) / res_m)
    if not (0 <= row < depth.shape[0] and 0 <= col < depth.shape[1]) or not usable[row, col]:
        return None
    reach = max(1, round(radius_m / res_m))
    window = depth[max(row - reach, 0):row + reach + 1, max(col - reach, 0):col + reach + 1]
    return float(window.max())


def detect_epochs_in_window(
    images: list[tuple[Path, ImageGeometry]],
    grid: Grid,
    bounds: tuple[float, float, float, float],
    res_m: float = 0.25,
    tile_m: float = 500.0,
    margin_m: float = 30.0,
    params: DetectorParams = DEFAULT_PARAMS,
) -> list[WindowResult]:
    """Corre el detector por teselas sobre una ventana de la grilla, en una o dos fechas.

    Cada tesela se lee con un margen, para que una sombra en el borde salga entera, y se queda solo
    con los bloques cuyo centro cae en su interior: así ninguno se cuenta dos veces. Con dos
    imágenes ya alineadas, a cada detección se le anota qué muestra la otra fecha en el lugar de
    su sombra (`other_depth_sigma`): una imagen más borrosa puede no dar una detección propia y
    aun así confirmar que el bloque está.
    """
    if not 1 <= len(images) <= 2:
        raise ValueError("Se espera una imagen, o dos ya alineadas entre sí")
    cell = grid.cell_size_m
    per_cell = round(cell / res_m)
    if not math.isclose(per_cell * res_m, cell):
        raise ValueError(f"La celda de {cell} m no es múltiplo de la resolución {res_m} m")
    xmin, ymin, xmax, ymax = snap_bounds(bounds, grid)
    tile_m = max(cell, round(tile_m / cell) * cell)
    margin_m = math.ceil(margin_m / cell) * cell

    n_rows = round((ymax - ymin) / cell)
    n_cols = round((xmax - xmin) / cell)
    coverage = [np.zeros((n_rows, n_cols), dtype=np.float32) for _ in images]
    detections: list[list[Detection]] = [[] for _ in images]

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
            origin = (read[0], read[3])
            r0 = round((read[3] - tile_y1) / res_m)
            c0 = round((tile_x0 - read[0]) / res_m)
            rows = round((tile_y1 - tile_y0) / cell)
            cols = round((tile_x1 - tile_x0) / cell)
            row = round((ymax - tile_y1) / cell)
            col = round((tile_x0 - xmin) / cell)

            found = []
            for index, (path, geometry) in enumerate(images):
                image = read_window(path, grid, read, res_m)
                valid = valid_mask(image)
                # Cobertura por celda, solo del interior de la tesela.
                core = valid[r0:r0 + rows * per_cell, c0:c0 + cols * per_cell]
                cells = core.reshape(rows, per_cell, cols, per_cell).mean(axis=(1, 3))
                coverage[index][row:row + rows, col:col + cols] = cells
                if valid.any():
                    found.append(_detect(image, res_m, geometry, origin, params))
                else:
                    found.append(([], np.zeros(image.shape, np.float32), valid))

            for index, (tile_detections, _, _) in enumerate(found):
                other = found[1 - index] if len(found) == 2 else None
                for item in tile_detections:
                    if not (tile_x0 <= item.x_m < tile_x1 and tile_y0 <= item.y_m < tile_y1):
                        continue
                    if other is not None:
                        seen = _depth_near(
                            other[1], other[2], res_m, origin,
                            item.shadow_x_m, item.shadow_y_m, params.presence_radius_m,
                        )
                        item = replace(item, other_depth_sigma=seen)
                    detections[index].append(item)
    return [
        WindowResult(detections[i], coverage[i], (xmin, ymin, xmax, ymax))
        for i in range(len(images))
    ]


def detect_in_window(
    path: Path,
    grid: Grid,
    geometry: ImageGeometry,
    bounds: tuple[float, float, float, float],
    res_m: float = 0.25,
    tile_m: float = 500.0,
    margin_m: float = 30.0,
    params: DetectorParams = DEFAULT_PARAMS,
) -> WindowResult:
    """Una sola imagen. Ver `detect_epochs_in_window`."""
    return detect_epochs_in_window(
        [(path, geometry)], grid, bounds, res_m, tile_m, margin_m, params
    )[0]
