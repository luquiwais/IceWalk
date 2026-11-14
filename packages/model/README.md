# packages/model/

Dueño: IA y modelo.

## Contrato de salida

`model.predict(measurements) -> (p_ice, uncertainty)` sobre la grilla de `packages/contracts/grid.json` (float32, 10 m).
Debe actualizarse con una medición nueva en milisegundos (sin re-entrenar).

## Componentes

| Archivo previsto | Qué hace |
| --- | --- |
| `gp/` | Prior regional, GP local, valor de medir, validación y simulación. Plan: [`docs/plans/gp.md`](../../docs/plans/gp.md) |
| `vision/` | Bloques, pasillos, formas del terreno, zonas y hielo expuesto. Plan: [`docs/plans/vision.md`](../../docs/plans/vision.md) |

## Visión (`vision/`)

Corre antes de la EVA, sobre imágenes orbitales de HiRISE, y se precalcula una vez por sitio. No corre en vivo ni usa video del astronauta: durante la EVA, las capas ya están cargadas.

Salida en `data/processed/s1094b/`: las capas listadas en el plan (COG sobre `packages/contracts/grid.json`), más `boulders.geojson` (`packages/contracts/schemas/boulders.schema.json`) y `manifest.json`.

Para leer las capas de costo:

- `0` significa "nada detectado sobre `detection_limit_m`", no "terreno libre".
- `nodata` es fuera de la huella de la imagen: tratarlo como desconocido.
- Visión mide; el ancho mínimo de pasillo lo define el planificador (`"assumption": true`).

```bash
cd packages/model
uv sync --extra dev --extra vision     # o: pip install -e ".[dev,vision]"
uv run ruff check . && uv run pytest -q

# Imágenes y labels (data/raw/, fuera de Git): ~500 MB
python ../../data/download.py --only hirise_ortho_25cm hirise_ortho_label hirise_feb2022_ortho_25cm hirise_feb2022_label

# Capas y catálogo REALES de la zona de la EVA, en data/processed/s1094b/ (~15 min)
uv run python -m vision.run --site s1094b
# O bajarlas ya hechas (0.5 MB) y descomprimir en data/processed/:
#   https://github.com/guidojacoo/IceWalk/releases/download/vision-s1094b-2026-11-13/icewalk-vision-s1094b-2026-11-13.zip
# Capas FALSAS (is_mock) para integrar sin imágenes: siempre en otra carpeta
uv run python -m vision.mock_layers --out ../../data/processed/s1094b-mock
```

| Módulo de `vision/` | Qué hace |
| --- | --- |
| `boulders.py` | Detector de bloques por sombras: posición, diámetro y altura, por teselas y en una o dos fechas |
| `catalog.py` | Cruza las dos fechas (`persistent`, `single_epoch`, `not_visible_latest`) y arma `boulders.geojson` |
| `rasterize.py` | Catálogo → capas de costo, con el ancho del mejor pasillo por celda |
| `run.py` | Todo junto: `python -m vision.run`, con `manifest.json` por corrida |
| `labels.py`, `evaluate.py` | Recortes para anotar a mano en QGIS; F1 contra las etiquetas y distribución de tamaños contra Tusberti et al. |
| `synthetic.py` | Escenas sintéticas con verdad de terreno conocida, para los tests |
| `pds.py`, `crops.py`, `coregister.py`, `imagery.py`, `grid.py` | Labels PDS, recortes en la grilla, alineación entre fechas |
| `mock_layers.py` | Capas y catálogo falsos con la forma final |

Medir el detector:

```bash
uv run python -m vision.labels                    # recortes para anotar en QGIS (data/raw/vision/labels/)
uv run python -m vision.evaluate labels --name test_eva      # F1 para diámetro >= 2 m
uv run python -m vision.run --zone tusberti --image ESP_073077_2155 --out ../../data/processed/s1094b-tusberti
uv run python -m vision.evaluate sfd --catalog ../../data/processed/s1094b-tusberti/boulders.geojson --radius 564.19
```

Grupos de dependencias:

| Grupo | Qué trae | Quién lo necesita |
| --- | --- | --- |
| (núcleo) | numpy, scipy | El GP: `gp.posterior`, `gp.observations`, `gp.craters`, `gp.simulation`, `gp.validation`. Es lo que instala el planificador |
| `vision` | rasterio, scikit-image | `vision/`, `gp.covariates` y `gp.craters.red_table_to_grid` |
| `ml` | torch, timm | Solo la variable de textura (DINOv2) de `gp.covariates` |
| `dev` | pytest, ruff, jsonschema, pyyaml | Tests y lint; los tests de visión piden también `vision` |

## Primeros pasos

1. Bajar el catálogo de Zenodo y las capas SWIM (`python data/download.py --list`).
2. Extraer features en la posición de cada cráter y entrenar el prior regional.
3. Validar dejando S1094b afuera.
