# visionOS reference measurements

2026-11-08, Codex. Exact reference: Examples → Sidebar and Tab Bar, `420:4149`
in [visionOS 26](https://www.figma.com/design/TE1ta1HNhtbwSZn3LztSL5?node-id=420-4149).

## Geometry

1920×1080 frame; window at (320,180), 1280×720, radius 46; sidebar width 320;
tab bar at (224,394), 68×292, radius 34; horizontal gap 28. Headers 92; rows
56 with gap 4. The section directly follows the first item group (no extra 4pt
gap). Grabber 136×10 at (892,924); its 14pt companion controls center it in the
row rather than aligning its top edge with theirs.

## Materials and text

- Glass: 50% gray at 30%, luminosity, Figma blur radius 100 (exported CSS 50px).
  Blur and luminosity have separate layers so the sharp backdrop cannot leak in.
- Regular: #D6D6D6/45% color-burn plus black/8% luminosity. Layer order affects
  rendered brightness; the prior web order made the sidebar lighter.
- Recessed: #D0D0D0/50% color-burn plus black/10% luminosity. Its four inset
  shadows include overlay blend modes; combining every shadow as normal is an
  approximation still to replace.
- Enabled segmented track is Recessed; the fully disabled variant `487:12376`
  uses Regular. Disabled selected/unselected segments have no platter/border;
  their text is rgb(141 141 141 / 30%).
- Disabled buttons: white/4% lighten + 37% gray/7% color-dodge, with
  rgb(112 112 112 / 50%) labels. Toolbar disabled dodge opacity is 6%.
- Secondary labels: white/23% lighten + #545454/100% color-dodge. Tertiary:
  white/11% normal + 37% gray/21% color-dodge. The prior `plus-lighter` estimates
  are not identical to these paints and remain an explicit correction item.
- SF Pro weights from Figma: regular 400, medium 510, semibold 590, bold 700;
  source width axis 100. Local SF Pro Text/Display improve label/title metrics;
  no font files are redistributed. Browser rasterization still differs slightly.

## Specular stroke

Read actual paint properties, not just the exported fallback “white 40%”.
Window `420:4156`: normalized transform first row
`[.3331643939, .7669969201, -.02333964594]`. White alphas `.4, .0001, .0001, .1`
at positions `0, .4056868255, .5743719935, 1`.
At 1280×720 this becomes CSS angle 166.2696deg, stops
2.1215%, 38.9967%, 54.3295%, 93.0172%.

Tab bar `420:4327`: first row `[.1080394611, .9996426702, -.05342909694]`;
same alphas at `0, .3683516085, .5743719935, 1`. At 68×292 this becomes
155.104deg and stops 4.8235%, 38.0778%, 56.677%, 95.1021%.

## Scroll regression

An absolutely positioned layer inside an overflow container scrolls with its
contents. Reproduced: sidebar top 159.8, material top −60.2 after scrollTop=220.
Fix: material remains on the outer surface; `SurfaceScroll` owns overflow on an
inner sibling. Browser check at 1920×1080: material stays (320,180,320,720) after
scrollTop=250. Applied to Sidebar and Ornament; Material also exposes scrollable
content using the same primitive. Keep this structure for new scrolling panels.

## Verification and experiments

- Before disabled changes: lint/types, 34 UI + 6 web tests, build passed.
- After disabled corrections: lint/types, 39 UI + 6 web tests, build passed.
- Dark preference and light preference produced byte-identical 1920×1080
  screenshots; computed color-scheme is `dark only`, data-theme is `dark`.
- Original symbols were exported as SVG for measurement. Eitan subsequently
  explicitly requested Lucide for every icon, adapted to the measured slots;
  the runtime now uses Lucide. Keep glyph exports only as local references.
  `download_assets` on a text node returned opaque pixels containing the page
  backdrop, unsuitable as an alpha mask. `exportAsync(SVG_STRING)` on the actual
  instance glyph produced transparent vector assets correctly.
- Global optical-size and raw weight overrides did not reproduce Figma text
  metrics. Keep semantic font weights, local Text/Display faces and the fallback.
- Blur 35/40/45/55px comparisons were measured; retain the source's exported
  50px rather than silently changing a source value to fit a renderer.
- Color differences in the latest reference screenshot remain small (glass
  mean absolute error ~1.4/255/channel); this is not proof of pixel identity or
  completion of every component. Full family/state verification is still pending.

## Safari 27 composition regression

Reproduced in the installed Safari 27.0.1 via its actual UI: Regular rendered
as a light gray slab while Chromium rendered the intended dark glass. Removing
overflow clipping, adding a tiny background to the blur layer, and forcing
transforms did not fix it. Applying an identity backdrop filter to both Regular
layers made it black; applying it to the luminosity layer alone fixed the blend.

`backdrop-filter: brightness(1)` on Regular/Recessed/Thick luminosity explicitly
samples the backdrop before the color-burn layer. It is an identity operation,
not an alternate Safari palette. Chromium screenshot mean per-channel change was
below 0.00002/255. Safari was reloaded after the code change, then scrolled: the
sidebar remained dark and the material stayed fixed. WebKit 27.2 headless did not
reproduce the same GPU composition, so it is not equivalent evidence to Safari.

## Playbook y auditoría de tamaños (2026-11-08)

- `/design` contiene 30 familias (5 foundations, 9 controls, 8 navigation, 8 system),
  búsqueda, índice de fuentes, disabled y escenarios interactivos. Implementación
  y manifiesto en `apps/web/components/design/playbook*.tsx` / `playbook-data.ts`.
- Symbol buttons: fuente 104:31764 / 31747 / 31696 / 31679 / 31561, targets
  28/32/44/52/64, bounds del glyph square.dashed aprox.
  11.97/13.67/17.32/21.88/26.44. Canvas Lucide 14/16/20/26/32, porque su viewBox
  incorpora márgenes. Medidos en navegador; Large y Extra Large corregidos.
  No confundir tamaño del canvas con el glyph ni con su target interactivo.
- El manifiesto lista estados demostrados, no estados certificados 1:1. Falta
  comparación visual de todas las combinaciones del inventario y revisar de nuevo
  el playbook completo en Safari real. WebKit aislado no reproduce el blur GPU de
  Safari; usarlo para interacción/layout, no para certificar los materiales.
- Recursos locales: día 487:18087 (`room-day.png`), noche 487:18089
  (`visionos-room.jpg`), pinch 546:2192, point 546:2207, two hands 518:3272.
  Los gestos son ilustraciones, no sustituyen controles con capturas.


## QA de diseno 2026-11-09 (materiales, estados, iconos)

Metodo: Figma MCP (`get_metadata`, `get_screenshot`, y `use_figma` solo de lectura
para volcar fills, radios, padding, efectos y `absoluteRenderBounds`; no se
escribio nada en el archivo). Navegador: Chromium (agent-browser) y Safari 27.0.1
real (`screencapture -l <windowId>` sobre una ventana propia; clicks con System
Events). `safaridriver` no se pudo usar: "Allow remote automation" esta
desactivado en Safari y no se cambio la configuracion del usuario.

### Orden de capas: la API de plugins lista los fills de abajo hacia arriba

Comparacion de pixeles, mismo fondo `rgb(82 107 142)` que el Materials del kit
(swatches del kit entre parentesis):

| Material | Orden DOM (abajo -> arriba) | Resultado | Kit |
| --- | --- | --- | --- |
| Recessed | burn, luminosity (antes) | 56 78 116 | 53 78 113 |
| Recessed | luminosity, burn (ahora) | 53 78 113 | exacto |
| Thick | burn #DADADA 92% + luminosity 10% (valores del kit; antes 65%/22% estimados) | 49 75 111 | 49 76 112 |
| Regular | luminosity, burn (sin cambio, verificado en Safari) | 61 86 121 | 62 87 122 |
| Platter, Pinch .16/.36 | lighten, dodge (ahora) | 133 159 194 | 132 157 193 |
| Platter, Pinch | dodge, lighten (antes, con .14/.4 estimado) | 124 150 185 | 132 157 193 |
| Platter Idle / Hover | lighten, dodge | 104 129 166 / 92 117 152 | 103 129 165 / 91 116 151 |

Pinch del kit (104:31495): white 16% lighten + #5E5E5E 36% dodge (antes
estimado .14/.4). Efecto en Safari: el orden anterior de Recessed dejaba el
campo "Find components" y la pista del switch como una losa gris clara; con
luminosity primero (igual que Regular) Safari 27 los renderiza oscuros, como
Chromium.

