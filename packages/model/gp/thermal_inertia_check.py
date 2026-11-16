"""¿La inercia térmica (TI) predice el hielo somero en impactos frescos mejor que la latitud sola?

Solo mide; no toca el prior (`gp/regional.py`) ni el planificador. Resultados en
`docs/EXPERIMENTS.md` (2026-11-14).

Datos:
- Impactos: `gp/regional_impacts.csv` (Daubar et al. 2022, tabla S1, norte de 20°N, sin
  "possible"; los mismos 383 del prior regional).
- TI principal: mapas globales de TES de Putzig y Mellon (2007), nocturno y diurno, 20 px/°
  (~3 km), PDS Geosciences (MGS-M-TES-5-TIMAP-V1.0). Global hasta 87°: cubre los 37 impactos
  con hielo. Datos de 1999-2004, anteriores a todos los impactos.
- TI de alta resolución: mosaico global cuantitativo de THEMIS a 100 m (USGS Astrogeology; método
  de Fergason et al. 2006), teselas de 30° × 60° en el bucket público de USGS Astrogeology. Se lee
  por ventanas con `/vsicurl` (bloques de 128 × 128), sin bajar las teselas de 2.5 GB. Cubre de
  60°S a 60°N y tiene huecos que crecen con la latitud: solo 11 de los 37 impactos con hielo
  tienen dato. Por eso quedó como prueba secundaria. Los impactos miden menos que un píxel: la TI
  es la del terreno previo.

Comparación (validación cruzada estratificada 5 × 5, mismas particiones para todos los modelos):
- `probit_lat`: probit censurado con `log(r·D)` de offset y la latitud (la familia del prior).
- `probit_lat_ti`: lo mismo más `log TI` estandarizada.
- `logit_lat`: logística en latitud y `log D` (penalización L2 fija, elegida antes de mirar).
- `logit_lat_ti`: lo mismo más `log TI`.
Métricas sobre las predicciones fuera de muestra: AUC, Brier y log-loss, con intervalo bootstrap
pareado de la diferencia y prueba de permutación de la TI dentro de franjas de 5° de latitud
(conserva la relación TI-latitud y rompe solo lo que la TI agrega).

Uso: `cd packages/model && .venv/Scripts/python -m gp.thermal_inertia_check [--refresh]`
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.optimize import minimize
from scipy.special import expit, log_ndtr, ndtr

from gp.regional import EXCAVATION_RATIO, IMPACTS_PATH, LAT_REF_DEG, LAT_SCALE_DEG
from gp.regional_validation import _auc

ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = ROOT / "data" / "processed" / "daubar2022"
TI_CSV = OUT_DIR / "thermal_inertia_themis.csv"
OUT_JSON = OUT_DIR / "thermal_inertia_check.json"

THEMIS_URL = (
    "/vsicurl/https://asc-astropedia.s3.us-west-2.amazonaws.com/Mars/Odyssey/"
    "THEMIS-Global-Thermal-Inertia-Mosaic/Quantitative-32-Bit/"
    "THEMIS_TI_Mosaic_Quant_{tile}_100mpp.cub"
)
THEMIS_RADIUS_M = 3396190.0  # radio del CRS de las teselas (eqc, lon_0 = 0)
THEMIS_LAT_MAX = 60.0
HALF_WINDOWS = {"ti_center": 0, "ti_500m": 2, "ti_1100m": 5}  # semiancho en píxeles de 100 m
TI_VALID = (1.0, 5000.0)

# TES, Putzig y Mellon (2007), PDS MGS-M-TES-5-TIMAP-V1.0 (volumen MGST_9001): 20 px/°, cilíndrica
# simple de -180 a 180, línea 1 en 90°N, enteros de 16 bits MSB; máscara de 8 bits (0 = píxel
# interpolado, se descarta). Se baja entero (52 MB cada mapa) a `data/raw/tes_putzig2007/`.
TES_DIR = ROOT / "data" / "raw" / "tes_putzig2007"
TES_PPD = 20
TES_SHAPE = (3600, 7200)
TES_COLUMNS = ("tes_night", "tes_night_3x3", "tes_day", "tes_day_night_ratio")

# Elegida después de ver la cobertura de THEMIS (11 de 37 impactos con hielo tienen dato) y antes
# de mirar métricas: TES nocturno, el píxel del impacto (~3 km).
PRIMARY_TI = "tes_night"

LOGIT_L2 = 1.0  # equivale a N(0, 1) sobre coeficientes estandarizados; fijo, no se ajusta
PERM_BAND_DEG = 5.0
S1094B = {"lat_deg": 35.1105, "lon_e_deg": 189.8273}  # packages/contracts/grid.json
ARCADIA = {"lat": (40.0, 60.0), "lon_e": (165.0, 190.0)}  # caja de la validación del 12/11
NEARBY = (10.0, 30.0)  # ±10° de latitud y ±30° de longitud, como `gp/regional.py`


# --------------------------------------------------------------------------- datos


def load_impacts(path: Path = IMPACTS_PATH) -> dict[str, np.ndarray]:
    with path.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    return {
        "lat": np.array([float(r["lat_deg"]) for r in rows]),
        "lon": np.array([float(r["lon_e_deg"]) for r in rows]),
        "diam": np.array([float(r["diameter_m"]) for r in rows]),
        "ice": np.array([r["ice"] == "1" for r in rows]),
    }


def themis_tile(lat_deg: float, lon_e_deg: float) -> tuple[str, float, float]:
    """Tesela de THEMIS que contiene el punto, y sus coordenadas x, y en metros del CRS."""
    if not -THEMIS_LAT_MAX <= lat_deg < THEMIS_LAT_MAX:
        raise ValueError(f"THEMIS cubre de 60°S a 60°N: {lat_deg}")
    lon_e = lon_e_deg % 360.0
    band = int(math.floor(lat_deg / 30.0)) * 30
    lat_name = f"{abs(band):02d}{'N' if band >= 0 else 'S'}"
    tile = f"{lat_name}{int(lon_e // 60) * 60:03d}E"
    lon = lon_e - 360.0 if lon_e >= 180.0 else lon_e  # las teselas usan -180..180
    return tile, THEMIS_RADIUS_M * math.radians(lon), THEMIS_RADIUS_M * math.radians(lat_deg)


def window_stats(block: np.ndarray, nodata: float | None) -> dict[str, float]:
    """Centro y medianas por semiancho de una ventana cuadrada impar (NaN si no hay datos)."""
    block = np.asarray(block, dtype=float)
    bad = ~np.isfinite(block) | (block < TI_VALID[0]) | (block > TI_VALID[1])
    if nodata is not None:
        bad |= np.isclose(block, nodata)
    block = np.where(bad, np.nan, block)
    c = block.shape[0] // 2
    out = {}
    for name, h in HALF_WINDOWS.items():
        sub = block[max(c - h, 0): c + h + 1, max(c - h, 0): c + h + 1]
        out[name] = float(np.nanmedian(sub)) if np.isfinite(sub).any() else float("nan")
    return out


def sample_themis(lat: Sequence[float], lon_e: Sequence[float]) -> list[dict[str, float]]:
    """TI de THEMIS en cada punto, leyendo solo la ventana de cada uno (necesita rasterio)."""
    import rasterio
    from rasterio.windows import Window

    h = max(HALF_WINDOWS.values())
    out: list[dict[str, float]] = [dict.fromkeys(HALF_WINDOWS, math.nan) for _ in lat]
    by_tile: dict[str, list[tuple[int, float, float]]] = {}
    for i, (la, lo) in enumerate(zip(lat, lon_e, strict=True)):
        if -THEMIS_LAT_MAX <= la < THEMIS_LAT_MAX:
            tile, x, y = themis_tile(la, lo)
            by_tile.setdefault(tile, []).append((i, x, y))
    env = {"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR", "CPL_VSIL_CURL_ALLOWED_EXTENSIONS": ".cub"}
    with rasterio.Env(**env):
        for tile, pts in sorted(by_tile.items()):
            with rasterio.open(THEMIS_URL.format(tile=tile)) as src:
                for i, x, y in pts:
                    row, col = src.index(x, y)
                    win = Window(col - h, row - h, 2 * h + 1, 2 * h + 1)
                    block = src.read(1, window=win, boundless=True, fill_value=np.nan)
                    out[i] = window_stats(block, src.nodata)
    return out


def tes_pixel(lat_deg: float, lon_e_deg: float) -> tuple[int, int]:
    """Fila y columna (desde 0) del mapa de TES que contiene el punto."""
    lon = (lon_e_deg + 180.0) % 360.0  # 0 = 180°W
    row = min(int((90.0 - lat_deg) * TES_PPD), TES_SHAPE[0] - 1)
    return row, int(lon * TES_PPD) % TES_SHAPE[1]


def _tes_map(which: str, tes_dir: Path) -> np.ndarray:
    ti = np.memmap(tes_dir / f"global_ti_{which}_2007.img", ">i2", "r", shape=TES_SHAPE)
    msk = np.memmap(tes_dir / f"global_ti_msk_{which}_2007.img", "u1", "r", shape=TES_SHAPE)
    return np.where((msk == 1) & (ti >= 5) & (ti <= 5000), ti, 0).astype(float)


def sample_tes(
    lat: Sequence[float], lon_e: Sequence[float], tes_dir: Path = TES_DIR
) -> dict[str, np.ndarray]:
    """TI de TES nocturna y diurna en cada punto (NaN donde el mapa está interpolado)."""
    night, day = _tes_map("night", tes_dir), _tes_map("day", tes_dir)
    out = {k: np.full(len(lat), np.nan) for k in TES_COLUMNS}
    for i, (la, lo) in enumerate(zip(lat, lon_e, strict=True)):
        r, c = tes_pixel(la, lo)
        if night[r, c] > 0:
            out["tes_night"][i] = night[r, c]
        if day[r, c] > 0:
            out["tes_day"][i] = day[r, c]
        win = night[max(r - 1, 0): r + 2, np.arange(c - 1, c + 2) % TES_SHAPE[1]]
        if (win > 0).any():
            out["tes_night_3x3"][i] = float(np.median(win[win > 0]))
    out["tes_day_night_ratio"] = out["tes_day"] / out["tes_night"]
    return out


def load_or_extract(refresh: bool = False) -> dict[str, np.ndarray]:
    """Impactos con su TI de THEMIS (guardada en `TI_CSV`, fuera de Git) y de TES."""
    imp = load_impacts()
    if refresh or not TI_CSV.exists():
        ti = sample_themis(imp["lat"], imp["lon"])
        TI_CSV.parent.mkdir(parents=True, exist_ok=True)
        with TI_CSV.open("w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["lat_deg", "lon_e_deg", "diameter_m", "ice", *HALF_WINDOWS])
            for k, row in enumerate(ti):
                w.writerow([imp["lat"][k], imp["lon"][k], imp["diam"][k], int(imp["ice"][k]),
                            *(f"{row[n]:.1f}" for n in HALF_WINDOWS)])
    with TI_CSV.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    if len(rows) != imp["lat"].size:
        raise ValueError(f"{TI_CSV.name} no coincide con los impactos; usar --refresh")
    for name in HALF_WINDOWS:
        imp[name] = np.array([float(r[name]) for r in rows])
    imp.update(sample_tes(imp["lat"], imp["lon"]))
    return imp


# --------------------------------------------------------------------------- modelos


@dataclass(frozen=True)
class Model:
    """Un modelo con su función de ajuste y su función de predicción."""

    name: str
    fit: Callable[[np.ndarray, np.ndarray, np.ndarray], np.ndarray]
    predict: Callable[[np.ndarray, np.ndarray, np.ndarray], np.ndarray]


def _standardize(train: np.ndarray, test: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Estandariza con media y desvío del entrenamiento (sin mirar el test)."""
    mu, sd = train.mean(axis=0), train.std(axis=0)
    sd = np.where(sd > 0, sd, 1.0)
    return (train - mu) / sd, (test - mu) / sd


