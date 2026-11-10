# Plan de diseño de la web: «mission table»

**Dueño:** Frontend (Eitan). **Código:** `apps/web/`. **Estado:** especificación del 2026-11-10; reemplaza la composición inmersiva del 9/11 (fondo generado + una ventana a la derecha), que Eitan no aprobó. Investigación de base: `../research/diseno-interfaz.md` y `../research/diseno-inmersivo-y-motion.md`.

## Por qué no funciona la composición del 9/11

Diagnóstico sobre capturas a 1440×900 (2026-11-10):

1. **El fondo es una imagen generada** y las estaciones están dibujadas al lado de un cráter. En el plan real (`apps/web/mock/plan.json`) las 6 estaciones están en una grilla de 100 m, en una caja de 300×100 m, a 2.2 km al sur del cráter. La pantalla muestra una geografía falsa en un proyecto que compite por uso de ciencia.
2. **En reposo no hay información**: 6 puntos y un número (walkback). Duración, distancia, P(hielo), herramienta, timeline y decisiones están a dos clics, detrás de una ventana y un disclosure. El PRD pide «números reales visibles» para usuarios técnicos.
3. **El vidrio se ve como barro**: sobre un fondo ocre uniforme y claro no hay nada que refractar, el texto secundario pierde contraste y todo queda en el mismo tono.
4. **El tiempo no está en pantalla.** La timeline es una ventana aparte, y la investigación (BASALT, Playbook) dice que mapa y tiempo integrados es lo que permite re-planificar.
5. **Las capas no hacen nada** y los marcadores no dicen nada (ni P(hielo), ni estado, ni cuál es el hábitat).

## La idea

Sigue siendo inmersivo (la escena ocupa toda la pantalla y las ventanas flotan), pero la escena es **el sitio real** y la pantalla en reposo ya **cuenta el plan**: dónde, cuánto tiempo, con qué margen.

- **Escena = ortoimagen HiRISE real de S1094b**, vista cenital, norte arriba, georreferenciada con `packages/contracts/grid.json`. Estaciones, ruta, hábitat, grilla y escala en metros verdaderos. La imagen es gris (banda RED): se oscurece y eso le da al vidrio un fondo sobre el que funciona, y deja el color libre para las alertas.
- **Columna vertebral = timeline siempre visible** abajo, sincronizada con el mapa.
- **Una sola ventana contextual** a la derecha con los números del plan a la vista, sin disclosures para lo principal.
- **Monocromo + alertas.** Ruta y estaciones en blanco. El único color es advisory / caution / warning (regla del PRD).

## Escena del sitio

### Imágenes (reales, con fuente)

Fuente: copia COG de USGS (CC0) de los ortos HiRISE, en `https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_073578_2155_ESP_073077_2155/`. Crédito visible en pantalla: «HiRISE ESP_073578_2155 · NASA/JPL-Caltech/UArizona». Probado el 2026-11-10: `rasterio` lee ventanas por `/vsicurl/` sin bajar el archivo entero (ver `EXPERIMENTS.md`).

| Asset | Origen | Caja en metros de la grilla (x, y) | Resolución | Tamaño aprox. |
| --- | --- | --- | --- | --- |
| `public/site/s1094b-overview.webp` | `ESP_073578_2155_RED_C_01_ORTHO.tif` (1.06 m/px) | x −1500…2100, y −3300…900 | 1.5 m/px → 2400×2800 | < 900 kB |
| `public/site/s1094b-detail.webp` | `ESP_073578_2155_RED_A_01_ORTHO.tif` (0.27 m/px) | x −100…800, y −2650…−1900 | 0.25 m/px → 3600×3000 | < 1.8 MB |
| `public/site/s1094b.json` | — | cajas, m/px, producto, crédito, fecha de generación | — | — |

