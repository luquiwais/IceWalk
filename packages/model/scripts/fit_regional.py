"""Ajusta el prior regional con la tabla S1 de Daubar et al. 2022 y escribe gp/regional_fit.json.

Datos (CC BY 4.0, https://zenodo.org/record/6604912), fuera de Git:
- `data/raw/daubar2022/Daubar_2022_catalog_tableS1.xlsx` (original), o
- `data/processed/daubar2022/craters.csv` (el mismo, limpio; lo escribe `--xlsx`).

En el original los encabezados de latitud y longitud están cruzados: la columna "Latitude (deg E)"
trae la latitud y "Longitude (deg N)" la longitud este. Acá se leen por posición.

Uso (desde la raíz del repo):
    python packages/model/scripts/fit_regional.py
    python packages/model/scripts/fit_regional.py --xlsx <tabla S1 original>
(`--xlsx` necesita openpyxl, que no es dependencia del modelo.)
"""

import argparse
import csv
import json
import math
import sys
from dataclasses import replace
from datetime import date
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "packages" / "model"))

from gp.regional import (  # noqa: E402
    EXCAVATION_RATIO,
    FIT_PATH,
    MIN_LAT_DEG,
    _features,
    bootstrap_fit,
    fit_censored,
    regional_estimate,
)

CSV_PATH = ROOT / "data" / "processed" / "daubar2022" / "craters.csv"
S1094B_LAT = 35.11
N_BOOT = 500


def xlsx_to_csv(src: Path, dst: Path) -> None:
    import openpyxl

    ws = openpyxl.load_workbook(src, read_only=True, data_only=True).worksheets[0]
    rows = ws.iter_rows(values_only=True)
    next(rows)
    out = []
    for r in rows:
        if r[0] is None:
            continue
        out.append({
            "hirise_id": r[0], "lat_deg": float(r[1]), "lon_e_deg": float(r[2]) % 360,
            "ls": r[3], "image_date": r[4].date().isoformat() if r[4] else "", "mars_year": r[5],
            "kind": r[6], "ice": str(r[7]).strip().lower(), "diameter_m": float(r[12]),
        })
    dst.parent.mkdir(parents=True, exist_ok=True)
    with dst.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0]))
        w.writeheader()
        w.writerows(out)


def load(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Cráteres del norte (> 20°N), sin los "possible". Devuelve lat, lon, D, hielo."""
    lat, lon, diam, ice = [], [], [], []
    with path.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["ice"] not in ("y", "n") or float(r["lat_deg"]) <= MIN_LAT_DEG:
                continue
            lat.append(float(r["lat_deg"]))
            lon.append(float(r["lon_e_deg"]))
            diam.append(float(r["diameter_m"]))
            ice.append(r["ice"] == "y")
    return np.array(lat), np.array(lon), np.array(diam), np.array(ice)


def sector_cv_logloss(lat, lon, diam, ice, ratio) -> dict[str, float]:
    """Log-loss dejando afuera cada sector de 60° de longitud, contra una tasa constante."""
    from scipy.special import ndtr

    oos = np.zeros(ice.size)
    sectors = (lon // 60).astype(int)
    for s in np.unique(sectors):
        tr, te = sectors != s, sectors == s
        beta, sigma = fit_censored(lat[tr], diam[tr], ice[tr], ratio)
        z = (np.log(ratio * diam[te]) - _features(lat[te]) @ beta) / sigma
        oos[te] = np.clip(ndtr(z), 1e-9, 1 - 1e-9)
    ll = -float(np.mean(np.where(ice, np.log(oos), np.log(1 - oos))))
    base = ice.mean()
    ll0 = -float(base * math.log(base) + (1 - base) * math.log(1 - base))
    return {"latitude": round(ll, 4), "constant_rate": round(ll0, 4)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--xlsx", type=Path, help="tabla S1 original; escribe el CSV limpio")
    ap.add_argument("--csv", type=Path, default=CSV_PATH)
    args = ap.parse_args()
    if args.xlsx:
        xlsx_to_csv(args.xlsx, args.csv)
    lat, lon, diam, ice = load(args.csv)

    fit = bootstrap_fit(lat, diam, ice, EXCAVATION_RATIO, n_boot=N_BOOT, seed=0)
    cv = sector_cv_logloss(lat, lon, diam, ice, EXCAVATION_RATIO)
    beta_02, sigma_02 = fit_censored(lat, diam, ice, 0.2)
    median_02 = math.exp(float(_features(np.array([S1094B_LAT]))[0] @ beta_02))

    meta = {
        "source": "Daubar et al. (2022) JGR Planets, doi:10.1029/2021JE007145, tabla S1 "
                  "(CC BY 4.0, https://zenodo.org/record/6604912)",
        "model": "log d ~ N(beta0 + beta1 * (lat - 40) / 10, sigma_log^2); hielo: d < ratio * D",
        "selection": "hemisferio norte, lat > 20, sin 'possible'",
        "assumption": True,
        "assumption_notes": "ratio = 0.1 sin fuente directa (docs/SOURCES.md)",
        "n_boot": N_BOOT,
        "cv_logloss_by_60deg_longitude": cv,
        "sensitivity_ratio_0_2": {"s1094b_median_m": round(median_02, 2),
                                  "sigma_log": round(sigma_02, 3)},
        "fitted_on": date.today().isoformat(),
        "script": "packages/model/scripts/fit_regional.py",
    }
    fit = replace(fit, meta=meta)
    FIT_PATH.write_text(json.dumps(fit.to_json(), indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")

    est = regional_estimate(S1094B_LAT, fit)
    lo, hi = est.median_interval_m()
    print(f"ok {FIT_PATH.relative_to(ROOT)}: n={fit.n_craters} hielo={fit.n_ice} "
          f"beta={np.round(fit.beta, 3)} sigma={fit.sigma_log:.3f}")
    print(f"validación por sectores: {cv}")
    print(f"S1094b: mediana {est.median_m:.2f} m (90 %: {lo:.2f}-{hi:.2f}), "
          f"desvío total {est.sd_total:.2f}, P(d<=1 m)={est.p_within(1):.3f}, "
          f"P(d<=3 m)={est.p_within(3):.3f}; con ratio 0.2, mediana {median_02:.2f} m")


if __name__ == "__main__":
    main()
