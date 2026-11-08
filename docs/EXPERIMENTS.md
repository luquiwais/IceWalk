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

## 2026-11-08: simulación del paso 7, ¿elegir dónde medir rinde más?

Código: `model/gp/simulation.py`, con tests. Resultados en `data/processed/s1094b/simulation.json`, fuera de Git.

**Cómo:** 60 mundos por escenario, sacados del modelo ajustado (media de `log d` 0.86, varianza 0.299, mitad espacial con alcance de 100 m y mitad nugget) y condicionados a los cráteres. Tres hábitats, con 157, 133 y 25 cráteres cerca. EVA de 6 estaciones, presupuesto de 8 km ida y vuelta, radio de 2 km, candidatas cada 100 m, herramienta de 1 m o 3 m. Siete estrategias en los mismos mundos; las diferencias van contra "repartida" (tipo grilla), con intervalo del 90 %. Todos los valores de la EVA son supuestos.

**Hielo confirmado por EVA (estaciones con hielo dentro del alcance, de 6):**

| Hábitat (cráteres cerca) | Alcance | Repartida | Blancos | Potencial + incertidumbre | Información | Máx. incertidumbre |
| --- | --- | --- | --- | --- | --- | --- |
| (-600, 2600) (157) | 1 m | 0.63 | 1.17 (+0.53 [0.26, 0.81]) | 1.17 (+0.53) | 1.02 (+0.38) | 0.28 (-0.35) |
| (-600, 2600) (157) | 3 m | 3.98 | 5.25 (+1.27 [0.96, 1.57]) | 5.37 (+1.38 [1.08, 1.68]) | 3.58 (-0.40) | 4.07 (+0.08) |
| (300, -2200) (133) | 1 m | 0.23 | 0.62 (+0.38 [0.21, 0.56]) | 0.62 (+0.38) | 0.57 (+0.33) | 0.45 (+0.22) |
| (300, -2200) (133) | 3 m | 3.82 | 4.75 (+0.93 [0.60, 1.26]) | 4.68 (+0.87) | 3.68 (-0.13) | 4.20 (+0.38) |
| (-300, -4600) (25) | 1 m | 0.30 | 0.40 (+0.10 [-0.12, 0.32]) | 0.40 | 0.40 | 0.22 |
| (-300, -4600) (25) | 3 m | 4.13 | 3.97 (-0.17 [-0.55, 0.21]) | 3.97 | 4.05 | 4.10 |

Con alcance de 1 m, la chance de confirmar al menos un punto con hielo sube de 0.47 a 0.77 en el primer hábitat y de 0.18 a 0.50 en el segundo.

**Verdad distinta del modelo** (alcance real de 200 m y 80 % espacial; el modelo sigue suponiendo 100 m y 50 %), alcance de 3 m: blancos y potencial + incertidumbre ganan +1.3 a +2.0 puntos con hielo en los tres hábitats, incluido el de 25 cráteres. "Información" pierde entre 0.5 y 1.05.

**Ambigüedad del sitio entero:** ninguna estrategia la baja más de ~0.12 %. Con alcance corto, una EVA no cambia el mapa del sitio.

**Conclusión:**
- **Apuntar a los puntos con más potencial, contando la incertidumbre, sí rinde más que una grilla**: entre +0.9 y +1.4 puntos con hielo de 6 donde hay cráteres cerca, y la chance de confirmar hielo a 1 m se multiplica por 1.6 a 2.8.
- Donde casi no hay cráteres, no hay ventaja con el modelo ajustado. Si el hielo tiene más estructura que la estimada, la ventaja crece y aparece también ahí.
- **Elegir "donde más se aprende" o "donde más incertidumbre hay" no le gana a la grilla.** La promesa del PRD de bajar la incertidumbre más que las estrategias simples no se sostiene.
- Potencial + incertidumbre y blancos dan casi lo mismo.

**Límites:** la verdad sale del mismo modelo, salvo en el caso distinto. Caminata en línea recta. El "próximo sitio" sale peor en blancos porque ya visitaron los mejores: es un efecto de la métrica. Son 60 mundos por escenario.

## 2026-11-08: ¿alguna variable del terreno predice la profundidad?

