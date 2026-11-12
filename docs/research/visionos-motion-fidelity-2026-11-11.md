# Fidelidad de movimiento de visionOS — 11 de noviembre de 2026

## Objetivo y evidencia

Eitan pidió mejorar las animaciones de todos los componentes: deformación, shaders y optimización, con la fidelidad del visionOS original como criterio. Este informe separa tres categorías: **publicado** por Apple, **observado/medido** en una grabación primaria y **adaptación web** propuesta. Un spring público o un shader propio no demuestra paridad con el compositor de visionOS.

Se revisaron los experimentos y la investigación previa antes de ampliar fuentes. La investigación del 9/11 usaba sobre todo Liquid Glass de WWDC25: sirve como referencia secundaria, pero **no demuestra el movimiento de visionOS**. La fuente vigente para este informe son sesiones que identifican explícitamente visionOS, contrastadas con clips descargados. No se trata una captura estática de Figma como referencia temporal. El coordinador comprobó que `get_motion_context` del menú `487:11347` del kit devuelve `nodes: []`: sin keyframes en ese nodo.

No hay Xcode ni Simulator instalados en esta máquina: `xcode-select -p` devuelve `/Library/Developer/CommandLineTools`. No se instaló nada. Los JSON Apple existentes en `/tmp/icewalk-motion/apple/` documentan APIs de spring, no el shader privado ni el timing de cada control. No se hizo aceptación en Apple Vision Pro.

## Referencias primarias inspeccionadas

