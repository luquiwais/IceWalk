# Plan del GP: el mapa de calor de hielo

**Dueño:** Luqui. **Código:** `model/gp/`. **Estado:** diseño adoptado el 2026-11-04. Paso 1 hecho el 2026-11-05, con datos sintéticos.

## Qué hace

Genera los dos mapas que definen el producto: **probabilidad de hielo** e **incertidumbre**, con el hielo enterrado incluido. Cada medición los actualiza, y el planificador los usa para decidir dónde medir.

No existe un dato satelital de hielo a 10 m. El mapa sale de combinar capas gruesas, indicios finos y mediciones.

## Qué sabemos del hielo en S1094b

| Capa | Profundidad | Evidencia | Fuente |
| --- | --- | --- | --- |
| Hielo poroso (tabla de hielo) | Desde ~1 m; media 0.97 ± 0.25 m; variable en ~65 km² | Cráteres secundarios de fondo plano. Interpretación: los autores la consideran la explicación más probable | Dundas et al. 2023 |
| Hielo masivo, irregular | Mínimo < 5 m, quizás 2 m; origen de los bloques 3.2-11 m; discontinuo | Bloques de hielo y simulación del impacto | Dundas 2023; Wójcicka 2025 |

Desde órbita casi no se ve: los neutrones indican < 15 % de agua en los primeros 50 cm, a escala de cientos de km; TES no detecta hielo en las primeras decenas de cm; el radar de superficie es consistente con hielo en los primeros 5 m.

**Consecuencias:**

1. **El hielo expuesto no prueba hielo a ≤ 1 m.** Viene de varios metros y lo convierte en evidencia de la capa masiva.
2. **El espectrómetro casi no llega a la tabla de hielo.** Mide ~50-60 cm y el hielo poroso empieza cerca de 1 m: lo esperable es un "no" en casi todo el sitio. Medir ahí no aprende mucho, y eso afecta al catálogo y a la STM (a revisar con Producto y Planificador).
3. **El taladro de 1 m queda justo en el límite;** el radar (hasta ~10 m, según el catálogo) pasa a ser clave.
4. **Las mediciones reales de profundidad ya existen desde órbita:** los cráteres.

## Diseño: kriging de la profundidad a la tabla de hielo

Es el mismo razonamiento que hacer kriging de la profundidad de una napa, con perforaciones que a veces no llegan.

**Variable:** `d(x)`, profundidad a la tabla de hielo en metros. Se modela sobre `log d`.

1. **Deriva externa:** las capas arman la superficie base `μ0(x) = β0 + Σ βi · capa_i(x)`.
2. **Kriging de residuos:** ajusta alrededor de cada dato, con alcance y variograma.
3. **Datos censurados:** cada observación es un valor con error o una cota. El ajuste se hace con expectation propagation (EP): Laplace falló con las cotas y a veces ignoraba un "no" (ver `docs/EXPERIMENTS.md`).

| Observación | Qué dice |
| --- | --- |
| Cráter de fondo plano | `d ≈` valor medido, con error de ~0.15 m |
| Cráter sin fondo plano | `d >` 0.1-0.2 × diámetro |
| Taladro que toca hielo | `d ≈` valor medido |
| Taladro que no toca | `d >` profundidad alcanzada |
| Espectrómetro con "sí" | `d <` ~0.6 m |
| Espectrómetro con "no" | `d >` ~0.6 m, si no hay falla del instrumento |
| Radar en la caminata | `d ≈` valor medido a lo largo de la ruta |

**El mapa de calor sale solo:** `P(d ≤ 1 m)` en cada celda, o cualquier otro umbral que pida la STM. Para la probabilidad a 1 m, esto equivale al modelo binario anterior cuando el dato es solo sí o no: lo incluye como caso particular.

**Por qué esto y no el modelo anterior:** aprovecha datos reales, usa bien el "no" del espectrómetro y permite **medir el alcance con un variograma**, en lugar de suponerlo. Como la varianza de un dato censurado depende de lo que dio, un "sí" y un "no" siguen cambiando el plan de forma distinta.

