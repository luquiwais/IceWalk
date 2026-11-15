# Layout: panel y mapa por fase

Investigación del 2026-11-14 sobre el problema que planteó Luqui: el panel de Plan tiene demasiado scroll, lo importante se pierde y todo está muy junto. Compara dos ideas: (a) primero el panel y, al aprobar, el mapa; (b) primero el mapa y, al aprobar, el panel. No cambia código. No repite lo de `diseno-interfaz.md` (HIG, Map focus, barra de estado, BASALT C3) ni lo de `flujo-ui-nasa-2026-11-14.md` (fases, STD-3001, terminología).

**Etiquetas:** [D] documentado (leído en la fuente), [I] inferencia nuestra, [NV] no verificado (buscador, fragmento o prensa).

## 1. Respuesta corta

**Conviene (a), con una corrección: el panel no tiene que achicarse según la fase, sino según la tarea.** Hay dos modos:

- **Revisar y decidir** (Plan antes de aprobar, revisión de un re-plan, Debrief). El panel es el foco y arriba muestra el veredicto sin scroll.
- **Seguir la ejecución** (Plan aprobado, consola del IV). El mapa y la línea de tiempo pasan al frente y el panel queda como una tarjeta de resumen sin scroll.

(b) tiene un punto a favor: el jurado tiene que ver el mapa primero. Eso ya lo resuelven Site (el globo) y la entrada a Plan con la ruta dibujada. Lo que no conviene de (b) es dar más peso al panel durante la ejecución: es justo cuando NASA pone el mapa y el plan contra lo ejecutado en primer plano (sec. 2).

**El scroll se resuelve con jerarquía, no con el ancho.** El contenido de Plan ocupa unos 1000 px y el área con scroll tiene unos 550 px a 1440×900: son unas dos pantallas [I, estimado a partir de `plan-panel.tsx` y `mission.css`]. Según NN/g, el 57 % del tiempo de lectura cae en la primera pantalla y el 74 % en las dos primeras [D]. Por eso arriba van el veredicto, los números y el botón de aprobar. El resto va en pestañas.

## 2. Qué hace NASA (planificar contra ejecutar)

| Herramienta | Cómo reparte el espacio | Revisión y ejecución | Fuente |
| --- | --- | --- | --- |
| **EMSS de JSC** (AEGIS, Maestro, CODA, EMSS Dashboard; Artemis) | AEGIS arma la EVA con paneles de composición: *EVA / Station / POI Composition*, *STM Coverage*, *Summaries*, *Map Presets*. El «Integrated EMSS Display» de ejecución lleva *EVA Plan vs As-Executed* sobre el mapa, una *Picture in Picture at broader scale*, la *Maestro Summary Timeline*, *Mission Summary*, *System Status* y el *PET* | Hay modos explícitos: Maestro tiene «Enter Edit Mode», «Follow Execution» y «Adjust Layout», y AEGIS tiene un «Real-Time Execution Mode». CODA deja elegir el layout y cargar presets | Miller et al. 2026, láminas 8, 10, 11 y 15 [D: rótulos de las láminas; las capturas no se vieron] |
| **Playbook** (Ames) | Una línea de tiempo con el estado de cada actividad. Para lo geoespacial se integra con xGDS, que muestra mapa, traverses y posición: «concurrently visualize timeline and geospatial information» | Muestra el estado de cada actividad (en ejecución, completada, abortada) durante la EVA | Marquez et al. 2021 [D] |
| **xGDS Planner** | Mapa interactivo del plan más una tabla de waypoints con notas para los operadores | Sin datos | Fragmento de buscador [NV] |
| **SUITS** | FY27: «The UI shall display a 2-dimensional map» con la ubicación de «live assets», más la lista de procedimientos por estación (requisitos 4a; ya no trae requisitos de LMCC). FY24: la LMCC tenía un minimapa 2D para «monitoring all human and scientific field assets» | La consola de tierra durante la EVA es un monitor de posición | FY27 [D]; FY24 [NV, el PDF da 404] |
| **MSLICE (MSL), ASTTRO (Mars 2020)** | No se encontró una descripción pública del layout. ASTTRO es la herramienta 3D para elegir blancos, y sus derivados públicos son una escena 3D y un mapa de la ruta | Sin datos | NASA Software Catalog; JPL 2021 [NV para el layout] |
| **Go/no-go poll** | El Flight Director recorre la sala y cada controlador responde go o no-go antes de un evento crítico | Es un paso discreto, con una lista de estados, que separa la revisión de la ejecución | Wikipedia «Flight controller» [débil]; para EVA planetaria sigue [NV] (ver `flujo-ui`) |

