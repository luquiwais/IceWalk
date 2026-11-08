# Confiabilidad del GPR para identificar hielo enterrado (para S1094b)

Fecha: 2026-11-08. Alcance: fijar en el modelo de IceWalk (1) la probabilidad de que un reflector no sea hielo, (2) la de no detectar hielo que sí existe y (3) el error de profundidad por permitividad.

Ya registrado en el repo y no repetido acá: que el radar ve interfaces y no composición (Ciarletti 2017, Hamran 2020, Shoemaker en Askja, Thompson 1994), y los casos Odell (CPC6) y Williams (Haughton, «no toda depresión tenía hielo»). `docs/research/misiones_agua` no existe; sí existe `scratchpad/downloads/misiones_agua`, con PDF ya usados en `viabilidad-expediciones.md` (Thompson, CPC6, Elphic, Pathare, Boschung).

Etiquetas: **[D]** documentado, con cita y página o sección; **[D-r]** documentado, pero leído a través del resumidor de WebFetch, con sección y sin página; **[D-s]** solo snippet del buscador, sin abrir la fuente; **[I]** inferencia; **[C]** cálculo propio, no validado; **[NV]** no verificado.

---

## 1. Respuesta corta: valores recomendados

**No existe una tasa publicada** de «reflector interpretado como hielo que resultó no ser hielo» ni de «hielo existente que el GPR no vio». Ninguna fuente revisada tabula aciertos y errores del GPR contra perforación para hielo [D, por ausencia en lo revisado]. Los valores que siguen son **supuestos**: van con `"assumption": true` y se anotan en `docs/SOURCES.md`. Están anclados en los casos de la sección 2.

| Parámetro | Valor central | Rango | Respaldo |
| --- | --- | --- | --- |
| **P(reflector no es hielo)**, o sea, la profundidad del reflector elegido no coincide con el techo del hielo | **0.25** | 0.10-0.45 | [I] Sale de dos efectos distintos (ver abajo). En sitios análogos elegidos porque se sabía que había hielo, casi todas las comprobaciones encontraron hielo en el reflector: Askja (todas las trincheras de los sitios 1-3), Galena (1 exposición), De Pascale (1 talud de excavación) y Lirung (34 pozos). En terreno estratificado sin hielo, en cambio, el GPR da reflectores igual: Taylor Valley, Jezero, Zhurong y el Vikrahraun en Askja. Además, el reflector puede ser una capa vecina del techo: Fortier, Meng (Sulphur Creek), McCarthy y Bramson |
| **P(no detecta hielo existente)**, dentro del alcance | **0.30** para el techo de **hielo en poros** (la tabla de hielo de S1094b); **0.10** para el techo de hielo masivo con contraste fuerte | 0.15-0.50 (poros); 0.05-0.20 (masivo) | [I] Lirung: 13 de 29 perfiles sin reflexión continua del hielo [D-r]. Fortier: una de las tres transiciones de los sondeos no aparece en el GPR [D más I]. Askja: no resuelve las transiciones de hielo en poros a masivo y en algunos casos no se pudo identificar el hielo [D]. Jafarov: 2 relevamientos sin reflexión en grava [D-r]. Hay una salvedad física: en algunas mezclas, el contraste entre hielo en exceso y regolito seco poroso es casi nulo [C] |
| **Error relativo de profundidad por permitividad**, como σ de `ln(d)` | Sin calibrar: **0.20** (≈ ±20 % a 1σ; de −20 % a +30 % como intervalo de ~90 %). Con hipérbolas: **0.15**. Con perforación cerca: **0.10** | 0.15-0.30; 0.10-0.20; 0.07-0.15 | Los rangos medidos de εr en Marte van de 2.5 a 9: Bramson 2.5 ± 0.28 [D], Zhurong 3.6 (+3.1/−2.0) [D-s], RIMFAX 9.0 ± 2.8 [D] y tefra de Askja por trinchera 2.6-7 [D]. Las hipérbolas solas pueden sesgar en terreno clástico: en Askja dieron εr de 6 a 18 contra 4.4-5.5 por trinchera [D]. Con perforación, el RMSE fue de 0.04-0.07 m a menos de 0.6 m de profundidad (~10-18 %) [D-r] |

**Cómo usarlos en `observations.py`** [I]:

