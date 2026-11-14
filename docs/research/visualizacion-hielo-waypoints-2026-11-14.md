# Visualización del mapa de hielo y de los waypoints de EVA

Investigación del 2026-11-14. No cambia código ni contratos. Complementa `diseno-interfaz.md` (§5.1 y §5.5) y `flujo-ui-nasa-2026-11-14.md` (§4 y §6.A), y no repite lo que ya citan: VSUP en términos generales, Padilla, Kay y Hullman 2020, MacEachren 2012, Courville et al. 2026, el mapa de peligros de Jezero y la regla de color de HIDH 10.11.5.5.

**Etiquetas:** [D] documentado (leído en la fuente), [I] inferencia nuestra, [NV] no verificado (buscador, resumen o fuente secundaria).

## Resumen

1. **2D, recomendado: «islas de evidencia».** Donde solo hay prior (el 87 % de las celdas en `mock/map.json`) no se pinta nada y la leyenda dice «67 %, sin datos locales». Las manchas con evidencia van en azul, con pocas clases discretas y sin contorno duro. Es una VSUP con la raíz transparente.
2. **Por qué:** con paletas discretas y superpuestas se lee mejor que con paletas continuas o con dos mapas lado a lado (Correll et al. 2018). Combinar dato y confiabilidad en una vista rinde más que alternarlos (Evans 1997). Los bordes duros se leen como límites físicos (Padilla et al. 2017).
3. **No hay una codificación estándar de NASA para P e incertidumbre por celda.** SWIM separa los atributos en mapas distintos, y Jezero y Mars 2020 usan clases discretas o puntos de blancos seguros.
4. **3D, recomendado: un mástil fino con banderín en la próxima estación, una línea punteada tenue en el piso, una cuña en el borde de la vista cuando la estación queda fuera, y un solo aro de llegada.** Se suman breadcrumbs (la misión SUITS 2026-2027 los pide como «shall») y la ruta de walkback (SUITS la da como implementación ideal).
5. **Lo que no tiene fuente:** columnas de luz brillantes y tres aros concéntricos. No aparecen en SUITS ni en Joint AR. Bensch et al. 2024 sí respaldan los marcadores verticales (banderas) y piden marcas mínimas o semitransparentes.

## 1. Qué tienen nuestros datos (medido en el mock de hoy)

`apps/web/mock/map.json`: 300 × 300 celdas de 10 m y prior de 0.669. **El 87.0 % de las celdas tiene U ≥ 0.999 y el 95.9 % está a menos de 2 puntos del prior.** U < 0.95 en 2544 celdas (2.8 %), U < 0.8 en 390 (0.43 %), U < 0.5 en 64 y U < 0.2 en 4. P va de 0.55 a 0.93. Hay 454 celdas con P ≥ prior + 0.1, pero **solo 223 tienen U < 0.8**: el umbral actual (`KNOWN_BELOW = 0.8`) deja como «solo prior» la mitad de las celdas que los cráteres sí movieron (las demás tienen U entre 0.8 y 0.94) [D, cálculo propio]. Además, cada bloque de 100 m toma su mejor celda de 10 m, así que **una sola celda con evidencia pinta un punto que representa un área 100 veces mayor** [D, `lib/ice-view.ts`; la consecuencia es I].

**Consecuencia de diseño [I]:** el problema no es solo la codificación. El mapa casi no tiene información, y cualquier codificación que le dé una marca a cada celda (o a cada bloque) llena la pantalla de «no sabemos». Pasó con la rampa continua del 10/11 (todo azul) y vuelve a pasar con los anillos vacíos de hoy (el 87 % de las marcas son anillos).

## 2. Probabilidad e incertidumbre juntas: qué dice la literatura

