# visionOS component fidelity and playbook

Requested by Eitan, 2026-11-08. Continue the exact Figma replica first, including
dark materials and disabled states; then provide a visionOS playbook built with
the actual components, using the kit inventory to find omissions.

Source: visionOS 26 (Community), file `TE1ta1HNhtbwSZn3LztSL5`.
The source has 30 foundation/component pages. The detailed variant inventory for
16 previously missing families is in `../research/visionos-kit-inventory.json`.

## Selected work

- [x] Recover Claude's latest request and publish the handoff to Brain.
- [x] Reference scene, adapted Lucide symbols, exact specular-gradient properties.
- [x] Explicit dark scheme, including when the OS prefers light.
- [x] Disabled buttons, selected toggles, toolbar, tabs, sidebar and segments.
- [x] Keep material layers stationary while sidebar/toolbar content scrolls.
- [x] Replace estimated label vibrancy and inspect remaining material effects.
- [x] Complete inputs, secure/search fields, switches and checkboxes.
- [x] Complete sliders, progress/activity indicators, page controls and tokens.
- [x] Complete menu/dropdown, date/time and color pickers.
- [x] Complete alerts, notifications/notices, share sheets and SharePlay surfaces.
- [x] Include keyboards and original gesture/app-icon/background resources.
- [~] Review existing list/navigation/sidebar/tab/toolbar/tooltip/window variants (2026-11-09: ver "Matriz de verificacion"; parcial).
- [x] Build the navigable playbook and expose a source-based coverage matrix.
- [x] Check visual states, keyboard/disabled behavior, scroll surfaces and build.
- [x] Update repository records and Brain with evidence and remaining limitations.

## Acceptance

Every source family has a corresponding reusable component or an explicitly
identified platform illustration/resource, and a live playbook example. Real
controls support pointer, keyboard, labels and disabled behavior. No dummy
controls or screenshots substituted for interactive components. Reference assets
remain local, in keeping with the earlier agreement; no temporary asset URLs in
runtime code. Geometry and all visible material/label states are compared to
Figma. Do not label a family verified merely because it exists.

The scroll regression is checked in a real browser: material bounds remain at
the surface bounds after its inner content scrolls. Dark/light OS screenshots
must be identical because this playbook intentionally uses the dark appearance.

Keep `web/base`, preserve the previous work, and do not commit/push until Eitan
approves the complete result. Planning mock remains preserved in its component;
the home page currently shows the reference, as requested before adding data.

## Delivery checkpoint

The playbook implementation is available at `/design`: all 30 source families
have live examples or original resources, including search, disabled inspection,
hash navigation and a source index. The prior catalog is `/design/catalog`.
53 UI + 8 web tests, lint, types and production build pass. Chromium desktop/mobile
and isolated WebKit covered all 30 families with no horizontal overflow.

Full 1:1 acceptance remains open: the examples are not a visual certification of
every variant in the ~600-entry detailed inventory. Remaining review includes
list/navigation/sidebar/tab/toolbar variants, all hover/pinch combinations and
new native Safari verification. The earlier Safari sidebar fix was observed in
real Safari; CUA could not reconnect for the final playbook pass. Headless WebKit
blur differs and must not be used to claim material parity. No commit/push made.


## Matriz de verificacion (2026-11-09)

Leyenda: M = medido contra Figma (geometria/paints volcados con la API), P =
comparacion de pixeles contra el kit, V = comparacion visual con captura del kit,
C = Chromium, S = Safari 27.0.1 real (captura de ventana; clicks con System
Events), "-" = no verificado. Nada se declara 1:1.

| Familia | Estado verificado | Resultado / pendiente |
| --- | --- | --- |
| Materiales (Recessed, Thick, Platter) | M+P, C; Recessed tambien S | Orden de capas y valores corregidos. Regular dentro de 1/255; Glass/Thin no recomparados |
| Menus (Menu Item, Context Menu, accessory bar, section header) | M, V; idle/hover/abierto C+S; disabled y pinch C solo por CSS | Geometria 8pt entre filas, checkmark condicionado, section header y accessory bar nuevos. Falta: header de menu con boton, "Selected" solo por :active |
| Popups (blur en el popup) | C+S abierto | Menu translucido y desenfocado en ambos (`backdrop-filter: blur(50px)` calculado) |
| Notificaciones | C+S (estatico) | Sin tinte rojo en Safari. **Layout distinto al kit**: el kit tiene pill compacta 377x92, expandida 436x642 con icono centrado/atras/mas/imagen/acciones centradas y banners con X + accion; el runtime tiene una tarjeta propia. Sin rehacer |
| Tooltip | M+P (color), C | Capas del kit (luminosity + dodge) y borde 0.75 con gradiente. S sin verificar (requiere hover) |
| Tab bar | M, C+S | Variante Expanded=True agregada (150pt). Estados idle/hover/selected con paints del kit; hover verificado solo por CSS |
| Toolbar / Ornament | M (paddings 12, gap 8, items 91x44), V en C | Trazo 1.4 ok; angulo del borde fijo (kit varia por ancho). Selected/disabled de items sin recomparar |
| Segmented control | M, C+S | Icono opcional (gap 3, 15 Semibold); sombra del seleccionado disabled; pista Recessed corregida. Hover seleccionado sin glow |
| Botones | M (22 variantes texto, text+symbol, symbol), C+S | Pinch .16/.36 y orden de capas; text+symbol con simbolo 18/20/24 y gap 2 en small. Link (text pill) y "Hover + Dwell" no recreados |
| Sidebar | M (item, section header, header) | Geometria coincide (pad 12/19/8, gap 8, radio 11, 56pt). Accesorios circle/bitmap sin componente propio; icono 24 |
| Navigation bar | M (variantes 6) | 92pt, pad 24, titulo 29 bold, botones 44 con gap 16 coinciden. Back con texto ("Back") y search/avatar sin componente |
| Window / controls | M | Trazo 1.0 y barra 136x10 ok. Hover de grabber/close/share, resize, Document Title, SharePlay Status y Privacy Indicator sin implementar |
| Lists | M (alturas) | Fila 60 ok; fila Tall (72), Text Box, section header Subtitle/Eyebrow, edit buttons y index bar sin implementar |
| Fields | M (idle/hover/typing/disabled) | 305x44, radio 12/pill, recessed ok. Clear button en Text/Secure typing, placeholder secundario con blend, peso Regular al escribir, microfono: pendientes. Caret azul agregado |
| Status badge | - | Componente propio de IceWalk, no existe en el kit |
| Resto de familias del inventario (alerts, share sheets, SharePlay, keyboard, pickers, progress, tokens, sliders, page controls, color pickers) | - | Solo revisado el tamano de iconos de sliders/pickers; paints y estados sin recomparar |

Selector de hora (bugs reportados 2026-11-09): al abrir el TimePicker colapsado el
foco ya no entra en la hora (`initialFocus` en el popup) y el anillo de foco de
las ruedas es inset para que `overflow-hidden` no lo recorte.