- La identificación no conviene modelarla como una constante, sino con verosimilitudes y Bayes. Valores sugeridos: P(reflector | hielo dentro del alcance) = 1 − P(miss), y P(reflector somero | sin hielo) ≈ 0.5-0.8, porque en eyecta estratificada casi siempre hay alguna interfaz. Con el prior del repo (`P(d ≤ 5 m)` ≈ 0.92), la probabilidad de que no haya hielo dado un reflector queda baja (~0.05-0.10) [C]. **El riesgo dominante en S1094b no es «no hay hielo», sino «el reflector elegido no es el techo del hielo»**: otra capa de la eyecta arriba, o el techo del hielo masivo debajo de la tabla de hielo en poros. Por eso el 0.25 se interpreta mejor como la probabilidad de que la profundidad observada corresponda a otra interfaz, y no como P(ausencia de hielo).
- Esto se puede modelar como una mezcla: con probabilidad 0.75, `d_obs ~ LogNormal(ln d_true, 0.20)`, y con probabilidad 0.25, `d_obs` es independiente de `d_true` (uniforme en 0.3-5 m, o atado a otra capa).
- Un «no veo reflector» se modela como una cota blanda: reduce `P(d ≤ alcance)` en la proporción de 1 − P(miss), y no la lleva a cero.
- El alcance práctico se puede reducir en terreno con bloques. Hamran 2020 ya lo dice, y está registrado.

---

## 2. Casos con cifra

### 2.1 Identificación: ¿el reflector era hielo?

