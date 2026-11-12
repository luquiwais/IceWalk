# Cuestiones abiertas

Lo que falta decidir o averiguar. Al resolver algo, se saca de acá y se anota en [`DECISIONS.md`](DECISIONS.md).

## Decisiones

| # | Cuestión | Recomendación | Quién | Desde |
| --- | --- | --- | --- | --- |
| 29 | ¿Cambia la pregunta del producto a "¿vale la caminata, con qué herramienta y adónde primero?", y el rol de la tripulación a delimitar el hielo y elegir dónde perforar? | Sí. Ver `research/viabilidad-expediciones.md` | Luqui + Producto | 08/11 |
| 36 | ¿Se corrige `layers.yaml` con lo de `research/recursos-y-ml.md`? SWIM se puede bajar por script, la URL de THEMIS es exacta, y los productos individuales de SWIM no aparecen en la página citada | Sí, en un solo cambio | Luqui | 08/11 |
| 37 | ¿Hay imágenes HiRISE posteriores a feb 2023 con el cráter cubierto? El STAC de USGS lista 13 más; falta mirar cuáles tienen píxeles | Revisarlas: sirven para visión | Visión | 08/11 |
| 38 | El PRD pide la pendiente máxima "desde el DTM de 1 m". ¿Se actualiza a base de 10 m? | Sí: a 1-2 m domina el ruido del DTM. Ver `EXPERIMENTS.md`, 2026-11-08 (planificador) | Luqui + Planificador | 08/11 |
| 39 | ¿Se suma el costo metabólico (Pandolf con gravedad, ec. 7 de ICES-2025-129)? Faltan masa corporal, masa del traje y carga, y coeficiente de terreno para Marte, todos sin fuente | Sí, como estimación declarada en el plan; la ruta sigue minimizando tiempo | Planificador | 08/11 |
| 44 | Con valor por minuto, las 6 estaciones de hielo quedan a menos de 220 m del hábitat. ¿Se pide una separación mínima mayor para cubrir más terreno (la hipótesis del objetivo 1 habla de 100-300 m)? | Probar en la demo y decidir con Producto; hoy la separación mínima es 50 m (supuesto) | Luqui + Planificador | 08/11 |
| 34 | ¿Cómo explicamos que Sizemore 2026 publique 97 cm para S1094b y nosotros una mediana de 2.35 m? | Sus 97 cm son los fondos planos; preparar la respuesta para el jurado | Luqui | 08/11 |
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
| 49 | ¿Mapa por defecto con supresión de valor por incertidumbre (VSUP), en un tono sin significado de alerta? | Sí; probar índigo o violeta contra HiRISE (§5.1) | Diseño + GP | 09/11 |
| 50 | ¿El antes/después de la demo pasa a ser local (~200 m alrededor de la medición) + puntos confirmados? | Sí: la incertidumbre del sitio entero casi no baja (§7) | Luqui + GP | 09/11 |
| 51 | ¿`tool_assessment` (rendimiento por herramienta) en el plan o como endpoint aparte? | Bloque aditivo o endpoint, sin tocar `/replan` (§3.2) | Planificador + GP | 09/11 |
| 52 | ¿Quién sirve los rasters de `/maps` (hoy `pending`) y cuándo? | Antes del congelamiento del 12/11 | GP + Planificador | 09/11 |
| 54 | ¿El radar va en la ruta y en «Which tool?», o como herramienta de estación? En los mocks todas las estaciones usan el taladro | En la ruta, coherente con DECISIONS | Planificador | 09/11 |
| 55 | ¿Qué umbrales de walkback margin disparan caution y warning? (el re-plan deja 2.2 min sin alerta) | Declararlos como supuestos en la STM | Planificador + Producto | 09/11 |
| 56 | La web dice «S1094b · Arcadia Planitia» y el PRD ubica S1094b en Amazonis Planitia (Arcadia es el plan B, Erebus Montes). ¿Cuál es? | Verificar con la fuente del catálogo; mientras tanto la web muestra solo el id y las coordenadas | Luqui | 10/11 |
| 57 | El hábitat por defecto (300, −2200) coincide con la estación 1 (E03S22), con traverse de 0 min. ¿Es lo esperado? | Revisar con Planificador; la web desplaza el marcador para que se vean los dos | Planificador | 10/11 |
| 59 | ¿El planificador real puede devolver un plan sin estaciones? Hoy el cliente web lo rechaza como respuesta inválida | Si puede, la web necesita un estado vacío | Planificador | 10/11 |

## A averiguar

| # | Cuestión | Quién |
| --- | --- | --- |
| 26 | ¿Qué licencia tiene la tabla de Dundas 2023? Hasta saberlo, no se sube a Git | GP |
| 12 | ¿Tusberti comparte los polígonos de bloques y hielo? | Visión |
| 13 | VRAM, CUDA y uso prolongado del servidor con GPU | Luqui |
| 14 | ¿Hay imágenes HiRISE posteriores a feb 2023 con el cráter cubierto? | Visión |
| 15 | ¿Mars Climate Database tiene acceso y licencia compatibles? | Planificador |
| 16 | Cómo evalúa el jurado local | Producto |
| 17 | Criterios y guías 2026 (salen el 13 nov) | Producto |
| 18 | ¿Diciembre de 2022 tiene escarcha? | Visión |
| 19 | Sincronizar el PRD del repo con el doc de claude.ai | Luqui |
| 20 | Revisión de un experto externo (Space Apps Connect) | Producto |
| 40 | ¿Las manchas de pendiente > 20° sueltas en el SE del sitio son relieve o artefactos del DTM (cajas, costuras)? Revisar el mapa FOM (`DTF...JP2`) y el relieve sombreado | Planificador |
| 42 | Catálogo de cráteres (`data/processed/s1094b/craters_dundas2023.csv`) para el planificador: sin él, el mapa es solo el prior y la elección de estaciones casi no informa. ¿Luqui lo comparte por fuera de Git (licencia, cuestión 26)? | Planificador + Luqui |
| 45 | Textura del globo y del sitio: hoy el respaldo es Viking MDIM 2.1 (232 m/px, imágenes de los 70) y a escala del sitio se ve borroso. ¿Qué sirve el backend como teselas (mosaico CTX de Murray Lab ~5 m/px para el globo/región, ortoimagen HiRISE para el sitio) y con qué URL/formato las consume `MarsGlobe`? | Datos + backend (Frontend solo consume) |
| 46 | En los mocks, el re-plan tras "sin hielo" en E03S22 baja el margen mínimo de regreso de 33 a 2.2 min y suma 31 min; y `expected_uncertainty_reduction` es 0 en los dos planes. ¿Es lo esperado o un problema del planificador? | Planificador |

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
