# Indicadores de hielo enterrado a escala de sitio (10-500 m) para S1094b

Etiquetas: **[D]** documentado, leído en texto completo o en el pasaje citado. **[D-r]** documentado, pero leído solo en resumen, ficha, página de producto o resumen de buscador. **[I]** inferencia nuestra. **[NV]** no verificado. Fecha de búsqueda: 2026-11-08.

Cómo se leyó: Dundas 2023 (texto local `scratchpad/dundas2023.txt`), Bramson 2015 (pypdf, ya bajado) y Chang 2025 (pypdf) en texto completo. Morgan 2025 (SWIM) se releyó con WebFetch, que pasa por un modelo intermedio: la Tabla 1 se pidió transcripta y conviene cotejarla antes de citarla en una entrega. El resto se leyó en resumen. No se repite el inventario regional de `modelos_previos.md` ni de `viabilidad-expediciones.md`; se lo referencia cuando hace falta.

## Resumen en tres líneas

- Hay **una sola** señal de terreno con relación documentada con hielo somero **actual**: los polígonos de contracción térmica, y su tamaño crece con la profundidad de la tabla de hielo. En tres recortes de HiRISE del sitio no se ven redes de polígonos, y Dundas 2023 tampoco los menciona [I].
- Lo que sí hay en S1094b (textura hummocky, cráteres expandidos, montículos) indica **pérdida pasada** de hielo masivo, a varios metros o decenas de metros. Ninguna fuente lo relaciona con la profundidad de la tabla de hielo a 1-3 m, ni dentro de un sitio.
- En la Tierra, con 564 perforaciones, los modelos predicen bien la **forma de superficie** (polígonos de cuña de hielo, AUC 0.95), pero mal el **hielo enterrado** a 0-5 m (AUC 0.67, 63.6 % de falsos positivos). Es el mismo salto que tendría que dar IceWalk.

## Hallazgos por señal

### 1. Cráteres chicos con fondo plano, concéntricos o con terrazas, y la relación profundidad/diámetro

