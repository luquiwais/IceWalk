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
