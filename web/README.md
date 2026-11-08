# web/

Dueño: Frontend. App web de IceWalk: globo y terreno 3D, vista Planning y vista EV.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict).
- **Tailwind CSS v4** con los tokens del diseño en `app/globals.css`.
- **Base UI** (`@base-ui/react`) como primitivas accesibles; los componentes de `components/ui/` son propios, con estilo visionOS.
- **Bun** como gestor de paquetes y para correr los scripts. No usar npm ni pnpm.
- **Vitest** + Testing Library para los tests.
- Pendiente: CesiumJS para el globo y el terreno (ver abajo). Zustand, cuando haya estado compartido entre vistas.

## Comandos

Desde la raíz, con moon (cachea y es lo mismo que corre CI):

```bash
bun run moon run web:dev                      # http://localhost:3000
bun run moon run web:lint web:typecheck web:test web:build
```

O directo en la carpeta:

```bash
cd web
bun install
bun run dev          # http://localhost:3000
bun run test         # tests (vitest run)
bun run lint
bun run typecheck
bun run build
```

## Estructura

```
web/
├── app/                  # rutas (App Router), layout y globals.css (tokens)
├── components/ui/        # sistema de diseño: Window, Ornament, Button, ToggleButton,
│                         #   SegmentedControl, StatusBadge, Metric, Tooltip
├── components/planning/  # vista Planning
├── lib/                  # format.ts (números y duraciones), plan.ts (tipos del contrato)
└── mock/                 # respuestas del contrato para arrancar sin API
```

`mock/` lo genera `planner/scripts/export_mocks.py`: no editar a mano.

- `plan.json`: plan inicial (estaciones, ruta GeoJSON, timeline, ramas, equipo, resumen).
- `measurement.json`: medición negativa en la primera estación.
- `replan.json`: plan después de esa medición (la escena clave de la demo).

`lib/plan.ts` tipa `contracts/schemas/plan.schema.json`. Si cambia el contrato, se actualiza en el mismo PR.

## Sistema de diseño: estilo visionOS

Basado en las guías de Apple (Human Interface Guidelines), adaptadas a la web:

| Guía de Apple | Cómo se aplica |
| --- | --- |
| [Materials > visionOS](https://developer.apple.com/design/human-interface-guidelines/materials#visionOS): las ventanas son de vidrio, translúcido, sin fondos opacos | `material-glass` + `glass-rim` (blur, saturación, borde con luz y sombras en capas). `material-regular` y `material-thick` separan secciones dentro de una ventana |
| Vibrancy: `label`, `secondaryLabel`, `tertiaryLabel` | Colores `label`, `label-secondary`, `label-tertiary` (blanco con distinta opacidad) |
| [Buttons > visionOS](https://developer.apple.com/design/human-interface-guidelines/buttons#visionOS): material fino sobre vidrio; cápsula o círculo; tamaños 28/32/44/52/64 | `Button` con `variant` (`default`, `glass`, `borderless`), `shape` y `size` (`mini` … `extra-large`) |
| El fondo blanco con texto oscuro queda reservado para el estado activado | `ToggleButton` presionado y la opción elegida de `SegmentedControl` |
| [Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments): controles frecuentes en una cápsula de vidrio junto a la ventana | `Ornament` (toolbar con flechas del teclado) |
| [Color > visionOS](https://developer.apple.com/design/human-interface-guidelines/color#visionOS): color con moderación, en texto en negrita y áreas grandes | Escala neutra; color solo para alertas y estado (también lo pide el PRD) |
| [Typography > visionOS](https://developer.apple.com/design/human-interface-guidelines/typography#visionOS): SF Pro, cuerpo y títulos más gruesos | Fuente del sistema (SF Pro en Apple), Inter de respaldo; cuerpo en peso 500 |

Reglas del PRD que se mantienen: números reales siempre visibles (`Metric`, con `tabular-nums`), alertas en tres niveles con nombre en texto (`StatusBadge`: advisory, caution, warning) y terminología NASA en inglés.

Accesibilidad: con "Reducir transparencia" el vidrio pasa a opaco y con "Aumentar contraste" suben las etiquetas secundarias. Foco visible en todos los controles.

El vidrio baja el contraste. Va bien en Planning; para la vista EV (luz fuerte) conviene usar paneles más sólidos.

Referencias de implementación: [vercel-labs/claude-managed-agents-starter](https://github.com/vercel-labs/claude-managed-agents-starter) (Next 16 + Base UI + `cn()` + `cva`) y [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines).

## Marte en Cesium (verificado, pendiente de integrar)

CesiumJS 1.133+ trae `Cesium.Ellipsoid.MARS`. Para el globo, Cesium Mars (3D Tiles en Cesium ion, terreno global de 200 m). Para el sitio, nuestro DTM de 1 m.

```ts
Cesium.Ellipsoid.default = Cesium.Ellipsoid.MARS;
const viewer = new Cesium.Viewer("cesiumContainer", {
  globe: false, sceneModePicker: false, baseLayerPicker: false, geocoder: false,
});
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(3644333); // Cesium Mars
viewer.scene.primitives.add(tileset);
```

Requiere cuenta gratuita de Cesium ion (token en `.env`, nunca en Git) y respetar su atribución. En Next.js, el visor se carga solo en el cliente y los assets estáticos de Cesium se sirven desde `public/`. Plan B para el terreno del sitio: malla de altura con three.js desde el DTM.

## Vistas

- **Planning** (MVP): mapa con capas, editor de STM, fichas de estación, timeline, ramas. Hoy: base con el plan de `mock/plan.json` sobre un fondo provisorio.
- **EV** (MVP acotado): sobre el terreno 3D en primera persona; próxima estación, rumbo, distancia, margen, alertas, checklist, cargar medición.