- Los ortos están en equirectangular con `lat_ts=0` y `R=3396190`; la grilla usa `lat_ts=35.1105` y `R=3389574.349`. **Hay que reproyectar a la grilla** (no alcanza con recortar: el píxel queda estirado ~22 % en x).
- Estirado de contraste por percentiles 0.5–99.5 sobre píxeles válidos; nodata transparente o negro.
- **Criterio de aceptación de registro:** el cráter de impacto tiene que quedar en (0, 0) de la grilla con error ≤ 20 m (`grid.json` declara ~15 m). Si no, no se sigue: se informa.
- Script reproducible: `apps/web/scripts/build-site-imagery.py`, con `uv run --with rasterio --with pillow --with numpy`. Los `.webp` se versionan (son chicos); los `.tif` nunca.

### Componente `SiteScene`

`apps/web/components/site/site-scene.tsx`, sin dependencias nuevas (DOM + SVG + transformaciones CSS).

- **Mundo en metros de la grilla.** Un contenedor con `transform: translate() scale()`; adentro, las dos imágenes posicionadas por su caja y un SVG para vectores. Convertidor puro en `apps/web/lib/grid.ts` (`lonLatToGrid`, `gridToLonLat`, a partir de `grid.json`), con test contra los pares `position` / `lonlat` de las 6 estaciones del mock (tolerancia 1 m).
- **Cámara.** Estado `{ cx, cy, pxPerM }`. Arrastre para mover, rueda y pinch para zoom hacia el cursor, teclas `+` `−` y flechas, doble clic acerca. Límites: 0.15–6 px/m y sin salir de la caja del overview. La imagen de detalle se muestra a partir de 1.2 px/m, con fundido.
- **Encuadre inicial y `fit(ids)`**: caja de las estaciones + hábitat con 25 % de margen, **centrada en el área libre** (viewport menos la ventana derecha y la timeline), no en el centro de la pantalla. Transición de cámara de 600 ms, sin transición con Reduce Motion.
- **Tratamiento de la imagen:** `filter: brightness(0.5) contrast(1.15)`, una capa `multiply` de `rgb(168 132 112)` al 55 % (tinte cálido sutil, sigue siendo casi gris) y un viñeteado radial hasta 45 % de negro en los bordes. Estos valores son el punto de partida; se ajustan mirando capturas hasta que el texto secundario del vidrio pase 4.5:1.
- El cursor es `grab` / `grabbing` sobre el mapa y `pointer` sobre objetos.

### Qué se dibuja (todo dato real o geometría pura)

| Elemento | Dato | Dibujo |
| --- | --- | --- |
| Ruta | `plan.route` (GeoJSON) | Línea blanca 2 px al 90 % con borde oscuro de 4 px al 40 %; chevrones de dirección cada ~80 px |
| Estación | `stations[]` | Círculo de 36 px, relleno negro al 45 %, borde blanco 1 px al 60 %, número de orden (15 px, semibold). **Arco de 3 px alrededor = `p_ice`** (0–100 % desde las 12, sentido horario) |
| Estación en hover | — | Etiqueta debajo: `E03S22 · 65 %` |
| Estación seleccionada | — | Relleno blanco, número oscuro, escala 1.15, y círculo punteado de 100 m de radio con la etiqueta «Model range 100 m» |
| Hábitat | `config/eva.yaml` → (300, −2200); hoy coincide con la estación 1 | Cuadrado redondeado de 28 px con «HAB»; si coincide con una estación, va desplazado arriba a la izquierda con una línea guía |
| Anillos de distancia | geometría | Círculos finos (1 px, blanco al 18 %) cada 100 m desde el hábitat, con su etiqueta en metros. Capa «Range rings» |
| Grilla de estaciones | `station_grid_cell_size_m: 100` | Líneas de 1 px, blanco al 10 %. Capa «Grid» |
| Cráter | (0, 0) | Marca y etiqueta «S1094b impact · 2021» cuando entra en cuadro |
| Escala y norte | cámara | Barra de escala que se ajusta a 50 / 100 / 250 / 500 m / 1 km, flecha N, y coordenadas del cursor (`x 312 m · y −2204 m`) |
| Re-plan | `diffPlans` | Ruta anterior punteada al 40 %; estaciones que salen: huecas, con «Dropped»; las que entran: con «Added». Siempre con texto, nunca solo con forma |

