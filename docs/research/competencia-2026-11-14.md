# Competencia del desafío, relevamiento del 14/11 (tarde)

Relevamiento hecho el 2026-11-14 entre las 12 y las 15 h (hora de Buenos Aires), con el hackatón en curso. Amplía [`competencia.md`](competencia.md) y la sección "Competencia en GitHub" de [`hackaton-2026.md`](hackaton-2026.md). Las cifras de los otros equipos salen de sus READMEs: **no las reprodujimos**.

## Veredicto

- **Hay unos 230 repos de este desafío en GitHub**, y casi todos hacen lo mismo: rutas A* por pendiente en Jezero o Gale, clima REMS/MEDA, RAD, DONKI y un veredicto GO/NO-GO. **Nadie usa S1094b, nadie modela la probabilidad de hielo por herramienta y nadie re-planifica con mediciones.** Nuestro diferencial científico sigue intacto.
- **Donde perdemos hoy es en lo que ve el jurado.** Los 19 rivales fuertes que revisamos tienen un link público que responde (HTTP 200), y seis tienen un video de 30 s listo. Nosotros no tenemos deploy ni video.
- **Cuatro de las cinco funciones que planeamos ya las tienen otros, y mejor validadas:** walkback, línea de vista para comunicaciones, costo metabólico y suelo por inercia térmica. Si las sumamos, que sea solo para cubrir lo que pide el enunciado; no hay que venderlas como diferencial.

## Método

