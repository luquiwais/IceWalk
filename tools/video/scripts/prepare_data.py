"""Convierte las salidas reales del planificador de IceWalk en datos para el video.

Lee los mocks de apps/web/mock (salidas precalculadas del planificador real con una
medición ficticia) y la imagen HiRISE del sitio, y escribe en public/data/:
capas de mapa coloreadas (antes/después), recortes HiRISE alineados y data.json con
todos los números que aparecen en pantalla y los SHA-256 de origen.

Regla del video: ningún número en pantalla sale de otro lado que no sea data.json.
Uso: python3 scripts/prepare_data.py /ruta/a/IceWalk
"""

from __future__ import annotations

import base64
import hashlib
import json
import math
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "data"
# Intersección de la grilla del mapa (x -1200..1800, y -3700..-700) con la ortoimagen HiRISE (y >= -3300).
VIEW = {"xmin": -1200.0, "xmax": 1800.0, "ymin": -3300.0, "ymax": -700.0}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decode(layer, size):
    raw = base64.b64decode(layer["data"])
    assert len(raw) == size, (len(raw), size)
    lo, hi, nodata = float(layer["min"]), float(layer["max"]), int(layer["nodata"])
    return [None if b == nodata else lo + (b / 254) * (hi - lo) for b in raw]


def hex_rgb(h):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def color_at(stops, v):
    if v <= stops[0]["value"]:
        return hex_rgb(stops[0]["color"])
    for a, b in zip(stops, stops[1:]):
        if v <= b["value"]:
            t = (v - a["value"]) / ((b["value"] - a["value"]) or 1)
            ca, cb = hex_rgb(a["color"]), hex_rgb(b["color"])
            return tuple(round(ca[k] + (cb[k] - ca[k]) * t) for k in range(3))
    return hex_rgb(stops[-1]["color"])


def view_rows(m):
    b, cell = m["bounds_xy_m"], m["cell_size_m"]
    return int(round((b["ymax"] - VIEW["ymax"]) / cell)), int(round((b["ymax"] - VIEW["ymin"]) / cell))


def render_layer(m, name, palette, out):
    w, h = m["width"], m["height"]
    vals = decode(m["layers"][name], w * h)
    stops = m["palettes"][palette]["stops"]
    r0, r1 = view_rows(m)
    img = Image.new("RGBA", (w, r1 - r0))
    px = img.load()
    for r in range(r0, r1):
        for c in range(w):
            v = vals[r * w + c]
            px[c, r - r0] = (0, 0, 0, 0) if v is None else (*color_at(stops, v), 255)
    img.save(out)
    return vals


def render_change(m, before, after, out):
    w, h = m["width"], m["height"]
    r0, r1 = view_rows(m)
    cells = [(r, c) for r in range(h) for c in range(w)
             if before[r * w + c] is not None and after[r * w + c] is not None
             and abs(after[r * w + c] - before[r * w + c]) > 1e-6]
    max_abs = max((abs(after[r * w + c] - before[r * w + c]) for r, c in cells), default=0.0)
    img = Image.new("RGBA", (w, r1 - r0))
    px = img.load()
    for r, c in cells:
        if r0 <= r < r1:
            d = abs(after[r * w + c] - before[r * w + c])
            px[c, r - r0] = (255, 255, 255, min(255, int(25 + 60 * d / (max_abs or 1))))
    img.save(out)
    b, cell = m["bounds_xy_m"], m["cell_size_m"]
    bbox = None
    if cells:
        rows, cols = [r for r, _ in cells], [c for _, c in cells]
        bbox = {"xmin": b["xmin"] + min(cols) * cell, "xmax": b["xmin"] + (max(cols) + 1) * cell,
                "ymax": b["ymax"] - min(rows) * cell, "ymin": b["ymax"] - (max(rows) + 1) * cell}
    return {"cells": len(cells), "max_abs": round(max_abs, 4), "bbox_xy_m": bbox}


def crop_hirise(site, web_public, key, box, out, max_px):
    meta = site["images"][key]
    src = web_public / meta["file"].lstrip("/")
    im = Image.open(src).convert("RGB")
    bm, mpp = meta["box_m"], meta["m_per_px"]
    crop = im.crop((round((box["xmin"] - bm["xmin"]) / mpp), round((bm["ymax"] - box["ymax"]) / mpp),
                    round((box["xmax"] - bm["xmin"]) / mpp), round((bm["ymax"] - box["ymin"]) / mpp)))
    scale = min(1.0, max_px / max(crop.size))
    if scale < 1:
        crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.LANCZOS)
    crop.save(out)
    return {"file": out.name, "product": meta["product"], "box_m": box, "px": list(crop.size), "source_sha256": sha256(src)}


def lonlat_to_xy(lon, lat, crs):
    p = dict(t.lstrip("+").split("=") for t in crs.split() if "=" in t)
    R, lat_ts, lat0, lon0 = float(p["R"]), float(p["lat_ts"]), float(p["lat_0"]), float(p["lon_0"])
    return [round(R * math.radians(lon - lon0) * math.cos(math.radians(lat_ts)), 1), round(R * math.radians(lat - lat0), 1)]


def lines(fc, crs):
    return [[lonlat_to_xy(lon, lat, crs) for lon, lat in f["geometry"]["coordinates"]]
            for f in fc["features"] if f["geometry"]["type"] == "LineString"]