Código en el repo: `model/gp/craters.py`, `covariates.py` y `covariate_test.py`. Resultados en `data/processed/s1094b/covariate_test.json`, fuera de Git.

**Cómo:** modelo de `log d` sin estructura espacial (los cráteres casi no la tienen), con fondos planos como profundidad medida y los demás como cota `d > 0.2 × D`. Validación cruzada en 5 pliegues de bloques de 2 km (96, 93, 62, 62 y 36 cráteres). La ganancia es la verosimilitud media por cráter que quedó afuera, frente al modelo sin variables. Control: 200 permutaciones de cada variable. Cada variable se mide alrededor del cráter, no sobre él.

| Variable | Dato | Ganancia/cráter | p | Azar 95 % |
| --- | --- | --- | --- | --- |
| Distancia al principal | Catálogo | -0.0047 | 0.84 | +0.0030 |
| Pendiente, anillo desde D | DTM de HiRISE, 1 m | +0.0068 | 0.01 | +0.0025 |
| Pendiente hacia el polo | DTM | -0.0007 | 0.29 | +0.0026 |
| Rugosidad | DTM | +0.0002 | 0.18 | +0.0026 |
| Inercia térmica | THEMIS, 100 m, previo al impacto | -0.0028 | 0.68 | +0.0053 |
| Textura, componentes 1 a 5 | DINOv2 ViT-S/14 sobre el orto de feb 2022 | -0.0063 a +0.0012 | 0.13 a 0.92 | - |
| Todas juntas | - | **-0.0205** | - | - |

**Control de la pendiente:** con el anillo desde 2D, ganancia +0.0041 (p = 0.04); desde 3D, +0.0006 (p = 0.17). La señal se apaga al alejarse del cráter, así que viene del borde o la eyecta del propio cráter, no del paisaje. Además, con 10 variables probadas, p = 0.01 corregido da ~0.1.

**Conclusión: ninguna variable mejora la predicción de forma robusta**, incluida la textura con IA. Todas juntas empeoran por sobreajuste. Coincide con la investigación (`research/indicadores-finos.md`). El detalle local del mapa sale de los cráteres y las mediciones; la base, del prior regional. Límites: un solo sitio, variables medidas a 30 m del cráter, textura con un modelo preentrenado sin ajustar, y formas del terreno sin mapear.

## 2026-11-05: código del GP

| Prueba | Resultado |
| --- | --- |
| Tests de `model/` | 100 pasan: 52 anteriores y 48 del GP |
| `contracts/validate.py` | No se corrió: no se tocó ningún contrato |

Los tests del GP usan datos sintéticos. Los datos reales se analizaron en las secciones anteriores, con scripts que todavía no están en el repo ni tienen tests.

## 2026-11-08: referencia visionOS, disabled, scroll y Safari (Codex)

| Prueba | Resultado | Conclusión |
| --- | --- | --- |
| Referencia Figma `420:4149` vs navegador a 1920×1080 | Ventana (320,180), 1280×720; tab bar (224,394), 68×292; se corrigieron sección +4pt y grabber −2pt | Geometría medida; no prueba de identidad de todos los componentes |
| Leer propiedades reales del borde | Degradados con cuatro paradas y transformaciones diferentes para ventana y tab bar | Se reemplazó el borde estimado; valores en `research/visionos-reference.md` |
| OS light frente a dark, web fijada en dark | Capturas byte a byte idénticas; color-scheme `dark only` | El tema no depende del sistema |
| Disabled de botones, toggles seleccionados, toolbar, tabs y segmentos | Se quitaron brillo activo, bordes/rellenos indebidos y se respetaron colores específicos | 39 tests UI + 6 web y lint/types/build pasaron en ese punto |
| Scroll de la sidebar anterior | material.top pasó de 159.8 a −60.2 al desplazar 220px | Fallo reproducido: material dentro del contenedor de scroll |
| `SurfaceScroll` con capas exteriores | material en (320,180,320,720), sin cambios tras scrollTop=250 | Aplicado a sidebar, ornament y Material scrolleable |
| Safari 27.0.1 real | Sidebar gris clara; Chromium correcto | Regresión de composición reproducida mediante la UI de Safari |
| Quitar overflow, añadir alpha mínimo al blur o forzar transform | No corrigió Safari | No repetir estas aproximaciones |
| `brightness(1)` en ambas capas Regular | Fondo negro incorrecto | No aplicar el filtro a todas las capas |
| `backdrop-filter: brightness(1)` solo en luminosidad | Safari recuperó el material oscuro; recarga y scroll verificados. Delta medio Chromium <0.00002/255 por canal | Filtro identidad para capturar el backdrop; no se cambian colores/opacidades de Figma |
| WebKit 27.2 headless temporal | No reprodujo la misma composición GPU; backdrop blur no equivalente | No sustituye la evidencia de Safari real |
| Campos/switch/checkbox: red → green | 4 fallos de comportamiento reproducidos con stubs; implementación final: 43 tests UI, tipos y lint pasan | Incluye búsqueda/limpieza, password disabled, Space en switch y envío de checkbox en formulario |
| Estado actual de build | Último build pasó antes de los últimos cambios de scroll, vibrancy, campos y corrección Safari | Repetir build al cerrar la siguiente unidad |