| Técnica | Evidencia revisada por pares | Ventaja | Riesgo | Fuente |
| --- | --- | --- | --- | --- |
| **VSUP** (supresión de valor) | Árbol de cuantización: por encima de un umbral de incertidumbre todo va a una sola «raíz», y al bajar la incertidumbre se abren más clases de valor. Experimento 1 (n = 24): mapas discretos 63 % de acierto contra 47 % de los continuos, y superpuestos 58 % contra 51 % de dos mapas lado a lado. Entre una VSUP y un bivariado discreto no hubo diferencia de lectura. Experimento 2 (n = 24, 3 excluidos): con VSUP se apuesta menos en zonas inciertas (K-S, D = 0.5, p = 0.03), aunque la incertidumbre media de las apuestas no cambió | Le saca la palabra al dato incierto. Encaja con «no prometemos dónde está el hielo» | Los autores advierten que la VSUP es «a kind of filtering device»: sirve si lo incierto debe pesar menos. No sirve para analizar la incertidumbre por separado. Recomiendan no pasar de **16 colores** | Correll, Moritz y Heer 2018 [D] |
| **Bivariado** (dos canales de color) | Leer uno continuo es lo peor del experimento anterior (47 %). Los mapas bivariados cuestan incluso para tareas elementales (Wainer y Francolini, citado por Correll) | Muestra los dos datos | Mezclar tono, luminosidad y saturación vuelve difícil separar valor de incertidumbre | Correll et al. 2018 [D]; Wainer y Francolini [NV] |
| **Color + patrón o glifo** | Ocho técnicas bivariadas para mapas de temperatura: **color para el valor y patrón para la incertidumbre** separan mejor los dos datos; los puntos (spot symbols) para la incertidumbre ganaron en lectura y en preferencia. Con solo color, preferían un velo de luminosidad y saturación, que según los autores conviene cuando se quiere que la gente no saque conclusiones de lo incierto | Separa los canales; nuestra grilla de puntos es de esta familia | Agrega textura en toda la pantalla si la incertidumbre es alta en casi todo el mapa (nuestro caso) [I] | Retchless y Brewer 2016 [D, resumen y fragmentos; tamaños de efecto NV] |
| **Combinado contra toggle** | El dato y la confiabilidad combinados (compuesto estático o animación) «were both found to be helpful»; el mapa de confiabilidad solo y el **toggle** entre los dos fueron menos eficientes y efectivos | Argumento directo contra el modo aparte de «niebla» que tenemos hoy | Estudio viejo, con mapas en papel y en pantalla de 1997 | Evans 1997 [D, resumen] |
| **Contornos o límites duros** | Un borde que se ensancha se lee como tamaño (el huracán «crece») y no como incertidumbre. Los autores recomiendan los resúmenes con borde solo donde no puedan confundirse con límites físicos. Con el cono del NHC, las decisiones cambian según propiedades visuales básicas; los bordes difusos y los ensembles mitigan el problema | Un contorno es claro y se nombra fácil | Efecto adentro/afuera: lo de afuera se lee como «seguro» o «sin hielo» | Padilla, Ruginski y Creem-Regehr 2017 [D]; Ruginski et al. 2016 [D, resumen] |
| **Bandas discretas** (clases de relleno) | Son la parte «discreta» de VSUP (mejor que lo continuo). Ningún estudio leído separa el efecto de las bandas rellenas del de una isolínea suelta | Se leen con leyenda numérica | Si cada banda lleva una línea de borde, vuelve el riesgo de los contornos [I] | Correll et al. 2018 [D]; separación [I] |
| **Sketchiness, blur, punteado** | Para líneas: la sketchiness es tan intuitiva como el blur, y la gente prefiere el punteado | Sirve para trazos, por ejemplo una ruta por zona sin datos | Evaluado en líneas, no en áreas | Boukhelifa et al. 2012 [D, resumen] |
| **Variables «intuitivas»** | Fuzziness y ubicación rinden mejor; luminosidad (value) y arreglo, bien; tamaño y transparencia, usables; saturación, mal | Respaldo semiótico de «difuso = incierto» | Lo que se leyó es una presentación de terceros, no el paper | MacEachren et al. 2012 [NV] |
| **HOPs y ensembles animados** | HOPs: un cuadro por cada muestra; ganan a las barras de error y a los violines en comparaciones de 2 y 3 variables, y los usuarios sin formación estadística detectan tendencias con menos evidencia. Ensembles en mapas: evitan el error de tamaño del cono, pero un miembro que pasa sobre un punto **se sobrepondera** en juicios puntuales | Muestra «no sabemos» como algo que cambia; muy demostrable | Distrae; los juicios puntuales sobre una sola muestra engañan; la animación compite con las alertas | Hullman, Resnick y Adar 2015 [D, resumen]; Kale et al. 2019 [D, resumen]; Padilla et al. 2017 [D] |
| **Frecuencias** (quantile dotplot, «2 de 3») | Los quantile dotplots bajan la varianza de las estimaciones contra la densidad (~1.15 veces), y con frecuencias se decide mejor | Ideal para la ficha o el tooltip de una estación | No es una codificación de mapa | Kay et al. 2016 [D, resumen]; Fernandes et al. 2018 [D, resumen] |
| **Hexbins** | No se encontró evidencia específica para incertidumbre con no expertos | — | La grilla del planificador es cuadrada (100 m, `grid.json`); un hexágono no calza con las estaciones [I] | — |