**Lectura [I].** NASA no achica el panel con cada fase: cambia de herramienta o de modo según la tarea. Para componer y revisar usa paneles de composición y resúmenes. Para seguir la EVA usa un display integrado donde manda el mapa (el plan contra lo ejecutado), acompañado de una línea de tiempo resumida, el PET y el estado. Es la idea (a) dicha con el vocabulario de NASA: *Edit* y *Follow Execution*.

## 3. Patrones de producto y qué dicen los estudios

| Patrón | Ejemplo | Evidencia | Uso en IceWalk |
| --- | --- | --- | --- |
| **Lista y mapa juntos y sincronizados** | Komoot: lista de waypoints a la izquierda, mapa y perfil de elevación; «H» oculta la barra lateral y «P», el perfil [D] | Baymard: es «crucial» mostrar lista y mapa «side by side»; el 70 % de los sitios arrancaba en lista sin mapa; filtrar en el mapa y no ver el cambio en la lista fue el problema más común; no meter el split view en un overlay [D] | Mantener la lista de estaciones junto al mapa, nunca en un modal. El hover sincronizado ya existe |
| **Panel colapsable o «hide interface»** | ArcGIS Map Viewer: dos barras con Expand/Collapse y «Hide interface» para «maximize space to work with the map» [D]. Google Maps: panel lateral y buscador ocultables [NV, prensa] | Es la norma en herramientas de mapa profesionales | Ya está Map focus. Sumar un atajo de teclado y la tarjeta compacta (sec. 4) |
| **Inspector contextual** | Felt: «The detail panel opens on the right when you select a layer or annotation»; la leyenda va a la izquierda y la tabla abajo [D] | Lo secundario se muestra a pedido (HIDH 10.6.5, ya citado) | La ficha de estación y la revisión del re-plan se abren como inspector y vuelven al resumen al cerrar |
| **Pestañas dentro del panel** | - | NN/g: sirven con «clear groupings» y con contenido de importancia desigual; lo que va fuera de la pestaña por defecto tiene que ser «supplemental rather than critical»; no sirven si hay que comparar entre pestañas; «The fewer tabs, the better»; rótulos de 1 o 2 palabras [D] | Tres pestañas: Stations, Checks y Gear. Los veredictos de los chequeos se comparan entre sí, así que van arriba, fuera de las pestañas |
| **Acordeones** | - | NN/g: en desktop sirven «where users will not need to access content under several accordions»; hay que permitir abrir varios a la vez; el contenido escondido se pasa por alto [D] | Solo dentro de la pestaña Checks, con varios abiertos a la vez |
| **Divulgación progresiva** | - | Nielsen: acertar con la división entre lo inicial y lo secundario; «beyond 2 disclosure levels typically have low usability» [D] | Dos niveles como máximo: pestaña y desplegable. Nada anidado más abajo |
| **Bottom sheet** | Apps móviles | NN/g: es para móvil; «aren't suited for displaying always needed information or tools»; el problema más grande es apilar varias hojas [D] | Solo en compacto (< 760 px), como ahora. No llevarlo al desktop |
| **Dashboard operativo** | - | NN/g: el dashboard operativo da información crítica rápido durante tareas con tiempo; el analítico pide «an at-a-glance, single-screen view» [D] | La tarjeta de ejecución entra completa en una pantalla, sin scroll |

## 4. Recomendación fase por fase (1440×900)

Medidas [I]: el ancho del panel no cambia el problema, que es de largo. Se queda en **400 px** (360 px entre 760 y 1100 px). La **tarjeta compacta** mide **320 px** y tiene alto automático. El **modo decisión** se ensancha a **440 px** solo en pantallas de 1280 px o más.