| # | Caso | Qué se comparó | Cifra | Qué dice para IceWalk | Etiqueta y URL |
| --- | --- | --- | --- | --- | --- |
| 1 | Askja, Islandia (análogo de Marte; tefra sobre hielo masivo) | 57 radargramas a 200, 400 y 900 MHz, contra trincheras y sondeos en 3 sitios | En los sitios 1-3, todas las trincheras y sondeos sobre las trazas encontraron hielo en el reflector: techo a 33-50 cm en el sitio 2 y 40-52 cm en el sitio 1. No se reporta ningún reflector de hielo que resultara no serlo. En el Vikrahraun, la estratigrafía es «ice-free»: hay un reflector, pero es pómez sobre basalto | Con hielo conocido, la identificación anduvo bien. Un sitio sin hielo también da reflector | [D] Shoemaker et al., manuscrito enviado a JGR Planets, p. 14 (Tabla 1), p. 20 (fig. 4g, «Stratigraphy is ice-free») y p. 21-23. https://ntrs.nasa.gov/api/citations/20240009232/downloads/HollibaughMappingSTI.pdf |
| 2 | Askja, póster AGU 2020 | Más de 66 relevamientos; sondeos de 1-1.5 m | Hielo en poros a ~15-30 cm y hielo puro a 0.6-1 m | El techo del hielo en poros y el del masivo difieren en decenas de cm. ¿Cuál marca el radar? | [D-r] Shoemaker et al. 2020, resumen. https://ntrs.nasa.gov/citations/20205010224 |
| 3 | Galena Creek, Wyoming (glaciar cubierto por detritos) | GPR a 50 y 100 MHz contra la pared de un estanque termokárstico | Reflector somero generalizado a 1-2.5 m, interpretado como detrito sobre hielo. La pared muestra 1-1.5 m de detrito seco sobre hielo puro: 1 de 1 confirmado. También aparecen 6 reflectores internos que buzan, interpretados como bandas de detritos dentro del hielo | Análogo directo de S1094b (detrito seco sobre hielo a 1-2.5 m). Debajo del techo hay reflectores que no son el techo | [D] Petersen et al. 2016, EGU2016-10541, p. 1. https://meetingorganizer.copernicus.org/EGU2016/EGU2016-10541.pdf |
| 4 | Sulphur Creek, Wyoming (glaciar de roca) | 1 excavación contra el reflector | 17 ns de TWTT. La reflexión puede venir del techo del detrito cementado por hielo a 70 cm o del hielo limpio a 90 cm, o de ambos; la capa es más fina que la resolución | Ambigüedad de ~20 cm (~25 %) sobre cuál interfaz con hielo es el reflector | [D-r] Meng et al. 2023, J. Glaciology, sec. 3.5. https://www.cambridge.org/core/product/C5A46B34C2596B1C8B05E06E541CE013/core-reader |
| 5 | Sourdough y Galena (mismo trabajo) | Velocidad de la interfaz somera | A Sourdough le da ~0.18 m/ns, por encima del límite de 0.17 m/ns del hielo puro; se trata como detrito. En Galena, a 200 MHz, ~0.11 m/ns, que puede ser una capa fina de detrito cementado y no hielo limpio | El reflector somero puede no ser hielo limpio | [D-r] mismo trabajo, sec. 3.1 y 3.5 |
| 6 | Glaciar Lirung, Nepal (detritos sobre hielo) | 29 perfiles; 34 pozos de 0.16-0.58 m | La polaridad de la reflexión del hielo suele ser − + −, no la + − + esperada. Los autores la atribuyen a una capa de alta permitividad (detrito húmedo o con hielo, o agua de deshielo recongelada) sobre el hielo limpio. Algunos perfiles muestran reflexiones fuertes a varias profundidades. Los valores atípicos se tratan como posibles errores de picado o reflectores fuera del nadir | El reflector «del hielo» a veces es una capa vecina. La polaridad sirve para separar casos | [D-r] McCarthy et al. 2017, J. Glaciology 63(239), sec. 4.1, 5.1 y 5.2. https://www.cambridge.org/core/product/27552A45D4064306A20BD3B9A0D4B12E/core-reader |
| 7 | Dalton Highway, Alaska (Yedoma) | GPR contra 136 sondeos | Estratigrafía de los sondeos: capa activa (0-0.7 m), limo rico en hielo (0.7-1.5 m), limo pobre en hielo (1.5-3.0 m) y permafrost singenético rico en hielo (3.0-10 m). El GPR muestra dos reflectores, a 0.7 y 3 m. La transición a 1.5 m, de rico a pobre en hielo, no aparece. Las cuñas de hielo se resuelven una por una con resistividad, no con el GPR | Detectó 2 de 3 interfaces; la que falta es un cambio de concentración de hielo | [D] Fortier et al. 2024, ICOP2024, p. 1, 5 y 6; [I] el «2 de 3». https://www.permafrost.org/wp-content/uploads/ICOP2024_163_Fortieretal_8C.pdf |
| 8 | Taylor Valley, Antártida (Valles Secos) | Perfiles de GPR en permafrost seco | Las reflexiones de interfaz «may be a function of only density contrasts», porque no hay agua libre y posiblemente tampoco hielo | En terreno seco hay reflectores sin hielo | [D-r] Arcone, Prentice y Delaney 2002, JGR 107, doi:10.1029/2002JE001906, resumen. https://earthref.org/ERR/78860/ |
| 9 | Arcadia Planitia, Marte (SHARAD más cráteres) | Asociar el reflector con una terraza | Asociado con la terraza de 17 m, da εr = 17.9 ± 0.39, que no es realista; con la de 43 m, εr ≈ 2.9 ± 0.39. Un cuarto cráter da 6.5, «reasonable value for pore-filling ice or porous basalt». La media de 3 cráteres es εr = 2.5 ± 0.28 | Asociar el reflector con la interfaz equivocada es un error real. El mismo εr sirve para hielo en poros o basalto poroso | [D] Bramson et al. 2015, preprint de arXiv, p. 7-8. https://arxiv.org/pdf/1509.03210 |
| 10 | Utopia Planitia, Marte (Zhurong, RoPeR) | Mismo conjunto de datos, interpretaciones distintas | Chen et al. 2023 no ven agua ni hielo en los ~5 m superiores. Un póster de 2026 interpreta una capa rica en hielo a ~15 m | Sin comprobación en el terreno, la interpretación de un reflector como hielo se discute | [D-s] resumen de Chen et al. 2023 (Geology, doi:10.1130/G50632.1) vía buscador; póster MUST 2026 https://www.must.edu.mo/images/SGS/ResearchPoster2026/25.pdf [NV, no abierto] |
| 11 | Yakutia y criterios para identificar hielo masivo | Patrón de onda | «check ice or an undisturbed rock layer, it is necessary to drill wells each time a similar wave pattern appears» | El mismo patrón sale de hielo o de roca | [D] Sokolov, Fedorova y Fedorov 2020, Geosciences 10(7):274, p. 2. https://mdpi-res.com/d_attachment/geosciences/geosciences-10-00274/article_deploy/geosciences-10-00274.pdf |
| 12 | Delta del Mackenzie (De Pascale) | GPR y CCR contra el talud de una excavación | Cuerpos de hielo masivo «confirmed through direct observation» en el talud: 1 sitio. Los otros sitios se interpretan sin comprobación directa | Confirmación cualitativa | [D] De Pascale et al. 2008, JGR 113, F02S90, p. 12. https://www.geometrics.com/wp-content/uploads/2018/10/depascale_et_al_jgr_2008.pdf |
| 13 | Picado automático de hipérbolas (genérico, no hielo) | Detección automática contra la verdad | Falsas, 20 %; no detectadas, 28 % | Orden de magnitud del error de picado. Es una cita secundaria | [D] citado por Shoemaker (manuscrito), p. 26, de Mertens et al. 2016 [NV en el original] |

