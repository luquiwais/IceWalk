# Competencia del desafío, relevamiento del 15/11 (noche)

Relevamiento hecho el 2026-11-15 entre las 22:00 y las 23:10 (hora de Buenos Aires), con el cierre de entregas de NASA a las 23:59. Actualiza [`competencia-2026-11-14.md`](competencia-2026-11-14.md); no repite lo que ya está ahí. Solo lectura: no se escribió nada en servicios externos, no se descargaron videos ni se abrieron las apps de otros equipos en un navegador. Las cifras de otros equipos salen de sus páginas o READMEs y **no las reprodujimos**.

## Veredicto

- **En Buenos Aires hay al menos seis equipos más en Martian Map** (el 14/11 no habíamos confirmado ninguno): JANGAM_NASA (*Marswalk Radar*), Red Ways (*RedWays*), Tango Horizon, Boyager (*SPAMS*), Termo (*AresRoute*) y Losmarcianosdelmate. Ninguno modela hielo, ni elige herramienta, ni re-planifica con mediciones. Los tres que más pesan son **Red Ways** (honestidad y procedencia de cada dato, como nosotros), **Marswalk Radar** (un concepto simple y muy claro, con validación contra la huella de Curiosity) y **Tango Horizon** (mucho alcance y una presentación de alto impacto, pero sin ficha pública cargada a las 22:52).
- **Lo que más nos perjudica hoy es la ficha.** La página pública de Darionautas tiene resumen y descripción, pero **no tiene la sección "Project Demonstration"**: falta el *Link to Project Demo*. NeuroNexus, Margen, Polelit y la mayoría de los equipos locales completos la tienen. Es lo primero que hay que arreglar antes de las 23:59.
- **Ya cerramos la brecha principal del 14/11**: `icewalk.vercel.app` responde (HTTP 200) y la ficha está publicada. El video local (`IceWalk-LocalFilm.mp4`) quedó en el Drive de la organización a las 22:43.

## Método

- **spaceappschallenge.org** no abre directo desde esta compu (WebFetch y curl fallan por certificado, igual que el 11/11 y el 14/11). Se leyó con el lector público `r.jina.ai`, que devuelve el HTML como texto. La lista de equipos del desafío y los filtros por sede se cargan con una API GraphQL que no consultamos; por eso **no se pudo listar los proyectos entregados del desafío**. La página del desafío muestra el contador "Currently returning 1329 teams" ([página](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=teams)), que son equipos inscriptos, no entregas.
- **Equipos de Buenos Aires:** la lista sale de las 92 carpetas por equipo del Drive de la organización (ver abajo). Para cada nombre se armó el *slug* de la URL (`/2026/find-a-team/<slug>/?tab=project`) y se leyó la pestaña Project. Algunos slugs no coinciden con el nombre (dan 404) y quedan sin ficha leída.
- **GitHub:** `gh search repos` con 4 consultas sobre repos creados desde el 14/11 (marswalk, martian map, mars eva, interplanetary survival guide): unos 150 resultados. Se leyeron los READMEs de los rivales de Buenos Aires y se volvieron a bajar los de los rivales globales del 14/11.
- **Deploys:** `curl` a los links públicos; solo se comprobó el código HTTP.
- **Drive:** búsqueda con el conector de Google Drive (solo lectura): nombre, tipo, tamaño y hora de cada archivo; se leyeron solo los documentos chicos de texto (links y resúmenes), ningún video.

## (a) Rivales del mismo desafío en Buenos Aires

