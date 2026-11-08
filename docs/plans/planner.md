# Plan del planificador y backend: traspaso

**Dueño:** Planificador y backend. **Código:** `apps/planner/`. **Estado:** mock andando, planificador real sin empezar. Escrito el 2026-11-08 por el dueño del GP para el traspaso.

**Leé primero:** este archivo, `docs/DECISIONS.md` (las líneas del 2026-11-08) y la sección "Lo que cambió" de abajo. Lo que diga esta página manda sobre `CLAUDE.md` y el PRD hasta que se actualicen.

## Lo que cambió (y todavía no está en `CLAUDE.md` ni en el PRD)

| Antes | Ahora | Por qué |
| --- | --- | --- |
| Objetivo: hielo a ≤ 1 m | Umbral configurable desde la STM; **3 m** en la STM de ejemplo | A ≤ 1 m, un "no" sale el 94 % de las veces en S1094b |
| Espectrómetro de neutrones como herramienta del objetivo 1 | **Radar como herramienta principal**; taladro para confirmar donde el hielo podría estar a ≤ 1 m | El neutrón llega a ~60 cm y diría "no" casi siempre |
| "Elegimos dónde medir para aprender más" | **No prometemos dónde.** IceWalk dice con qué herramienta ir, arma una EVA factible y segura, y aprende de cada medición por si hay un patrón que desde órbita no se ve | Los cráteres reales no muestran estructura predictiva (AUC 0.52). La herramienta cambia de ~0.3 a ~4 puntos con hielo por EVA |
| Ramas `ice` / `no_ice` | Propuesta: puntos de decisión con opciones ordenadas (opción C de `research/decisiones-nasa.md`). **El contrato no cambia hasta que vos lo acuerdes** | NASA no usa árboles a nivel de EVA |
| "La EVA baja la incertidumbre más que una grilla" | Se saca esa promesa | La simulación la desmiente |

Detalle y números: `docs/EXPERIMENTS.md` (2026-11-08) y `docs/research/viabilidad-expediciones.md`.

## Qué tiene que hacer el planificador real

Reemplazar `app/mock_planner.py` **sin cambiar la API ni `plan.schema.json`** (regla de `CLAUDE.md`). El mock queda como respaldo si faltan los datos.

1. **Al arrancar:** cargar el catálogo de cráteres y calcular el posterior del GP una vez.
2. **Candidatas:** celdas cada 100 m dentro del radio de caminata desde el hábitat. Excluir las de pendiente > 20° (`max_slope_deg` de la STM; fuente: ICES-2025-129, en `research/factibilidad.md`).
3. **Selección de estaciones:** criterio por defecto **"potencial + incertidumbre"**, la profundidad más somera posible contando la duda. Es decisión del 2026-11-08: nunca pierde contra una grilla y gana si aparece estructura. Elegir en orden, respetando:
   - tiempo: `eva_max_h` = 8 h, `reserve` = 20 % y `walking_speed_kmh` = 2, de la STM;
   - tiempo en estación: `time_min` de cada herramienta, del catálogo;
   - margen para volver a pie: `walkback_max_km` = 10, de la STM;
   - egress e ingress: 45 y 30 min en el mock, supuestos.
4. **Herramientas por estación:** el objetivo 1 usa radar en la caminata y en la estación, y taladro donde `P(d <= 1 m)` sea alta. Los demás objetivos siguen como en el mock (`TOOLS_FOR_OBJECTIVE`).
5. **Campos de cada estación:**
   - `p_ice` = `P(d <= depth_max_m)` del GP.
   - `uncertainty` = entropía de `p_ice` en bits. No está definido en el esquema: proponemos esto.
   - `value` = el puntaje del criterio, llevado a un número ≥ 0.
6. **Ramas reales (dentro del contrato actual):** para la primera estación, simular con el GP "hay hielo" y "no hay hielo", y armar el plan siguiente de cada caso.
7. **`/replan`:** convertir la medición con `gp.observations.from_measurement`, sumarla al posterior y replanificar desde la posición actual con el tiempo que queda.
8. **`summary.expected_uncertainty_reduction`:** el valor real va a ser chico (~0.1 % del sitio). Es honesto; no inflarlo.
9. **Ventana de EVA por clima (`app/window.py`, nuevo):** para un día y hora dados, decir si conviene salir y generar alertas `advisory` / `caution` / `warning`. Decide **cuándo**, no dónde.

   | Condición | Peso | Fuente o dato |
   | --- | --- | --- |
   | Partículas solares | Alto | DONKI (ya en `main.py`, modo demo) |
   | Tormentas de polvo | Alto | Grandes tormentas del norte en Ls 180-240° y 305-350° (`research/factibilidad.md`) |
   | Temperatura | Alto | ~160-260 K en S1094b, leído a ojo de un gráfico |
   | Luz | Medio | Sombras y orientación |
   | Viento | Bajo | 20 m/s empujan ~1 % del peso (cuenta propia) |

   **No hay umbrales oficiales de NASA** de temperatura, viento ni polvo para una EVA en Marte: todo va con `"assumption": true`. Mars Climate Database sería la fuente por día y hora, pero su licencia está sin confirmar (cuestión 15).
10. **Exportar mocks:** `scripts/export_mocks.py` tiene que regenerar `apps/web/mock/` con el planificador real, para frontend.

