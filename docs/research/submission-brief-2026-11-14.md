# IceWalk: qué entregar, dónde y con qué fuentes

Relevamiento de Codex solicitado por Eitan el **14/11/2026**, desde las 18:36 de Buenos Aires (UTC−3). Fuentes leídas directamente: guías oficiales 2026, Discord de Buenos Aires, 18 correos relevantes en iCloud y repo. **Esto es investigación y un brief de producción; los videos y la landing todavía no están producidos por esta tarea.**

**Último control de anuncios: 18:52 ART.** No apareció aún el comunicado con enlace y plazo exacto del Drive local. Ese pendiente queda explícito; no cambia el cierre NASA verificado.

## 1. Las cuatro piezas que hay que distinguir

| Pieza | Para qué sirve | Requisito verificado | Dónde se entrega | Fecha |
| --- | --- | --- | --- | --- |
| **Video local** | Explicar el proyecto y sus mecanismos al jurado de Buenos Aires | **3 minutos, en castellano** | **Drive que proporciona la organización**, no nuestro Drive global | Santi anunció más tiempo; **fecha/hora exacta y enlace pendientes** del anuncio local |
| **Demo global** | Resumen breve y demostración del producto | **Video de hasta 30 s O presentación de hasta 7 slides**, contando título e introducción | Alojamiento público del equipo; enlace en **Link to Project Demo** de Space Apps | **Domingo 15/11, 23:59 de Buenos Aires**, junto con la entrega NASA |
| **Página oficial del proyecto** | Es la ficha que lee el jurado y donde se formaliza la entrega | Campos requeridos completos, inglés, referencias y enlaces accesibles; **Submit for Judging** | Pestaña **Project** de Darionautas en Space Apps | **Domingo 15/11, 23:59 de Buenos Aires** |
| **Landing propia / proyecto final** | Explicar IceWalk, mostrar evidencia y abrir la app | La web propia es una opción de **Final Project**, no una landing obligatoria separada en las reglas revisadas | Deploy público; enlazarlo en **Link to Final Project**, junto con el repo cuando corresponda | Lista antes de enviar la ficha NASA |