**Conclusión de identificación** [I]: no hay ningún numerador sobre denominador de «reflectores de hielo que no eran hielo» en sitios con comprobación. Los casos documentados de reflectores que no son hielo aparecen en terreno sin hielo (Taylor Valley, Vikrahraun y, según Chen, Zhurong) o como confusión entre interfaces vecinas (Fortier, Meng, McCarthy, Bramson). Para S1094b, donde el prior de hielo dentro de 5 m es alto, el modo de falla principal es el segundo.

### 2.2 Detección: ¿se vio el hielo que había?

| # | Caso | Cifra | Causa | Etiqueta y URL |
| --- | --- | --- | --- | --- |
| 14 | Lirung, Nepal | Reflexión fuerte y continua en **16 de 29 perfiles** (55 %); en 13 no es evidente. Alcance de 0.1 a 2.30 ± 0.39 m, este último solo a 225 MHz | Detrito húmedo con arcilla (atenuación), frecuencia inadecuada, dispersión con tamaño de grano parecido a la longitud de onda, ruido y nieve | [D-r] McCarthy et al. 2017, sec. 4.1 y 5.1 |
| 15 | Askja | «In limited cases, it was difficult to identify the ice layer at depth due to scattering in the capping tephra layer or poor coupling». Se excluyó el 900 MHz del sitio 3. No resuelve las transiciones de hielo en poros a masivo: zonas de hielo en poros de menos de 10 cm, en el límite de la resolución | Dispersión en pómez de cm a dm; resolución | [D] Shoemaker, manuscrito, p. 14 y p. 35-36 |
| 16 | Dalton Highway | Falta la transición de rico a pobre en hielo a 1.5 m. Las cuñas no se resuelven individualmente. Alcance de 3-4 m | Contraste débil por concentración | [D] Fortier et al. 2024, p. 5-6 |
| 17 | Barrow, Alaska (capa activa) | Sin reflexión de la capa activa en 2 relevamientos de alta densidad en UNB; 13 se usaron. El de 500 MHz «failed to retrieve the correct ALT» en orillas de lago con grava | Grava | [D-r] Jafarov et al. 2018, Geoscience Data Journal 4(2), sec. 3.1 y conclusiones. https://pmc.ncbi.nlm.nih.gov/articles/PMC5873252/ |
| 18 | Utqiaġvik 2026 | Mayores desacuerdos en estanques saturados y plataformas de grava seca. Ejemplos: sondeo de 0.25-0.6 m contra 0.5-1 m de la geofísica; sondeo de ~0.5 m contra más de 0.8 m | Agua o grava seca | [D-r] Ekimova et al. 2026, The Cryosphere 20:265-283. https://tc.copernicus.org/articles/20/265/2026/ |
| 19 | Askja, pérdidas | Sitios con y sin hielo muestran atenuación similar (ya registrado); se cita solo para el contexto | - | ya en el repo |

**Conclusión de detección** [I]: en la Tierra, la mayoría de los fallos vienen de agua, arcilla o grava. En Marte seco la atenuación pesa menos, pero quedan dos problemas: la dispersión en eyecta con bloques y el **contraste débil o gradual**. Askja y Fortier muestran que las transiciones de concentración de hielo no se ven. Eso sostiene un P(miss) más alto para el techo del hielo en poros que para el del masivo.

### 2.3 Permitividad y error de profundidad