| Fuente | Tramo y resultado útil |
| --- | --- |
| [Design for spatial user interfaces — WWDC23/10076](https://developer.apple.com/videos/play/wwdc2023/10076/) | 2:45–5:28: vidrio adaptativo, iluminación, reflejos y sombras. 19:54–20:22: menús/popovers. 20:34–21:02: sheets y retroceso de la ventana padre. |
| [Design for spatial input — WWDC23/10073](https://developer.apple.com/videos/play/wwdc2023/10073/) | Feedback hover de elementos y presión/tap; diferencia entre escala dinámica de ventanas y profundidad real. La información de mirada no se entrega a la app. |
| [Elevate your windowed app for spatial computing — WWDC23/10110](https://developer.apple.com/videos/play/wwdc2023/10110/) | 4:07: filas con highlight sutil. 4:42 y 11:34–11:36: botones se comprimen al activar. 13:31–14:54: ornamentos anclados, vidrio en cápsula. |
| [Create custom hover effects in visionOS — WWDC24/10152](https://developer.apple.com/videos/play/wwdc2024/10152/) | 5:00: escala de ejemplo 1→1.05. 5:28–7:15: expansión por clip anclado al borde leading y texto separado. 9:40–11:41: demoras y coordinación de efectos. 12:09 en adelante: alternativa Reduce Motion. |
| [Design hover interactions for visionOS — WWDC25/303](https://developer.apple.com/videos/play/wwdc2025/303/) | 2:10–2:34: tab bar, Back, slider, tooltip. 5:03–5:49: ramp. 6:00–7:48: mantener anclas, limitar movimiento y no escalar compulsivamente filas/toolbars. |
| [Animate with springs — WWDC23/10158](https://developer.apple.com/videos/play/wwdc2023/10158/) | Spring físico con posición y velocidad; continuidad al pasar del gesto al asentamiento; duración perceptual distinta de la cola de asentamiento. |
| [Animation.spring](https://developer.apple.com/documentation/swiftui/animation/spring), [Spring.update](https://developer.apple.com/documentation/swiftui/spring/update(value:velocity:target:deltatime:)) y [tracksVelocity](https://developer.apple.com/documentation/swiftui/transaction/tracksvelocity) | Contratos públicos: conservar velocidad al reemplazar springs y actualizar estado posición/velocidad con delta temporal; gesto continuo puede transferir su velocidad al spring. |
| [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | La sección visionOS describe un material de ventana `glass` del sistema no modificable; adapta el intervalo cromático al entorno. No publica una fórmula de refracción. |
| [SwiftUI distortionEffect](https://developer.apple.com/documentation/swiftui/view/distortioneffect(_:maxsampleoffset:isenabled:)) y [layerEffect](https://developer.apple.com/documentation/swiftui/view/layereffect(_:maxsampleoffset:isenabled:)) | APIs para shaders propios sobre la rasterización de una vista, con máximo desplazamiento de muestreo explícito. Su existencia no significa que los controles nativos usen ese shader ni permite recuperar el algoritmo de `glass`. |

Los enlaces de las tres últimas filas pueden servirse como JSON en `developer.apple.com/tutorials/data/documentation/...`; los JSON previos ya estaban guardados localmente. Este informe no depende de URLs temporales de Figma.

## Clips y método reproducible

Artefactos auxiliares descargados desde los enlaces **HD Video oficiales** de cada sesión, sin grabar una app de terceros:

| Archivo bajo `/tmp/icewalk-motion/fidelity-reference/` | Fuente y tiempo inicial | Duración |
| --- | --- | --- |
| `menus-popovers-sheets.mp4` | WWDC23/10076, 1180 s | 85 s |
| `tabs-back-sliders.mp4` | WWDC25/303, 128 s | 26 s |
| `ramp-environments.mp4` | WWDC25/303, 301 s | 50 s |
| `scale-feedback.mp4` | WWDC24/10152, 300 s | 20 s |

`clips.json` conserva URLs de los MP4, offsets, duraciones y salidas. Se extrajeron con `ffmpeg -ss OFFSET -i URL -t DURATION -an -c:v libx264 -crf 19 -vf scale=1280:-2`; `ffprobe` confirmó 1280×720 a 30000/1001 fps en el clip de controles. La resolución es una normalización de análisis, no puntos de visionOS. Los PNG `menus-contact`, `controls-contact`, `ramp-contact`, `tab-expansion-sequence`, `back-expansion-sequence` y `slider-sequence` fueron abiertos e inspeccionados. Los fotogramas espaciados son una guía; para tiempos se usó la secuencia completa.

Los clips de menús y sheets tienen cortes editoriales entre estados. **No permiten atribuir una duración exacta de apertura al control nativo**. Sí muestran anclaje, composición, selección y profundidad. No convertir la duración del plano en duración de la animación.

### Medición del Back, no un token inventado

En WWDC25/303, aproximadamente 2:22.27–2:23.00, el botón Back cambia de círculo a cápsula. Se midió el tramo horizontal interior a y=292 px, buscando el mayor segmento continuo RGB>140 entre x=400 y x=1000; se guardó cada cuadro en `back-width-measurements.json`. El fondo y el botón permiten separar la región; el método incluye compresión y antialiasing.

| Tiempo del video | Lado izquierdo | Ancho del segmento | Expansión normalizada |
| --- | --- | --- | --- |
| 142.235 s | 402 px | 176 px | 0 % |
| 142.268 s | 402 px | 182 px | 2 % |
| 142.301 s | 402 px | 212 px | 13 % |
| 142.401 s | 402 px | 330 px | 54 % |
| 142.568 s | 402 px | 428 px | 89 % |
| 142.735 s | 402 px | 453 px | 98 % |
| 143.002 s | 402 px | 459 px | 100 % |

Resultado observado: unos **286 ms para pasar de 10 a 90 %**, unos **570 ms desde el último cuadro quieto hasta 99 %** y cola visible hasta aproximadamente **730 ms**. Incertidumbre temporal práctica de 1–2 cuadros (~33–67 ms), más el umbral de segmentación. Es una grabación concreta con expansión de hover, no una constante universal de Apple ni el tiempo de respuesta a un clic. El chevron permanece en su ancla; el texto se revela después de comenzar el cambio geométrico. La mayor parte del desplazamiento sucede pronto y la cola se apaga suavemente: recortar toda la respuesta física a un fade de 360 ms no reproduce esa distribución temporal.

El gráfico de ramp en la misma sesión muestra aproximadamente 20 % a 0.8 s y 100 % a 1.2 s. Es una **demora de intención de hover** seguida de spring rápido; no justifica demorar un botón activado. El ejemplo de código de WWDC24/10152 usa escala 1.05 y demora 0.8 s al activar/0.2 s al desactivar el reveal, dejando el feedback inicial inmediato. Son parámetros públicos **del ejemplo custom**, no del sistema completo.

## Matriz por familia

| Familia/estado | Evidencia visionOS y forma | Trabajo web verificable | Qué sigue sin estar medido |
| --- | --- | --- | --- |
| Botón hover/press/release | WWDC23/10110: highlight de contorno compatible y compresión al tap; no efecto acuoso general | Highlight inmediato, compresión visual con spring; recuperar desde velocidad visible al soltar/cancelar. Separar pintura de texto cuando la deformación sea anisótropa | Escala y curvas privadas por estilo/tamaño |
| Tab bar hover y selección | WWDC25/303: cápsula se ensancha hacia etiquetas, iconos mantienen anclas casi fijas; aparece texto coordinado | Layout destino una vez, clip/morph de pintura; reveal agrupado; lente de selección continua e interrumpible | Cola exacta del hover y trayectoria de selección de cada variante |
| Back hover | Círculo→cápsula, leading fijo, texto coordinado. Medición anterior | Clip de ancho desde altura a ancho final, misma curva del material, texto separado; respetar hover deliberado | Latencia desde mirada real (el video no expone ese evento) |
| Slider hover/drag/release | WWDC25/303: thumb aparece en el extremo del fill; pista conserva su forma | Thumb con aparición espacial y spring, seguir pointer sin perseguirlo con retardo; transferir velocidad solo al asentamiento | Curva/tamaño exactos del thumb por estilo; no se observó onda en la pista |
| Menú/popover abierto | WWDC23/10076: centrado respecto del invocador, fuera de ventana si hace falta; invocador selected blanco/label negro, sin flecha | Origen ligado al trigger, material cambia forma, tinta a escala legible; reversión al cerrar/reabrir | Duración/curva nativa: el montaje corta la transición |
| Sheet/dialog | WWDC23/10076: modal usa Z original de la ventana; padre retrocede y se atenúa; stack repite la jerarquía | Profundidad percibida por escala/posición y atenuación de pintura, sin transformar ancestros que rompan blending; restauración continua al cerrar | Distancias Z, escala y timing privados. Fallback plano no prueba profundidad estereoscópica |
| Ventana/ornamento resize | WWDC23/10110: ornament anclado y cápsula; materiales/reflejos coherentes con forma | Contorno y radio continuos, contenido independiente; un layout por retarget, no reflow por cuadro | Shader y transición de ventanas del compositor; no hay muestra local del runtime |
| Switch/segmented/radio | El kit estático fija geometría; spring SwiftUI informa continuidad, no publica cada control | Thumb/lente conservan posición y velocidad, deformación ligada al movimiento solo donde haya referencia visual; estados estáticos accesibles | Referencia temporal visionOS de cada variante: no declarar réplica exacta |
| Rueda/pickers | Investigación previa cubría HIG Pickers y WWDC20, no una captura temporal visionOS completa | Drag continuo, velocidad de release, settle sin salto; teclado y Reduce Motion | Fling nativo de visionOS, límites y opacidad 3D de la rueda por variante |
| Tooltip/notificación/share | Tooltip aparece tras intención en WWDC25/303; profundidad/material coherentes con su contexto | Reveal y retención de salida propios, ancla visible y foco conservado | No se inspeccionó toda la familia nativa: la misma curva para todos no demuestra igualdad |

## Motor propuesto para fidelidad y rendimiento

Esta sección es una **adaptación de ingeniería**, no una descripción del código privado de Apple.

1. Conservar `x`, `v` y objetivo por propiedad. Retarget toma posición **y velocidad** actuales; el motor viejo solo interpolaba posición al reiniciar una curva con velocidad inicial cero. Para drag, samplear desplazamiento/tiempo y transferir el vector al release. Comprobar continuidad C0 y C1 con tolerancias y tests de reversión rápida.
2. Medir geometría al cambio de estado, no dentro de cada cuadro. El layout final existe una vez; pintura y máscara interpolan desde el estado visible. Corner radius en unidades físicas de la superficie, sin estirar esquinas ni glifos.
3. Deformar capas de pintura, no un ancestro que agrupe texto/materiales mezclados. La deformación debe responder al eje de movimiento y asentarse; su amplitud se calibra con clips, no con un squash arbitrario global. Para filas y toolbars frecuentes basta el highlight que Apple documenta.
4. Un scheduler rAF compartido y perezoso; escritura de propiedades agrupada, sin `setState` por cuadro. Detener al reposo, al desmontar, al perder documento visible y al activar Reduce Motion. No mantener cien bucles porque el playbook tiene cien specimens.
5. Preservar la rapidez percibida pedida antes por Eitan. Medir tiempo al 50/90 %, cola y respuesta a interrupción por separado. Una cola física pequeña puede durar más sin retrasar foco, lectura ni acción. No restaurar presets de 800–1045 ms indiscriminadamente.

## Shader óptico: alcance viable

El vidrio nativo de visionOS usa luz del entorno, contraste y reflejos. Ninguna fuente consultada publica su función óptica ni demuestra que todos los controles sufran la misma refracción líquida. Añadir ondas de agua a cada control alejaría el resultado de estas referencias.

Un shader propio puede resolver iluminación del borde/normales de una forma redondeada, reflejo especular y una refracción de borde **acotada**. Hay dos rutas web distintas:

- **CSS/SVG sobre el backdrop:** `backdrop-filter: url(#filter)` puede recibir el backdrop como entrada y una `feDisplacementMap` puede desplazar su muestreo. Debe comprobarse con píxeles en cada motor: aceptación sintáctica no prueba que se ejecute. La especificación [Filter Effects Level 2](https://drafts.csswg.org/filter-effects-2/) es un borrador; detalla buffers/backdrop roots y costes de pases anidados. No envolver toda la app en filtro/opacidad/máscara porque cambia el backdrop disponible. [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) incluye filtros SVG por URL, sin garantizar interoperabilidad de todos los primitivos.
- **WebGL/WebGPU/Canvas:** útil para un borde/luz procedural o para una textura que la app ya posee. Un canvas WebGL corriente **no puede leer los píxeles arbitrarios del DOM detrás suyo**. Dibujar solo un borde brillante no equivale a refracción del entorno. Reproducir el fondo entero en otra escena o capturarlo por cada cuadro agrega coste y complejidad; no corresponde fingir una captura gratuita.

La primera ruta exige pixel-test y perfilado; la segunda debe declarar exactamente qué textura procesa. Priorizar forma/continuidad y material correcto antes que una etiqueta “shader”. Un filtro óptico debe tener un límite de área/resolución y estar activo solo mientras aporta; fallback conserva clip/spring/material sin el filtro. No aplicar blur o displacement animado a cada hoja de tinta.

### Prototipo óptico comprobado, fuera del código de producto

Se creó `/tmp/icewalk-motion/fidelity-reference/shader-prototype.html`: fondo de rayas verticales alternadas de 10 px y una superficie transparente 320×160 px en (100,100), radio 36 px. Un SVG inline compone `feFlood` constante y `feDisplacementMap` sobre `SourceGraphic` con `backdrop-filter: url(#shift)`. El mapa constante desplaza 10 px en X. Esto es una prueba de acceso al backdrop, **no un shader físico del vidrio ni una réplica nativa**.

- **Chromium 152 headless:** se compararon capturas `shader-on.png`/`shader-off.png` con Pillow. En (205,180), RGB pasa de (16,32,64) a (224,232,240); en (215,180), se invierte. En los puntos exteriores (80,180) y (430,180) no cambia. En una ROI interior de 220×80 px, cambió el 100 % de los píxeles, delta medio absoluto por canal 194.67/255. Las capturas fueron abiertas: rayas realmente desplazadas dentro de la cápsula. Esto prueba filtrado del DOM detrás, sin una captura WebGL.
- **Safari nativo, coordinador mediante CUA:** abrió el mismo `file:///tmp/.../shader-prototype.html`. Inspección visual del patrón inequívoco: rayas continuas en toda la página, sin contorno ni desfasaje dentro del panel. El label “shader on” estaba presente, pero el efecto no se pintó. Es una comprobación visual, no una medición numérica de píxeles Safari. En este navegador hace falta fallback.
- **Consecuencia:** no usar solo `CSS.supports` como detección de ejecución. Un filtro SVG no debe eliminar el blur/material base cuando no funciona. Si la activación segura por capacidades no está resuelta, conservarlo como comparación experimental explícita y mantener el material interoperable por defecto.

Perfil local con un único panel 320×160, traslación WAAPI durante 3.3 s, 12 corridas (sin filtro/con filtro/con atributo `scale` del filtro actualizado por cuadro; CPU 1×/4×; primera/caliente). `profile-shader.ts` y `shader-profile.json` conservan el método y resultados.

| Caso | p95 rAF | Main TaskDuration acumulado, 1× / 4× (caliente) | Resultado |
| --- | --- | --- | --- |
| Sin filtro | 16.7–16.8 ms | 59 / 88 ms | Sin cuadro >33 ms |
| Filtro estático, panel en movimiento | 16.7–16.8 ms | 60 / 94 ms | Primera activación 1× tuvo un cuadro de 116.6 ms; caliente, ninguno >33 ms |
| Atributo del filtro modificado cada cuadro | 16.7–16.8 ms | 86 / 163 ms | Más trabajo principal pese al mismo p95 |

Se observaron 1–2 layouts por corrida, ningún long task JS y cero animaciones al terminar; el recálculo de estilos siguió el movimiento. CPU throttling no limita la GPU: estos números **no prueban coste de raster ni rendimiento de un normal map complejo**. La activación fría de 116.6 ms tampoco se puede descartar por un p95 bueno. Un mapa normal debe generarse/cachearse una vez, sin regenerar imágenes ni mutar atributos de filtro por cuadro.

Segunda pasada con traza CDP `devtools.timeline`, `cc` y `gpu`, 1.9 s por caso (`trace-shader.ts`, `shader-trace-summary.json` y seis trazas completas). Resultado estable del experimento:

| Caso | Paints 1× / 4× | PrePaint acumulado 4× | Paint acumulado 4× |
| --- | --- | --- | --- |
| Sin filtro | 5 / 5 | 7.46 ms | 0.069 ms |
| Filtro estático, panel en movimiento | 7 / 7 | 8.06 ms | 0.740 ms |
| Atributo del filtro modificado cada cuadro | 233 / 233 | 23.23 ms | 6.564 ms |

Hubo 1–2 layouts y tres `RasterTask` registrados por caso. Estos eventos no son una medición completa del coste del compositor/GPU. Sí demuestran que mutar el filtro cada cuadro provoca repaints que la versión estática evita. Decisión recomendada: normal map cacheado y efecto acotado como experimento opcional; el componente de producto conserva material interoperable y el shader se evalúa nuevamente con la forma y blur reales antes de ampliarlo.

## Aceptación pendiente

- Comparar secuencias a velocidad normal y a 0.1×, con el mismo estado, tamaño y fondo. Incluir press/release fuera, toggle rápido, cierre/reapertura, retarget en mitad del recorrido y drag→release.
- Medir normal y CPU 4×: primera interacción y caliente, layout/style/paint, cuadros >16.7/33 ms y presupuesto del filtro; p95 de rAF aislado no prueba GPU ni ausencia de repaints costosos.
- Confirmar reposo sin rAF/WAAPI de efectos terminados y sin capas/filtros retenidos. Verificar Reduce Motion cambiando la preferencia durante la animación y teclado/foco.
- Pixel-test óptico y QA visual en Chromium y Safari real. Los fotogramas de Apple y el kit no sustituyen el runtime nativo; no declarar igualdad exacta de todas las familias con esas ausencias.

La implementación y sus mediciones nuevas quedan separadas de esta investigación. Las mejoras de forma/spring pueden aceptarse como una unidad comprobada; la paridad nativa total requiere completar las celdas sin referencia y comparar en dispositivo.

## Apéndice: elección de librerías tras el pedido de Eitan

Eitan pidió investigar si conviene usar Motion u otras librerías para optimización y morphing. Se verificaron documentación oficial, paquetes publicados y sus tipos/código distribuidos. Las pruebas de paquete se hicieron en `/tmp/icewalk-motion/library-evaluation/`, con Bun; esta investigación no cambió dependencias del proyecto.

### Versiones y peso comprobados

Registry oficial consultado el 11/11/2026: [motion 14.12.0](https://registry.npmjs.org/motion/14.12.0), [@react-spring/web 10.1.2](https://registry.npmjs.org/@react-spring%2fweb/10.1.2), [gsap 3.15.1](https://registry.npmjs.org/gsap/3.15.1), [flubber 0.4.2](https://registry.npmjs.org/flubber/0.4.2). Motion y react-spring declaran peers React 19; Motion acepta React 18/19. No hace falta una adaptación específica de Next para el generador JS puro; el código DOM sigue dentro de los límites client existentes.

Medición local: una entrada por combinación de imports, retenidos en `window.lib`, `bun build --target browser --minify --format esm --external react --external react-dom`, gzip con Python y `mtime=0`. Las dependencias fueron instaladas solo en el directorio temporal, con scripts desactivados. No son tamaños del chunk final de Next ni el `unpackedSize` de npm. `bundle-sizes.json` y las entradas conservan el método.

| Entrada medida | Bytes minificados | Bytes gzip |
| --- | --- | --- |
| Motion, solo `spring` | 4,482 | **2,150** |
| `motion/mini`, solo `animate` | 9,222 | 3,523 |
| Mini `animate` + Motion `spring` | 13,307 | 5,353 |
| Motion `springValue`, `styleEffect`, `transformValue` | 19,805 | 7,680 |
| Motion híbrido `animate`, `motionValue`, `styleEffect` | 77,079 | 27,834 |
| Híbrido anterior + springValue/transformValue/frame/cancelFrame | 80,043 | 28,820 |
| react-spring, `SpringValue` | 37,726 | 15,098 |
| react-spring, `animated` + `useSpring` | 44,088 | 17,269 |
| GSAP core + MorphSVG, plugin registrado | 92,789 | 36,805 |
| Flubber, `interpolate` | 54,835 | 18,855 |

La página oficial de Motion anuncia mini ~3.2 kB e híbrido ~22 kB; el tamaño de esta importación concreta y esta versión se mide arriba. No usar el número publicitario de otro conjunto de imports para prometer el coste de la app.

### Decisión recomendada: Motion para la física, WAAPI para reproducir

**Usar Motion 14.12.0 y comenzar importando solo `spring` desde `motion`.** Sustituye el solver físico propio y el parche de terminación C2; conserva el wrapper de geometría que ya sabe separar pintura, máscara y contenido, y permite reproducir muestras con WAAPI sin escribir estilos desde JS en cada cuadro. La biblioteca calcula el movimiento; el código del proyecto resuelve qué geometría y qué capas se mueven. Esa separación es trabajo específico del material, no reimplementar un motor de springs.

El [generador público `spring`](https://motion.dev/docs/spring) acepta dos valores numéricos y devuelve `next(t)` con `value`/`done`, muestreable fuera de orden. Los tiempos de `next` están en **milisegundos**. La documentación avisa que el `duration` directo de este generador también está en ms, a diferencia de `animate`, mientras que `visualDuration` se expresa en segundos. Configuración física o `visualDuration` mantiene velocidad; `duration`+`bounce` fuerza fin temporal y no hereda velocidad. No volver a cortar la curva a los 280/360 ms si todavía se está asentando.

El paquete 14.12.0 distribuye tipos públicos `KeyframeGenerator` con `velocity?(t)` y `retarget?(keyframes, velocity)`; el generador spring implementa ambas. Esto se comprobó en el paquete publicado, no por una ruta privada importada. `velocity` usa unidades por **segundo**. En modo físico, `calculatedDuration` inicialmente es `null`: hay que muestrear hasta `done` con un guard finito; el propio cálculo de duración de Motion usa un guard de 20 s. La retención de la superficie debe seguir la duración real resultante y no desmontarla cuando aún mueve pintura.

Prueba local numérica (`probe-spring.ts`, `probe-spring.json`): spring con stiffness=250, damping=28, mass=1; recorrido 0→2000, retarget a −150 en t=120 ms. La nueva condición inicial conserva posición con error 0 y velocidad con error de ~1.8×10⁻¹² unidades/s. Con `restDelta=.001` y `restSpeed=.01`, recorridos de 1/100/2000 unidades terminaron con diferencia del último sample al objetivo menor a .001 unidades. Es una comprobación de la continuidad del generador, **no** la prueba del render de vidrio ni una calibración nativa de Apple.

Precauciones comprobadas en esta versión:

- `next()` reutiliza un objeto mutable. Guardar el número `.value` antes de otro sample; no guardar múltiples referencias al supuesto historial del estado.
- Para el generador directo, acompañar `visualDuration` con `bounce: 0` explícito o usar los parámetros físicos: en el código publicado, `visualDuration` solo no activa la rama temporal sin `duration` o `bounce`.
- Los defaults de reposo para trayectos grandes son .5 unidades y 2 unidades/s: conviene definir tolerancias finas para no convertir el fin del movimiento en un salto visible. No usar tolerancia cero ni damping cero sin guard.
- Pin de versión y tests de continuidad/retarget/unmount/reduced motion protegen estas APIs. El generador no administra foco, inert, Base UI, presencia ni preferencias del sistema: siguen siendo responsabilidad de los componentes.

### Alternativas y cuándo ayudan

| Opción | Contrato útil | Encaje en este kit |
| --- | --- | --- |
| Motion híbrido + MotionValues | [motionValue](https://motion.dev/docs/motion-value) mantiene estado/velocidad; [springValue](https://motion.dev/docs/spring-value) retargetea un spring con identidad persistente; [styleEffect](https://motion.dev/docs/style-effect) escribe una vez por cuadro y devuelve cleanup; [frame](https://motion.dev/docs/frame) agrupa read/update/render | Buena opción si una interacción necesita valores vivos o efectos derivados por cuadro. Reemplaza también scheduler, pero escribe styles desde JS; no mejora automáticamente una reproducción WAAPI que ya no hace trabajo JS por cuadro. No recrear el MotionValue al retarget ni llamar `jump` si se desea conservar velocidad |
| Motion mini | [animate](https://motion.dev/docs/animate) orientado a estilos DOM/SVG vía WAAPI; springs como generador importable | Sencillo para transiciones de estilos con controls/cleanup, pero no aporta por sí solo el grafo de valores, ejes transform independientes ni morph arbitrario. El wrapper actual necesita de todos modos el estado geométrico visible para interrumpir; adoptar mini además no es obligatorio para aprovechar la física |
| react-spring | [SpringValue](https://www.react-spring.dev/docs/advanced/spring-value), velocity, start/stop/advance e [imperative API](https://www.react-spring.dev/docs/concepts/imperative-api) sin rerender de React; motor/scheduler con precisión configurable | Alternativa sólida si se quiere pasar a springs vivos enlazados a componentes `animated`. Trae más integración/rAF de la necesaria para sustituir solo el solver actual. No ofrece normalización arbitraria de paths ni un shader de material |
| GSAP + MorphSVG | [MorphSVG](https://gsap.com/docs/v3/Plugins/MorphSVGPlugin/) normaliza cantidades/tipos de puntos y mapeo; conserva curvas con controles, shapeIndex y precompile | La opción fuerte para arte SVG complejo y cambios de topología. Un tween ordinario con ease no equivale a un spring con C1; [InertiaPlugin](https://gsap.com/docs/v3/Plugins/InertiaPlugin/) sí acepta velocidades y límites para lanzamientos. No conviene agregar core+plugins para cápsulas y máscaras parametrizadas |
| Flubber | [Repositorio/README primario](https://github.com/veltman/flubber): interpolación de formas arbitrarias, densidad configurable | Complemento de Motion cuando los paths no corresponden. No trae física/scheduler; aproxima formas con puntos y el coste crece al bajar maxSegmentLength. Paths con agujeros/múltiples contornos requieren atención: interpolate simple ignora lo que no sea el primer contorno exterior |

Motion/react-spring/Flubber son MIT. GSAP y MorphSVG están disponibles sin cargo según [pricing oficial](https://gsap.com/pricing/), bajo su [Standard No Charge License](https://gsap.com/community/standard-license/), que **no es MIT** y restringe herramientas visuales de animación que compitan con Webflow. La licencia actual no exige pagar MorphSVG para una app como IceWalk; eso no la convierte en software MIT ni autoriza a borrar avisos.

### Qué significa morph en cada caso

La documentación de [SVG en Motion](https://motion.dev/docs/svg-animation) distingue interpolación de `d` con mismos puntos/orden de la mezcla de formas realmente distintas. El [ejemplo oficial Motion+Flubber](https://motion.dev/examples/js-svg-path-morphing) usa Motion para el progreso y Flubber para los paths intermedios. **No hace falta Flubber para un círculo/cápsula/rounded rect descrito con una geometría paramétrica común.** Sí puede ayudar al transformar arte con topologías distintas; no agregarlo preventivamente.

El [layout de Motion para React](https://motion.dev/docs/react-layout-animations) usa `transform` para FLIP y escala; ofrece correcciones de radios/sombras y de hijos. No es una simulación óptica ni una deformación de la máscara. Poner `layout` en un ancestro del vidrio puede volver a introducir los problemas de mezcla y distorsión de contenido del proyecto. Aplicarlo a una capa de pintura o a contenido independiente requiere verificación, como el motor propio.

Ninguna de estas librerías hace que un filtro de backdrop SVG funcione en Safari, recupera el shader privado de visionOS o evita el coste de paint de animar un path/filtro. La guía de [performance de Motion](https://motion.dev/docs/performance) recomienda comprobar la aceleración por propiedad/motor y advierte del coste de CSS variables por cuadro. El shader óptico experimental conserva su pixel-test, límite de área y fallback aparte de la decisión de timing.

### Integración mínima y aceptación

1. Agregar Motion con versión comprobada; reemplazar solver/terminación propios con el generador público. No conservar dos solvers seleccionables que puedan divergir.
2. Al retarget, muestrear tiempo visible de WAAPI, obtener posición/velocidad del generador anterior y generar el nuevo tramo desde ambos. Misma forma parametrizada y radios físicos; contenido separado. Muestrear hasta reposo sin truncar cola y adaptar la limpieza/presencia a esa duración.
3. Mantener cleanup al terminar/cancelar/unmount, foco e inert, y Reduced Motion: último estado estático inmediatamente y ninguna animación residual. El generador puro no crea un rAF permanente.
4. Verificar tests de continuidad y muestras observadas en navegador, flip rápido y reversión; comparar normal/CPU4× y Safari real. Medir chunk Next final después del build: los 2,150 bytes gzip de este experimento no son una promesa de tamaño del producto.
5. Añadir `springValue`/híbrido únicamente si una interacción concreta justifica valores derivados en vivo; añadir Flubber/MorphSVG únicamente si una referencia exige topología distinta. No sumar varias librerías para cubrir la misma responsabilidad.

El coordinador seleccionó la integración Motion `spring` + WAAPI con esta evidencia; implementación y checks quedan a cargo del worker de motion. Método, imports, versiones, pesos y resultados numéricos del probe se preservan en [visionos-motion-libraries-2026-11-11.json](visionos-motion-libraries-2026-11-11.json), sin depender de los bundles temporales.
