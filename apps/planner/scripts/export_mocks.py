"""Genera apps/web/mock/plan.json y apps/web/mock/replan.json desde el planificador mock.

Uso (desde apps/planner/): python scripts/export_mocks.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import mock_planner  # noqa: E402
from app.contracts import CONTRACTS, ROOT  # noqa: E402

stm = json.loads((CONTRACTS / "examples" / "stm.s1094b.json").read_text())
meas = json.loads((CONTRACTS / "examples" / "measurement.example.json").read_text())

plan = mock_planner.build_plan(stm)
plan["plan_id"] = "plan-demo0001"
first = plan["stations"][0]
meas = {**meas, "station_id": first["id"], "position": first["position"]}
re = mock_planner.replan(stm, plan, meas, elapsed_min=120)
re["plan_id"] = "plan-demo0002"

out = ROOT / "apps" / "web" / "mock"
out.mkdir(parents=True, exist_ok=True)
(out / "plan.json").write_text(json.dumps(plan, indent=2))
(out / "replan.json").write_text(json.dumps(re, indent=2))
(out / "measurement.json").write_text(json.dumps(meas, indent=2))
print("ok:", [p.name for p in out.iterdir()])
