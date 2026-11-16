# Flujo de 5 fases contra el ciclo de vida de una EVA en NASA

Investigación del 2026-11-14 para el rediseño de la interfaz (Site, Plan, Rehearse, Execute, Debrief). No cambia código ni contratos. Se apoya en `decisiones-nasa.md`, `diseno-interfaz.md`, `factibilidad.md`, `viabilidad-expediciones.md` y `plans/web-design.md`, y no repite lo que ya está ahí.

**Etiquetas:** [D] documentado (leído en la fuente), [I] inferencia nuestra, [NV] no verificado (buscador, prensa o resumen).

## 1. Veredicto

**El flujo es coherente con NASA en estructura.** La Dirección de Operaciones de Vuelo (FOD) resume su trabajo como «Plan, Train, Fly» [D] (Kagey 2024, p. 8). Para Artemis, el desarrollo de una EVA tiene tres fases: *Mission Definition*, *Flight Operations Integration* y *Creation of Final Products*. Después vienen la ejecución y el replan entre EVAs [D] (Caswell y Kostak 2025, sec. III). Las 5 fases calzan con eso: Site ≈ Mission Definition, Plan ≈ Integration, Rehearse ≈ Final Products y entrenamiento, Execute ≈ realtime y Debrief ≈ debrief post-EVA más el turno de planificación.

**Alineado:** estaciones y traverses sobre un mapa con el timeline integrado, la STM como columna vertebral, los chequeos de caminata, ventana y comunicaciones (son las restricciones de la Tabla 1 de Caswell y Kostak), el bingo, el walkback, la cuff checklist, el replan con justificación y la decisión en manos de la tripulación o del IV.

**No alineado o incompleto:**
1. **La vuelta anticipada.** NASA distingue **EVA TERMINATE** (ordenada, con limpieza) de **EVA ABORT** (emergencia) [D] (xEVA Con Ops, sec. 9.3 y 9.5). «Volver al hábitat» sin categoría no es terminología NASA. IceWalk no tiene telemetría del traje, así que nunca debería recomendar ABORT [I].
2. **El disparador «más del 50 % del plan cambió» no es un criterio de NASA para volver.** Si sobra tiempo, NASA usa Get Aheads «instead of coming in early». Si falta, borra tareas por prioridad [D] (Kagey, p. 11), y el replan grande se hace **entre EVAs**, en el turno de Planning [D] (Edgar et al. 2025).
3. **Faltan productos de NASA:** Map Book, flight rules visibles, Get Aheads, orden de borrado, Cribsheet (contingencias) y cobertura de la STM.
4. **«Rehearse» no es el nombre de la fase previa a la EVA en una misión en curso.** Ahí NASA hace una revisión del timeline y de los procedimientos, y una conferencia previa con MCC y el Science Team [D] (xEVA, sec. 7.2.5). «Dress rehearsal» se usa para análogos y entrenamiento en la Tierra [D] (Elston et al. 2025).
5. **S1094b no está en ninguna de las 51 Exploration Zones** (la más cercana, Acheron Fossae, queda a ~252 km; `recursos-y-ml.md`). El globo no puede sugerir que se «elige» S1094b entre las zonas.
6. **Color:** el HIDH asocia el azul con advisory [D] (HIDH 10.11.5.5), y los mapas de hielo van en azul. Hay que separarlos (sección 4).

## 2. Fase por fase

