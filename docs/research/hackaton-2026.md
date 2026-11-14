# Hackatón 2026: qué sabemos, qué falta y qué adaptar

Revisión del 2026-11-11, a 3 días del evento (14-15 nov). Revisar de nuevo el 13/11, cuando salen las guías oficiales.

## Lo que se pudo confirmar y lo que no

| Tema | Estado | Fuente |
| --- | --- | --- |
| Nombre del desafío | **Interplanetary Survival Guide: Martian Map**: mapa en capas de un lugar o ruta en Marte para planificar y hacer una Marswalk con ciencia | **Oficial**, leído en el navegador el 12/11. Dificultad Intermediate |
| Fechas de entrega | Abre el sábado 14/11 a las 9:00 y cierra el domingo 15/11 a las 23:59, hora local | Búsqueda sobre el sitio oficial (resumen, no leído directo) |
| Guía de entrega y guía de jurado y premios | Salen el **13/11** | FAQ oficial, vía búsqueda (cuestión 17) |
| Lista oficial de recursos | "Resources will be available on Friday, November 13" | Pestaña Resources del desafío, 12/11 |
| Otros desafíos | 14 en total. El único de sitios de aterrizaje es **Lunar Landing Site Navigator** (polo sur de la Luna: luz y visibilidad de la Tierra). Ninguno de Marte se pisa con el nuestro | Página oficial de desafíos, 12/11 |
| Formato de entrega | Solo la guía 2025: video de hasta 30 s con subtítulos en inglés, o hasta 7 slides, con link público. Criterios 2025: impacto, creatividad, validez, relevancia y presentación | PRD. **Confirmar el 13/11** |
| Texto oficial del enunciado | **Leído el 12/11** con el navegador (desde WebFetch y `curl` sigue fallando el certificado). Puntos clave abajo | https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/ |

## Lo que dice el enunciado oficial (12/11)

Resumen propio, sin citar de largo:

- Pide un mapa, herramienta o interfaz que un astronauta use en una excursión en Marte, con datos y herramientas de NASA, que ayude a planificar y hacer una Marswalk con ciencia.
- Marca el hueco: Mars Trek y el mapeo geológico de USGS sirven para vistas regionales y globales, **no para las zonas hiperlocales** de una EVA. Es exactamente S1094b a 10 m.
- Sugiere al menos tres tipos de datos (óptico, térmico, espectral, topográfico, geofísico, atmosférico, radiación, químico).
- La seguridad es lo primero: clima espacial y radiación, movilidad con traje y carga, y una ruta que evite obstáculos grandes como rocas.
- Opcionales: formato (pantalla del hábitat, tablet, HUD en el visor), mapa estático o **"a tool or system that generates maps of different locations"**, ventana de tiempo pasada o prevista, **imágenes en primera persona**, rovers y **trabajo en pareja**.

Para nosotros: las zonas de NASA (`exploration_zones.json`) entran como "genera mapas de otros lugares", pero el centro tiene que seguir siendo lo hiperlocal. La vista en primera persona y las rocas (visión) aparecen explícitas.

## Dónde estamos frente a lo que pide el desafío

Según la tabla del PRD. Estado al 11/11:

