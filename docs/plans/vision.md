# Plan de visión: documento de traspaso

**Para:** el integrante que toma visión (a definir).
**Rama:** `model/vision-contract`. **Código:** `model/vision/`.

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

Capas sobre `contracts/grid.json` (10 m, COG float32) y catálogo `boulders.geojson`, según `contracts/schemas/boulders.schema.json`. Hoy se generan **falsas** con `python -m vision.mock_layers`.

| Capa | Rol | Prioridad |
| --- | --- | --- |
| `clear_path_width_m` | cost | MVP |
| `boulder_max_diam_m`, `boulder_max_height_m`, `cfa_detected`, `boulder_density` | cost | MVP |
| `boulder_unresolved_density` | cost | MVP |
| `ejecta_zone` | cost | MVP |
| `surface_unit` | evidence | MVP |
| Catálogo de cráteres con `resistant_layer_depth_m` o cota inferior | evidence | **Máxima** (entrada directa del GP) |
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

### Paso 5b. `craters.py`: profundidad a la tabla de hielo (prioridad máxima)
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
cd model
uv sync --extra dev
uv run python -m vision.mock_layers     # capas falsas en data/processed/s1094b
uv run ruff check . && uv run pytest -q
python ../data/download.py --only hirise_ortho_25cm hirise_feb2022_ortho_25cm hirise_dec2022_red hirise_feb2023_red
```

## Fuentes

[Tusberti et al.](https://indico.ict.inaf.it/event/2923/attachments/8535/17568/Filippo_Tusberti.pdf) · [BoulderNet](https://zenodo.org/records/8171052) · [MLtools](https://github.com/astroNils/MLtools) · [MBARS](https://sfsholes.github.io/papers/abstracts/Hood2022_LPSC_MBARS.pdf) (referencia: confirmar su licencia antes de reutilizar código) · [Golombek](https://marsoweb.nas.nasa.gov/landingsites/msl/workshops/4th_workshop/talks/Golombek_Rocks_4th_Wkshp.pdf) · [ICES-2025-294](https://ntrs.nasa.gov/api/citations/20250004496/downloads/ICES2025-294-stepheight-final.pdf) · [Wójcicka et al. 2025](https://elib.dlr.de/217096/1/JGR%20Planets%20-%202025%20-%20W%C3%B3jcicka%20-%20Origins%20of%20the%20Water%20Ice%20Excavated%20by%20the%20Christmas%20Eve%20Crater%20Formation%20on%20Mars.pdf) · [Dundas et al. 2025](https://elib.dlr.de/217100/1/1-s2.0-S0019103525002362-main.pdf)