**Riesgo principal:** la tabla de hielo por cráteres es una interpretación. Dundas et al. no excluyen otro material resistente. Por eso va declarada y con su propia incertidumbre.

## Alternativas evaluadas

| Modelo | Qué aporta | Decisión |
| --- | --- | --- |
| Kriging común sobre sí/no | Simple | No: su varianza no depende del resultado |
| Kriging sobre variable oculta binaria (propuesta anterior) | Un "sí" y un "no" difieren | Plan B: si no hay datos de cráteres |
| **Kriging censurado de profundidad** | Usa cráteres, instrumentos y variograma | **Recomendado** |
| Prospección minera (WoE, regresión logística, Random Forest) | Pensado para muy pocos positivos; RF ganó en algunos casos, con menos explicabilidad | Para el prior regional: regresión logística, con RF como comparación |
| Ocupación con detección imperfecta | Separa "no detecté" de "no hay" | Solo la idea. Pide repeticiones, y en un estudio falló con < 40 registros |
| MaxEnt, solo presencias | Muy usado con pocos datos | No: da idoneidad relativa, no probabilidad, y sí tenemos ausencias |
| Co-kriging multifidelidad | Une capa gruesa y puntos | Después: con una decena de píxeles de SWIM no se justifica |
| Red profunda | Flexible | No: no hay datos |
| POMDP u orienteering para elegir ruta | Planifica varios pasos | Después: codicioso por costo primero, porque explica mejor y corre en vivo |

## Variables

| Variable | Qué aporta | Resolución | Estado | Acción |
| --- | --- | --- | --- | --- |
| **Cráteres de fondo plano y no planos** | Profundidad directa | ≥ 5 m | Falta | **Sumar: prioridad máxima.** Lo mapea visión |
| SWIM 0-1 m | Nivel general | 3 km | Registrada | Usar |
| SWIM 1-5 m y > 5 m | Capa masiva | 3 km | Falta | Sumar |
| SWIM por fuente (neutrones, térmico, radar, geomorfología) | Control y sensibilidad | 3 km | Registradas | Usar sin contar dos veces lo que ya está en el combinado |
| Latitud, elevación, diámetro | Prior regional, con Daubar | Puntos | Previstas | Usar en el prior |
| THEMIS (inercia térmica) | Controla la estabilidad | 100 m | Registrada | Usar |
| Albedo | Controla la estabilidad y la pérdida de hielo | Variable | Falta | Sumar al prior; localmente con cuidado, porque HiRISE RED no da albedo calibrado directo |
| Pendiente, orientación y rugosidad | Mueven el límite de estabilidad | 1 m (DTM) | Solo como costo | Derivar como evidencia; peso bajo: el terreno es casi plano |
| Formas del terreno (hummocky, cráteres expandidos, montículos, terrazas) | Indican **pérdida pasada** de hielo | Metros | Registrada, sin detallar | Separar por tipo |
| `surface_unit` | Efecto por zona | 10 m | Mock | Usar |
| `ice_exposure_fraction` | Hielo masivo excavado | 10 m | Mock | Solo para la capa masiva, no para `d` |
| Mediciones de la EVA | Dato directo | Puntos | Contrato existe | Usar; el contrato ya trae `depth_m` |
| Humedad atmosférica, clima | Controlan la estabilidad regional | Global | No aplica dentro del sitio | Solo contexto |

**Corrección:** Piqueux 2019 no sirve acá. Dundas 2023 aclara que la detección con Mars Climate Sounder no se intentó en esta región. Hay que revisar si una versión posterior la cubre.

**No alimentar el GP con:** `boulder_density`, porque refleja la eyecta; `visual_anomaly_score`, porque no es evidencia de hielo.

## Decisiones

