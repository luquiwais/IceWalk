# Plan del planificador y backend

**Dueño:** Planificador (mercho40). **Código:** `apps/planner/`. **Estado:** transitabilidad y planificador real hechos el 2026-11-08 (`app/eva_planner.py`). Alineado ese mismo día con las decisiones vigentes (ver "Alineación" abajo). Falta el catálogo de cráteres en el despliegue (licencia, cuestión 26).

## Qué hace

Recibe la STM, el catálogo y los mapas del GP, y devuelve el plan de EVA del contrato (`plan.schema.json`): estaciones, ruta, timeline, ramas, equipo y margen de regreso. Cada medición re-planifica. La API no cambia al reemplazar el mock.

## Piezas

| Pieza | Estado | Dónde |
| --- | --- | --- |
| Capas del terreno (elevación, pendiente máx./media a 10 m, rugosidad) | Hecho | `app/traverse/terrain.py` |
| Exclusión: pendiente > `max_slope_deg`, fuera del DTM, pasillo < 1.02 m (si hay capa de visión) | Hecho | `app/traverse/route.py` |
| Costo de caminar: tiempo con velocidad que cae con la pendiente | Hecho | `app/traverse/route.py`, `config/traverse.yaml` |
| Rutas y tiempo de regreso desde cada celda (Dijkstra uno a todos) | Hecho | `TraverseMap.route`, `TraverseMap.time_from` |
| Tramos reales en `/plan` y `/replan` | Hecho | `app/eva_planner.py`; `app/mock_planner.py` de respaldo |
| Costo metabólico (Pandolf con gravedad) | Pendiente, cuestión 39 | — |
| Herramientas desde la STM; mínimo por rango; objetivos fijos; tareas en el mejor sitio; Get Aheads | Hecho | `app/eva_planner.py` |
| Elegir estaciones con el GP (potencial + incertidumbre, kriging believer) | Hecho | `app/eva_planner.py`, `app/ice.py` |
| `/replan` con las mediciones acumuladas en el GP | Hecho | `app/main.py` |
| Reordenar la ruta para caminar menos (2-opt, mover una estación) | Hecho | `EvaPlanner.improve` |
| Timeline, tareas EV1/EV2, equipo con masa | Hecho (masas del catálogo, casi todas null) | `app/eva_planner.py` |
| Puntos de decisión (`decision_points`) en las dos primeras estaciones de hielo | Hecho (cuestión 23 cerrada) | `app/eva_planner.py` |
| Mapa de hielo `GET /maps?plan_id=` (`map.schema.json`), con caché y gzip | Hecho el 2026-11-11 | `app/maps.py`, `app/main.py` |
| Margen de regreso: umbral de caution de la STM, Get Aheads que lo respetan, alertas caution/warning, re-plan tarde sin estaciones | Hecho el 2026-11-11 (cuestiones 46 y 55) | `app/eva_planner.py`, `app/mock_planner.py` |
| Ventana de EVA (`GET /eva-window`) y DONKI en vivo (`GET /spaceweather`) | Hecho el 2026-11-11 | `app/eva_window.py`, `app/marstime.py`, `app/donki.py` |

## Próximos pasos

1. Correr con el catálogo real de cráteres (cuestión 42) y revisar el plan con Luqui; regenerar `apps/web/mock/` (ahora con `map.json`).
2. Ventana de EVA: umbrales con un experto (cuestión 59) y clima en el sitio (cuestión 60).
3. Costo metabólico en el resumen (cuestión 39).
4. Capas en GitHub Releases y carga al arrancar la API en el deploy.

## Cómo se corre

```bash
cd apps/planner && uv sync --extra dev        # instala también packages/model
cd ../..                                      # desde la raíz:
curl -o data/raw/DTEEC_073578_2155_073077_2155_A01.tif \
  https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_073578_2155_ESP_073077_2155/DTEEC_073578_2155_073077_2155_A01.tif   # 164 MB
cd apps/planner && uv run python -m app.traverse.terrain   # ~15 s: data/processed/s1094b/terrain_*.tif
uv run uvicorn app.main:app --reload
```

