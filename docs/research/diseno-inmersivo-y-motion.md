# Diseño inmersivo y movimiento — avance del 9 de noviembre de 2026

## Estado al guardar

Eitan pidió guardar avances, commitear, pushear y abrir PR. Esta es una **iteración revisable**, no una aprobación estética ni una implementación idéntica a Apple. Eitan rechazó varias composiciones previas y señaló tirones, diferencias con Apple y estados todavía sin animación. Falta cerrar esa revisión visual. Los nuevos inputs (numéricos y demás tipos) quedan explícitamente para después del movimiento. El bug previo de hover en Safari sigue diferido.

## Composición vigente

Escena inmersiva completa con controles esenciales y ventanas contextuales cerradas al iniciar. Brief, capas, estado, estaciones, EV y Science usan el kit compartido. Información secundaria detrás de disclosures reales. Sin barra decorativa de mover ventanas en la aplicación ni al pie del playbook. Timeline usa la misma ventana contextual para evitar saltos de tamaño y ubicación. La tab bar es vertical en escritorio; su orientación horizontal compacta es una adaptación web, no una regla nativa de visionOS.

Datos locales en `apps/web/mock/design-session.ts`; medición, aprobación y reset son demostraciones. Las imágenes generadas son ilustrativas, no HiRISE ni georreferenciadas. Se conservan los contratos, el backend y el globo Cesium existente. La caution del mock de 2.2 min no define un umbral operacional.

Se corrigieron selección vs disclosure en listas, botones de capa sin falsa flecha de despliegue, área de foco completa de campos, geometría estable de estaciones, zoom real del fondo y representación de Targets. Cursores: acciones pointer, edición text, deshabilitados not-allowed, globo grab/grabbing y estaciones pointer. Navegación y dock siguen accesibles a 320 px.

## Investigación de Apple