| # | Decisión | Recomendación | Estado |
| --- | --- | --- | --- |
| 1 | Variable objetivo | Profundidad censurada; plan B, oculta binaria | **Aceptada** |
| 2 | Capas de hielo | Tabla de hielo primero; capa masiva como segundo mapa, si hay tiempo | A confirmar |
| 3 | Pesos de capas | SWIM y Daubar por regresión; capas finas ajustadas con los cráteres y análisis de sensibilidad | Aceptada, ajustada |
| 4 | Valor de medir | Reducción esperada de área ambigua por minuto | Aceptada |
| 5 | Alcance | Variograma con los cráteres; si no alcanza, promediar 100, 200 y 300 m | Aceptada, ajustada |
| 6 | Librería | numpy/scipy en vivo | Aceptada |
| 7 | Inferencia | EP en lugar de Laplace | Aceptada |
| 8 | Resultado de una medición | Por dentro, la profundidad o cota completa, no sí/no. Falta definir las ramas del plan: se investiga cómo opera NASA | Núcleo aceptado; ramas abiertas |
| 9 | Otras zonas | Prior, alcance, grilla y capas por sitio, fuera del código; sin trasladar los valores de S1094b | Aceptada |
| 10 | Cráteres sin fondo plano | `d > 0.2 × D`: los datos la favorecen | Aceptada |
| 11 | Objetivo de profundidad | Umbral configurable. Con `0.2 × D`, hielo a ≤ 1 m sería raro en el sitio | A revisar con Planificador |

## Lo que cambia respecto del PRD

- **La prueba clave no valida.** En Daubar 2022 hay 1203 sitios (48 con hielo, 20 posibles, 1135 sin); el hielo más al sur está a 39.1°N y el cráter más grande con hielo mide 48 m. S1094b está a 35°N y mide 155 m: es una extrapolación, y se reporta así. Validación nueva: dejar afuera una zona de cráteres del sitio.
- **"Milisegundos" no vale para toda la grilla.** Hay que actualizar por ventana y medir en el free tier: en la compu de desarrollo, con 200 datos, tardó 6.1 s la grilla completa y 0.26 s una ventana de ±900 m.
- **Falta definir `uncertainty`** en `plan.schema.json`. Propuesta: entropía de `P(d ≤ 1 m)` y desvío de `d`.
- **El objetivo 1 de la STM** y el catálogo dependen del espectrómetro: revisar con Producto.

## Contrato propuesto

```python
# model/gp/
fit_prior(layers, catalog) -> PriorModel                  # precalculado
posterior(prior, observations) -> Posterior               # en vivo
Posterior.maps(x_m, y_m, threshold_m=1.0) -> {p_ice, depth_mean, depth_sd, entropy}  # ventana o grilla
Posterior.value(candidates, cost_min) -> value            # subgrilla de 100 m
Posterior.simulate(candidate, tool, result) -> Posterior  # forma de `result` a revisar: ver decisión 8
```

**Ya existen** `posterior` y `maps`, con un prior constante (`Prior`); `fit_prior`, `value` y `simulate` llegan en sus pasos. `gp.observations.from_measurement` traduce una medición del contrato, con el alcance de cada herramienta tomado del catálogo.

Visión entrega un catálogo de cráteres (`resistant_layer_depth_m` o cota inferior, con error). Planificador usa `value` y `simulate`, y sigue dueño del A* y del costo metabólico. Al reemplazar el mock, `/plan` y `/replan` no cambian.

## Pasos

1. **Núcleo sintético (hecho):** `posterior` con datos censurados y prior constante; tests del "sí" y el "no". Primero esto: define la demo.
2. **Catálogo de cráteres (hecho como análisis):** la tabla de Dundas 2023 trae 349 cráteres, ya llevados a la grilla y comprobados contra la imagen. Falta pasar el código a `model/gp/`, con tests.
3. **Estructura espacial (hecho como análisis):** no hay estructura fuerte a escala del sitio; un dato informa a lo sumo unos 100-200 m a su alrededor (ver `EXPERIMENTS.md`). **El diseño se ajusta, no se descarta:** el kriging vale de cerca, y lejos de los datos manda el prior. Por eso el prior del paso 4 pasa a ser lo que más pesa en la mayor parte del mapa.
4. **Prior simple:** SWIM + Daubar, con validación por bloques, contra SWIM solo.
5. **Modelo de instrumentos y capas locales.**
6. **Valor de medir y ramas,** conectados a `/plan` y `/replan`. **Acá existe el ciclo real.**
7. **Simulación** con supuestos equivocados y las 3 estrategias.