## Alineación con las decisiones del 2026-11-08

Hecha al integrar `main` en esta rama:

| Qué | Cómo quedó |
| --- | --- |
| Umbral | STM de ejemplo: objetivo 1 con `depth_max_m: 3`. El objetivo 2 (pureza, con muestra) sigue en 1 m |
| Herramientas | Radar como principal, en la caminata. Si llega al umbral, la herramienta de estación más honda (taladro) confirma y no sale aviso. Aviso solo si ninguna llega |
| Acceso al GP | `app/ice.py` usa `gp.planning` (prior ajustado y `rank_candidates`), la interfaz estable |
| `value` | El de `gp.planning`: en [0, 1] y ordena igual que "potencial + incertidumbre". Reemplaza "umbral / profundidad optimista". Fijarlo en el esquema sigue en la cuestión 41 |
| Hábitat por defecto | (300, -2200) en `config/eva.yaml` |
| Segunda EVA | La sublimación del hielo expuesto (puntos fijos junto al cráter) pasó a `stm.s1094b-eva2.json`. La EVA 1 queda con hielo (1), pureza (2) y contexto geológico (3) |
| Elección de estaciones | **Valor por minuto** (decisión 4 de `plans/gp.md`): puntaje del GP / (caminata + herramientas). Antes se elegía el mejor puntaje sin mirar la caminata; con puntajes casi iguales salía una estación a 3.6 km y entraba 1 de 4. Ahora entran 6, todas cerca del hábitat (~100-200 m entre sí), porque sin estructura espacial todos los puntos valen casi lo mismo |
| Mocks de la web | `scripts/export_mocks.py` pasa por la API: sale el planificador real si están las capas, y la medición de ejemplo es un taladro sin hielo hasta 1 m en la primera estación de hielo |
| Mensaje | No se promete "dónde": los cráteres reales no mostraron estructura predictiva (`docs/EXPERIMENTS.md`). El criterio nunca pierde contra una grilla |

## Interfaz del GP

Decisión aprobada: el planificador instala `packages/model` como dependencia local (`pip install -e ../../packages/model`, o `uv` con `path`). **Hecho el 2026-11-08:** `rasterio` y `scikit-image` pasaron a un grupo opcional `vision`. El núcleo del GP solo instala numpy y scipy (comprobado en un entorno limpio), y CI instala `packages/model[dev,vision]`.

Lo que ya existe en `packages/model/gp/`:

| Qué | Dónde | Para qué |
| --- | --- | --- |
| `load_catalog()` y `to_observations()` | `gp/craters.py` | Los 349 cráteres como observaciones |
| `make_prior(**FITTED)` | `gp/simulation.py` | Prior ajustado: media de `log d` 0.86, varianza 0.299, mitad espacial con alcance de 100 m y mitad nugget |
| `posterior(prior, obs)` | `gp/posterior.py` | Ajuste con EP; `.predict`, `.maps`, `.covariance` |
| `from_measurement(medicion, herramienta)` | `gp/observations.py` | Convierte una medición del contrato en una observación |
| `scores("potential_uncertainty", ...)` | `gp/simulation.py` | El criterio de selección, ya probado |

**Ya existe `gp/planning.py` (2026-11-08):** es la interfaz estable. Usá solo esto; lo demás de `gp/` puede cambiar.

| Función | Devuelve |
| --- | --- |
| `site_posterior(catalog_path)` | Posterior del sitio con los cráteres. Calcularlo una vez al arrancar |
| `rank_candidates(post, x, y, threshold_m)` | `p_ice`, `uncertainty` (entropía en bits) y `value` (en [0, 1], ordena igual que "potencial + incertidumbre") |
| `add_measurement(post, medicion, herramienta)` | `(posterior nuevo, observación o None)`. Usa los contratos tal cual |
| `simulate_outcome(post, x, y, threshold_m, "ice"/"no_ice")` | Posterior para cada rama |
| `tool_yield(post, x, y, herramientas)` | Por herramienta: P por estación, mejor estación y estaciones esperadas hasta un hallazgo. Es el número de "con qué herramienta ir" |
| `MapGrid`, `ice_maps(post, grid, threshold_m)`, `update_window(maps, post, puntos)` | Probabilidad e incertidumbre sobre una grilla, y su actualización alrededor de mediciones nuevas |
| `map_payload(maps, site_id=..., bounds_lonlat=..., ...)` | La respuesta de `GET /maps` según `map.schema.json` |