| Fase propuesta | Equivalente NASA (nombre real) | Qué ve o usa NASA | Cambios recomendados | Fuente |
| --- | --- | --- | --- | --- |
| **1. Site** | *Mission Definition*: sitio, prioridades, número de EVAs y restricciones operativas. Para Marte, *Exploration Zones* (EZ) del workshop de 2015 | Mapeo geológico, *Points of Interest* (POI) priorizados con la STM, Tabla 1 de restricciones por interesado | Título «Site assessment». Las 51 EZ como contexto («Exploration Zones (NASA 2015)»), y S1094b con otro símbolo y la etiqueta «Study site, outside EZs». Veredicto con **4 estados**: GO / CONDITIONAL / NO-GO / INSUFFICIENT DATA (el cuarto ya lo recomendó `viabilidad-expediciones.md`). CONDITIONAL siempre con su condición en texto («GO if radar first»). Acción: «Plan EVA 1 here» | Caswell y Kostak 2025, sec. III.A y Tabla 1 [D]; EZMars en `SOURCES.md` [D]; uso de «CONDITIONAL» en NASA [NV] |
| **2. Plan** | *Flight Operations Integration*: los POI se agrupan en *Stations* y las rutas entre estaciones y el módulo son *traverses*. El resultado es el *Traverse Map* | AEGIS (GIS de Artemis) con capas, estaciones, traverses y pines de peligro, más una **ruta de regreso al módulo desde la estación elegida, punteada en rojo**. AEGIS calcula los tiempos y la **cobertura de los objetivos de la STM** | Panel «Plan» con duración, distancia, walkback margin, bingo y **STM coverage** («Obj 1: 4/6 stations»). Panel «Flight rules», con límite y valor del plan lado a lado: duración, distancia máxima al hábitat, pendiente, **tiempo sin línea de vista**, consumibles, cada uno con `assumption` donde corresponda. Tus tres chequeos ya son restricciones de NASA; sumá **lighting** (ángulo solar y sombras) a la ventana. En el mapa, la walkback route punteada desde la estación elegida. En el timeline, **Get Aheads** y **deletion order** marcados. Acción: «Review EVA products» | Caswell y Kostak 2025, Tabla 1 y Fig. 4 [D]; Elston et al. 2025 [D]; Kagey p. 11 [D] |
| **3. Rehearse** | *Creation of Final Products* y, el día de la EVA, *pre-EVA review*. Productos: Traverse Map, **Crew Map Book**, EVA Procedures, **Cuff Checklist** y Flight Rules | Map Book impreso: traverses, cobertura de comunicaciones, pendientes, iluminación prevista, mapas geológicos y POI. Cuff checklist de ~10×10 cm: sobre todo procedimientos de emergencia del traje, más resúmenes de acciones y tiempos por estación que remiten al Map Book. Briefing Package y Cribsheet | Renombrar la fase a **«Brief»** (o dejar «Rehearse» con el subtítulo «Pre-EVA review»). Tres pestañas: **Map Book** (el 3D del DTM con salto a cada estación, más pendiente, comunicaciones e iluminación), **Cuff checklist** imprimible (una página por estación con PET objetivo, acciones de EV1 y EV2, y bingo) y **Cribsheet** (qué hacer si el radar falla, si se pierde la línea de vista o si llega un aviso de SPE). Una marca visible de modo **SIM** mientras se ensaya. Acción: **«Go for EVA»**, que arranca el PET | Caswell y Kostak 2025, sec. III.C [D]; Kagey p. 14 [D]; xEVA sec. 7.2.5 [D]; STD-3001 [V2 10153] [D] |
| **4. Execute (EV/IV)** | *Realtime operations*. En Marte, el **IV dirige la EVA in situ** y filtra lo que manda el Science Team, sobre todo por texto. Turno *Execute* del SER (Artemis) | Seguimiento de la posición sobre el mapa («Execution Mode» de AEGIS), estado del timeline **adelantado o atrasado** con margen de consumibles, decision log, registro jugada a jugada con hora, sample tracker y chat. En BASALT, ahora en línea sólida y latencia en punteadas | Barra fija: PET, walkback margin, próximo bingo, **ahead/behind** («+6 min behind») y la alerta de mayor nivel. Mostrar la latencia («OWLT 12 min») y un **decision log**. Pantalla de replan: «Accept replan» y «Keep nominal», con confirmación. Reemplazar «volver al hábitat» por recomendaciones con nombre: **«Bingo: begin walkback»** (margen bajo el umbral de caution), **«Recommend EVA TERMINATE»** (alerta de nivel warning, como un SPE de DONKI) y **«Large replan: IV decision»** para el cambio de más del 50 %, como advisory, no como orden de volver. El banner de vuelta dice **«EVA TERMINATE · walkback 22 min · PET 3:41»**. ABORT no lo emite IceWalk | xEVA sec. 8.1, 4.2.1.8, 7.2.9, 9.3 y 9.5 [D]; Edgar et al. 2025 [D]; Marquez 2019 (en `diseno-interfaz.md`) [D] |
| **5. Debrief** | *Post-EVA debrief* y turno de **Planning** entre EVAs, que evalúa el progreso científico y propone cambios para las EVAs siguientes. Lecciones aprendidas después de cada EVA | AEGIS para replanificar entre EVAs; avance de la STM; decision log; en la FOD, «Lessons Learned and Best Practices post each mission and EVA». Un cambio en una EVA arrastra cambios en las demás | «Debrief» está bien. Sumar **STM progress** (objetivos cubiertos contra pendientes), el **decision log** de la EVA (qué recomendó el planificador y qué decidió el IV) y el plan contra lo ejecutado (*as-run*). La curva de campaña encaja como vista de la campaña completa. Acción: **«Plan EVA 2»** (numerada) | Edgar et al. 2025 [D]; Eppler et al. 2013, D-RATS [D]; Kagey p. 9 [D]; Caswell y Kostak 2025, sec. III.B [D] |

