# IceWalk (nombre provisorio)

**NASA already plans routes. We plan what to learn.**

Planificador de EVAs de prospección de hielo en Marte. Combina datos de varias misiones de NASA en mapas de probabilidad e incertidumbre de hielo a ≤ 1 m, elige dónde medir para aprender más y re-planifica la caminata con cada medición.

NASA Space Apps Challenge 2026 · Sitio de demostración: cráter S1094b, Amazonis Planitia (35.11°N, 189.83°E).

**Guía del proyecto:** [`docs/PRD.md`](docs/PRD.md). Para Claude Code: [`CLAUDE.md`](CLAUDE.md).

## Estructura

| Carpeta | Dueño | Qué hay |
| --- | --- | --- |
| `contracts/` | Todos (cambios en un solo PR) | `grid.json`, esquemas JSON y ejemplos |
| `data/` | Datos | Registro de capas (`layers.yaml`) y scripts de descarga |
| `model/` | IA y modelo | Prior regional, unidades, anomalías, GP local, bloques, validación |
| `planner/` | Planificador y backend | API FastAPI (hoy con respuestas de ejemplo) |
| `web/` | Frontend | React + Cesium; `web/mock/` tiene JSON para arrancar sin API |
| `design/` | Diseño | Exports de Figma y assets |
| `docs/` | Producto | Fuentes citadas y decisiones |

## Arranque rápido

```bash
# API con respuestas de ejemplo
cd planner
uv sync            # o: pip install -e ".[dev]"
uv run uvicorn app.main:app --reload
# http://127.0.0.1:8000/docs

# Tests
uv run pytest

# Datos (bajan a data/raw/, que no se sube a Git)
python data/download.py --list
python data/download.py --only hirise_dtm
```

## Reglas del repo

- Ramas `rol/tarea`, PR con al menos una revisión, `main` siempre desplegable.
- Cambiar un contrato = un solo PR que actualiza esquema, ejemplos y usos.
- Datos pesados **no van a Git**: se publican como assets de GitHub Releases.
- Toda fuente usada se cita en `docs/SOURCES.md` (las reglas de Space Apps lo exigen).
- Valores sin fuente se marcan como `"assumption": true`.

## Licencia

Apache 2.0. Los datos de NASA/JPL/USGS son de dominio público; ver créditos en `docs/SOURCES.md`.