| Lo que pide | Estado | Falta |
| --- | --- | --- |
| Mapa o herramienta para el astronauta | API completa: plan, re-plan, mapa de hielo, ventana de EVA, clima espacial, tarjeta de sitio | **La web no muestra casi nada de esto** (PR #4 en draft, con conflictos) |
| Lugar hiperlocal | S1094b, grilla de 10 m | — |
| Objetivo científico | Hielo en latitudes medias; pregunta del producto: «¿vale la caminata, con qué herramienta y adónde primero?» | Que el pitch lo cuente así (ver "Adaptar") |
| Al menos 3 tipos de datos | DTM de HiRISE (topografía), imagen HiRISE, cráteres de Dundas 2023, Daubar 2022 (regional), DONKI (clima espacial), Viking Lander 2 (clima) | Que se vean como capas en la web |
| Seguridad del astronauta | Pendiente ≤ 20°, margen de regreso con caution y warning, reserva, DONKI, ventana de EVA | Dibujarlo en la web |
| Ruta que evita obstáculos | Ruta sobre el DTM con exclusión por pendiente | Bloques reales de visión (Guido, `plans/vision.md`); el pasillo hoy es mock |
| Imágenes en primera persona | Pendiente | Vista 3D a nivel del suelo (Frontend) |
| Trabajo en pareja | EV1/EV2 en el timeline | — |
| Replicable a otro sitio | Prior regional por latitud y tarjeta de sitio | — |

**Conclusión:** la ciencia y el backend están bien y no conviene sumarles alcance. El riesgo está en que el jurado no lo pueda ver: no hay deploy, la web no consume la API real y el pitch cuenta una historia vieja.

## Qué falta, por prioridad

1. **Deploy público (crítico).** No hay link para el jurado. Web en Vercel y API en Render o Hugging Face Spaces (PRD). Para que la API desplegada use el planificador real:
   - **Capas del terreno:** van a GitHub Releases. Salen del DTM de USGS, que es CC0.
   - **Catálogo de cráteres:** fuera de lo público hasta saber su licencia (cuestión 26). Va al servidor como archivo privado. Servir el mapa derivado está bien; publicar el CSV, no.
   - **Sin esos datos** la API cae al planificador mock y a rutas rectas.
   - Cuestión 63.
2. **Web conectada a la API real.** Lo mínimo: mapa de hielo (`GET /maps`), tarjeta de sitio, curva de walkback con caution, ventana de EVA, re-plan con una medición y vista en primera persona. Guías en `plans/planner.md`.
3. **Pitch y video actualizados (cuestión 64).** El guion del teaser del PRD usa frases que ya no sostenemos: "IceWalk decides where to measure", el número de la simulación (×2.8, sin respaldo con datos reales, `EXPERIMENTS.md` 2026-11-08) y el lema «We plan what to learn» (en revisión). Ver "Adaptar".
4. **Bloques reales** (Guido). Si no llegan, la demo dice que el pasillo es ilustrativo.
5. **Recursos oficiales del 13/11.** El PRD prevé conectar al menos una capa nueva de los Resources durante el evento. Candidatos según la copia de terceros:
   - **Mars Trek WMTS** (mosaico CTX y relieve MOLA): resuelve la textura borrosa del globo (cuestión 45) y es probable que esté en la lista oficial. Es la ganancia más barata.
   - **Simulaciones de clima de NASA Ames** (AmesCAP): cuestión 60.
   - **THEMIS:** ya la tenemos.
   - **Radiación de Curiosity (RAD)** y **CRISM:** quedan fuera.
6. **PRD desactualizado** (cuestiones 19 y 29): stack, estructura, pregunta del producto y lema. El jurado no lo lee, pero el pitch sale de ahí.
7. **Revisión de un experto** (cuestión 20): idealmente antes del 14.

## Adaptar sin cambiar el producto

- **Mensaje:** de "te decimos dónde está el hielo" a "**te decimos qué sabemos y qué no, y con qué herramienta vale la pena salir**".
- **Escena de la demo:** la tarjeta de sitio. En S1094b, el taladro de 1 m da NO_GO (6 %) y el radar GO (97 %). Es un resultado concreto, con datos reales y fácil de contar.
- **Número del pitch:** en vez de la simulación, usar los 97 cm frente a los 2.35 m (`research/respuesta-jurado-profundidad.md`). Muestra que entendemos los datos mejor que una lectura rápida de la bibliografía.
- **Contra otros equipos:** los repos públicos de este desafío son planificadores de ruta genéricos (A*, pendiente, avatar 3D), varios sobre terreno sintético. Lo que nos diferencia es el hielo real en S1094b, la incertidumbre declarada, la elección de herramienta, el re-plan con cada medición y las prácticas de NASA con fuente. No conviene competir en lo genérico (avatar, rover, efectos).
- **Premio objetivo:** Best Use of Science (cuestión 9). Encaja con este enfoque. Confirmar las categorías el 13/11.

## A revisar el 13/11

- Guía de entrega: formato, duración, link, si piden repo o página del proyecto.
- Guía de jurado y premios: criterios y categorías.
- Lista oficial de recursos: qué capa se conecta en el evento.
- Reglas sobre trabajo previo y uso de herramientas de IA (el equipo ya aceptó el riesgo del trabajo previo).

## Fuentes

- Copia de terceros del desafío y datasets sugeridos (no oficial): https://spacedata.swapniltamse.com/challenges/martian-map/
- Repos de otros equipos (enfoques de la competencia): https://github.com/pollob-kumar/nasa-space-apps-martian-map, https://github.com/AhsanulHoque22/Nasa-Space-Apps-Challenge-2026-Team-Protikriti
- Sitio oficial (no se pudo leer desde acá): https://www.spaceappschallenge.org/2026/ y https://www.spaceappschallenge.org/resources/participant-faqs/
- Mars Trek WMTS: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars
- NASA Ames climate (AmesCAP): https://github.com/NASA-Planetary-Science/AmesCAP

## Relevamiento del 14/11, durante el hackatón

Fuentes leídas el 14/11: sitio oficial (con sesión), guías de jurado y de entrega, FAQ, Space Apps Connect (GitHub Discussions `nasa/spaceapps`, por `gh`), mails de Space Apps y de la sede Buenos Aires, página de la sede y Discord de la sede. Lo que no se pudo leer está al final.

### Reglas oficiales que nos afectan

| Tema | Qué dice | Qué hacemos |
| --- | --- | --- |
| Entrega | Plataforma: abre sáb 14 a las 9:00 y cierra **dom 15 a las 23:59** (hora de la sede). Se puede reenviar hasta el cierre | Ver "Agenda de la sede" |
| Demo | **Video de 30 s o hasta 7 slides**, link público sin login. Excederse descalifica para lo global. Inglés (video en otro idioma con subtítulos en inglés). Sin imágenes de menores de 18 | Hacer las dos: 7 slides para el jurado y video de 30 s |
| Criterios | Impact, Creativity, Validity, Relevance (con integración de datos de NASA) y Presentation, 1 a 5 cada uno, mismo peso. La guía insiste en que la presentación pesa igual | Presentación con dueño propio |
| Datos | Para premios globales hay que usar **al menos un recurso de la lista del desafío** (#1827, GO Team) y citarlo | Mars Trek ya está (capa EZMars y teselas del globo); sumar el mapa geológico de USGS |
| Agencias socias | Se alientan sus datos: ESA, ASI, CONAE, JAXA, ISRO, MBRSC (Emiratos), CSA, UKSA, etc. | Acreditar HRSC (ESA/DLR) y SHARAD (ASI), que ya usamos |
| Super Intelligence (IA) | Permitida para acelerar, **no para originar la idea**. Declarar herramientas y cómo se usaron; código y datos con IA, reconocido en texto y metadatos; imágenes y video con IA, con marca de agua; sin logos de NASA en contenido generado | Declarar el uso de asistentes de código y de investigación en la entrega y en el README |
| Referencias | Todo código, texto e imagen externo va en References, aunque sea abierto. Sin material con copyright sin permiso | `SOURCES.md` como base; ojo con Dundas (CC BY-NC-ND) |
| Sitio web | Recomiendan pedir clasificación de FortiGuard para que el jurado pueda abrirlo | Pedirla al publicar |
| Trabajo previo | El GO Team repite que empezar antes puede descalificar y quitar premios; investigar el tema sí se permite; el Local Lead decide los nominados (#1827, #1872, #2057) | Riesgo ya aceptado por el equipo; anotado como dato nuevo |

Premios globales (10): Best Use of Science, Best Use of Data, Best Use of Technology, Galactic Impact, Best Mission Concept, Most Inspirational, Best Storytelling, Global Connection, Art & Technology, Local Impact. Fechas: nominados 3/12, finalistas 17/12, ganadores 26/1/2027.

### Agenda de la sede Buenos Aires (Universidad de Palermo)

- Sáb 14, 9:00-18:00: presencial con mentores y tutores; sigue por Discord.
- Dom 15: virtual por Discord. **La página de la sede dice que se desarrolla hasta las 15:00 y después vienen las presentaciones ante el jurado** (innovación, viabilidad, impacto y calidad técnica), que elige a los nominados globales. El cronograma de Discord (editado el 13/11) solo menciona la entrega formal a las 23:59. **Confirmar con el Local Lead (Javier Sabas) si hay presentación en vivo y a qué hora.**
- Jue 19: entrega de premios en la UP, movida a las 11:00 (anuncio de Discord del 12/11).
- IBM está en la sede (charla del 11/11; Delfina García, Athi, Maxi Medina): ofrecen IBM Bob (asistente de código), Quantum Composer y mencionan Surya (modelo de NASA-IMPACT e IBM para clima espacial solar). CONAE dio una charla en 2025.
- Los mentores trabajan por el canal privado de cada equipo. **No vimos canal de Darionautas**: se pide en #equipos con nombre e integrantes.

### Recursos oficiales del desafío (13/11)

Mars Trek (https://trek.nasa.gov/mars/), mapas geológicos de USGS-NASA (https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars), mapa de ruta propuesta de Curiosity (ejemplo visual), NASA Worldview (Tierra) y la galería de imágenes crudas de Perseverance.

### Global Offers (gratis, algunas piden tarjeta para verificar)

GoDaddy (dominio y un año de hosting), Google Cloud (Cloud Run, Firebase, Maps), Microsoft (Azure, Planetary Computer, GitHub Copilot), Meteomatics, Miro. Sirven para el deploy (cuestión 63): la tarjeta la carga el equipo.

### Ciencia y misiones nuevas que suman

- **Courville et al. 2026** (PSJ 7:183, CC BY, equipo SWIM): mapa bayesiano de hielo entre 60°S y 60°N con incertidumbre; hielo somero probable al norte de ~45°, y más cerca del ecuador los datos no alcanzan. Coincide con nuestro límite de detecciones (39.1°N). Los mapas no están para bajar todavía (el sitio de SWIM tiene hasta el Ci del 4/8/2025). https://doi.org/10.3847/PSJ/ae8904
- **SkyFall** (NASA, lanzamiento previsto para fines de 2028): tres helicópteros con radar para hielo a 0.5-3 m; sitio a definir en talleres con la comunidad. Es la misión que haría el "radar primero" de nuestra tesis. https://science.nasa.gov/mission/skyfall/
- Estudio de 2025 sobre sitios candidatos en el norte de Amazonis con evidencia de hielo somero: nuestra tarjeta pone a Amazonis primera entre las zonas de NASA.
- Tianwen-1 (2026): posible hielo somero en el sur de Utopia, por radar (inferido).

### Agencias socias (informe del 14/11)

- Ya usamos ESA/DLR (HRSC dentro del DEM MOLA-HRSC; licencia de la parte HRSC CC BY-SA 3.0 IGO) y ASI (SHARAD dentro de SWIM): falta acreditarlos.
- MBRSC, Emirates Mars Mission (EMIRS): temperatura, polvo y vapor con cobertura diurna, portal https://sdc.emiratesmarsmission.ae (con registro). La mejor capa nueva para la ventana de EVA.
- Bramson et al. 2015 (GRL): capa de hielo en exceso en Arcadia vista con SHARAD; precedente orbital del radar como herramienta principal (falta ver si cubre 189.8°E).
- FREND (TGO): hidrógeno a ~60-200 km, solo contexto. CaSSIS: no se encontró imagen de S1094b; no prometer. JAXA, CSA, UKSA, CONAE: nada de Marte utilizable.

### Competencia

- #2013 en Space Apps Connect: rutas con SWIM y MOLA, tres opciones (segura, recurso, equilibrada) e incertidumbre. Parecido en el mensaje, a 3 km de resolución y sin validación. Nuestro diferencial: S1094b a 10 m, 349 cráteres reales, prior calibrado y comprobado con Phoenix, elección de herramienta y re-plan.
- #1777: "MarswalkAI", página con capas e IA generativa, publicada antes del evento.

### Lo que no se pudo leer

- Canales de voz y la grabación de la apertura del 13/11 (no hay texto).
- La pestaña Project del equipo solo se miró: está vacía ("Check back later").
- Mensajes viejos de #equipos (Discord carga los últimos).
- Página de agencias socias (error de certificado desde los agentes).

### Recursos oficiales: qué se puede integrar sobre S1094b (informe del 14/11, URLs probadas con curl)

| Recurso | Qué sirve | Cómo | Esfuerzo | Crédito |
| --- | --- | --- | --- | --- |
| Mars Trek, THEMIS Day IR y Night IR (`THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018`, NightIR) | Lo de más detalle que Trek sirve sobre el sitio (~81 m/px, nivel 9) | WMTS REST `https://trek.nasa.gov/tiles/Mars/EQ/{Layer}/1.0.0/default/default028mm/{z}/{row}/{col}.png`; en Cesium, `WebMapTileServiceImageryProvider` con `GeographicTilingScheme` sobre `Ellipsoid.MARS`. Las capacidades traen `1.0.0//` (doble barra) | Bajo | NASA/JPL-Caltech, Mars Trek; THEMIS: NASA/JPL-Caltech/ASU |
| Mars Trek, MOLA ClrShade (`Mars_MGS_MOLA_ClrShade_merge_global_463m`) | Relieve regional en color (nivel 7) | Igual, JPG | Bajo | Mars Trek; MOLA: NASA/JPL/GSFC |
| Mars Trek, CTX (`CTX_beta01_uncontrolled_5m_Caltech`) | Mosaico de 5 m | Redirige a Esri; posible hueco en la tesela del cráter (sin verificar) | Medio | Murray Lab, vía Trek |
| Mars Trek, HiRISE o DTM del sitio | **No hay** (HiRISE_Global llega a 2018) | Seguimos con el STAC de USGS | - | - |
| Mapa geológico SIM 3292 (Tanaka et al. 2014) | Unidad **`lAv`, Late Amazonian volcanic unit**: lavas de inundación de Amazonis, de metros a decenas de metros de espesor (1:20M, contexto regional) | `identify` en Trek: `https://trek.nasa.gov/mars/trekarcgis/rest/services/SIM3292_Global_Geology/MapServer/identify` (longitud en -180..180) o el FeatureServer de USGS `.../Tanaka_et_al_2014_Mars_Global_Map_Features/FeatureServer/3` (`f=geojson`) | Bajo | Tanaka et al. (2014), USGS SIM 3292, doi:10.3133/sim3292, dominio público |
| Ruta de Curiosity | Referencia de estilo para dibujar el traverse | Citar como inspiración | Nulo | NASA/JPL-Caltech/Univ. of Arizona |
| Perseverance, imágenes crudas | API JSON `https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=N&page=0&order=sol+desc` | Jezero no es análogo de nuestro terreno | Bajo-medio | NASA/JPL-Caltech |
| Viking Lander 2 (48°N, Utopia), mejor análogo de superficie para la vista en primera persona | PIA00399 (panorama), PIA00571 (escarcha de agua), PIA00568 y PIA00569 | Assets directos `https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00399/PIA00399.jpg` (CORS abierto) | Bajo | NASA/JPL, dominio público. Rotular "surface analog, not S1094b" |
| Worldview | Es de la Tierra | No invertir tiempo | - | - |

Elevación en el sitio según el ImageServer de MOLA en Trek: −3946 m.

## Propuesta para el hackatón (14/11)

### El diferencial, en una frase

> **Every Mars EVA tool tells the crew where to walk. IceWalk tells them whether the walk is worth it, and with which instrument, checked against real data.**

Tres pruebas que nadie más va a tener:
1. **La tarjeta de sitio:** en S1094b el taladro de 1 m da NO_GO (6 %) y el radar GO (97 %), con un intervalo y un umbral declarados.
2. **Validado con datos que el modelo no vio:** calibración fuera de muestra con 383 impactos y Phoenix (hielo a 4.6 cm medidos, dentro del 90 % del modelo).
3. **Radar primero, taladro después:** 2.9 veces menos EVAs para confirmar hielo. Es la estrategia que va a habilitar SkyFall (NASA, 2028, radar para hielo a 0.5-3 m).

### Qué adaptar (por prioridad, con criterio de jurado)

| # | Qué | Criterio | Esfuerzo | Rol |
| --- | --- | --- | --- | --- |
| 1 | Cumplir lo obligatorio: Mars Trek explícito (capas THEMIS y MOLA en el globo, además de EZMars), referencias completas, declaración de IA, página del proyecto, links públicos | Relevance, elegibilidad | Bajo | Todos |
| 2 | Deploy público (web y API) con una Global Offer o Vercel + Render | Validity, Presentation | Medio | Planificador + Frontend |
| 3 | La web cuenta la historia: tarjeta de sitio al centro, secuencia radar → taladro con re-plan, panel "Evidence" (calibración y Phoenix) | Creativity, Validity | Medio | Frontend |
| 4 | Zonas de NASA en el globo, con SkyFall como contexto ("sitio a definir en talleres; así ayudaríamos") | Impact | Bajo | Frontend |
| 5 | Unidad geológica `lAv` (SIM 3292) en la tarjeta y vista en primera persona con el análogo del Viking Lander 2 | Relevance (recursos oficiales 2 y 5) | Bajo | Frontend + GP |
| 6 | Acreditar ESA/DLR (HRSC) y ASI (SHARAD); si sobra tiempo, EMIRS de Hope (Emiratos) para la ventana climática | Relevance (agencias socias) | Bajo / medio | GP / Planificador |
| 7 | Herramienta "SkyFall-class radar" (0.5-3 m) en el catálogo, con fuente | Impact | Bajo | Planificador |
| 8 | Demo: 7 slides y video de 30 s, con subtítulos en inglés y sin logos de NASA generados | Presentation | Medio | Diseño |
| 9 | Mentores y expertos: pedir el canal del equipo y un mentor en Discord; consulta a un SME en Space Apps Connect sobre la validación | Validity | Bajo | Luqui |

**No hacer:** competir en lo genérico (avatar, rover, efectos), prometer CaSSIS, sumar FREND o Surya, ni presentar las zonas como selección de sitio.

### Guion de 7 slides (borrador)

1. **Title:** IceWalk, Darionautas (6 integrantes), desafío y lema.
2. **Problem:** el primer hielo que busque una tripulación cuesta EVAs, y una EVA es el recurso más caro y riesgoso (EVA-EXP-0042; riesgo en rojo).
3. **Insight:** no sabemos dónde está el hielo a escala de sitio, y lo decimos (prueba con 349 cráteres). Lo que sí sabemos: con qué herramienta vale salir.
4. **Product:** captura de la tarjeta (taladro NO_GO, radar GO) y del plan: ruta, walkback, ventana de EVA, DONKI.
5. **Radar → drill:** perforar donde el radar marca: 6 % → 50 % por estación, 2.9 veces menos EVAs. SkyFall 2028.
6. **Validated:** calibración fuera de muestra y Phoenix; zonas de NASA evaluadas (Amazonis primera).
7. **Data and future:** NASA (HiRISE, Mars Trek, USGS, DONKI, Viking), ESA/DLR, ASI; replicable en cualquier sitio; qué sigue.

### Competencia en GitHub y ganadores previos (informe del 14/11)

**Otros equipos:** más de 100 repos creados desde septiembre para este desafío. Casi todos repiten la misma fórmula: un planificador de rutas en Jezero o Gale, con A* por pendiente, clima REMS/MEDA, radiación RAD y un veredicto GO/NO-GO. **Ninguno hace prospección de hielo con probabilidad por herramienta ni re-planifica con cada medición.** En los que usan hielo, el hielo es una capa más, no un modelo.

Los más fuertes (sin verificar sus cifras):
- **AntrikshH90/marswalk-nasa:** DTM HiRISE de 1 m, THEMIS, CRISM y DONKI. Dice que su clasificador coincide 99.1 % con 4178 waypoints de Perseverance.
- **The-mysteryboy/marswalk-planner:** GO/CAUTION/NO-GO con motivos, punto de vuelta, elevación contrastada con 708 puntos de Perseverance (3.1 m RMS), SOURCES.md y demo en vivo. Es el más parecido a nosotros en rigor.
- **sohaib1083/gale-marswalk-planner:** suelo 3D a partir de Navcam (estéreo y Depth Anything V2) y detección de rocas.
- **Vista en primera persona:**
  - marswalk-hud: casco HUD sobre panoramas de rover.
  - Team Protikriti: Street View de Perseverance y Curiosity, más P(hielo) de SWIM con clic derecho y 30 Exploration Zones.
- **Con hielo:** marswalk-iitg (SHARAD y SWIM en Arcadia, con asistente de IA) y MartianMap-NeuroNexus (regiones con hielo accesible).

**Diferenciarnos:** ellos dicen "el lugar más seguro" o "99 %"; nosotros, probabilidad calibrada con incertidumbre, comprobada con Phoenix, recomendación de herramienta (radar → taladro, 2.9 veces menos EVAs) y re-plan. **Igualar:** demo en vivo con link público, un número de validación contra datos de superficie y algo de primera persona o 3D.

**Ganadores previos análogos:**

| Año | Premio | Proyecto | Qué tenía |
| --- | --- | --- | --- |
| 2025 | Best Use of Science | SpaceGenes+ | Dashboard interactivo de radiación y microgravedad |
| 2025 | Best Mission Concept | PureFlow | Diseño de hábitats probado contra tormentas solares |
| 2024 | Best Use of Science | SkyShield | Zonas de riesgo con datos de NEO en tiempo real |
| 2023 | Best Use of Science | LunarTech Ensemble | Sismos lunares con datos Apollo |
| 2022 | Best Mission Concept | Mars 3D Home (Mendoza) | Escenario concreto: 4 astronautas, 687 días |

Patrón: datos reales de NASA, una decisión humana concreta, una amenaza simulada y la herramienta funcionando.

**Cinco claves para la demo:**
1. Escenario humano en los primeros 3 s ("EV1 y EV2, 4 h en S1094b: ¿dónde vale perforar?") y después equipo y nombre.
2. El producto real funcionando, no mockups.
3. El momento del re-plan: llega una medición, cambian el mapa y el plan.
4. Un número fuerte con su validación (2.9 veces menos EVAs; Phoenix), más una línea honesta sobre lo que no se puede predecir.
5. Una franja con las fuentes de NASA y de las agencias socias.

Formato: video de 30 s si la app anda fluida; si no, 7 slides con capturas grandes.

READMEs de la competencia descargados: carpeta del scratchpad de la sesión del 14/11 (`readme_*.md`, `disc.json`), fuera del repo.

### SkyFall, SWIM 2026 y EVA: datos para el pitch (informe del 14/11; [P] fuente primaria, [S] secundaria)

**SkyFall** (https://science.nasa.gov/mission/skyfall/ y el paquete de información de sep. 2026, https://science.nasa.gov/wp-content/uploads/2026/09/skyfall-mission-information-package-final.pdf) [P]:
- La misión:
  - 3 helicópteros de 2.7 kg; 1-2 km por vuelo de ~2.5 min; 50-300 km cada uno en 6-12 meses.
  - Lanzamiento a fines de 2028 y llegada en otoño de 2030.
  - El radar DSG trabaja en 500-2500 MHz, con ~10 cm de resolución de rango, y detecta hielo a 0.5-3 m (penetra 3-5 m).
- Restricciones del sitio (p. 6): latitud 0-45°N, elevación menor a −3 km, rocas de menos de 11 cm y menos de 5 % de abundancia, inercia térmica mayor a 100. **S1094b cumple latitud y elevación** (35.1°N, ~−3.95 km); falta ver inercia y rocas.
- **Sitio de referencia AP-105, Arcadia (43.33°N, 198.52°E).** Es una de 5 regiones evaluadas, todas en la franja de 30-45°N: Arcadia, Deuteronilus, Utopia, Phlegra y Erebus.
- **Calendario:**
  - Propuestas de sitio a skyfall_lsw_input@jpl.nasa.gov **hasta el 1/12/2026**, con coordenadas, imagen HiRISE y trazabilidad.
  - Primer taller (LSW1) virtual, 9-10/2/2027.
  - En el segundo taller (LSW2) se piden trayectorias de vuelo con criterio científico.
- **Nuestra tarjeta en AP-105** (cálculo propio, 14/11): mediana 1.14 m; radar de SkyFall (3 m) **GO 0.93**; taladro de 1 m CONDITIONAL 0.42; control local 10 contra 6.3 esperados. En S1094b el radar de 3 m queda CONDITIONAL (0.52).
- **Cómo se conecta:**
  - Los sondeos de SkyFall son las mediciones de radar que el GP ya asimila. Entran como capa nueva con su adaptador, antes de la EVA.
  - El valor de medir + A* sirve para proponer trayectorias de vuelo.
  - La tarjeta evalúa las 5 regiones candidatas.

**Courville et al. 2026**, PSJ 7:183, CC BY [P]:
- Hielo somero probable al norte de ~45°.
- Tabla 1, probabilidad de hielo en exceso: **Arcadia 51 %**, Hellas 60 %, sur de Utopia, Elysium y Medusae ~9-12 %.
- Cita "the lowest-latitude ice-exposing impact crater at ∼35°N" (S1094b).
- Mapas bayesianos no descargables todavía.

**Sizemore et al. 2026**, PSJ 7:175 [P]:
- La detección térmica cae por debajo de 30 cm (corte efectivo ~50 cm).
- Los indicadores decaen al sur de ~40°.
- **En Phoenix, SWIM23 predice 4.4 cm frente a 4.6 cm medidos**: el control de Phoenix es el mismo que usa el equipo SWIM. Nuestra mediana es 7 cm (90 % local 2-22 cm).
- Arcadia es la excepción regional.
- Recomiendan un instrumento para 1-5 m.

**Sitios humanos:**
- Luzzi et al. 2025 (JGR Planets, doi:10.1029/2024JE008724) [S]: hielo a menos de 1 m en el norte de Amazonis, sin confirmar; hace falta radar.
- Mars Ice Mapper, sin financiamiento desde FY2023 [S].
- NASEM 2026: alrededor del 20 % de cada sol para ciencia y zona de exploración de 100 km [P].
- Tianwen-1 en Utopia: preliminar, no usar.

**EVA, citables:**
- Surface EVA Architectural Drivers 2023 (NTRS 20230014957) [P]: p. 2, el prebreathe consume tiempo de tripulación; p. 4, navegar "to targets specifically designated by the science team" y decidir con información local; el walkback limita el alcance.
- Human Health and Performance 2023 (NTRS 20230015521) [P], p. 2-3: hasta 22 min de retraso de comunicación en un sentido; decisiones "independently of immediate ground support" (re-plan a bordo).
- HEOMD-415 vía COSPAR 2022 (NTRS 20220008060) [P]: p. 9, 18-20 % de horas de tripulación para ciencia en 30 soles; p. 7, un sol sin EVA entre EVAs.

**Frase de pitch nueva:** "NASA's SkyFall will fly ice radar over Arcadia in 2030. At its reference site our card already says GO for a 3 m radar (93 %); at S1094b, a coin flip. IceWalk turns those soundings into the crew's next EVA."
