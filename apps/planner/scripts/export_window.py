"""Genera el ejemplo del contrato de la ventana de EVA y el mock de la web, sin red.

Modo demo (eventos de DONKI de agosto de 2023 guardados en `data/`) con el plan de
`apps/web/mock/plan.json`: el resultado es el mismo en cualquier compu. Correr después de
`export_mocks.py` si cambia el plan.

Escribe `packages/contracts/examples/eva_window.example.json` y `apps/web/mock/eva-window.json`.

Uso (desde apps/planner/): uv run python scripts/export_window.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import donki, eva_window  # noqa: E402
from app.contracts import CONTRACTS, ROOT  # noqa: E402

plan = json.loads((ROOT / "apps" / "web" / "mock" / "plan.json").read_text())
window = eva_window.eva_window(donki.demo_time(), plan["summary"]["duration_min"], demo=True,
                               plan=plan)
text = json.dumps(window, indent=1) + "\n"
for out in (CONTRACTS / "examples" / "eva_window.example.json",
            ROOT / "apps" / "web" / "mock" / "eva-window.json"):
    out.write_text(text)
    print("ok", out.relative_to(ROOT))