- **Qué es:** cráteres de pocos metros a cientos de metros que excavan hasta una capa más resistente y quedan con fondo plano, terrazas o fondo con hoyuelo. "Subsurface ice produces a marked strength contrast in otherwise loose regolith and flat-floored craters have been used to infer the ice table depth" [D] [Dundas 2023](https://doi.org/10.1029/2022GL100747), p. 2.
- **Actual o pasado:** hielo actual, o al menos una capa resistente actual. Que sea hielo es interpretación [D] (repo).
- **Profundidad:** 0.2-3 m en S1094b (repo).
- **Evidencia:** cráteres con hielo expuesto (Dundas 2021, a 39.1°N, ~0.9 m) [D] Dundas 2023, p. 5. Coincide con SWIM23 sin hielo [D] Sizemore 2026 (en `modelos_previos.md`).
- **Escala:** dato puntual; en S1094b el vecino más cercano está a ~93 m de mediana (repo).
- **Detección automática:** existen detectores de cráteres chicos en HiRISE con YOLO v11, todavía imprecisos debajo de ~5 m [D-r] ([EPSC-DPS2025-1547](https://meetingorganizer.copernicus.org/EPSC-DPS2025/EPSC-DPS2025-1547.html)). No se encontró un detector de **fondo plano**.
- **En S1094b:** sí; es la tabla de 349 cráteres.
- **Uso:** **no es una covariable, es la observación.** Se incluye solo como referencia para el ranking. [I]
- Dato nuevo: en Arcadia, a igual latitud, los cráteres con terrazas tienen menor d/D que los de cuenco, lo que sugiere un blanco debilitado por hielo [D-r] ([Faletti 2026, EPSC2026-235](https://meetingorganizer.copernicus.org/EPSC2026/EPSC2026-235.html), resumen de congreso; 22 cráteres, sin valores numéricos en la página).

### 2. Cráteres expandidos

- **Qué es y cómo se ve:** cráteres con el borde "expandido" y las paredes suavizadas, más anchos y someros que un cráter fresco; en CTX se confunden a veces con cráteres con terrazas [D] [Bramson 2015](https://arxiv.org/pdf/1509.03210), sección 2. Se forman por sublimación de un hielo somero expuesto por el impacto [D-r] [Viola 2015](https://experts.arizona.edu/en/publications/expanded-secondary-craters-in-the-arcadia-planitia-region-mars-ev-2/); "expanded craters form via sublimation of massive ice causing slope retreat around a crater" [D] Dundas 2023, p. 5, citando Dundas 2015.
- **Actual o pasado:** registran **pérdida** de hielo, pero exigen que quede hielo en el terreno vecino: "Substantial quantities of excess ice are required, at least comparable to the vertical extent of the landform, and such ice must remain in adjacent terrain to support the non-deflated surface" [D-r] ([Dundas 2015](https://pubs.usgs.gov/publication/70159328), resumen). En S1094b: "The coincidence of extant massive ice with some of the lowest-latitude expanded craters supports the hypothesis that those landforms indicate partial loss of massive ice, supporting their use to infer its presence elsewhere" [D] Dundas 2023, p. 7.
- **Profundidad:** hielo **masivo** de espesor al menos comparable a la profundidad del cráter expandido (metros a decenas de metros) [D-r] Dundas 2015. La profundidad del techo del hielo está "poorly constrained" según Viola 2015 [D-r], leído solo a través del buscador.
- **Evidencia:** cráteres que exponen hielo (S1094b mismo; Dundas 2023) y modelo (Dundas 2015). Sin perforación ni radar a esa escala.
- **Escala:** regional. Mapeo de Arcadia por Viola 2015; widespread al norte de ~35°N y en parches hasta 25°N [D-r] [Viola y McEwen 2018](https://experts.arizona.edu/en/publications/geomorphological-evidence-for-shallow-ice-in-the-southern-hemisph-2/). Hay un indicio de variación **subregional**: la eyecta de un cráter más viejo conserva secundarios expandidos más grandes que el terreno vecino, "possibly because the subsurface ice layer is thicker" [D] ([nota de HiRISE sobre Viola 2015](https://www.uahirise.org/epo/nuggets/expanded-secondary.pdf), texto completo de 1 página). No da distancia ni estadística.
- **Detección:** manual en CTX y HiRISE en todos los trabajos leídos. No se encontró detector automático. SWIM los mapea en CTX con peso 0.1 en las tres profundidades: "not a 10% probability" [D] [Morgan 2025](https://doi.org/10.3847/PSJ/ad9b24), Tabla 1.
- **En S1094b:** "several expanded craters" cerca del cráter nuevo, Figura 4b [D] Dundas 2023, p. 5. El cráter está ~150 km al oeste de los expandidos de más baja latitud del hemisferio norte, salvo terrenos aislados [D] mismo pasaje. Cuántos caen dentro de la grilla: [NV]. Las imágenes de la Figura 4 están en la Tabla S1 del suplemento, que no se leyó.
- **Uso:** distancia al expandido más cercano o densidad por km², hecha a mano sobre CTX o HiRISE [I]. Habla de la capa masiva, no de la tabla de hielo a 1 m: la dirección esperada para `d` es ambigua [I].

### 3. Montículos aislados (cráteres invertidos)

- **Qué es:** montículos de hasta ~200 m, con una secuencia gradual hasta formas de techo plano; se interpretan como relleno eólico de cráteres que frenó la sublimación y quedó en relieve [D] Dundas 2023, pp. 5-6.
- **Actual o pasado:** pérdida pasada. Con el montículo mayor, "at least ∼30 m of ice [...] has likely been lost" [D] Dundas 2023, p. 6.
- **Profundidad:** decenas de metros de hielo perdido.
- **Evidencia:** interpretación morfológica y modelo (Dundas 2015). Hay montículos hasta ~33°N, pero no sobre lava bien definida [D] Dundas 2023, p. 6.
- **Escala:** formas de 50-200 m; distribución regional.
- **Detección:** manual; en el DTM de 1 m son positivos topográficos fáciles de segmentar [I].
- **En S1094b:** sí, "isolated mounds" cerca del cráter, Figura 4c [D] Dundas 2023, p. 5. Dentro de la grilla: [NV].
- **Uso:** máscara local (el montículo no es terreno representativo) y quizá distancia [I]. Sin relación documentada con `d`.

### 4. Textura hummocky, terreno texturado, manto disectado y "basketball"

- **Qué es:** superficie con montículos y hoyos de metros, sobre el manto latitudinal. En S1094b: "sparsely cratered hummocky-textured coating of mid-latitude mantling deposits [...] over the lava" que llega hasta 33-34°N [D] Dundas 2023, p. 5. SWIM la incluye como "Textured": "Extensive patterned ground or irregular, nonscalloped pitting" [D] Morgan 2025, Tabla 1.
- **Actual o pasado:** pérdida parcial. "The hummocky texture likely represents residual regolith after partial ice loss" [D] Dundas 2023, p. 5. Mustard 2001: donde el manto está roto en hoyos y montículos, el agua ya no está [D-r] ([Mustard 2001](https://ideas.repec.org/a/nat/nature/v412y2001i6845d10.1038_35086515.html), resumen y nota de prensa).
- **Profundidad:** el manto con hielo en poros tiene 1-10 m de espesor entre 30° y 60° [D-r] Mustard 2001. En S1094b, el manto mide 7-40 m según la eyecta rocosa [D] Dundas 2023, p. 5. SWIM pesa "Textured" 0.1 en 0-1 y 1-5 m, y 0 a más de 5 m [D] Morgan 2025.
- **Evidencia:** solo morfología e interpretación. Sin verdad de terreno.
- **Escala:** la descripción es regional. "Basketball": textura de metros, atribuida a congelamiento estacional del regolito rico en hielo según un epígrafe de NASA [D-r], fuente secundaria.
- **Detección:** semiautomática y barata desde el DTM de 1 m (rugosidad detrended en ventanas de 10-50 m) o desde la textura de HiRISE [I]. No se encontró un clasificador publicado para esta textura en particular.
- **En S1094b:** sí. En tres recortes propios de 250 × 250 m de `ESP_073578_2155_RED_A_01_ORTHO`, muy separados entre sí, la textura aparece en todos: hoyos y montículos de ~2-10 m, sin redes de polígonos claras [I, inspección visual de 3 recortes, no un muestreo]. En la vista a 10 m, la rugosidad cambia a escala de kilómetros, y la mitad sur se ve más áspera [I].
- **Uso:** índice continuo de rugosidad a 10 m [I]. La dirección esperada (más disección, hielo más profundo) sale de Mustard 2001, pero esa relación se describió a escala regional y para la existencia del hielo, no para su profundidad. Si la textura cubre casi todo el sitio, la varianza útil es poca [I].

### 5. Polígonos de contracción térmica

- **Qué es:** redes de grietas o canaletas que dibujan polígonos de metros a decenas de metros. En HiRISE, SWIM cuenta una imagen como positiva si "contained at least one cluster of polygonally patterned terrain with well-defined trough networks" [D] Morgan 2025, sección 3.2. Levy 2009 clasifica los menores de ~25 m en siete grupos, entre 30° y 80° de latitud [D-r] ([Levy 2009](https://dissem.in/p/37946486/thermal-contraction-crack-polygons-on-mars-classification-distribution-and-climate-implications-from-hirise-observations), resumen).
- **Actual o pasado:** SWIM los toma como hielo **actual** ("represent regions where shallow ground ice is currently present") por la correlación en Phoenix y en cráteres que exponen hielo [D] Morgan 2025. Pero por sí solos no prueban hielo actual (Butcher 2022, ya en el repo). Los polígonos se forman sobre todo en el manto rico en hielo [D-r] ([Levy 2010](https://ui.adsabs.harvard.edu/abs/2010Icar..206..229L)).
- **Profundidad:** SWIM les da peso 1 en 0-1 m, 0.5 en 1-5 m y 0 a más de 5 m [D] Morgan 2025, Tabla 1; es la **única** forma con peso máximo en el rango somero.
- **Relación tamaño-profundidad:**
  - Phoenix: los polígonos chicos (media 4.6 m según la prensa, 4.3 m según Keller 2009 [D-r]) son consistentes con contracción térmica actual. Un sistema mayor, de 20-25 m, se formó "while the ice table was about twice as deep as it is presently" [D-r] ([Mellon 2008](https://experts.arizona.edu/en/publications/periglacial-landforms-at-the-phoenix-landing-site-and-the-norther/), resumen). La fórmula tamaño-profundidad no se pudo leer [NV].
  - Valles Secos: "polygon size is correlated with ice-table depth" en Beacon Valley y Beacon Heights; "Remote sensing and field observations of polygon size are therefore important tools for investigating subsurface ice" [D-r] ([Mellon 2014, Antarctic Science](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0954102013000710), resumen). Sin el coeficiente ni el número de sitios.
- **Evidencia:** Phoenix (verdad de terreno a 2-18 cm), cráteres con hielo y un análogo terrestre. Es la mejor de esta lista, pero vale para hielo a centímetros o decímetros.
- **Escala:** sitio a regional. SWIM los convierte en una razón de densidad con radio de 5°, a partir de 1117 imágenes en el norte [D] Morgan 2025: no los usa a escala de sitio.
- **Detección:** en la Tierra, Mask R-CNN mapea polígonos de cuña de hielo en imágenes submétricas a escala panártica [D-r] ([Witharana y Bhuiyan](https://par.nsf.gov/servlets/purl/10192453), por buscador). En Marte no se encontró un detector publicado de polígonos [I, búsqueda acotada]. El tamaño se podría medir por FFT o autocorrelación de la textura de HiRISE [I].
- **En S1094b:** Dundas 2023 no menciona polígonos en el contexto regional [D, por ausencia en el texto]. En los tres recortes propios no se ven redes de canaletas claras [I]. Queda [NV] para el resto del sitio y para polígonos muy tenues.
- **Uso:** presencia/ausencia y tamaño medio por celda de ~50-100 m [I]. Si no aparecen en el sitio, no sirven como covariable, y esa ausencia coincide con un hielo de ~1-2 m o más [I].

### 6. Cráteres con terrazas o concéntricos de cientos de metros

- **Qué es:** "a concentric, flat-lying ledge within the crater wall" [D] Bramson 2015, sección 2. En Arcadia: 62 con una terraza (D = 328 ± 129 m), 35 con dos (430 ± 135 m) y 90 dudosos [D] mismo, sección 3.
- **Actual o pasado:** interfaz actual; capa de hielo en exceso de decenas de metros, con εr consistente con hielo [D] Bramson 2015.
- **Profundidad:** las terrazas se agrupan en <10, 17-23, 26-31 y >42 m [D] Bramson 2015, sección 3. No resuelven 1-3 m.
- **Evidencia:** radar SHARAD más DTM de HiRISE (11 DTM) [D].
- **Escala:** "significant heterogeneity in the thicknesses", y reflectores con "lateral heterogeneity" e "interspersed patches that lack subsurface reflectors" [D] Bramson 2015, sección 3. Escala de km a decenas de km.
- **Detección:** detector de aprendizaje profundo sobre CTX con recall 0.63 y precisión 0.92 con confianza ≥ 0.8, en 9 imágenes de prueba [D-r] Faletti 2026, resumen de congreso.
- **En S1094b:** un cráter con terrazas a 20 km al norte, fuera de la grilla [D] Dundas 2023, p. 5. Dentro: [NV].
- **Uso:** para la capa masiva y el contexto, no para el mapa a 10 m [I].

### 7. Terreno festoneado (scalloped)

- **Qué es:** depresiones asimétricas de ~100-200 m, con escarpa hacia el polo, por sublimación de una capa rica en hielo [D-r] ([Stuurman 2016](https://zendy.io/title/10.1002/2016gl070138) por prensa; [PIA21136](https://pds-rings.seti.org/press_releases/pages/PIA21xxx/PIA21136.html)).
- **Actual o pasado:** SWIM las toma como hielo actual, con peso 0.75 en las tres profundidades [D] Morgan 2025. El modelo pide hielo en exceso comparable a la profundidad del festón [D-r] Dundas 2015.
- **Profundidad:** en Utopía, hielo en exceso bajo 1-10 m de regolito, según la prensa [D-r]. εr medio 2.8 [D-r].
- **Evidencia:** radar (Stuurman 2016) y modelo.
- **Escala:** regional; ~375 000 km² de reflector en Utopía [D-r].
- **En S1094b:** no se describen [D, por ausencia en Dundas 2023]. Viola y McEwen 2018 ubican el termokarst generalizado al norte de ~35°N, justo en el borde [D-r].
- **Uso:** no aplica salvo que aparezca [I].

### 8. Cráteres de pedestal y de eyecta excesiva

- **Qué es:** cráteres de km sobre una plataforma de decenas de metros, que conserva el material rico en hielo bajo la eyecta. 98 % de 2696 pedestales están al polo de 33°N y 40°S; altura media 48.0 m en el norte [D-r] (Kadish 2008-2010, [ficha NAU](https://experts.nau.edu/en/publications/latitude-dependence-of-martian-pedestal-craters-evidence-for-a-su/)).
- **Actual o pasado:** hielo preservado bajo la eyecta; registran el espesor de un depósito **pasado** [D-r]. SWIM: 0.75 en todas las profundidades [D] Morgan 2025.
- **En S1094b:** no se describen [D, por ausencia]. La escala (km) es mayor que una EVA [I].
- **Uso:** no aplica [I].

### 9. Ring-mold craters

- **Qué es:** cráteres sin borde con forma de molde de torta, en LDA, LVF y relleno concéntrico; se interpretan como impactos en hielo bajo regolito delgado [D-r] ([Kress y Head 2008](https://zendy.io/title/10.1029/2008gl035501)). Baker y Carter 2019 hallan formas análogas en unidades no glaciares: "glacial ice is therefore not required" [D-r] ([Baker y Carter 2019](https://ui.adsabs.harvard.edu/abs/2019Icar..319..264B/abstract)).
- **En S1094b:** no hay unidades glaciares en el sitio [I, desde Dundas 2023: lava con manto]. No aplica.

### 10. Brain terrain

- **Qué es:** textura de crestas y surcos con forma de cerebro, sobre depósitos glaciares de latitudes medias; morfología parecida a círculos de piedras clasificadas [D-r] ([Pearson 2023-2024](https://arxiv.org/abs/2311.12292)).
- **Detección:** es el único caso con detector automático masivo sobre HiRISE: ~93 % de exactitud en 52 000-58 000 imágenes, 201 imágenes nuevas y 1141 candidatas [D-r] Pearson.
- **Relación con hielo:** sugiere ciclos de congelamiento y deshielo pasados; se presenta como posibilidad [D-r]. No da profundidad.
- **En S1094b:** no descrito [D, por ausencia]. No aplica [I].

### 11. Manto latitudinal y su espesor local

- **Qué es:** depósito de polvo y hielo que suaviza el terreno; "a few meters to tens of meters in thickness" [D] Morgan 2025, Tabla 1. Head 2003 lo ubica en una edad de hielo de ~2.1-0.4 Ma [D-r] ([Head 2003](https://ideas.repec.org/a/nat/nature/v426y2003i6968d10.1038_nature02114.html)).
- **Actual o pasado:** depósito de un clima pasado, hoy en degradación [D-r] Head 2003 y Mustard 2001. SWIM: 0.1 en 0-5 m [D] Morgan 2025.
- **Espesor en S1094b, dato nuevo para el repo:** "rocky ejecta occurs in craters with diameter >500 m but not <60 m [...] the coating is locally at least 7 and up to 40 m thick" [D] Dundas 2023, p. 5.
- **Uso:** máscara de unidad (manto contra lava, que empieza más al sur) [I]. El espesor varía por km y solo se acota con cráteres > 60 m: no hay resolución para 10 m [I].

### 12. Escarpas de hielo

Entre 50° y 61° (`modelos_previos.md`). En S1094b no existen. No aplica.

### 13. Gullies

- Se concentran en laderas al polo entre 30° y 45°, muchas sobre el manto [D-r] ([Dickson 2015](https://archive2.news.brown.edu/2007-2015/articles/2015/01/gullies.html) por prensa; [esurf 2023](https://research-portal.uu.nl/ws/files/257112657/esurf-11-713-2023.pdf) por buscador). Su evolución está controlada por la estabilidad del manto [D-r].
- Indican hielo en el manto en algún momento, no profundidad actual a 1-3 m [I]. Hay actividad actual atribuida a escarcha de CO2 [D-r].
- **En S1094b:** el sitio es una llanura; solo podrían aparecer en paredes de cráteres grandes [I]. No aplica.

### 14. Pendiente y orientación

Cubierto en `modelos_previos.md` (Lange 2023, Aharonson y Schorghofer 2006). Se agrega lo de S1094b: "Retreat of massive ice to >1 m depth here supports predictions that lower-latitude ice is either more deeply buried, or localized beneath pole-facing slopes" [D] Dundas 2023, p. 7. En Phoenix, la variación de 10 veces entre zanjas se atribuye "mainly to slope effects and thermal inertia variations in the overburden soil" [D-r] ([Mellon 2009](https://ui.adsabs.harvard.edu/abs/2009JGRE..114.0E07M/abstract)). Uso: pendiente y orientación al polo desde el DTM; en S1094b solo varían de verdad en paredes de cráteres [I].

### 15. Inercia térmica y enfriamiento estacional de THEMIS a 100 m

Cubierto en `modelos_previos.md`: la relación vale a menos de ~20-50 cm; en S1094b no hay hielo detectable por métodos térmicos. Nada nuevo. Advertencia nueva [I]: en la vista a 10 m del orto se ve la zona oscura radial del cráter nuevo (zona de soplido y eyecta). Altera albedo y quizá inercia en la superficie: hay que enmascararla o modelarla como confusor antes de usar THEMIS o el albedo de HiRISE como covariable. La imagen THEMIS es anterior al impacto de 2021, pero el orto de HiRISE no [I].

### 16. Rocas y bloques

Cubierto en `modelos_previos.md`. En S1094b, los bloques de roca vienen de cráteres > 500 m y de la eyecta del cráter nuevo [D] Dundas 2023, p. 5. Siguen sin servir como covariable de `d` [I].

### 17. Color y albedo de HiRISE

- El color de HiRISE sirve para reconocer hielo **expuesto**: "A large fraction of resolved blocks have icy coloration" [D] Dundas 2023, p. 2. En escarpas de hielo, las bandas de color siguen la estratigrafía [D-r] ([PIA22077](https://pds-rings.seti.org/press_releases/pages/PIA22xxx/PIA22077.html)).
- Para hielo **enterrado**, no se encontró relación publicada entre color o albedo de HiRISE y profundidad [búsqueda acotada]. Los productos de color mejorado exageran el color y no son reflectancia [D-r].
- El albedo regional entra en los modelos térmicos (`modelos_previos.md`), pero eso vale a centímetros.
- **Uso:** no recomendado; en el sitio hay un confusor fuerte, la zona de soplido del cráter nuevo [I].

### 18. Escarcha estacional

- Que **falte** escarcha de CO2 en laderas al polo hasta ~25°S solo se explica con hielo enterrado: "buried water ice in the shallow (< 1 m) subsurface is required" [D-r] ([Vincendon 2010](https://arxiv.org/abs/1103.0379), resumen).
- THEMIS detecta escarcha de agua de 21.4°S a 48.4°N, en laderas al polo en latitudes medias [D-r] ([Lange 2024](https://arxiv.org/abs/2405.08713)). Es escarcha de superficie, no hielo enterrado.
- **En S1094b:** solo aplicaría a paredes al polo de cráteres, con imágenes de invierno y un modelo térmico [I]. Si existen imágenes de HiRISE del sitio en invierno: [NV]. Sensibilidad: < 1 m como cota superior, no como medida [D-r].
- **Uso:** presencia/ausencia de escarcha en paredes al polo, como dato de validación, no como covariable de celda [I].

### 19. Análogos terrestres

| Estudio | Qué predijo | Datos | Resultado | Lectura |
| --- | --- | --- | --- | --- |
| [Chang, Zwieback y Berg 2025](https://mdpi-res.com/d_attachment/remotesensing/remotesensing-17-01245/article_deploy/remotesensing-17-01245.pdf), Tuktoyaktuk | (1) Polígonos de cuña de hielo; (2) hielo visible en 0-5 m en perforaciones | XGBoost, 30 m; topografía, distancia a la costa, óptico, radar y geología superficial (26 variables); 60 000 puntos de un inventario de polígonos y **564 perforaciones**, 88 % ricas en hielo (pp. 4-5) | Polígonos: **AUC 0.95**, F1 macro 0.80; claves: pendiente, distancia a la costa y probabilidad de depresión (p. 1). Al transferir: AUC 0.89-0.94 contra 0.93-0.97 (Tabla 1, p. 14). Hielo enterrado: **AUC 0.67, F1 macro 0.53, 63.6 % de falsos positivos**; F1 de 0.24 en la clase pobre en hielo (pp. 14-15) | [D]. Partición 67/33 al azar (p. 7), que tiende a inflar métricas. **Es el análogo más directo:** la forma de superficie se predice, el hielo de abajo no |
| [Mellon 2014](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0954102013000710), Beacon Valley | Tamaño de polígonos contra profundidad de la tabla de hielo | Campo y modelo de esfuerzo estacional | "polygon size is correlated with ice-table depth" | [D-r] Solo resumen; sin coeficiente |
| [Marinova y McKay 2013](https://openpolar.no/Record/crcambridgeupr:10.1017%2Fs095410201200123x/Details), montañas Quartermain | Profundidad al suelo cementado por hielo | 475 mediciones en 147 sitios ([dataset USAP-DC](https://www.usap-dc.org/view/dataset/609529)) | 0-98 cm en University Valley; +32 cm/km desde un glaciarete (fuente de vapor). En dos valles, 20-40 cm "no clear patterns of ice depth with location". "the variability in depth [...] increase[s] with increasing depth to ice" | [D-r] Resumen por buscador. Si la variabilidad crece con la profundidad, en S1094b, con mediana de ~2.35 m, cabe esperar mucha [I] |
| [Lapalme 2017](https://openpolar.no/Record/crcambridgeupr:10.1017%2Fs0954102016000572), University Valley | Contenido de hielo en 2 m | Perforaciones | El contenido de hielo cambia dentro de cada polígono: menor en los centros, mayor en los hombros hacia la boca del valle; hasta 93 % de hielo en exceso | [D-r] Resumen por buscador. Variación a escala de metros, controlada por temperatura y humedad de superficie |
| Seward, Thaler (en `modelos_previos.md`) | Presencia de permafrost | LiDAR, vegetación y nieve | ~90 % en dos sitios y 70 % en otro; 50-60 % al transferir | [D-r] Presencia, no profundidad ni contenido |

**Lectura de conjunto [I]:** en la Tierra, con vegetación, drenaje y cientos de perforaciones, las formas de superficie se predicen bien y el hielo enterrado mal. Ninguno de estos estudios logra predecir la profundidad de la tabla de hielo a 1-3 m con métricas altas. El único que relaciona una medida de superficie con la profundidad es el de polígonos de Mellon 2014, para hielo a decímetros.

## Observación propia sobre S1094b

- Archivos: `data/raw/ESP_073578_2155_RED_A_01_ORTHO.JP2`, posterior al impacto. Recortes de 1000 × 1000 píxeles (250 m) centrados en las columnas y filas (13213, 5560), (17176, 32433) y (13213, 41700), más una vista promediada a ~10 m. Imágenes en `scratchpad/img_finos/`. Script en `scratchpad/scripts_finos/crops.py`; se usó el venv de `model/` solo para leer.
- Lo que se ve [I]: textura hummocky con hoyos de ~2-10 m en los tres recortes; ningún sistema de canaletas poligonales claro. En la vista general: zona oscura radial alrededor del cráter, y textura más áspera hacia el sur.
- Esto no es un mapeo: falta recorrer todo el sitio a resolución completa.

## Tabla de covariables candidatas, ordenadas por cuánto prometen para S1094b

`d` = profundidad a la capa resistente o tabla de hielo.

| # | Señal | Qué es / cómo se ve | Actual o pasado | Profundidad asociada | Evidencia | Escala mostrada | Detección y dato | ¿En S1094b? | Uso como covariable | Respaldo para entrar al mapa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Cráteres chicos de fondo plano | Fondo plano o con terrazas en cráteres de 5-50 m | Actual (capa resistente) | 0.2-3 m | Cráteres con hielo expuesto; Sizemore 2026 [D] | Puntos, ~93 m entre vecinos | Manual en HiRISE; YOLO para cráteres, no para fondo plano [D-r] | Sí, 349 | **Es el dato, no covariable** | Ya es la observación |
| 1 | Pendiente y orientación al polo | Laderas al polo en el DTM | Control físico actual | cm a dm; "localized beneath pole-facing slopes" | Modelo; Phoenix [D-r]; Dundas 2023 [D] | Decenas de m | Automática, DTM 1 m | Solo paredes de cráteres | Continua: pendiente × cos(aspecto) | **Probar**: base física; poca superficie |
| 2 | Rugosidad o textura hummocky | Hoyos y montículos de 2-10 m | Pérdida parcial pasada | Manto de 7-40 m; hielo residual 1-10 m (Mustard) | Solo interpretación [D] | Regional | Automática: rugosidad del DTM o textura de HiRISE [I] | Sí, en todo lo visto [I] | Índice continuo a 10 m | **Probar**: barata; dirección y fuerza desconocidas |
| 3 | Inercia térmica THEMIS | Ver `modelos_previos.md` | Control actual | < 20-50 cm | Phoenix, Melea [D] | 100 m | Automática | Sí | Continua | **Probar**, con máscara de la zona de soplido; se espera nulo |
| 4 | Cráteres expandidos | Bordes suavizados y ensanchados | Pérdida de hielo masivo; queda hielo al lado | Hielo masivo de metros a decenas de m | Cráter con hielo expuesto en S1094b; modelo [D] | Regional; indicio subregional [D] | Manual en CTX/HiRISE | Cerca, sí [D]; en la grilla [NV] | Distancia o densidad | Débil: habla de la capa masiva, no de `d` |
| 5 | Polígonos de contracción | Redes de canaletas de 3-25 m | Hielo somero actual (Phoenix) | cm-dm; SWIM 0-1 m | Phoenix, cráteres, Valles Secos [D]/[D-r] | Sitio; SWIM los usa a 5° | Manual; CNN en la Tierra [D-r] | No vistos [I] | Presencia y tamaño | Fuerte en general, **inútil si no aparecen** |
| 6 | Montículos (cráteres invertidos) | Montículos de 50-200 m | ≥ 30 m de hielo perdido | Decenas de m | Interpretación y modelo [D] | Regional | Manual o DTM | Cerca, sí [D] | Máscara o distancia | Débil; máscara |
| 7 | Espesor del manto | Cráteres con o sin eyecta rocosa | Pasado | 7-40 m | Excavación de eyecta [D] | km | Manual | Sí | Máscara de unidad | Solo como máscara |
| 8 | Cráteres con terrazas | Repisa concéntrica en cráteres de 300-450 m | Interfaz actual | <10 a >42 m | SHARAD y DTM [D] | km a decenas de km | DL en CTX: recall 0.63, precisión 0.92 [D-r] | A 20 km, fuera [D] | Contexto | No para el mapa a 10 m |
| 9 | Escarcha estacional en laderas al polo | Ausencia de CO2 en invierno | Actual | < 1 m (cota) | Modelo térmico [D-r] | Laderas | Imágenes de invierno y modelo | [NV] | Validación | No como covariable |
| 10 | Color o albedo de HiRISE | Tono | - | Superficie | Sin relación encontrada | - | Automática | Con confusor fuerte | - | No |
| 11 | Festoneado, pedestal, ring-mold, brain terrain, escarpas, gullies | Ver secciones 7-13 | Varios | m a decenas de m | Radar o morfología | Regional | Brain: CNN 93 % [D-r] | No descritos [D, por ausencia] | - | No aplican |

## Ajustes y contradicciones con el repo

1. **`hielo-y-modelo.md`, "formas cercanas indican pérdida de hielo":** se confirma y se precisa. Expandidos y montículos indican pérdida de **hielo masivo**, y los expandidos además exigen que quede hielo en el terreno vecino [D] Dundas 2015 y 2023. No informan la tabla de hielo a 1 m [I].
2. **Dato nuevo para `hielo-y-modelo.md`:** el manto tiene 7-40 m en el sitio, por la eyecta rocosa [D] Dundas 2023, p. 5.
3. **`modelos_previos.md`, polígonos "Sí, si se detectan":** en tres recortes no aparecen. Si se confirma en todo el sitio, salen de la lista de covariables [I].
4. **SWIM, Tabla 1:** pesos 1 / 0.5 / 0 para polígonos y 0.1 para texturado, expandidos, aterrazados y ring-mold. Morgan 2025 aclara que 0.1 no es probabilidad [D]. Si IceWalk menciona estas formas en el pitch, conviene usar esa jerarquía y no inventar otra.
5. **Confusor nuevo:** la zona de soplido y eyecta del cráter de 2021 cambia el tono de la superficie en los ortos posteriores. Cualquier covariable de albedo o color, y quizá de THEMIS posterior, tiene que enmascararla [I].

## Lo que no se pudo abrir o verificar

- Viola 2015 y 2017 en el PDF de lpl.arizona.edu (404); USGS y el repositorio de Arizona (403); openpolar.no (falla de certificado TLS, no se forzó); ADS (405). Se usaron la ficha de experts.arizona.edu y la nota de HiRISE.
- Dundas 2015 en PDF (404); solo el resumen.
- Mellon 2008 y 2014, Levy 2009 y 2010, Kadish 2009-2010, Mustard 2001, Head 2003, Kreslavsky y Head 2002, Kress y Head 2008, Stuurman 2016, Lapalme 2017 y Marinova 2013: solo resumen o buscador. Un PDF que parecía Kreslavsky y Head 2002 resultó ser Garvin 2006, y se descartó.
- La fórmula tamaño-profundidad de los polígonos (Mellon 2008) [NV].
- Suplemento de Dundas 2023 (Tabla S1 e imágenes de la Figura 4) y si los expandidos y montículos caen dentro de la grilla.
- Archivos auxiliares de SWIM con los mapas de formas: la página dice que existen, pero no tiene enlace.
- Si hay imágenes de HiRISE del sitio en invierno para buscar escarcha.

## Fuentes

- Dundas 2023, GRL: https://doi.org/10.1029/2022GL100747
- Morgan, Putzig y otros 2025, PSJ (SWIM): https://doi.org/10.3847/PSJ/ad9b24 ; productos: https://swim.psi.edu/SWIM4MIMProducts.php
- Bramson 2015, GRL: https://arxiv.org/pdf/1509.03210
- Viola 2015, Icarus (ficha): https://experts.arizona.edu/en/publications/expanded-secondary-craters-in-the-arcadia-planitia-region-mars-ev-2/ ; nota de HiRISE: https://www.uahirise.org/epo/nuggets/expanded-secondary.pdf
- Viola y McEwen 2018, JGR Planets (ficha): https://experts.arizona.edu/en/publications/geomorphological-evidence-for-shallow-ice-in-the-southern-hemisph-2/
- Dundas, Byrne y McEwen 2015, Icarus (ficha): https://pubs.usgs.gov/publication/70159328
- Faletti y otros 2026, EPSC (terrazas, d/D y detector): https://meetingorganizer.copernicus.org/EPSC2026/EPSC2026-235.html
- Millot y otros 2025, EPSC-DPS (YOLO en HiRISE): https://meetingorganizer.copernicus.org/EPSC-DPS2025/EPSC-DPS2025-1547.html
- Mellon 2008, Phoenix periglacial (ficha): https://experts.arizona.edu/en/publications/periglacial-landforms-at-the-phoenix-landing-site-and-the-norther/
- Mellon 2009, hielo en Phoenix (ficha): https://ui.adsabs.harvard.edu/abs/2009JGRE..114.0E07M/abstract
- Mellon y otros 2014, Antarctic Science (polígonos y tabla de hielo): https://www.cambridge.org/core/services/aop-cambridge-core/content/view/S0954102013000710
- Levy 2009, JGR (ficha): https://dissem.in/p/37946486/thermal-contraction-crack-polygons-on-mars-classification-distribution-and-climate-implications-from-hirise-observations
- Levy 2010, Icarus (ficha): https://ui.adsabs.harvard.edu/abs/2010Icar..206..229L
- Mustard 2001, Nature (resumen): https://ideas.repec.org/a/nat/nature/v412y2001i6845d10.1038_35086515.html
- Head 2003, Nature (resumen): https://ideas.repec.org/a/nat/nature/v426y2003i6968d10.1038_nature02114.html
- Kadish 2009, JGR (ficha): https://experts.nau.edu/en/publications/latitude-dependence-of-martian-pedestal-craters-evidence-for-a-su/
- Kress y Head 2008, GRL (ficha): https://zendy.io/title/10.1029/2008gl035501
- Baker y Carter 2019, Icarus: https://ui.adsabs.harvard.edu/abs/2019Icar..319..264B/abstract
- Stuurman 2016, GRL (ficha): https://zendy.io/title/10.1002/2016gl070138 ; PIA21136: https://pds-rings.seti.org/press_releases/pages/PIA21xxx/PIA21136.html
- Pearson y otros, brain terrain: https://arxiv.org/abs/2311.12292
- Dickson 2015, gullies (prensa): https://archive2.news.brown.edu/2007-2015/articles/2015/01/gullies.html ; esurf 2023: https://research-portal.uu.nl/ws/files/257112657/esurf-11-713-2023.pdf
- Vincendon 2010, GRL: https://arxiv.org/abs/1103.0379
- Lange 2024, JGR Planets: https://arxiv.org/abs/2405.08713
- PIA22077, escarpas: https://pds-rings.seti.org/press_releases/pages/PIA22xxx/PIA22077.html
- Chang, Zwieback y Berg 2025, Remote Sensing: https://mdpi-res.com/d_attachment/remotesensing/remotesensing-17-01245/article_deploy/remotesensing-17-01245.pdf
- Marinova y McKay 2013 (ficha): https://openpolar.no/Record/crcambridgeupr:10.1017%2Fs095410201200123x/Details ; dataset: https://www.usap-dc.org/view/dataset/609529
- Lapalme 2017 (ficha): https://openpolar.no/Record/crcambridgeupr:10.1017%2Fs0954102016000572
- Witharana y Bhuiyan, polígonos de cuña con Mask R-CNN: https://par.nsf.gov/servlets/purl/10192453

## Respuesta corta

**No hay ninguna señal de escala de sitio con respaldo suficiente para entrar al mapa como predictor de la profundidad del hielo en S1094b.** La única forma con relación documentada con hielo somero actual y con su profundidad son los polígonos, y en lo inspeccionado del sitio no aparecen [I]. Las formas que sí hay (textura hummocky, cráteres expandidos, montículos) documentan pérdida de hielo masivo a metros o decenas de metros, a escala regional, sin relación publicada con la tabla de hielo a 1-3 m. El análogo terrestre más directo muestra que, aun con 564 perforaciones, la superficie predice mal el hielo enterrado (AUC 0.67).

Lo defendible [I]:

- **Al mapa como covariables "a probar", no como prior:** pendiente y orientación al polo (física documentada), rugosidad hummocky del DTM (barata, presente en el sitio) e inercia THEMIS, con máscara de la zona de soplido. La prueba es la regresión censurada de `log d` de los 349 cráteres que ya propone `modelos_previos.md`. Si da nula, el prior queda como nivel más varianza, y eso también se reporta.
- **Como máscaras y contexto, no covariables:** unidad de manto (7-40 m), montículos y cráteres expandidos. Estos últimos sirven para el pitch: indican que hay hielo masivo en la región, no dónde está la tabla de hielo.
- **Fuera:** color o albedo de HiRISE, festoneado, pedestales, ring-mold, brain terrain, escarpas y gullies.