**Roles en pantalla.** En Marte, el IV hace de «IV, Flight Director, partial EVA Officer, and partial BME» [D] (xEVA, sec. 8.1). En Artemis, el que habla con la tripulación desde MCC es el **Ground IV** y no CAPCOM [D] (Caswell y Kostak 2025). La ciencia está en el **Science Evaluation Room (SER)**, con el SMOR como backroom [D]. Para IceWalk: «IV» en el hábitat y «Science Team (Earth)» con latencia. Evitar «CAPCOM» y «Science Backroom»: son de Apollo (Eppler et al. 2013) [I].

## 3. Terminología

| Usar | En vez de | Nota |
| --- | --- | --- |
| **PET** (EVA elapsed time) | «Time», «clock», MET | El PET empieza cuando el traje pasa a baterías y termina con la escotilla cerrada y la represurización iniciada [D] (xEVA, sec. 7.2.7 y 7.2.9). La lista de siglas de xEVA dice «Phased Elapsed Time» y el texto, «phase elapsed time»: con «PET» alcanza |
| **Station**, **traverse**, **POI** | Waypoint, stop, path | Caswell y Kostak 2025 [D] |
| **Egress / ingress**, **cleanup** | Exit, enter | xEVA, sec. 7.2.7 y 7.2.9 [D] |
| **Bingo** (consumibles o tiempo) | Deadline, cutoff | «reaching a consumables bingo (limit)» [D] (xEVA, sec. 7.2.9); bingo times [D] (Stevens 2019) |
| **Walkback** / walkback margin | Return buffer | ICES-2026-127 (en `factibilidad.md`) [D] |
| **EVA TERMINATE** | «Return home», «go back», «abort» para algo que no es emergencia | TERMINATE: cortar el trabajo, juntar herramientas y volver; ABORT: emergencia [NV-prensa] (Spaceflight Now 2016, flight director R. Renfrew). Los dos términos aparecen en xEVA, sec. 9.3 [D] |
| **Get Aheads**, **deletion order** | Bonus tasks, optional | Kagey, p. 11 [D] |
| **Flight rules** | Rules, settings | Se acuerdan antes del vuelo y se pueden cambiar o renunciar con justificación, siempre con aprobación del Flight Director [D] (Caswell y Kostak 2025, sec. III.C.4) |
| **Go / No-Go** | OK / not OK | En las flight rules: «Go/No-Go, EVA duration, distance allowed, failure response» [D] (Kagey, p. 10). Que se haga un «go/no-go poll» antes del egress en Marte es [NV] |
| **Map Book**, **Cuff checklist**, **Cribsheet**, **Briefing package** | Guide, manual, cheat sheet | Kagey, p. 14; Caswell y Kostak 2025 [D] |
| **IV**, **EV1 / EV2**, **Science Team** | Operator, user, backroom | xEVA, sec. 8.1 [D] |
| **Advisory / Caution / Warning** (y Emergency) | Info, alert, danger, critical | STD-3001 [V2 10114]; HIDH tabla 10.9-1 [D] |
| **Recommended** + justificación | «AI decision», «the planner says» | La tripulación decide (`decisiones-nasa.md`); HIDH, tabla 10.13-3, regla 3: «Give reasons» [D] |
| **Habitat** | Lander, base | En Marte, xEVA usa *habitat* [D]; *lander* es de Artemis |

## 4. Reglas de display que aplican

