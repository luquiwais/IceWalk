"""Climatología del polvo en S1094b a partir de los mapas EMIRS de la sonda Hope (EMM).

Lee los mapas L3 Grid "atm" de EMIRS (una órbita de ~2 días cada uno, grilla global de 0.5°,
extensión `DUST-INTERP`: opacidad de absorción del polvo a ~9 µm) y guarda, por archivo, el tau
medio alrededor del sitio y en su franja de latitud. `app/eva_window.py` lo interpola por Ls y lo
pasa a tau visible con `dust.visible_per_9um` de `config/eva_window.yaml`.

Los mapas van en `data/raw/emirs/` (fuera de Git; se bajan del SDC de EMM con cuenta gratuita,
https://sdc.emiratesmarsmission.ae, nivel "EMIRS L3 Grid", descriptor `atm`). La salida
(`data/emirs_dust.json`, unos KB) sí va al repo.

Uso (desde apps/planner/, requiere astropy): python scripts/build_emirs_dust.py
"""

import glob
import json
import sys
from pathlib import Path

import numpy as np
from astropy.io import fits

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.contracts import ROOT, grid  # noqa: E402

RAW = ROOT / "data" / "raw" / "emirs"
OUT = Path(__file__).resolve().parents[1] / "data" / "emirs_dust.json"
BOX_LAT, BOX_LON = 2.5, 5.0  # semiancho de la caja alrededor del sitio [°]
BAND_LAT = 5.0  # semiancho de la franja de latitud [°]


def pixel_centers(header, n: int, axis: int) -> np.ndarray:
    """Centros de píxel en grados según CRVAL/CRPIX/CDELT (FITS, 1-based)."""
    crval, crpix, cdelt = (header[f"{k}{axis}"] for k in ("CRVAL", "CRPIX", "CDELT"))
    return crval + (np.arange(n) + 1 - crpix) * cdelt


def site_values(path: str, lat0: float, lon0: float) -> dict | None:
    with fits.open(path) as hdul:
        hdu = hdul["DUST-INTERP"]
        h, tau = hdu.header, np.asarray(hdu.data, dtype=float)
        lons = pixel_centers(h, tau.shape[1], 1)  # -180..180, columnas
        lats = pixel_centers(h, tau.shape[0], 2)  # sur a norte, filas
        dlon = (lons - lon0 + 180) % 360 - 180
        in_lat = np.abs(lats - lat0) <= BOX_LAT
        box = tau[np.ix_(in_lat, np.abs(dlon) <= BOX_LON)]
        band = tau[np.abs(lats - lat0) <= BAND_LAT, :]
        box_ok, band_ok = box[np.isfinite(box)], band[np.isfinite(band)]
        if band_ok.size == 0:
            return None
        return {
            "file": Path(path).name,
            "utc": h["UTC_MIN"][:19] + "Z",
            "ls_deg": round((h["LS_MIN"] + h["LS_MAX"]) / 2, 2),
            "local_time_h": [round(h["LOCT_MIN"], 1), round(h["LOCT_MAX"], 1)],
            "tau_9um_site": round(float(box_ok.mean()), 4) if box_ok.size else None,
            "tau_9um_band": round(float(np.median(band_ok)), 4),
            "site_cells": int(box_ok.size),
        }


def main() -> None:
    crs = grid()["crs"]
    lat0, lon0 = crs["center_lat_deg"], crs["center_lon_east_deg"]
    files = sorted(glob.glob(str(RAW / "**" / "*_atm_*.fits.gz"), recursive=True))
    if not files:
        raise SystemExit(f"No hay mapas EMIRS en {RAW}")
    rows = [r for r in (site_values(f, lat0, lon0) for f in files) if r]
    rows.sort(key=lambda r: r["ls_deg"])
    OUT.write_text(json.dumps({
        "source": "Emirates Mars Mission (Hope), EMIRS L3 Grid atm, MBRSC/NAU/ASU; "
                  "Edwards et al. 2021, Space Sci. Rev. 217, 77",
        "quantity": "dust absorption optical depth at ~9 um (DUST-INTERP), column",
        "site": {"lat_deg": lat0, "lon_e_deg": lon0, "box_deg": [BOX_LAT, BOX_LON],
                 "band_deg": BAND_LAT},
        "samples": rows,
    }, indent=1) + "\n", encoding="utf-8")
    print(f"ok {OUT.name}: {len(rows)} mapas, Ls {rows[0]['ls_deg']}..{rows[-1]['ls_deg']}")
    for r in rows:
        print(f"  Ls {r['ls_deg']:6.1f}  sitio {r['tau_9um_site']}  franja {r['tau_9um_band']}"
              f"  ({r['site_cells']} celdas)")


if __name__ == "__main__":
    main()
