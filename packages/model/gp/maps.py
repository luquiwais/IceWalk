"""Mapas de hielo sobre una grilla, como datos para la web (`map.schema.json`).

El back manda dos capas de valores por celda y el front las dibuja (decisión del 2026-11-10):

- `probability`: P(d <= umbral), con el umbral de la STM.
- `uncertainty`: cuánta de la duda que un dato puede sacar sigue ahí. 1 = sin datos cerca (se sabe
  lo mismo que el prior); 0 = como si se hubiera medido justo en esa celda. Se calcula con la
  varianza de la parte espacial del GP, desde la que deja una medición exacta en el punto (en
  S1094b, la mitad del total es nugget: varía de metro a metro y ningún dato la predice) hasta la
  del prior, y se informa como desvío. No es la entropía en bits de las estaciones del plan: esa es
  función de la probabilidad sola y no dice dónde hay datos.

El front deriva dos capas más, con las fórmulas y paletas que viajan en la respuesta:

- `change` = probabilidad - probabilidad del prior. Positivo: hielo más somero que lo esperado.
- `potential` (por defecto; supresión de valor por incertidumbre, cuestión 49): el azul de la
  probabilidad mezclado con gris en proporción a la incertidumbre. Lejos de los datos se ve gris.

Colores en tonos de azul, porque es agua (pedido de Producto). `change` es divergente: gris neutro
sin información, azul hacia más somero y gris pizarra hacia más profundo.

Cada capa va cuantizada a 8 bits (0-254; 255 = sin dato) y en base64: la zona de una EVA (unas
100 000 celdas a 10 m) pesa ~140 kB por capa. Calcularla tarda ~1.6 s en la compu de desarrollo y
se hace una vez; después de una medición, `update_window` recalcula solo a menos de 3 alcances de
cada dato nuevo (correlación ~1e-5 más allá), en centésimas de segundo.

`to_rgba`, `potential_rgba` y `to_png` son la referencia de los colores, para tests y prototipos.
"""

from __future__ import annotations

import base64
import math
import struct
import zlib
from collections.abc import Sequence
from dataclasses import dataclass, replace
from typing import Any

import numpy as np
from scipy.special import ndtr

from gp.posterior import Posterior, Prior

DATA_LAYERS = ("probability", "uncertainty")
DERIVED_LAYERS = ("change", "potential")

MAX_CELLS = 2_000_000  # tope por pedido: la grilla completa de S1094b a 10 m tiene ~760 000
CHUNK = 40_000
UPDATE_REACH_RANGES = 3.0
QUANT_MAX = 254
NODATA = 255

# Rampa azul de la paleta validada de visualización (pasos 100-700), con un primer paso casi blanco.
BLUE = ("#f4f8fd", "#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b")
# Divergente: gris pizarra (más profundo) - gris neutro (sin información) - azul (más somero).
SLATE_BLUE = ("#3e4a56", "#8a96a3", "#c9ced4", "#e6e6e6", "#cde2fb", "#3987e5", "#0d366b")
FOG_GRAY = "#d4d8dd"  # gris del potencial donde no hay información

_SCALES: dict[str, dict[str, Any]] = {
    "probability": {"label": "P(ice within {t:g} m)", "units": "probability", "min": 0.0,
                    "max": 1.0, "colors": BLUE},
    "uncertainty": {"label": "Uncertainty left (1 = prior only)", "units": "fraction_of_prior",
                    "min": 0.0, "max": 1.0, "colors": BLUE},
    "change": {"label": "Change vs. prior: deeper (-) / shallower (+)", "units": "probability",
               "min": -0.5, "max": 0.5, "colors": SLATE_BLUE},
}
POTENTIAL_FORMULA = "color = mix(probability_color(p), fog, u), with u = uncertainty in [0, 1]"