Los íconos SVG exportados sirvieron para medir. Eitan pidió después usar Lucide en
todos los casos y revisar sus tamaños. La auditoría de todo el kit y el playbook
completo todavía están pendientes.

### Playbook: cobertura, interacción y compatibilidad

| Prueba | Resultado |
| --- | --- |
| Navegar 30 familias en Chromium, desktop y móvil | 30/30 con ejemplos, sin overflow horizontal; se detectó y corrigió precedencia de utilidades Tailwind sobre el CSS responsive del playbook |
| Navegar 30 familias en WebKit aislado | 30/30, cero errores JS; cierre de alerta con Escape y material fijo al scroll; móvil sin overflow |
| Volver a conectar Safari real para el playbook nuevo | CUA falló dos veces al iniciar el pipe nativo; no se declara esta pasada verificada en Safari real |
| Comparar OS light/dark en Chromium | Capturas idénticas de Materials; SHA1 0ecf3afc706e5a5165804304e23b8a4a91cf1daa |
| Medir botones e iconos en 1920×1080 | Targets 28/32/44/52/64 y SVG Lucide 14/16/20/26/32; corregidos Large y Extra Large usando glyph bounds de Figma |
| Consultar Colors/* de Figma | La paleta heredada tenía valores distintos; tokens corregidos a paint styles actuales del archivo, conservando fills específicos de componentes |
| Tests de integración del playbook | Búsqueda, navegación, disabled e índice de 30 fuentes pasan; corrección del test: Base UI checkbox usa aria-disabled sobre span |
| Verificación final | 53 UI + 8 web tests; lint/tipos/build pasan; git diff --check limpio |

Evidencia temporal en `/tmp/icewalk-playbook-*.png` y
`/tmp/icewalk-playbook-webkit-report.json`. Los IDs fuente y conclusiones se
conservan en el repo y Brain para no depender de `/tmp`. La cobertura por familia
no prueba paridad visual de todas las variantes.

## 2026-11-08: planificador, transitabilidad sobre el DTM

DTM `DTEEC_073578_2155_073077_2155_A01`, copia COG controlada de USGS (radio 3396190 m), llevada a la grilla con `vision.grid` y reducida a 10 m (`app/traverse/terrain.py`, 14 s).

| Prueba | Resultado | Conclusión |
| --- | --- | --- |
| Alineación DTM–grilla | El punto más bajo cerca del centro cae en (5, 15) m | La copia controlada coincide con el centro del cráter de `grid.json` (error ~15 m) |
| Cobertura | 78.1 % de las celdas con dato; elevación −3960 a −3927 m | Las esquinas de la caja quedan sin dato, como se esperaba |
| Pendiente máxima por celda, base 2 m (lo que pedía el PRD) | Mediana 19.9°; **49.6 % de las celdas > 20°** | Domina el ruido: un sitio casi plano no puede estar medio prohibido |
| Llanura de 1 km², pendiente por píxel según base | > 20°: 2.6 % (2 m), 1.1 % (4 m), 0.3 % (6 m), 0.1 % (10 m), 0.05 % (20 m) | El ruido cae con la base, como √2·σz/base |
| Sobre el cráter, igual | > 20°: 3.5 % (2 m), 0.9 % (10 m), 0.8 % (20 m) | El relieve real se mantiene: el cráter sigue excluido |
| Pendiente máxima por celda, base 10 m | Mediana 9.6°, p99 18.9°; **0.53 % de celdas > 20°**: el cráter (136 celdas a < 100 m), otros cráteres (grupos de 41-140 celdas) y manchas sueltas de 1-3 celdas en la unidad rugosa del SE | Adoptado. Las manchas sueltas pueden ser artefactos: cuestión 40 |
| Rugosidad (desvío de un plano en 10 m) | Mediana 0.18 m, p99 0.45 m | Del orden de la precisión del DTM: no entra al costo todavía |
| Grafo de 8 vecinos sobre la grilla entera | 4.7 M aristas; carga + grafo 0.3 s; Dijkstra uno a todos 0.12 s; tramos siguientes desde el mismo punto ~3 ms | No hace falta A* ni recortar la grilla |
| Hábitat mock (−1200, −900) a las 6 estaciones mock | Rutas 1.01-1.08 × la recta, pendiente máxima en ruta 3.9-8.8°, ~2 km/h | El factor 1.3 del mock sobreestimaba |
| Ruta de borde a borde del cráter, (−200, 0) → (200, 0) | 450 m, rodea por el sur | La exclusión funciona |
| `/plan` y `/replan` con rutas reales | 1.07 s la primera vez (carga), 0.16 s `/replan`; 135 puntos de ruta; valida contra `plan.schema.json` | Dentro del umbral de 2 s propuesto |
| Sin capas del terreno (CI) | Vuelve a recta × 1.3, `routing: straight_line`; 19 tests pasan | El contrato no depende de los datos |

No verificado: el mapa FOM del DTM (calidad de correlación por píxel) y el relieve sombreado para buscar cajas o costuras; los coeficientes del costo metabólico para Marte.

## 2026-11-08: planificador real (GP + transitabilidad)

| Prueba | Resultado | Conclusión |
| --- | --- | --- |
| STM de S1094b, terreno real, sin catálogo de cráteres (solo prior) | 5 estaciones de taladro; P(hielo ≤ 1 m) = 0.058 en todas; la primera cae en el hábitat (empate: la más cercana); objetivo 3 (blancos en el cráter) no entra; margen mínimo 5.5 min; valida contra el esquema | Sin cráteres el plan es estructuralmente correcto pero casi no informa (cuestión 42) |
| Ramas con solo prior | `ice` sigue a 100 m (delimitar); `no_ice` se aleja | Un sí y un no cambian el plan, como pide el criterio de aceptación del GP |
| Reducción esperada de ambigüedad en toda la zona alcanzable | ~0 % | Coincide con Luqui: una EVA no cambia el mapa del sitio entero (alcance 100-200 m) |
| Terreno sintético con un grupo de cráteres de fondo plano a 0.3 m | Primera estación de hielo a < 200 m del grupo, P > 0.5; estaciones separadas ≥ 50 m; objetivos 2 y 4 en la estación más confiable | La selección hace lo esperado |
| Tiempo con 349 cráteres sintéticos en el terreno real | Plan con ramas 1.1 s; re-plan 0.9 s; el 65 % es el reajuste del GP en cada believer | Dentro del umbral de 2 s propuesto |

No verificado: el plan con el catálogo real de cráteres, que no está en este equipo.
| Reordenar la ruta (2-opt + mover una estación), 4 juegos de 349 cráteres sintéticos en el terreno real | 1 de 4 mejora: −0.45 km, −14 min, margen mínimo de 5 a 19 min; en los otros 3 el orden codicioso ya era el mejor (3-4 estaciones de taladro). Sin costo de tiempo | Se mantiene: protege el margen cuando la elección zigzaguea |
| Ramas con un grupo de 12 cráteres someros cerca | `ice` y `no_ice` dan la misma secuencia | Un dato más casi no mueve el mapa donde ya hay cráteres; las ramas solo difieren cuando la medición es la información nueva |