def main(repo):
    OUT.mkdir(parents=True, exist_ok=True)
    mock, web_public = repo / "apps/web/mock", repo / "apps/web/public"
    files = {n: mock / f"{n}.json" for n in ["map", "map-replan", "plan", "replan", "measurement", "campaign", "eva-window"]}
    files["site"] = web_public / "site/s1094b.json"
    d = {n: json.loads(p.read_text()) for n, p in files.items()}

    m0, m1 = d["map"], d["map-replan"]
    p0 = render_layer(m0, "probability", "probability", OUT / "prob_before.png")
    p1 = render_layer(m1, "probability", "probability", OUT / "prob_after.png")
    u0 = render_layer(m0, "uncertainty", "uncertainty", OUT / "unc_before.png")
    u1 = render_layer(m1, "uncertainty", "uncertainty", OUT / "unc_after.png")
    change = render_change(m0, p0, p1, OUT / "change.png")
    unc_changed = sum(1 for a, b in zip(u0, u1) if a is not None and b is not None and abs(a - b) > 1e-6)

    site = d["site"]
    hirise = crop_hirise(site, web_public, "overview", VIEW, OUT / "hirise_view.png", 2000)
    hirise_detail = crop_hirise(site, web_public, "detail", site["images"]["detail"]["box_m"], OUT / "hirise_detail.png", 2000)

    plan, replan = d["plan"], d["replan"]
    crs = site["grid_crs"]

    def station(s):
        keys = ["id", "order", "p_ice", "uncertainty", "duration_min", "tools", "tasks", "depth_median_m",
                "depth_shallow_m", "terrain_unit", "priority", "hypothesis"]
        return {"xy": s["position"], **{k: s.get(k) for k in keys}}

    st24 = next(t for t in plan["timeline"] if t["label"] == "Station E03S24")
    dp = plan["decision_points"][0]
    decide_by = dp["decide_by_min"]
    s24 = next(s for s in plan["stations"] if s["id"] == "E03S24")
    s25 = next(s for s in plan["stations"] if s["id"] == "E03S25")

    def clock(pet):
        left = decide_by - pet
        return {"pet_min": round(pet, 1), "available_min": round(left, 1), "h": int(left // 60), "m": int(round(left % 60))}

    win = d["eva-window"]
    data = {
        "rule": "Every number on screen comes from this file. Generated from IceWalk planner outputs (simulated measurement).",
        "site": {"id": m0["site_id"], "threshold_m": m0["threshold_m"], "cell_size_m": m0["cell_size_m"],
                 "craters_in_model": m0["craters_in_model"], "prior_probability": m0["prior_probability"], "credit": site["credit"]},
        "view_box_m": VIEW,
        "hirise": hirise,
        "hirise_detail": hirise_detail,
        "map": {"palette_probability": m0["palettes"]["probability"], "palette_uncertainty": m0["palettes"]["uncertainty"],
                "change": change, "uncertainty_cells_changed": unc_changed},
        "stations_before": [station(s) for s in plan["stations"]],
        "stations_after": [station(s) for s in replan["stations"]],
        "route_before_xy": lines(plan["route"], crs),
        "route_after_xy": lines(replan["route"], crs),
        "measurement": d["measurement"],
        "timeline": {"egress_end_min": plan["timeline"][0]["t_end_min"], "arrive_E03S24_min": st24["t_start_min"],
                     "depart_E03S24_min": st24["t_end_min"], "walkback_margin_E03S24_min": st24.get("walkback_margin_min")},
        "decision": {"station_id": dp["station_id"], "decide_by_min": decide_by, "p_no_ice_branch": dp["options"][0]["probability"],
                     "rationale": dp["options"][0]["rationale"], "hard_stop": dp["hard_stop"]},
        "clock": {"arrival": clock(st24["t_start_min"]), "station_end": clock(st24["t_end_min"]),
                  "formula": "decide_by_min - PET (reserve already in the EVA budget)"},
        "next": {"id": "E03S25", "distance_m": round(math.dist(s24["position"], s25["position"])), "duration_min": s25["duration_min"]},
        "replan": {**replan["replan"], "plan_id": replan["plan_id"]},
        "plan_summary": {k: plan["summary"][k] for k in ["duration_min", "distance_km", "max_distance_from_habitat_km",
                                                          "min_walkback_margin_min", "crew", "ice_threshold_m", "craters_in_model"]},
        "replan_summary": {k: replan["summary"][k] for k in ["duration_min", "distance_km", "min_walkback_margin_min"]},
        "site_tools": plan["site_assessment"]["tools"],
        "equipment": plan["equipment"],
        "campaign": d["campaign"],
        "eva_window": {"mode": win["mode"], "requested_utc": win["requested_utc"], "recommended": win["recommended"],
                       "climate_source": win["climate_source"], "dust": win["dust"],
                       "hours": [{k: h[k] for k in ["sol", "ltst", "sun_elevation_deg", "temperature_k", "wind_p95_mps", "level", "levels", "reasons"]}
                                 for h in win["hours"]]},
        "sources": {n: {"path": str(p.relative_to(repo)), "sha256": sha256(p)} for n, p in files.items()},
    }
    (OUT / "data.json").write_text(json.dumps(data, indent=1, ensure_ascii=False))
    print(json.dumps({"change": change, "unc_changed": unc_changed, "clock": data["clock"], "next": data["next"],
                      "hirise": hirise["px"], "detail": hirise_detail["px"]}, indent=1))


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[3])