### Tooltip (548:2239)

Bezel con blur 136 (68px), white 3% luminosity + #808080 15% color-dodge y borde
0.75 con gradiente (blanco 45% -> 0 -> 15%). Un 15% gris normal daba 77 102 136
sobre `rgb(68 97 137)`; con las capas del kit 85 117 158 (kit: 84 118 161).

### Borde especular: formula

Para cualquier nodo con trazo `GRADIENT_LINEAR`: `a,b,c` = primera fila de
`gradientTransform`; angulo CSS = `atan2(a/W, -b/H)`; `t` en cada esquina =
`a*x+b*y+c`; posicion CSS = `(t - tmin)/(tmax - tmin)`. Reproduce los valores de
ventana (166.27deg) y tab bar (155.104deg). Medidos hoy: menu seleccionable
280x528 150.286deg, stops 0/40.569/57.437/100 (trazo 1.4); menu con accessory bar
144.702deg; toolbar 2 items 172.141deg, 4 items 175.899deg; notificacion
compacta 377x92 173.949deg, expandida 436x642 147.397deg; tooltip 159.2deg.
Ventana trazo 1.0; menu, tab bar, toolbar y notificacion trazo 1.4.

### Menus (487:11335)

Item 256x56 radio 16, padding 12 (20 inicial sin columna de checkmark), filas con
8pt entre ellas (paso 64), contenedor 280, radio 28, padding 12. Header 50,
section header 47 (13 bold secundario, linea arriba), barra de accesorios 64 con
botones de 44. Estados: hover white 4% + dodge 6%; pinch/selected white 8%;
disabled: titulo, checkmark y simbolo a 20% (el subtitulo conserva su vibrancy);
chevron terciario 13 Medium.

