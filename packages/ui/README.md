# packages/ui/

Dueño: Frontend. Sistema de diseño de IceWalk (`@icewalk/ui`): componentes y tokens con estilo visionOS, sobre [Base UI](https://base-ui.com) y Tailwind CSS v4. Se publica como código TypeScript (sin build); `apps/web` lo transpila con `transpilePackages`.

```bash
bun run moon run ui:lint ui:typecheck ui:test
```

## Diseño: visionOS 26, 1:1 con el kit de Apple

Los tokens y componentes salen del kit oficial de Apple en Figma, [visionOS 26 (Community)](https://www.figma.com/design/TE1ta1HNhtbwSZn3LztSL5/visionOS-26--Community-): páginas Colors, Materials, Text Styles, Buttons, Segmented Controls, Toolbars, Lists y Tooltips. Las guías de Apple de referencia son las [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos).

**Cómo se replican los materiales.** En visionOS cada material es una pila de capas con modos de fusión (`lighten`, `color-dodge`, `color-burn`, `luminosity`). La web tiene los mismos modos, así que las capas se copian tal cual (`src/material.tsx` + clases `vision-*` en `src/theme.css`). Una capa solo se funde con lo que está detrás si ningún ancestro crea un *stacking context*: en superficies y controles **no usar** `transform`, `opacity`, `filter`, `z-index` ni `position: sticky/fixed`.

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

**Estimados** (el kit no exporta el valor; se calibraron midiendo la página Materials): texto secundario y terciario, estado Pinch (presionado) y material Thick. Están marcados en `src/theme.css`.

Reglas del PRD que se mantienen: números reales siempre visibles (`Metric`, con `tabular-nums`), alertas en tres niveles con nombre en texto (`StatusBadge`) y terminología NASA en inglés.

Accesibilidad: con "Reducir transparencia" el vidrio pasa a opaco y con "Aumentar contraste" el texto secundario pasa a blanco plano. Foco visible en todos los controles.

El vidrio baja el contraste. Va bien en Planning; para la vista EV (luz fuerte) conviene usar paneles más sólidos.

Referencias de implementación: [vercel-labs/claude-managed-agents-starter](https://github.com/vercel-labs/claude-managed-agents-starter) (Next 16 + Base UI + `cn()` + `cva`) y [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines).

