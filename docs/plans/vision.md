# Plan de visión: documento de traspaso

**Para:** Guido, dueño de visión desde el 2026-11-11.
**Rama sugerida:** `model/vision-bloques`, desde `main`. **Código:** `packages/model/vision/`.
**Actualizado:** 2026-11-11, con el recorte para el hackatón (14-15 nov).

## Para el hackatón: qué hacer y en qué orden

**Empezá por acá.** El resto del documento es contexto y referencia.

### Por qué cambia la prioridad

- El GP ya tiene los 349 cráteres de Dundas 2023 (fondos planos y cotas) y validó que, a escala del sitio, ni los vecinos ni ninguna variable del terreno predicen la profundidad del hielo (`docs/EXPERIMENTS.md`, 2026-11-08). Mapear más cráteres aporta poco: **el paso 5b deja de ser prioridad máxima**.
- Lo que más suma ahora es la **transitabilidad real** y las **rocas reales para la vista 3D**. El planificador ya lee `data/processed/s1094b/clear_path_width_m.tif` si existe (`apps/planner/app/traverse/route.py`) y prohíbe las celdas sin un pasillo de al menos 1.02 m (`apps/planner/config/traverse.yaml`). Si entregás esa capa, las rutas cambian sin tocar código del planificador.
- Hoy el sitio no tiene ni un bloque real: todo lo de bloques es mock. Entregar el catálogo real es el hito que falta (era el del 8 nov).

### Dónde y con qué imagen

- **Zona:** la de la EVA. Hábitat en (300, −2200) m de la grilla, ±1.5 km: **x de −1200 a 1800 m, y de −3700 a −700 m** (es la ventana del mapa; `apps/planner/config/eva.yaml`). Coordenadas en metros de `packages/contracts/grid.json`, siempre con `vision.grid`.
- **Imagen:** ESP_073578 (orto de 25 cm, abril 2022, incidencia 67.7°: 2.44 m de sombra por metro de alto). Es la mejor para sombras.
- Para la vara de Tusberti, además, ESP_073077 (feb 2022, también orto) sobre su km². Ubicar ese km² en el póster (ver "Vara de validación").
- El sitio entero, solo si sobra tiempo.

### Tareas

| # | Tarea | Entregable | Para | Listo cuando |
| --- | --- | --- | --- | --- |
| 1 | Entorno | `uv sync --extra dev --extra vision` en `packages/model`, imágenes bajadas (ver "Comandos") | 11/11 | `uv run pytest -q` pasa y `rasterio` abre la orto |
| 2 | Verdad de terreno (paso 2, recortado) | ≥ 150 bloques en QGIS, en 2 recortes de ~250 × 250 m: uno dentro de la zona de la EVA y otro en la eyecta cercana. Un tercer recorte aparte, para ajustar. Si hay una segunda persona, que anote uno de los dos para medir el desacuerdo | 12/11, mediodía | Etiquetas guardadas fuera de Git (`data/raw/vision/labels/`). **El test no se toca al ajustar** |
| 3 | `boulders.py` (paso 3) | Detector de sombras con tests sobre escena sintética | 12/11, noche | F1 ≥ 0.70 para diámetro ≥ 2 m en el test |
| 4 | Capas reales (paso 4) | `boulders.geojson` real (`is_mock: false`, según `boulders.schema.json`) y las capas de bloques con `rasterize_catalog`, en `data/processed/s1094b/` | 13/11 | El catálogo valida contra el esquema (comando en "Comandos") y `validate.py` sigue pasando; `/plan` corre con la capa (`uses_corridor` en true) y las rutas siguen siendo válidas |
| 5 | Vara de Tusberti | Detector sobre ESP_073077 en su km²: conteo y tamaños sobre 1.8 m | 13/11 | Resultado en `docs/EXPERIMENTS.md`, **aunque dé mal**. Si da bien, es un número para el pitch |
| 6 | Entrega | Capas y catálogo en un zip a GitHub Releases; PR con código, tests y docs; aviso a Planificador y Frontend | 13/11, noche | PR abierto con CI en verde |

