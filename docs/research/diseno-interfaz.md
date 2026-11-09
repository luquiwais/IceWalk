# Diseño de la interfaz: qué mostrar, dónde y por qué

Investigación de diseño para Frontend, 2026-11-09. Es solo investigación: no cambia código ni contratos, y lo que propone para el contrato va como propuesta a sus dueños.

**Cómo leer este informe.** Cada afirmación lleva una de tres etiquetas, como en `viabilidad-expediciones.md`. **Documentado** significa leído en la fuente; si solo se vio el resumen o un índice, se aclara «solo resumen». **Inferencia** es razonamiento nuestro que ninguna fuente afirma. **No verificado** quiere decir visto en un buscador o en una fuente débil, sin abrir el original. Los términos de la interfaz van en inglés, con la terminología de NASA.

## Respuesta corta

La interfaz tiene que ser una **escena de Marte a pantalla completa (globo y después el sitio en 3D) con una sola ventana de vidrio anclada al costado izquierdo**, no centrada. Así el mapa queda libre a la derecha, donde la cámara centra el sitio. La rodean tres ornaments fijos: la **tab bar vertical** (Planning / EV / Science) a la izquierda de la ventana, una **barra de estado arriba**, igual en las tres vistas, y la **toolbar de capas y cámara abajo**. La barra de estado lleva el reloj de la EVA, el walkback margin, el próximo bingo time, la alerta de mayor nivel y una mini-timeline con la línea de «ahora».

**Planning** es la vista densa: sidebar con Brief, Stations, Timeline, Decisions y Tools, ficha de estación al seleccionar, timeline tipo Playbook con restricciones calculadas y diff del replan. **EV** es la misma escena en primera persona, con un HUD de paneles sólidos y alto contraste: arriba, próxima station, rumbo, distancia y margen; abajo, despejado; a la izquierda, un minimapa 2D; en la station, un checklist contextual y los botones grandes para registrar la medición. **Science** reusa el mapa y la timeline, y suma el registro de mediciones, el leaderboard de opciones con justificación, la demora de comunicación visible y la aprobación del plan.

La pregunta que la interfaz responde ya no es «¿dónde hay hielo?». Es **«¿con qué herramienta vale la caminata, adónde voy primero y cuándo tengo que volver?»**. Por eso el mapa muestra potencial e incertidumbre con una paleta que suprime el valor donde la incertidumbre es alta, sin contornos duros. Además, cada número del modelo va acompañado de su alcance real (~100-200 m alrededor de un dato) y la decisión siempre es de la tripulación.

Hay faltantes en el contrato que la demo necesita: rasters de los mapas (`/maps` responde `pending`), rendimiento por herramienta, ventana de EVA, consumibles por tramo, incertidumbre local antes y después de una medición, y estado de la ejecución (as-run).

## 1. Usuarios, momentos y preguntas

### 1.1 Quién usa cada vista

