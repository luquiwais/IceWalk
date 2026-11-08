"""Valida los ejemplos contra sus esquemas y el mock de la web contra el esquema de plan.

Uso: python packages/contracts/validate.py
"""

import json
import sys
from pathlib import Path

import jsonschema
import yaml

ROOT = Path(__file__).resolve().parents[2]
C = ROOT / "packages" / "contracts"

PAIRS = [
    ("schemas/stm.schema.json", C / "examples/stm.s1094b.json"),
    ("schemas/tool.schema.json", C / "examples/tools.catalog.json"),
    ("schemas/measurement.schema.json", C / "examples/measurement.example.json"),
    ("schemas/boulders.schema.json", C / "examples/boulders.example.json"),
    ("schemas/plan.schema.json", ROOT / "apps/web/mock/plan.json"),
    ("schemas/plan.schema.json", ROOT / "apps/web/mock/replan.json"),
]


def main() -> int:
    errors = 0
    for schema_rel, inst_path in PAIRS:
        schema = json.loads((C / schema_rel).read_text())
        try:
            jsonschema.validate(json.loads(inst_path.read_text()), schema)
            print(f"ok   {inst_path.relative_to(ROOT)}")
        except Exception as e:  # noqa: BLE001
            errors += 1
            print(f"FAIL {inst_path.relative_to(ROOT)}: {e}")
    json.loads((C / "grid.json").read_text())
    layers = yaml.safe_load((ROOT / "data/layers.yaml").read_text())
    ids = [ly["id"] for ly in layers["layers"]]
    if len(ids) != len(set(ids)):
        errors += 1
        print("FAIL data/layers.yaml: ids repetidos")
    else:
        print(f"ok   data/layers.yaml ({len(ids)} capas)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