Texto vigente de NASA-STD-3001 Vol. 2, cap. 10 (página actualizada el 2026-04-22) y HIDH, NASA/SP-2010-3407 Rev. 1 (2014), cap. 10. Todo [D] salvo donde se indica.

| Regla | Sección | Cómo se aplica en IceWalk |
| --- | --- | --- |
| «display area to simultaneously present all critical task information» | STD-3001 [V2 10037] | La barra con PET, walkback, bingo, ahead/behind y la alerta tope se ve en las 5 fases sin abrir nada. En Site y Plan muestra los valores planeados, rotulados «planned» |
| Interfaces «consistent in appearance, arrangement, location, and operation»; nomenclatura estandarizada | [V2 10005], [V2 10006] | El mismo id de estación, el mismo nombre de herramienta y la misma posición de la barra en todas las fases |
| Indicar el dato «stale, missing, unavailable, or unknown» | [V2 10020] | Antigüedad de DONKI y EMIRS («DONKI 3 h old»), «Illustrative» si `is_mock`, y celdas con solo prior marcadas como tales |
| Señal adicional cuando el color comunica algo crítico | [V2 10045]; HIDH 10.6.19 | Toda alerta lleva ícono, nombre del nivel y texto, nunca solo color |
| Unidades consistentes en cada valor numérico | [V2 10046] | «22 min», «0.74 km», «P(ice ≤ 3 m) 65 %» |
| Alertas priorizadas según la tabla 10.3-1; la de mayor prioridad se anuncia hasta que se reconoce (racional) | [V2 10175], [V2 10114] | Un solo lugar para la alerta tope, con «Acknowledge». La tabla 10.3-1 es una imagen y no se leyó [NV] |
| Confirmación antes de acciones críticas, peligrosas o irreversibles | [V2 10080] | Confirmar «Accept replan», «Go for EVA» y «EVA TERMINATE» |
| Comando explícito para pasar entre simulación, prueba y operación | [V2 10153]; HIDH 10.6.17 (modos, señalar cuál está activo) | Marca visible «SIM» en Rehearse y en la demo; el paso a Execute es un comando explícito («Go for EVA») |
| Indicación positiva de un control activado por la tripulación | [V2 10022] | Respuesta inmediata al registrar una medición, aunque el replan tarde |
| Etiquetas de 12 pt (0.4°) como mínimo | [V2 10066] | Tamaño mínimo para el texto de la barra y del mapa |
| Información necesaria y suficiente; lo suplementario, a pedido; mostrar dónde está el usuario en la jerarquía | HIDH 10.6.5, 10.6.2 | La barra de fases es ese indicador de posición. Lo secundario va en paneles plegables |
| La barra de estado muestra el estado actual y el avance en el tiempo | HIDH 10.6.15 | La barra superior lleva la fase y el estado de la EVA |
| Rojo reservado; evitar el efecto «Christmas tree»; un color, un significado | HIDH 10.6.19; 10.9.2.5.1 | Rojo solo para warning. La ruta y las estaciones, sin color |
| Convención: rojo = emergencia o warning; amarillo = caution; **azul = advisory («not recommended for general use»)**; blanco = advisory (solo en dispositivos transiluminados) | HIDH 10.11.5.5 (etiquetas; se traslada a pantalla por inferencia) | Hoy advisory es cian (`#5ac8f5`, DECISIONS 2026-11-08) y los mapas de hielo van en azul: **se pisan**. Opciones [I]: advisory en blanco o neutro con ícono «i» (HIDH lo admite), o mantener cian y llevar el mapa de hielo a un azul oscuro de luminosidad claramente distinta, sin usarlo nunca en chips de alerta. Decide Diseño |
| Clases de alarma: Emergency (1), Warning (2), Caution (3); caution = «heavier than normal consumable usage» | HIDH 10.9.1.1, tabla 10.9-1 | Un margen de walkback que cae más rápido de lo planeado es caution; superar un límite de seguridad predefinido es warning |
| Procedimiento electrónico: telemetría y timers dentro del paso, paso actual contra pasos hechos, integración con el timeline y con C&W | HIDH 10.10 | La cuff checklist digital en Execute marca el paso actual y muestra el PET y el bingo dentro de la página de la estación |
| Automatización: «Give reasons», ser predecible y dar un modelo conceptual | HIDH 10.13.2, tablas 10.13-2 y 10.13-3 | Cada recomendación del planificador lleva su porqué y el disparador con su número («margin 12 min < caution 15 min») |