**Durante el hackatón, si lo anterior está:** persistencia con ESP_077719, alineando por zona (segunda mitad del paso 4); hielo expuesto con color (paso 7) contra el área de Tusberti; el sitio entero.

**Fuera del hackatón** (no empezar sin hablarlo con Luqui): BoulderNet (paso 5), salvo que el detector de sombras ya esté entregado y alguien tenga el servidor con GPU libre; cráteres (paso 5b); zonas y formas del terreno (paso 6); anomalías.

### Antes de arrancar: tres trampas

1. **Las capas falsas pisan las reales.** `python -m vision.mock_layers` escribe por defecto en `data/processed/s1094b/`, la misma carpeta que lee el planificador. Hoy el planificador usa `clear_path_width_m.tif` aunque sea mock (cuestión 62). Para probar, usá `--out data/processed/s1094b-mock`, y borrá las falsas de `s1094b/` antes de generar las reales.
2. **`0` no es "libre".** En las capas de bloques, `0` es "nada detectado sobre `detection_limit_m`", y `nodata` es desconocido (fuera de la imagen). El planificador no prohíbe celdas sin dato.
3. **Un corrimiento único no alcanza entre fechas.** Ver la tabla de alineación: entre imágenes sin orto el error (~4 m) supera a muchos bloques.

### Reglas del repo que aplican

- Toda capa nueva va a `data/layers.yaml` con fuente; toda fuente, a `docs/SOURCES.md` (créditos HiRISE: NASA/JPL-Caltech/UArizona).
- Datos pesados nunca a Git: GitHub Releases.
- Todo lo que se pruebe va a `docs/EXPERIMENTS.md`, incluido lo que falla; las decisiones, a `docs/DECISIONS.md`; el día, a `docs/log/AAAA-MM-DD.md`.
- Sin Ultralytics YOLO (AGPL-3.0). Pesos de terceros con `torch.load(weights_only=True)`.
- Cambiar `boulders.schema.json` es un solo PR con esquema, ejemplos, mocks y usos.
- No tocar `apps/planner/` ni `apps/web/`: si algo de ellos hace falta, se pide.

### Preguntas abiertas de visión

12 (polígonos de Tusberti), 14 y 37 (imágenes posteriores a feb 2023), 18 (escarcha en dic 2022), 61 (cómo llega el catálogo a la web) y 62 (capas mock en el planificador), en `docs/OPEN_QUESTIONS.md`.

## Qué hace este módulo

Visión responde dos preguntas: **¿por dónde se puede caminar?** y **¿qué hay en el terreno?**. No calcula la probabilidad de hielo: eso lo hace el GP, que recibe de visión las formas del terreno y las zonas. La factibilidad del recorrido la decide el planificador.

Corre **antes de la EVA, sobre imágenes orbitales de HiRISE**, y se precalcula una vez por sitio. No corre en vivo ni usa video del astronauta.

```
Fotos HiRISE -> coregister -> boulders -> rasterize -> capas de costo -> Planificador
                           |-> landforms --------------> evidencia -> GP
                           |-> units ------------------> evidencia -> GP y cobertura del plan
                           |-> ice (solo franja de color) -> puntos confirmados -> GP
```

## Salidas

Capas sobre `packages/contracts/grid.json` (10 m, COG float32) y catálogo `boulders.geojson`, según `packages/contracts/schemas/boulders.schema.json`. Hoy se generan **falsas** con `python -m vision.mock_layers`.

| Capa | Rol | Prioridad |
| --- | --- | --- |
| `clear_path_width_m` | cost | MVP |
| `boulder_max_diam_m`, `boulder_max_height_m`, `cfa_detected`, `boulder_density` | cost | MVP |
| `boulder_unresolved_density` | cost | MVP |
| `ejecta_zone` | cost | MVP |
| `surface_unit` | evidence | MVP |
| Catálogo de cráteres con `resistant_layer_depth_m` o cota inferior | evidence | Baja desde el 11/11: el GP ya usa los 349 de Dundas 2023 |
| `periglacial_landform_score` | evidence | Alta |
| `ice_exposure_fraction` | evidence | Media |
| `visual_anomaly_score` | visual | Opcional |

