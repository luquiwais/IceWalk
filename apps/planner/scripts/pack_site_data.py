"""Arma los paquetes de datos del sitio para el servidor (deploy) en `dist/` (fuera de Git).

Tres zips, porque las licencias son distintas (`docs/SOURCES.md`, cuestiones 26 y 65):

- `icewalk-site-terrain.zip`: capas del terreno de `python -m app.traverse.terrain`, derivadas
  del DTM de HiRISE (copia controlada de USGS, CC0). Se puede subir a un GitHub Release público.
- `icewalk-site-private.zip`: el catálogo de cráteres llevado a la grilla
  (`craters_dundas2023.csv`). Es una adaptación de Dundas et al. 2023 (CC BY-NC-ND 4.0):
  **no se publica**. Va solo al servidor y al equipo, por un canal privado.
- `icewalk-dundas2023-original.zip`: la tabla del suplemento sin modificar, con atribución y
  licencia. CC BY-NC-ND permite compartirla sin fines comerciales; publicarla lo decide el
  equipo (cuestión 65).

En el servidor, descomprimir los dos primeros en `data/processed/s1094b/`. Con eso `/health`
devuelve `planner: real`.

Uso (desde apps/planner/): python scripts/pack_site_data.py
"""

import hashlib
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.contracts import ROOT  # noqa: E402

SITE = ROOT / "data" / "processed" / "s1094b"
RAW = ROOT / "data" / "raw"
DIST = ROOT / "dist"
TERRAIN = ["terrain_elevation_m.tif", "terrain_slope_max_deg.tif", "terrain_slope_mean_deg.tif",
           "terrain_roughness_m.tif", "terrain_valid_fraction.tif"]

TERRAIN_NOTE = """IceWalk site terrain layers (S1094b, 10 m grid of packages/contracts/grid.json).
Derived with apps/planner/app/traverse/terrain.py from the controlled HiRISE DTM
DTEEC_073578_2155_073077_2155_A01 (USGS Astrogeology copy, CC0).
Credit: NASA/JPL-Caltech/UArizona (HiRISE); USGS Astrogeology.
Unzip into data/processed/s1094b/.
"""
PRIVATE_NOTE = """PRIVATE - DO NOT PUBLISH.
craters_dundas2023.csv is the crater table of Dundas et al. (2023) GRL,
doi:10.1029/2022GL100747, converted to the IceWalk grid. The source is licensed
CC BY-NC-ND 4.0: adapted versions may not be shared. Use only on the team's
server and machines. Unzip into data/processed/s1094b/.
"""
ORIGINAL_NOTE = """Dundas, C. M., et al. (2023). A large new crater exposes the limits of water ice
on Mars. Geophysical Research Letters, 50, e2022GL100747. doi:10.1029/2022GL100747.
Supporting Information Table S1 (2022GL100747-sup-0002-Table SI-S01.csv), unmodified
(file renamed to dundas2023_craters.csv).
License: CC BY-NC-ND 4.0, https://creativecommons.org/licenses/by-nc-nd/4.0/
Shared non-commercially, with attribution, without modification.
"""


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pack(name: str, files: list[Path], note_name: str, note: str) -> Path:
    missing = [f for f in files if not f.exists()]
    if missing:
        raise SystemExit(f"Faltan archivos para {name}: {[str(m) for m in missing]}")
    out = DIST / name
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(f, f.name)
        z.writestr(note_name, note)
    return out


def main() -> None:
    DIST.mkdir(exist_ok=True)
    built = [
        pack("icewalk-site-terrain.zip", [SITE / f for f in TERRAIN], "README.txt", TERRAIN_NOTE),
        pack("icewalk-site-private.zip", [SITE / "craters_dundas2023.csv"], "PRIVATE.txt",
             PRIVATE_NOTE),
        pack("icewalk-dundas2023-original.zip", [RAW / "dundas2023_craters.csv"],
             "LICENSE-dundas2023.txt", ORIGINAL_NOTE),
    ]
    lines = [f"{sha256(p)}  {p.name}" for p in built]
    (DIST / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    for p in built:
        print(f"ok {p.relative_to(ROOT)} ({p.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