Fuentes primarias leídas: [Motion HIG](https://developer.apple.com/design/human-interface-guidelines/motion), [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views), [Meet Liquid Glass, WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/), [SwiftUI con el nuevo diseño, 323](https://developer.apple.com/videos/play/wwdc2025/323/) y [UIKit con el nuevo diseño, 284](https://developer.apple.com/videos/play/wwdc2025/284/). Se revisaron fotogramas del video 219, incluido el menú que surge del botón (aprox. 5:05–5:11).

Apple vincula flexibilidad y luz a la interacción. El material se materializa modulando propiedades ópticas; los controles cercanos pueden fusionarse, y un menú mantiene continuidad con su origen. No equivale a poner un fade y una escala uniforme sobre toda la interfaz. Los contenedores e identificadores de efectos de SwiftUI coordinan morphing según geometría y proximidad. UIKit describe también impulso y estiramiento de sliders. HIG pide respuesta breve, interrumpible y diferenciada por entrada; Reduce Motion elimina elasticidad y reduce efectos. En visionOS hay que conservar un entorno estable y evitar movimiento periférico innecesario.

Las constantes privadas y el shader de Apple no están publicados en estas fuentes. Las curvas, duraciones y deformaciones web de este PR son calibraciones propias; no deben presentarse como valores oficiales.

## Implementación de movimiento

`packages/ui/src/motion.tsx` y `motion.css` centralizan presencia, collapse y selección. No se agregó una dependencia de animación.

- Selección de tab bar y segmented: una lente compartida se desplaza y su pintura se estira ligeramente según la dirección. Los textos mantienen tamaño y posición. Se eliminó el fondo duplicado que aparecía además de la lente.
- Popups: el vidrio del menú crece desde proporciones medidas del trigger; contenido a tamaño final. Alertas, diálogos, tooltip, pickers y share sheet conservan la salida de sus portales.
- Presencia: retiene el último contenido al cerrar, lo vuelve inert/aria-hidden y admite reapertura antes de terminar; tiene limpieza de respaldo. Un reloj CSS no heredado permite a Base UI esperar la salida sin recalcular el árbol por cuadro.
- Disclosures y secciones de sidebar: altura medida por Base UI, flecha y contenido coordinados, sin quitar el panel antes de cerrar.
- Toolbar: ancho intrínseco medido y transición cuando cambian controles. Page control: ancho de puntos y marcador; switches: recorrido y compresión del thumb; checkboxes: marca y estado; progress: valor; campos: clear con presencia; tokens: salida controlada por el consumidor sin retrasar el callback de filtro.
- Calendario, color format, teclado, títulos, métricas, feedback, notificaciones, avisos, paneles y cambios de escena tienen feedback/transiciones. El entorno cambia por disolución, sin desplazar toda la cámara.
- Último cambio: la rueda de hora también anima pasos de teclado/wheel, retargetea desde su posición visible y mantiene el arrastre directo. Esta última mejora pasó tests/tipos/lint; no quedó incluida en la corrida de 36 estados del navegador.
- Reduced Motion elimina transiciones, desplazamientos y elasticidad; el indicador cancela su WAAPI si cambia la preferencia. Los estados siguen expresados por texto, selección y ARIA.

Restricción del material: transformar/fadear un ancestro de las capas mezcladas altera el muestreo del fondo. Se anima la pintura independiente y el contenido que no contiene materiales. La primera versión animaba blur y geometría del popup: retirada tras el reporte de lag. El radio de blur queda constante. No hay `transition: all` ni `will-change` permanente.

## Evidencia y límites

- Checks finales del código: UI 74 tests y web 38; lint y typecheck de ambos pasan. Build de producción se vuelve a ejecutar al guardar.
- Antes de motion: auditoría de 35 estados y 680 observaciones de controles, escritorio/tablet/390/320 px; sin fallas de cursor, overflow de página, grabbers ni accesibilidad de las acciones globales. Axe previo sin violaciones automáticas; contraste de vidrio quedó incompleto. No es certificación de accesibilidad.
- Motion en producción local: **36 acciones con animaciones observadas**, incluidas aperturas/cierres, submenu, sidebar, controles y escenas. Resumen durable en `motion-audit-2026-11-09.json`.
- La mayoría de muestras tuvieron p95 de intervalo rAF de 16.7–16.8 ms y no se registraron long tasks. Hubo picos fríos: time picker 100 ms, share 50.1 ms, cerrar panel 66.7 ms y sidebar móvil 83.3 ms. No se confirmó la causa con una traza de GPU. No ocultar estos resultados ni declarar 60 fps garantizados.
- Repeticiones de abrir/cerrar menú y time picker dieron p95 16.7–16.8 ms. Eso no demuestra que la primera apertura ni Safari estén resueltos.
- Se confirmó en DOM real que una alerta conserva `data-ending-style` durante su salida, luego se desmonta y restaura el foco al trigger.
- Pendiente: repetir auditoría sobre el HEAD final, comprobar Reduce Motion en navegador, rueda final, Safari real y percepción visual de Eitan. Hubo un atasco de agent-browser al cambiar viewport; no se completó la última captura. No atribuirlo a la aplicación sin evidencia.
- No ejecutar `web:test` y `web:build` simultáneamente: el script que copia Cesium elimina/recrea assets mientras Vitest escanea y puede producir ENOENT. La secuencia separada pasa.

## Siguiente acción exacta

Abrir el PR guardado, leer este documento y el log WKFL. Revisar primero la primera apertura del time picker y la sidebar móvil con traza y Safari real; verificar rueda y Reduce Motion sobre el HEAD del PR; comparar movimiento con las demos de Apple y completar estados faltantes. Continuar iterando motion según Eitan. Después hacer inventario de tipos de input (empezando por números) y ampliar el playbook. No reactivar automáticamente el hover Safari diferido ni resolver umbrales/backend del equipo.

## Imágenes

Generadas con el modo built-in de imagegen. Assets: `apps/web/public/demo/mars-surface.png` y `mars-surface-view.png`. Originales preservados en `/Users/eitan/.codex/generated_images/01a1c1ca-4fad-7870-acee-8c53b040b1ff/`.

Prompt aéreo: “Use case: photorealistic-natural. Asset type: fullscreen environmental backdrop for a minimal visionOS-style Mars EVA planning prototype. Generate a very high quality wide 16:9 photorealistic aerial view of a small area of Mars at a low oblique angle, like a sophisticated geological simulation. A single modest fresh impact crater in the middle-right, subtle rocky ejecta, broad softly undulating dusty plains and ancient eroded ridges receding into atmospheric haze in the far distance. Camera is looking down at about 45 degrees, no sky except a faint hazy strip at the extreme top. Restrained desaturated warm sandstone, umber, taupe and charcoal, realistic delicate geological surface detail, soft directional late-afternoon light, naturally cinematic, exceptionally elegant and calm rather than spectacular. Surface should fill every edge. A large clear gently textured plain in center-left for overlaying a traverse route. This is an illustrative environment, not an actual satellite image. Absolutely no text, no labels, no symbols, no UI, no grids, no artificial route lines, no human objects, no vehicles, no astronauts, no settlements, no giant dramatic mountains, no bright orange saturation, no planet in the sky. Landscape 16:9.”

Prompt de superficie: “Use case: photorealistic-natural. Create a wide 16:9 extremely realistic calm first-person view on the Martian surface for an immersive EVA app prototype. Human eye-height about 1.7 meters, looking slightly downward across a broad dusty plain toward a modest eroded crater rim on the far right. Fine dusty sandy regolith, a few scattered small angular rocks in the foreground, low layered mesas along the very distant horizon. Pale desaturated dusty taupe sky occupies only the upper quarter. Gentle warm directional sunlight, restrained umber sandstone taupe and charcoal palette, highly realistic geological texture, calm elegant cinematic framing, clean open traversable ground in the center. No drama, no bright orange, no people, no spacecraft, no vehicles, no settlements, no planet in the sky, no graphic overlays, no text, no labels, no symbols, no UI. Illustrative geological environment, not actual NASA imagery. Photographic landscape 16:9.”