En el sitio real, con el hábitat por defecto: espectrómetro ~165 estaciones por hallazgo, taladro ~17 y radar ~1. El radar es optimista hasta la cuestión 30. Ver `EXPERIMENTS.md`.

## Mapas de hielo (`GET /maps`), cuestiones 49 y 52 cerradas

**API hecha el 2026-11-11** (`app/maps.py`). `GET /maps` sin parámetros: cráteres y prior en el hábitat ± `map_half_m` (1.5 km). `GET /maps?plan_id=...`: además las mediciones de ese plan, y la ventana se amplía hasta `map_margin_m` (300 m) alrededor de cada estación, opción de decisión y medición; 404 si el plan no existe. Después de `/replan`, pedirlo con el `plan_id` nuevo. El mapa base se arma al arrancar (~1 s) y queda en caché; el de un plan tarda ~0.11 s y queda guardado con el plan. Respuesta comprimida: ~21 kB. `scripts/export_mocks.py` escribe `apps/web/mock/map.json` (el del re-plan de la demo). Las celdas coinciden con las de 10 m del terreno. Lo que sigue es la guía original:

El GP ya da todo lo del mapa (`gp/maps.py`, re-exportado en `gp.planning`); falta servirlo y dibujarlo. Contrato: `packages/contracts/schemas/map.schema.json`, con ejemplo en `examples/map.example.json` (regenerar con `python packages/model/scripts/export_map_example.py`). **Se manda la grilla de valores, no una imagen:** el front pinta.

**API (Planificador):**

1. Al arrancar, armar el mapa base de la zona de la EVA y cachearlo por umbral: `MapGrid.around(*habitat_xy, half_m, 10)` con `ice_maps(post, grid, threshold_m)`. Con 3 × 3.5 km a 10 m tarda ~1.7 s, una vez.
2. `GET /maps?plan_id=...` devuelve todas las capas en una respuesta (hoy existe `GET /maps/{kind}` en `pending`: reemplazarlo). Con `plan_id`, aplicar al mapa base `update_window(maps, post_del_plan, posiciones_de_las_mediciones)` (~0.04 s) y cachear por plan. Sin `plan_id`, el mapa base.
3. Respuesta: `map_payload(maps, site_id=..., bounds_lonlat=..., plan_id=..., craters_in_model=..., measurements_in_model=...)`. `bounds_lonlat` sale de `xy_to_lonlat` en las esquinas de `payload["bounds_xy_m"]`.
4. No aceptar tamaños de grilla del cliente sin tope: `MapGrid` ya rechaza más de 2 millones de celdas. La zona de la EVA pesa ~275 kB; conviene comprimir la respuesta (`GZipMiddleware` de FastAPI).

**Web (Frontend):**

1. Decodificar cada capa: base64 a bytes, `valor = min + q / 254 × (max − min)`, `q = 255` sin dato. Fila 0 al norte, columna 0 al oeste.
2. Pintar en un `canvas` (`ImageData`, un píxel por celda) con las paradas de `palettes[capa].stops`, interpolando en RGB, y apoyarlo en Cesium con `SingleTileImageryProvider` y `Rectangle.fromDegrees(west, south, east, north)` (longitud este de 0 a 360).
3. Capas: **"Ice potential"** por defecto (`palettes.potential`: color de la probabilidad mezclado con `fog_color` en proporción a `uncertainty`), "Ice probability", "Uncertainty" y "Change vs. prior" (`probability − prior_probability`). Las dos últimas se calculan en el navegador: cambiar de capa no pide nada al back.
4. Leyenda desde `palettes` y valor de la celda al pasar el mouse (por ejemplo "P(ice ≤ 3 m) 67 % · uncertainty 0.95"). Sin contornos duros (`research/diseno-interfaz.md` §5.1).
5. Colores en tonos de azul (DECISIONS 2026-11-10); `gp.maps.to_rgba` y `potential_rgba` son la referencia para comparar.