**Plan B de calendario:** si el paso 6 no llega al 8 nov, usar el modelo binario o el gaussiano, con el criterio de ambigüedad.

## Criterios de aceptación

- Un "sí" y un "no" en el mismo punto, y dos profundidades medidas distintas, generan mapas y planes distintos, con test. Los mapas ya están probados; los planes llegan en el paso 6.
- Lejos de los datos, el mapa vuelve al prior.
- Validación cruzada por zonas de cráteres: error de profundidad y cobertura de los intervalos, contra la media simple.
- Simulación contra las 3 estrategias, con intervalo, incluso con supuestos equivocados.
- `/replan` responde en menos de 2 s en el free tier (umbral propuesto).

## Riesgos

| Riesgo | Plan |
| --- | --- |
| La interpretación de los cráteres es incorrecta | Declararla; plan B binario |
| Los cráteres se concentran cerca del impacto o no cubren el sitio | Variograma por zonas; más incertidumbre donde no hay |
| Mapearlos lleva más tiempo que el disponible | Empezar a mano en una zona; automatizar solo si rinde |
| Precisión falsa: el mapa a 10 m sale del GP | Mostrar la incertidumbre siempre |
| Valores supuestos de instrumentos | `"assumption": true` y sensibilidad |
| EP queda corrida en la celda de una cota y a pocos metros (hasta ~0.07) | Declarado; test contra la respuesta exacta |
| Una falla del instrumento rompe la suposición de cotas limpias, y EP puede costar más en converger | Se trata en el paso 5; `converged` avisa si no converge |
| Compite con Producto, que también tenés a cargo | Decidir quién cubre qué |

## Lo que no se pudo verificar

El marco de las posiciones en la tabla de Dundas 2023. Tampoco se abrieron Bart 2014 ni Mellon 2004 en el original; Piqueux 2019 y el estudio de Amazonis de USGS dieron error; Dundas 2021 solo por resumen.

## Fuentes

[Dundas et al. 2023](https://doi.org/10.1029/2022GL100747) · [Wójcicka et al. 2025](https://doi.org/10.1029/2024JE008875) · [Butcher 2022](https://eprints.whiterose.ac.uk/id/eprint/184536/1/AA_Butcher_2022_WaterIceAtMidLatitudesOnMars_AuthorAccepted.pdf) · [Mellon y Jakosky 1993](https://ui.adsabs.harvard.edu/abs/1993JGR....98.3345M/abstract) · [Bramson et al. 2017](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1002/2017JE005357) · [Rasmussen y Williams, cap. 2](https://gaussianprocess.org/gpml/chapters/RW2.pdf) · [cap. 3](https://gaussianprocess.org/gpml/chapters/RW3.pdf) · [Daubar 2022](https://zenodo.org/record/6604912) · [Gotovos et al. 2013](https://www.ijcai.org/Abstract/13/202) · [Krause et al. 2008](https://www.jmlr.org/papers/v9/krause08a.html) · [Hengl 2004](https://research.wur.nl/en/publications/a-generic-framework-for-spatial-prediction-of-soil-variables-base/) · [prospección con RF](https://researchonline.jcu.edu.au/37203/) · [revisión de prospección](https://nora.nerc.ac.uk/id/eprint/536067/1/1-s2.0-S0169136823003876-main.pdf) · [ocupación contra MaxEnt](https://ideas.repec.org/a/eee/ecomod/v472y2022ics0304380022002083.html) · [spOccupancy](https://search.r-project.org/CRAN/packages/spOccupancy/readme/README.html) · [multifidelidad](https://essopenarchive.org/doi/full/10.1002/essoar.10505923.1) · [planificación informativa](https://arxiv.org/pdf/2003.09746) · [productos SWIM](https://swim.psi.edu/SWIM4MIMProducts.php)