Hoy la ruta es línea recta con un factor de 1.3, como en el mock. El A* con costo metabólico (ICES-2025-129) queda para una segunda etapa.

## Archivos acordados

| Archivo | Cambio |
| --- | --- |
| `apps/planner/app/site.py` (nuevo) | Carga cráteres, prior ajustado, candidatas y máscara de pendiente |
| `apps/planner/app/planner.py` (nuevo) | `build_plan` y `replan` reales |
| `apps/planner/app/window.py` (nuevo) | Ventana de EVA por clima |
| `apps/planner/app/main.py` | Usa el planificador real y cae al mock si faltan datos. `/health` informa cuál está activo |
| `apps/planner/app/mock_planner.py` | Queda sin cambios, como respaldo |
| `apps/planner/tests/test_planner.py` (nuevo) | Con cráteres inventados: respeta el tiempo, cumple el contrato, un "no" cambia el plan |
| `apps/planner/scripts/export_mocks.py` | Regenera los mocks con el planificador real |
| `apps/planner/pyproject.toml` | Dependencia local de `packages/model` (ver abajo) |

## Cómo usar el GP desde el planificador

Decisión aprobada: el planificador instala `packages/model` como dependencia local (`pip install -e ../../packages/model`, o `uv` con `path`). **Hecho el 2026-11-08:** `rasterio` y `scikit-image` pasaron a un grupo opcional `vision`. El núcleo del GP solo instala numpy y scipy (comprobado en un entorno limpio), y CI instala `packages/model[dev,vision]`.

Lo que ya existe en `packages/model/gp/`:

| Qué | Dónde | Para qué |
| --- | --- | --- |
| `load_catalog()` y `to_observations()` | `gp/craters.py` | Los 349 cráteres como observaciones |
| `make_prior(**FITTED)` | `gp/simulation.py` | Prior ajustado: media de `log d` 0.86, varianza 0.299, mitad espacial con alcance de 100 m y mitad nugget |
| `posterior(prior, obs)` | `gp/posterior.py` | Ajuste con EP; `.predict`, `.maps`, `.covariance` |
| `from_measurement(medicion, herramienta)` | `gp/observations.py` | Convierte una medición del contrato en una observación |
| `scores("potential_uncertainty", ...)` | `gp/simulation.py` | El criterio de selección, ya probado |

**El equipo del GP va a sumar `gp/planning.py`** con una interfaz estable, para que el planificador no dependa de la simulación:
- `rank_candidates(posterior, x, y, threshold_m) -> (p_ice, uncertainty, value)`
- `simulate_outcome(posterior, x, y, result) -> posterior`, para las ramas

Hasta que exista, podés llamar a `gp/simulation.py`.

## Datos y despliegue

- El catálogo de cráteres (`data/processed/s1094b/craters_dundas2023.csv`) y el DTM están **fuera de Git**.
- **La licencia de la tabla de Dundas 2023 está sin confirmar (cuestión 26):** no se puede subir al repo ni publicar hasta saberla.
- **Plan aprobado:**
  1. Un script genera un paquete chico del sitio (cráteres en la grilla y máscara de pendiente de las candidatas) en `data/processed/`.
  2. La API lo usa si está; si no, cae al mock.
  3. Para desplegar va como GitHub Release, según `CLAUDE.md`, después de confirmar la licencia.
- **Cómo regenerar el catálogo:** necesita la imagen RED y el orto en `data/raw/`, y se corre `python -m gp.craters` desde `packages/model`. Pedile los archivos al dueño del GP.
- **Hábitat por defecto:** (300, -2200) m en la grilla, marcado como supuesto (decisión del 2026-11-08). Es uno de los hábitats de la simulación con muchos cráteres cerca. Cuando se toque el contrato de la STM, sumar `habitat_xy`.

## Contrato y cambios pendientes que te tocan

| Cuestión | Qué | Estado |
| --- | --- | --- |
| 23 | Ramas como puntos de decisión con opciones ordenadas | Propuesta aprobada por Luqui; falta tu acuerdo. Cambia `plan.schema.json` |
| 30 | Observaciones blandas para espectrómetro y radar | Lo hace el GP |
| 33 | Corregir el catálogo de herramientas: `measures`, análogos NSS y ALSD, masas, resolución del radar | PR de contrato |
| - | STM de ejemplo: umbral 3 m y radar en el objetivo 1 | Decidido; falta hacerlo (PR de contrato) |
| 15 | Licencia de Mars Climate Database | Sin averiguar |

Un cambio de contrato es un solo PR que actualiza esquema, ejemplos, mocks y usos, y `python packages/contracts/validate.py` tiene que pasar.

## Cómo correr

```bash
cd apps/planner && uv venv .venv && uv pip install --python .venv/Scripts/python.exe -e ".[dev]"
cd apps/planner && .venv/Scripts/ruff check . && .venv/Scripts/python -m pytest -q
cd apps/planner && uvicorn app.main:app --reload   # API en :8000, docs en /docs
```

Hoy pasan los 6 tests del mock.

## Para leer

- `research/factibilidad.md`: reglas de traverse, pendiente y clima.
- `research/decisiones-nasa.md`: cómo decide NASA y las opciones de ramas.
- `research/viabilidad-expediciones.md`: herramientas, umbral y veredicto.
- `research/impacto-diferencial.md`: qué número usar y cómo presentarlo.
- `docs/EXPERIMENTS.md`: simulación, validación y robustez.