El radio de 100 m es el alcance espacial del prior ajustado del GP (`plans/planner.md`, «Interfaz del GP»). Va como constante con comentario de fuente; cuando el backend lo exponga, se lee de ahí.

**Lo que no se dibuja:** mapa de calor de potencial o incertidumbre. `/maps` responde `pending` (cuestión 52) y no se inventa un raster. La capa «Ice potential» existe en el control, deshabilitada, con el texto «Awaiting /maps». `SiteScene` acepta un prop opcional `raster: { url, bounds, legend }` para enchufarlo cuando exista.

## Composición (1440×900)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ IceWalk                 ┌ PET 0:00 │ Walkback min 33 min │ Bingo E03S22 0:52 │ ⓘ Advisory ┐ │
│ S1094b · 35.11°N 189.83°E└──────────────────────────────────────────────────────────────┘ │
│                                                          ┌ EVA 1 ───────────────────────┐ │
│ ┌──┐                                                     │ Survey shallow ice · STM ≤ 3 m │ │
│ │PL│          (orto HiRISE real, oscurecido)             │ 5 h 51 / 8 h   0.74 km        │ │
│ │EV│                 ①─②                                  │ 33 min margin  0.16 mSv       │ │
│ │SC│               ⑥─⑤─④─③   HAB                         │ ─────────────────────────────  │ │
│ └──┘                                                     │ 1 E03S22  65 %  40 min  Drill │ │
│                                                          │ 2 E04S22  67 %  40 min  Drill │ │
│ ┌ Imagery · Grid · Rings · Ice potential (awaiting) ┐    │ … 6 filas                     │ │
│ └───────────────────────────────────────────────────┘    │ ▸ Which tool? ▸ Equipment …   │ │
│                                          N↑ ▁▁ 100 m     └───────────────────────────────┘ │
│ ┌ egress │ 1 │→│ 2 │→│ 3      │→│ 4 │→│ 5 │→│ 6 │→│ ingress │ reserve ░░░░ ┐ HiRISE credit │
│ └ 0:00      1:00      2:00   ▲bingo  3:00      4:00      5:00   5:51     8:00┘              │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

| Zona | Posición | Contenido |
| --- | --- | --- |
| Identidad | arriba izquierda | «IceWalk», sitio y coordenadas reales |
| Estado de misión | arriba, centrado, una cápsula de vidrio | PET, margen mínimo de regreso, próximo bingo (`decision_points[].decide_by_min`), alerta de mayor nivel con icono + nombre del nivel + texto. Igual en las tres vistas |
| Tab bar | izquierda, vertical | Planning / EV / Science (la del kit, como hoy) |
| Ventana contextual | derecha, 400 px, de 96 px a 140 px del borde inferior | Ver abajo |
| Capas | abajo izquierda, sobre la timeline | Imagery (siempre), Grid, Range rings, Ice potential (deshabilitada) |
| Timeline | abajo, ancho completo menos márgenes, 96 px de alto | Ver abajo |
| Escala, norte, crédito | sobre la timeline, a la derecha del mapa libre | — |

### Ventana contextual: «Brief» (por defecto)

Sin disclosures para lo principal. De arriba hacia abajo:

1. Título `EVA 1` y una línea: objetivo de la STM y umbral (`summary.ice_threshold_m`).
2. Cuatro métricas en grilla 2×2, número grande + unidad + etiqueta: `Duration 5 h 51 min` con el límite al lado si la STM lo trae, `Traverse 0.74 km`, `Min walkback 33 min`, `Dose 0.16 mSv`.
3. Lista de estaciones, una fila por estación: número, id, `P(ice ≤ 3 m)` en %, duración, herramienta principal por nombre del catálogo. Hover y selección sincronizados con el mapa y la timeline.
4. Disclosures solo para lo secundario: `Which tool?`, `Decision points`, `Equipment & mass`, `Model & assumptions` (acá va `craters_in_model`, el origen de los datos y `is_mock`).

