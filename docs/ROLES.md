# Roles

Propuesta del 2026-11-04, a confirmar con el equipo. Space Apps permite hasta 6 integrantes.

| # | Rol | Persona | De qué se encarga | Carpeta | Primera tarea | Depende de |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **GP y liderazgo** | Luqui | Mapas de probabilidad e incertidumbre, valor de medir, simulación; decisiones de alcance | `model/gp/` | Núcleo con datos sintéticos | Visión |
| 2 | **Visión** | A definir | Bloques, pasillos, cráteres de fondo plano, formas del terreno, zonas | `model/vision/` | Etiquetar en QGIS y detector de sombras | - |
| 3 | **Planificador y backend** | A definir | Factibilidad de NASA, ventana de EVA, estaciones, ruta, ramas, API | `planner/` | Regla del pasillo y costo metabólico | GP, Visión |
| 4 | **Frontend 3D** | A definir | Globo, vista Planning, vista EV, rocas 3D, demo con link directo | `web/` | Esqueleto con capas falsas | Planificador, Diseño |
| 5 | **Ciencia y validación** | A definir | STM, catálogo de herramientas, contacto con expertos, revisión de fuentes, apoyo al GP en la simulación | `docs/`, `contracts/` | Revisar la STM: el espectrómetro casi no llega al hielo | GP |
| 6 | **Diseño y pitch** | A definir | Tres vistas, video de 30 s, página del proyecto, presentación | `design/` | Guion y bocetos | Frontend, GP |

## Datos: sin rol propio

Cada dueño prepara las capas que usa. Las capas casi no se comparten, y traerlas lleva poco una vez que hay una forma común de hacerlo.

| Datos | Los prepara | Los usa |
| --- | --- | --- |
| SWIM, THEMIS, albedo, Daubar | GP | GP |
| HiRISE (imágenes y color) | Visión | Visión |
| DTM: pendiente, rugosidad, orientación | Planificador | Planificador, GP, frontend |
| DONKI, Mars Climate Database | Planificador | Planificador |
| CTX, MOLA | Frontend | Frontend |

**Reglas para que esto funcione:**

1. Toda capa se registra en `data/layers.yaml`, con fuente y cita.
2. Toda capa se lleva a `contracts/grid.json` con **una misma función compartida**. Cada producto usa otra proyección o radio; ya tuvimos un error de 1.8 km y otro de radio en la grilla.
3. Lo que use más de un módulo tiene un solo dueño, que lo publica en `data/processed/`.
4. Toda fuente se anota en `docs/SOURCES.md`.

Planes detallados: [`docs/plans/gp.md`](plans/gp.md) y [`docs/plans/vision.md`](plans/vision.md).
