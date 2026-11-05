# Lo que se probó

Registro de pruebas con datos reales, **incluidas las que salieron mal**. Antes de probar algo, mirá acá.

Formato: qué se probó, con qué, resultado, y qué se concluye.

## 2026-11-04: visión, datos reales

| Prueba | Datos | Resultado | Conclusión |
| --- | --- | --- | --- |
| Abrir JP2 con `rasterio` en Windows | Orto 1 m | Abre, GDAL 3.12.2 | No hace falta GDAL de sistema |
| Centro de grilla viejo sobre el cráter | Orto 1 m | Solo terreno; el cráter queda ~1.8 km al NE | Grilla corregida a 35.1105°N, 189.8273°E (a ojo, ±~15 m) |
| Comparar label y `grid.json` | Labels PDS | HiRISE usa R = 3389574.35 m; la grilla tenía 3396190 m | Corregido. MOLA-HRSC sí usa 3396190 m |
| Ubicar el cráter por contraste | Orto 1 m | **Falló**: fue a una línea negra | Las líneas de valor 0 engañan: usar `imagery.valid_mask` |
| Ubicar por sombra interior | Orto 1 m | Sirvió, y se confirmó a ojo | Método usado para el centro |
| Sentido del sol | Label y recorte | Sombra interior al oeste, como predice el label | `pds.py` correcto |
| Alinear con un único corrimiento | 4 fechas | **Falló**: dispersión alta | Hace falta grueso + fino |
| Tratar los RDR como 8 bits | Dic 2022, abr 2024 | **Falló**: la conversión los rompe; son de 16 bits | `crops.py` conserva el tipo |
| Alineación grueso + fino, 0.5 m/px contra abr 2022 | Ver abajo | Ver abajo | Falta alinear por zona |
| Imagen de 2024 sobre el cráter | RED y COLOR de ESP_083099 | **Sin datos justo sobre el cráter** | Usar ESP_077719 (feb 2023) |

| Imagen | Corrimiento | Dispersión | Correlación | A ojo |
| --- | --- | --- | --- | --- |
| Feb 2022 | 0.1 m | 0.20 px | 0.93 | Coincide |
| Dic 2022 | 133.8 m | 7.26 px | 0.35 | Bien sobre el cráter |
| Feb 2023 | 94.0 m | 8.81 px | 0.37 | Bien; se reconocen los mismos rasgos |
| Abr 2024 | 164.2 m | 17.11 px | 0.19 | No sirve cerca del cráter |

## 2026-11-04: código

| Prueba | Resultado |
| --- | --- |
| Tests de `model/` | 52 pasan |
| Tests de `planner/` | 6 pasan |
| `contracts/validate.py` | Pasa; 28 capas |
| Mock completo, 5000 objetos | ~8 s; 5 de 739 668 celdas con pasillo < 1.02 m |

Los tests usan datos sintéticos. El detector de bloques **todavía no existe**: ninguna métrica de detección está medida.

## 2026-11-04: GP (agente, juguete, no es el modelo final)

| Prueba | Resultado |
| --- | --- |
| Laplace con 2 mediciones | Varianza 0.654 (sí, sí) y 0.559 (sí, no); probabilidad 0.784 y 0.577 |
| Tiempo, grilla 500 × 1500, ingenuo | Laplace 3-8 ms; grilla 0.37-2.5 s; ventana ±900 m 16-110 ms |