**Cómo leerlas:**
- En las capas de bloques, `0` significa "nada detectado sobre `detection_limit_m`", nunca "terreno libre". La interfaz dice "none detected ≥ X m", no "clear".
- `nodata` es desconocido: fuera de la huella o, en hielo, fuera de la franja de color.

## Decisiones ya tomadas

| Decisión | Motivo |
| --- | --- |
| Solo orbital | Hay datos reales; no hay imágenes de astronautas en Marte |
| Regla del pasillo: una celda se prohíbe solo si no queda un pasillo que la cruce | No hay fuente de NASA ni revisada por pares sobre qué tamaño de roca sortea un astronauta. Un bloque de 3 m deja ~7 m libres en 10 m |
| Visión mide, el planificador decide | El ancho mínimo es un supuesto suyo (punto de partida: 1.02 m del hatch de ICES-2025-294, más margen) |
| Catálogo separado en `composition`, `form`, `persistence`, `confidence`, `evidence` | `rock/ice/transient` mezclaba composición, tiempo y peligro |
| `ice_candidate` exige color | El brillo solo no es diagnóstico (Wójcicka et al. 2025) |
| Ausente en la última imagen no es "desapareció" | El hielo puede quedar cubierto por un residuo (Dundas et al. 2025): va como `not_visible_latest`, y decide el planificador |
| Detector de sombras primero, BoulderNet en paralelo | Queda el mejor en un test congelado. Empate: sombras, porque es explicable y da altura |
| Anomalías opcional | No hay contra qué validarlas |
| Sin Ultralytics YOLO | AGPL-3.0 frente a un repo Apache 2.0 |

## Lo que se verificó con datos reales

- `rasterio` abre los JP2 en Windows.
- **Centro de la grilla:** el cráter está en 35.1105°N, 189.8273°E, a ~1.8 km del centro anterior. Medido a ojo sobre `ESP_073578_2155`, con error de ~15 m. Conviene refinarlo.
- **Radio:** HiRISE usa 3389574.35 m. La grilla ya está corregida. MOLA-HRSC usa 3396190 m: reproyectar siempre.
- **Extensión:** la caja mide 6.56 × 11.63 km. La huella real está rotada y tiene ~5.4 km de ancho.
- **Líneas negras:** hay líneas finas de valor 0 que cruzan la imagen y engañan a filtros de contraste. Excluirlas con `imagery.valid_mask`.
- **Bits:** los ortos son de 8 bits y los RDR RED, de 16. Normalizar antes de comparar.
- **2024 no cubre el cráter:** ESP_083099 tiene una franja sin datos justo ahí, también en color. La imagen más reciente que encontramos con el cráter cubierto es ESP_077719 (feb 2023). Vale revisar el archivo de HiRISE por otras más nuevas.

| Imagen | Fecha | Incidencia | Sombra por metro de alto | Sol desde el norte | Escala | Orto |
| --- | --- | --- | --- | --- | --- | --- |
| ESP_073077 | 27 feb 2022 | 63.4° | 2.00 m | 248.3° | 25 cm | Sí |
| ESP_073578 | 7 abr 2022 | 67.7° | 2.44 m | 238.5° | 25 cm | Sí |
| ESP_076677 | 5 dic 2022 | 51.6° | 1.26 m | 226.7° | 25 cm | No |
| ESP_077719 | 24 feb 2023 | 43.8° | 0.96 m | 248.0° | 25 cm | No |
| ESP_083099 | 18 abr 2024 | 74.4° | 3.57 m | 228.7° | 50 cm | No (sin datos sobre el cráter) |

**Alineación contra abril de 2022**, recorte de 1.5 km a 0.5 m/px:

| Imagen | Corrimiento | Dispersión entre recortes | Resultado |
| --- | --- | --- | --- |
| Febrero 2022 | 0.1 m | 0.20 px | Coincide: son el par estéreo del DTM |
| Diciembre 2022 | 133.8 m | 7.26 px (~3.6 m) | Bien a ojo sobre el cráter |
| Febrero 2023 | 94.0 m | 8.81 px (~4.4 m) | Bien a ojo sobre el cráter |
| Abril 2024 | 164.2 m | 17.11 px (~8.6 m) | No usar cerca del cráter |