## 5. Lo que no se pudo verificar

- **Definición oficial de TERMINATE contra ABORT.** xEVA usa los dos términos (sec. 9.1.1, 9.3 y 9.5) pero no los define. La diferencia (limpieza ordenada contra emergencia) sale de prensa especializada (Spaceflight Now, 2016) y de un foro. Las flight rules de la ISS y de Artemis (JSC-35191) no son públicas.
- **El «go/no-go poll» antes de una EVA planetaria**, y si NASA usa «CONDITIONAL» como estado. Kagey solo nombra «Go/No-Go» dentro de las flight rules.
- **El ConOps de EVA de superficie de Artemis III** como documento público: no se encontró. xEVA Con Ops deja «forward work» las secciones de Marte 8.2.1, 8.2.2 y 8.2.4 (road-to, prep y post-EVA).
- **Si NASA ensaya cada EVA en 3D o VR con la tripulación.** Caswell y Kostak mencionan pruebas en «field and Virtual Reality» del proceso, no un ensayo de la tripulación antes de cada EVA.
- **Las tablas 10.3-1 y 10.4-2 de STD-3001** (anuncio por tipo de alerta y parámetros visuales): son imágenes. Siguen sin fuente los colores oficiales por nivel de alerta en pantallas; lo de HIDH 10.11.5.5 es para etiquetas.
- Los PDFs de BASALT, NEEMO y JETT3 no se releyeron hoy: lo que se cita de ellos viene de `diseno-interfaz.md` y `decisiones-nasa.md`.

## 6. Preguntas agregadas

### A. Cómo muestra NASA probabilidad e incertidumbre en mapas de planificación

- **SWIM, equipo de NASA y PSI.** El mapa original combina cinco conjuntos de datos en un índice de «consistency» con el hielo a ~5 m [D] (Morgan et al. 2021; página de productos SWIM 1.0). La versión bayesiana de 2026 **separa los atributos en mapas distintos**: fracción de máxima verosimilitud, mediana, cotas de 1σ inferior y superior, probabilidad de exceso de hielo, y un mapa de **cambio respecto del estado sin información**. El texto dice que la mediana «must be interpreted alongside» las cotas de 1σ, y las zonas sin datos van en gris oscuro [D] (Courville et al. 2026, figs. 17-22). La rampa de color no se pudo leer [NV].
- **Mapa de peligros de Jezero (Mars 2020).** Clases discretas: peligros en rojo y zonas más seguras en azul y verde, sobre la base HiRISE de 25 cm/px [D] (JPL PIA24167; USGS). No muestra una probabilidad continua. El «safe target map» con probabilidad por celda no se verificó [NV].
- **Coherencia de la propuesta** (grilla de 100 m, tamaño = P(hielo), relleno = hay datos locales, anillo vacío = solo prior, incertidumbre como niebla neutra):
  - **Coherente con NASA y con STD-3001** [I]. Separar P de «hay o no hay datos» es lo que hace Courville et al. 2026 (mapa de cambio contra el prior, gris donde no hay datos). El anillo vacío cumple [V2 10020] («unknown»). Tamaño y relleno son señales que no dependen del color [V2 10045].
  - **La grilla discreta de 100 m es honesta.** Es el alcance del prior del GP (`plans/web-design.md`) y evita sugerir una resolución que el modelo no tiene [I].
  - **No se encontró un estándar NASA mejor** para un punto con P e incertidumbre. La alternativa fundada sigue siendo VSUP (Correll et al. 2018, en `diseno-interfaz.md`).
  - **Riesgos** [I]: (1) el tamaño se lee por área: escalar el área, no el radio, con P y una leyenda numérica; (2) la niebla neutra no puede usar el gris de «sin datos» ni el de «stale»; (3) los puntos no pueden usar el azul de advisory (sección 4).

### B. Color del cielo de día con cámaras calibradas