### Tabla de iconos Lucide (tamano de lienzo / trazo en viewBox 24)

Regla: se igualo la tinta (`absoluteRenderBounds`) del glifo SF con la del icono
Lucide (tinta Lucide = (trazado + trazo) x lienzo/24; un icono tipico ocupa
~0.85 del lienzo). Lienzo ~ 1.09 x tamano SF. Trazo por peso: Regular 2,
Medium 2.25, Semibold 2.5, Bold 2.75.

| Slot (Figma) | SF | Tinta Figma | Lucide |
| --- | --- | --- | --- |
| Symbol buttons mini/small/regular/large/XL | 13/15/19/24/29 Medium | 11.9/13.7/17.3/21.9/26.4 | 14/16/20/26/32 (sin cambio) |
| Text+symbol small/regular/large | 17/19/22 Semibold | n/d | 18/20/24 (nuevo, `data-with-symbol`) |
| Tab bar, toolbar, nav symbols | 19 Medium | 17.3 | 20 |
| Menu simbolo / checkmark / chevron | 17 / 15 Semibold / 13 Medium | 15.3 / 13.2x12.8 / 6.5x11.2 | 18 / 17 trazo 2.5 / 19 trazo 2.25 |
| Menu accessory bar | 19 Medium | 17.3 | 20 |
| Dropdown chevron regular / small | 19 Bold / 15 Semibold | 17x10.1 / 13.2x7.7 | 26 trazo 2.75 / 22 trazo 2.5 |
| Lists chevron | 17 Medium | 6.8x11.8 | 20 trazo 2.25 |
| Sidebar disclosure | 17 | 11.9x6.9 | 20 trazo 2.25 |
| Sidebar simbolo (frame 28) | 17 (escala grande) | 19.8 | 24 |
| Sliders mini/small/regular/large | 13/15/19/24 Medium | 11.9/13.7/17.3/21.9 | 14/16/20/26 (antes 20 fijo) |
| Search/Text field clear | 13 Semibold | 10.4 | 17 trazo 2.5 (antes 14) |
| Date picker mes anterior/siguiente | 19 Medium | 9.4x16.4 | 28 trazo 2 (antes 20) |
| Checkbox check | 13 Semibold | 11.4x11.1 | 16 trazo 2.5 (sin cambio, ~1px de diferencia) |
| Segment con simbolo | 15 Semibold | n/d | 16 |

No verificados contra el kit: iconos del keyboard (shift/delete), share sheet,
alert, SharePlay, status badge (no existe en el kit) y los glifos de app icons.
El campo Search del kit lleva un microfono a la izquierda; el runtime usa una
lupa (adaptacion web, sin dictado).