| # | Fuente | Medio | εr o velocidad | Método | Etiqueta y URL |
| --- | --- | --- | --- | --- | --- |
| 20 | RIMFAX, Jezero | Roca máfica y regolito | **9.0, DE 2.8**; 0.1 m/ns; profundidad media de los difractores 1.9 ± 1.1 m | 65 hipérbolas, soles 47-210 | [D] Hamran et al. 2022, Sci. Adv. 8, eabp8564, p. 1 y p. 6. https://rcastoragev2.blob.core.windows.net/e4296787be42b3b56fb2323edde4daf4/sciadv.abp8564.PMC9410267.pdf |
| 21 | RIMFAX (Casademont 2023) | Primeros 5 m | Sin números en el resumen: «consistent with a subsurface dominated by solid rock and mafic material» | Hipérbolas con refracción en la superficie | [D] resumen, doi:10.1029/2022JE007598. https://www.ffi.no/publikasjoner/arkiv/rimfax-ground-penetrating-radar-reveals-dielectric-permittivity-and-rock-density-of-shallow-martian-subsurface |
| 22 | RIMFAX (Shoemaker, Casademont et al. 2024, PSJ) | Máaz y Séítah | Mediana de 9.0; 3.2 g/cm³ | Hipérbolas | [D-s] https://doaj.org/article/993ace5194ba4d03905eff0f9238c6e9 (403) |
| 23 | Zhurong, RoPeR | Regolito dentro de 5 m | **3.6 (+3.1/−2.0)**, es decir, de ~1.6 a 6.7; tan δ de 0.006-0.011; «high dispersion» a lo largo del recorrido | Canal de alta frecuencia | [D-s] Zhang et al. 2023, GRL. https://doaj.org/article/d8ab817fe00746a3b2a741db41198b03 (403) |
| 24 | Arcadia (SHARAD) | Capa superior de decenas de m | **2.5 ± 0.28** (3 cráteres) | Profundidad de terrazas más retardo | [D] Bramson et al. 2015, p. 8 |
| 25 | Askja, por trinchera y sondeo | Tefra porosa seca o húmeda | Medias por depósito de 4.37-5.47 (Tabla 3); por sitio, 2.59, 2.91, 4.59 y 7 | Espesor medido más tiempo de ida | [D] Shoemaker, manuscrito, p. 18 (pie de la fig. 3) y p. 25-26 |
| 26 | Askja, por hipérbolas | Igual | **6.0-18.3** (Tabla 2), «elevated compared to the trench values». La literatura da 2-4 para tefra seca de baja densidad | Hipérbolas manuales | [D] mismo trabajo, p. 25-26. Cita «± 10% or more» en la velocidad por hipérbolas (Jol 2008) |
| 27 | Valles Secos | Grava arenosa y limosa densa, poco hielo | 4-5.5 | - | [D-r] Arcone et al. 2002, resumen |
| 28 | Tabla de referencia | Arena seca 3-5; hielo 3-4; sedimento congelado 6 | - | Literatura | [D] De Pascale et al. 2008, p. 4, Tabla 1 |
| 29 | Glaciares de roca | Hielo con detrito: 0.14-0.17 m/ns. Capa de detrito: se adopta 0.1 m/ns (ε ≈ 9); CMP someros de 0.11 (Galena) y 0.18 (Sourdough). Si se ignora un buzamiento de más de ~10°, la velocidad se sobreestima: en Gilpin Peak, 0.17 contra 0.14 m/ns (~18 %) | CMP más corrección por buzamiento | [D-r] Meng et al. 2023, sec. 2.2, 3.1-3.5 y 4.2 |
| 30 | Galena (EGU 2016) | Hielo limpio contra mezcla de roca, aire e hielo | 4 arriba; 5-9 en la parte media e inferior | CMP más hipérbolas | [D] Petersen et al. 2016, p. 1 |
| 31 | Lirung | Detrito | 0.107, 0.118 y 0.129 m/ns (±10 %; εr ≈ 5.4-7.9 [C]); RMSE contra pozos de **0.04 m**, r = 0.91 (34 pozos de 0.16-0.58 m); incertidumbre propagada de 0.07-0.39 m | CMP | [D-r] McCarthy et al. 2017, sec. 3.5, 3.7, 4.1, 4.2 y 5.2 |
| 32 | Barrow (calibrado con sondeo cada ~10 min) | Capa activa | Incertidumbre de velocidad de 13-25 %; RMSE de 0.05-0.07 m sobre una capa activa de ~0.40 m; 101 sondeos | Sondeo mecánico | [D-r] Jafarov et al. 2018, Tabla 2 y sec. 3.1 |
| 33 | Dalton Highway | Yedoma congelado | CMP de **0.07 a 0.11 m/ns** en el mismo tramo (εr ≈ 7.4-18 [C]); se usó 0.1 m/ns | CMP | [D] Fortier et al. 2024, p. 5 |
| 34 | Costa de Tuktoyaktuk 2026 | Playa sobre hielo masivo | 0.073-0.084 m/ns (εr 12.7-17) | Comentarios de los revisores, no el resumen | [D-r] Warren et al. 2026, EGUsphere. https://egusphere.copernicus.org/preprints/2026/egusphere-2026-5431/ |
| 35 | WISDOM | Antena a ~30 cm de la superficie | La hipérbola clásica no da la permitividad exacta por la refracción aire-suelo; usan trazado de rayos. Sin cifras de error contra la verdad de terreno | Ray tracing | [D-s] Dorizon y Ciarletti, EPSC 2013. https://meetingorganizer.copernicus.org/EPSC2013/EPSC2013-434.pdf (no abierto) |
| 36 | WISDOM en cuevas de hielo (Dachstein) | Hielo | Reconstrucciones «in agreement» con la observación directa y con GPR comerciales; sin números en lo leído | - | [D-s] Dorizon et al. 2016, PSS 120, doi:10.1016/j.pss.2015.10.008. https://hal-insu.archives-ouvertes.fr/insu-01227813 (bloqueado por Anubis) |