### Ventana contextual: ficha de estación (al seleccionar)

Navegación con «Back» al Brief dentro de la misma ventana (mismo tamaño y lugar). Orden: número + id + herramienta y tiempo; `P(ice ≤ 3 m)` con su frecuencia («~2 in 3»); profundidad mediana y caso somero frente al alcance de la herramienta; tareas EV1 / EV2 en dos columnas; hipótesis; punto de decisión con bingo, opciones ordenadas y opción por defecto; protección planetaria si aplica; acción `Log measurement`.

### Timeline

- Bloques proporcionales al tiempo, de `timeline[]`: `egress`, `traverse` (angostos, con flecha), `station` (con su número), `ingress`, `reserve` (rayado). Eje con horas.
- Marcas verticales de bingo (`decide_by_min`) con etiqueta.
- Encima de los bloques, una línea fina con el `walkback_margin_min` de cada ítem (sparkline) y su valor mínimo rotulado.
- Línea de «now» solo en EV y Science (en Planning no hay ejecución).
- Hover en un bloque resalta la estación en el mapa y en la lista; clic la selecciona y encuadra. Navegable con teclado (flechas entre bloques, Enter selecciona).
- En un re-plan, la timeline anterior queda como una franja fina y atenuada debajo de la nueva.

## EV y Science (segunda etapa)

- **EV:** la misma escena, **inclinada y orientada al rumbo** (plano del mapa con `perspective` + `rotateX(58deg)` y rotación al azimut del tramo), con bruma hacia el horizonte. Es el orto real, no una imagen generada. Arriba, tres bloques: próxima estación (id, herramienta, rumbo, distancia), alerta si hay, margen y bingo. Abajo a la derecha, al llegar: pasos del rol y registro de la medición (tres botones grandes + profundidad). Abajo a la izquierda, minimapa cenital. Los consumibles del traje no existen en el contrato: no se muestran hasta que existan.
- **Science:** escena cenital con el diff del re-plan en el mapa; ventana con registro de mediciones y opciones ordenadas con justificación.
- Se borran `apps/web/public/demo/mars-surface*.png` cuando EV deje de usarlas.

## Reglas

- La UI no inventa umbrales ni valores. Lo que no está en el contrato o en un endpoint no se muestra, o se muestra como faltante («Awaiting /maps»). `design-session.ts` se reduce a lo que quede sin fuente y cada uso lleva la etiqueta visible «Illustrative».
- Inglés y terminología NASA. Unidades junto a cada número. Números tabulares.
- Color solo para alertas, siempre con icono y texto.
- Materiales del kit sin transformar ancestros del vidrio (restricción de `mix-blend-mode`); el mapa se transforma libremente porque no contiene vidrio.
- Reduce Motion: sin transiciones de cámara ni de selección.
- Verificación visual obligatoria con capturas a 1440×900, 1024×768 y 390×844 antes de dar algo por hecho.

## Etapas

| Etapa | Qué | Archivos | Depende de |
| --- | --- | --- | --- |
| 1 | Imágenes reales, `lib/grid.ts`, `SiteScene` y ruta de prueba `/site` | `apps/web/scripts/`, `public/site/`, `lib/grid*`, `components/site/`, `app/site/` | — |
| 2 | Composición de Planning: estado, ventana Brief/ficha, timeline, capas | `components/planning/` | Etapa 1 y la capa de datos (`usePlanSession`) |
| 3 | EV inclinada y Science con diff en el mapa; borrar las imágenes generadas | `components/planning/` | Etapa 2 |
| 4 | Entrada desde el globo (vuelo de Cesium al sitio y fundido a `SiteScene`) | `components/globe/`, `app/page.tsx` | Etapa 2 |