| Fase | Foco | Panel | Arriba, sin scroll | Pestañas o desplegables | Al aprobar o decidir |
| --- | --- | --- | --- | --- | --- |
| **Site** | Globo y vuelo | 400 px; casi siempre entra sin scroll | Pregunta, veredicto (P(ice ≤ 3 m) con la herramienta que llega) y «Plan EVA 1 here» | «Why this site» y fuentes, en un desplegable | - |
| **Plan, revisión** | Panel (el mapa muestra la ruta detrás) | 400 px | Veredicto de go/no-go en una línea con tres chips (Walk · Window · Comms, con nivel y texto); los 4 números (Duration/limit, walkback, bingo, distance); el objetivo de la EVA (segmented control); **«Approve plan»** fijo al pie del panel | Pestañas **Stations** (por defecto, con el motivo de cada una), **Checks** (los 3 chequeos en desplegables que se abren a la vez) y **Gear** (equipo, masa, modelo y supuestos). Se va la franja de estado duplicada: en Plan, sus números ya están en el bloque de arriba | Confirmación (STD-3001 [V2 10080]) y pasa al modo seguimiento |
| **Plan aprobado** | **Mapa y línea de tiempo** (abierta por defecto) | Tarjeta compacta de 320 px | «Plan approved · EVA 1», los 4 números, los 3 chips, «Brief the EVA» y «Edit plan» (reabre la revisión y anula la aprobación) | Tocar una estación abre su ficha como inspector; al cerrarla vuelve la tarjeta | - |
| **Brief** | Escena 3D | Tarjeta compacta | Estación actual, saltos a cada estación y **«Go for EVA»** con confirmación | Cuff checklist y cribsheet como enlaces | Arranca el PET |
| **EVA, consola del IV** | **Mapa** (plan contra lo ejecutado y posición del EV) | Tarjeta compacta | PET, ahead/behind, walkback, bingo, próxima estación y última medición | Decision log, en un desplegable | **Llega un re-plan:** el panel pasa a modo decisión de 440 px, con el diff, «Accept replan», «Keep nominal» y «EVA TERMINATE». Al decidir vuelve a la tarjeta |
| **EVA, casco** | Pantalla completa (ya decidido) | - | - | - | - |
| **Debrief** | Panel (análisis) y mapa con «What measuring changed» | 440 px | Avance de la STM, mediciones contra lo esperado y **«Plan EVA 2»** | Pestañas **Summary**, **Stations** y **Log** | - |

**Para el jurado [I].** La aprobación se vuelve un momento visible de la demo: el panel se repliega, la ruta y la línea de tiempo pasan al frente y el veredicto sigue en la tarjeta. Se entiende sin explicación, y el usuario técnico conserva los números reales.

## 5. Boceto de Plan

```
ANTES DE APROBAR (revisar)                       DESPUÉS DE APROBAR (seguir)
┌ 1 Site  2 Plan  3 Brief  4 EVA  5 Debrief ───┐  ┌ 1 Site  2 Plan  3 Brief  4 EVA  5 Debrief ───┐
│                          ┌ Where do we go? ─┐ │  │                               ┌ Plan approved┐│
│     (mapa: ruta y        │ GO · 3 checks    │ │  │      ②────③                   │ EVA 1 · GO   ││
│      estaciones,         │ [Walk GO][Window │ │  │   ①─┘     │    (mapa con     │ 5:51 / 8:00  ││
│      tenue)              │  GO][Comms CAUT.]│ │  │   ⌂       ④──⑤  foco, ruta   │ Walkback 33  ││
│                          │ 5:51/8:00  0.74km│ │  │                  resaltada)   │ Bingo 3:10   ││
│                          │ Walkback 33 min  │ │  │                               │ [W][Wi][C]   ││
│                          │ Bingo 3:10 E03S22│ │  │                               │ Brief the EVA││
│                          │ Goal [Learn|Conf]│ │  │                               │ Edit plan    ││
│                          │[Stations|Checks| │ │  │                               └──────────────┘│
│                          │  Gear]           │ │  │ ┌ Timeline (abierta) ─────────────────────────┐│
│                          │ ① E03S22 65 % …  │ │  │ │ egress ▕S1▏▕S2▏▕S3▏▕S4▏ walkback ╲___ bingo  ││
│                          │ ② E04S22 …   ↕   │ │  │ └─────────────────────────────────────────────┘│
│                          │ [ Approve plan ] │ │  └───────────────────────────────────────────────┘
└──────────────────────────┴──────────────────┴─┘   panel 320 px, sin scroll; ficha = inspector
  panel 400 px: lo de arriba entra sin scroll; solo la lista de la pestaña desplaza
```

## 6. Riesgos