## Ventana de EVA (`GET /eva-window`)

Decide cuándo salir. `GET /eva-window?plan_id=&date=&dust_tau=&demo=` devuelve `eva_window.schema.json`: una fila por hora local en 3 soles (luz, temperatura, viento, polvo y clima espacial, cada uno con nivel y motivo), la salida recomendada (`go: false` si toda salida tiene un warning) y, con `plan_id`, las condiciones en cada estación. Sin `date`, ahora; con `demo=true`, el 8 de agosto de 2023 con el evento de partículas real (sin red).

- Luz: `app/marstime.py` (Mars24).
- Temperatura y viento: `data/vl2_climatology.json`, armado con `scripts/build_climatology.py` desde el PDS.
- Clima espacial: `app/donki.py`; demo en `data/donki_demo_2023-08.json`. `GET /spaceweather?demo=false` usa DONKI en vivo.
- Umbrales: `config/eva_window.yaml`, todos supuestos (cuestión 59).
- Ejemplo del contrato y mock de la web: `scripts/export_window.py`.

Para Frontend: barra de estado y Brief pueden mostrar `recommended` (hora local y UTC, nivel, motivos); la timeline del día puede pintar `hours[].level`; la ficha de estación, `stations[]`.

## Datos y despliegue

- El catálogo de cráteres (`data/processed/s1094b/craters_dundas2023.csv`) y el DTM están **fuera de Git**.
- **La licencia de la tabla de Dundas 2023 está sin confirmar (cuestión 26):** no se puede subir al repo ni publicar hasta saberla.
- **Plan aprobado:**
  1. Un script genera un paquete chico del sitio (cráteres en la grilla y máscara de pendiente de las candidatas) en `data/processed/`.
  2. La API lo usa si está; si no, cae al mock.
  3. Para desplegar va como GitHub Release, según `CLAUDE.md`, después de confirmar la licencia.
- **Cómo regenerar el catálogo:** necesita la imagen RED y el orto en `data/raw/`, y se corre `python -m gp.craters` desde `packages/model`. Pedile los archivos al dueño del GP.
- **Hábitat por defecto:** (300, -2200) m en la grilla, marcado como supuesto (decisión del 2026-11-08). Es uno de los hábitats de la simulación con muchos cráteres cerca. Cuando se toque el contrato de la STM, sumar `habitat_xy`.

## Contrato y cambios pendientes

| Cuestión | Qué | Estado |
| --- | --- | --- |
| 23 | Ramas como puntos de decisión con opciones ordenadas | **Hecho** (PR de contrato `planner/contrato-plan`): `decision_points` |
| 41 | Qué son `uncertainty`, `value` y los campos nuevos de estación | **Hecho** en el mismo PR |
| 33 | Catálogo: `evidence`, análogos NSS, RIMFAX y ALSD, masas, fuente de la resolución del radar | **Hecho** en el mismo PR |
| 30 | Observaciones blandas para espectrómetro y radar | Hecho por el GP |
| 15 | Licencia de Mars Climate Database | Cerrada: no se usa (DECISIONS 2026-11-11). Contrato nuevo `eva_window.schema.json` |
| - | `habitat_xy` en la STM | Pendiente: próximo cambio de la STM |

Un cambio de contrato es un solo PR que actualiza esquema, ejemplos, mocks y usos, y `python packages/contracts/validate.py` tiene que pasar.

## Para leer

- `research/factibilidad.md`: reglas de traverse, pendiente y clima.
- `research/decisiones-nasa.md`: cómo decide NASA y las opciones de ramas.
- `research/viabilidad-expediciones.md`: herramientas, umbral y veredicto.
- `research/impacto-diferencial.md`: qué número usar y cómo presentarlo.
- `docs/EXPERIMENTS.md`: simulación, validación y robustez.