**Importante:** un único corrimiento no alcanza para comparar bloques entre fechas, porque ~4 m supera a muchos de ellos. Hay que alinear por zona. Además, la correlación entre fechas es baja (0.35-0.37) porque cambia el sol: mirar siempre el resultado.

## Vara de validación

Tusberti et al. (INAF) mapearon a mano 1 km² de este cráter, con imágenes de febrero y diciembre de 2022. Sus fechas coinciden con ESP_073077 y ESP_076677, aunque el póster no cita los IDs:

| Dato | Febrero | Diciembre |
| --- | --- | --- |
| Bloques mapeados | 7989 | 5138 |
| Límite inferior del ajuste | 1.8 ± 0.2 m | 1.6 ± 0.3 m |
| Hielo expuesto | 12 277 ± 2165 m² | 4963 ± 642 m² |

Conviene preguntarles si comparten los polígonos: en lo publicado solo vimos totales.

## Pasos

### Hecho
- **Paso 0:** contrato, capas falsas, `grid.py`, `rasterize.py` con pasillo, CI.
- **Paso 1:** `pds.py`, `imagery.py`, `crops.py`, `coregister.py`, grilla verificada e imágenes alineadas. Salvedad: ver la tabla de alineación. El criterio de < 2 px se cumple entre febrero y abril de 2022; en las imágenes sin orto, solo a ojo y por zona.

### Paso 2. Verdad de terreno (2-3 h, a mano)
≥ 200 bloques en QGIS en 3 zonas: eyecta cercana, media y campo lejano. Más un set aparte para ajustar. Dos personas anotan la misma zona para medir su desacuerdo. **El test se etiqueta a mano y no se toca al ajustar.**

### Paso 3. `boulders.py`
Umbral de sombra por tile → componentes conexas → filtro de forma sobre el eje del sol → elipse → diámetro por ancho y altura con `pds.height_from_shadow`. Tests con escena sintética. **Listo cuando:** cumple los criterios.

### Paso 4. Capas reales de bloques
Aplicar `rasterize_catalog` sobre el catálogo real y la huella real. Clasificar persistencia con ESP_077719, alineando por zona. **Hito mínimo para el 8 nov.**

### Paso 5. BoulderNet en paralelo (en el servidor con GPU)
Pesos `model_0055999.pth` de Zenodo, sobre el mismo test. Ajuste fino con nuestras etiquetas, si hace falta. MLtools recomienda PyTorch 1.13.1: va en un entorno aislado, fuera de la API. Cargar con `torch.load(weights_only=True)`.

### Paso 5b. `craters.py`: profundidad a la tabla de hielo (fuera del hackatón)

**Nota del 11/11:** el GP ya tiene los 349 cráteres de Dundas 2023 en la grilla y la validación mostró que no predicen a escala del sitio. Queda como referencia; no empezar sin hablarlo con Luqui.
Mapear cráteres ≥ 5 m en ESP_073077: diámetro y, si tiene, diámetro del fondo plano. Con la relación de Bart (2014) y ángulo de reposo de 33°, Dundas et al. 2023 obtienen 0.97 ± 0.25 m; un error de 1 píxel cambia la profundidad en 0.15 m. Un cráter sin fondo plano da una cota inferior: 0.1-0.2 × diámetro. **Los cráteres no planos también son dato.**

Es lo que más aporta al mapa de calor: da profundidades reales y permite medir el alcance del GP. Primero a mano en una zona; automatizar solo si rinde. Falta ver si el suplemento de Dundas publica posiciones, y conviene pedirlas a los autores.