@dataclass(frozen=True)
class MapGrid:
    """Caja en metros de la grilla del sitio y tamaño de celda. La fila 0 es el borde norte."""

    xmin: float
    xmax: float
    ymin: float
    ymax: float
    cell_m: float

    def __post_init__(self) -> None:
        for name in ("xmin", "xmax", "ymin", "ymax", "cell_m"):
            if not math.isfinite(getattr(self, name)):
                raise ValueError(f"{name} debe ser finito")
        if self.cell_m <= 0:
            raise ValueError(f"cell_m debe ser positivo: {self.cell_m}")
        if self.xmax <= self.xmin or self.ymax <= self.ymin:
            raise ValueError("La caja está vacía: xmax > xmin e ymax > ymin")
        if self.width * self.height > MAX_CELLS:
            raise ValueError(
                f"Demasiadas celdas ({self.width * self.height} > {MAX_CELLS}): "
                "usar una celda más grande o una ventana"
            )

    @property
    def width(self) -> int:
        return math.ceil((self.xmax - self.xmin) / self.cell_m - 1e-9)

    @property
    def height(self) -> int:
        return math.ceil((self.ymax - self.ymin) / self.cell_m - 1e-9)

    @property
    def shape(self) -> tuple[int, int]:
        return self.height, self.width

    def centers(self) -> tuple[np.ndarray, np.ndarray]:
        """Centros de celda, de forma (alto, ancho): x crece hacia el este, y baja hacia el sur."""
        xs = self.xmin + (np.arange(self.width) + 0.5) * self.cell_m
        ys = self.ymax - (np.arange(self.height) + 0.5) * self.cell_m
        return np.meshgrid(xs, ys)

    @classmethod
    def from_grid_json(cls, grid: dict[str, Any], cell_m: float | None = None) -> MapGrid:
        """La caja de `packages/contracts/grid.json`, a su celda o a otra más grande."""
        e = grid["extent_m"]
        return cls(e["xmin"], e["xmax"], e["ymin"], e["ymax"], cell_m or grid["cell_size_m"])

    @classmethod
    def around(cls, x_m: float, y_m: float, half_m: float, cell_m: float) -> MapGrid:
        """Ventana cuadrada centrada en un punto, por ejemplo el hábitat."""
        return cls(x_m - half_m, x_m + half_m, y_m - half_m, y_m + half_m, cell_m)


@dataclass(frozen=True)
class IceMaps:
    grid: MapGrid
    threshold_m: float
    probability: np.ndarray
    uncertainty: np.ndarray
    prior_probability: float

    @property
    def change(self) -> np.ndarray:
        return self.probability - self.prior_probability

    def layer(self, kind: str) -> np.ndarray:
        if kind not in (*DATA_LAYERS, "change"):
            raise ValueError(f"Capa desconocida: {kind!r}")
        return getattr(self, kind)


def prior_probability(prior: Prior, threshold_m: float) -> float:
    """P(d <= umbral) del prior solo: el valor de una celda sin ningún dato cerca."""
    sd = math.sqrt(prior.kernel.sill + prior.nugget)
    return float(ndtr((math.log(threshold_m) - prior.mean_log_depth) / sd))


def _evaluate(post: Posterior, x: np.ndarray, y: np.ndarray, threshold_m: float):
    prior = post.prior
    log_t = math.log(threshold_m)
    sill = prior.kernel.sill
    floor = sill * prior.nugget / (sill + prior.nugget)  # lo que deja medir justo ahí
    p = np.empty(x.size)
    u = np.empty(x.size)
    for i in range(0, x.size, CHUNK):
        mean, var = post.predict(x[i : i + CHUNK], y[i : i + CHUNK])
        p[i : i + CHUNK] = ndtr((log_t - mean) / np.sqrt(var + prior.nugget))
        u[i : i + CHUNK] = np.sqrt(np.clip((var - floor) / (sill - floor), 0.0, 1.0))
    return p, u