| Equipo / proyecto | Qué hace | Datos de NASA | App · video · repo | Fuerte frente a IceWalk | Débil frente a IceWalk | Amenaza |
| --- | --- | --- | --- | --- | --- | --- |
| **Red Ways** · RedWays ([ficha](https://www.spaceappschallenge.org/2026/find-a-team/red-ways/?tab=project)) | Planificador de Marswalk en Gale, 3D con CesiumJS y Cesium Mars: meta científica, destino, tareas, 1-4 astronautas y hasta 2 robots; ida y vuelta por Dijkstra sobre el DTM de HiRISE de 1 m | HiRISE, REMS (atardecer real), RAD, huella de MSL, DONKI, MAVEN; base Cesium Mars (MOLA, HRSC, Viking) | En la ficha: solo resumen y detalles; **sin sección de demo ni de link al proyecto** a las 22:50. Repo y video: no encontrados | Cada capa muestra misión, producto, fecha y si es medida, derivada, modelada o supuesta; la marcha la fija el más lento; tiempo sin línea de vista a la base; pronósticos LightGBM de REMS/RAD con incertidumbre (~70 % menos error que la climatología en presión, según la ficha); dice cuándo sus pronósticos no le ganan a lo simple. Mismo estilo honesto y mismo stack que nosotros | Sin hielo ni elección de instrumento; sitio de Gale (el de todos); ningún resultado validado contra datos de campo; no vimos demo | **Alta** |
| **JANGAM_NASA** · Marswalk Radar ([ficha](https://www.spaceappschallenge.org/2026/find-a-team/jangam_nasa/?tab=project), [repo](https://github.com/nazarenofolica/JANGAM_Hackaton)) | Tablet táctica centrada en el astronauta: radar con el rumbo arriba que responde "¿por dónde camino?, ¿cuánto tiempo tengo?, ¿qué sigue?", en Gale | HiRISE DTM y mosaico (vía Mars Trek), huella y waypoints de Curiosity, MSL RAD (CDAWeb), REMS (PDS), Navcam | [Demo en GitHub Pages](https://nazarenofolica.github.io/marswalk-radar/web/) (HTTP 200), repo público, sin video enlazado en el README; en el Drive local subieron solo `links.txt` | Concepto de una línea y fácil de entender; límite de regreso que sigue el terreno (campo de tiempo de vuelta por Dijkstra), no un círculo; foto Navcam real en cada parada; validación contra la huella de Curiosity (0 celdas bloqueadas, 57 % a menos de 50 m); cada número rotulado medido, derivado o supuesto; estático, sin backend, no se cae | EVA simulada, sin objetivo científico que decida; sin incertidumbre ni modelo; la ficha pública solo tiene el resumen (sin detalles, demo ni datos) a las 22:50 | **Alta** |
| **Tango Horizon** ([ficha](https://www.spaceappschallenge.org/2026/find-a-team/tango-horizon/?tab=project), [repo](https://github.com/agustindiazcano/nasa-mars-tango-horizon)) | Simulador 3D de operaciones de superficie para 4 astronautas en Gale (HiRISE 1 m y 0.25 m): agentes de IA por voz en 5 idiomas, flota de robots, cápsula de soporte vital balística, RAG sobre NASA-STD-3001 | HiRISE (USGS STAC), MSL DAN, CRISM, THEMIS, REMS, RAD, Mastcam/MAHLI, DONKI | [Demo](https://tangohorizon.vercel.app) y sitio de presentación (README); guion de 30 s en el repo. **Ficha pública: "Check back later" a las 22:52**; carpeta del Drive local vacía a las 22:45 | Lo más vistoso de la sede; tres modelos con validación cruzada por bloques, entre ellos un "Hydration Prospector" (H/OH de DAN con incertidumbre) que se parece a nuestro enfoque de recurso con incertidumbre; declara que todo se hizo dentro del hackatón | Alcance enorme y difícil de defender en 3 min; depende de LLMs en la nube; su "hidratación" no es hielo y lo aclaran; ni verdad de campo ni decisión por herramienta | **Media-alta** (si entrega a tiempo) |
| **Boyager** · SPAMS ([ficha](https://www.spaceappschallenge.org/2026/find-a-team/boyager/?tab=project)) | Planificador de EVA web (React/Leaflet y Django) en tres zonas (Gale, delta de Jezero, Melas Chasma): rutas de varias paradas con A* y Dijkstra bajo 8 restricciones; convierte oxígeno y batería del traje en tiempo de estadía, a pie o en buggy; modo HUD de alto contraste | HiRISE y CTX estéreo, DONKI, REMS/MEDA, imágenes de rovers de JPL | Ficha con solo el resumen a las 22:55; repo y demo no encontrados; carpeta del Drive vacía | Tres sitios, presupuesto de consumibles y HUD | Capas espectrales y térmicas "modeladas"; sin hielo, sin validación declarada | Media-baja |
| **Termo** · AresRoute ([ficha](https://www.spaceappschallenge.org/2026/find-a-team/termo/?tab=project)) | Globo 3D, mapas de Jezero y Gale, rutas A* por pendiente y un copiloto de IA (Amazon Bedrock) | CTX, MOLA, THEMIS, Viking, Mars Trek, USGS | La ficha dice que está desplegado en Vercel; link no visible en la lectura | Accesible, educativo | Genérico; ellos mismos dicen que las rutas no están validadas | Baja |
| **Losmarcianosdelmate** ([ficha](https://www.spaceappschallenge.org/2026/find-a-team/losmarcianosdelmate/?tab=project)) | Sin datos: ficha en "Check back later" | - | Carpeta del Drive vacía | - | - | No verificado |

**No verificado:** si hay más equipos de Martian Map en la sede con un slug distinto del nombre de la carpeta (por ejemplo `<=> (spaceship)`) o sin carpeta en el Drive.

## (b) Rivales globales del mismo desafío: qué cambió desde el 14/11

| Proyecto | Estado hoy (22:50) | Fuente |
| --- | --- | --- |
| NeuroNexus | **Ficha completa** con Project Demonstration ([video](https://youtu.be/gy23LZoXKwk)), link al proyecto, NASA Data y Partner Data. Es la ficha modelo | [ficha](https://www.spaceappschallenge.org/2026/find-a-team/neuronexus1/?tab=project) |
| Martian Map (Code Huzzlers), ATLAS (Protikriti), Mars EVA Command, Sightline, Red Ledger | Deploys con HTTP 200. Red Ledger y Sightline siguieron subiendo cambios el 15/11; ATLAS suma un tercer video en el README | READMEs de [Red Ledger](https://github.com/Red-ledger-mars/red-ledger), [Sightline](https://github.com/monek825/sightline), [ATLAS](https://github.com/AhsanulHoque22/Nasa-Space-Apps-Challenge-2026-Team-Protikriti) |
| TETHER (Túnez) y MARS-Explorer (GEOuy, Uruguay) | **Repos en 404** y deploy de TETHER en 404: borrados o privados | `gh api` y `curl` |
| Nuevos desde el 14/11 | Unos 150 repos más. Nombres que valen mirar: [MARSIFT](https://github.com/Andresmejia62/Pimpollos) (simulador de supervivencia en Gale, [marsift.lat](https://marsift.lat), video en YouTube, docs en inglés y español), [SteadFast](https://github.com/ting-hong-shieh/steadfast-mars-eva) (pantalla de casco), [Walkback](https://github.com/kendal-dev/Walkback) (realidad mixta en Meta Quest 3), [Marswalk Budget](https://github.com/TheLonelyOtaku315/marswalk-budget) (ruta pagada en oxígeno, tiempo, radiación y ciencia). Solo leímos la descripción del repo (salvo MARSIFT); sede no verificada | búsqueda de GitHub |

Sigue valiendo lo del 14/11: **nadie más usa S1094b, ni modela hielo por herramienta, ni re-planifica con mediciones**. Lo más cercano en la sede es el modelo de hidratación de Tango Horizon, que mide H/OH en Gale con DAN y no es hielo.

## (c) Drive de la instancia local

**Encontrado.** Carpeta **"Hackathon 2026"**, propiedad de la cuenta de la organización de Buenos Aires, compartida con Lucas el 15/11 a las 13:26. No ponemos el link acá (el repo es público y la carpeta es accesible con el link). Tiene **92 subcarpetas, una por equipo**, cada una con un `integrantes.txt` creado por la organización, más tres archivos sueltos en la raíz (un video de Spacemise y dos documentos de Tecnica2 con su lista de integrantes).

**A las 22:45, 24 equipos habían subido video** (incluido el nuestro). Los demás tenían la carpeta vacía o solo el `integrantes.txt`. Horas en ART, tamaños aproximados. El desafío sale de la ficha pública cuando la pudimos leer; si no, va "no verificado".

| Equipo | Archivos subidos | Hora | Desafío y proyecto |
| --- | --- | --- | --- |
| **Darionautas** | `IceWalk-LocalFilm.mp4` (93 MB); `integrantes.txt` actualizado por Eitan a las 22:31 | 22:43 | Martian Map · IceWalk |
| JANGAM_NASA | `links.txt` (repo y demo); **sin video** a las 22:45 | 19:59 | Martian Map · Marswalk Radar |
| Movimiento Naranja | video (175 MB) | 12:44 | Space Mission Design Game · Space Odyssey |
| ATHERION Earth - Ember Trace | video (48 MB) + integrantes | 12:42 | Harmonization of MODIS and VIIRS Hot Spots · Ember Trace |
| Margen | `margen-es.mp4` (86 MB) | 16:21 | Lunar Landing Site Navigator · MARGEN |
| Polelit | video (20 MB) + doc con web, código y presentación | 17:55 | Lunar Landing Site Navigator · Polelit |
| Laika | video local (25 MB) y de 30 s (12 MB) | 17:18 y 19:08 | No verificado |
| Global Helios Systems | pitch de 3 min (78 MB) y de 30 s (15 MB), zip del proyecto, `repo-url.txt` | 18:37-18:54 | Dancing with the SARs |
| Generación Espacial Lima-Zárate | video corto (5 MB) + dos PDF | 15:47-16:48 | Earth analogs de bases en la Luna y Marte |
| Proyecto orbital | `Resumen Proyecto.pdf` (sin video) | 19:17 | Space Mission Design Game · Orbital Project |
| Space Logistics | video en español (30 MB) + doc con link a la app | 19:40 | Earth analogs · Celestial Analog Finder |
| Observación Astronómica Mar del Plata | video (11 MB) | 19:57 | Abandoned but not Forgotten |
| Alas Argentinas | video (121 MB) + PDF con explicación y GitHub | 19:59 | Lunar Landing Site Navigator · Team-Mate (SpaceMate) |
| LandSense | video (128 MB) + doc con página, repo y carpeta con presentación | 20:15 | Dancing with the SARs · LandSense |
| Matineta | video (17 MB) | 20:28 | No verificado |
| GeoFuego.com.ar | video local en español (54 MB) | 20:36 | No verificado (por el nombre, incendios) |
| Sen de campo | video (102 MB) | 20:51 | Field Shift · Next Season |
| Z.E.U.S | video demo (72 MB, 14:33) y presentación (37 MB, 22:11), logo, doc con GitHub | 14:33-22:14 | No verificado (repo de monitoreo de salud) |
| <=> (spaceship) | `dumpsite-local.mp4` (68 MB) + link a su sitio | 21:41 | No verificado |
| El Gauchito Lunar | video de 30 s (70 MB) y de 3 min (423 MB) | 21:51 | Lunar Landing Site Navigator · SELENE Horizon |
| Celeste & Blanca Space | video de 3 min (465 MB), informe PDF, links a web y GitHub, diagrama | 21:29-22:09 | Field Shift · AgroTango |
| Graceful Cosmic Troop B.A | video en español (254 MB) | 22:19 | No verificado |
| Cosmosen | `Presentacion.mp4` (132 MB) | 22:24 | Health Monitoring for Astronauts · RaHel |
| Los Jedi de la NASA | video (145 MB) + un HTML | 22:28 | Space Mission Design Game (ficha sin cargar) |
| Spacemise | video `.mov` (15 MB), en la raíz y no en su carpeta | 22:19 | Field Shift (ficha sin cargar) |
| T-Minus | video (119 MB) | 22:38 | Health Monitoring for Astronauts · HemoScope |
| Argfield, Shark Attack | solo lista de integrantes | - | No verificado |

Lo que dejan ver estos archivos:

- **Varios equipos suben los links además del video** (`links.txt`, "Link a la aplicación", "GITHUB"): JANGAM, Space Logistics, Polelit, LandSense, Global Helios, Celeste & Blanca. El jurado local puede abrir la app sin pasar por la ficha de NASA.
- **Algunos suben también el video de 30 s y el PDF del proyecto** (Laika, Global Helios, El Gauchito Lunar, Celeste & Blanca).
- **De Martian Map, a esa hora, solo había video nuestro**: Red Ways, Tango Horizon, Boyager, Termo y Losmarcianosdelmate tenían la carpeta vacía y JANGAM solo los links.

**No verificado:** la búsqueda de Drive puede tardar en indexar lo recién subido, así que puede haber más archivos. Las horas son las de creación en Drive. No sabemos si la organización fijó un nombre de archivo o un plazo distinto del de NASA.

## (d) En qué nos ganan y en qué les ganamos

**Nos ganan:**

| Eje | Quién | Qué tienen |
| --- | --- | --- |
| Ficha completa con demo | NeuroNexus, Margen, Polelit y la mayoría de las fichas locales completas | Sección "Project Demonstration" con video. **A nosotros nos falta** |
| Concepto en una línea | Marswalk Radar ("¿por dónde camino?, ¿cuánto tiempo tengo?, ¿qué sigue?") | Se entiende en 5 segundos |
| Procedencia de cada dato en la interfaz | Red Ways, Marswalk Radar | Botón de info por capa: misión, producto, fecha, medido o supuesto |
| Imágenes reales del suelo | Marswalk Radar (Navcam en cada parada), Tango Horizon (Mastcam/MAHLI) | En S1094b no hay rover; lo nuestro es el análogo de Viking 2, rotulado como tal |
| Espectáculo | Tango Horizon (voz en 5 idiomas, robots, 4 tripulantes) | Impacto visual en un video de 3 min |
| Validación con huella de rover | Marswalk Radar, NeuroNexus | En S1094b no aplica; lo nuestro es Phoenix y la calibración fuera de muestra |

**Les ganamos:**

- **Pregunta científica propia y decisión por instrumento**: taladro 6 % NO_GO, radar 52 % CONDITIONAL, GPR 97 % GO. Ningún rival de la sede decide si vale la pena salir ni con qué.
- **Validación fuera de muestra y verdad de campo**: Brier 0.033 contra 0.087, 36.2 exposiciones esperadas contra 37 observadas, Phoenix 4.6 cm medidos contra 7 cm predichos. Red Ways y Tango Horizon validan pronósticos o proxies, no el recurso.
- **Re-plan con cada medición**, con el IV dirigiendo la EVA como en la ConOps de NASA. Marswalk Radar y AresRoute no tienen re-plan; Red Ways re-planifica solo por tiempo.
- **Sitio de hielo real y distinto**: S1094b en Amazonis, frente a cuatro rivales de la sede en Gale.
- **Relevancia de misión**: SkyFall y AP-105 (propuestas hasta el 1/12/2026); ningún rival lo menciona.
- **Ficha y video local ya subidos**: a las 22:45, ningún otro equipo de Martian Map de la sede tenía las dos cosas.

## (e) Recomendaciones para antes de las 23:59

En orden. Todas se hacen en minutos y no tocan el código.

1. **P0: completar el *Link to Project Demo* en el formulario de NASA** con el video de 30 s (YouTube o Drive con acceso "cualquiera con el link") o con las 7 slides. Probarlo en una ventana privada, guardar y apretar **Submit for Judging**, y confirmar el banner. Hoy la ficha pública no muestra la sección "Project Demonstration".
2. **P0: revisar en el formulario que *Link to Final Project* tenga `https://icewalk.vercel.app` y el repo.** La lectura pública no mostró los links, aunque el índice de la página sí lista la sección; puede ser un efecto del lector (en otras fichas completas pasa lo mismo), pero revisarlo cuesta un minuto.
3. **P1: subir un `links.txt` a la carpeta de Darionautas del Drive local**, con la app, el repo, el video de 30 s y la ficha de NASA, como hicieron JANGAM, Polelit, LandSense y Space Logistics. Comprobar también que `IceWalk-LocalFilm.mp4` ya se reproduce en Drive (los videos grandes tardan en procesarse).
4. **P1: arriba de todo en el README, una línea con "Live demo" y el video**, como Marswalk Radar. El jurado entra al repo desde la ficha.
5. **P2: no tocar la app esta noche y mantener el deploy vivo hasta enero.** El jurado global evalúa después del cierre (nominados el 3/12): si la API no responde, la app tiene que abrir igual con datos de respaldo. Hoy da HTTP 200; no verificamos qué se ve.

## (f) No se pudo verificar

- **Lista completa de entregas del desafío**: la API GraphQL de Space Apps no se consultó; solo vimos el contador de 1329 inscriptos.
- **Fichas con slug distinto del nombre**: unas cuantas carpetas del Drive no tienen ficha leída (404 con el slug adivinado).
- **Videos y apps de los rivales**: no los abrimos; solo comprobamos HTTP 200 en los deploys.
- **Cifras de los rivales** (57 % a menos de 50 m, ~70 % menos error, AUC y Spearman de Tango Horizon): son lo que declaran, sin reproducir.
- **Sede de los rivales globales nuevos** (MARSIFT y otros): no confirmada.
- **Contenido de las secciones "Project", "NASA Data" y "Partner" de nuestra ficha**: el índice las lista, pero el lector no muestra su contenido. Hay que mirarlas en el formulario.
- **El Drive** es una foto de las 22:45; siguen llegando archivos.

## Fuentes

Fichas de Space Apps 2026 enlazadas en las tablas, leídas con `r.jina.ai` · [Página del desafío](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=teams) · [Ficha de Darionautas](https://www.spaceappschallenge.org/2026/find-a-team/darionautas/?tab=project) · READMEs de GitHub enlazados · Drive "Hackathon 2026" de la organización local (privado, sin link) · Relevamientos previos: [`competencia-2026-11-14.md`](competencia-2026-11-14.md), [`submission-brief-2026-11-14.md`](submission-brief-2026-11-14.md).
