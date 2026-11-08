# Cuestiones abiertas

Lo que falta decidir o averiguar. Al resolver algo, se saca de acá y se anota en [`DECISIONS.md`](DECISIONS.md).

## Decisiones

| # | Cuestión | Recomendación | Quién | Desde |
| --- | --- | --- | --- | --- |
| 23 | ¿Planificador acepta las ramas como puntos de decisión con opciones ordenadas? Incluye qué `result` lleva un radar que ve hielo a 1.5 m | Luqui aprobó llevarlo como propuesta: opción C recortada de `research/decisiones-nasa.md`. Falta persona en el rol | Planificador | 05/11 |
| 27 | ¿Se mantiene el objetivo de hielo a ≤ 1 m? Con `0.2 × D` sería raro en el sitio: `P` ≈ 0.06, y ≈ 0.67 a ≤ 3 m | Mantener el umbral configurable y revisar la STM con el catálogo: el radar gana peso y el taladro de 1 m pierde | Luqui + Planificador | 05/11 |
| 28 | Un dato informa unos 100-200 m. ¿Cambia el mensaje de la demo y el valor de medir? | Sí: mostrar el alcance real, y que el mapa fuera de ese radio sea el prior | Luqui | 05/11 |
| 29 | El PRD dice React + Vite para la web; el frontend pasó a Next.js + Bun. ¿Se actualiza el PRD (doc de claude.ai y copia del repo)? | Sí, en la sección de stack y arquitectura | Luqui | 08/11 |
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

## Riesgo aceptado

La FAQ prohíbe empezar antes del evento; el equipo decidió seguir. No se retoca el historial.