def ice_maps(post: Posterior, grid: MapGrid, threshold_m: float) -> IceMaps:
    """Probabilidad e incertidumbre en toda la grilla. Calcularlo una vez por sitio y umbral."""
    if not math.isfinite(threshold_m) or threshold_m <= 0:
        raise ValueError(f"threshold_m debe ser finito y positivo: {threshold_m}")
    x, y = grid.centers()
    p, u = _evaluate(post, x.ravel(), y.ravel(), threshold_m)
    return IceMaps(grid, threshold_m, p.reshape(grid.shape), u.reshape(grid.shape),
                   prior_probability(post.prior, threshold_m))


def update_window(
    maps: IceMaps,
    post: Posterior,
    points: Sequence[tuple[float, float]],
    radius_m: float | None = None,
) -> IceMaps:
    """Recalcula solo las celdas cerca de datos nuevos; el resto queda igual.

    `post` ya incluye los datos nuevos, y `points` son sus posiciones. Por defecto, el radio es
    3 alcances del kernel: más lejos la correlación es ~1e-5 y el mapa no cambia.
    """
    if not points:
        return maps
    reach = radius_m if radius_m is not None else UPDATE_REACH_RANGES * post.prior.kernel.range_m
    x, y = maps.grid.centers()
    xf, yf = x.ravel(), y.ravel()
    near = np.zeros(xf.size, dtype=bool)
    for px, py in points:
        near |= np.hypot(xf - px, yf - py) < reach
    probability = maps.probability.ravel().copy()
    uncertainty = maps.uncertainty.ravel().copy()
    if near.any():
        probability[near], uncertainty[near] = _evaluate(post, xf[near], yf[near],
                                                         maps.threshold_m)
    shape = maps.grid.shape
    return replace(maps, probability=probability.reshape(shape),
                   uncertainty=uncertainty.reshape(shape))


# --- formato de la web --------------------------------------------------------------------------


def encode_layer(values: np.ndarray, lo: float, hi: float) -> dict[str, Any]:
    """Cuantiza a 8 bits por fila desde el norte: valor = min + q / 254 * (max - min); 255 = NaN."""
    v = np.asarray(values, dtype=float)
    q = np.rint((np.clip(v, lo, hi) - lo) / (hi - lo) * QUANT_MAX)
    q = np.where(np.isfinite(v), q, NODATA).astype(np.uint8)
    return {"encoding": "uint8-base64", "min": lo, "max": hi, "nodata": NODATA,
            "data": base64.b64encode(q.tobytes()).decode("ascii")}


def decode_layer(layer: dict[str, Any], shape: tuple[int, int]) -> np.ndarray:
    """Inversa de `encode_layer` (lo mismo que hace el front)."""
    q = np.frombuffer(base64.b64decode(layer["data"]), dtype=np.uint8).reshape(shape)
    v = layer["min"] + q.astype(float) / QUANT_MAX * (layer["max"] - layer["min"])
    return np.where(q == layer["nodata"], np.nan, v)


def palettes(threshold_m: float) -> dict[str, Any]:
    """Escalas de color de las cuatro capas, con la forma de `map.schema.json`."""
    out: dict[str, Any] = {}
    for kind, spec in _SCALES.items():
        values = np.linspace(spec["min"], spec["max"], len(spec["colors"]))
        out[kind] = {
            "label": spec["label"].format(t=threshold_m),
            "units": spec["units"],
            "min": spec["min"],
            "max": spec["max"],
            "stops": [{"value": round(float(v), 4), "color": c}
                      for v, c in zip(values, spec["colors"], strict=True)],
        }
    out["potential"] = {
        "label": f"Ice potential within {threshold_m:g} m (grey = unknown)",
        "base": "probability",
        "suppress_by": "uncertainty",
        "fog_color": FOG_GRAY,
        "formula": POTENTIAL_FORMULA,
    }
    return out


