"""Genera apps/web/mock/plan.json, replan.json, measurement.json y map.json pasando por la API.

Usa los mismos `POST /plan` y `POST /replan` que la web, así que sale el planificador real si están
las capas del terreno (y el GP con los cráteres si está el catálogo), o el mock si no.

La medición de ejemplo se adapta a la primera estación de hielo: su herramienta de hielo llega a
su alcance sin encontrar hielo, que es lo más probable con 1 m en S1094b (P ~ 0.06,
`docs/EXPERIMENTS.md`). Es la escena clave de la demo: un "no" que re-planifica, a tiempo.

`map.json` es `GET /maps` del re-plan: cráteres, prior y la medición de la demo.

Con `--maps-only` no toca `plan.json` ni `replan.json`: lee los mocks que ya están y escribe
`map.json` (plan nominal, sin mediciones) y `map-replan.json` (con la medición de la demo). Sirve
cuando acá no están las capas del terreno y regenerar los planes los dejaría con rutas rectas.

Uso (desde apps/planner/): python scripts/export_mocks.py [--maps-only]
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.contracts import CONTRACTS, ROOT, tools_by_id  # noqa: E402
from app.main import app  # noqa: E402

ICE_TOOLS = ("core_drill", "neutron_spectrometer")
OUT = ROOT / "apps" / "web" / "mock"

if "--maps-only" in sys.argv:
    from app.main import DEFAULT_STM, _map  # noqa: E402

    mock = {n: json.loads((OUT / f"{n}.json").read_text()) for n in ("plan", "replan", "measurement")}
    nominal = _map(DEFAULT_STM, {"plan": mock["plan"], "measurements": []})
    after = _map(DEFAULT_STM, {"plan": mock["replan"], "measurements": [mock["measurement"]]})
    (OUT / "map.json").write_text(json.dumps(nominal))  # sin sangría: cientos de kB
    (OUT / "map-replan.json").write_text(json.dumps(after))
    print("ok: map.json, map-replan.json", nominal["width"], "x", nominal["height"],
          "| craters", nominal.get("craters_in_model"), "| prior only", nominal["is_prior_only"])
    sys.exit(0)

client = TestClient(app)
example = json.loads((CONTRACTS / "examples" / "measurement.example.json").read_text())

plan = client.post("/plan", json={}).json()
# Primera estación que lleva una herramienta de hielo (no un objetivo fijo de cámara).
first = next(
    (s for s in plan["stations"] if any(t in s["tools"] for t in ICE_TOOLS)), plan["stations"][0]
)
tool_id = next((t for t in ICE_TOOLS if t in first["tools"]), first["tools"][0])
reach = tools_by_id()[tool_id]["depth_m"]
meas = {
    **example,
    "station_id": first["id"],
    "tool": tool_id,
    "result": "no_ice",
    "depth_m": reach,
    "weh_percent": example["weh_percent"] if tool_id == "neutron_spectrometer" else None,
    "position": first["position"],
    "notes": f"Demo scenario: no ice down to {reach:g} m at the first station; triggers replan.",
}
# Al día: la medición llega cuando el plan dice que termina la estación. Antes era el minuto 120
# fijo, 35 min tarde, y el re-plan quedaba con 2.2 min de margen (cuestión 46).
elapsed = next(e["t_end_min"] for e in plan["timeline"]
               if e["kind"] == "station" and e["station_id"] == first["id"])
replan = client.post(
    "/replan", json={"plan_id": plan["plan_id"], "measurement": meas, "elapsed_min": elapsed}
).json()

ice_map = client.get("/maps", params={"plan_id": replan["plan_id"]}).json()

plan["plan_id"], replan["plan_id"] = "plan-demo0001", "plan-demo0002"
ice_map["plan_id"] = "plan-demo0002"
replan["replanned_from"] = "plan-demo0001"

out = ROOT / "apps" / "web" / "mock"
out.mkdir(parents=True, exist_ok=True)
(out / "plan.json").write_text(json.dumps(plan, indent=2))
(out / "replan.json").write_text(json.dumps(replan, indent=2))
(out / "measurement.json").write_text(json.dumps(meas, indent=2))
(out / "map.json").write_text(json.dumps(ice_map))  # ~250 kB: sin sangría
print("ok:", [p.name for p in out.iterdir()], "| planner:", client.get("/health").json())