**Error de profundidad si se asume εr = 4** [C]. La relación es `d_est / d_true = sqrt(εr_real / 4)`:

| εr real | 1.6 | 2.5 | 3.6 | 5 | 6.7 | 7 | 9 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| d_est / d_true | 0.63 | 0.79 | 0.95 | 1.12 | 1.29 | 1.32 | 1.50 |

- Si el rango plausible en S1094b es 2.5-7 como intervalo de ~90 %, σ de `ln d` ≈ 0.16. Si es 1.6-9, σ ≈ 0.26 [C]. El valor recomendado de 0.20 queda en el medio.
- Con hipérbolas: la DE de εr de RIMFAX (2.8 sobre 9.0, ~31 %) se traduce en ~16 % de profundidad si se usa la media en toda la traza [C]. Askja muestra que, en terreno clástico grueso, las hipérbolas pueden **sesgar** la permitividad hacia arriba, entre 1.2 y 3.6 veces el valor por trinchera. Eso subestima la profundidad entre 10 % y 47 % [C, sobre D].
- Con perforación: el error baja a ~10-18 % cerca del punto (Lirung, Barrow), pero la velocidad cambia lateralmente. En Dalton Highway, la velocidad pasó de 0.07 a 0.11 m/ns en el mismo tramo. La calibración debería degradarse con la distancia al pozo [I].

### 2.4 Hielo en poros contra suelo seco: ¿hay contraste?

No encontramos ningún estudio de campo que mida específicamente si el techo de una tabla de hielo en poros bajo regolito seco da un reflector de GPR, ni con qué frecuencia se ve [D, por ausencia en lo revisado]. Lo más cercano:

- **Askja:** las zonas de hielo en poros (menos de 10 cm) y las transiciones de concentración «are at or below the limit of vertical resolution», y no se resolvieron. El reflector que se ve es el techo del hielo masivo [D] (Shoemaker, manuscrito, p. 35-36). En el póster de 2020, el hielo en poros está a 15-30 cm y el masivo a 0.6-1 m [D-r].
- **Bramson:** εr = 6.5 es compatible con «pore-filling ice or porous basalt», y εr = 2.5 queda fuera del espacio del hielo en poros [D] (p. 8). El hielo en poros sube la permitividad respecto del regolito seco, y el hielo en exceso la baja.
- **Ciarletti 2017:** el hielo y el sedimento muy poroso tienen propiedades dieléctricas similares. Ya está registrado.
- **Dalton Highway:** la transición de concentración de hielo a 1.5 m no se vio [D más I].

**Cálculo de contraste con el modelo CRIM** [C]. Supuestos: εr del grano de 6 u 8; hielo 3.15; capa de arriba regolito seco con la misma porosidad. Se muestran el coeficiente de reflexión en amplitud R y su potencia en dB.

| Grano, porosidad | Regolito seco | Poros llenos de hielo | Poros a medias | Hielo en exceso (90 %) | Hielo masivo |
| --- | --- | --- | --- | --- | --- |
| 6, 0.3 | 4.06 | R −0.055 (−25 dB) | −0.028 (−31) | +0.045 (−27) | +0.063 (−24) |
| 6, 0.4 | 3.50 | −0.077 (−22) | −0.040 (−28) | +0.007 (−43) | +0.026 (−32) |
| 6, 0.5 | 2.97 | −0.101 (−20) | −0.053 (−26) | −0.033 (−30) | −0.014 (−37) |
| 8, 0.3 | 5.20 | −0.049 (−26) | −0.025 (−32) | +0.096 (−20) | +0.125 (−18) |
| 8, 0.4 | 4.40 | −0.069 (−23) | −0.036 (−29) | +0.055 (−25) | +0.083 (−22) |
| 8, 0.5 | 3.66 | −0.092 (−21) | −0.048 (−26) | +0.009 (−41) | +0.038 (−29) |
| Referencia Askja: tefra (5) sobre hielo (3.2) | | | | | +0.111 (−19) |

Lectura [I]:

