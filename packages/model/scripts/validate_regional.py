"""Valida el prior regional: calibración fuera de muestra, conteos y sitios donde se cavó.

Lee `data/processed/daubar2022/craters.csv` (fuera de Git; lo escribe `fit_regional.py --xlsx`) y
escribe `data/processed/daubar2022/validation.json`. Resultados en `docs/EXPERIMENTS.md`.

Uso: `cd packages/model && uv run python scripts/validate_regional.py`
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fit_regional import CSV_PATH, load  # noqa: E402

from gp.regional import load_fit  # noqa: E402
from gp.regional_validation import (  # noqa: E402
    calibration,
    counts,
    in_sample_predictions,
    lander_check,
    sector_predictions,
)

OUT = CSV_PATH.with_name("validation.json")
BANDS = ((20, 35), (35, 40), (40, 45), (45, 50), (50, 60), (60, 90))
# Utopia y Arcadia, alrededor de Viking 2 y de los sitios de Byrne et al. (2009), elegida después
# de ver la tensión con Viking 2: es un control a posteriori, no una prueba.
UTOPIA_ARCADIA = {"lat": (40, 60), "lon_e": (130, 190)}


def main() -> None:
    fit = load_fit()
    lat, lon, diam, ice = load(CSV_PATH)
    oos = sector_predictions(lat, lon, diam, ice, fit.ratio)
    ins = in_sample_predictions(lat, diam, fit)
    box = (
        (lat >= UTOPIA_ARCADIA["lat"][0]) & (lat < UTOPIA_ARCADIA["lat"][1])
        & (lon >= UTOPIA_ARCADIA["lon_e"][0]) & (lon <= UTOPIA_ARCADIA["lon_e"][1])
    )
    result = {
        "data": "Daubar et al. (2022), tabla S1, norte de 20°N, sin 'possible' (CC BY 4.0)",
        "out_of_sample": "cada impacto, con un ajuste sin su sector de 60° de longitud",
        "calibration": calibration(oos, ice),
        "bands_out_of_sample": {
            f"{lo}-{hi}": counts(oos, ice, (lat >= lo) & (lat < hi)) for lo, hi in BANDS
        },
        "utopia_arcadia_in_sample": {**UTOPIA_ARCADIA, **counts(ins, ice, box)},
        "landers": lander_check(fit),
    }
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    cal = result["calibration"]
    print(f"Brier {cal['brier']:.4f} (tasa fija {cal['brier_constant_rate']:.4f}), "
          f"AUC {cal['auc']:.3f}, hielo {cal['n_ice']} observado / "
          f"{cal['expected_ice']:.1f} esperado")
    for b in cal["bins"]:
        lo, hi = b["observed_90"]
        print(f"  P {b['p_range'][0]:.2f}-{b['p_range'][1]:.2f}: n={b['n']:3d} "
              f"predicho {b['predicted']:.3f} observado {b['observed']:.3f} [{lo:.2f}-{hi:.2f}]")
    for band, c in result["bands_out_of_sample"].items():
        print(f"  lat {band}: {c['ice']} con hielo / {c['expected_ice']:.1f} esperado (n={c['n']})")
    u = result["utopia_arcadia_in_sample"]
    print(f"  Utopia/Arcadia: {u['ice']} / {u['expected_ice']:.1f} esperado, z={u['z']:.1f}")
    for r in result["landers"]:
        lo, hi = r["predictive_90_m"]
        print(f"  {r['name']}: mediana {r['median_m'] * 100:.0f} cm, 90 % local "
              f"{lo * 100:.0f}-{hi * 100:.0f} cm, P(hielo <= {r['dug_m'] * 100:.0f} cm) "
              f"{r['p_ice_within_dug']:.2f}; encontrado: {r['ice_depth_m']}")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