- **Pathfinder (IMP, calibrada).** El cielo y el suelo tienen colores «identical to the Viking sites», «a predominantly yellowish brown color», y el cielo «reddens away from the Sun and toward the horizon» [D] (Maki et al. 1999, JGR 104(E4), resumen). El polvo da un tinte rojo que se acentúa hacia el horizonte al mediodía, y las sombras reciben luz difusa muy enrojecida [D] (Thomas et al. 1999, resumen).
- **Cerca del Sol, al atardecer:** brillo azulado por dispersión hacia adelante del polvo [D] (Ehlers et al. 2014, Applied Optics, resumen).
- **No hay un valor numérico citable verificado.** Las coordenadas de cromaticidad de Maki et al. 1999 estarían en el texto completo, que no se pudo abrir. Tampoco se verificaron valores de Pancam, Mastcam ni Mastcam-Z. Propuesta [I]: un degradé de marrón amarillento más claro cerca del Sol a uno más rojizo hacia el horizonte, con el hex marcado como `"assumption": true` en `SOURCES.md`.

## 7. Fuentes

- Kagey, J. (2024). *EVA Ops 101 for Artemis 3 External Teams*, NASA JSC FOD. https://ntrs.nasa.gov/api/citations/20240005248/downloads/EVA%20Ops%20101%20for%20Artemis%203%20External%20Teams.pdf
- Caswell, T. E. y Kostak, C. (2025). *EVA Development in Exploration-Driven Human Spaceflight*, AIAA ASCEND (NTRS 20250006988; el registro suma a K. Young). https://ntrs.nasa.gov/citations/20250006988
- NASA (2020). *Exploration EVA System Concept of Operations*, EVA-EXP-0042 Rev. B. https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf
- Edgar, L. A. et al. (2025). *Artemis Science Planning and Integration: Lessons Learned from the JETT5 Mission Simulation*, LPSC 56. https://ntrs.nasa.gov/api/citations/20250000177/downloads/AchillesArtemisAbstract.pdf
- Elston, J. T., Keller, J. R., Miller, M. J. et al. (2025). *Review of Advanced Informatics and Display Systems for EVA Operations*, IEEE Aerospace. https://ntrs.nasa.gov/api/citations/20250011652/downloads/IEEE-aero-lit-review-EVA-informatics_final.pdf
- Eppler, D. et al. (2013). *Desert RATS 2010 science operations*, Acta Astronautica. https://ntrs.nasa.gov/api/citations/20130014887/downloads/20130014887.pdf
- NASA-STD-3001 Vol. 2, cap. 10, Crew Interfaces (vigente). https://www.nasa.gov/reference/10-0-crew-interfaces-vol-2/
- NASA/SP-2010-3407 Rev. 1, *Human Integration Design Handbook* (2014). https://www.nasa.gov/wp-content/uploads/2015/03/human_integration_design_handbook_revision_1.pdf
- Spaceflight Now (2016-01-15). *Spacewalk terminated due to spacesuit water leak*. https://spaceflightnow.com/2016/01/15/spacewalk-terminated-due-to-spacesuit-water-leak/
- Courville, S. W. et al. (2026). *Subsurface Water Ice Mapping on Mars: A Probabilistic Approach*, PSJ 7. https://doi.org/10.3847/PSJ/ae8904
- Morgan, G. A. et al. (2021). Nature Astronomy 5, 230-236. https://doi.org/10.1038/s41550-020-01290-z ; SWIM 1.0: https://swim.psi.edu/NorthHemisProducts.php
- NASA/JPL, *Jezero's Hazard Map* (PIA24167). https://science.nasa.gov/photojournal/jezeros-hazard-map/
- Maki, J. N. et al. (1999). *The color of Mars: Spectrophotometric measurements at the Pathfinder landing site*, JGR 104(E4). https://doi.org/10.1029/98JE01767
- Thomas, N. et al. (1999). *The color of the Martian sky and its influence on the illumination of the Martian surface*, JGR 104(E4). https://doi.org/10.1029/98JE02556
- Ehlers, K., Chakrabarty, R. y Moosmüller, H. (2014). *Blue moons and Martian sunsets*, Applied Optics 53(9). https://profiles.wustl.edu/en/publications/blue-moons-and-martian-sunsets/
- Ya en `SOURCES.md`: BASALT (Beaton, Stevens, Payler, Marquez 2019), Zheng et al. 2023 (Playbook), ICES-2026-127, EZMars (Mars Trek).