1. El techo del regolito **con los poros llenos** de hielo da −20 a −26 dB, algo más débil que el contraste de Askja (−19 dB), que se detectó bien. Con los poros llenos a medias cae a −26 a −32 dB.
2. **El techo del hielo en exceso o masivo bajo regolito seco y poroso puede ser casi invisible** (−37 a −43 dB en algunas combinaciones), justamente por la similitud de la que habla Ciarletti.
3. La polaridad es opuesta: el hielo en poros da R negativo (sube εr) y el masivo o en exceso da R positivo (baja εr). Leer la polaridad, como hace McCarthy, podría ayudar a separar casos [I].
4. Si la transición de seco a cementado es gradual en más de ~λ/4 (unos 7 cm a 500 MHz con εr ≈ 4), la reflexión se debilita todavía más. Es física estándar, no la verificamos con una fuente específica [I].

Esto respalda un P(miss) de ~0.3 para la tabla de hielo en poros, con un rango amplio [I].

---

## 3. Qué no se pudo abrir (y qué aportaría)

| Fuente | Problema | Qué aportaría |
| --- | --- | --- |
| Munroe et al. 2007, PPP 18:309 (Barrow, GPR 3D más testigos) | Solo metadatos (zendy u openpolar) | Cuántas cuñas interpretadas confirmó el testigo |
| Hinkel et al. 2001, PPP 12:179 (Barrow) | Solo resumen vía buscador | Verificación de hipérbolas con testigos |
| Harris et al. 2025, JGR Earth Surface (cuñas y water tracks) | 403 en Wiley | Cuñas modeladas contra testigos |
| Moorman, Robinson y Burgess 2003, PPP | No abierto | Revisión de la ambigüedad del GPR en permafrost |
| CRREL McMurdo (DTIC AD1064185, HTML y PDF), Campbell et al. 2018 (Cold Reg. Sci. Tech.) y DTIC AD1014074 | 403 | GPR contra calicatas y testigos en Antártida, quizás con conteos |
| Nobes et al. 2018, Beacon Valley (core.ac.uk) | 403 y Cloudflare | Dispersión de velocidades en 257 hipérbolas en permafrost rocoso seco |
| Zhang et al. 2023, GRL (Zhurong); Shoemaker et al. 2024, PSJ (RIMFAX) | 403 en DOAJ | Confirmar 3.6 (+3.1/−2.0) y la mediana de 9.0 |
| Casademont et al. 2023, JGR Planets (texto completo) | ADS 405; Wiley no probado | Rango de εr de RIMFAX en los primeros 5 m |
| Dorizon et al. 2016, PSS (WISDOM en cuevas de hielo); Oudart et al. 2022 | HAL bloqueado por Anubis | Error de permitividad de WISDOM contra la verdad de terreno |
| Merz et al. 2015, PPP (glaciar de roca, GPR terrestre contra helitransportado) | No abierto | GPR terrestre «inconsistent and unreliable» [D-s] |
| Mattei et al. 2014, Icarus (mezclas de hielo y basalto) | No abierto | εr medido en mezclas de hielo y regolito |
| Angelopoulos et al. 2010 (Parsons Lake) | Abierto; es sobre todo resistividad | Solo dice que la profundidad depende de la velocidad que define el usuario, «could be inaccurate» [D, p. 3] |
| Westermann (Svalbard); Cable et al. 2018 (Adventdalen) | No encontrados con GPR contra testigo | - |
| Mertens et al. 2016; Jol 2008 | Solo citados por Shoemaker | Confirmar 20 %, 28 % y ±10 % en el original |

---

## 4. Fuentes con URL