def fit_logistic(x: np.ndarray, y: np.ndarray, l2: float = LOGIT_L2) -> np.ndarray:
    """Logística con intercepto y L2 en las pendientes. `x` ya estandarizada (sin intercepto)."""
    xa = np.c_[np.ones(len(x)), x]
    yf = y.astype(float)
    pen = np.r_[0.0, np.full(x.shape[1], l2)]

    def f(b):
        eta = xa @ b
        nll = float(np.sum(np.logaddexp(0.0, eta) - yf * eta)) + 0.5 * float(pen @ (b * b))
        return nll, xa.T @ (expit(eta) - yf) + pen * b

    return minimize(f, np.zeros(xa.shape[1]), jac=True, method="L-BFGS-B").x


def fit_censored_x(x: np.ndarray, log_rd: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Probit censurado `log d ~ N(b0 + x·b, sigma²)`, hielo = d < r·D. Devuelve `[b..., log s]`."""
    xa = np.c_[np.ones(len(x)), x]

    def f(p):
        b, s = p[:-1], math.exp(p[-1])
        z = (log_rd - xa @ b) / s
        sign = np.where(y, 1.0, -1.0)
        lz = log_ndtr(sign * z)
        lam = sign * np.exp(-0.5 * z * z - 0.5 * math.log(2 * math.pi) - lz)  # d log Φ(±z)/dz
        # dz/db = -x/s y dz/dlog s = -z; el signo final es por minimizar -log L.
        return -float(np.sum(lz)), np.r_[xa.T @ (lam / s), np.sum(lam * z)]

    p0 = np.r_[np.mean(log_rd), np.zeros(x.shape[1]), 0.0]
    bounds = [(None, None)] * (x.shape[1] + 1) + [(-7.0, 5.0)]  # evita exp(log s) desbordado
    return minimize(f, p0, jac=True, method="L-BFGS-B", bounds=bounds).x


def _lat_feature(lat: np.ndarray) -> np.ndarray:
    return ((lat - LAT_REF_DEG) / LAT_SCALE_DEG)[:, None]


def make_models(ratio: float = EXCAVATION_RATIO) -> dict[str, Model]:
    """Los cuatro modelos. `data` es (lat, diam, log_ti) por fila; los ajustes no ven el test."""

    def probit(use_ti: bool) -> Model:
        def feats(d):
            return np.c_[_lat_feature(d[:, 0]), d[:, 2]] if use_ti else _lat_feature(d[:, 0])

        def fit(d, y, _unused):
            return fit_censored_x(feats(d), np.log(ratio * d[:, 1]), y)

        def predict(params, d, _train):
            xa = np.c_[np.ones(len(d)), feats(d)]
            return ndtr((np.log(ratio * d[:, 1]) - xa @ params[:-1]) / math.exp(params[-1]))

        return Model("probit_lat_ti" if use_ti else "probit_lat", fit, predict)

    def logit(use_ti: bool) -> Model:
        cols = [0, 1, 2] if use_ti else [0, 1]

        def raw(d):
            return np.c_[d[:, 0], np.log(d[:, 1]), d[:, 2]][:, cols]

        def fit(d, y, _unused):
            xs, _ = _standardize(raw(d), raw(d))
            return fit_logistic(xs, y)

        def predict(params, d, train):
            _, xs = _standardize(raw(train), raw(d))
            return expit(np.c_[np.ones(len(d)), xs] @ params)

        return Model("logit_lat_ti" if use_ti else "logit_lat", fit, predict)

    return {m.name: m for m in (probit(False), probit(True), logit(False), logit(True))}


def stratified_folds(y: np.ndarray, k: int = 5, repeats: int = 5, seed: int = 0) -> np.ndarray:
    """Asignación de pliegue por repetición, `(repeats, n)`, estratificada por hielo."""
    rng = np.random.default_rng(seed)
    out = np.empty((repeats, y.size), dtype=int)
    for r in range(repeats):
        for cls in (True, False):
            idx = rng.permutation(np.flatnonzero(y == cls))
            out[r, idx] = np.arange(idx.size) % k
    return out


def cv_predict(model: Model, data: np.ndarray, y: np.ndarray, folds: np.ndarray) -> np.ndarray:
    """Predicciones fuera de muestra, `(repeats, n)`. La TI se estandariza dentro del pliegue."""
    out = np.empty(folds.shape)
    for r in range(folds.shape[0]):
        for f in np.unique(folds[r]):
            te, tr = folds[r] == f, folds[r] != f
            d_tr, d_te = data[tr].copy(), data[te].copy()
            d_tr[:, 2], d_te[:, 2] = (v.ravel() for v in _standardize(d_tr[:, 2:3], d_te[:, 2:3]))
            params = model.fit(d_tr, y[tr], None)
            out[r, te] = model.predict(params, d_te, d_tr)
    return np.clip(out, 1e-6, 1 - 1e-6)


def metrics(p: np.ndarray, y: np.ndarray) -> dict[str, float]:
    p = np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return {
        "auc": _auc(p, y),
        "brier": float(np.mean((p - y) ** 2)),
        "log_loss": float(-np.mean(np.where(y, np.log(p), np.log1p(-p)))),
    }


def mean_metrics(preds: np.ndarray, y: np.ndarray) -> dict[str, float]:
    """Métricas de cada repetición, promediadas."""
    per = [metrics(p, y) for p in preds]
    return {k: float(np.mean([m[k] for m in per])) for k in per[0]}


def bootstrap_diff(
    p_a: np.ndarray, p_b: np.ndarray, y: np.ndarray, n_boot: int = 2000, seed: int = 1
) -> dict[str, dict[str, float]]:
    """Intervalo del 90 % de `métrica(b) − métrica(a)`, remuestreando impactos (pareado)."""
    rng = np.random.default_rng(seed)
    pos, neg = np.flatnonzero(y), np.flatnonzero(~y)
    draws = []
    for _ in range(n_boot):
        i = np.r_[rng.choice(pos, pos.size), rng.choice(neg, neg.size)]  # estratificado
        ma, mb = metrics(p_a[i], y[i]), metrics(p_b[i], y[i])
        draws.append({k: mb[k] - ma[k] for k in ma})
    out = {}
    for k in draws[0]:
        v = np.array([d[k] for d in draws])
        better = v > 0 if k == "auc" else v < 0
        out[k] = {"lo90": float(np.quantile(v, 0.05)), "hi90": float(np.quantile(v, 0.95)),
                  "p_b_better": float(better.mean())}
    return out


def permute_within_bands(
    x: np.ndarray, lat: np.ndarray, rng: np.random.Generator, band_deg: float = PERM_BAND_DEG
) -> np.ndarray:
    """Baraja `x` solo entre impactos de la misma franja de latitud."""
    out = x.copy()
    bands = np.floor(lat / band_deg).astype(int)
    for b in np.unique(bands):
        idx = np.flatnonzero(bands == b)
        out[idx] = x[rng.permutation(idx)]
    return out


def permutation_test(
    base: Model,
    with_ti: Model,
    data: np.ndarray,
    y: np.ndarray,
    folds: np.ndarray,
    n_perm: int = 300,
    seed: int = 2,
) -> dict[str, float]:
    """¿La mejora de log-loss con la TI real supera a la de TI barajada dentro de franjas?"""
    ll_base = mean_metrics(cv_predict(base, data, y, folds), y)["log_loss"]
    gain = ll_base - mean_metrics(cv_predict(with_ti, data, y, folds), y)["log_loss"]
    rng = np.random.default_rng(seed)
    null = np.empty(n_perm)
    for j in range(n_perm):
        d = data.copy()
        d[:, 2] = permute_within_bands(data[:, 2], data[:, 0], rng)
        null[j] = ll_base - mean_metrics(cv_predict(with_ti, d, y, folds), y)["log_loss"]
    return {
        "log_loss_gain": float(gain),
        "null_mean": float(null.mean()),
        "null_95": float(np.quantile(null, 0.95)),
        "p_value": float((1 + np.sum(null >= gain)) / (1 + n_perm)),
        "n_perm": n_perm,
    }


# --------------------------------------------------------------------------- análisis


def _subset_counts(p: np.ndarray, y: np.ndarray, mask: np.ndarray) -> dict[str, float]:
    sd = math.sqrt(float(np.sum(p[mask] * (1 - p[mask]))))
    exp = float(p[mask].sum())
    obs = int(y[mask].sum())
    return {"n": int(mask.sum()), "ice": obs, "expected": exp,
            "z": (obs - exp) / sd if sd > 0 else float("nan")}


def run(
    imp: dict[str, np.ndarray],
    ti_col: str = PRIMARY_TI,
    lat_min: float = 20.0,
    repeats: int = 5,
    n_perm: int = 300,
    seed: int = 0,
) -> dict:
    """Comparación completa sobre los impactos con TI válida al norte de `lat_min`."""
    ok = np.isfinite(imp[ti_col]) & (imp["lat"] >= lat_min)
    lat, lon, diam, y = imp["lat"][ok], imp["lon"][ok], imp["diam"][ok], imp["ice"][ok]
    log_ti = np.log(imp[ti_col][ok])
    data = np.c_[lat, diam, log_ti]
    folds = stratified_folds(y, repeats=repeats, seed=seed)
    models = make_models()
    preds = {name: cv_predict(m, data, y, folds) for name, m in models.items()}
    mean_p = {name: p.mean(axis=0) for name, p in preds.items()}
    base_rate = np.full(y.size, y.mean())

    out: dict = {
        "ti_column": ti_col,
        "lat_min": lat_min,
        "n": int(y.size),
        "n_ice": int(y.sum()),
        "ti_median_ice": float(np.exp(np.median(log_ti[y]))),
        "ti_median_no_ice": float(np.exp(np.median(log_ti[~y]))),
        "corr_lat_log_ti": float(np.corrcoef(lat, log_ti)[0, 1]),
        "constant_rate": metrics(base_rate, y),
        "cv": {name: mean_metrics(p, y) for name, p in preds.items()},
        "diff_vs_lat": {},
        "permutation": {},
    }
    for base, with_ti in (("probit_lat", "probit_lat_ti"), ("logit_lat", "logit_lat_ti")):
        out["diff_vs_lat"][with_ti] = bootstrap_diff(mean_p[base], mean_p[with_ti], y)
        if n_perm:
            out["permutation"][with_ti] = permutation_test(
                models[base], models[with_ti], data, y, folds, n_perm=n_perm)

    # Coeficiente de la TI con todos los datos (probit: en log d; signo negativo = más somero).
    xs = np.c_[_lat_feature(lat), (log_ti - log_ti.mean()) / log_ti.std()]
    log_rd = np.log(EXCAVATION_RATIO * diam)
    params = fit_censored_x(xs, log_rd, y)
    lat_only = fit_censored_x(xs[:, :1], log_rd, y)  # misma muestra, sin TI
    rng = np.random.default_rng(seed + 3)
    b_ti = []
    for _ in range(200):
        i = rng.integers(0, y.size, y.size)
        if y[i].any() and not y[i].all():
            b_ti.append(fit_censored_x(xs[i], log_rd[i], y[i])[2])
    out["probit_full_fit"] = {"b0": float(params[0]), "b_lat": float(params[1]),
                              "b_log_ti_std": float(params[2]), "sigma": math.exp(params[3]),
                              "b_log_ti_std_90": [float(np.quantile(b_ti, 0.05)),
                                                  float(np.quantile(b_ti, 0.95))],
                              "log_ti_mean": float(log_ti.mean()),
                              "log_ti_sd": float(log_ti.std()),
                              "lat_only": {"b0": float(lat_only[0]), "b_lat": float(lat_only[1]),
                                           "sigma": math.exp(lat_only[2])}}

    # ¿La TI explica el exceso de Arcadia? Esperados fuera de muestra con y sin TI.
    arcadia = ((lat >= ARCADIA["lat"][0]) & (lat < ARCADIA["lat"][1])
               & (lon >= ARCADIA["lon_e"][0]) & (lon <= ARCADIA["lon_e"][1]))
    near = (np.abs(lat - S1094B["lat_deg"]) <= NEARBY[0]) & (
        np.abs((lon - S1094B["lon_e_deg"] + 180) % 360 - 180) <= NEARBY[1])
    out["subsets"] = {}
    for label, mask in (("arcadia", arcadia), ("near_s1094b", near)):
        if not mask.any():
            continue
        out["subsets"][label] = {
            "ti_median_ice": float(np.exp(np.median(log_ti[mask & y]))) if (mask & y).any()
            else None,
            "ti_median_no_ice": float(np.exp(np.median(log_ti[mask & ~y]))),
            **{name: _subset_counts(mean_p[name], y, mask) for name in models},
        }
    return out


def site_estimate(result: dict, site_ti: float, lat_deg: float = S1094B["lat_deg"]) -> dict:
    """Profundidad en el sitio con probit + TI y con solo latitud, ajustados a la misma muestra.

    Solo para comparar; el prior en uso no cambia.
    """
    f = result["probit_full_fit"]
    lo = f["lat_only"]
    x_lat = (lat_deg - LAT_REF_DEG) / LAT_SCALE_DEG
    z_ti = (math.log(site_ti) - f["log_ti_mean"]) / f["log_ti_sd"]

    def summary(mean: float, sigma: float) -> dict[str, float]:
        return {"median_m": math.exp(mean), "p_within_1m": float(ndtr(-mean / sigma)),
                "p_within_3m": float(ndtr((math.log(3.0) - mean) / sigma))}

    return {"site_ti": site_ti, "z_ti": z_ti,
            "with_ti": summary(f["b0"] + f["b_lat"] * x_lat + f["b_log_ti_std"] * z_ti,
                               f["sigma"]),
            "lat_only_same_sample": summary(lo["b0"] + lo["b_lat"] * x_lat, lo["sigma"])}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--refresh", action="store_true", help="vuelve a leer la TI de THEMIS")
    ap.add_argument("--perm", type=int, default=300)
    args = ap.parse_args()
    imp = load_or_extract(args.refresh)
    site_lat, site_lon = [S1094B["lat_deg"]], [S1094B["lon_e_deg"]]
    site = {**sample_themis(site_lat, site_lon)[0],
            **{k: float(v[0]) for k, v in sample_tes(site_lat, site_lon).items()}}
    # Variantes declaradas antes de mirar métricas: (columna de TI, latitud mínima, permutación).
    variants = {
        "tes_night": ("tes_night", 20.0, args.perm),
        "tes_night_lat35": ("tes_night", 35.0, args.perm),
        "tes_day": ("tes_day", 20.0, args.perm),
        "tes_night_3x3": ("tes_night_3x3", 20.0, 0),
        "tes_day_night_ratio": ("tes_day_night_ratio", 20.0, args.perm),  # exploratoria
        "themis_500m": ("ti_500m", 20.0, args.perm),
        "themis_center": ("ti_center", 20.0, 0),
        "themis_1100m": ("ti_1100m", 20.0, 0),
    }
    result = {
        "data": "Daubar et al. (2022) S1, >20°N sin 'possible'; TI de TES (Putzig y Mellon 2007, "
                "PDS) y de THEMIS 100 m (USGS)",
        "coverage": {"n_impacts": int(imp["lat"].size),
                     **{c: int(np.isfinite(imp[c]).sum()) for c in (*TES_COLUMNS, "ti_500m")}},
        "s1094b_ti": site,
    }
    for key, (col, lat_min, n_perm) in variants.items():
        result[key] = run(imp, ti_col=col, lat_min=lat_min, n_perm=n_perm)
    result["s1094b_probit_ti"] = {
        "tes_night": site_estimate(result["tes_night"], site["tes_night"]),
        "themis_500m": site_estimate(result["themis_500m"], site["ti_500m"]),
    }
    OUT_JSON.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    for key in variants:
        r = result[key]
        print(f"\n[{key}] n={r['n']} hielo={r['n_ice']} "
              f"corr(lat, log TI)={r['corr_lat_log_ti']:.2f}")
        for name, m in {"constante": r["constant_rate"], **r["cv"]}.items():
            print(f"  {name:14s} AUC {m['auc']:.3f}  Brier {m['brier']:.4f}  "
                  f"log-loss {m['log_loss']:.4f}")
        for name, d in r["diff_vs_lat"].items():
            print(f"  {name} - lat: " + "; ".join(
                f"{k} [{v['lo90']:+.4f}, {v['hi90']:+.4f}]" for k, v in d.items()))
        f = r["probit_full_fit"]
        print(f"  probit, coef. de log TI (estandarizada, en log d): {f['b_log_ti_std']:+.3f} "
              f"(90 % {f['b_log_ti_std_90'][0]:+.3f} a {f['b_log_ti_std_90'][1]:+.3f})")
        for label, s in r["subsets"].items():
            print(f"  {label}: " + "; ".join(
                f"{m} {s[m]['ice']}/{s[m]['expected']:.1f} (z {s[m]['z']:+.1f})"
                for m in ("probit_lat", "probit_lat_ti", "logit_lat", "logit_lat_ti")))
        for name, pt in r["permutation"].items():
            print(f"  permutación {name}: ganancia {pt['log_loss_gain']:+.4f}, "
                  f"nulo 95 % {pt['null_95']:+.4f}, p = {pt['p_value']:.3f}")
    print(f"\nTI en S1094b: {site}")
    print(f"S1094b con probit + TI: {result['s1094b_probit_ti']}")
    print(f"escrito {OUT_JSON}")


if __name__ == "__main__":
    main()