| Usuario | Dónde y con qué | Qué necesita saber | Evidencia | Decisión de diseño |
| --- | --- | --- | --- | --- |
| IV (IV1 operaciones, IV2 ciencia), en el hábitat | Laptop o tablet; dirige la EVA porque la Tierra está a 4-20 min | Dónde están los EV respecto del traverse planeado, cómo va la timeline, consumibles, qué replanificar | En Marte «EVA operations will be directed by an IV crewmember in-situ», y el IV hace de «partial Flight Director, partial EVA Officer» (documentado, [xEVA Con Ops, sec. 4.3.2 y 8.1](https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf)). El sistema del IV tiene que mostrar «actual and planned traverses in both distance and time» y la «dynamic prioritization of science candidates» (documentado, misma fuente) | Planning es la vista principal y la más densa. Mapa y tiempo siempre visibles a la vez |
| EV1 (ops lead) y EV2 (science lead), en traje | Display del traje, simulado sobre la vista 3D; en la demo, tablet | Adónde voy ahora, cuánto margen tengo para volver, qué hago en esta station | «EV1 [...] leads timeline management, traverse navigation»; «EV2 [...] leads the science execution» (documentado, [Beaton et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442238/)). La informática del traje muestra consumibles, procedimientos, «timeline status, including time ahead/behind and consumables margin» y navegación (documentado, [xEVA Con Ops, sec. 4.2.1.8](https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf)) | EV muestra poco, grande y siempre en el mismo lugar. Los datos de seguridad son números, no gráficos |
| Equipo científico (Science Backroom / SER) | Estaciones de trabajo en la Tierra, con demora | Qué se midió, qué cambió en el mapa, qué recomendar antes del bingo time | Leaderboard «periodically updated [...] with rankings and justifications», comunicación por texto bajo latencia (documentado, [Marquez et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304/)). El SER tiene que entregar en «operationally relevant timelines» y con «clear rationale» (documentado, [Broddrick et al. 2024](https://ntrs.nasa.gov/api/citations/20240000165/downloads/Broddrick_LPSC_24_abstract.pdf)) | Science es una variante de Planning con registro, leaderboard y reloj de latencia. Es extra del MVP (PRD) |
| Jurado de Space Apps | Video de 30 s y demo en vivo | Entender en segundos qué decide IceWalk que otros no deciden | Criterios: impacto, creatividad, validez, relevancia y presentación (documentado, PRD, «Demo y pitch») | Cada pantalla de la demo tiene un número grande que se entiende sin explicación |

### 1.2 Qué pregunta responde cada paso de la demo

| Paso del guion (PRD) | Pregunta del usuario | Respuesta que tiene que estar en pantalla |
| --- | --- | --- |
| 1. Globo y vuelo a S1094b | ¿Dónde estamos y por qué acá? | Sitio marcado, latitud 35.1°N y «ice exposed by a 2021 impact», con crédito HiRISE |
| 2. STM | ¿Qué queremos aprender? | Objetivos por rango, variable, umbral (≤ 3 m) y herramienta que lo alcanza |
| 3. Mapas | ¿Qué sabemos y qué no? | Potencial con incertidumbre en una sola capa, alcance de cada dato y leyenda con números |
| 4. Plan | ¿Vale la caminata? ¿Con qué herramienta? ¿Adónde primero? | Veredicto por herramienta, estaciones en el mapa, timeline con walkback margin y bingo times |
| 5. EV en primera persona | ¿Adónde camino y cuánto margen tengo? | Próxima station, rumbo, distancia, ETA, margen y consumibles |
| 6. Station 1: no ice | ¿Qué cambia? ¿Qué hago ahora? | Opciones ordenadas con justificación, opción por defecto, decide-by, y diff del plan nuevo |
| 7. Antes/después | ¿Qué aprendimos? | Cambio local alrededor del punto medido y puntos confirmados de N, no la incertidumbre del sitio entero (ver 5.1) |

## 2. Arquitectura de información

### 2.1 La escena es el contenido; las ventanas son herramientas

- **El mapa no puede quedar tapado.** Hoy la ventana está centrada (`md:pl-[max(2rem,calc(50vw-34rem))]`, 57.5 rem de ancho) y la cámara vuela al centroide de las estaciones, así que las estaciones quedan detrás del vidrio (documentado, lectura de `apps/web/components/planning/planning-view.tsx` y captura a 1440×900). El HIG pide elegir un tamaño inicial que «minimizes empty areas», porque el espacio vacío termina «obscuring other content», y agrega que «too many windows can obscure people's surroundings» (documentado, [HIG Windows](https://developer.apple.com/design/human-interface-guidelines/windows), [HIG Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)). En un mapa, el HIG pide que sea interactivo y que los elementos no interactivos no lo tapen (documentado, [HIG Maps](https://developer.apple.com/design/human-interface-guidelines/maps)).
- **Propuesta, en tres partes** (inferencia):
  1. Anclar la ventana a la izquierda, después de la tab bar, con ~45 % del ancho a 1440 px.
  2. Correr el punto de foco de la cámara hacia el centro del área libre. En Cesium se puede hacer con un desplazamiento del frustum (`PerspectiveFrustum.xOffset`) o moviendo la cámara después del `flyTo`. La API exacta no se verificó.
  3. Sumar un modo «Map focus», que contrae la ventana a su barra de título. El HIG permite ocultar controles «when people dive into a window's content» y pide un modo confiable para restaurarlos (documentado, [HIG Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments), [HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)).
- **Mapa y tiempo integrados.** La lección central de BASALT es que integrar «geospatial and temporal planning» fue lo más valioso de Minerva, y que su falta de integración impidió replanificar: «Temporal and spatial planning integration enable and support real-time EVA replanning» (recomendación C3), con estimaciones de traverse «integrated into EVA timeline» (C1) (documentado, [Marquez et al. 2019, Tabla 7](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304/)). Por eso, seleccionar en el mapa, en la lista o en la timeline selecciona lo mismo en los tres lugares (inferencia).

### 2.2 Vistas, ventanas y ornaments

| Elemento | Qué es en visionOS | Contenido en IceWalk | Fuente o motivo |
| --- | --- | --- | --- |
| Tab bar (ornament vertical, a la izquierda) | Navegación principal; «always vertical, floating [...] relative to the window's leading side» | Planning, EV, Science. Badge solo para alertas críticas | Documentado, [HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars): «Reserve badges for critical information» |
| Ventana principal (vidrio) | Un sidebar dentro de un tab para la navegación secundaria | Sidebar con secciones de la vista y contenido con la ficha de lo seleccionado | Documentado, HIG Tab bars: «consider using a sidebar within a tab»; HIG Sidebars: no más de dos niveles |
| Barra de estado (ornament arriba, nuevo) | Ornament con «frequently needed controls or information in a consistent location» | EVA clock (PET), walkback margin, próximo bingo, alerta de mayor nivel, mini-timeline con now-line | Documentado, HIG Ornaments; NASA usa una «status bar with key parameters viewable at all times» (documentado, [CLDP HSI, Crew Interfaces 2024](https://ntrs.nasa.gov/api/citations/20240003566/downloads/CLD%20HSI%20Workshop%20Crew%20Interfaces.pdf)) |
| Toolbar (ornament abajo, ya existe) | Toolbar de visionOS sobre el borde inferior | Capas (Ice potential, Uncertainty, Traversability, Targets, HiRISE), cámara y Map focus | Documentado, HIG Toolbars; ancho ≤ ventana (HIG Ornaments) |
| Leyenda (en la escena, abajo a la derecha) | No es ornament: pertenece al mapa | Rampa de la capa activa con números, unidades, fuente y alcance de los datos | Documentado, NASA-STD-3001 [V2 10046]: unidades con cada valor numérico ([NASA](https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/)) |

**No más de dos ornaments propios además de la tab bar**, porque el HIG pide «constraining the total number of ornaments» (documentado, HIG Ornaments). La barra de estado y la toolbar alcanzan; el resto va dentro de la ventana o en la escena (inferencia).

### 2.3 Qué vive en el mapa y qué en las ventanas

| En el mapa (escena) | En la ventana | En la barra de estado |
| --- | --- | --- |
| Hábitat, stations numeradas y su estado (pending, done, dropped, added) | Ficha de station: números, tareas EV1/EV2, herramientas, hipótesis, decision point | PET, walkback margin, próximo bingo, alerta tope |
| Ruta (traverse) y ruta anterior en un replan (punteada) | Timeline detallada con restricciones | Mini-timeline con now-line |
| Capa de potencial con incertidumbre; capas de costo (zonas de exclusión) | Tabla de herramientas y veredicto | Demora de comunicación (Science) |
| Blancos: cráteres de fondo plano someros | STM, equipo y masa, fuentes | - |
| Halo de alcance de cada dato (~100-200 m) | Registro de mediciones (Science) | - |
| Isócrona de regreso (hasta dónde se llega y se vuelve) | Diff del replan | - |

El criterio: **lo que tiene posición va al mapa y lo que es lista o detalle va a la ventana**. Cada objeto del mapa se selecciona y abre su ficha en la ventana (inferencia, coherente con xGDS, donde todo dato está «time-stamped and geolocated», documentado en [Marquez et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304/)).

### 2.4 Consistencia entre las tres vistas

NASA-STD-3001 exige interfaces «consistent in appearance, arrangement, location, and operation» [V2 10005] y nomenclatura estandarizada [V2 10006] (documentado, [NASA-STD-3001 Vol. 2, cap. 10](https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/)). Por eso, en las tres vistas, la barra de estado tiene el mismo contenido y la misma posición; los colores de alerta significan lo mismo; los ids de station (`E03S22`) y los nombres de herramienta son idénticos; y la ficha de station es el mismo componente, con densidad distinta (inferencia). EV usa materiales más sólidos que Planning, pero respeta la misma ubicación de cada dato (inferencia; ver 7.1).

## 3. Inventario de datos

### 3.1 Del contrato a la pantalla

Prioridad: **D** = crítico para la demo, **N** = conviene, **S** = omitir en el MVP.

| Campo | Vista y lugar | Cómo se muestra | Prio. | Justificación |
| --- | --- | --- | --- | --- |
| `plan.mission_id`, `plan_id`, `replanned_from` | Planning, pie del Brief; diff del replan | Texto chico; «Replanned from plan-demo0001» | N | Trazabilidad del replan |
| `stations[].id`, `order` | Todas; mapa y listas | Marcador numerado en el mapa; «1 · E03S22» | D | Mismo nombre en todas las vistas [V2 10006] |
| `stations[].lonlat` / `position` | Mapa | Marcador; en EV, rumbo y distancia calculados | D | Navegación (xEVA Con Ops) |
| `priority` | Ficha, lista | Texto «High», sin color | N | El color es solo para alertas (PRD) |
| `objective_ranks` | Ficha | «STM objective 1»; enlaza al objetivo | D | Trazabilidad STM → station ([Broddrick 2024](https://ntrs.nasa.gov/api/citations/20240000165/downloads/Broddrick_LPSC_24_abstract.pdf)) |
| `tools` | Ficha, EV checklist | Nombre y tiempo de la herramienta | D | El producto recomienda la herramienta (DECISIONS, 2026-11-08) |
| `tasks.EV1`, `tasks.EV2` | Ficha (dos columnas), EV (solo las del usuario) | Lista de pasos | D | Checklist contextual en lugar de ~50 páginas (PRD) |
| `duration_min` | Ficha, timeline | «40 min» | D | Timeline |
| `hypothesis` | Ficha | Párrafo corto | N | Ficha JETT3 (PRD) |
| `p_ice` | Ficha, tooltip del mapa | «P(ice ≤ 3 m) 65 %» y, en frecuencia, «~2 in 3» | D | Frecuencias se entienden mejor ([Padilla, Kay y Hullman 2020](https://moodle2.units.it/pluginfile.php/466375/mod_resource/content/0/Uncertainty_Visualization_Padilla_Kay_Hullman_2020.pdf)) |
| `uncertainty` (bits) | Ficha | «0.94 bits», con etiqueta textual («high ambiguity») | N | Los bits no son intuitivos (inferencia); conviene la profundidad como rango |
| `value` | Ficha, orden de la lista | Número [0, 1] con la etiqueta «Value of measuring» | N | Explica por qué esta station |
| `depth_median_m`, `depth_shallow_m` | Ficha | «Depth to ice: median 2.45 m, shallow case 1.43 m» | D | Responde a qué profundidad cavar o mirar, y si la herramienta llega |
| `planetary_protection` | Ficha, marcador del mapa | Advisory: «Sampling protocol applies» | N | PRD, protección planetaria |
| `terrain_unit` | Ficha | «Unit 3» | S | Las unidades todavía no existen (alerta del mock) |
| `kind` | Ficha, marcador | «Survey» o «STM target» | N | Distingue elegida por el mapa de fija por la STM |
| `route` (LineString, `max_slope_deg`, `routing`) | Mapa; perfil en la ficha del traverse | Línea fina; «max slope 6.5°»; «routed on DTM» | D | Transitabilidad visible |
| `timeline[].kind`, `t_start_min`, `t_end_min`, `label`, `station_id` | Planning, Timeline y barra de estado | Barras horizontales por tipo: egress, traverse, station, ingress, reserve | D | Playbook ([Zheng et al. 2023](https://ntrs.nasa.gov/api/citations/20230008619/downloads/Spacechi2023v5.pdf)) |
| `timeline[].walkback_margin_min` | Timeline, barra de estado, EV | Curva descendente bajo la timeline y número en la barra | D | Límite duro (`decisiones-nasa.md`) |
| `decision_points[].decide_by_min` | Timeline (marca vertical), barra de estado, EV | «Bingo 5:54», con cuenta regresiva | D | Bingo times ([Stevens et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442282/)) |
| `decision_points[].options` (rank, if_result, probability, next_station_ids, rationale) | Decisions, ficha, EV en la station | Leaderboard ordenado con justificación y la opción por defecto marcada | D | Leaderboard con justificación (Stevens 2019; Marquez 2019) |
| `decision_points[].hard_stop`, `default_option` | Decisions, EV | Texto fijo, siempre visible | D | «Sin respuesta a tiempo, sigue la prioridad propia» (`decisiones-nasa.md`) |
| `equipment[]` (tool, count, mass_kg, justification) | Tools | Tabla con masa total y «n items without mass» | N | Presupuesto de masa (PRD) |
| `summary.duration_min`, `distance_km`, `max_distance_from_habitat_km` | Brief, barra de estado | Números grandes | D | Factibilidad de un vistazo |
| `summary.min_walkback_margin_min` | Brief, barra de estado | Número; caution o warning según el umbral | D | Límite duro |
| `summary.dose_estimate_msv` | Brief | «0.16 mSv» | N | PRD, radiación |
| `summary.expected_uncertainty_reduction` | Brief | **No como titular**: vale 0.0 en los mocks y casi no se mueve a nivel de sitio | S | `EXPERIMENTS.md`: ninguna estrategia baja la ambigüedad del sitio más de ~0.12 % |
| `summary.ice_threshold_m`, `craters_in_model` | Brief, leyenda | «Ice ≤ 3 m (STM) · 349 craters in model» | D | Dice qué mide el mapa y con qué datos |
| `summary.is_mock` | Barra de estado | Advisory «Illustrative values» | D | [V2 10020]: indicar un dato «stale, missing, unavailable» (NASA-STD-3001) |
| `alerts[]` (level, message, source) | Barra de estado (tope) y Brief (lista) | Ícono, nombre del nivel y color | D | [V2 10114], [V2 10045] |
| STM `objectives[]` (rank, title, hypothesis, purpose, trace, measurement) | Planning, Brief, «Mission objectives» | Lista ordenada: variable, umbral, cobertura y herramienta que llega | D | Paso 2 de la demo; la STM ordena todo ([BASALT](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6442241/)) |
| STM `constraints` (eva_max_h, reserve, max_slope_deg, walkback_max_km, walking_speed_kmh) | Brief, «Safety limits» | Lista de límites con el valor del plan al lado: «Duration 5:51 / 8:00» | D | Mostrar límite y valor juntos, sin cuentas mentales: [V2 10113] |
| Catálogo de herramientas (depth_m, time_min, mass_kg, crew, mode, evidence, assumption, analog) | Tools; EV checklist | Tabla con «Assumption» marcado donde corresponde | D | Selector de herramienta (`viabilidad-expediciones.md`, rec. 4) |
| `measurement` (result, depth_m, weh_percent, tool, crew_member, timestamp) | EV (entrada), Science (registro), diff del replan | Entrada: tres botones y la profundidad. Registro: fila con hora, station, herramienta y resultado | D | Paso 6 de la demo |
| `measurement.notes` | Science | Texto | S | - |
| `layers.yaml` (name, role, units, resolution_m, citation) | Toolbar y leyenda | Toggle; la leyenda muestra unidades, resolución y cita | D | Citar fuentes (reglas de Space Apps) |
| `boulders` (diameter_m, confidence, `detection_limit_m`) | Mapa, capa de costo | Puntos o densidad; leyenda con «below 0.5 m not detected» | N | No confundir «nada detectado» con «despejado» (esquema) |
| `/spaceweather` (DONKI) | Barra de estado | Warning: «Solar particle event: return to habitat» | N | `hard_stop` lo nombra |

### 3.2 Lo que la interfaz necesita y el contrato no trae (propuestas para sus dueños)

| Falta | Para qué paso | Propuesta (no es decisión) | Dueño |
| --- | --- | --- | --- |
| **Rasters de potencial e incertidumbre**: `/maps/{kind}` devuelve `status: pending` (documentado, `apps/planner/app/main.py`) | 3 y 7 | PNG + JSON con límites lon/lat y rampa (formato web del PRD), uno para el plan y otro para el replan | GP + Planificador |
| **Rendimiento por herramienta**: P(d ≤ alcance) media y mejor, estaciones esperadas hasta un hallazgo, puntos esperados por EVA | 4 (el veredicto) | Bloque `tool_assessment[]` en `summary` o endpoint aparte. Los números existen en `gp.planning.tool_yield` (`EXPERIMENTS.md`, 2026-11-08) | GP + Planificador |
| **Ventana de EVA** (temperatura, viento, polvo, luz, clima espacial, con niveles) | 4 | `eva_window`: inicio, fin y factores con nivel. Está decidido (DECISIONS, 2026-11-08) pero no está en el esquema | Planificador |
| **Consumibles por tramo**: hoy solo hay `walkback_margin_min` | 5 | `consumables_remaining` por ítem de la timeline (O2, batería, tiempo), aunque sea un modelo lineal declarado como supuesto | Planificador |
| **Incertidumbre local antes y después** de una medición | 7 | En `/replan`: cambio de P e incertidumbre dentro de ~200 m de la medición, y conteo de «stations with ice within reach» | GP |
| **Estado de ejecución (as-run)**: stations hechas, hora real, adelanto o atraso | 5 y 6 | `completed_station_ids` y `elapsed_min` en la respuesta de `/replan` (el request ya los recibe) | Planificador |
| **Blancos**: cráteres de fondo plano con `d` como GeoJSON | 3 y 4 | Capa en `layers.yaml` + GeoJSON servido; la licencia de Dundas 2023 sigue abierta (cuestión 26) | GP |
| **Radar en la caminata**: qué tramos lo usan y qué se espera ver | 4 y 5 | Propiedad `tools` en cada feature de la ruta | Planificador |
| **Hábitat e isócrona de regreso** | 3-5 | Posición del hábitat en el plan, y un polígono de «reach and return» | Planificador |
| **Estado de la medición** `ok | degraded | failed` | 6 | Ya propuesto en `decisiones-nasa.md` | Planificador |
| **Alertas con contexto**: id, station, hora y si se pueden descartar | Todas | Campos opcionales en `alerts[]` | Planificador |
| **Demora de comunicación y aprobación** (Science) | Extra | `comm_owlt_min`, `approval: pending | approved | modified` | Producto |

**Inconsistencias en los mocks**, a revisar con Planificador (documentado, lectura de `apps/web/mock/`):

- En `replan.json`, `min_walkback_margin_min` = 2.2 min y no hay alerta caution. Con un margen así, la interfaz tendría que avisar.
- La primera station está en la posición por defecto del hábitat, con un traverse de 0 min, y todas quedan a ≤ 220 m. La escala del mapa del sitio es de cientos de metros, no de kilómetros.
- Todas las stations usan `core_drill`, y el radar aparece solo en `equipment`. DECISIONS dice que el radar es la herramienta principal y el taladro confirma: si eso vale, el radar tiene que verse en la ruta, no solo en la lista de equipo.

## 4. Layout propuesto por vista

Escala: 1 pt de visionOS = `min(100vw/1920, 100vh/1080)` entre 0.8 y 1.25 px (DECISIONS). A 1440×900 y a 1024×768 da el piso, 0.8 px/pt. Los 60 pt de separación entre controles que pide el HIG ([Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)) son 48 px. Las medidas de los wireframes están en px (inferencia).

### 4.1 Planning, 1440×900

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│        ┌ STATUS ─────────────────────────────────────────────────────────────────────────┐ │
│        │ PET 1:52 │ Walkback 269 min │ Bingo E03S22 5:54 │ ⓘ Advisory Illustrative values │ │
│        │ ▕egress▏▕S1▏▕S2▏▕S3  ▏▕S4▏▕S5▏▕S6▏▕in▏▕ reserve ░░░░░ ▏  ← now                 │ │
│        └─────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──┐ ┌─ EVA 1 ──────────┬──────────── Brief ──────────┐                                    │
│ │▣ │ │ ▸ Brief          │ WHICH TOOL                   │         ·  ·   (Mars scene)        │
│ │PL│ │   Stations    6  │ Radar  ≤10 m  ~1 stn/find  ✓ │      ②───③                         │
│ │EV│ │   Timeline       │ Drill  ≤1 m   ~17 stn/find   │   ①─┘    │      ◌ target crater    │
│ │SC│ │   Decisions   1  │ Neutron ≤0.6m ~165 stn/find  │   ⌂ hab  ④──⑤──⑥                    │
│ └──┘ │   Tools       4  │──────────────────────────────│        (halo ~150 m around data)   │
│      │                  │ Duration 5:51 / 8:00 limit   │                                    │
│      │ Mission          │ Min walkback 33 min          │                                    │
│      │ objectives    3  │ Distance 0.74 km · max 0.22  │                    ┌ Legend ───────┐│
│      │                  │ Dose 0.16 mSv                │                    │Ice ≤3 m  P    ││
│      │                  │ Stations ① … ⑥  (list)       │                    │▁▂▃▅▇ 0 .5 1   ││
│      │                  │                              │                    │fades = unsure ││
│      └──────────────────┴──────────────────────────────┘                    │GP · 349 crat. ││
│        ┌ Potential │ Uncertainty │ Traversab. │ Targets │ HiRISE │ ＋ − ◎ ⤢ ┐└──────────────┘│
│        └──────────────────────────────────────────────────────────────────┘                │
└────────────────────────────────────────────────────────────────────────────────────────────┘
  x: 24 tab bar │ 96–656 window (~560 px) │ 680–1440 free map; camera centered at ~1060 px
```

- **Selección.** Al tocar una station en el mapa, la lista o la timeline, el contenido de la ventana pasa a la ficha (navegación con Back, como hoy). La station se resalta en el mapa con contorno y escala, como pide el HIG para la selección ([Maps](https://developer.apple.com/design/human-interface-guidelines/maps)), y su bloque se resalta en la mini-timeline (inferencia).
- **Ficha de station**, en este orden: número y herramienta («Drill to 1 m, 40 min, EV1 + EV2»), P(ice) con frecuencia, profundidad mediana y caso somero frente al alcance de la herramienta, tareas EV1/EV2 en dos columnas, hipótesis, decision point con el bingo, y protección planetaria (inferencia).
- **Timeline.** Al elegir Timeline, la ventana se ensancha hasta ~1100 px, porque el HIG pide una forma que se adapte al contenido («a default Keynote window is wide»), y la cámara se corre hacia arriba (inferencia sobre [HIG Windows](https://developer.apple.com/design/human-interface-guidelines/windows)).
- **El sidebar no lleva nada crítico abajo**, porque «people often relocate a window in a way that hides its bottom edge» (documentado, [HIG Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)).

### 4.2 Planning, tablet 1024×768

```
┌───────────────────────────────────────────────────────────────┐
│ ┌ PET 1:52 │ Walkback 269 │ Bingo 5:54 │ ⓘ Illustrative ┐       │
│ └ ▕e▏▕1▏▕2▏▕3 ▏▕4▏▕5▏▕6▏▕i▏▕res░░ ▏                     ┘       │
│┌─┐┌ ‹ Brief ─────────────────┐                                  │
││P││ [Brief|Stations|Timeline]│        ②───③                     │
││E││ WHICH TOOL               │     ①─┘    │   ◌                 │
││S││ Radar ✓ · Drill · Neutron│     ⌂  ④──⑤──⑥                   │
│└─┘│ Duration 5:51 / 8:00     │                                  │
│   │ Walkback min 33 min      │                       ┌ Legend ┐ │
│   │ ① E03S22  65% · 40 min   │                       └────────┘ │
│   └──────────────────────────┘                                  │
│    ┌ Layers ▾ │ ＋ − ◎ ⤢ ┐                                       │
└───────────────────────────────────────────────────────────────┘
```

Con ~420 px de ventana, el sidebar no entra. Pasa a un segmented control o a una lista con navegación hacia atrás, y las capas se agrupan en un menú. El HIG sugiere «automatically hiding and revealing a sidebar when its container window resizes» (documentado, [HIG Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)). La toolbar no puede ser más angosta que sus controles esenciales («prevent windows from resizing below the width of the toolbar», documentado, [HIG Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)).

### 4.3 EV, primera persona (1440×900; en tablet, la misma grilla escalada)

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ ┌ NEXT ───────────────────┐   ┌ ALERT (only if any) ┐   ┌ MARGIN ─────────────────────────┐ │
│ │ ② E04S22  Drill 1 m     │   │ ▲ CAUTION           │   │ Walkback 223 min   Bingo 5:54   │ │
│ │ 040° NE · 180 m · 3 min │   │ Walkback < 30 min   │   │ O2 5:10 · Batt 71 % (assumed)   │ │
│ └─────────────────────────┘   └─────────────────────┘   └─────────────────────────────────┘ │
│                         (far view: sky and horizon)                                        │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                         (near view: ground, kept clear)                                    │
│                              ·  ·  ·  ⟶ (thin dashed path)                                 │
│ ┌ MINIMAP ─┐                                                                               │
│ │ ⌂ ①●②  │                                                    ┌ AT STATION (on arrival) ┐ │
│ │   N↑ 200m│                                                    │ 1 Unstow drill (EV1)     │ │
│ └──────────┘                                                    │ [ ICE ] [NO ICE] [ ?? ]  │ │
│                                                                 │ depth  − 0.4 m ＋        │ │
│                                                                 └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Arriba, la información; abajo, el suelo despejado.** En un estudio de HUD lunar con 25 expertos, 3 de ellos astronautas, se reservó el área periférica para datos auxiliares y la vista lejana (cielo) para la navegación, y se dejó libre la vista cercana. Ahí dicen que «the lower field of view is deliberately left unobstructed», piden cues «minimalistic (e.g., a thin dashed line) or semi-transparent», evitan los botones físicos con guantes y prefieren la voz con reservas. Un astronauta pide que el HUD explique «why should I follow that?» (documentado, [Bensch et al., CHI 2024](https://arxiv.org/pdf/2402.15692)). Es la Luna, no Marte: en Marte el cielo sí trae información (polvo), así que el traslado es inferencia.
- **Minimapa 2D.** SUITS pide una ayuda de navegación «2D mini-map type» y una navegación flexible porque «destinations can change» (documentado, solo resumen del buscador; el PDF de la misión FY24 devolvió 404) ([SUITS FY24](https://nasa.gov/wp-content/uploads/2023/09/fy24-suits-mission-description.pdf)).
- **Pocas interacciones.** Joint AR: «time spent controlling the display is time spent not doing the EVA task». Su control base es remoto desde MCC, más un controlador de muñeca y voz (documentado, [Mitra et al., ICES-2023-298](https://ntrs.nasa.gov/api/citations/20230010234/downloads/Trades_ICES_2023_07_updated_software_name.pdf)). En la demo, el IV puede adelantar la vista del EV y la medición se registra con tres botones grandes y un paso de profundidad (inferencia). Los botones miden ≥ 60 pt y están separados ≥ 16 pt (documentado, HIG); para guantes, más grandes: lo que pide la validación con guantes del PRD (inferencia).
- **El HUD no reemplaza al sistema de C&W.** «In the event that data on the xInformatics system does not match [...] the crew will be trained to use the Caution and Warning System» (documentado, [xEVA Con Ops, sec. 4.2.1.8](https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf)). Los consumibles del traje se marcan como simulados (inferencia).
- **El checklist aparece solo en la station.** El EV ve los pasos de su rol (EV1 o EV2) para la herramienta actual, que reemplaza al cuff checklist de ~50 páginas (PRD). Las cuff checklists de Apollo organizaban cada página por station con el tiempo transcurrido, por ejemplo «2+02 Station 2» (no verificado: visto en el índice del ALSJ, sin abrir las páginas) ([ALSJ, checklists](https://www.nasa.gov/wp-content/uploads/static/history/alsj/surcl.html)).

### 4.4 Science, extra (1440×900)

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│        ┌ STATUS: PET 2:10 │ Walkback 210 │ Bingo 5:54 │ OWLT Mars→Earth 12 min ┐            │
│        │ ▕S1✓▏▕S2 ▏… ┊now ┊+12 msg arrives ┊+24 reply arrives                   │            │
│ ┌──┐ ┌─ Science ────────┬─ Measurements ──────────────┐                                    │
│ │PL│ │ ▸ Measurements 1 │ 14:35 E03S22 Drill no ice to 1.0 m  EV1                          │
│ │EV│ │   Leaderboard    │ ── what changed: P(ice) nearby 67 % → 41 % (≤150 m) ──           │
│ │SC│ │   Mission log  2 │                             │        (map: before|after slider)  │
│ └──┘ │   Approve plan   │ LEADERBOARD (next)          │                                    │
│      │                  │ 1 E04S22  default · why…    │                                    │
│      │                  │ 2 E02S22  if radar shallow… │                                    │
│      └──────────────────┴─────────────────────────────┘                                    │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Latencia visible.** Playbook dibujaba la hora actual como línea roja sólida y la latencia como líneas punteadas, y cada mensaje enviado llevaba una cuenta regresiva hasta su llegada (documentado, [Marquez et al. 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304/)). La recomendación B1 pide «timing counters and round-trip time calculations» (documentado, misma fuente). Acá van en neutro, no en rojo, porque el rojo es warning (inferencia).
- **Recuperar la conciencia de situación.** El equipo científico preguntaba seguido «what's going on?». Para recuperar el contexto rápido necesitaba saber dónde está la tripulación, cuánto tiempo le queda y cuántas muestras faltan (documentado, misma fuente). Esos son los primeros datos de la barra de estado (inferencia).

### 4.5 La herramienta, en el Brief y no como tarjeta de sitio

`viabilidad-expediciones.md` recomendaba una tarjeta de sitio con cuatro estados. Después, DECISIONS (2026-11-08) dejó **fuera de alcance elegir y comparar sitios**, y cerró la cuestión 31. Lo que sigue vigente es el mensaje «IceWalk dice con qué herramienta ir» (DECISIONS, 2026-11-08). Por eso se propone un bloque **«Which tool?»** dentro del Brief de Planning, no una pantalla previa.

| Tool | Reach | P(d ≤ reach), media por station | Stations esperadas hasta un hallazgo | Tiempo | Verdict |
| --- | --- | --- | --- | --- | --- |
| Ground-penetrating radar | 10 m (reflector, no hielo) | 0.996 | ~1 | En la caminata | Recommended (survey) |
| Core drill | 1 m | 0.058 | ~17 | 40 min | Confirm only |
| Neutron spectrometer | 0.6 m | 0.006 | ~165 | 12 min | Not useful here |

Los números son de `EXPERIMENTS.md` (2026-11-08, `tool_yield`). Ese mismo registro advierte que el valor del radar es optimista, porque el modelo lo trata como confirmación. Cada fila lleva la etiqueta «assumption» del catálogo. El veredicto es una recomendación, no un permiso (inferencia).

## 5. Cómo mostrar cada cosa

### 5.1 Probabilidad e incertidumbre

- **Una sola capa por defecto, «Ice potential», con supresión de valor.** Los mapas bivariados (valor e incertidumbre en dos canales) cuestan de leer. Las Value-Suppressing Uncertainty Palettes asignan «larger ranges of a visual channel to data when uncertainty is low, and smaller ranges when uncertainty is high». En un experimento con crowdsourcing, la gente «more heavily weight[s] uncertainty information in decision-making» que con un mapa bivariado (documentado, [Correll, Moritz y Heer, CHI 2018](https://www.tableau.com/sites/default/files/2023-01/2018-UncertaintyPalettes-CHI.pdf)). Es justo el mensaje del producto: «no prometemos dónde está el hielo». Lejos de los datos, el mapa se ve como neblina, no como un rojo seguro (inferencia).
- **La incertidumbre, aparte, como capa opcional.** El toggle «Uncertainty» muestra solo los bits, para el IV y la ciencia (inferencia).
- **Sin contornos duros.** Con un borde, la gente lee «adentro peligro, afuera seguro»: es el caso del cono de huracanes y del punto azul de Google Maps (documentado, [Padilla, Kay y Hullman 2020](https://moodle2.units.it/pluginfile.php/466375/mod_resource/content/0/Uncertainty_Visualization_Padilla_Kay_Hullman_2020.pdf)). No hay isolíneas de P = 0.5. Si hace falta marcar algo, se usan puntos (stations, blancos) (inferencia).
- **Alcance del dato.** Un dato informa ~100-200 m. Afuera de ese radio, el mapa es el prior (cuestión 28 de `OPEN_QUESTIONS.md`). Un halo tenue alrededor de cada cráter y cada medición lo hace visible (inferencia).
- **Números al pasar el cursor**, en la leyenda y en la ficha: «P(ice ≤ 3 m) 67 % (~2 in 3) · depth median 2.45 m · shallow case 1.43 m». El encuadre en frecuencias reduce errores (documentado, Padilla et al. 2020, que atribuye la idea a Gigerenzer).
- **Color.** El PRD dice «color solo para estado y alertas», y un mapa de probabilidad necesita una rampa. La salida es usar luminosidad en un tono que no use ninguna alerta (ni rojo, ni amarillo, ni cian). Por ejemplo, índigo o violeta, desaturado hacia gris donde la incertidumbre es alta (inferencia). La fuerza de la variable visual para incertidumbre: «fuzziness» y «value» fueron intuitivas y la saturación rindió poco en el estudio de MacEachren (no verificado: solo un resumen de clase) ([MacEachren et al. 2012](https://geography.wisc.edu/cartography/projects/publications/MacEachrenEtAl_2012_TVCG.pdf)). La decisión es de Diseño.

### 5.2 Timeline con restricciones

Del Playbook se toman cinco patrones (documentado, [Zheng, Shelat y Marquez 2023](https://ntrs.nasa.gov/api/citations/20230008619/downloads/Spacechi2023v5.pdf)):

1. Las violaciones se marcan sobre la actividad, en el panel de detalle y en una bandeja resumen, porque la herramienta «calculates and presents this critical information directly».
2. Las «no-go zones» son superposiciones gris oscuro.
3. Cada restricción se describe «in simple language». En el ISS, una tripulante no pudo resolver violaciones por «a lack of understanding of the rationale behind the series of constraints».
4. Las soluciones sugeridas solo se aplican si el usuario las dispara: «it is ultimately up to the user».
5. Los usuarios «cannot rely solely on completely abstracted affordances»: tienen que entender el plan.

Aplicado a IceWalk (inferencia):

```
EVA 0:00      1:00      2:00      3:00      4:00      5:00      6:00      7:00     8:00
EV1  [egress ][S1 drill ][S2 drill ][S3 drill+cam][S4 ][S5 ][S6 ][rtn][ingress][ reserve ░░░]
EV2  [egress ][S1 assist][S2 assist][S3 sample   ][S4 ][S5 ][S6 ][rtn][ingress]
           ┆ now                                                   ▲ bingo E03S22 5:54
walkback ‾‾‾‾‾‾‾‾╲___________╲_____________╲_________╲______╲____ 33 min (min)
          ░░░ no-go: after this point the next station cannot be left with margin ≥ 0
```

- Los carriles EV1 y EV2 salen de `tasks`. La reserva va rayada. El bingo es una marca vertical. La curva de walkback margin baja con el plan, y cuando cruza el umbral de caution cambia a ámbar con texto, nunca solo con color ([V2 10045]).
- Las estimaciones de traverse tienen que estar dentro de la timeline. En BASALT, no tenerlas dejó al equipo atrasado y sin datos para decidir (documentado, [Marquez et al. 2019, sec. 5.3](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304/)).
- En ejecución, el EV ve solo «tiempo transcurrido y margen sobre la actividad»: «EV should have access to simplified information regarding EVA progress, such as elapsed time or time margins» (documentado, misma fuente).

### 5.3 Decision points y diff del replan

- **Leaderboard, no árbol.** NASA usa listas ordenadas, reordenables, con justificación y plazo; la tripulación decide (documentado en `decisiones-nasa.md`; Stevens 2019; Beaton 2019, «advisory only»). Cada opción va con la etiqueta «Recommended», el resultado que la dispara, la probabilidad, las stations siguientes y la justificación en una línea. La opción por defecto está marcada, y el bingo va con cuenta regresiva (inferencia).
- **Si el resultado no cambia nada, decirlo.** Con `if_result: any`, la interfaz muestra «This measurement does not change the next stations», como ya decidió Planificador (DECISIONS, 2026-11-08).
- **La justificación siempre a la vista.** En el estudio de HUD, los astronautas pidieron saber por qué seguir una ruta (documentado, [Bensch et al. 2024](https://arxiv.org/pdf/2402.15692)). El sesgo de automatización produce errores de omisión y de comisión, en novatos y en expertos, y el entrenamiento no lo evita (documentado, solo resumen, [Parasuraman y Manzey 2010](https://pubmed.ncbi.nlm.nih.gov/21077562/)). Por eso el replan no se aplica solo: queda como propuesta con «Accept replan» y «Keep nominal» (inferencia, coherente con Playbook).
- **Diff.** La ruta vieja va punteada y la nueva sólida. Las stations llevan badges «Dropped» y «Added» como texto, no solo con color. Las deltas del resumen van con signo («Walkback min −30.8 min → 2.2 min»), y hay un deslizador de antes y después sobre el mapa local. Ya existe `ReplanSummary` con las deltas; faltan el mapa y la ruta fantasma (documentado, lectura de `replan-summary.tsx`).

### 5.4 Alertas: advisory, caution, warning

NASA-STD-3001 define: **Warning**, «an event that requires immediate action»; **Caution**, «needs attention but not immediate action»; **Advisory**, «a safe or normal configuration [...] or imparts information for routine action purposes»; **Emergency**, «time-critical event that requires immediate action and crew survival procedures». Exige además anuncios visuales y sonoros con doble codificación (documentado, [NASA-STD-3001 Vol. 2, 2011, glosario y sec. 10.7.2](https://standards.nasa.gov/sites/default/files/standards/NASA/B/0/Historical/nasa-std-3001_vol_2.pdf)). La versión vigente exige una «additional cue» cuando el color comunica algo crítico [V2 10045] (documentado, [NASA](https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/)). NASA recomienda usar el color «sparingly» y con «standard/common color meanings», y mantener una «display density» acotada: «only display information needed for the task by default» (documentado, [CLDP HSI 2024](https://ntrs.nasa.gov/api/citations/20240003566/downloads/CLD%20HSI%20Workshop%20Crew%20Interfaces.pdf)). El HIG pide color en «bold text and large areas» sobre el vidrio (documentado, [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)), y es lo que ya hace `StatusBadge`.

Propuesta de qué condición dispara cada nivel. Todo es inferencia, con umbrales a declarar como `"assumption": true`:

| Nivel | Condición en IceWalk | Dónde aparece |
| --- | --- | --- |
| Warning | Walkback margin < 0; evento de partículas solares (DONKI); hard stop alcanzado | Barra de estado (reemplaza lo demás), banner en EV y sonido en la demo |
| Caution | Walkback margin bajo un umbral (por ejemplo, 15 min); faltan < 10 min para un bingo; la ventana de EVA se cierra | Barra de estado, timeline y EV |
| Advisory | Replan hecho; datos ilustrativos (`is_mock`); mapa solo con prior; protección planetaria en una station | Brief y barra de estado si no hay otra alerta |
| Emergency | No se usa: no hay telemetría real del traje | - |

La alerta de mayor nivel siempre ocupa el mismo lugar, en la barra de estado, en las tres vistas ([V2 10005]).

### 5.5 HUD de EV: reglas concretas

1. Cuatro números siempre visibles: próxima station con su distancia, rumbo, walkback margin y bingo. Los consumibles van después y marcados como supuestos (inferencia sobre xEVA Con Ops y Bensch 2024).
2. Paneles con material sólido u oscuro opaco, no vidrio. El registro del 8/11 ya lo anota: «la vista EV pide paneles más sólidos» (documentado, `docs/log/2026-11-08.md`). El HIG desaconseja quitar el vidrio en ventanas comunes, pero un HUD sobre una escena con sol fuerte no es una ventana común (inferencia; ver 7.1).
3. Ni blanco ni negro puro como color de dato sobre un terreno claro u oscuro. En la Luna los participantes desaconsejaron ambos porque «dominate the lunar landscape» (documentado, Bensch 2024). En Marte, el ocre del terreno pide probar el contraste en la escena real (inferencia).
4. Se muestra por contexto: caminando, navegación; en la station, checklist y medición; en el ingress, solo margen (documentado, Bensch 2024: «task-specific displays»).

## 6. Guion de la demo pantalla por pantalla

| # | Pantalla | Qué se ve | Interacción | Datos | Hoy |
| --- | --- | --- | --- | --- | --- |
| 1 | Globo, sin ventana | Marte entero; S1094b marcado; vuelo hasta el sitio | Un toque en el sitio o automático | Cesium Mars; `layers.yaml` | Globo existe; vuelo existe (`focus`) |
| 2 | Planning, Mission objectives | STM ordenada; el objetivo 1 dice «≤ 3 m · radar survey, drill confirms» | Seleccionar el objetivo 1 | STM | Falta la sección |
| 3 | Map focus con Ice potential | Neblina general, zonas nítidas cerca de cráteres, halo de alcance y leyenda con números | Toggle de Uncertainty | **Falta el raster** (`/maps` pending) | Toggles sin efecto |
| 4 | Brief, «Which tool?» + stations + timeline | Veredicto por herramienta; 6 stations; walkback 33 min; bingo | Abrir la station 1 | Plan + **falta** `tool_assessment` | Plan sí, herramienta no |
| 5 | EV en primera persona | HUD: «② E04S22 · 040° · 180 m»; margen | Avanzar el traverse | Plan, ruta, DTM | Falta la vista |
| 6 | EV en la station, después Planning | «NO ICE to 1.0 m» → leaderboard → diff del plan con la ruta fantasma | Log measurement → Accept replan | `measurement.json`, `replan.json` | Diff en lista, sin mapa |
| 7 | Antes/después local | Deslizador sobre ~200 m alrededor de la station 1; «ice points confirmed: 0 of 1, next best 67 %» | Arrastrar el deslizador | **Falta** el cambio local | No existe |
| 8 | Cierre | «NASA already plans routes. We plan what to learn.» | - | - | - |

**El paso 7 cambia respecto del PRD.** La incertidumbre del sitio entero casi no se mueve, ~0.12 % con cualquier estrategia (documentado, `EXPERIMENTS.md`), y `expected_uncertainty_reduction` vale 0.0 en los dos mocks. Un antes/después del sitio entero mostraría nada o prometería algo falso. El cambio local y «qué hacemos ahora» sí son reales (inferencia).

**Qué tiene que capturar el teaser de 30 s** (inferencia sobre la tabla del PRD):

1. El vuelo del globo al sitio, sin ventanas.
2. La capa de potencial apareciendo como neblina que se aclara cerca de los cráteres: el «from orbit, ice is only a probability».
3. La ruta dibujándose entre las stations, con la timeline llenándose.
4. El HUD de EV caminando.
5. El golpe «NO ICE», la ruta vieja que se desvanece y la nueva que se dibuja, con el margen cambiando en la barra de estado.
6. El deslizador local de antes y después.

Cada toma con un solo número grande legible en 2 s. Las capturas se hacen con el modo Map focus, para que el mapa ocupe el cuadro.

## 7. Riesgos, contradicciones y preguntas abiertas

### 7.1 Contradicciones entre fuentes

| Tema | A | B | Cómo se resuelve aquí |
| --- | --- | --- | --- |
| Vidrio contra legibilidad | HIG: «Retain the window's glass background» ([Windows](https://developer.apple.com/design/human-interface-guidelines/windows)) | PRD y NASA: EV con alto contraste y luz extrema; xEVA pide considerar la iluminación | Vidrio en Planning y Science; material sólido en EV. Es inferencia y decide Frontend |
| Color solo para alertas contra el mapa de calor | PRD, «Reglas de diseño» | El mapa de probabilidad necesita una rampa | Rampa de luminosidad en un tono sin significado de alerta (5.1). Decide Diseño |
| Tarjeta de sitio | `viabilidad-expediciones.md`, recomendaciones 3 y 4 | DECISIONS, 2026-11-08: elegir y comparar sitios queda fuera de alcance | Solo el bloque «Which tool?» dentro del sitio (4.5) |
| Antes/después de la incertidumbre | PRD, función 10 y paso 7 | `EXPERIMENTS.md`: ≤ ~0.12 % a nivel de sitio | Antes/después local + puntos confirmados (6) |
| Densidad contra el idioma visionOS | PRD: Planning «densa y técnica» | HIG: objetivos de 60 pt, poco contenido por ventana | Densidad en tablas y números, objetivos grandes solo en EV. Es la tensión más grande del estilo elegido (inferencia) |
| Radar principal | DECISIONS: radar principal, taladro confirma | Mocks: todas las stations con `core_drill` | Preguntar a Planificador antes de diseñar la ficha |

### 7.2 Riesgos de diseño

- **Los rasters no existen** (`/maps` pending). Sin ellos, los pasos 3 y 7 no se pueden mostrar. Es el bloqueo más grande para la demo (inferencia).
- **La escala del sitio.** Todo cabe en ~220 m alrededor del hábitat. El vuelo desde el globo termina a 1.5 km de altura (`siteFocus`), y a esa altura las stations quedan apiladas. Hace falta un segundo nivel de zoom de unos 400-600 m de ancho (inferencia).
- **El globo no se vio en la captura.** Se capturó `/` en Chromium headless a 1440×900 y a 1024×768: se ven las ventanas sobre un fondo liso, sin escena de Cesium, probablemente por WebGL en headless. La composición escena + ventana no se pudo verificar visualmente.
- **Mucho texto en la ficha.** Hipótesis, tareas y justificaciones pueden convertir la ventana en un documento largo. Los NASA HSI piden mostrar por defecto solo lo necesario para la tarea (documentado, CLDP HSI 2024). Lo secundario va plegado (inferencia).

### 7.3 Lo que no se pudo verificar

- El PDF de la misión SUITS FY24 devolvió 404, y no se encontró el de 2025-2026. Lo que se cita de SUITS sale de resúmenes del buscador y del PRD.
- Las cuff checklists de Apollo: solo se vio el índice del ALSJ. El formato «2+02 Station 2» viene de un fragmento del buscador.
- La tabla 10.3-1 (tipos de alerta y su anuncio) y la tabla 10.4-2 de NASA-STD-3001 son imágenes. Los colores oficiales por nivel no se leyeron, y el color de advisory sigue siendo supuesto (DECISIONS).
- El estudio de MacEachren 2012 sobre variables visuales: solo un resumen de clase.
- Parasuraman y Manzey 2010: solo el resumen de PubMed.
- La API de Cesium para desplazar el foco (`xOffset`) no se probó.
- Caltopo, Gaia, ArcGIS Field Maps y ForeFlight se consideraron como referencias de patrón (ruta + perfil + combustible y reserva). Solo se vio la descripción de ForeFlight en su sitio, que tiene un formulario de vuelo con «reserve fuel» y un resumen que se actualiza al cambiar valores, y una vista de perfil del terreno (no verificado como práctica de diseño; fuente comercial) ([ForeFlight Performance](https://foreflight.com/performance)).

### 7.4 Preguntas para el equipo

| Pregunta | Recomendación | Quién decide |
| --- | --- | --- |
| ¿La ventana de Planning se ancla a la izquierda y la cámara centra el sitio en el área libre? | Sí, con modo Map focus | Frontend |
| ¿Se suma una barra de estado arriba, igual en las tres vistas? | Sí | Frontend + Producto |
| ¿Mapa por defecto con VSUP (potencial con supresión por incertidumbre), en un tono sin significado de alerta? | Sí; probar índigo o violeta contra el ocre de HiRISE | Diseño + GP |
| ¿El antes/después de la demo pasa a ser local (~200 m) + puntos confirmados? | Sí | Luqui + GP |
| ¿Se agrega `tool_assessment` al contrato del plan, o un endpoint aparte? | Endpoint o bloque aditivo, sin tocar `/replan` | Planificador + GP |
| ¿Quién sirve los rasters de `/maps`, y cuándo? | Antes del congelamiento del 12/11 | GP + Planificador |
| ¿EV usa paneles sólidos aunque el estilo sea visionOS? | Sí | Frontend |
| ¿El radar aparece como herramienta de stations o solo en la ruta? | Coherente con DECISIONS: en la ruta y en el bloque «Which tool?» | Planificador |
| ¿Qué umbrales de margen disparan caution y warning? | Declararlos como supuestos en la STM | Planificador + Producto |

## Fuentes

**NASA y operaciones**

- NASA-STD-3001 Vol. 2, cap. 10, Crew Interfaces (vigente): https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/
- NASA-STD-3001 Vol. 2 (2011, histórico; glosario de alertas, sec. 10.7.2): https://standards.nasa.gov/sites/default/files/standards/NASA/B/0/Historical/nasa-std-3001_vol_2.pdf
- Holden, CLDP HSI Workshop, Crew Interfaces (2024): https://ntrs.nasa.gov/api/citations/20240003566/downloads/CLD%20HSI%20Workshop%20Crew%20Interfaces.pdf
- Exploration EVA System Concept of Operations, EVA-EXP-0042 Rev. B (2020): https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf
- Mitra et al., Joint AR, ICES-2023-298: https://ntrs.nasa.gov/api/citations/20230010234/downloads/Trades_ICES_2023_07_updated_software_name.pdf
- Joint AR ConOps Rev. A (2023), visto solo en el buscador: https://ntrs.nasa.gov/api/citations/20230016622/downloads/JointAR_ConOps_RevA_2023-11-14_Final_Signed.pdf
- Zheng, Shelat y Marquez, Playbook, SpaceCHI 2023: https://ntrs.nasa.gov/api/citations/20230008619/downloads/Spacechi2023v5.pdf
- Marquez et al. 2019, Future Needs for Science-Driven Geospatial and Temporal EVA Planning and Execution (BASALT): https://pmc.ncbi.nlm.nih.gov/articles/PMC6442304/ (texto completo leído vía https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6442304/fullTextXML)
- Stevens et al. 2019, BASALT, decisiones tácticas, leaderboard y bingo times: https://pmc.ncbi.nlm.nih.gov/articles/PMC6442282/
- Beaton et al. 2019, BASALT, ConOps, roles y latencia: https://pmc.ncbi.nlm.nih.gov/articles/PMC6442238/
- BASALT, planificación con STM: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6442241/
- Kagey 2024, EVA Ops 101 for Artemis 3 External Teams: https://ntrs.nasa.gov/api/citations/20240005248/downloads/EVA%20Ops%20101%20for%20Artemis%203%20External%20Teams.pdf
- Broddrick et al., LPSC 2024 (SER y optimización con STM): https://ntrs.nasa.gov/api/citations/20240000165/downloads/Broddrick_LPSC_24_abstract.pdf
- NASA SUITS FY24 Mission Description (404 al abrir; solo resumen): https://nasa.gov/wp-content/uploads/2023/09/fy24-suits-mission-description.pdf
- ALSJ, índice de checklists de superficie de Apollo: https://www.nasa.gov/wp-content/uploads/static/history/alsj/surcl.html
- Bresina et al., traverse planner en xGDS (solo resumen): https://ntrs.nasa.gov/citations/20170010241
- Norheim, SEXTANT (tesis MIT, solo resumen): https://dspace.mit.edu/handle/1721.1/119309

**Interfaces y visualización**

- Apple HIG, Ornaments: https://developer.apple.com/design/human-interface-guidelines/ornaments
- Apple HIG, Windows: https://developer.apple.com/design/human-interface-guidelines/windows
- Apple HIG, Spatial layout: https://developer.apple.com/design/human-interface-guidelines/spatial-layout
- Apple HIG, Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Apple HIG, Sidebars: https://developer.apple.com/design/human-interface-guidelines/sidebars
- Apple HIG, Toolbars: https://developer.apple.com/design/human-interface-guidelines/toolbars
- Apple HIG, Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple HIG, Color: https://developer.apple.com/design/human-interface-guidelines/color
- Apple HIG, Maps: https://developer.apple.com/design/human-interface-guidelines/maps
- Apple HIG, Charting data: https://developer.apple.com/design/human-interface-guidelines/charting-data
- Bensch et al., Navigational HUD Interfaces for the Moon, CHI 2024: https://arxiv.org/pdf/2402.15692
- Correll, Moritz y Heer, Value-Suppressing Uncertainty Palettes, CHI 2018: https://www.tableau.com/sites/default/files/2023-01/2018-UncertaintyPalettes-CHI.pdf
- Padilla, Kay y Hullman, Uncertainty Visualization (2020, borrador): https://moodle2.units.it/pluginfile.php/466375/mod_resource/content/0/Uncertainty_Visualization_Padilla_Kay_Hullman_2020.pdf
- MacEachren et al. 2012, Visual Semiotics & Uncertainty Visualization: https://geography.wisc.edu/cartography/projects/publications/MacEachrenEtAl_2012_TVCG.pdf (resumen usado: https://users.cs.utah.edu/~miriah/uncertainty/vis-semiotics.pdf)
- Parasuraman y Manzey 2010, Complacency and Bias in Human Use of Automation (solo resumen): https://pubmed.ncbi.nlm.nih.gov/21077562/
- ForeFlight Performance (fuente comercial): https://foreflight.com/performance

**Del repo**

`docs/PRD.md`, `docs/DECISIONS.md`, `docs/EXPERIMENTS.md`, `docs/OPEN_QUESTIONS.md`, `docs/research/viabilidad-expediciones.md`, `docs/research/decisiones-nasa.md`, `docs/research/visionos-reference.md`, `packages/contracts/schemas/*.json`, `apps/web/mock/*.json`, `apps/planner/app/main.py`, `apps/web/components/planning/*.tsx`.
