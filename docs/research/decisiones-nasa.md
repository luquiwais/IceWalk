# Investigación: cómo decide NASA según el resultado de una medición

Última actualización: 2026-11-05. La hizo un agente de literatura. Se comprobó contra los textos descargados solo una parte de las citas: Get Aheads, ramas de contingencia y kriging en VIPER, 1-3 respaldos, "replanning is expected", "advisory only" y Minerva. El resto va como lo informó el agente.

**Pregunta:** ¿las ramas `ice` / `no_ice` de `plan.schema.json` alcanzan, o NASA opera de otra forma?

**Etiquetas:** [D] documentado, [I] inferencia, [NV] no verificado.

## Respuesta corta

- NASA mezcla un plan nominal muy preparado, prioridades y límites duros fijados antes, y ajuste en vivo. **No se encontraron árboles "si da X, ir a Y" a nivel de EVA** (búsqueda acotada a lo que se abrió).
- La estructura típica es una lista ordenada que se reordena con cada dato (leaderboard), con Get Aheads si sobra tiempo, borrado por prioridad si falta, y plazos (bingo times).
- Los resultados científicos se juzgan contra la STM, con criterio experto. Los umbrales numéricos están en seguridad y en los criterios de éxito.
- La tripulación decide en táctica; con latencia, la Tierra asesora. La seguridad y el regreso a pie no se negocian.
- VIPER no dispara el taladro con una lectura. Replanifica con kriging, pero ese plan no voló.

## Hallazgos

| Práctica | Fuente | Qué implica para IceWalk |
| --- | --- | --- |
| [D] Plan nominal con variación justificada | Kagey 2024, p. 11; Eppler | La rama es una previsualización; `/replan` es lo real |
| [D] Get Aheads y borrado por prioridad | Kagey 2024, p. 11 | Dos listas derivadas del valor de medir |
| [D] Leaderboard reordenable, top 3-5 | Stevens 2019; Payler 2019 | Opciones ordenadas en vez de árbol |
| [D] Lo incierto sube de prioridad para medir | Stevens 2019 | Respalda el valor de medir |
| [D] 1-3 respaldos por estación | Lim 2024, p. 2 (VIPER) | Tope de opciones; traslado a EVA [I] |
| [D] Bingo times | Stevens 2019; Marquez 2019 | Hora límite en cada decisión |
| [D] Sin respuesta a tiempo, sigue la prioridad propia | Stevens 2019 | Toda decisión lleva opción por defecto |
| [D] La tripulación decide; el soporte asesora | Beaton 2019, Tabla 3; xEVA p. 119 | "Recommended", nunca una orden |
| [D] Justificación obligatoria | Broddrick 2024; Stevens 2019 | Campo `rationale` |
| [D] Regreso a pie como límite duro | ALSJ Apollo 17; Kagey p. 10 | Hard stop aparte del valor científico |
| [D] Criterios previos con permiso de desviarse | Heldmann 2015 (MVP) | Reglas visibles, override del IV |
| [D] Kriging táctico para ganar información | Ennico-Smith 2023 (VIPER) | Respaldo para el GP; también resta novedad |
| [D] Calidad del dato y repetición, como mejora pedida | Beaton 2019 (PMC6442237) | Estado de la medición, separado del resultado |
| [D] Ramas de contingencia, pero en el plan estratégico | Ennico-Smith 2023, p. 1 | El término existe, a otra escala |

**Límite importante:** en BASALT, Minerva no servía para replanificar la EVA en curso (Marquez 2019), así que la replanificación en vivo casi no se probó.

**Prospección:** en VIPER los instrumentos corren siempre, con tres perforaciones por estación y la tercera reubicable en vivo (Lim 2024). Resource Prospector encadena traverse con instrumentos, perforación y horno, sin umbral publicado. Un WEH de neutrones solo se traduce a agua suponiendo geoquímica uniforme (Elphic 2016).

**No trasladable de rovers:** el ciclo de un uplink por sol, y la espera, que en una tripulación gasta consumibles (Stevens 2019).

## Contradicciones con el repo

| Dónde | Dice | Lo que se encontró |
| --- | --- | --- |
| PRD, línea 88 | "Ramas precalculadas", citando Lim 2019 | El paper respalda leaderboards y timelines; no aparece "branch" |
| PRD, línea 33 | Las ramas reemplazan al equipo científico | BASALT y xEVA lo mantienen; conviene "complementa" [I] |
| PRD, línea 243 | "Una acción concreta" | Recomendación con justificación; decide la tripulación |
| PRD, línea 318 | Rama "volver por partículas" | No entra en `if_result` |
| `competencia.md` | "Sin precedente exacto" | Sigue en pie para EVA, pero VIPER usa kriging en un rover |

## Huecos del contrato

- `measurement` admite `inconclusive`, pero `if_result` no.
- `depth_m` significa profundidad con `ice` y alcance con `no_ice`, y el esquema no lo dice.
- `from_measurement` trata `depth_m: 0` como ausente y genera una cota al alcance total. **Error a corregir.**
- Una cota de 0.7 m no decide nada frente a 1 m, y un `ice` a 1.5 m no es hielo a ≤ 1 m.

Cualquier categoría derivada del umbral de la STM es decisión nuestra, con `"assumption": true`: ninguna fuente de NASA la fija.

## Opciones para las ramas

| Opción | Qué es | Respaldo | Cambio | Riesgo |
| --- | --- | --- | --- | --- |
| A | No cambiar el contrato | Débil | Solo documentar `depth_m` | Una cota corta se fuerza a "no"; lo no concluyente queda sin rama |
| B | Ampliar `if_result`: `ice_within_target`, `ice_below_target`, `no_ice_to_target`, `open`, `instrument_failed` | Parcial | Esquema, mock y mocks | Bajo, pero sigue siendo un árbol, y sin plazo ni opción por defecto |
| C | Puntos de decisión con opciones ordenadas, plazo, hard stop, opción por defecto, justificación, Get Aheads y orden de borrado | El más amplio; mezcla prácticas de EVA y de rover | Reemplaza `branches` en esquema, mock, tests y mocks; no se encontró uso en código web | Medio: depende de `simulate`, sin hacer |

**Recomendación del agente:** C recortada, con solo las dos primeras estaciones y hasta 3 opciones. B como repliegue. Sumar a `measurement` un `status: ok | degraded | failed`. Es criterio, no práctica de NASA. **Decisión pendiente:** cuestión 23.

## Sin verificar

- VIPER, Resource Prospector y Artemis III describen planes o simulaciones, no vuelos.
- No públicos o no hallados: SOPs de VIPER, flight rules de Artemis (JSC-35191), mission rules originales de Apollo.
- No se pudieron abrir: Klein 2007, Hodges y Schmitt 2011, Hörz 2013, Heldmann 2016, Miller 2016, Lunar Surface Procedures de Apollo 15.
- Sin revisar a fondo: JETT5, criterios de muestreo de Mars 2020, uso táctico de RIMFAX.
- "No se encontró" vale para lo que se abrió, no significa que no exista.

Fuentes con URL: ver `docs/SOURCES.md`.
