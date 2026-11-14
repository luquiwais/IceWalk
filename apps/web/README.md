# apps/web/

Dueño: Frontend. App web de IceWalk: globo y terreno 3D, vista Planning y vista EV.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** (strict).
- **Tailwind CSS v4** con los tokens del diseño en `app/globals.css`.
- **`@icewalk/ui`** (`packages/ui`): sistema de diseño propio con estilo visionOS, sobre Base UI.
- **Bun** como gestor de paquetes y para correr los scripts. No usar npm ni pnpm.
- **Vitest** + Testing Library para los tests.
- Pendiente: CesiumJS para el globo y el terreno (ver abajo). Zustand, cuando haya estado compartido entre vistas.

## Comandos

Desde la raíz, con moon (cachea y es lo mismo que corre CI):

```bash
bun run moon run web:dev                      # http://localhost:3000
bun run moon run web:lint web:typecheck web:test web:build
```

Contra la API local: levantá el planificador (`cd apps/planner && uvicorn app.main:app --reload`, puerto 8000) y poné `NEXT_PUBLIC_PLANNER_API_URL=http://localhost:8000` en `apps/web/.env.local` (plantilla en `.env.example`); se lee al arrancar `dev` o en el `build`.
Sin esa variable, o si la API no responde, la web usa `mock/` y lo dice (`source: "mock"` en `lib/use-plan-session.ts`, texto en el Mission brief).

O directo en la carpeta:

```bash
cd apps/web
bun install          # o desde la raíz: bun install (workspaces)
bun run dev          # http://localhost:3000
bun run test         # tests (vitest run)
bun run lint
bun run typecheck
bun run build
```

## Estructura

```
apps/web/
├── app/                  # rutas (App Router), layout y globals.css
├── components/planning/  # vista Planning
├── lib/                  # format.ts (números y duraciones), plan.ts (tipos del contrato)
└── mock/                 # respuestas del contrato para arrancar sin API
```

`mock/` lo genera `apps/planner/scripts/export_mocks.py`: no editar a mano.

- `plan.json`: plan inicial (estaciones, ruta GeoJSON, timeline, ramas, equipo, resumen).
- `measurement.json`: medición negativa en la primera estación.
- `replan.json`: plan después de esa medición (la escena clave de la demo).

`lib/plan.ts` tipa `packages/contracts/schemas/plan.schema.json`. Si cambia el contrato, se actualiza en el mismo PR.

## Sistema de diseño

Los componentes y tokens están en [`packages/ui`](../../packages/ui/README.md) (`@icewalk/ui`). La app los importa como `@icewalk/ui/button`, `@icewalk/ui/window`, etc., y carga los tokens con `@import "@icewalk/ui/theme.css"` en `app/globals.css`.

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
