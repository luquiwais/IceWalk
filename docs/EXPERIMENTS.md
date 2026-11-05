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

## 2026-11-05: GP, Laplace contra EP

Datos sintéticos. Prior: media de `log d` -0.03, desvío 0.5, alcance 200 m. Respuesta exacta: 2 millones de muestras del prior pesadas por cada dato. Cada celda es `P(d ≤ 1 m)`.

| Caso | Distancia | Exacta | Laplace | EP |
| --- | --- | --- | --- | --- |
| Taladro no toca a 1 m | 0 m | 0.033 | 0.262 | 0.098 |
| | 50 m | 0.282 | 0.432 | 0.279 |
| | 150 m | 0.481 | 0.509 | 0.481 |
| Espectrómetro "no" | 0 m | 0.425 | **0.524, ignora el dato** | 0.379 |
| | 50 m | 0.446 | 0.524 | 0.438 |
| Espectrómetro "sí" | 50 m | 0.899 | 0.864 | 0.897 |
| 3 taladros no tocan, a 0, 60 y 120 m | 0 m | 0.023 | 0.269 | 0.078 |
| | 50 m | 0.029 | 0.286 | 0.058 |
| | 150 m | 0.198 | 0.394 | 0.196 |
| Cráter de 1.3 m y taladro no toca a 80 m | 50 m | 0.102 | 0.250 | 0.109 |

**Conclusión:** Laplace falla con las cotas, y a veces ignora un "no" porque su pico queda donde la cota no pesa. EP iguala media y desvío de la respuesta exacta, con diferencia ≤ 0.006 en estos casos. Su `P(d ≤ 1 m)` queda corrida hasta ~0.07 en la celda de una cota y a pocos metros: la distribución real está truncada y EP la aproxima con una gaussiana.

Script crudo, EP secuencial con 500 datos: 10.1 s. **Descartado:** en el código, EP actualiza todos los datos a la vez.

## 2026-11-05: GP, tiempos de `model/gp/`

Compu de desarrollo, sin GPU. **Todavía no se midió en el free tier.** Datos al azar: un tercio cráteres, dos tercios cotas. Grilla completa: 762 928 celdas. Ventana: ±900 m, 32 400 celdas.

| Datos | Iteraciones | Ajuste | Ventana | Grilla completa |
| --- | --- | --- | --- | --- |
| 20 | 16 | 0.003 s | 0.03 s | 0.6 s |
| 100 | 16 | 0.008 s | 0.12 s | 2.9 s |
| 200 | 16 | 0.032 s | 0.26 s | 6.1 s |
| 500 | 17 | 0.27 s | 0.84 s | 17.5 s |
| 1000 | 20 | 1.30 s | 1.79 s | 40.4 s |

**Conclusión:** `/replan` tiene que actualizar por ventana: la grilla completa ya supera los 2 s propuestos con 100 datos. Hasta 500 datos, ajuste más ventana da unos 1.1 s en esta compu.

## 2026-11-05: tabla de cráteres de Dundas 2023

| Prueba | Resultado | Conclusión |
| --- | --- | --- |
| `X, Y` como píxeles directos del orto de ESP_073077, 12 cráteres grandes con fondo plano | **Falló**: no se ven cráteres centrados | No están en píxeles del orto |
| `X, Y` como muestra y línea del RED, llevados al orto con la proyección del label | **Falló**: tampoco quedan centrados | Puede haber un corrimiento entre RED y orto, o ser otro marco |
| Cruzar los puntos con un mapa de sombras, a ~1 m/px, 8 orientaciones | **Sin resultado**: picos de z 5.3-6.2; con puntos desordenados, 5.7-6.1 | La prueba no encuentra el marco, aunque también puede ser demasiado débil |
| Las dimensiones | `X` hasta 26 465 e `Y` hasta 43 530, dentro del RED (26 963 × 49 909). Extensión de 5.5 × 10.7 km si el píxel es de 0.25 m | Indicio a favor del RED, no prueba |
| **`X, Y` directo sobre la imagen RED**, con la imagen bajada | **Funcionó:** los 12 cráteres con fondo plano más grandes salen centrados; 300 píxeles más allá, no | **`X, Y` son muestra y línea del RED** |
| Corrimiento RED-orto, 12 centros a lo largo de la franja | 40-53 m al oeste y 92-150 m al norte; varía con la posición. Con un ajuste lineal, residuo de 0.5-1 m | Por eso fallaban las pruebas sobre el orto: los recuadros cubrían ±17.5 m |
| Los 12 cráteres, llevados a la grilla y mirados en el orto | Centrados | Catálogo en grilla confiable |

Los 349 cráteres caen dentro de la grilla, entre 210 y 6731 m del cráter principal. Vecino más cercano: mediana de 93 m. **Cobertura:** el 10 % de la grilla está a menos de 100 m de un cráter; el 27 %, a menos de 200 m; el 49 %, a menos de 400 m.

Catálogo y scripts, fuera de Git: `data/processed/s1094b/craters_dundas2023.csv` y `analysis/`. Falta pasarlos a `model/gp/` con tests.

