# Roles

Propuesta del 2026-11-04, a confirmar con el equipo. Un rol puede tener más de una persona. Space Apps permite hasta 6 integrantes por equipo.

| Rol | Personas sugeridas | Quién | De qué se encarga | Carpeta | Primera tarea | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| **GP y liderazgo** | 1 | Luqui | Mapas de probabilidad e incertidumbre, valor de medir, simulación; alcance, expertos y decisiones de producto | `packages/model/gp/` | Núcleo con datos censurados sintéticos | Visión |
| **Visión** | 1 | Guido | Bloques y pasillos (transitabilidad), catálogo de rocas para la vista 3D; formas del terreno y zonas después del hackatón | `packages/model/vision/` | Bloques reales en la zona de la EVA: ver "Para el hackatón" en `plans/vision.md` (actualizado el 11/11) | - |
| **Planificador y backend** | 2 | A definir | Factibilidad de NASA, ventana de EVA, STM y catálogo de herramientas, estaciones, ruta, ramas, API | `apps/planner/`, `packages/contracts/` | Regla del pasillo, costo metabólico y revisión de la STM | GP, Visión |
| **Frontend 3D** | 1 | A definir | Globo, vista Planning, vista EV, rocas 3D, demo con link directo | `apps/web/`, `packages/ui/` | Esqueleto con capas falsas | Planificador, Diseño |
| **Diseño y pitch** | 1 | A definir | Tres vistas, video de 30 s, página del proyecto, presentación | `design/` | Guion y bocetos | Frontend, GP |

## Cómo dividir Planificador y backend entre dos

| Persona | Foco |
| --- | --- |
| **Factibilidad** | Exclusión, costo metabólico, consumibles, regreso a pie, ventana de EVA, DONKI, STM y catálogo |
| **Plan y API** | Estaciones, ruta, ramas, timeline, `/plan`, `/replan`, integración con el GP |

## Datos: sin rol propio

Cada dueño prepara las capas que usa. Las capas casi no se comparten, y traerlas lleva poco una vez que hay una forma común de hacerlo.

| Datos | Los prepara | Los usa |
| --- | --- | --- |
| SWIM, THEMIS, albedo, Daubar | GP | GP |
| HiRISE (imágenes y color) | Visión | Visión |
| DTM: pendiente, rugosidad, orientación | Planificador y backend | Planificador, GP, frontend |
| DONKI, Mars Climate Database | Planificador y backend | Planificador |
| CTX, MOLA | Frontend | Frontend |

**Reglas para que esto funcione:**

1. Toda capa se registra en `data/layers.yaml`, con fuente y cita.
2. Toda capa se lleva a `packages/contracts/grid.json` con **una misma función compartida**. Cada producto usa otra proyección o radio; ya tuvimos un error de 1.8 km y otro de radio en la grilla.
3. Lo que use más de un módulo tiene un solo dueño, que lo publica en `data/processed/`.
4. Toda fuente se anota en `docs/SOURCES.md`.

Planes detallados: [`docs/plans/gp.md`](plans/gp.md) y [`docs/plans/vision.md`](plans/vision.md).
