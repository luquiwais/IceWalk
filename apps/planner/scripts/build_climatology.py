"""Climatología de la ventana de EVA desde el Viking Lander 2 (PDS, dominio público de NASA).

Baja `VL1/VL2-M-MET-4-BINNED-P-T-V-V1.0` (25 bins por sol, sols 1-1050 del VL2: ~1.5 años
marcianos) a `data/raw/vl2/` y escribe `apps/planner/data/vl2_climatology.json`: por estación
(bins de 30° de Ls) y hora solar verdadera local, temperatura del aire (p10, p50, p90) y viento
medio horario (p50, p95). El VL2 estaba en Utopia Planitia (47.97°N, 134.26°E, ~-3.6 km); S1094b
está a 35.1°N y ~-3.9 km: es un análogo, no el sitio (supuesto, `docs/SOURCES.md`).

Hora: los bins empiezan en la medianoche local media del lander. Se pasan a hora solar verdadera
con la ecuación del tiempo de Mars24 para la Ls de cada bin.

Uso (desde apps/planner/): uv run python scripts/build_climatology.py
"""

import json
import sys
import urllib.request
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.contracts import ROOT  # noqa: E402
from app.marstime import equation_of_time_from_ls  # noqa: E402

URL = "https://atmos.nmsu.edu/PDS/data/vl_1001/data/vl_tbin.dat"
RAW = ROOT / "data" / "raw" / "vl2" / "vl_tbin.dat"
OUT = Path(__file__).resolve().parents[1] / "data" / "vl2_climatology.json"
LS_BIN = 30
GOOD_FLAGS = {"", "S"}  # sin marca o interpolado; fuera: faltante, sin dato o interferencia


def field(line: str, start: int, size: int) -> str:
    """Columna de ancho fijo según `vl_tbin.lbl` (START_BYTE desde 1)."""
    return line[start - 1 : start - 1 + size].strip()


def read() -> np.ndarray:
    if not RAW.exists():
        RAW.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(URL, RAW)
    rows = []
    for line in RAW.read_text().splitlines():
        if field(line, 1, 4) != "VL2":
            continue
        try:
            ls = float(field(line, 7, 8))
            hbin = int(field(line, 20, 3))
            wind = float(field(line, 65, 6))
            temp = float(field(line, 86, 7))
        except ValueError:
            continue
        w_ok = field(line, 62, 3) in GOOD_FLAGS and wind > 0
        t_ok = field(line, 100, 3) in GOOD_FLAGS and temp > 100
        rows.append((ls, hbin, wind if w_ok else np.nan, temp if t_ok else np.nan))
    return np.array(rows)


def main() -> None:
    d = read()
    ls, hbin, wind, temp = d.T
    # Centro del bin (25 por sol, desde la medianoche media) en hora solar verdadera.
    lmst = (hbin - 0.5) * 24.0 / 25.0
    eot_h = np.array([equation_of_time_from_ls(v) for v in ls]) / 15.0
    hour = np.floor((lmst + eot_h) % 24.0).astype(int)
    season = (ls // LS_BIN).astype(int) % (360 // LS_BIN)

    n_seasons = 360 // LS_BIN
    table = {k: np.full((n_seasons, 24), np.nan) for k in ("t10", "t50", "t90", "w50", "w95")}
    counts = np.zeros((n_seasons, 24), int)
    for s in range(n_seasons):
        for h in range(24):
            m = (season == s) & (hour == h)
            t, w = temp[m & np.isfinite(temp)], wind[m & np.isfinite(wind)]
            counts[s, h] = t.size
            if t.size >= 5:
                table["t10"][s, h], table["t50"][s, h], table["t90"][s, h] = np.percentile(
                    t, [10, 50, 90])
            if w.size >= 5:
                table["w50"][s, h], table["w95"][s, h] = np.percentile(w, [50, 95])
    for v in table.values():  # huecos: promedio de las estaciones vecinas a la misma hora
        for s, h in zip(*np.nonzero(np.isnan(v)), strict=True):
            v[s, h] = np.nanmean([v[(s - 1) % n_seasons, h], v[(s + 1) % n_seasons, h]])

    def rounded(a: np.ndarray) -> list:
        return np.round(a, 1).tolist()

    out = {
        "source": "Viking Lander 2 meteorology, PDS VL1/VL2-M-MET-4-BINNED-P-T-V-V1.0 "
                  "(Tillman et al.), " + URL,
        "station": {"name": "Viking Lander 2", "lat_deg": 47.97, "lon_east_deg": 134.26,
                    "elevation_km": -3.6},
        "notes": "Analogue for S1094b (35.1°N, ~-3.9 km), not the site. Hourly means of air "
                 "temperature (~1.6 m) and wind speed by season (Ls bins) and local true solar "
                 "time. Gusts within the hour are not captured.",
        "ls_bin_deg": LS_BIN,
        "temperature_k": {"p10": rounded(table["t10"]), "p50": rounded(table["t50"]),
                          "p90": rounded(table["t90"])},
        "wind_mps": {"p50": rounded(table["w50"]), "p95": rounded(table["w95"])},
        "samples": counts.tolist(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out) + "\n")
    print("ok", OUT.relative_to(ROOT), f"{int(np.isfinite(temp).sum())} temperaturas,",
          f"{int(np.isfinite(wind).sum())} vientos")


if __name__ == "__main__":
    main()