1. Shoemaker, E. S. et al. (manuscrito enviado a JGR Planets), *Mapping Ice Buried by the 1875 and 1961 Tephra of Askja Volcano*. https://ntrs.nasa.gov/api/citations/20240009232/downloads/HollibaughMappingSTI.pdf
2. Shoemaker, E. S. et al. (2020), AGU Fall Meeting, *Investigating Buried Ice at Askja Volcano*. https://ntrs.nasa.gov/citations/20205010224
3. Petersen, E. et al. (2016), EGU2016-10541, Galena Creek Rock Glacier. https://meetingorganizer.copernicus.org/EGU2016/EGU2016-10541.pdf
4. Meng, T. et al. (2023), J. Glaciology, *Rock glacier composition and structure from radio wave speed analysis with dipping reflector correction* (autores según el buscador). https://www.cambridge.org/core/product/C5A46B34C2596B1C8B05E06E541CE013/core-reader
5. McCarthy, M. et al. (2017), J. Glaciology 63, *Ground-penetrating radar measurements of debris thickness on Lirung Glacier, Nepal*, doi:10.1017/jog.2017.18. https://www.cambridge.org/core/product/27552A45D4064306A20BD3B9A0D4B12E/core-reader
6. Fortier, R. et al. (2024), ICOP2024, *Detection of ice wedges in Yedoma along the Dalton Highway*, doi:10.52381/ICOP2024.163.1. https://www.permafrost.org/wp-content/uploads/ICOP2024_163_Fortieretal_8C.pdf
7. Arcone, S. A., Prentice, M. L. y Delaney, A. J. (2002), JGR 107, doi:10.1029/2002JE001906. https://earthref.org/ERR/78860/
8. Bramson, A. M. et al. (2015), *Widespread excess ice in Arcadia Planitia*, GRL; preprint. https://arxiv.org/pdf/1509.03210
9. Hamran, S.-E. et al. (2022), Sci. Adv. 8, eabp8564. https://rcastoragev2.blob.core.windows.net/e4296787be42b3b56fb2323edde4daf4/sciadv.abp8564.PMC9410267.pdf
10. Casademont, T. et al. (2023), JGR Planets 128, doi:10.1029/2022JE007598. https://www.ffi.no/publikasjoner/arkiv/rimfax-ground-penetrating-radar-reveals-dielectric-permittivity-and-rock-density-of-shallow-martian-subsurface
11. Shoemaker, E. S., Casademont, T. et al. (2024), Planetary Science Journal (RIMFAX, Máaz y Séítah) [D-s]. https://doaj.org/article/993ace5194ba4d03905eff0f9238c6e9
12. Zhang, L. et al. (2023), GRL, *The Dielectric Properties of Martian Regolith at the Tianwen-1 Landing Site* [D-s]. https://doaj.org/article/d8ab817fe00746a3b2a741db41198b03
13. Chen, R. et al. (2023), Geology, doi:10.1130/G50632.1 (Zhurong, sin hielo en 5 m) [D-s]. https://sciencedaily.com/releases/2023/02/230214153858.htm
14. Jafarov, E. E. et al. (2018), Geoscience Data Journal 4(2):72-79. https://pmc.ncbi.nlm.nih.gov/articles/PMC5873252/
15. Ekimova, V. et al. (2026), The Cryosphere 20:265-283. https://tc.copernicus.org/articles/20/265/2026/
16. De Pascale, G. P., Pollard, W. H. y Williams, K. K. (2008), JGR 113, F02S90. https://www.geometrics.com/wp-content/uploads/2018/10/depascale_et_al_jgr_2008.pdf
17. Sokolov, K., Fedorova, L. y Fedorov, M. (2020), Geosciences 10(7):274. https://mdpi-res.com/d_attachment/geosciences/geosciences-10-00274/article_deploy/geosciences-10-00274.pdf
18. Angelopoulos, M., Pollard, W. H. y Couture, N. (2010), GeoCalgary 2010, Parsons Lake. https://members.cgs.ca/documents/conference2010/GEO2010/pdfs/GEO2010_178.pdf
19. Warren, C. et al. (2026), EGUsphere preprint, doi:10.5194/egusphere-2026-5431. https://egusphere.copernicus.org/preprints/2026/egusphere-2026-5431/
20. Williams, K. K., Haltigin, T. W. y Pollard, W. H. (2012), GSA NE, resumen. https://studio.m-anage.com/gsa/2012NE/webprogram/Paper200453.html
21. Osinski, G. R. et al. (2020), LPSC, Haughton: GPR y perforación somera «confirm the presence of ice» en la depresión de un polígono, p. 2 [D, cualitativo]. https://ntrs.nasa.gov/api/citations/20200001979/downloads/20200001979.pdf
22. Affleck, R. T. et al. (2019), Eastern Snow Conference, McMurdo: calicatas y testigos «corroborate» los perfiles, sin conteos [D]. https://www.easternsnow.org/s/61-Afflecketal.pdf
23. Dorizon, S. y Ciarletti, V. (2013), EPSC2013-434 [D-s]. https://meetingorganizer.copernicus.org/EPSC2013/EPSC2013-434.pdf
24. Dorizon, S. et al. (2016), PSS 120, WISDOM en cuevas de hielo [D-s]. https://hal-insu.archives-ouvertes.fr/insu-01227813

Archivos de trabajo (fuera del repo): textos extraídos en `C:\Users\Luqui\AppData\Local\Temp\claude\e5defd07f05a6897\ea97613a-53be-41e0-90d1-41e503389e8a\scratchpad\text_radar\` y cálculo CRIM en `C:\Users\Luqui\AppData\Local\Temp\claude\e5defd07f05a6897\ea97613a-53be-41e0-90d1-41e503389e8a\scratchpad\scripts_radar\crim.py`.
