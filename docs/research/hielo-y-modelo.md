# Investigación: hielo en S1094b y modelo del GP

Última actualización: 2026-11-04. Conclusiones aplicadas en [`docs/plans/gp.md`](../plans/gp.md).

**Pregunta:** ¿qué dato permite estimar hielo a escala fina, qué variables importan y qué modelo tiene más sentido?

## Respuesta corta

- No existe un dato satelital de hielo a 10 m.
- En S1094b, el hielo poroso empezaría cerca de 1 m, y el masivo a varios metros.
- Los **cráteres secundarios de fondo plano** dan profundidades reales desde órbita. Es el mejor dato fino que encontramos.
- Recomendación: kriging de la **profundidad a la tabla de hielo con datos censurados**.

## Qué se sabe del sitio

| Dato | Valor | Tipo | Fuente |
| --- | --- | --- | --- |
| Profundidad a la capa resistente | 0.97 ± 0.25 m; 1 px de error = 0.15 m | Medido; que sea hielo es interpretación | Dundas 2023 |
| Variación de esa capa | Variable en ~65 km²; hay cráteres sin fondo plano a las mismas profundidades | Medido | Dundas 2023 |
| Hielo masivo | Mínimo < 5 m, quizás 2 m; al menos ~3 m de espesor en partes | Modelo y observación | Dundas 2023 |
| Origen de los bloques de hielo | 3.2-11 m, lateralmente discontinuo; regolito hasta ~15 m | Simulación | Wójcicka 2025 |
| Neutrones | < 15 % de agua en los primeros 50 cm, a cientos de km | Medido | Dundas 2023 |
| TES (SWIM) | Sin hielo en las primeras decenas de cm | Medido | Dundas 2023 |
| Radar de superficie (SWIM) | Consistente con hielo en los primeros 5 m | Medido | Dundas 2023 |
| Mars Climate Sounder | **No se intentó en esta región** | - | Dundas 2023 |
| Estabilidad actual | Inestable con 10 pr. µm de vapor; estable con ≥ 20 pr. µm | Modelo | Dundas 2023, cita Mellon 2004 |
| Formas cercanas | Textura hummocky, cráteres expandidos, montículos (hasta ~200 m), cráter con terrazas a 20 km | Observado; indican pérdida de hielo | Dundas 2023 |
| Hielo masivo vecino | Reflectores de radar a < 120 km, 38-52°N | Inferido | Dundas 2023, cita Bramson 2015 |

**Advertencia de los autores:** el fondo plano es "consistente con hielo poroso u otro material resistente". Lo consideran lo más probable, porque la roca coherente está mucho más profunda, pero no es una medición directa de hielo.

## Implicancias para el proyecto

1. El hielo visible en la eyecta viene de varios metros: no prueba hielo a ≤ 1 m.
2. Un espectrómetro de ~60 cm casi no llega a la tabla de hielo: un "no" sería lo esperable en la mayor parte del sitio. **Afecta al catálogo y a la STM.**
3. Un taladro de 1 m queda en el límite; el radar gana peso.
4. Los cráteres permiten estimar el alcance con un variograma real en lugar de suponer 100-300 m.

## Tabla de cráteres de Dundas 2023 (hallada el 2026-11-05)

El suplemento publica la tabla, cráter por cráter: 349 filas, con `X, Y, D_crater, D_resistant`. Copia local, fuera de Git: `data/raw/dundas2023_craters.csv`. Interpretación nuestra de `-1`: sin capa resistente.

- **Profundidad:** `d = (0.86 × D - Df) / 2 × tan(33°)`. Da 0.969 ± 0.254 m y 0.151 m por píxel, igual que el paper. La forma y `k = 0.86` se dedujeron porque reproducen esos números: **no se contrastaron con Bart 2014**. Con ángulos de 30° y 38°, da -11 % y +20 %; el paper informa -12 % y +17 %.
- **El 0.97 m describe solo a los cráteres con fondo plano:** son 48 de 349 (14 %). De esos 48, el 60 % tiene `d ≤ 1 m`, es decir, 8 % del total.
- **El fondo plano depende mucho del tamaño:** 3 % con D de 5-6 m; 9 % con 6-7 m; 19 % con 7-8 m; 41 % con 8-10 m; 64 % con ≥ 10 m.
- **La cota de los cráteres sin fondo plano pesa muchísimo:** con 0.2 × D, el 90 % de esos cráteres dice `d > 1 m`; con 0.1 × D, el 1 %. El paper presenta ambas. Según sus mediciones de sombras, los secundarios sin fondo plano más grandes tienen una relación profundidad/diámetro parecida a la de primarios chicos, sin explicación clara.
- **Marco confirmado:** `X, Y` son muestra y línea de `ESP_073077_2155_RED.JP2`. Hay que corregir un corrimiento de ~50 m al oeste y ~120 m al norte para llevarlos al orto y a la grilla.
- **Los datos favorecen `0.2 × D`.** Con esa relación, mediana de 2.35 m y `P(d ≤ 1 m)` ≈ 0.06: **el hielo a ≤ 1 m sería raro en el sitio**. El 0.97 m describe a la minoría con fondo plano.
- **Estructura:** no es fuerte a escala del sitio. Un dato informa a lo sumo unos 100-200 m a su alrededor.

