# Cuestiones abiertas

Lo que falta decidir o averiguar. Al resolver algo, se saca de acá y se anota en [`DECISIONS.md`](DECISIONS.md).

## Decisiones

| # | Cuestión | Recomendación | Quién | Desde |
| --- | --- | --- | --- | --- |
| 36 | ¿Se corrige `layers.yaml` con lo de `research/recursos-y-ml.md`? SWIM se puede bajar por script, la URL de THEMIS es exacta, y los productos individuales de SWIM no aparecen en la página citada | Sí, en un solo cambio | Luqui | 08/11 |
| 37 | ¿Hay imágenes HiRISE posteriores a feb 2023 con el cráter cubierto? El STAC de USGS lista 13 más; falta mirar cuáles tienen píxeles | Revisarlas: sirven para visión | Visión | 08/11 |
| 38 | El PRD pide la pendiente máxima "desde el DTM de 1 m". ¿Se actualiza a base de 10 m? | Sí: a 1-2 m domina el ruido del DTM. Ver `EXPERIMENTS.md`, 2026-11-08 (planificador) | Luqui + Planificador | 08/11 |
| 39 | ¿Se suma el costo metabólico (Pandolf con gravedad, ec. 7 de ICES-2025-129)? Faltan masa corporal, masa del traje y carga, y coeficiente de terreno para Marte, todos sin fuente | Sí, como estimación declarada en el plan; la ruta sigue minimizando tiempo | Planificador | 08/11 |
| 44 | Con valor por minuto, las estaciones se juntaban a menos de 220 m del hábitat. Desde el 14/11 el objetivo 1 reparte una estación por tercio de inercia térmica y el plan llega a 500 m (1.1 km de recorrido). ¿Alcanza o se pide además una separación mínima mayor? | Alcanza para la demo; la separación mínima sigue en 50 m (supuesto) | Luqui + Planificador | 08/11 |
| 27 | ¿Se mantiene el objetivo de hielo a ≤ 1 m? Con `0.2 × D` sería raro en el sitio: `P` ≈ 0.06, y ≈ 0.67 a ≤ 3 m | Mantener el umbral configurable y revisar la STM con el catálogo: el radar gana peso y el taladro de 1 m pierde | Luqui + Planificador | 05/11 |
| 28 | Un dato informa unos 100-200 m. ¿Cambia el mensaje de la demo y el valor de medir? | Sí: mostrar el alcance real, y que el mapa fuera de ese radio sea el prior | Luqui | 05/11 |
| 29 | El PRD dice React + Vite y la estructura vieja (`web/`, `planner/`, `model/`, `contracts/` en la raíz); ahora es Next.js + Bun y `apps/` + `packages/`. ¿Se actualiza el PRD (doc de claude.ai y copia del repo)? | Sí, en stack, arquitectura y repositorio | Luqui | 08/11 |
| 25 | ¿Se corrigen las 4 afirmaciones del PRD que no respalda la investigación de NASA? | Sí. Ver `research/decisiones-nasa.md` | Producto | 05/11 |
| 2 | ¿Un mapa solo para la tabla de hielo, o también para la capa masiva? | Tabla primero; masiva si hay tiempo. El núcleo ya arrancó solo con la tabla | Luqui | 04/11 |
| 3 | ¿Quién toma cada rol, y cuántas personas tiene cada uno? | Ver `docs/ROLES.md` | Equipo | 04/11 |
| 4 | ¿Se aceptan regla del pasillo y factibilidad de NASA? | Sí | Planificador | 04/11 |
| 5 | ¿Cambian la STM y el catálogo, dado que el espectrómetro casi no llega al hielo? | Sí: subir radar, revisar taladro y objetivo 1 | Planificador + GP | 04/11 |
| 21 | ¿Se elimina el rol de Datos, con cada dueño preparando sus capas? | Sí, con función de reproyección compartida. Ver `docs/ROLES.md` | Equipo | 04/11 |
| 6 | ¿Cambia el pitch a "motor para la campaña: robots primero, tripulación después"? | Sí | Producto | 04/11 |
| 7 | ¿Se suma PDF del plan de EVA? | Sí, si el ciclo ya anda | Producto | 04/11 |
| 8 | ¿Se recortan vista Science, segundo sitio, radar en marcha y voz? | Sí. Ojo: si el radar sube de importancia, revisar ese recorte | Producto | 04/11 |
| 9 | ¿Premio objetivo? | Best Use of Science | Producto | 04/11 |
| 48 | ¿Barra de estado arriba, igual en Planning, EV y Science (PET, walkback, bingo, alerta tope, mini-timeline)? | Sí (§2.2; NASA-STD-3001 V2 10005) | Frontend + Producto | 09/11 |
| 50 | ¿El antes/después de la demo pasa a ser local (~200 m alrededor de la medición) + puntos confirmados? | Sí: la incertidumbre del sitio entero casi no baja (§7) | Luqui + GP | 09/11 |
| 51 | ¿`tool_assessment` (rendimiento por herramienta) en el plan o como endpoint aparte? | Bloque aditivo o endpoint, sin tocar `/replan` (§3.2) | Planificador + GP | 09/11 |
| 53 | ¿La vista EV usa paneles sólidos aunque el estilo sea visionOS? | Sí, por legibilidad con luz extrema (§4.3) | Frontend | 09/11 |
| 54 | ¿El radar va en la ruta y en «Which tool?», o como herramienta de estación? En los mocks todas las estaciones usan el taladro | En la ruta, coherente con DECISIONS | Planificador | 09/11 |
| 59 | Ventana de EVA: ¿se aceptan los umbrales supuestos (Sol bajo 10°, aire p10 bajo −70/−100 °C, viento 15/25 m/s, polvo tau 1/2/4, 48 h tras un SEP, ±12 h de una CME)? Están en `apps/planner/config/eva_window.yaml` | Sí para la demo; revisarlos con un experto (cuestión 20) | Producto + Planificador | 11/11 |
| 61 | ¿Cómo llega el catálogo de bloques (`boulders.geojson`) a la web para las rocas 3D: `GET /boulders` del planificador (filtrado a la ventana del mapa) o archivo estático? Hoy la web no lo consume. Desde el 13/11 el catálogo real existe: 2808 objetos en la zona de la EVA, 1.2 MB | `GET /boulders` con la misma ventana que `GET /maps`, sin cambiar el contrato | Planificador + Frontend + Visión | 11/11 |
| 62 | El planificador usa `clear_path_width_m.tif` si existe, aunque sea mock (`vision.mock_layers` escribe en la misma carpeta y marca `is_mock` en los tags del COG). ¿Debe ignorarla o marcar el plan cuando `is_mock` es true? Desde el 13/11, `vision.run` no escribe sobre capas falsas y la capa real lleva `is_mock=false` en sus tags | Ignorarla y avisar en el log; mientras, visión genera los mocks en otra carpeta | Planificador | 11/11 |
| 63 | Deploy público para el jurado: no hay link. ¿Quién lo arma y dónde (web en Vercel, API en Render o Hugging Face Spaces)? Las capas del terreno van a Releases (CC0); el catálogo de cráteres, como archivo privado del servidor (cuestión 26). Sin esos datos, la API desplegada usa el planificador mock | Antes del 14/11; Frontend la web, Planificador la API. Ver `research/hackaton-2026.md` | Luqui + Planificador + Frontend | 11/11 |
| 64 | El guion del teaser y el pitch del PRD usan afirmaciones que ya no sostenemos ("decides where to measure", el número de la simulación, «We plan what to learn»). ¿Se reescriben alrededor de la tarjeta de sitio (taladro NO_GO, radar GO) y de los 97 cm frente a los 2.35 m? | Sí, antes de grabar; confirmar el formato con la guía del 13/11 | Luqui + Diseño | 11/11 |
| 65 | ¿Se sube la tabla original de Dundas 2023 (`data/raw/dundas2023_craters.csv`, sin modificar) a un Release público, con cita y licencia? CC BY-NC-ND 4.0 lo permite sin fines comerciales. Sirve para que el equipo regenere el catálogo sin pasarse archivos | Sí, con un `LICENSE-dundas2023.txt` al lado. Es publicar: lo decide Luqui | Luqui | 12/11 |
| 66 | El prior regional usa solo la latitud. En Arcadia (165-190°E) hay el doble de impactos con hielo que lo esperado, y Byrne et al. (2009) estiman hielo justo debajo de la zanja de Viking 2 (el prior da 1 % a 15 cm). ¿Se suma un término de longitud o de SWIM? Latitud + SWIM sobreajustaba (26 impactos con hielo) | Después del hackatón. Mientras, la tarjeta avisa con el control local (`nearby_impacts`) | GP | 12/11 |
| 68 | Darionautas no tiene canal privado en el Discord de la sede, que es por donde pasan los mentores. ¿Se pide en #equipos? | Sí, con nombre e integrantes, como hacen los demás equipos | Luqui | 14/11 |
| 69 | ¿Qué texto va en la declaración de IA de la entrega? (asistentes de código e investigación; la idea y las decisiones, del equipo) | Redactarla con la lista de herramientas y para qué se usó cada una | Luqui + Diseño | 14/11 |
| 70 | SkyFall (NASA) recibe propuestas de sitio hasta el 1/12/2026 (skyfall_lsw_input@jpl.nasa.gov; coordenadas, imagen HiRISE, trazabilidad). ¿Mandamos una con IceWalk (tarjeta en las 5 regiones, S1094b o AP-105) después del hackatón? Es enviar algo afuera: lo decide el equipo | Mencionarlo en el pitch como impacto inmediato; decidir el envío después del 15/11 | Luqui + equipo | 14/11 |
| 73 | ¿El planificador real puede devolver un plan sin estaciones? Hoy el cliente web lo rechaza como respuesta inválida | Si puede, la web necesita un estado vacío | Planificador | 10/11 |
| 74 | Verdad de terreno de visión (paso 2 del plan): faltan las etiquetas a mano. Sin ellas no hay F1 real del detector, y sus umbrales son supuestos elegidos a ojo. Los recortes ya están (`python -m vision.labels`) | Anotar `test_eva` y `test_ejecta` en QGIS (≥ 150 bloques, a ciegas), correr `python -m vision.evaluate labels` y recién ahí tocar umbrales, solo sobre `tune` | Visión (Guido) | 13/11 |
| 75 | Lejos del cráter, lo que el detector encuentra son sobre todo resaltos del terreno, no eyecta (305 objetos ≥ 1.5 m por km², sin caída con la distancia). ¿La web los dibuja como rocas 3D? | Dibujar solo `form: block` con `confidence` alta, y mostrar el resto como aviso de relieve; para la ruta, todos son obstáculo | Frontend + Visión | 13/11 |
| 76 | ¿Qué imagen manda en el catálogo? Febrero de 2022 (casi vertical) es más nítida y da entre 1.5 y 2.4 veces más detecciones que abril, que es la "última" y la que fija `last_seen_image` y la huella | Mantener abril como última (es el orden real de las fechas) y medir con las dos; revisarlo con las etiquetas | Visión | 13/11 |
| 79 | ¿Cuánto tiempo sin línea de vista al hábitat se tolera en una EVA? Artemis lo usa como restricción pero no publica el valor; usamos 15 min (supuesto) | Mantener 15 min y decirlo en la demo; buscar las flight rules de Artemis si aparecen | Planificador | 14/11 |
| 77 | Con bloques reales, la regla del pasillo no prohíbe ninguna celda en la zona de la EVA (mínimo 3.0 m contra 1.02 m): las rutas no cambian. ¿La capa entra además como costo (caminar más lento entre bloques) o queda como está? | Dejarla como está para la demo y mostrar los bloques en el mapa; un costo por densidad no tiene fuente | Planificador + Visión | 13/11 |