**Síntesis para no expertos [I, apoyada en lo anterior]:** una sola vista que combine dato y confianza, con pocas clases discretas, con lo incierto apagado o ausente en vez de marcado, sin bordes duros y con el número a la vista. La animación sirve como lente explicativa, no como vista de trabajo. La revisión sistemática de Kinkeldey, MacEachren y Schiewe 2014 recuerda que hay pocos estudios empíricos y que el resultado depende de la tarea [D, resumen].

## 3. NASA, USGS y JPL

- **SWIM (NASA y PSI):** un «ice consistency value» por píxel, que es la suma normalizada de 5 conjuntos de datos, de −1 (inconsistente con hielo) a +1. **Los valores altos, en azul** [D, abstract LPSC 2019; Morgan et al. 2021]. El extremo rojo de la escala no se verificó [NV]. La versión de 2026 separa la probabilidad, las cotas de 1σ y el cambio contra el prior, con gris oscuro donde no hay datos (ya en `flujo-ui-nasa`).
- **Mars 2020, TRN:** el Lander Vision System se ubica contra un mapa de referencia CTX, y el Safe Target Selection elige un blanco de un «Safe Targets Map» precargado. En la difusión de NASA, los blancos seguros son **«bright green dots»** sobre la imagen; los peligros están «identified a priori in the map» [D, NASA STMD]. En el mapa de peligros de Jezero, «Landing hazards are depicted in red; safer areas are colored blue and green» [D, PIA24167]. **Clases discretas y puntos, no una probabilidad continua** [I]. El formato interno del mapa de peligros y sus probabilidades no se encontró [NV].
- **MSL (Golombek et al. 2012):** las restricciones de ingeniería (pendiente, rocas, relieve, elevación) se evaluaron con simulaciones de EDL, y las cuatro finalistas resultaron seguras. La figura de probabilidad de aterrizaje seguro y su paleta no se leyeron [NV].
- **Mars Trek y HiRISE:** no se encontró una capa con incertidumbre codificada por celda [NV]. Los créditos de HiRISE siguen como están en `SOURCES.md`.
- **Mapas de consenso de selección de sitio:** no se encontró un documento público con su codificación [NV].
- **Patrón común [I]:** NASA y JPL **separan** (SWIM 2026) o **discretizan** (Jezero y TRN). No superponen una rampa continua de probabilidad con incertidumbre. El azul significa «favorable» o «hielo», y el gris, «sin datos».

## 4. Waypoints y estaciones en HUD y AR para EVA