**Primera mirada a la estructura espacial.** Provisoria: usa distancias relativas y supone píxel de 0.25 m. No usa las cotas, ni corrige la selección por tamaño. La prueba con todos los datos está más abajo.

Semivarianza de `log d`, con 48 cráteres de fondo plano. Varianza total 0.072; de ella, ~0.030 es error de 1 píxel. La banda es de 1000 permutaciones.

| Distancia | Semivarianza | Pares | Banda 5-95 % al azar |
| --- | --- | --- | --- |
| 0-100 m | 0.214 | 9 | 0.019-0.155 |
| 100-200 m | 0.116 | 4 | 0.014-0.167 |
| 200-400 m | 0.077 | 14 | 0.036-0.119 |
| 400-800 m | 0.098 | 76 | 0.051-0.096 |
| 800-1600 m | 0.085 | 195 | 0.059-0.088 |
| 1600-3200 m | 0.073 | 488 | 0.066-0.078 |
| 3200-12000 m | 0.053 | 342 | 0.057-0.088 |

Si hubiera estructura, los cráteres cercanos se parecerían más y la semivarianza subiría con la distancia. **No se ve eso.** Tener o no fondo plano, descontado el tamaño, tampoco se aparta de la banda al azar en ninguna distancia (349 cráteres).

**Conclusión:** a partir de ~200 m no aparece estructura; por debajo hay muy pocos pares para decir algo.

## 2026-11-05: prueba de estructura con los 349 cráteres

**Modelo:** `log d = media + campo espacial + ruido independiente`. `rho` es la parte espacial de la varianza; `rho = 0` es sin estructura. Se usa la evidencia de EP, validada contra soluciones exactas (coincide en 6 decimales) y contra muestreo (-4.2211 contra -4.2227). Media y varianza se fijan en las del modelo sin estructura.

**Ajuste sin estructura:**

| | `0.1 × D` | `0.2 × D` |
| --- | --- | --- |
| Mediana de `d` | 1.07 m | 2.35 m |
| Desvío de `log d` | 0.15 | 0.55 |
| `P(d ≤ 1 m)` | 0.31 | 0.06 |
| Cráteres con fondo plano donde `d` supera la cota (incoherentes con la regla) | 75 % | 0 % |
| Fondo plano esperado contra observado, D de 5-6 m | 0.00 / 0.03 | 0.08 / 0.03 |
| D de 7-8 m | 0.01 / 0.19 | 0.19 / 0.19 |
| D de 8-10 m | 0.08 / 0.41 | 0.28 / 0.41 |
| D ≥ 10 m | 0.64 / 0.64 | 0.49 / 0.64 |

**`0.2 × D` es coherente con los datos y `0.1 × D` no.** Control independiente: de 349 cráteres, el 8 % tiene fondo plano con `d ≤ 1 m`, cerca del 6 % del ajuste. Con `0.2 × D`, el modelo da `P(d ≤ 2 m)` ≈ 0.38 y `P(d ≤ 3 m)` ≈ 0.67. Supone una lognormal para todo el sitio, así que son órdenes de magnitud.

**Ventaja del modelo con estructura (log Z contra sin estructura), `0.2 × D`:**

| | 100 m | 200 m | 400 m | 800 m | 1600 m | 3200 m |
| --- | --- | --- | --- | --- | --- | --- |
| `rho` 0.5 | +0.98 | +0.67 | -0.31 | -2.47 | -5.18 | -6.26 |
| `rho` 0.9 | +0.54 | -2.58 | -9.11 | -19.03 | -30.35 | -38.27 |

Contra 300 permutaciones: mejor ventaja observada 0.98, p = 0.09. El 95 % del azar llega a 1.48.

**Potencia, `0.2 × D`:** veces que detecta un campo simulado con estructura conocida, sobre 30.

| Alcance | 100 m | 200 m | 400 m | 800 m | 1600 m |
| --- | --- | --- | --- | --- | --- |
| `rho` 0.5 | 13 | 13 | 21 | 29 | 29 |
| `rho` 0.8 | 20 | 28 | 30 | 30 | 30 |

**Con `0.1 × D`, la prueba no sirve:** detecta como máximo 2 de 30, porque esa regla casi no genera fondos planos. Su resultado (ventaja -0.67, p = 0.98) no dice nada.

**Conclusión:** no hay estructura espacial fuerte a escala del sitio, y sí potencia para verla: alcances ≥ 400 m con estructura marcada quedan descartados. Puede existir estructura débil de 100-200 m: hay un indicio no significativo, y ahí la potencia es solo parcial. **Un dato informa a lo sumo unos 100-200 m a su alrededor.** No se probó el efecto de variables locales (pendiente, THEMIS), que podrían explicar parte de la variación.

## 2026-11-05: código del GP

| Prueba | Resultado |
| --- | --- |
| Tests de `model/` | 100 pasan: 52 anteriores y 48 del GP |
| `contracts/validate.py` | No se corrió: no se tocó ningún contrato |

Los tests del GP usan datos sintéticos. Los datos reales se analizaron en las secciones anteriores, con scripts que todavía no están en el repo ni tienen tests.
