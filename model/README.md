# model/

Dueño: IA y modelo.

## Contrato de salida

`model.predict(measurements) -> (p_ice, uncertainty)` sobre la grilla de `contracts/grid.json` (float32, 10 m).
Debe actualizarse con una medición nueva en milisegundos (sin re-entrenar).

## Componentes

| Archivo previsto | Qué hace |
| --- | --- |
| `gp/` | Prior regional, GP local, valor de medir, validación y simulación. Plan: [`docs/plans/gp.md`](../docs/plans/gp.md) |
| `vision/` | Bloques, pasillos, formas del terreno, zonas y hielo expuesto. Plan: [`docs/plans/vision.md`](../docs/plans/vision.md) |

## Visión (`vision/`)

Corre antes de la EVA, sobre imágenes orbitales de HiRISE, y se precalcula una vez por sitio. No corre en vivo ni usa video del astronauta: durante la EVA, las capas ya están cargadas.

Salida en `data/processed/s1094b/`: las capas listadas en el plan (COG sobre `contracts/grid.json`), más `boulders.geojson` (`contracts/schemas/boulders.schema.json`) y `manifest.json`.

Para leer las capas de costo:

- `0` significa "nada detectado sobre `detection_limit_m`", no "terreno libre".
- `nodata` es fuera de la huella de la imagen: tratarlo como desconocido.
- Visión mide; el ancho mínimo de pasillo lo define el planificador (`"assumption": true`).

```bash
cd model
uv sync --extra dev                    # o: pip install -e ".[dev]"
uv run python -m vision.mock_layers    # capas FALSAS (is_mock) para integrar ya
uv run ruff check . && uv run pytest -q
```

## Primeros pasos

1. Bajar el catálogo de Zenodo y las capas SWIM (`python data/download.py --list`).
2. Extraer features en la posición de cada cráter y entrenar el prior regional.
3. Validar dejando S1094b afuera.
