# IceWalk — guía para Claude Code

Planificador de EVAs de prospección de hielo en Marte para el NASA Space Apps Challenge 2026 (14-15 nov). **La guía completa del proyecto es `docs/PRD.md`: leela antes de diseñar o implementar algo.** Si una tarea contradice el PRD, avisá en vez de improvisar.

## Idea en una línea

El modelo dice qué sabemos (probabilidad de hielo a ≤ 1 m e incertidumbre por celda); el planificador decide dónde medir para aprender más, arma la EVA dentro de los límites de seguridad y re-planifica con cada medición. «NASA already plans routes. We plan what to learn.»

## Principios que no se negocian

- **Todo alineado a prácticas documentadas de NASA**, con fuente. Nada de reglas inventadas: un valor sin fuente se marca `"assumption": true` y se anota en `docs/SOURCES.md`.
- **Contratos primero.** `contracts/` (grilla, esquemas de STM, catálogo, medición y plan) es lo que conecta a los 6 roles. Cambiar un contrato = un solo PR que actualiza esquema, ejemplos, mocks y usos, y `python contracts/validate.py` pasa.
- **Capas intercambiables.** Una capa nueva entra con un adaptador + una línea en `data/layers.yaml`. Si obliga a tocar código fuera de su adaptador, el diseño está mal.
- **Sin aprendizaje por refuerzo para rutas.** Planificador clásico (valor de medir + A*), explicable.
- **Interfaz en inglés y con terminología NASA** (EV1/EV2, IV, station, traverse, egress/ingress, walkback, STM). Usuarios técnicos: números reales visibles, color solo para alertas (advisory / caution / warning).
- **Citar toda fuente** (las reglas de Space Apps lo exigen) en `docs/SOURCES.md`. Créditos HiRISE: NASA/JPL-Caltech/UArizona.

## Estructura y dueños

| Carpeta | Dueño | Notas |
| --- | --- | --- |
| `contracts/` | Todos | Esquemas JSON + ejemplos; `validate.py` |
| `data/` | Datos | `layers.yaml`, `download.py`; datos en `data/raw/` (fuera de Git) |
| `model/` | IA y modelo | Prior regional, clustering, anomalías, GP local, bloques, validación |
| `planner/` | Planificador | FastAPI; hoy `app/mock_planner.py` (valores ilustrativos, `is_mock: true`) |
| `web/` | Frontend | React + Vite + TS + CesiumJS (`Ellipsoid.MARS`, Cesium Mars); `web/mock/` para arrancar sin API |
| `design/` | Diseño | Exports y assets |
| `docs/` | Producto | `PRD.md`, `SOURCES.md`, `DECISIONS.md` |

No modifiques la carpeta de otro rol sin que la tarea lo pida.

## Comandos

```bash
python contracts/validate.py                       # ejemplos y mocks vs esquemas
cd planner && pip install -e ".[dev]"              # o: uv sync
cd planner && uvicorn app.main:app --reload        # API en :8000, docs en /docs
cd planner && ruff check . && pytest -q            # lint + tests
cd planner && python scripts/export_mocks.py       # regenera web/mock/*.json
python data/download.py --list                     # capas y links
```

## Reglas de trabajo

- Mensajes de commit en español.
- Ramas `rol/tarea`; PR con una revisión; `main` siempre desplegable. CI corre validación de contratos, ruff y pytest.
- Datos pesados (`.tif`, `.IMG`, `.JP2`) nunca a Git: GitHub Releases.
- Unidades SI; coordenadas internas en metros de la grilla (`contracts/grid.json`), lat/lon solo hacia la web (`app/contracts.py:xy_to_lonlat`).
- Secretos (token de Cesium ion, etc.) en `.env`, nunca commiteados.
- Al reemplazar el mock por el planificador real, la API y el contrato de `plan.schema.json` no cambian.

## Registro: obligatorio

Todo queda anotado en archivos, no solo en la conversación. **Antes de investigar o probar algo, revisá estos archivos para no repetirlo.** Al terminar una tarea, actualizalos:

| Archivo | Qué va |
| --- | --- |
| `docs/DECISIONS.md` | Cada decisión tomada, en una línea, con su motivo |
| `docs/OPEN_QUESTIONS.md` | Lo que falta decidir o averiguar; al resolverlo, sale de acá |
| `docs/EXPERIMENTS.md` | Lo que se probó y su resultado, **incluido lo que falló** |
| `docs/research/` | Hallazgos por tema, con fuentes, y qué no se pudo verificar |
| `docs/log/AAAA-MM-DD.md` | Qué se hizo, decidió, encontró y quedó pendiente en cada día |
| `docs/plans/` | Plan vigente de cada módulo |
| `docs/ROLES.md` | Quién hace qué |
