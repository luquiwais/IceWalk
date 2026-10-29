"""Descarga de capas del sitio a data/raw/ (fuera de Git).

Uso:
    python data/download.py --list
    python data/download.py --only hirise_dtm hirise_ortho_1m
    python data/download.py --all          # todo lo que tiene status "scripted"

Capas con status "download manually" se listan con su link: hay que bajarlas desde la web.
El MOLA-HRSC global (11 GB) nunca se baja entero: se recorta remoto con GDAL.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
RAW = HERE / "raw"

# Recorte del MOLA-HRSC alrededor del sitio (lon este -180..180 en el archivo global).
# 189.8E = -170.2. Caja de ~1 grado para contexto.
MOLA_PROJWIN_DEG = (-170.8, 35.6, -169.6, 34.6)  # ulx uly lrx lry


def load_layers() -> list[dict]:
    return yaml.safe_load((HERE / "layers.yaml").read_text())["layers"]


def download(url: str, dest: Path) -> None:
    if dest.exists():
        print(f"  ya existe: {dest.name}")
        return
    print(f"  bajando {url}")
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url) as r, open(tmp, "wb") as f:
        shutil.copyfileobj(r, f, length=1 << 20)
    tmp.rename(dest)
    print(f"  ok: {dest} ({dest.stat().st_size / 1e6:.1f} MB)")


def clip_mola(layer: dict) -> None:
    dest = RAW / "mola_hrsc_clip.tif"
    if shutil.which("gdal_translate") is None:
        print("  falta GDAL (gdal_translate). Instalar GDAL y volver a correr.")
        return
    ulx, uly, lrx, lry = MOLA_PROJWIN_DEG
    # El archivo global está en grados (equirectangular); -projwin_srs indica lon/lat.
    cmd = ["gdal_translate", "-projwin", str(ulx), str(uly), str(lrx), str(lry),
           "-projwin_srs", "+proj=longlat +R=3396190 +no_defs",
           f"/vsicurl/{layer['url']}", str(dest)]
    print("  " + " ".join(cmd))
    subprocess.run(cmd, check=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--only", nargs="*", default=[])
    args = ap.parse_args()

    layers = load_layers()
    if args.list or not (args.all or args.only):
        for ly in layers:
            print(f"{ly['id']:20s} {ly['status']:28s} {ly['url']}")
        return 0

    RAW.mkdir(exist_ok=True)
    for ly in layers:
        if args.only and ly["id"] not in args.only:
            continue
        status = ly["status"]
        print(f"[{ly['id']}]")
        if ly["id"] == "mola_hrsc":
            clip_mola(ly)
        elif status.startswith("scripted"):
            name = ly["url"].rsplit("/", 1)[-1]
            download(ly["url"], RAW / name)
        else:
            print(f"  manual: {ly['url']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
