# web/

Dueño: Frontend. React + Vite + TypeScript + CesiumJS + Zustand + Tailwind.

## Arrancar sin API

`web/mock/` tiene respuestas reales del contrato (generadas por `planner/scripts/export_mocks.py`):

- `plan.json`: plan inicial (estaciones, ruta GeoJSON, timeline, ramas, equipo, resumen).
- `measurement.json`: medición negativa en la primera estación.
- `replan.json`: plan después de esa medición (la escena clave de la demo).

## Marte en Cesium (verificado)

CesiumJS 1.133+ trae `Cesium.Ellipsoid.MARS`. Para el globo, Cesium Mars (3D Tiles en Cesium ion, terreno global de 200 m). Para el sitio, nuestro DTM de 1 m.

```ts
Cesium.Ellipsoid.default = Cesium.Ellipsoid.MARS;
const viewer = new Cesium.Viewer("cesiumContainer", {
  globe: false, sceneModePicker: false, baseLayerPicker: false, geocoder: false,
});
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(3644333); // Cesium Mars
viewer.scene.primitives.add(tileset);
```

Requiere cuenta gratuita de Cesium ion (token en `.env`, nunca en Git) y respetar su atribución.
Plan B para el terreno del sitio: malla de altura con three.js desde el DTM.

## Vistas

- **Planning** (MVP): mapa con capas, editor de STM, fichas de estación, timeline, ramas.
- **EV** (MVP acotado): sobre el terreno 3D en primera persona; próxima estación, rumbo, distancia, margen, alertas, checklist, cargar medición.