- **NASA SUITS 2026-2027 (lunar, la última publicada)** [D]: «For the UI, teams shall design a 2D mini-map», con una solución de navegación «effective and non-obtrusive». Requisitos 4a: «The UI shall implement a "breadcrumb" feature» para volver al módulo; «should implement a best path navigation feature»; «should offer navigation aids to POIs»; «shall provide predictive maximum range based upon spacesuit life support usage»; «drop a pin on the map at any point during the EVA»; sistema de C&W. Para el regreso: «the shortest safe path back to the lander». **No prescribe ninguna forma de marcador** (aros, columnas, flechas). No se encontró un ranking público de «ganadores»: SUITS es un desafío de participación, y un equipo dice que «There was no real "winner"» [NV, prensa universitaria].
- **Joint AR (NASA JSC; Miller et al., AIAA ASCEND 2022)** [D]: diseñan desde escenarios en primera persona y se preguntan «Do crew even really need to see a map at all?». Lo que la tripulación necesita: «desired heading and distance for their next traverse», una «first-person view indication of areas to avoid», y el impacto en el timeline de un desvío oportunista. En la prueba de campo de 2024 (con K. Rubins) se usaron displays de navegación con GPS/IMU, cámara/IMU, LiDAR y mapas estáticos [NV, pie de foto de NASA].
- **Bensch et al., CHI 2024 (n = 25, 3 astronautas; VR lunar)** [D]: cuatro condiciones. Tableta de muñeca; minimapa al pie de la vista; **AR pathway** (una franja azul semitransparente proyectada en el piso); y **brújula** con un banderín azul que indica dirección y distancia en metros al próximo waypoint, más una flecha en el borde cuando el banderín sale del campo visual. Resultados: el pathway tuvo el **menor NASA-TLX** y la menor desviación de la ruta; la tableta fue la peor (único SUS bajo 68). Las críticas: el pathway es «a bit prescriptive», puede ocultar rocas y da sobreconfianza («Why should I follow that?»). Varios proponen **waypoints con libertad de ruta** entre ellos, y combinar waypoints para corto alcance con un minimapa. Pautas: «Spatial conformal cues [...] projected onto the lunar surface»; «**Vertical cues, such as flag objects**, would further enhance distance estimation»; marcas «minimalistic (e.g., a thin dashed line) or semi-transparent»; «colored circles» alrededor de los peligros cercanos; y navegación que se explique con seguridad o tiempo de EVA.
- **SUITS de estudiantes:** SCOUT (TAMU, IEEE Aerospace 2020) usó resaltado de waypoints y dejó como trabajo futuro una «spline path 3D augmented waypoint display» [D]. SENVA (2023) dibuja un rastro de breadcrumbs hacia un punto elegido [NV, página personal].
- **Aviación:** el metaanálisis de HUD encuentra «an advantage for conformal over non-conformal HUD imagery». El costo del HUD aparece «only when events [...] are entirely unexpected» (cognitive tunneling) [D, resumen; Fadden, Wickens y Ververs 2000]. Las circulares de la FAA AC 25-11B y AC 20-185A tratan clutter y simbología de HUD, pero no se leyeron [NV].
- **Indicadores fuera de pantalla:** Wedge (un triángulo con la punta en el blanco) dio más precisión que Halo en pantallas chicas [D, resumen; Gustafson et al. 2008]. En AR, lo fijo a la cabeza es fácil de ver pero cuesta usarlo al caminar, y lo fijo al mundo está en contexto pero tarda en encontrarse [NV, revisión de TU Delft].
- **MIL-STD-1472H y los análogos (BASALT, Desert RATS):** no se encontró una regla de forma de marcador. BASALT-3 calificó la navegación y la anotación como «at least moderately enhancing» [NV, resumen].

**Estándar contra «de juego» [I, con las fuentes de arriba]:** estándar o con respaldo son el minimapa 2D, los breadcrumbs, los pins, la mejor ruta, el rumbo y la distancia, el alcance máximo predicho, las marcas conformes al terreno, los indicadores verticales tipo bandera, el indicador fuera de pantalla y los círculos de peligro. **Sin fuente encontrada**: columnas de luz brillantes visibles desde lejos, varios aros concéntricos animados, flechas 3D grandes flotando y partículas. El rótulo actual del casco, «NASA SUITS-style AR», promete más de lo que SUITS dice. Mejor: «AR waypoint cues (concept)».

## 5. Propuestas para el mapa 2D

### A. Islas de evidencia (VSUP con raíz transparente) — **recomendada**

```
 HiRISE gris, limpio        ·  islas azules donde U < 0.95, sin línea de borde
 ┌───────────────────────────────────────────────┐
 │                 ▒▒                            │  ▒ U 0.5–0.95: 2 clases, opacidad baja
 │      ⌂ hab     ▒██▒  ── C2 · P 0.93 · U 0.10   │  █ U < 0.5: 4 clases, opacidad plena
 │                 ▒▒                            │  ● medición (ice / no ice), con su id
 │   ●M1  ░                                      │  ░ debajo del prior: gris pizarra
 └───────────────────────────────────────────────┘
 Unshaded = regional prior 67 % · no local data   |   Local evidence: 2.8 % of area
```

