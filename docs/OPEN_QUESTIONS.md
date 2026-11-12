# Cuestiones abiertas

Lo que falta decidir o averiguar. Al resolver algo, se saca de acá y se anota en [`DECISIONS.md`](DECISIONS.md).

## Decisiones

| # | Cuestión | Recomendación | Quién | Desde |
| --- | --- | --- | --- | --- |
| 36 | ¿Se corrige `layers.yaml` con lo de `research/recursos-y-ml.md`? SWIM se puede bajar por script, la URL de THEMIS es exacta, y los productos individuales de SWIM no aparecen en la página citada | Sí, en un solo cambio | Luqui | 08/11 |
| 37 | ¿Hay imágenes HiRISE posteriores a feb 2023 con el cráter cubierto? El STAC de USGS lista 13 más; falta mirar cuáles tienen píxeles | Revisarlas: sirven para visión | Visión | 08/11 |
| 38 | El PRD pide la pendiente máxima "desde el DTM de 1 m". ¿Se actualiza a base de 10 m? | Sí: a 1-2 m domina el ruido del DTM. Ver `EXPERIMENTS.md`, 2026-11-08 (planificador) | Luqui + Planificador | 08/11 |
| 39 | ¿Se suma el costo metabólico (Pandolf con gravedad, ec. 7 de ICES-2025-129)? Faltan masa corporal, masa del traje y carga, y coeficiente de terreno para Marte, todos sin fuente | Sí, como estimación declarada en el plan; la ruta sigue minimizando tiempo | Planificador | 08/11 |
| 44 | Con valor por minuto, las 6 estaciones de hielo quedan a menos de 220 m del hábitat. ¿Se pide una separación mínima mayor para cubrir más terreno (la hipótesis del objetivo 1 habla de 100-300 m)? | Probar en la demo y decidir con Producto; hoy la separación mínima es 50 m (supuesto) | Luqui + Planificador | 08/11 |
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
| 47 | ¿Ventana de Planning anclada a la izquierda, cámara centrada en el área libre y modo Map focus? | Sí (`research/diseno-interfaz.md` §2.1) | Frontend | 09/11 |
| 48 | ¿Barra de estado arriba, igual en Planning, EV y Science (PET, walkback, bingo, alerta tope, mini-timeline)? | Sí (§2.2; NASA-STD-3001 V2 10005) | Frontend + Producto | 09/11 |
| 50 | ¿El antes/después de la demo pasa a ser local (~200 m alrededor de la medición) + puntos confirmados? | Sí: la incertidumbre del sitio entero casi no baja (§7) | Luqui + GP | 09/11 |
| 51 | ¿`tool_assessment` (rendimiento por herramienta) en el plan o como endpoint aparte? | Bloque aditivo o endpoint, sin tocar `/replan` (§3.2) | Planificador + GP | 09/11 |
| 53 | ¿La vista EV usa paneles sólidos aunque el estilo sea visionOS? | Sí, por legibilidad con luz extrema (§4.3) | Frontend | 09/11 |
| 54 | ¿El radar va en la ruta y en «Which tool?», o como herramienta de estación? En los mocks todas las estaciones usan el taladro | En la ruta, coherente con DECISIONS | Planificador | 09/11 |
| 59 | Ventana de EVA: ¿se aceptan los umbrales supuestos (Sol bajo 10°, aire p10 bajo −70/−100 °C, viento 15/25 m/s, polvo tau 1/2/4, 48 h tras un SEP, ±12 h de una CME)? Están en `apps/planner/config/eva_window.yaml` | Sí para la demo; revisarlos con un experto (cuestión 20) | Producto + Planificador | 11/11 |
| 61 | ¿Cómo llega el catálogo de bloques (`boulders.geojson`) a la web para las rocas 3D: `GET /boulders` del planificador (filtrado a la ventana del mapa) o archivo estático? Hoy la web no lo consume | `GET /boulders` con la misma ventana que `GET /maps`, sin cambiar el contrato | Planificador + Frontend + Visión | 11/11 |
| 62 | El planificador usa `clear_path_width_m.tif` si existe, aunque sea mock (`vision.mock_layers` escribe en la misma carpeta y marca `is_mock` en los tags del COG). ¿Debe ignorarla o marcar el plan cuando `is_mock` es true? | Ignorarla y avisar en el log; mientras, visión genera los mocks en otra carpeta | Planificador | 11/11 |
| 63 | Deploy público para el jurado: no hay link. ¿Quién lo arma y dónde (web en Vercel, API en Render o Hugging Face Spaces)? Las capas del terreno van a Releases (CC0); el catálogo de cráteres, como archivo privado del servidor (cuestión 26). Sin esos datos, la API desplegada usa el planificador mock | Antes del 14/11; Frontend la web, Planificador la API. Ver `research/hackaton-2026.md` | Luqui + Planificador + Frontend | 11/11 |
| 64 | El guion del teaser y el pitch del PRD usan afirmaciones que ya no sostenemos ("decides where to measure", el número de la simulación, «We plan what to learn»). ¿Se reescriben alrededor de la tarjeta de sitio (taladro NO_GO, radar GO) y de los 97 cm frente a los 2.35 m? | Sí, antes de grabar; confirmar el formato con la guía del 13/11 | Luqui + Diseño | 11/11 |