Detalle de todas las pruebas: `EXPERIMENTS.md`.

## Catálogo de Daubar 2022

Contado por el agente de investigación sobre la tabla de Zenodo: 1203 sitios; 48 con hielo, 20 posibles, 1135 sin. Norte 30-40°: 87 sitios, 2 con hielo. Norte 30-50°: 140 sitios, 16 con hielo. Hielo más al sur en el norte: 39.1°N. Diámetro máximo con hielo: 48 m.

S1094b (35°N, 155 m) queda fuera del rango: "dejarlo afuera" es una extrapolación.

## Variables de estabilidad y detección

- **Latitud, inercia térmica y albedo:** Mellon y Jakosky 1993 hallan variaciones de 20-30° en el límite de estabilidad. Una inercia alta y un albedo bajo profundizan la tabla de hielo.
- **Albedo y pérdida de hielo:** con superficie más oscura, la retirada casi se duplica a 45°N (Bramson 2017, resumen de búsqueda).
- **Pendiente:** mueve el límite unos grados por cada 10° (resumen de búsqueda).
- **Rugosidad métrica:** puede permitir hielo cercano en latitudes medias (Aharonson y Schorghofer 2006, citado en Butcher 2022; original sin abrir).
- **Polígonos:** latitudinalmente se concentran hacia el polo; por sí solos no prueban hielo actual (Butcher 2022).
- **Detección térmica:** cae rápido por debajo de 30 cm (Sizemore 2026, resumen de búsqueda).

## Modelos evaluados

| Modelo | Evidencia | Conclusión |
| --- | --- | --- |
| Kriging común sobre sí/no | Su varianza no depende de lo medido (Rasmussen y Williams, cap. 2) | Descartado |
| Latente probit + Laplace | Caso de juguete: varianza 0.654 (sí, sí) contra 0.559 (sí, no) | Plan B |
| Kriging censurado | Método establecido: De Oliveira 2005, Ordoñez 2018, paquete CensSpatial, con un dataset de profundidades de horizontes | Recomendado |
| WoE, regresión logística, Random Forest (prospección minera) | RF superó a WoE con < 20 ocurrencias; en otro distrito empató en predicción con regresión logística. Son estudios de caso | Para el prior |
| Ocupación con detección imperfecta | Falló con < 40 registros en un estudio; pide repeticiones | Solo la idea |
| MaxEnt | Solo da idoneidad relativa (Merow y Silander 2014) | Descartado: tenemos ausencias |
| Co-kriging multifidelidad | La capa gruesa importa cuando los puntos son escasos (estudio hidrogeológico) | Para después |
| POMDP, orienteering | Marcos comunes de planificación informativa | Para después |

## Tiempos medidos

Agente, en la compu de desarrollo, implementación ingenua, grilla de 500 × 1500. Laplace: 3-8 ms. Grilla completa, con 5-50 mediciones, sin Laplace: 0.37-2.5 s. Ventana de ±900 m: 16-110 ms. Falta medir en la grilla real y en el free tier.

## Sin verificar

- La descripción de la tabla en el suplemento de Dundas 2023: se leyeron las páginas 1-3 de 15. Marco y unidades se comprobaron contra la imagen, y `-1` sigue siendo interpretación nuestra.
- Bart 2014 y Mellon 2004 en el original. Piqueux 2019 y el estudio de Amazonis de USGS dieron error.
- Sensibilidad de un espectrómetro portátil para detectar hielo.
- Si existe una cobertura posterior de Mars Climate Sounder.

## Fuentes

[Dundas 2023](https://doi.org/10.1029/2022GL100747) · [Wójcicka 2025](https://doi.org/10.1029/2024JE008875) · [Butcher 2022](https://eprints.whiterose.ac.uk/id/eprint/184536/1/AA_Butcher_2022_WaterIceAtMidLatitudesOnMars_AuthorAccepted.pdf) · [Mellon y Jakosky 1993](https://ui.adsabs.harvard.edu/abs/1993JGR....98.3345M/abstract) · [Bramson 2017](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2017JE005357) · [Daubar 2022](https://zenodo.org/record/6604912) · [CensSpatial](https://cran.r-project.org/web/packages/CensSpatial/refman/CensSpatial.html) · [comparación de kriging censurado](https://ideas.repec.org/a/eee/csdana/v74y2014icp125-141.html) · [prospección con RF](https://researchonline.jcu.edu.au/37203/) · [Baguio](https://researchonline.jcu.edu.au/40027/) · [ocupación contra MaxEnt](https://ideas.repec.org/a/eee/ecomod/v472y2022ics0304380022002083.html) · [Maxlike](https://repository.si.edu/items/af77f619-1a4b-446d-8f7d-591b8dd90cba/full) · [multifidelidad](https://essopenarchive.org/doi/full/10.1002/essoar.10505923.1) · [planificación informativa](https://arxiv.org/pdf/2003.09746) · [Rasmussen y Williams](https://gaussianprocess.org/gpml/chapters/RW2.pdf)
