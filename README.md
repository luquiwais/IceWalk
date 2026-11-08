# IceWalk (nombre provisorio)

**NASA already plans routes. We plan what to learn.**

Planificador de EVAs de prospección de hielo en Marte. Combina datos de varias misiones de NASA en mapas de probabilidad e incertidumbre de hielo a ≤ 1 m, elige dónde medir para aprender más y re-planifica la caminata con cada medición.

NASA Space Apps Challenge 2026 · Sitio de demostración: cráter S1094b, Amazonis Planitia (35.11°N, 189.83°E).

**Guía del proyecto:** [`docs/PRD.md`](docs/PRD.md). Para Claude Code: [`CLAUDE.md`](CLAUDE.md).

## Estructura

`apps/` tiene lo que se ejecuta y `packages/` lo que se comparte; una app puede usar packages, pero nunca otra app.

| Carpeta | Dueño | Qué hay |
| --- | --- | --- |
| `apps/web/` | Frontend | Next.js + Cesium; `apps/web/mock/` tiene JSON para arrancar sin API |
| `apps/planner/` | Planificador y backend | API FastAPI (hoy con respuestas de ejemplo) |
| `packages/ui/` | Frontend | Sistema de diseño visionOS, compartido por las apps web |
| `packages/model/` | IA y modelo | Prior regional, unidades, anomalías, GP local, bloques, validación |
| `packages/contracts/` | Todos (cambios en un solo PR) | `grid.json`, esquemas JSON y ejemplos |
| `data/` | Datos | Registro de capas (`layers.yaml`) y scripts de descarga |
| `design/` | Diseño | Exports de Figma y assets |
| `docs/` | Producto | Fuentes citadas y decisiones |

## Monorepo con moon

Las tareas de todas las carpetas se corren con [moon](https://moonrepo.dev), instalado **dentro del repo** como devDependency de Bun (nada global). Siempre con `bun run moon ...`, así su store queda en `.moon/home`.

```bash
bun install                       # en la raíz: instala moon (requiere Bun 1.4.2)
bun run moon projects             # web, planner, ui, model, contracts
bun run moon tasks                # tareas de cada proyecto
bun run moon run web:dev          # web en :3000
bun run moon run planner:dev      # API en :8000
bun run moon run :lint :test      # lint y tests de todos los proyectos
bun run moon run web:build        # cachea: si nada cambió, no vuelve a correr
bun run moon ci                   # lo mismo que CI: solo lo afectado por los cambios
```

Configuración: `.moon/workspace.yml` (proyectos, Git), `.moon/toolchains.yml` (Bun) y un `moon.yml` en cada proyecto con sus tareas. Las tareas de Python usan el Python del sistema: antes hay que instalar el entorno de cada proyecto (abajo).

## Arranque rápido

```bash
# API con respuestas de ejemplo
cd apps/planner
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
