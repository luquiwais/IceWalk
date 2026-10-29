# model/

Dueño: IA y modelo.

## Contrato de salida

`model.predict(measurements) -> (p_ice, uncertainty)` sobre la grilla de `contracts/grid.json` (float32, 10 m).
Debe actualizarse con una medición nueva en milisegundos (sin re-entrenar).

## Componentes

| Archivo previsto | Qué hace |
| --- | --- |
| `regional.py` | Clasificador con el catálogo de cráteres nuevos (Daubar 2022) y capas SWIM como features |
| `units.py` | Clustering de todas las capas → unidades de terreno |
| `anomalies.py` | Detección de anomalías en HiRISE |
| `gp_local.py` | Proceso gaussiano: prior regional + features locales + mediciones |
| `boulders.py` | Detección de bloques (red o sombras) |
| `validate_regional.py` | Validación por bloques espaciales, ROC, Brier, calibración |
| `simulate.py` | 500 Martes simulados, comparación de 4 estrategias |

## Primeros pasos

1. Bajar el catálogo de Zenodo y las capas SWIM (`python data/download.py --list`).
2. Extraer features en la posición de cada cráter y entrenar el prior regional.
3. Validar dejando S1094b afuera.