- **Canales:** sin relleno = raíz de la VSUP («67 %, sin datos»). Azul = P por encima del prior y gris pizarra = por debajo (el mismo divergente de `change`, DECISIONS 2026-11-10). Opacidad = nivel de evidencia. Las celdas de 10 m se ven tal cual, sin agregar a 100 m.
- **Árbol:** raíz con U ≥ 0.95; nivel 1 (0.5 ≤ U < 0.95) con 2 clases, encima o debajo del prior; nivel 2 (U < 0.5) con 4 clases: < 57 %, 57-77 %, 77-87 %, ≥ 87 %. En total, 7 colores (< 16) [cortes I, a fijar con los datos reales].
- **Rótulos:** solo las 3 islas de más peso (P × área), con línea guía y números: «C2 · P 0.93 · U 0.10 · ~80 m». Sin el círculo «Ice likely zone».
- **Cambio:** en vez de un modo aparte, al llegar un re-plan las islas que cambiaron muestran «+18 pts» por unos segundos y vuelven a la vista normal (Evans: combinar antes que alternar).
- **Por qué:** calza con datos que son casi todo raíz; la paleta es discreta y superpuesta (Correll); el velo funciona como máscara para no sacar conclusiones de lo incierto (Retchless y Brewer); no hay bordes duros (Padilla, Ruginski); se parece a SWIM (azul = hielo, sin datos = neutro).
- **Riesgos [I]:** (1) «sin color» puede leerse como «sin hielo». Se mitiga con la leyenda arriba, el 67 % en el mismo rótulo y, si los tests lo confirman, un punteado neutro muy tenue en la raíz (patrón = incertidumbre, Retchless y Brewer). (2) A la escala de 1.1 km, una isla de 30 m mide ~10 px: hace falta un tamaño mínimo de dibujo y un encuadre automático sobre las islas y el plan. (3) Cambia `KNOWN_BELOW` de 0.8 a 0.95: es una decisión de presentación, no del modelo.

### B. Grilla de puntos invertida (cambio incremental)

- Se mantiene la grilla de 100 m. **El prior pasa a ser una marca mínima** (un punto neutro de 1-2 px al 30 %) en vez del anillo del tamaño completo. La evidencia, un punto azul relleno con área por P en 3 clases, y un anillo oscuro extra si U < 0.5. Sin círculos de zona; rótulos con línea guía.
- **Respaldo:** glifo o patrón para la incertidumbre (Retchless y Brewer), marcas discretas (Correll).
- **Contras [I]:** sigue pintando una celda como si fuera un bloque de 100 m; la cuadrícula visible compite con la imagen.

### C. «Possible outcomes» (HOPs del GP) — lente explicativa, no vista por defecto

- **Qué se ve:** cada cuadro (~1 por segundo, con pausa y paso a paso) es una muestra conjunta del GP a 100 m (30 × 30 bloques), umbralizada en «hielo a ≤ 3 m sí o no». Las islas con evidencia casi no cambian entre cuadros; la zona solo-prior parpadea al ~67 %. Al pasar el puntero: «ice in 61 of 100 outcomes».
- **Respaldo:** HOPs (Hullman 2015; Kale 2019); la animación combinada ayudó (Evans 1997). Es la forma más directa de mostrar «acá no sabemos».
- **Contras:** sobreponderar un cuadro (Padilla 2017); la animación compite con las alertas [I]; **exige un cambio de contrato** (muestras del GP), así que va con un PR que actualice esquema, ejemplos y mocks. Solo en Site o Brief, nunca en la vista EVA.

## 6. Propuestas para los marcadores del 3D (casco)

### 1. Banderín, traza fina y cuña — **recomendada**

```
                         ┃▶ 02 E04S22 · RADAR · 180 m      próxima: mástil fino + banderín
            ┆03          ┃                                  otras: mástil corto, solo número, tenue
   · · · · ·  - - - - - -┸                                  ◯ aro único de llegada (4 m)
  (breadcrumbs)  (línea punteada tenue, se apaga a ~50 m)   ◁ 210 m  cuña en el borde si sale de vista
  HUD: PET 1:42 · Next 02 · 040° · 180 m · Walkback 22 min · Max range 0.9 km
```

