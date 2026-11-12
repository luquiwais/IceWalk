# packages/ui sobre Fluid Kit — plan vigente (2026-11-12)

Pedido de Eitan: adaptar [Fluid Kit](https://github.com/mikhailmogilnikov/fluid-kit) (MIT, `@fluidkit/react` 2.0.0) a nuestros componentes y dejarlos con lo mínimo necesario, optimizados para rendimiento, compatibilidad y SEO. Reemplaza el trabajo de motion propio (spring de Motion, morph desde el invocador hecho a mano) que quedó en el commit `01b0f6a`.

## Decisiones de Eitan (2026-11-12)

- Fluid Kit como **dependencia**, instalada con Bun (no copiar su código).
- Material: el vidrio `lb` de Fluid Kit (un elemento, CSS puro, sin blend modes ni SVG). Se abandona el calco 1:1 de capas del kit de visionOS.
- **Cambio posterior (mismo día):** el estilo pasa a ser **Liquid Glass de iOS 27**, usando Fluid Kit **como viene** (sin retocar sus variables; tema oscuro con su `data-theme`). Sin kit de Figma de iOS 27 medido: HIG, WWDC25/219 y la calibración de Fluid Kit contra iOS 26.
- Alcance: **todo el playbook** (46 módulos, 30 familias), no solo lo que usa la app.
- Antes del refactor: commit + push del estado anterior (`01b0f6a`).

## Cómo se arma cada componente

| Pieza | De dónde sale |
| --- | --- |
| Comportamiento y accesibilidad (teclado, foco, roles, posicionamiento) | Base UI, como hasta ahora |
| Material | Clase `lb` (+ `lb-interactive` en controles, `lb-tinted`, `lb-lens`) |
| Superficies que se abren desde un botón (menú, picker, sheet, alert, ventana) | `Morph` de Fluid Kit: el botón se convierte en la superficie y vuelve |
| Selección que se mueve (tabs, segmented, sidebar, menú) | `Highlight`: `Indicator` de Fluid Kit, un relleno (nunca vidrio sobre vidrio) |
| Switch, slider | Ejemplos de `Drag`/slider de Fluid Kit: pulgar de vidrio blanco que se vuelve lente al sostenerlo |
| Controles sobre vidrio | Rellenos (`ui-fill`, `ui-well`), no un segundo vidrio |
| Listas que cambian | `Layout` de Fluid Kit |
| Scroll con bordes que se desvanecen | `lb-edge` / `lb-edge-x` (CSS puro) |
| Entradas y salidas simples (contenido, notificaciones) | `fk-transition` + springs CSS `--fk-*` |

Se eliminan: capas `MaterialLayers` y `Vibrancy`, borde óptico SVG (`optical-*`), springs propios (`spring*.ts`), `motion.tsx` y casi todo `motion.css`, `hover-reveal`, y la dependencia `motion`.

## Rendimiento, compatibilidad y SEO

- Componentes sin estado ni efectos se quedan como Server Components (sin `"use client"`): HTML real en el servidor.
- Un elemento por superficie (antes 3 a 5 capas con `mix-blend-mode`): menos capas de composición y sin contextos de apilamiento frágiles.
- Sin filtros SVG: el mismo resultado en Safari, Chrome y Firefox.
- Movimiento solo con `transform`, `opacity` y `clip-path`; springs interrumpibles del motor de Fluid Kit.

## Orden de trabajo (cada paso con checks y commit)

1. Base: tema visionOS sobre `lb`, `Material`, `Text`, botones. Se quitan capas viejas de todos los módulos.
2. Selección: TabBar, SegmentedControl, Sidebar, Ornament con `Indicator`.
3. Superficies: menú, picker, select/combobox, sheet, alert, share, ventana con `Morph`.
4. Controles: switch, checkbox, sliders, stepper, rueda de hora, campos.
5. Listas con `Layout` y scroll con `lb-edge`.
6. Playbook `/design` actualizado, QA en Chromium y Safari, registro (`DECISIONS`, `SOURCES`, `EXPERIMENTS`, log), commit y push.

## Estado vigente tras el feedback final de Eitan (2026-11-12)

- `/design` usa fondos system/grouped sin imagen y utilidades Tailwind mobile-first; las reglas CSS de layout del playbook se eliminaron. Los tokens de `@theme static` permiten claro/oscuro y muestras dinámicas.
- `Material regular/thick` son superficies sólidas de contenido; `glass/tooltip` conservan `lb`. Sidebar y navegación flotan; iconos secundarios neutros y énfasis reservado para interacción.
- Menús y pickers: origen invisible dentro del botón, invocador visible y posición configurable. DatePicker/TimePicker transmiten las mismas props. Efectos del botón configurables; `ButtonGroup` usa `Glass.Group`.
- Apertura y contenido de ventanas: el ejemplo declara estados de Morph botón/resumen/detalle, todos medibles; el motor anima la superficie y mantiene la tipografía a tamaño natural. `WindowMotion` ofrece `morphOrigin` para ventanas reutilizables. Sin origen mantiene transición en su lugar. Sheets y alerts conservan la presentación modal de Base UI.
- Los pickers de fecha/hora usan Morph desde su campo compacto. El foco, Escape, teclado y movimiento reducido se verifican; no se confunde ResizeObserver de un vuelo en curso con una transición automática de contenido en reposo.
- Checks: 129 UI + 150 web, lint/tipos y build pasan. QA Chromium y ejemplos adaptativos; Safari y calibración Figma permanecen pendientes. Ver `EXPERIMENTS.md`.