| 81 | La caja de detalle del 3D (y de la imagen de 25 cm) termina en y = −2650 y dos estaciones del plan están en −2700: en la caminata no se dibujan. ¿Se amplía la caja a −2800 regenerando `build-site-imagery.py` y `build-site-3d.py`? | Sí, cuando haya red para bajar la ventana de RED_A | Frontend | 14/11 |
| 82 | Color natural del terreno: el IRB de 8 bits no sirve. ¿Se intenta con el COLOR RDR calibrado (I/F) de ESP_073077, registrado sobre el DTM? | Después del hackatón; mientras, gris | Frontend | 14/11 |
| 83 | El azul de los mapas de hielo y el cian de los avisos advisory se parecen (el HIDH 10.11.5.5 asocia azul con advisory). ¿Se cambia uno de los dos? | Decide Diseño; hoy los avisos llevan ícono y texto | Diseño | 14/11 |

## A averiguar

| # | Cuestión | Quién |
| --- | --- | --- |
| 56 | ¿Qué licencia tiene SWIM? La página no la declara. Hasta saberlo, no se redistribuyen los rasters ni los valores leídos (están en `data/raw/swim4mim/` y `data/processed/daubar2022/`, fuera de Git) | GP |
| 57 | El dataset de Dundas 2021 (USGS, CC0, [DOI 10.5066/P9Y8FR1R](https://doi.org/10.5066/P9Y8FR1R)) puede traer la profundidad del hielo por cráter, que daría fuente a la relación 0.1 del prior regional. ScienceBase pide una verificación anti-bots: bajarlo a mano desde el navegador | Luqui |
| 12 | ¿Tusberti comparte los polígonos de bloques y hielo? Desde el 13/11 importa más: contra sus totales damos ~25 % del conteo sobre 1.8 m y no se puede saber por qué sin comparar bloque por bloque | Visión |
| 13 | VRAM, CUDA y uso prolongado del servidor con GPU | Luqui |
| 14 | ¿Hay imágenes HiRISE posteriores a feb 2023 con el cráter cubierto? | Visión |
| 16 | Cómo evalúa el jurado local | Producto |
| 17 | Criterios y guías 2026 (salen el 13 nov). El 12/11 se leyó el enunciado oficial en el navegador (`research/hackaton-2026.md`); los recursos del desafío también salen el 13/11 | Producto |
| 18 | ¿Diciembre de 2022 tiene escarcha? | Visión |
| 78 | `SOURCES.md` cita «Densidad de bloques de S1094b, feb y dic 2022» como arXiv 2608.02492, pero ese identificador abre un artículo sobre rayos de cráteres en Marte y la Luna. ¿Cuál era la fuente? Hasta saberlo, esa fila no respalda nada | Quien la agregó |
| 19 | Sincronizar el PRD del repo con el doc de claude.ai | Luqui |
| 20 | Revisión de un experto externo (Space Apps Connect) | Producto |
| 60 | Temperatura y viento en el sitio y no en el análogo (VL2 a 48°N): ¿el modelo de Marte de NASA Ames (MCMC, datos públicos en `data.nas.nasa.gov/mcmcref`) trae salida diurna por hora? El portal avisaba problemas de almacenamiento | Planificador |
| 40 | ¿Las manchas de pendiente > 20° sueltas en el SE del sitio son relieve o artefactos del DTM (cajas, costuras)? Revisar el mapa FOM (`DTF...JP2`) y el relieve sombreado | Planificador |
| 42 | Catálogo de cráteres (`data/processed/s1094b/craters_dundas2023.csv`) para el planificador: sin él, el mapa es solo el prior y la elección de estaciones casi no informa. La licencia es CC BY-NC-ND 4.0 (cuestión 26, cerrada): el CSV convertido a la grilla es una adaptación y no se publica. Luqui lo pasa por privado al equipo y al servidor del deploy; quien tenga las imágenes HiRISE puede regenerarlo con `python -m gp.craters` desde la tabla original (cuestión 65) | Planificador + Luqui |
| 45 | Textura del globo y del sitio: hoy el respaldo es Viking MDIM 2.1 (232 m/px, imágenes de los 70) y a escala del sitio se ve borroso. ¿Qué sirve el backend como teselas (mosaico CTX de Murray Lab ~5 m/px para el globo/región, ortoimagen HiRISE para el sitio) y con qué URL/formato las consume `MarsGlobe`? | Datos + backend (Frontend solo consume) |

## Riesgo aceptado

La FAQ prohíbe empezar antes del evento; el equipo decidió seguir. No se retoca el historial.

## Frontend: pendientes de esta iteración (2026-11-09)

- **2026-11-10:** P0 hecho (PR #4, borrador). En curso: capa de datos de la API, revisión de código del bloque de motion y Etapa 1 del diseño nuevo (`plans/web-design.md`). El inventario de inputs del kit está en `log/2026-11-10.md`.
- **2026-11-11:** inputs implementados y verificados (163 tests UI en la recuperación). Diseño de Planning/EV/Science y globo en validación final; capa API ya presente. #58 resuelta con guard síncrono `busy`; #60 resuelta con instrumento asignado del catálogo y hora real al registrar (tests de integración). Ver `log/2026-11-11.md`.
- Motion vuelve a ser objetivo principal por pedido explícito de Eitan: investigar y reproducir la forma, deformación/óptica y continuidad del visionOS original; comprobar rendimiento, Safari real y Reduce Motion. Investigación vigente: `research/visionos-motion-fidelity-2026-11-11.md`. No se considera cerrado por los checks de la iteración anterior.
- Foco al montar una ventana que ya nace abierta: decisión UX consultada por Claude y aún sin respuesta; mantener mientras no se seleccione un cambio.
- #47 y #53 resueltos solo para la composición frontend de la demo por instrucciones de Eitan; registrados en DECISIONS. #48–55 restantes siguen siendo decisiones del equipo; los mocks no fijan reglas operacionales.
- **2026-11-12:** medidas 1:1 contra el kit oficial de iOS 27 en Figma: hace falta que Eitan duplique `figma.com/community/file/1651309003795292092` para leerlo con el MCP. Por ahora se sigue con HIG + WWDC + Fluid Kit.
- **2026-11-12:** playbook HIG iOS 27, Tailwind y Morph implementados y verificados en Chromium. Falta QA en Safari real (recorrido CUA interrumpido por cambio de ventana durante uso del usuario); pickers y teclado sí tienen pruebas en Chromium. Figma continúa pendiente según la entrada anterior.