- **Canales:** **vertical** = dónde queda la próxima estación y a qué distancia (Bensch, pauta de banderas). La **línea punteada semitransparente** en el piso marca la ruta sugerida solo hasta la próxima estación (Bensch: «thin dashed line», sin tapar rocas). El **aro único** de 4 m (`AT_STATION_M`) se rellena al entrar y reemplaza a los aros de 3, 6 y 10 m; la cuenta regresiva va en números en el HUD. **Breadcrumbs** cada 10 m de lo caminado y, en bingo o EVA TERMINATE, la ruta de walkback punteada al hábitat (SUITS: breadcrumbs «shall»; «shortest safe path back» como ideal). **Cuña o flecha en el borde con la distancia** cuando la estación sale del campo visual (Bensch, condición brújula; Wedge > Halo). **Círculos ámbar** (caution) solo para los bloques sobre la ruta o cerca de ella (Bensch, «colored circles»; Joint AR, «areas to avoid»).
- **Color [I]:** blanco roto con contorno oscuro para la navegación (ni blanco ni negro puros, Bensch); el azul queda para el hielo y el cian para advisory. La P de la estación va como dato en el banderín («P 0.71»), no como color del marcador.
- **El HUD:** rumbo y distancia (Joint AR) y alcance máximo predicho (SUITS 4a.4.d), también como anillo en el minimapa.
- **La columna de luz:** pasa a mástil fino, de baja opacidad y solo para la próxima estación. Mantiene el valor de la señal vertical sin el efecto «baliza de juego» [I].

### 2. Modo pathway (franja en el piso) solo cuando se justifica

- Una franja semitransparente sobre el DTM, como el AR pathway de Bensch: el menor TLX y la menor desviación. Se activa sola en el walkback por bingo o donde la ruta esquiva peligros. Siempre lleva su motivo: «Route avoids 2 boulders · slope < 15°», porque la crítica de los expertos fue «prescriptive» y «Why should I follow that?».
- **Contras:** tapa el piso y genera sobreconfianza (Bensch; tunneling según Fadden et al.). Por eso no va por defecto.

## 7. Lo que no se pudo verificar

- **El texto completo** de Retchless y Brewer 2016, Kale et al. 2019, Hullman et al. 2015, Ruginski et al. 2016, Boukhelifa et al. 2012, Gustafson et al. 2008, Evans 1997 y Fadden et al. 2000: se usaron los resúmenes, y los tamaños de efecto quedan sin verificar. MacEachren 2012 sigue verificado solo por una presentación de terceros.
- **De NASA y JPL:** el formato y la paleta del Safe Targets Map de Mars 2020 y de los mapas de probabilidad de aterrizaje de MSL; la escala completa de SWIM 1.0 (swim.psi.edu devolvió el error 523); alguna capa con incertidumbre en Mars Trek; los mapas de consenso de selección de sitio.
- **De las fuentes de HUD y AR:** los requisitos de SUITS anteriores a 2026-2027 (se leyó solo el FY27, lunar) y los diseños de equipos que NASA haya destacado; las lecciones de la prueba de campo de Joint AR de 2024 (solo pies de foto); el texto de AC 25-11B, AC 20-185A y MIL-STD-1472H sobre HUD y HMD; si HIDH reserva el parpadeo o la animación para las alertas (sería un argumento más contra C en la vista EVA).
- **Lo empírico:** ningún estudio leído compara aros en el piso, mástiles y columnas de luz entre sí. La recomendación del 3D se apoya en Bensch (VR lunar, sin aros) y en SUITS, no en una prueba directa. Los cortes de clase de la propuesta A son supuestos de presentación.

## 8. Fuentes