### Paso 6. `units.py` y `landforms.py`
- **Zonas:** clustering sin etiquetas sobre textura, brillo, pendiente, rugosidad, THEMIS, densidad de bloques y distancia al cráter. Son zonas de terreno, no de hielo.
- **Formas del terreno:** Dundas 2023 describe textura hummocky, cráteres expandidos, montículos y terrazas en esta zona. Indican sobre todo **pérdida pasada** de hielo, no hielo actual: detectarlas por tipo, no como un único puntaje. SWIM ya pondera geomorfología en su capa.

### Paso 7. `ice.py` (solo si queda tiempo)
Random Forest de píxeles sobre las 3 bandas de color, con polígonos dibujados a mano. Solo en la franja de ~1 km. Falta verificar si diciembre tiene escarcha. **Es hielo masivo excavado de varios metros (3.2-11 m, Wójcicka et al. 2025), no prueba de hielo a ≤ 1 m.**

### Paso 8. Cierre
`python -m vision.run --site s1094b` con manifiesto por corrida. Catálogo al frontend para ubicar rocas 3D en la vista en primera persona. Citas y licencias en `docs/SOURCES.md`.

## Criterios de aceptación

Los umbrales son nuestros, y se ajustan después de medir el desacuerdo humano.

| Qué | Métrica | Objetivo |
| --- | --- | --- |
| Bloques, nuestro test | F1 para diámetro ≥ 2 m | ≥ 0.70 |
| Bloques, vara publicada | Conteo y tamaños sobre 1.8 m, feb y dic | ± 25 % |
| Tamaños | Error de diámetro | ≤ 2 px |
| Hielo | Área expuesta, feb y dic | ± 30 % |

## Riesgos

| Riesgo | Plan |
| --- | --- |
| Bloques menores a ~1.5 m no se miden bien | Se declara el límite; "no detectado" nunca es "libre" |
| Bloques bajos o manchas sin sombra | BoulderNet y color |
| Distinta iluminación entre fechas | Normalizar y enmascarar sombras |
| Febrero de 2023 tiene el sol alto (sombra de 0.96 m por metro) | Un bloque bajo puede no detectarse: ausente no significa que no esté; va como `not_visible_latest` |
| Pesos de terceros | Fuera de Git, `weights_only=True` |

## Comandos

```bash
cd packages/model
uv sync --extra dev --extra vision      # o: pip install -e ".[dev,vision]"
uv run python -m vision.mock_layers --out ../../data/processed/s1094b-mock   # capas falsas, fuera de la carpeta del planificador
uv run ruff check . && uv run pytest -q # o, desde la raíz: bun run moon run model:lint model:test
python ../../data/download.py --only hirise_ortho_25cm hirise_feb2022_ortho_25cm hirise_dec2022_red hirise_feb2023_red
python ../contracts/validate.py         # ejemplos y mocks (no mira data/processed/)
# El catálogo real contra el contrato:
uv run python -c "import json, jsonschema; jsonschema.validate(json.load(open('../../data/processed/s1094b/boulders.geojson')), json.load(open('../contracts/schemas/boulders.schema.json')))"
```

## Fuentes

[Tusberti et al.](https://indico.ict.inaf.it/event/2923/attachments/8535/17568/Filippo_Tusberti.pdf) · [BoulderNet](https://zenodo.org/records/8171052) · [MLtools](https://github.com/astroNils/MLtools) · [MBARS](https://sfsholes.github.io/papers/abstracts/Hood2022_LPSC_MBARS.pdf) (referencia: confirmar su licencia antes de reutilizar código) · [Golombek](https://marsoweb.nas.nasa.gov/landingsites/msl/workshops/4th_workshop/talks/Golombek_Rocks_4th_Wkshp.pdf) · [ICES-2025-294](https://ntrs.nasa.gov/api/citations/20250004496/downloads/ICES2025-294-stepheight-final.pdf) · [Wójcicka et al. 2025](https://elib.dlr.de/217096/1/JGR%20Planets%20-%202025%20-%20W%C3%B3jcicka%20-%20Origins%20of%20the%20Water%20Ice%20Excavated%20by%20the%20Christmas%20Eve%20Crater%20Formation%20on%20Mars.pdf) · [Dundas et al. 2025](https://elib.dlr.de/217100/1/1-s2.0-S0019103525002362-main.pdf)
