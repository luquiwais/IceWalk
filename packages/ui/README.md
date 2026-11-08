# packages/ui/

Dueño: Frontend. Sistema de diseño de IceWalk (`@icewalk/ui`): componentes y tokens con estilo visionOS, sobre [Base UI](https://base-ui.com) y Tailwind CSS v4. Se publica como código TypeScript (sin build); `apps/web` lo transpila con `transpilePackages`.

```bash
bun run moon run ui:lint ui:typecheck ui:test
```

## Escala: puntos de visionOS adaptados a cada pantalla

visionOS mide todo en puntos y el kit compone cada pantalla en un cuadro de 1920×1080, que representa el campo de visión. En la web, el viewport hace de ese cuadro:

```
1pt = min(100vw / 1920, 100vh / 1080), entre 0.8px y 1.25px   (celulares: 0.94px)
1rem = 16pt
```

Todos los tamaños están en `rem`, así que la interfaz escala entera y mantiene las proporciones del kit: en 1920×1080 se ve igual que en Figma; en una laptop de 1440×900, al 80 %. Ventana por defecto del kit: 1280×720pt; la de IceWalk mide 920×720pt (barra lateral de 320 + contenido).

## Estilos de texto

Los 13 estilos de texto del kit están como componentes en `src/text.tsx`, igual que los *Text Styles* de Figma: se elige el estilo por nombre y el tamaño, la altura de línea y el peso quedan fijos en un solo lugar.

```tsx
import { Body, Footnote, LargeTitle, Text } from "@icewalk/ui/text";

<LargeTitle as="h2">EVA 1</LargeTitle>
<Body>Duration</Body>
<Footnote tone="secondary">s1094b-eva1</Footnote>
<Text variant="body" weight="semibold">Replan</Text>   // peso distinto al del estilo
```

| Componente | Tamaño/línea | Peso |
| --- | --- | --- |
| `XLTitle1` | 48/56 | bold |
| `XLTitle2` | 38/46 | bold |
| `LargeTitle` | 29/38 | bold |
| `Title1` | 24/32 | bold |
| `Title2` | 22/28 | bold |
| `Title3` | 19/24 | bold |
| `Headline` | 17/22 | bold |
| `Body` | 17/22 | medium (510) |
| `Callout` | 15/20 | semibold (590) |
| `Subheadline` | 15/20 | regular |
| `Footnote` | 13/18 | medium |
| `Caption1`, `Caption2` | 12/16 | medium |

`tone`: `primary` (blanco 96 %), `secondary` y `tertiary` (vibrancy), `disabled`, `inherit`. `as`: el elemento HTML (por defecto `p`; usar `h1`-`h4` para la estructura). Los componentes usan estos estilos: botones chicos = Callout, normales = Body semibold, grandes = Title 3 semibold.

**Catálogo:** `apps/web/app/design` (ruta `/design`) muestra todos los estilos y componentes sobre el fondo de los ejemplos del kit, para comparar y medir contra Figma.

## Componentes

| Componente | Kit (Figma) | Medidas |
| --- | --- | --- |
| `Window` | Window | vidrio, radio 46, borde 1px blanco 40 % |
| `NavigationBar` | Navigation Bars | 92 de alto, márgenes 24, Large Title 29, botones 44 con 16 entre ellos |
| `WindowControls` | Window Controls | barra de 136×10 bajo la ventana |
| `Sidebar`, `SidebarItem`, `SidebarSection` | Sidebars | 320 de ancho, material Regular, filas de 56, símbolo azul `#0091FF` |
| `TabBar` | Tab Bars (colapsada) | ornament vertical de 68, radio 34, pestañas de 44 |
| `Ornament` | Toolbars | vidrio, borde 1.4px, padding 12, gap 8 |
| `ListSection`, `ListRow` | Lists (Row - Inset) | filas de 60, material Regular, radio 16 |
| `Button`, `IconButton`, `ToggleButton` | Buttons | texto 32/44/52, símbolo 28 a 64 |
| `SegmentedControl` | Segmented Controls | pista hundida de 44, segmentos de 36 |
| `Tooltip` | Tooltips | Caption 1, borde 0.75px |
| `StatusBadge` | (propio) | alertas advisory / caution / warning sobre platter |
| `Text` y estilos | Text Styles | ver arriba |

## Diseño: visionOS 26, 1:1 con el kit de Apple

Los tokens y componentes salen del kit oficial de Apple en Figma, [visionOS 26 (Community)](https://www.figma.com/design/TE1ta1HNhtbwSZn3LztSL5/visionOS-26--Community-): páginas Colors, Materials, Text Styles, Buttons, Segmented Controls, Toolbars, Lists y Tooltips. Las guías de Apple de referencia son las [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos).

**Cómo se replican los materiales.** El vidrio son dos capas: primero el desenfoque (`backdrop-filter`) y encima el tinte gris con `luminosity`; en una sola capa, `luminosity` conserva el tono del fondo nítido y el desenfoque no se nota. Ojo: si se escribe `backdrop-filter` junto con `-webkit-backdrop-filter`, el compilador de Tailwind (Lightning CSS) borra los dos; va solo sin prefijo.

**Capas.** En visionOS cada material es una pila de capas con modos de fusión (`lighten`, `color-dodge`, `color-burn`, `luminosity`). La web tiene los mismos modos, así que las capas se copian tal cual (`src/material.tsx` + clases `vision-*` en `src/theme.css`). Una capa solo se funde con lo que está detrás si ningún ancestro crea un *stacking context*: en superficies y controles **no usar** `transform`, `opacity`, `filter`, `z-index` ni `position: sticky/fixed`.

| Kit (Figma) | Valor | En el código |
| --- | --- | --- |
| Windows/Glass | blur 50px + `#808080` al 30 % en `luminosity`; borde 1px blanco al 40 %; radio 46 | `Window`, `MaterialLayers kind="glass"` |
| Toolbar (ornament) | mismo vidrio, borde 1.4px, padding 12, gap 8, cápsula | `Ornament` |
| Controls: Idle (Platter) | blanco 6 % `lighten` + `#5E5E5E` 18 % `color-dodge` | `.vision-control` |
| Hover | + brillo radial desde abajo (blanco 7 %, gris 14 %) | `.vision-control:hover` |
| Selected | blanco 96 %, contenido negro (en toolbars: platter) | `ToggleButton` |
| Disabled | 4 % / 7 %, texto `rgb(112 112 112 / .5)` | `[data-disabled]` |
| Views/Recessed | negro 10 % `luminosity` + `#D0D0D0` 50 % `color-burn` + sombras internas | `SegmentedControl` |
| Views/Regular | `#D6D6D6` 45 % `color-burn` + negro 8 % `luminosity`; radio 16 | `ListSection`, `Material kind="regular"` |
| Labels | primario blanco 96 %; secundario y terciario como luz sumada (`plus-lighter`) | `text-label`, `vibrant-secondary`, `vibrant-tertiary` |
| Text Styles | Large Title 29/38, Title 1 24/32, Title 2 22/28, Title 3 19/24, Headline 17/22 bold, Body 17/22 medium, Callout 15/20, Footnote 13/18, Caption 12/16 | `text-large-title` … `text-caption-1` |
| Buttons | texto 32/44/52 (padding 12/20/25), símbolo 28/32/44/52/64, rect redondeado 8/12/16 | `Button`, `IconButton` |
| Segmented Control | pista 44 (padding 4, gap 4), segmentos de 36, elegido = platter con borde 0.5px y sombra | `SegmentedControl` |
| Lists (Row - Inset) | filas de 60, padding 20/8, separador `rgb(140 140 140 / .21)` | `ListSection`, `ListRow` |
| Tooltips | borde 0.75px blanco 45 %, padding 4/12, Caption 1, 8 pt debajo | `Tooltip` |
| Colors | colores del sistema (`#FF453A`, `#FFD60A`, `#5AC8F5`…) | `--color-system-*`; alertas: warning rojo, caution amarillo, advisory cian |

**Verificación.** Con el fondo de los ejemplos del kit (solo local: `apps/web/public/reference/`, fuera de Git) los colores de filas, barra lateral, ítem seleccionado y vidrio dan a 3-7 niveles RGB de los de Figma.

**Estimados** (el kit no exporta el valor; se calibraron midiendo la página Materials): texto secundario y terciario, estado Pinch (presionado) y material Thick. Están marcados en `src/theme.css`.

Reglas del PRD que se mantienen: números reales siempre visibles (`Metric`, con `tabular-nums`), alertas en tres niveles con nombre en texto (`StatusBadge`) y terminología NASA en inglés.

Accesibilidad: con "Reducir transparencia" el vidrio pasa a opaco y con "Aumentar contraste" el texto secundario pasa a blanco plano. Foco visible en todos los controles.

El vidrio baja el contraste. Va bien en Planning; para la vista EV (luz fuerte) conviene usar paneles más sólidos.

Referencias de implementación: [vercel-labs/claude-managed-agents-starter](https://github.com/vercel-labs/claude-managed-agents-starter) (Next 16 + Base UI + `cn()` + `cva`) y [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines).


### Playbook

Open `http://localhost:3000/design` for the spatial playbook. The library includes
30 source families, searchable navigation, disabled specimens and direct Figma
links. `#coverage` opens the source index; `#buttons`, `#pickers`, etc. link to a
family. `/design/reference` keeps the original comparison scene and
`/design/catalog` preserves the earlier flat catalog.

Additional exports: `fields`, `selection-controls`, `slider`, `indicators`,
`search-token`, `menu`, `pickers`, `system-surfaces`, `share-sheet`, `keyboard`,
`app-icon`. Controlled examples own state; sharing and media callbacks stay local.
Lucide SVG canvases for mini/small/regular/large/extra-large buttons are
14/16/20/26/32 pt inside 28/32/44/52/64 pt targets. All dimensions scale in rem.

The original room/gesture assets remain local in `apps/web/public/reference/`
under the existing agreement; source node IDs for re-export are documented in
`docs/research/visionos-reference.md`. Family coverage is separate from full visual
verification of every Figma variant.