- Correll, M., Moritz, D. y Heer, J. (2018). *Value-Suppressing Uncertainty Palettes*, CHI. https://idl.cs.washington.edu/files/2018-UncertaintyPalettes-CHI.pdf
- Retchless, D. P. y Brewer, C. A. (2016). *Guidance for representing uncertainty on global temperature change maps*, Int. J. Climatology 36(3). https://doi.org/10.1002/joc.4408 ; https://pure.psu.edu/en/publications/guidance-for-representing-uncertainty-on-global-temperature-chang/
- Evans, B. J. (1997). *Dynamic display of spatial data-reliability: Does it benefit the map user?*, Computers & Geosciences 23(4). https://sci.utah.edu/~kpotter/Library/Papers/evans:1997:DDSD/index.html
- Padilla, L. M., Ruginski, I. T. y Creem-Regehr, S. H. (2017). *Effects of ensemble and summary displays on interpretations of geospatial uncertainty data*, Cogn. Research 2:40. https://pmc.ncbi.nlm.nih.gov/articles/PMC5626802
- Ruginski, I. T. et al. (2016). *Non-expert interpretations of hurricane forecast uncertainty visualizations*, Spatial Cognition & Computation 16(2). https://doi.org/10.1080/13875868.2015.1137577 ; https://escholarship.org/uc/item/96s9t7g5
- Boukhelifa, N., Bezerianos, A., Isenberg, T. y Fekete, J.-D. (2012). *Evaluating Sketchiness as a Visual Variable for the Depiction of Qualitative Uncertainty*, IEEE TVCG 18(12). https://tobias.isenberg.cc/p/Boukhelifa2012ESV
- MacEachren, A. M. et al. (2012). *Visual Semiotics & Uncertainty Visualization: An Empirical Study*, IEEE TVCG 18(12). https://doi.org/10.1109/TVCG.2012.279 (resumen usado: https://users.cs.utah.edu/~miriah/uncertainty/vis-semiotics.pdf)
- Hullman, J., Resnick, P. y Adar, E. (2015). *Hypothetical Outcome Plots Outperform Error Bars and Violin Plots...*, PLOS ONE 10(11). https://doi.org/10.1371/journal.pone.0142444
- Kale, A., Nguyen, F., Kay, M. y Hullman, J. (2019). *Hypothetical Outcome Plots Help Untrained Observers Judge Trends in Ambiguous Data*, IEEE TVCG 25(1). https://idl.uw.edu/papers/hops-trends
- Kay, M., Kola, T., Hullman, J. y Munson, S. (2016). *When(ish) is My Bus?*, CHI. https://idl.uw.edu/papers/when-ish-is-my-bus ; Fernandes, M. et al. (2018), CHI: https://mucollective.northwestern.edu/files/2018-UncertainBusDecisions-CHI.pdf
- Kinkeldey, C., MacEachren, A. M. y Schiewe, J. (2014). *How to Assess Visual Communication of Uncertainty?*, The Cartographic Journal 51(4). https://www.repos.hcu-hamburg.de/handle/hcu/758
- Morgan, G. A. et al. (2021), Nature Astronomy 5. https://doi.org/10.1038/s41550-020-01290-z ; abstract SWIM LPSC 2019: https://swim.psi.edu/resources/abstracts/LPSC2019/3083.pdf
- NASA STMD, *Terrain Relative Navigation: Landing Between the Hazards*. https://science.nasa.gov/technology/technology-highlights/terrain-relative-navigation-landing-between-the-hazards ; NASA/JPL, *Jezero's Hazard Map* (PIA24167): https://science.nasa.gov/photojournal/jezeros-hazard-map/
- Golombek, M. et al. (2012). *Selection of the Mars Science Laboratory Landing Site*, Space Sci. Rev. 170. https://doi.org/10.1007/s11214-012-9916-y
- NASA (2026). *NASA SUITS 2026-2027 Mission Description*. https://www.nasa.gov/wp-content/uploads/2026/08/fy27-nasa-suits-mission-description.pdf
- Miller, M. J., Welsh, D., Krygier, B., Noyes, M., Mann, K. y Mitra, P. (2022). *Realizing a Spacesuit Compatible Augmented Reality System...*, AIAA ASCEND. https://ntrs.nasa.gov/api/citations/20220013671/downloads/Joint_AR_AIAA_ASCEND_Manuscript.pdf
- Bensch, L. et al. (2024). *Designing for Human Operations on the Moon: Challenges and Opportunities of Navigational HUD Interfaces*, CHI '24. https://arxiv.org/pdf/2402.15692
- McHenry, N. et al. (2020). *Design of an AR Visor Display System for Extravehicular Activity Operations*, IEEE Aerospace. https://bhp.engr.tamu.edu/wp-content/uploads/sites/212/2021/03/McHenry-2020-Design-of-an-Augmented-Reality-Visor-Display-System-for-Extravehicular-Activity-Operations.pdf
- Fadden, S., Wickens, C. D. y Ververs, P. (2000). *Costs and Benefits of Head Up Displays: An Attention Perspective and a Meta Analysis*, SAE 2000-01-5542. https://saemobilus.sae.org/content/2000-01-5542
- Gustafson, S., Baudisch, P., Gutwin, C. e Irani, P. (2008). *Wedge: Clutter-Free Visualization of Off-Screen Locations*, CHI. https://doi.org/10.1145/1357054.1357179
- FAA AC 25-11B (no leída): https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_25-11B.pdf ; revisión de AR para peatones (TU Delft, NV): https://www.frontiersin.org/articles/10.3389/frobt.2024.1324060
