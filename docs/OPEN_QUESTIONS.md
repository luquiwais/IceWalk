# Cuestiones abiertas

Lo que falta decidir o averiguar. Al resolver algo, se saca de acá y se anota en [`DECISIONS.md`](DECISIONS.md).

## Decisiones

| # | Cuestión | Recomendación | Quién | Desde |
| --- | --- | --- | --- | --- |
| 23 | ¿Planificador acepta las ramas como puntos de decisión con opciones ordenadas? Incluye qué `result` lleva un radar que ve hielo a 1.5 m | Luqui aprobó llevarlo como propuesta: opción C recortada de `research/decisiones-nasa.md`. Falta persona en el rol | Planificador | 05/11 |
| 29 | ¿Cambia la pregunta del producto a "¿vale la caminata, con qué herramienta y adónde primero?", y el rol de la tripulación a delimitar el hielo y elegir dónde perforar? | Sí. Ver `research/viabilidad-expediciones.md` | Luqui + Producto | 08/11 |
| 30 | ¿Se cambian el espectrómetro y el radar por observaciones blandas en `observations.py`? | Sí: hoy son las más sobreconfiadas | Luqui | 08/11 |
| 36 | ¿Se corrige `layers.yaml` con lo de `research/recursos-y-ml.md`? SWIM se puede bajar por script, la URL de THEMIS es exacta, y los productos individuales de SWIM no aparecen en la página citada | Sí, en un solo cambio | Luqui | 08/11 |
| 37 | ¿Hay imágenes HiRISE posteriores a feb 2023 con el cráter cubierto? El STAC de USGS lista 13 más; falta mirar cuáles tienen píxeles | Revisarlas: sirven para visión | Visión | 08/11 |
| 38 | El PRD pide la pendiente máxima "desde el DTM de 1 m". ¿Se actualiza a base de 10 m? | Sí: a 1-2 m domina el ruido del DTM. Ver `EXPERIMENTS.md`, 2026-11-08 (planificador) | Luqui + Planificador | 08/11 |
| 39 | ¿Se suma el costo metabólico (Pandolf con gravedad, ec. 7 de ICES-2025-129)? Faltan masa corporal, masa del traje y carga, y coeficiente de terreno para Marte, todos sin fuente | Sí, como estimación declarada en el plan; la ruta sigue minimizando tiempo | Planificador | 08/11 |
| 41 | ¿Se fija en `plan.schema.json` qué son `uncertainty` (entropía en bits), `value` (el de `gp.planning`, en [0, 1]) y los campos nuevos de estación (`kind`, `depth_median_m`, `depth_shallow_m`)? | Sí, en un PR de contrato junto con la cuestión 33 | Planificador + Luqui | 08/11 |
| 43 | Con el hábitat por defecto en (300, -2200), los objetivos fijos del objetivo 3 junto al cráter (a ~2.2 km) dejan entrar 1 de 4 estaciones de hielo. ¿Se mueve el hábitat, o los objetivos fijos pasan a otra EVA? | Revisar con Producto: la demo queda con poco muestreo | Luqui + Planificador | 08/11 |
| 33 | ¿Corregimos el catálogo de herramientas (`measures`, análogos NSS y ALSD, masas, resolución del radar)? | Sí, en un PR de contrato | Todos | 08/11 |
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

## Riesgo aceptado

La FAQ prohíbe empezar antes del evento; el equipo decidió seguir. No se retoca el historial.