- `gh search repos` con 33 consultas (marswalk, martian map, mars eva, interplanetary survival guide, space apps 2026, mars planner, etc.), creados desde el 1/9/2026. Salieron 720 repos únicos, 322 con relación a Marte y 248 candidatos después de sacar los de otros desafíos (salud de astronautas, análogos terrestres, juegos, equipos abandonados).
- Bajamos los 248 READMEs y los puntuamos por palabras clave (hielo, validación, DTM, DONKI, demo, HUD, primera persona, walkback, comms, metabolismo). Leímos completos o por secciones los ~35 más fuertes.
- `gh search code` de "S1094b" y "SkyFall": no aparece ningún repo de Marte de este desafío.
- Space Apps Connect (`nasa/spaceapps`, GraphQL): 12 discusiones con "Martian Map" y 35 con "mars". Solo dos son proyectos (#2013 y #1777), los dos ya conocidos.
- Web: casi nada indexado del evento todavía. Un post en dev.to (AstroMind/MarswalkAI, ya conocido como #1777).
- Deploys: `curl` a 19 links públicos; todos dieron HTTP 200. **No los abrimos en un navegador ni vimos los videos.**

Copias locales (fuera del repo): READMEs en `rd3/` y lista en `merged.json`, en el scratchpad de la sesión.

## (a) Ranking de los rivales más fuertes

Amenaza: qué tanto nos pueden ganar en los cinco criterios (Impact, Creativity, Validity, Relevance, Presentation).

| # | Proyecto / equipo | Sitio | Datos | Lo fuerte | Validación declarada | Demo | Amenaza |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [Martian Map](https://github.com/RISHI-1453/NASA_Space-Apps_Challenge_Martian_Map), Code Huzzlers · [martianmap.us](https://martianmap.us) | Gale, Jezero, **Arcadia (cráter con hielo)**, Gusev; global a 200 m | Viking, CTX, HiRISE, THEMIS, TES, CRISM, OMEGA, MOLA, HRSC, DTM de HiRISE y CTX, SIM 3292 y 3464, RAD, DONKI + NOAA GOES, fotos de rovers | Lo más completo del desafío: consumibles de los dos trajes (Pandolf), walkback de 10 km al estilo Apollo con punto de no retorno, HUD de visor, cuff checklist, maqueta 3D imprimible, tramos en rover, 59 fuentes citadas en la app. **Trae una misión "Prospect for ice at a fresh crater" en Arcadia, con radar y taladro**, pero armada a mano, sin modelo | Chequeos puntuales (DEM vs USGS, ~1 m) | Deploy en Cloud Run con dominio propio y video de 30 s | **Alta.** Gana en amplitud, Relevance y formatos (HUD, tablet). Es el único que nombra el escenario radar + taladro |
| 2 | [ATLAS](https://github.com/AhsanulHoque22/Nasa-Space-Apps-Challenge-2026-Team-Protikriti), Team Protikriti · [atlas-mars.vercel.app](https://atlas-mars.vercel.app) | Jezero, Gale, globo | MOLA, HiRISE, SWIM 2.0, RAD, panoramas Navcam, AI4Mars, 30 Exploration Zones | Panoramas 360° en más de 2000 paradas de rovers, terreno etiquetado con AI4Mars, chequeo de walkback en cada punto, línea de vista, consola de muñeca, "Mission Mode" (4 tripulantes, 525 soles), offline, "Ask ATLAS" | 1338 tests; comparación con 556 manejos reales de Perseverance | Deploy, [video de 30 s](https://youtu.be/RkVXGQ8JbPg) y [demo de 240 s](https://youtu.be/cV5MpehaCBc), GIFs en el README | **Alta.** El más pulido: gana en Presentation y Creativity |
| 3 | [NeuroNexus](https://github.com/kmmohaimenulhaque-code/MartianMap-NeuroNexus) · [martianmap-neuronexus.vercel.app](https://martianmap-neuronexus.vercel.app) | Gale, Jezero (más Arcadia y Utopia como contexto) | 76 fuentes: PDS, SIM 3292, THEMIS IR-PBT, RAD, NASA Ames MGCM | Consola con HUD radial, rutas de Pareto, 668 soles de polvo, IA con 27 herramientas que solo explica. **Declara lo que no anda** (saltos entre DTM, sin mapa SWIM) | **La más seria del resto:** inclinación medida por Curiosity frente a la pendiente de HiRISE, con IC 95 % (ρ 0.37-0.51; MOLA subestima ×1.8-2.35, n = 1386); un resultado no reproducido, reportado | Deploy, [video de 30 s](https://youtu.be/gy23LZoXKwk) y demo de 240 s | **Alta en Validity.** Le falta foco: su ruta de ejemplo mide 1464 km |
| 4 | [Red Ledger](https://github.com/Red-ledger-mars/red-ledger) (Raipur) · [demo](https://red-ledger-mars.github.io/red-ledger/) | Gale (boxwork) | HiRISE, CTX, THEMIS, REMS, RAD, Horizons | Le pone precio a cada paso en el cuerpo: energía, calor contra el enfriamiento del traje, dosis y walkback; **sombra de comunicaciones con los orbitadores relé (MRO, Odyssey, TGO, MEX)**; HUD de casco | **Prerregistrada:** regla fijada en un commit antes de los datos; 40 mediciones de NASA con traje; el modelo falló y lo corrigieron (×1.364 en llano). Radiación contra RAD: 6 de 8 periodos dentro de 1 punto | Deploy (en progreso) | **Media-alta.** Mismo estilo honesto que el nuestro y ya hace dos de nuestras funciones planeadas |
| 5 | [TETHER](https://github.com/GharsallahDev/tether-marswalk) (Túnez) · [demo](https://gharsallahdev.github.io/tether-marswalk/) | Gale, grilla de 3 m sobre DTM de 1 m | DEM de 1 m de USGS, RAD, REMS, DONKI | La regla de walkback de Apollo como mapa: tiempo de traje que sobra en cada celda, con la carga de muestras a la vuelta e isócronas | Bloqueo del cielo contra Guo et al. 2026: r = 0.993 | Deploy | **Media-alta.** Pisa nuestro walkback planeado |
| 6 | [Mars EVA Command](https://github.com/aboodbasill/mars-eva-command) · [demo](https://aboodbasill.github.io/mars-eva-command/) | Jezero | Mars Trek, HiRISE DTM, DONKI, Perseverance | Globo, planificador, HUD de alertas, simulador 3D jugable, tour guiado | 99.2 % del traverse de Perseverance en celdas transitables; hallazgos honestos ("el 45 % del itinerario queda fuera del margen de vuelta") | **30 s + 7 slides + PDF** | **Media.** Es la entrega modelo |
| 7 | [Sightline](https://github.com/monek825/sightline) (Jakarta) · [demo](https://monek825.github.io/sightline/) | Jezero | DTM, RAD, DONKI, MEDA | "El mapa sin punto azul": zonas ciegas donde no se ve la base (75 % del terreno a 3 km), Walk Budget único, reproducción de la tormenta de mayo de 2024, vista de casco | No | Guion de 30 s | **Media.** Muy buena historia |
| 8 | [Marswalk Planner](https://github.com/The-mysteryboy/marswalk-planner) · [demo](https://the-mysteryboy.github.io/marswalk-planner/) | Jezero | Mars Trek, MRO, MGS, MEX, Odyssey | GO/CAUTION/NO-GO con motivos, punto de vuelta, SOURCES.md | 708 puntos de Perseverance, 3.1 m RMS | Deploy | **Media** |
| 9 | [MARSWALK](https://github.com/ertan123456/marswalk) · [demo](https://ertan123456.github.io/marswalk/) | Gale, franja de 6.8 × 14.6 km | HiRISE DTM, DONKI, RAD | Ruta segura, prueba de walkback, HUD en primera persona | Algo | Deploy y espejo en Vercel | **Media** |
| 10 | [MARSWALK IITG](https://github.com/bivashgoessohard/marswalk-iitg) · [demo](https://marswalk-iitg.vercel.app) | Jezero, Gale y **Arcadia (SHARAD + SWIM)** | Mars Trek, SWIM, DONKI, Horizons | Simulador en primera persona, manual de supervivencia, asistente con LLM; declara el andamiaje previo al evento | No | Deploy | **Media.** El más cercano en sitio con hielo, pero el hielo es solo una capa |
| 11 | [MARSWALK](https://github.com/crazymage05/marswalk-space-apps-2026) | Gale (boxwork) | HiRISE, DONKI, REMS | Validador de reglas de vuelo, primera persona, re-plan ante una tormenta de polvo simulada | Tests | Video de 29 s | **Media-baja** |
| 12 | [Darb](https://github.com/youseefsamamrah/darb-marswalk-planner) · [demo](https://youseefsamamrah.github.io/darb-marswalk-planner/) | Gale | HiRISE, CRISM, THEMIS | Asistente de IA en el dispositivo (por la demora a la Tierra), tour de 10 pasos | No | Deploy y video de 30 s | **Media-baja** |
| 13 | [AntrikshH90/marswalk-nasa](https://github.com/AntrikshH90/marswalk-nasa) | Jezero | HiRISE de 1 m, THEMIS, CRISM, DONKI | Clasificador de transitabilidad | "99.1 %" frente a 4178 waypoints | Sin deploy; último push el 23/9 | **Baja** (parado desde septiembre) |

Otros con alguna idea que vale conocer:

- [ReturnLine](https://github.com/padyyy/ReturnLine) (Heilbronn): grilla de 10 m y zonas de protección planetaria.
- [ARIADNE](https://github.com/vyom-aggarwal/ARIADNE): OR-Tools; por ahora es un placeholder.
- [RedSight](https://github.com/RobEn-AAST/RedSight) (El Cairo): rutas todavía mock.
- [Marswalk Copilot](https://github.com/Cataflon/Nasa-SpaceApps-Challenge-2026-Marswalk) (Rumania): re-plan ante tormentas con un benchmark "X % vuelve a salvo"; esqueleto con mocks.
- [Sulimowski](https://github.com/Sulimowski/NASA_Mars_Map): pipeline de Gale a 1 m.
- [gale-marswalk-planner](https://github.com/sohaib1083/gale-marswalk-planner): terreno 3D desde Navcam con Depth Anything.
- [marswalk-hud](https://github.com/samam7md28-source/marswalk-hud): HUD sobre panoramas.
- [Martialoy](https://github.com/Aluchashi/Martialoy): rover frente a explorador con traje.
- [nasa-heist](https://github.com/sourav-bwn/nasa-heist-martian-map): compara 4 sitios de aterrizaje con evidencia de hielo.
- [MarsWay](https://github.com/ahsanur-official/Interplanetary-Survival-Guide-Martian-Map), [Marswalk Map](https://github.com/RagavU1430/marswalk-map) y [MarsGuard](https://github.com/shaznamuees1-dev/MarsGuard): deploys genéricos.
- [LTELLERIA/MARS-Explorer](https://github.com/LTELLERIA/MARS-Explorer) (Team GEOuy, Uruguay): GIS de Jezero; sin README todavía.

## (b) Dónde nos ganan

| Eje | Quién | Qué tienen que nos falta |
| --- | --- | --- |
| **Demo visible** | Todos los de la tabla | Link público que anda. Nosotros: deploy pendiente |
| **Video y slides** | RISHI, Protikriti, NeuroNexus, aboodbasill (30 s + 7 slides + PDF), Darb, crazymage05 | Entregables listos el sábado al mediodía |
| **Pulido y README** | Protikriti, NeuroNexus, RISHI | GIF de héroe, video arriba de todo, tabla "cómo respondemos al desafío", tour guiado dentro de la app |
| **HUD y tablet** | RISHI (visor), Protikriti (muñeca), NeuroNexus (radial), Red Ledger, Sightline, ertan123456, aboodbasill | Un modo de visor explícito. Nosotros tenemos web de escritorio |
| **Primera persona y 3D** | Protikriti (panoramas 360° reales), iitg, crazymage05, ertan123456, Sightline, aboodbasill (juego) | Caminar el terreno real. Lo nuestro es un análogo del Viking 2, rotulado como tal |
| **Amplitud de datos** | RISHI (más de 10 misiones, 59 fuentes), NeuroNexus (76) | Más capas. Igual cumplimos con creces el mínimo de 3 tipos |
| **Walkback, comms y metabolismo** | TETHER, RISHI, Red Ledger, Sightline, Protikriti | Ya resueltos y validados (Red Ledger contra mediciones de NASA con traje; TETHER y Red Ledger contra RAD) |
| **Validación de terreno con rovers** | NeuroNexus, The-mysteryboy, aboodbasill, Protikriti | Contraste con las huellas de Curiosity y Perseverance. En S1094b no hay rover, así que no podemos copiarlo; nuestro equivalente es Phoenix más la calibración fuera de muestra |
| **Historia** | Sightline (tormenta real de mayo de 2024), Red Ledger ("lo que cuesta cada paso"), TETHER (la regla de Apollo) | Una frase-concepto de una línea |

**Lo que nadie más tiene** (confirmado en READMEs y con búsqueda de código):

- un sitio de hielo real a escala de EVA (S1094b a 10 m, 349 cráteres);
- probabilidad de hielo calibrada, con incertidumbre, por herramienta y con veredicto (taladro 6 % NO_GO, radar SkyFall 52 % CONDITIONAL, GPR de 10 m 97 % GO);
- la estrategia "radar primero, taladro después" (2.9 veces menos EVAs);
- el re-plan con cada medición;
- Phoenix como verdad de campo y Brier 0.033 sobre 383 impactos;
- el puente con SkyFall y AP-105;
- Hope/EMIRS (agencia socia de Emiratos) en la ventana de EVA;
- 2808 bloques detectados en HiRISE por sus sombras.

Lo más cercano es la misión enlatada de RISHI en Arcadia (radar + taladro, sin modelo) y la capa SWIM de Protikriti, iitg y NeuroNexus (en este último, marcada como no disponible).

## (c) Recomendaciones para las ~30 h que quedan

Por prioridad. Criterio: lo que el jurado ve en 30 s o en 7 slides.

1. **P0, sábado: deploy público.** Sin link no hay demo. Si la API real no llega, publicar la web estática con los mocks regenerados por el planificador real (son valores reales de hoy) y declararlo. Tener un espejo en GitHub Pages, porque Vercel está bloqueado en algunas redes (lo advierte ertan123456) y la guía recomienda pedir clasificación en FortiGuard.
2. **P0: video de 30 s y 7 slides, las dos cosas** (como aboodbasill). Estructura del video:
   - 0-3 s: "EV1 and EV2, 4 hours at the lowest-latitude ice on Mars. Drill or radar?";
   - la tarjeta de sitio (6 % → 97 %);
   - el momento del re-plan: llega un sondeo de radar, cambian el mapa y la ruta;
   - el número con su validación (2.9× menos EVAs; Phoenix 4.6 cm medidos frente a 7 cm predichos);
   - franja de fuentes: NASA, ESA/DLR, ASI y MBRSC.

   **Frase sugerida:** *"200 teams built a map that tells astronauts where they can walk. IceWalk tells them whether the walk is worth it, and with which instrument."*
3. **P1: un modo visor o tablet mínimo.** Una pantalla HUD sobre la vista en primera persona con próxima estación, herramienta, P(hielo) de la celda, margen de walkback y alerta de DONKI. Es lo que más repite la competencia y el enunciado lo nombra; con eso cumplimos sin construir un simulador.
4. **P1: walkback de 1.8 km (ICES-2026-127) como anillo y margen en la ruta.** Es barato y es lo mínimo esperable (cinco rivales lo tienen); hay que mostrarlo, no venderlo.
5. **P1: los bloques reales en la ruta**, con el número (2808 objetos detectados y medidos contra BoulderNet). El enunciado pide esquivar rocas, y casi todos los rivales solo usan pendiente: RISHI lo admite ("the router only knows slope"). Es un diferencial secundario barato.
6. **Recortar:**
   - **comms con línea de vista**: Red Ledger y Sightline lo hacen mejor; queda como "next step";
   - **presupuesto metabólico y masa del equipo**: Red Ledger tiene un modelo validado contra NASA; como mucho, una línea en la tarjeta con la masa de cada herramienta;
   - **suelo por inercia térmica de THEMIS**: la resolución es de ~100 m frente a una grilla de 10 m; mostrarlo como capa de contexto, sin modelo;
   - **recomendación a pie, carrito o rover**: solo si sale de la masa de la herramienta en una línea; si no, afuera.
7. **P2: panel "Evidence"** con el diagrama de calibración (36.2 esperados frente a 37 observados), Phoenix y "lo que no funciona". NeuroNexus y Red Ledger ganan puntos por honestidad; nosotros tenemos más para mostrar y hay que mostrarlo igual de claro.
8. **P2: gancho de impacto real.** SkyFall recibe propuestas de sitio hasta el **1/12/2026** y su sitio de referencia es AP-105, donde nuestra tarjeta da GO (93 %). Ningún rival menciona SkyFall. Va en la slide 7 y en el cierre del video.
9. **README y página del proyecto:** video y link arriba de todo, un GIF del re-plan, la tabla "challenge asks → where in IceWalk" (como RISHI y Protikriti) y el bloque de resultados clave que ya tenemos.
10. **No competir en lo genérico:** avatar, chat con IA, modo misión, maqueta imprimible, globo con 2000 lugares. Ahí RISHI y Protikriti están muy adelante.

**Premio objetivo:** Best Use of Science, que se confirma con este relevamiento (somos los únicos con un modelo científico validado sobre un recurso). Alternativa: Best Mission Concept, por el puente con SkyFall.

## (d) No se pudo verificar

- **Páginas de proyecto en spaceappschallenge.org:** WebFetch falla por certificado (como el 11/11) y muchas piden sesión. No vimos ninguna pestaña Project de otro equipo, ni cuántos equipos del desafío entregaron.
- **Los videos de los rivales** (YouTube y MP4): no los vimos.
- **Los deploys:** solo comprobamos HTTP 200, no que la app funcione ni qué se ve.
- **Las cifras de validación** de los rivales (99.1 %, 3.1 m RMS, r = 0.993, ρ, 1338 tests): son lo que dice cada README, sin reproducir.
- **Repos privados, o creados después de las 15 h del 14/11:** no entran. La búsqueda de GitHub tiene tope y no indexa al instante; puede faltar alguno.
- **Fuera de GitHub:** LinkedIn y X no devolvieron nada relevante; Devpost no se usa en Space Apps.
- **Trabajo previo de otros:** RISHI (creado el 3/10), Protikriti (28/9), AntrikshH90 (22/9) y sohaib1083 (19/10) existían antes del evento; iitg lo declara. No sabemos si el Local Lead los sanciona. Es un riesgo de ellos, no un dato para el pitch.
- **Sedes de los rivales:** no confirmamos si alguno compite en la sede de Buenos Aires. GEOuy es de Uruguay y su sede no está confirmada.

## Fuentes

Repos y deploys enlazados en la tabla · Space Apps Connect: [#2013](https://github.com/nasa/spaceapps/discussions/2013), [#1777](https://github.com/nasa/spaceapps/discussions/1777) · [AstroMind en dev.to](https://dev.to/walsal201/astromind-4ji4) · [SkyFall](https://science.nasa.gov/mission/skyfall/) · Guías de jurado y entrega 2026 (ver `hackaton-2026.md`).