- **Aprobar no puede cerrar puertas.** Las fases nunca se bloquean (`phases.tsx`). «Edit plan» siempre a mano, y si la estrategia cambia después de aprobar, la aprobación se cae con un aviso [I].
- **«Approve plan» y «Go for EVA» son dos actos distintos.** El primero da por bueno el plan; el segundo es el poll antes del egress (en Brief). Sin esa separación, el botón repite lo que hace Brief [I].
- **La franja de estado.** Sacarla en Plan, antes de aprobar, va contra [V2 10037] solo si los números no quedan arriba. La propuesta los deja arriba, en un solo lugar [I].
- **No se probó con usuarios.** Las medidas en px son inferencias. Conviene medir con una captura que el bloque de arriba entre a 1440×900 y a 1024×768.

## 7. Lo que no se pudo verificar

- **Las capturas de EMSS y AEGIS:** solo se leyeron los rótulos de las láminas, extraídos del PDF. La posición real de cada zona no se vio.
- **El layout de MSLICE y ASTTRO:** no hay descripción pública. El de xGDS Planner sale de un fragmento de buscador.
- **Los requisitos de la LMCC de SUITS FY24:** el PDF da 404. FY27 ya no trae LMCC.
- **El go/no-go poll antes de una EVA planetaria** (sigue abierto, como en `flujo-ui`). La descripción del poll sale de Wikipedia.
- **El panel colapsable de Google Maps:** solo prensa. Strava y Mapbox Studio no se revisaron.
- **Los estudios completos de Baymard** son pagos; se leyó el artículo público.

## 8. Fuentes

- Miller, M. et al. (2026). *Continuing Development and Enabling of Exploration Mission Systems Software*, IEEE Aerospace. https://ntrs.nasa.gov/api/citations/20260001893/downloads/IEEE_2026_EMSS_Paper.pdf
- Marquez, J. J. et al. (2021). *Playbook* (resumen para analogs). https://ntrs.nasa.gov/api/citations/20210014304/downloads/marquez-playbook_submitted.pdf
- xGDS (NASA Ames). https://software.nasa.gov/software/ARC-17174-1 ; https://longhorizon.org/trey/papers/deans13_xgds_isru.pdf
- NASA SUITS FY27 Mission Description. https://www.nasa.gov/wp-content/uploads/2026/08/fy27-nasa-suits-mission-description.pdf ; FY24 (404): https://nasa.gov/wp-content/uploads/2023/09/fy24-suits-mission-description.pdf
- MSLICE. https://software.nasa.gov/software/NPO-45908-1 ; ASTTRO (JPL 2021). https://www.jpl.nasa.gov/news/take-a-3d-spin-on-mars-and-track-nasas-perseverance-rover/
- Wikipedia, *Flight controller*. https://en.wikipedia.org/wiki/Flight_controller
- Fessenden, T. (2018). *Scrolling and Attention*, NN/g. https://www.nngroup.com/articles/scrolling-and-attention/
- Sunwall, E. (2024). *Tabs, Used Right*, NN/g. https://www.nngroup.com/articles/tabs-used-right/
- Wang, H.-H. (2023). *Accordions on Desktop*, NN/g. https://www.nngroup.com/articles/accordions-on-desktop/
- Nielsen, J. (2006). *Progressive Disclosure*, NN/g. https://www.nngroup.com/articles/progressive-disclosure/
- Laubheimer, P. (2023). *Bottom Sheets*, NN/g. https://www.nngroup.com/articles/bottom-sheet/
- Laubheimer, P. (2017). *Dashboards: Making Charts and Graphs Easier to Understand*, NN/g. https://www.nngroup.com/articles/dashboards-preattentive/
- Collins, S. (2022). *The Optimal Layout for Hotel & Property Rental Search Results*, Baymard. https://baymard.com/blog/accommodations-split-view
- Komoot, Route planner help. https://www.komoot.com/help/routeplanner
- Esri, *Get started with Map Viewer*. https://doc.esri.com/en/arcgis-online/latest/get-started/get-started-with-mv.html
- Felt, *Tour the interface*. https://help.felt.com/getting-started/tour-the-interface
- Google Maps, panel ocultable (prensa). https://www.seroundtable.com/amp/google-maps-collapsable-search-box-21027.html
- Ya citadas en el repo: NASA-STD-3001 [V2 10037] y [V2 10080]; HIDH 10.6.5; Marquez et al. 2019 (BASALT C3); xEVA Con Ops 4.3.2.
