# Rivales locales, momentos "wow" y jurado de Buenos Aires (14/11, tarde)

Relevamiento del 2026-11-14, entre las 15 y las 17 h (hora de Buenos Aires), con el hackatón en curso. Complementa [`competencia-2026-11-14.md`](competencia-2026-11-14.md) (230 repos globales) y [`hackaton-2026.md`](hackaton-2026.md) (reglas, ganadores previos, propuesta). No repite lo que ya está ahí.

## Veredicto

- **No encontramos ningún equipo argentino trabajando en Martian Map en GitHub ni en la web.** La competencia real en la sede no es de este desafío: es contra los equipos de los otros 13 desafíos que también se presentan en Palermo, por los cupos de nominados globales.
- **El jurado local no usa los cinco criterios globales.** La página de la UP dice que evalúa **innovación, viabilidad, impacto y calidad técnica**, en presentaciones desde las 15:00 del domingo. Hay que armar un pitch en vivo, no solo el video de 30 s.
- **Nuestro mejor gancho narrativo estaba sin usar:** el nombre del sitio sale del sismo. "S1094b" es el evento que **InSight escuchó en el sol 1094** (24/12/2021), y NASA publicó ese sonido ([PIA25582](https://photojournal.jpl.nasa.gov/catalog/PIA25582)). Ningún rival puede abrir con el ruido real del impacto que creó su sitio.
- **Top 3 de momentos wow:** (1) el re-plan en primera persona; (2) la apertura con el sonido del impacto; (3) que el jurado elija dónde medir en vivo. Tagline recomendado: *"Every step on Mars costs. IceWalk makes it count."*

## 1. Rivales locales

### Método

- `gh search repos` con palabras clave en español (marte, marciano, mapa marciano, caminata marciana, guía de supervivencia interplanetaria, EVA marte, space apps argentina o buenos aires o palermo), con repos creados desde el 1/9/2026.
- Un barrido de 361 repos de Marte creados desde el 1/10, con la ubicación de sus 339 dueños.
- `gh search code` (Buenos Aires, Argentina, Universidad de Palermo, junto con Martian Map o marswalk) y Space Apps Connect (Argentina, Buenos Aires, Palermo, Marte, español).
- Web: prensa argentina, la página de la UP y búsquedas de LinkedIn, Instagram y X.

### Resultado

**Con ubicación argentina:** solo 3 dueños de los 339, y ninguno tiene un repo de este desafío (un TP de la UNaB, un repo vacío de San Luis y otro de Chaco). Ningún README menciona Buenos Aires, Palermo ni Argentina junto con Martian Map. Tampoco hay discusiones argentinas en Space Apps Connect.

**Equipos de habla hispana del desafío** (ninguno confirmado en nuestra sede):

| Repo | Origen | Qué hace | Amenaza |
| --- | --- | --- | --- |
| [joelMisaelProfessionaWorks/M.A.R.T.E](https://github.com/joelMisaelProfessionaWorks/M.A.R.T.E) · [demo](https://joelmisaelprofessionaworks.github.io/M.A.R.T.E/) | Sin confirmar (¿México?) | Consola HUD, 6 capas de Trek y USGS, soporte vital, "Martian Street View 360°" con imágenes reales y audio sintetizado. Lema: "Real Data. Safer Journeys. Bigger Discoveries." | Media en lo global (pulido visual). Sin hielo ni modelo |
| [ortiz10m/nexo-code-nass](https://github.com/ortiz10m/nexo-code-nass) | Neiva, Colombia | Jezero, A* con costo metabólico y carga (0/12/25 kg), modo rover, DONKI, Street View de Perseverance, reporte post-EVA | Media-baja; otra sede |
| [Manuel-O-S/marswalk-copilot](https://github.com/Manuel-O-S/marswalk-copilot) | Lima, Perú (un integrante) | Grafo con OR-Tools en Jezero; un LLM explica y "nunca calcula"; contratos por rol como los nuestros | Baja; repo casi vacío (3 KB) |
| [TheBox-coder/Guia-de-supervivencia-NASA](https://github.com/TheBox-coder/Guia-de-supervivencia-NASA) | Sin confirmar | "JEZERO Survival Intelligence", Mission Control y deploy en Render | Baja-media |
| [Varya06/MapaMarte](https://github.com/Varya06/MapaMarte) | "Valencia 2026" | Mapa interactivo; solo README | Baja; otra sede |
| [JafetPantojaO/Mapa-Marciano](https://github.com/JafetPantojaO/Mapa-Marciano) | Sin confirmar | Esqueleto React + Node | Baja |
| [esolisdev/demo-marte](https://github.com/esolisdev/demo-marte) | Sin confirmar | Rover en Unity que evita pendientes y rocas | Baja |
| [juanachies/marcianos](https://github.com/juanachies/marcianos) | Probablemente Rosario (la autora cursa la TUIA de la UNR) | Repo vacío creado hoy; desafío desconocido | Desconocida. Es el único rastro argentino |

GEOuy (Uruguay, [LTELLERIA/MARS-Explorer](https://github.com/LTELLERIA/MARS-Explorer)) ya figuraba en el relevamiento global.

**Lectura:** en la sede, la amenaza no es otro planificador de Marte sino un proyecto de otro desafío que llegue más pulido y con una historia más simple. En 2025 la sede de Buenos Aires nominó a **Wizor Space**, un simulador inmersivo de misiones a la Luna y Marte hecho por una startup del Parque de Innovación ([ITSitio](https://www.itsitio.com/ar/software/una-startup-argentina-fue-nominada-por-la-nasa-por-su-simulador-de-misiones-en-la-luna-y-marte/), [Economía Sustentable](https://economiasustentable.com/noticias/una-startup-argentina-distinguida-por-la-nasa-por-simular-una-mision-espacial-a-la-luna-y-marte-como-es-el-proyecto/)). La señal es que al jurado local le gusta lo inmersivo, pulido y con aspecto de producto.

### Ganadores y nominados argentinos anteriores

| Año | Equipo / proyecto | Sede | Resultado | Qué lo hizo destacar |
| --- | --- | --- | --- | --- |
| 2017 | Lemon Py, *Pollen Alert* | Buenos Aires | Uno de los 5 ganadores globales | Problema local concreto (polen de plátanos en CABA), cruce de datos abiertos de la ciudad, satélite y reconocimiento de imágenes; equipo multidisciplinario con periodismo, meteorología y biología ([Unidiversidad](https://www.unidiversidad.com.ar/jovenes-argentinos-premiados-en-la-nasa-por-el-desarrollo-de-una-app-para-detectar-polen)) |
| 2022 | *Mars 3D Home* (UNCuyo) | Mendoza | Best Mission Concept | Escenario de misión concreto y un objeto físico: módulo habitable impreso en 3D, con muebles ([Unidiversidad](https://www.unidiversidad.com.ar/dos-estudiantes-de-la-uncuyo-ganaron-un-concurso-en-la-nasa-por-disenar-una-casa-para-habitar-en-marte)) |
| 2023 | Spacebee Tech, *RoverTito* + *Ainoken* | No confirmada | Uno de los 10 ganadores globales (categoría probable: Best Use of Technology, sin confirmar) | Hardware real (rover lunar de bajo costo, "el primero de América Latina"), app 3D de sismos lunares y un equipo federal de seis provincias ([Unidiversidad](https://www.unidiversidad.com.ar/con-una-app-y-un-robot-lunar-un-equipo-con-egresados-del-balseiro-se-lucio-en-la-nasa)) |
| 2024 | *Lessat App* | Mendoza | Nominado global | App de conexión satelital ([Economía Sustentable](https://economiasustentable.com/noticias/la-nasa-nomino-a-un-equipo-mendocino-por-el-desarrollo-de-una-app-de-conexion-satelital)) |
| 2025 | Wizor, *Wizor Space* | Buenos Aires (virtual, con CONAE) | Nominado global; no ganó ([lista de NASA 2025](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/)) | Simulador inmersivo con datos reales de NASA, con el que el usuario toma decisiones de supervivencia de la tripulación |

**Patrón argentino:** algo tangible o inmersivo (objeto impreso, rover, simulador), un escenario humano concreto y un equipo diverso. En lo global de 2024 y 2025 no ganó ningún argentino.

## 2. Momentos wow

### Qué hizo destacar a los ganadores recientes

- **2025** ([NASA](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/)): SpaceGenes+ (panel interactivo, Best Use of Science), PureFlow (hábitat en 3D probado contra tormentas solares, Mission Concept), Twisters (ventanas de actividad seguras hiperlocales, Technology) y HerCode (un cuento ilustrado, Storytelling).
  - Patrón: **una amenaza concreta, una decisión humana y la herramienta respondiendo en pantalla**.
  - Twisters es el más parecido en espíritu: "ventana segura hiperlocal", y ganó.
- **Guía de entrega:** presentar al equipo al principio del video, visuales fuertes y texto legible. La página de jurado de 2016 decía que suben los proyectos con "compelling storytelling" ([guía](https://www.spaceappschallenge.org/resources/project-submission-guide/), [2016](https://2016.spaceappschallenge.org/about/judging)).
- **Rivales de este desafío:** todos tienen HUD, primera persona o 360°. **Lo visual solo no nos diferencia; nos diferencia lo que cambia en la pantalla cuando llega una medición.**

### Siete ideas, ordenadas por impacto/esfuerzo

Esfuerzo estimado para el equipo, con los assets que ya tenemos; ventana de 20 h.

| # | Momento | Qué se ve | Por qué pega | Esfuerzo | Impacto |
| --- | --- | --- | --- | --- | --- |
| 1 | **Re-plan en primera persona** | En la caminata 3D, EV1 llega a una estación y hace un sondeo de radar. El HUD pasa de P(hielo) 6 % a un valor nuevo, el mapa de hielo se recolorea y la ruta se redibuja sobre el terreno real. Rótulo: "Re-planned on site, no 22-min wait for Earth" | Es lo único que ningún rival tiene. Todos tienen HUD y 3D; ninguno cambia de plan por una medición | Medio (4-6 h): el `/replan` y los mocks regenerados ya existen; se puede guionar con un sondeo precalculado | Máximo |
| 2 | **Apertura con el sonido del impacto** | Pantalla negra y el audio real de InSight del sol 1094 ([PIA25582](https://photojournal.jpl.nasa.gov/catalog/PIA25582)). Texto: "Dec 24, 2021. InSight heard a meteoroid hit Mars." Corte a los bloques de hielo de HiRISE ([PIA25583](https://photojournal.jpl.nasa.gov/catalog/PIA25583)) | Engancha en 3 s, explica el nombre del sitio y es material de NASA, no generado. Suma para Most Inspirational y Storytelling | Bajo (1 h) | Muy alto |
| 3 | **El jurado elige dónde medir (en vivo)** | En la presentación local: "Elijan una celda". Medimos, el modelo actualiza y la ruta cambia delante de ellos | Interacción directa; demuestra que no es un video armado. Cubre "viabilidad" y "calidad técnica" del criterio local | Bajo si el re-plan anda en el deploy (más un plan B con mocks) | Muy alto en la sede |
| 4 | **La tarjeta que dice NO** | Toma partida: "Drill 1 m: NO_GO 6 %" en rojo y "GPR 10 m: GO 97 %", con un contador que baja de 3.3 a 1.16 EVAs para confirmar hielo (2.9× menos; `EXPERIMENTS.md`, radar primero) | Una herramienta que recomienda no salir es contraintuitiva y creíble. Es la frase del pitch hecha imagen | Bajo (1-2 h): la tarjeta existe; falta animar el contador | Alto |
| 5 | **Zoom de órbita a botas** | Toma continua del globo Cesium a CTX, al orto HiRISE de 0.25 m y a primera persona junto a bloques del tamaño de los de hielo. Rótulo: "Real HiRISE terrain, 1 m DTM, 2808 boulders detected from their shadows" | "Powers of ten" sobre terreno real, no sintético (varios rivales usan terreno inventado o análogos) | Medio (3-4 h): trayectoria de cámara guionada | Alto en Presentation |
| 6 | **Entrega a SkyFall** | Cierre: "NASA's SkyFall radar helicopters take site proposals until Dec 1. At its reference site AP-105 our card says GO 93 %." Opcional: que el equipo **mande de verdad** una propuesta de sitio (decisión humana; nosotros no la enviamos) | Impacto real fuera del hackatón; ningún rival menciona SkyFall | Bajo para la slide (30 min); 2-3 h para una propuesta seria | Alto (Impact, Galactic Impact) |
| 7 | **Bloques como peligro en el HUD** | Alerta "Boulder 1.4 m, 6 m ahead: reroute" mientras se camina | Cumple la regla del enunciado de esquivar rocas con datos reales; RISHI admite que su ruta "only knows slope" | Bajo-medio si la caminata 3D ya carga los bloques | Medio |

**Descartado por riesgo:** un evento de DONKI "en vivo" (si el Sol está quieto ese día, no pasa nada en pantalla); hardware o maqueta (no llega en 20 h y no es nuestro fuerte).

**Recomendación:** hacer 1, 2 y 4 para el video; 3 para el vivo; 5 y 6 si sobra tiempo. Las dos primeras dependen de que la caminata 3D y el re-plan corran en el mismo build: es el camino crítico.

### Una línea de diferencial

> **Other Mars maps tell astronauts where they can walk. IceWalk tells them whether the walk will reach ice, and with which tool, and re-plans after every measurement.**

### Tres taglines candidatos

1. **"Every step on Mars costs. IceWalk makes it count."** (recomendado: corto, humano, no promete dónde está el hielo)
2. "Radar first. Drill second. Walk only when it's worth it."
3. "Is this walk worth the ice?"

### Guion de 30 s

Subtítulos en inglés, sin imágenes ni audio generados con IA, créditos en pantalla.

| Tiempo | Imagen | Texto o voz |
| --- | --- | --- |
| 0-3 s | Negro; sonido real de InSight (PIA25582) | "Dec 24, 2021. InSight heard a meteoroid hit Mars." |
| 3-6 s | Bloques de hielo de HiRISE (PIA25583) | "It dug up the lowest-latitude ice ever seen. Crater S1094b." |
| 6-9 s | Zoom de órbita a primera persona; logo de texto "IceWalk · Team Darionautas" | "EV1 and EV2. Four hours of suit time. Drill or radar?" |
| 9-13 s | Tarjeta de sitio: drill NO_GO 6 %, GPR GO 97 % | "IceWalk picks the tool before anyone steps out." |
| 13-20 s | Caminata con HUD entre bloques reales; sondeo de radar; recolor del mapa y nueva ruta | "Every measurement re-plans the EVA, on site." |
| 20-24 s | Contador: 2.9× fewer EVAs; "Phoenix: 4.6 cm measured, 7 cm predicted" | "Calibrated on 383 impacts. Checked against Phoenix." |
| 24-27 s | Globo con AP-105 | "NASA's SkyFall radar picks sites until Dec 1. Our card: GO 93 %." |
| 27-30 s | Tagline; franja de fuentes: NASA (HiRISE, InSight, DONKI, Mars Trek), ESA/DLR, ASI, UAE/MBRSC | "Every step on Mars costs. IceWalk makes it count." |

## 3. Cómo evalúa el jurado de Buenos Aires

Fuente: [página de la sede en la UP](https://www.palermo.edu/ingenieria/2026/noviembre/nasa-space-apps-challenge.html), más lo que ya estaba en `hackaton-2026.md` (Discord y mails).

- **Criterios locales:** innovación, viabilidad, impacto y calidad técnica. Mapeo a nuestros argumentos:
  - **innovación:** prospección de hielo por herramienta con re-plan (nadie más lo hace);
  - **viabilidad:** reglas de NASA con fuente, deploy funcionando y SkyFall;
  - **impacto:** menos EVAs, el recurso más caro y riesgoso;
  - **calidad técnica:** CI, tests, contratos, calibración fuera de muestra y Phoenix.
- **Formato:** domingo 15, desarrollo hasta las 15:00 y después presentaciones ante el jurado. **La página no dice duración ni modalidad** (en el Discord el domingo es virtual). El jurado elige los proyectos que van a la instancia internacional; no dice cuántos. Premios el jueves 19 a las 11:00 en la UP (Mario Bravo 1050).
- **Jurado:** sin nombres publicados. Contacto: emprende@palermo.edu. Es el décimo aniversario del evento en Argentina.
- **Qué preparar:** un pitch en vivo de unos 3 min con la demo interactiva (idea 3), las 7 slides como respaldo y respuestas cortas a "¿por qué no un robot?", "¿mapa de hielo a 10 m?" y "¿qué no funciona?" (ver `competencia.md`, "Objeciones"). La entrega global de las 23:59 sigue siendo aparte.

## No se pudo verificar

- **El sitio oficial de Space Apps** (página de la sede, pestañas Project, ganadores locales de 2024 y 2025): `curl` y WebFetch no conectan desde acá, como en los relevamientos anteriores.
- **Redes sociales:** las búsquedas no devolvieron posts de LinkedIn, Instagram ni X sobre equipos de Palermo 2026. No entramos con sesión a ninguna red.
- **Sede de los rivales hispanos:** M.A.R.T.E., TheBox-coder y JafetPantojaO no declaran ciudad. juanachies/marcianos está vacío; no sabemos su desafío ni su sede.
- **Repos privados o sin palabras clave en español:** no entran. La búsqueda de código de GitHub no devolvió ni siquiera repos que sabemos que existen (indexa tarde).
- **Categoría de RoverTito y Ainoken en 2023, y su sede local:** solo hay prensa; la página de NASA salió truncada.
- **Duración de la presentación local y composición del jurado:** no publicadas. Preguntar a Javier Sabas (Local Lead) por Discord.
- **Audio PIA25582:** confirmamos que es el impacto del 24/12/2021 (sol 1094), pero no revisamos la licencia exacta del archivo ni si trae créditos de CNES e Imperial College que haya que mostrar. Créditos esperados: NASA/JPL-Caltech/CNES/Imperial College London.
- **Cifras del contador:** 3.3 → 1.16 EVAs salen del Monte Carlo de `EXPERIMENTS.md` (6 estaciones, taladro de 1 m, 50 sondeos por EVA); con 20 sondeos la ventaja baja a ×2.1. Mostrar el supuesto de los 50 sondeos si preguntan.
- **Deploys de los rivales hispanos:** no los abrimos.