**No hay que esperar a clasificar para preparar lo global.** La entrega NASA se hace este fin de semana. Después, el jurado local selecciona Global Nominees; de ellos salen finalistas y ganadores. No encontré una instrucción de una segunda landing ni una nueva entrega de video global posterior a la clasificación. [Guía de entrega](https://www.spaceappschallenge.org/resources/project-submission-guide/), [guía de evaluación](https://www.spaceappschallenge.org/resources/judging-awards-guide/).

### Evidencia local que resuelve la confusión

- **Santi / Green Epaulette, 14/11 a las 09:50:** especifica video local de 3 minutos en castellano al Drive que darán el domingo; global de 30 segundos en inglés o 7 slides, alojado por el equipo y enlazado desde NASA. [Mensaje original](https://discord.com/channels/940389167035207760/998222622468882472/1571145271931306176).
- **Santi, 14/11 a las 18:02:** confirma que las presentaciones al jurado son **solo por video de 3 minutos**, debido a la cantidad de equipos, y anuncia más tiempo y un comunicado con los detalles. [Mensaje original](https://discord.com/channels/940389167035207760/998222622468882472/1571269148414320652).
- [Cronograma de Discord](https://discord.com/channels/940389167035207760/998222615552471080): cierre NASA el domingo a las 23:59.

La [página de la UP](https://www.palermo.edu/ingenieria/2026/noviembre/nasa-space-apps-challenge.html) y la [página de Buenos Aires en Space Apps](https://www.spaceappschallenge.org/2026/local-events/buenos-aires/) todavía hablan de presentaciones en vivo desde las 15:00. El mensaje posterior del organizador es la instrucción operativa más reciente: **no preparar un vivo como requisito confirmado**. Tampoco interpretar “van a tener más tiempo” como una extensión del cierre NASA.

## 2. Tu trabajo, explicado sin jerga

Eitan comunicó que su nuevo rol es **landing y videos para las dos instancias**. La descripción antigua de Frontend en Brain y la tabla provisional de `ROLES.md` no reflejan este cambio.

La historia común puede ser: **IceWalk ayuda a decidir si vale salir a buscar hielo, con qué instrumento y cómo adaptar la caminata cuando llega una medición.** La landing explica esa historia con calma; el video local demuestra cómo funciona; el global presenta una sola idea con una demostración muy corta. Se pueden reutilizar capturas y gráficos, pero son dos ediciones distintas.

Una sola landing en inglés puede servir para ambas instancias. Un duplicado local no aparece como requisito. El video local sí debe ser en castellano según el organizador. Para el demo global, la guía permite voz en otro idioma **con subtítulos en inglés**; para evitar diferencias con el resumen local que pide inglés, conviene producir directamente la versión global en inglés, con subtítulos.

## 3. Qué pide realmente Martian Map

El [enunciado oficial](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/) pide integrar datos de varias misiones NASA en un mapa, herramienta o interfaz de un lugar o recorrido en Marte, útil para **planificar y llevar a cabo una caminata científica**. El foco es hiperlocal: las herramientas regionales no bastan para una EVA individual.

Propone considerar tres o más tipos de datos, seguridad, clima espacial, movilidad con traje y equipo, objetivos científicos y obstáculos. La redacción de “tres tipos” es una sugerencia, no una condición expresada como obligatoria. HUD, tablet, primera persona, rover, pareja y varios sitios son posibilidades; no hay que construirlos todos.

Los cinco recursos publicados en la pestaña Resources son:

| Recurso oficial | Uso para IceWalk |
| --- | --- |
| [JPL Mars Trek](https://trek.nasa.gov/mars/) | Globo, capas y zonas de exploración; ya está referenciado en el repo |
| [USGS-NASA: mapas interactivos de Marte](https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars) | Contexto geológico; el sitio figura como `lAv` en la investigación del equipo |
| [Ruta propuesta de Curiosity](https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/) | Referencia visual para comunicar un traverse |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | Recurso terrestre; no es necesario integrarlo a IceWalk |
| [Imágenes crudas de Perseverance](https://mars.nasa.gov/mars2020/multimedia/raw-images/) | Referencia de superficie; no son imágenes de S1094b |

La guía general requiere al menos un recurso NASA. El GO Team precisa que debe haber uno de la lista del desafío para premios globales: [respuesta oficial de Paula, #1827](https://github.com/nasa/spaceapps/discussions/1827#discussioncomment-19421469). **Mostrar y citar el uso real de Mars Trek cubre esa procedencia; no basta con poner su logo.**

## 4. Cómo presentar la evidencia del proyecto

El relato del repo cambió respecto del PRD inicial y del lema “We plan what to learn”. Revisé README, PRD, decisiones, experimentos, fuentes, handoff del 14/11, código de entrada y sesión de API, borrador de entrega y GitHub.

| Afirmación útil | Qué podemos decir | Límite que debe acompañarla |
| --- | --- | --- |
| Sitio real | S1094b, Amazonis Planitia; terreno e imágenes HiRISE | No pintar una recreación como fotografía del sitio |
| Decisión por instrumento | En el caso del repo: taladro 1 m, 6 % / NO_GO; radar 3 m, 52 % / CONDITIONAL; GPR 10 m, 97 % / GO | Son probabilidades del modelo; 3 m y 10 m no son la misma herramienta |
| Radar primero, taladro después | Aproximadamente 2.9 veces menos EVAs esperadas en el experimento del equipo | **Simulación**, con 50 sondeos y 6 estaciones por EVA; con 20 sondeos el beneficio baja. No es una campaña real de NASA |
| Validación | Brier 0.033 frente a 0.087; 36.2 exposiciones esperadas frente a 37 observadas; Phoenix 4.6 cm medidos frente a mediana predicha de 7 cm | Validación regional; no confirma cada celda de S1094b. El prior extrapola al sur de 39.1°N |
| Mapa local | Muestra evidencia e incertidumbre; cambia con las mediciones | Celda de 10 m no significa precisión de 10 m para encontrar hielo |
| Seguridad | Usa restricciones y prácticas documentadas como referencias | Hay supuestos y extrapolaciones; no presentarlo como sistema certificado o aprobado por NASA |

Las cifras anteriores están en [EXPERIMENTS](../EXPERIMENTS.md), [SOURCES](../SOURCES.md), [README](../../README.md) y [project-page](../submission/project-page.md). En esta tarea **contrasté los documentos y el código; no volví a ejecutar las simulaciones científicas**.

### Material disponible y faltantes

- **Ya existe:** borrador en inglés para cada campo de NASA en [project-page.md](../submission/project-page.md); figuras [evidence.png](../submission/img/evidence.png) y [conops.png](../submission/img/conops.png); guion anterior de 30 s en [diferencial-wow](diferencial-wow-2026-11-14.md). Revisarlos antes de reutilizar: allí también quedaron sugerencias de un vivo local que ahora están superadas.
- **App en `main`:** Site → Plan → Brief → EVA → Debrief. Casco del EV y consola del IV separados; el EV registra mediciones, el IV revisa. Modelo, planificador y detección por sombras integrados en el historial. No mostrar BoulderNet como detector final: fue probado y descartado.
- **No encontré una landing dedicada:** `/` monta `PlanningView`; hay rutas `/site`, `/globe`, `/cuff` y `/design`. Esto describe el checkout revisado, no descarta trabajo en otra máquina.
- **Deploy sin verificar:** los enlaces de demo y proyecto en el borrador siguen en `TODO`; el handoff indica deploy pendiente. La web puede usar mocks cuando falta la API o los datos; comprobar el origen mostrado en la app antes de grabar una demo que se anuncie como real.
- **Estado Git:** `main` en `2a633fb`, coincide con el HEAD remoto consultado; checkout limpio al entrar; ningún PR abierto en la consulta. PR #28 mergeado. No se hizo pull ni se modificó código de producto.
- **CI actual:** [run 43636433729](https://github.com/luquiwais/IceWalk/actions/runs/43636433729) **falló**. Web tests, lint y build pasaron; `web:typecheck` falló por `ENOENT` al generar `.next/types/routes.d.ts`. Parece una interferencia entre generación de tipos y build, pero **no está diagnosticada ni corregida** en esta tarea. El run de la rama del PR #28 sí pasó.
- **Plataforma NASA:** la [pestaña Project pública](https://www.spaceappschallenge.org/2026/find-a-team/darionautas/?tab=project) muestra “Check back later”. Esto prueba que no hay contenido público visible; **no permite saber si hay un borrador privado guardado**. Members muestra seis integrantes y a Guido como Team Owner.

## 5. Brief concreto para la landing

Propuesta de producción, no exigencia textual de NASA. Mantener el contenido en inglés y tomar los números del borrador revisado:

1. **Inicio:** IceWalk, Team Darionautas, nombre exacto del desafío; una frase que explique la decisión. Accesos claros a app, video de 30 s y repo.
2. **Problema:** una caminata consume tiempo y recursos; la presencia regional de hielo no basta para elegir dónde perforar.
3. **Demostración:** captura grande o fragmento breve del ciclo herramienta → plan → medición → nuevo plan. Mostrar lo que cambia.
4. **Por qué creerlo:** evidencia regional y Phoenix; gráfico del experimento radar/taladro con la palabra “simulation” y sus supuestos.
5. **Datos → decisiones:** HiRISE para terreno y bloques; Mars Trek para contexto; DONKI para clima espacial; Hope/EMIRS para polvo. Créditos a NASA y agencias socias donde se usan, sin sugerir aval institucional.
6. **Límites y equipo:** prototipo, incertidumbre y supuestos visibles; integrantes; referencias completas; uso de asistentes actualizado.

No hace falta comprimir toda la página oficial en el hero. La ficha NASA lleva la explicación completa para el jurado; la landing ayuda a entenderla y a abrir la app. Una grabación o imagen de respaldo permite comprender el producto aunque el servicio tarde en responder.

## 6. Brief de ambos videos

### Video local: 3 minutos, castellano

Guion de montaje sugerido, hasta que la organización publique indicaciones adicionales:

| Tiempo | Qué explicar / mostrar |
| --- | --- |
| 0:00–0:20 | Nombre, equipo, desafío y problema: no alcanza con saber que podría haber hielo; hay que decidir si vale salir a medir |
| 0:20–0:45 | Sitio real y datos NASA. Explicar EVA como caminata fuera del hábitat y distinguir astronauta / operador del hábitat |
| 0:45–1:10 | Tarjeta de instrumentos: por qué un taladro y un radar pueden dar decisiones distintas |
| 1:10–1:35 | Plan: estaciones, ruta sobre terreno real y margen para volver; solo dos o tres restricciones comprensibles |
| 1:35–2:10 | Casco del EV: llegar, registrar un sondeo y ver cambiar el mapa y el plan. Mostrar también qué recibe el IV |
| 2:10–2:40 | Evidencia: validación regional/Phoenix y resultado simulado de radar primero; decir un límite importante |
| 2:40–3:00 | Beneficio, próximos pasos y créditos. Terminar con una idea, no con una lista de tecnologías |

Reservar las explicaciones de mecanismos para esta edición. No usar el video largo en el campo global **Link to Project Demo**. Si se lo enlaza adicionalmente desde materiales globales, atender el requisito de inglés de esos materiales y la excepción de subtítulos; la opción más clara es mantenerlo en el circuito local y publicar el corto en la ficha global.

### Demo global: hasta 30 segundos

Propuesta más simple que el guion anterior de ocho escenas: **una decisión y un cambio visible**. Exportar a 29–29.5 s como margen de edición; ese margen es una recomendación, no una regla.

| Tiempo | Pantalla |
| --- | --- |
| 0–4 s | IceWalk · Darionautas · Martian Map; problema en una frase |
| 4–10 s | Tarjeta del sitio: elegir instrumento |
| 10–22 s | Ruta y casco: nueva medición → mapa y recorrido actualizados |
| 22–27 s | Una prueba legible de validación, con su límite |
| 27–29.5 s | Beneficio y créditos legibles |

Borrador de locución de 60 palabras, a cronometrar con la persona que grabe:

> We are Darionautas. Our Martian Map project is IceWalk. Before astronauts leave the habitat, it estimates whether ice is within their instrument’s reach and plans a traverse using NASA terrain and safety references. Each field measurement updates the map and route. Checked against independent impact data and Phoenix observations, IceWalk helps crews decide where to measure next, with uncertainty visible.

No prometer que NASA aprobó la ruta ni que se confirmó hielo con el prototipo. Si se usan las 7 slides como alternativa, son **7 en total** y en inglés; no hay obligación de entregar ambas alternativas.

### Recursos audiovisuales que sí verifiqué

- [PIA25582: InSight](https://science.nasa.gov/photojournal/nasas-insight-records-the-sound-of-a-martian-impact/): **sonificación de datos sísmicos acelerados 100 veces**, no una grabación acústica del impacto en el aire. Tiene WAV y MP4 descargables. Crédito: **NASA/JPL-Caltech/CNES/Imperial College London**. Sirve para un inicio, si aporta más que el tiempo que consume.
- [PIA25583: hielo alrededor del cráter](https://science.nasa.gov/photojournal/hirise-views-a-mars-impact-crater-surrounded-by-water-ice/): imagen real de HiRISE; crédito **NASA/JPL-Caltech/University of Arizona**.
- [Marca Space Apps](https://www.spaceappschallenge.org/brand/): guía, logos oficiales, patrones y fuentes. Esto describe la marca del evento; no obliga a reemplazar la identidad de IceWalk. [Guía PDF](https://assets.spaceappschallenge.org/media/documents/Space_Apps_Brand_Guide_VUGpVJm.pdf), [logos 2026](https://assets.spaceappschallenge.org/media/documents/NASA_Space_Apps_Logos_2026.zip).

## 7. Cómo se envía y qué evalúan

La [guía de entrega](https://www.spaceappschallenge.org/resources/project-submission-guide/) distingue **Save Progress** de **Submit for Judging**. Guardar no equivale a entregar. Se puede editar y reenviar hasta el cierre; la ficha permite avisar a compañeros con un lock, pero otro integrante puede quitarlo.

Campos a preparar: Project Name; High-Level Project Summary; Link to Project Demo; Link to Final Project; Detailed Project Description; Use of Super Intelligence; NASA Data; Space Agency Partner Data and Other References. El [borrador existente](../submission/project-page.md) ya sigue esa estructura.

La plataforma admite imágenes JPG/PNG/GIF de hasta 10 MB, pero no subir directamente videos o documentos. Los enlaces externos deben abrir sin registro, permiso ni contraseña. Probar app, video, slides y repo en una ventana privada. La clasificación FortiGuard es una recomendación opcional de la guía, no un requisito de envío.

La ficha y materiales enlazados deben estar en inglés, con la excepción de video narrado en otro idioma con subtítulos en inglés. La guía prohíbe imágenes, video, audio o semejanza de personas menores de 18 en el demo y proyecto final: **incluye voces**, no solo caras.

La guía permite asistentes de IA/SI y pide declarar dónde y cómo se usaron. Imágenes y videos generados: marca visible; audio, código y datos generados: reconocimiento en texto descriptivo y metadatos. El contenido generado no debe usar ni modificar elementos de marca NASA. El campo SI no se muestra al jurado, pero sí los indicadores incorporados al proyecto. El borrador actual dice solo Claude: **revisar herramientas realmente usadas, incluido Codex en esta investigación/documentación y las que se usen en landing/video**. No afirmar que todo commit lleva un trailer sin auditarlo.

La [guía de evaluación](https://www.spaceappschallenge.org/resources/judging-awards-guide/) establece cinco criterios de 1 a 5 **en todos los niveles**: Impact, Creativity, Validity, Relevance, Presentation. La página de la sede resume cuatro en español, pero no prueba que sustituya la rúbrica NASA para nominar al global. La afirmación previa “el jurado local no usa los cinco criterios” no queda respaldada. La mayor parte de la evaluación se basa en la ficha completa; el demo ayuda especialmente a Presentation.

El encaje recomendado por investigaciones anteriores es Science / Mission Concept / Data; es estrategia del equipo, no categoría confirmada ni premio solicitado en el formulario. Calendario global: nominados **3/12/2026**, finalistas y menciones **17/12/2026**, ganadores **26/1/2027**.

## 8. Qué aportaron tus correos y Discord

Se buscaron **NASA** y **Space Apps** en **All Mailboxes** de iCloud. Se leyeron 18 correos relevantes (agosto–noviembre); se excluyeron la publicidad de ITBA y el contenido de verificación de cuenta. Las copias privadas quedaron fuera del repo, transcriptas en el Brain (`Projects/IceWalk/Communication/Hackathon Submission Sources.md`); la carpeta de Descargas se borró el 16/11.

| Fecha / remitente | Hallazgo |
| --- | --- |
| 26/8, NASA Space Apps | Inscripción registrada |
| 27/8, NASA Space Apps | **Buenos Aires confirmado** como evento de Eitan |
| 3/9 y 17/9, Info SpaceAppsBA | Invitación oficial a Discord y uso como canal de avisos |
| 17/9, NASA Space Apps | Formación de equipos; 14 desafíos; no empezar el desarrollo antes del evento |
| 30/9, NASA Space Apps | Solicitud de ingreso y posterior **aceptación en Darionautas** |
| 21/10, Info SpaceAppsBA | Registrar el equipo tanto en Discord como en NASA; uno no reemplaza al otro |
| 28/10, NASA Space Apps | Enunciados publicados; reglas de equipo y trabajo previo |
| 3/11, NASA Space Apps | Connect abierto en GitHub; guías y soporte |
| 3/11, cuatro mails de Info SpaceAppsBA | Charla de consultas, materiales para el presencial, encuentro del 11/11 e invitación a Discord |
| 9/11, Info SpaceAppsBA | Documentación, equipo propio, alimentación y autorización para asistir siendo menor |
| 12/11, Info SpaceAppsBA | Kick-off 13/11 a las 19; **entrega NASA 15/11 a las 23:59** |
| 13/11, NASA Space Apps | Guías vigentes y Global Offers opcionales: GoDaddy, Google Cloud, Meteomatics, Microsoft y Miro |
| 13/11, Info SpaceAppsBA | Se permite pasar a virtual por el clima sin diferencia de participación |

No apareció en esas búsquedas un correo con el Drive o el nuevo cierre local. Las ofertas son herramientas opcionales, no condiciones para competir. El anuncio de septiembre anticipaba recursos para octubre; el mail posterior y la guía los sitúan el 13/11: usar la información más reciente.

Canales revisados: reglamento, anuncios, cronograma, consultas-y-sugerencias, recursos-digitales, general, buscando-mentor, equipos, text-voice-público y los dos canales de texto del Equipo 30. **Sí existe Equipo 30 para Darionautas**: Eitan lo identificó a las 15:02. [Mensaje del equipo](https://discord.com/channels/940389167035207760/1569529457193123870/1571223726421319703). `recursos-digitales-30` no mostró contenido al consultar. La búsqueda global de Discord no devolvió resultados fiables; para recuperar el mensaje de las 09:50 se cargó historial desplazando el canal.

Los recursos generales incluyen [IBM Bob](https://bob.ibm.com/), [documentación de Bob](https://bob.ibm.com/docs/ide), [Quantum Composer](https://quantum.cloud.ibm.com/composer), [SkillsBuild](https://skillsbuild.org/), [Surya de NASA-IMPACT](https://github.com/NASA-IMPACT/Surya), [modelo Surya](https://huggingface.co/nasa-ibm-ai4science/Surya-1.0), un PDF de IBM y enlaces de CONAE. Son **opcionales**; no se encontró obligación de usarlos para IceWalk. El PDF está enlazado en [este mensaje](https://discord.com/channels/940389167035207760/998222681923141712/1570217031872151582); no se revisó su contenido. La [demo de IBM del sábado](https://demobobspaceapps.pages.dev/demo/) es de la charla, no una entrega que deba completar el equipo.

CONAE compartió [sitio institucional](https://www.argentina.gob.ar/ciencia/conae), [catálogo](https://catalogos.conae.gov.ar/catalogo/catalogo.html), [Geoportal](https://geoportal.conae.gov.ar/mapstore/#/viewer/openlayers/geoportal), [visores](https://catalogos.conae.gov.ar/catalogo/visores.html), [geoservicios](https://catalogos.conae.gov.ar/catalogo/catalogoGeoServiciosOGC.html) y [focos de calor](https://catalogos5.conae.gov.ar/catalogofocos/). Son datos terrestres; no justifican ampliar el alcance del producto.

## 9. Pendientes precisos y orden de trabajo

1. **Organización local:** obtener enlace de Drive, fecha/hora exacta, nombre de archivo, permisos y si pide algo además del video. No inventar esos datos. Santi anunció que publicaría el detalle.
2. **Congelar un recorrido grabable con el equipo:** tarjeta → plan → casco → medición → re-plan. Verificar qué datos y servicios están activos.
3. **Cerrar los enlaces públicos y la ficha NASA primero:** ya hay borrador y figuras. Una landing sin ficha enviada no completa la entrega.
4. **Producir el corto global y la landing en inglés**, con fuentes y límites; probar enlaces y subtítulos.
5. **Montar el video local de 3 minutos en castellano** con las mismas capturas, más explicación de mecanismos y evidencia.
6. **Enviar la ficha antes del cierre y comprobar el banner de confirmación**; seguir por separado la instrucción local cuando publiquen el Drive.

Mensaje de consulta listo, **no enviado**: “Para Darionautas, ¿pueden confirmar el enlace del Drive, la fecha y hora límite del video local de 3 minutos en castellano, cómo nombrarlo y si requiere archivos adicionales? Entendemos que la entrega en NASA sigue cerrando el 15/11 a las 23:59.”

Contactos publicados: Local Lead Javier Sabas, `spaceappsba@gmail.com`; Discord Santi / Green Epaulette para modalidad virtual y Eljavo para organización; UP `emprende@palermo.edu`; soporte de plataforma `web@spaceappschallenge.org`. No se contactó a nadie desde esta tarea.

La premiación local figura a las **11:00 del jueves 19** en el anuncio de Discord del 12/11 y en la página actual de la UP. Space Apps conserva 17:00–18:00 y su agenda incluso 18:00: hay contenido desactualizado. La referencia más consistente es 11:00, pero conviene revisar el próximo comunicado local.

## 10. Límites del relevamiento

No se escucharon llamadas de voz ni grabaciones de apertura; no se revisaron DMs, correos ajenos al evento ni todos los mensajes históricos del servidor. No se accedió al editor privado de NASA, no se publicó la ficha y no se ejecutó la app ni sus simulaciones de nuevo. Se verificaron los documentos, el código relevante, el estado remoto y los checks existentes. El dossier cubre las fuentes encontradas y deja identificado lo que falta; no presume exhaustividad sobre contenido aún no publicado.

Los documentos anteriores se preservan como historial. Para requisitos de entrega y el rol de Eitan, usar este relevamiento y sus fuentes directas sobre los resúmenes previos contradictorios.