## A averiguar

| # | Cuestión | Quién |
| --- | --- | --- |
| 26 | ¿Qué licencia tiene la tabla de Dundas 2023? Hasta saberlo, no se sube a Git ni a un Release (el repo es público). El 11/11 no se pudo leer: Wiley responde 403 a la lectura automática y la copia de Imperial College da 404. Abrir la página del artículo en el navegador y mirar la licencia y el "Open Research" | GP |
| 56 | ¿Qué licencia tiene SWIM? La página no la declara. Hasta saberlo, no se redistribuyen los rasters ni los valores leídos (están en `data/raw/swim4mim/` y `data/processed/daubar2022/`, fuera de Git) | GP |
| 57 | El dataset de Dundas 2021 (USGS, CC0, [DOI 10.5066/P9Y8FR1R](https://doi.org/10.5066/P9Y8FR1R)) puede traer la profundidad del hielo por cráter, que daría fuente a la relación 0.1 del prior regional. ScienceBase pide una verificación anti-bots: bajarlo a mano desde el navegador | Luqui |
| 12 | ¿Tusberti comparte los polígonos de bloques y hielo? | Visión |
| 13 | VRAM, CUDA y uso prolongado del servidor con GPU | Luqui |
| 14 | ¿Hay imágenes HiRISE posteriores a feb 2023 con el cráter cubierto? | Visión |
| 16 | Cómo evalúa el jurado local | Producto |
| 17 | Criterios y guías 2026 (salen el 13 nov) | Producto |
| 18 | ¿Diciembre de 2022 tiene escarcha? | Visión |
| 19 | Sincronizar el PRD del repo con el doc de claude.ai | Luqui |
| 20 | Revisión de un experto externo (Space Apps Connect) | Producto |
| 60 | Temperatura y viento en el sitio y no en el análogo (VL2 a 48°N): ¿el modelo de Marte de NASA Ames (MCMC, datos públicos en `data.nas.nasa.gov/mcmcref`) trae salida diurna por hora? El portal avisaba problemas de almacenamiento | Planificador |
| 40 | ¿Las manchas de pendiente > 20° sueltas en el SE del sitio son relieve o artefactos del DTM (cajas, costuras)? Revisar el mapa FOM (`DTF...JP2`) y el relieve sombreado | Planificador |
| 42 | Catálogo de cráteres (`data/processed/s1094b/craters_dundas2023.csv`) para el planificador: sin él, el mapa es solo el prior y la elección de estaciones casi no informa. ¿Luqui lo comparte por fuera de Git (licencia, cuestión 26)? | Planificador + Luqui |
| 45 | Textura del globo y del sitio: hoy el respaldo es Viking MDIM 2.1 (232 m/px, imágenes de los 70) y a escala del sitio se ve borroso. ¿Qué sirve el backend como teselas (mosaico CTX de Murray Lab ~5 m/px para el globo/región, ortoimagen HiRISE para el sitio) y con qué URL/formato las consume `MarsGlobe`? | Datos + backend (Frontend solo consume) |

## Riesgo aceptado

La FAQ prohíbe empezar antes del evento; el equipo decidió seguir. No se retoca el historial.
