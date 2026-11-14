"""Tarjeta de sitio en las zonas de exploración que propuso NASA para misiones humanas.

Baja la capa EZMars de Mars Trek (zonas del "First Landing Site/Exploration Zone Workshop for Human
Missions to the Surface of Mars", 2015), le corre `gp.regional.site_assessment` a cada una y suma
un control local con los impactos de Daubar 2022 cercanos. Escribe
`packages/contracts/examples/exploration_zones.json` (`exploration_zones.schema.json`).

No elige dónde aterrizar: responde, en cada zona que NASA ya propuso, con qué herramienta vale salir
a buscar hielo. La capa cruda queda en `data/raw/trek_ez/` (fuera de Git).

Uso: `cd packages/model && uv run python scripts/exploration_zones.py [--offline]`
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gp.regional import site_assessment  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
CONTRACTS = ROOT / "packages" / "contracts"
RAW = ROOT / "data" / "raw" / "trek_ez" / "ez.json"
OUT = CONTRACTS / "examples" / "exploration_zones.json"
TREK_URL = "https://trek.nasa.gov/mars/trekarcgis/rest/services/EZMars/MapServer/0/query"
TREK_QUERY = {
    "where": "1=1", "outFields": "name,lat,lon,elev", "returnGeometry": "false", "f": "json"
}
MIN_P = 0.5  # el mismo umbral de las STM de ejemplo (supuesto, docs/SOURCES.md)
HYPOTHETICAL = {"drill_3m": 3.0}  # no está en el catálogo: muestra qué cambia con más alcance


def fetch(offline: bool) -> list[dict]:
    if not offline:
        url = f"{TREK_URL}?{urllib.parse.urlencode(TREK_QUERY)}"
        with urllib.request.urlopen(url, timeout=60) as resp:  # noqa: S310 (URL fija de NASA)
            RAW.parent.mkdir(parents=True, exist_ok=True)
            RAW.write_bytes(resp.read())
    data = json.loads(RAW.read_text(encoding="utf-8"))
    zones = []
    for feature in data.get("features", []):
        a = feature.get("attributes", {})
        try:
            lat, lon = float(a["lat"]), float(a["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        if not (-90 <= lat <= 90 and -360 <= lon <= 360):
            continue
        name = str(a.get("name") or "").replace("(No pdf)", "").strip()[:80]
        elev = a.get("elev")
        zones.append({
            "name": name,
            "lat_deg": round(lat, 3),
            "lon_e_deg": round(lon % 360, 3),
            "elevation_m": float(elev) if isinstance(elev, (int, float)) else None,
        })
    if not zones:
        raise SystemExit("La capa de Trek no trajo zonas válidas")
    return sorted(zones, key=lambda z: -z["lat_deg"])


def catalog_tools() -> dict[str, float]:
    tools = json.loads((CONTRACTS / "examples" / "tools.catalog.json").read_text(encoding="utf-8"))
    tools = tools.get("tools", tools) if isinstance(tools, dict) else tools
    return {t["id"]: float(t["depth_m"]) for t in tools if float(t.get("depth_m") or 0) > 0}


def _round(value):
    if isinstance(value, float):
        return round(value, 4)
    if isinstance(value, dict):
        return {k: _round(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_round(v) for v in value]
    return value


def card(zone: dict, tools: dict[str, float]) -> dict:
    sa = site_assessment(zone["lat_deg"], tools, min_p=MIN_P, lon_e_deg=zone["lon_e_deg"])
    return _round({**zone, "site_assessment": sa})


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--offline", action="store_true", help="usar la capa ya bajada")
    args = ap.parse_args()

    tools = {**catalog_tools(), **HYPOTHETICAL}
    grid = json.loads((CONTRACTS / "grid.json").read_text(encoding="utf-8"))["crs"]
    reference = {"name": "S1094b (IceWalk demo site)", "lat_deg": grid["center_lat_deg"],
                 "lon_e_deg": grid["center_lon_east_deg"], "elevation_m": None}
    result = {
        "source": "NASA Mars Trek, capa EZMars (First Landing Site/Exploration Zone Workshop for "
                  "Human Missions to the Surface of Mars, 2015); prior regional de Daubar et al. "
                  "(2022), CC BY 4.0",
        "method": "Prior regional por latitud (gp.regional). Solo hemisferio norte desde 20°N; al "
                  "sur de 39.1°N, extrapolado. Control local: impactos de Daubar 2022 a ±10° de "
                  "latitud y ±30° de longitud",
        "generated_on": date.today().isoformat(),
        "tools": {k: {"depth_m": v, **({"hypothetical": True} if k in HYPOTHETICAL else {})}
                  for k, v in tools.items()},
        "min_p": MIN_P,
        "reference_site": card(reference, tools),
        "zones": [card(z, tools) for z in fetch(args.offline)],
    }
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for z in [result["reference_site"], *result["zones"]]:
        sa = z["site_assessment"]
        if sa["status"] == "no_data":
            continue
        t = sa["tools"]
        loc = sa.get("nearby_impacts", {})
        print(f"{z['lat_deg']:6.2f} {z['name'][:26]:26s} {sa['status'][:5]} "
              f"drill1 {t['core_drill']['p_ice']:.2f} {t['core_drill']['verdict'][:4]} "
              f"drill3 {t['drill_3m']['p_ice']:.2f} {t['drill_3m']['verdict'][:4]} "
              f"gpr {t['gpr']['verdict'][:4]} | local {loc.get('ice')}/{loc.get('expected_ice')}")
    n_data = sum(z["site_assessment"]["status"] != "no_data" for z in result["zones"])
    print(f"{len(result['zones'])} zonas, {n_data} con datos -> {OUT}")


if __name__ == "__main__":
    main()