def map_payload(
    maps: IceMaps,
    *,
    site_id: str,
    bounds_lonlat: dict[str, float],
    plan_id: str | None = None,
    craters_in_model: int = 0,
    measurements_in_model: int = 0,
    is_mock: bool = False,
    notes: str | None = None,
) -> dict[str, Any]:
    """Respuesta de `GET /maps` según `map.schema.json`. Las lon/lat las pone quien sirve."""
    g = maps.grid
    payload: dict[str, Any] = {
        "site_id": site_id,
        "plan_id": plan_id,
        "threshold_m": maps.threshold_m,
        "cell_size_m": g.cell_m,
        "width": g.width,
        "height": g.height,
        "bounds_xy_m": {"xmin": g.xmin, "xmax": g.xmin + g.width * g.cell_m,
                        "ymin": g.ymax - g.height * g.cell_m, "ymax": g.ymax},
        "bounds_lonlat": bounds_lonlat,
        "prior_probability": round(maps.prior_probability, 4),
        "layers": {kind: encode_layer(maps.layer(kind), _SCALES[kind]["min"],
                                      _SCALES[kind]["max"]) for kind in DATA_LAYERS},
        "palettes": palettes(maps.threshold_m),
        "is_prior_only": craters_in_model == 0 and measurements_in_model == 0,
        "craters_in_model": craters_in_model,
        "measurements_in_model": measurements_in_model,
        "is_mock": is_mock,
    }
    if notes:
        payload["notes"] = notes
    return payload


# --- colores de referencia ----------------------------------------------------------------------


def _rgb(colors: Sequence[str]) -> np.ndarray:
    return np.array([[int(c[i : i + 2], 16) for i in (1, 3, 5)] for c in colors], dtype=float)


def _ramp(values: np.ndarray, kind: str) -> np.ndarray:
    spec = _SCALES[kind]
    stops = _rgb(spec["colors"])
    t = np.clip((values - spec["min"]) / (spec["max"] - spec["min"]), 0.0, 1.0)
    t = np.where(np.isfinite(t), t, 0.0) * (len(stops) - 1)
    i = np.minimum(t.astype(int), len(stops) - 2)
    u = (t - i)[..., None]
    return stops[i] + (stops[i + 1] - stops[i]) * u


def _with_alpha(rgb: np.ndarray, valid: np.ndarray) -> np.ndarray:
    alpha = np.where(valid, 255, 0)[..., None]
    return np.concatenate([np.rint(rgb), alpha], axis=-1).astype(np.uint8)


def to_rgba(values: np.ndarray, kind: str) -> np.ndarray:
    """Valores de `probability`, `uncertainty` o `change` a RGBA (uint8). NaN queda transparente."""
    if kind not in _SCALES:
        raise ValueError(f"Capa desconocida: {kind!r}; opciones: {tuple(_SCALES)}")
    v = np.asarray(values, dtype=float)
    return _with_alpha(_ramp(v, kind), np.isfinite(v))


def potential_rgba(probability: np.ndarray, uncertainty: np.ndarray) -> np.ndarray:
    """Potencial: el azul de la probabilidad, mezclado con gris según la incertidumbre."""
    p = np.asarray(probability, dtype=float)
    u = np.clip(np.asarray(uncertainty, dtype=float), 0.0, 1.0)
    fog = _rgb([FOG_GRAY])[0]
    rgb = _ramp(p, "probability") * (1 - u[..., None]) + fog * u[..., None]
    return _with_alpha(rgb, np.isfinite(p) & np.isfinite(u))


def to_png(rgba: np.ndarray) -> bytes:
    """PNG de una imagen RGBA (alto, ancho, 4), sin dependencias fuera de la librería estándar."""
    rgba = np.asarray(rgba)
    if rgba.ndim != 3 or rgba.shape[2] != 4 or rgba.dtype != np.uint8:
        raise ValueError("Se espera RGBA uint8 de forma (alto, ancho, 4)")
    height, width = rgba.shape[:2]
    raw = b"".join(b"\x00" + rgba[row].tobytes() for row in range(height))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(
            ">I", zlib.crc32(tag + data) & 0xFFFFFFFF
        )

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))
