# Auditoría de UX contra criterios NASA (15/11)

Recorrido de las 5 fases a 1280 × 551 (la ventana de Luqui) con la API real (`plan-e479d180`), incluidos los desplegables, la cuff checklist y el texto de los estados de la EVA (leídos en el código). La vara es `flujo-ui-nasa-2026-11-14.md` y `diseno-interfaz.md` (STD-3001 Vol. 2 cap. 10, HIDH cap. 10, xEVA Con Ops, Caswell y Kostak 2025, Bensch 2024). Opciones visuales: https://claude.ai/artifact/X8x7rQ9dgL9eCFRsCAwuD4

## Transversales

1. **Mismo dato, valores y nombres distintos** ([V2 10005], [V2 10006]). Margen de regreso: "Spare time to return 21 min" (Plan), "WALKBACK 257 min margin" (casco), "Margin 21 min" (IV), "Min walkback 20.6 min" (timeline). El 257 es el margen en la próxima estación y el 21 el mínimo del plan: los dos son correctos, pero nada los distingue. Bingo: 5:45 (panel, "First bingo", es el de E03S25) contra 5:48 (timeline y casco, el de E03S24); además se rotula "First bingo", "Bingo", "Leave by (bingo)" y "Decide by (bingo time)". Reloj: "PET" en el casco y "EVA clock" en el IV.
2. **No hay barra de estado fija** ([V2 10037], HIDH 10.6.15): los números críticos cambian de lugar en cada fase.
3. **Lo crítico abajo del pliegue a 551 px**: en Site, el botón para seguir está a tres scrolls; en Plan, los chips se cortan ("Habitat In Vi…") y la lista pasa por debajo del botón fijo; en el IV entran 3 números y un minimapa.
4. **El botón fijo "Approve plan" tapa las pestañas** con el timeline abierto: al tocar "Checks" se aprobó el plan sin querer.
5. **Rojo para algo que no es warning**: "No-go" de herramientas en Site (HIDH 10.6.19).
6. **"Go for EVA" sin confirmación** ([V2 10080]).
7. **Componentes fuera del estilo**: el visor del casco, el minimapa, la barra "EV1 · helmet view" y los rótulos del mapa de la tripulación usan monoespaciada y paneles cuadrados azules; la leyenda y el timeline tienen otro vidrio y otro radio; los créditos tapan el botón N.

## Por fase

- **Site**: el veredicto ("GO con GPR, 97 %") queda enterrado en un párrafo; los nombres de las herramientas se cortan; tres "Note" técnicas seguidas.
- **Plan**: el relato de la herramienta se contradice. Site dice taladro No-go (6 %) y radar GO; las 6 estaciones dicen "Powered hand core drill" y el GPR aparece solo en Gear ("measures while walking"). La ruta ocupa unos 150 px al lado de picos de 93 % y 92 % que no visita, y el porqué está solo en la lista ("Most uncertainty removed per minute…" tres veces). Faltan el número de estación siempre visible en el mapa y la walkback route desde la estación elegida (Caswell y Kostak, Fig. 4). El timeline está bien alineado con el Playbook.
- **Brief**: en el 3D se pisan los rótulos de estaciones. Faltan Map Book y Cribsheet; la cuff checklist es un link chico.
- **Cuff checklist**: "Return to habitat" en vez de EVA TERMINATE en los hard stops; E03S24 lista las tres ramas aunque lleven al mismo lugar (E03S25 dice "IF ANY RESULT"); "EV2: Run Clean sample containers"; la protección planetaria se repite en cada estación.
- **EVA, casco**: 8 filas (Bensch 2024 sugiere pocos números y por contexto). El minimapa arranca vacío: `eva-minimap.tsx` encuadra la ruta con el norte arriba y después la rota alrededor del EV; al salir mirando al sur, la ruta queda fuera del cuadro. Rótulos del horizonte superpuestos. "STEER Ahead" junto a "180° S" es ambiguo. El botón "No ice" no dice el alcance.
- **EVA, IV**: el panel apenas entra y repite el minimapa. Las tres ramas llevan a E03S25 sin decir "This measurement does not change the next stations" (DECISIONS 2026-11-08).
- **Debrief**: "Limits" repite la frase de "What does not work" y muestra el `plan_id` crudo. Faltan el avance de la STM, el registro de decisiones y el plan contra lo ejecutado.

## "Sin hielo" no es "no hay hielo"

`packages/model/gp/planning.py` ya carga un `no_ice` como observación censurada: el hielo está más profundo que el alcance de la herramienta (`deeper_than`). Un taladro de 1 m sin hielo baja P(hielo ≤ 3 m) pero no la lleva a cero. Coincide con cómo se leyeron las zanjas de Phoenix sin hielo: tabla de hielo debajo de lo cavado (máx. 18.3 cm; Mellon et al. 2009, JGR). La falta de detección de SHARAD en Phoenix se atribuye al hielo demasiado somero, no a su ausencia (Putzig, KISS). Interfaz: "Not within 1 m (drill reach)" y, en el Debrief, "Candidate for GPR / deeper core on EVA 2". No se encontró un marco formal publicado para resultados negativos de hielo.

## Minimapa: rumbo arriba o norte arriba

La literatura de aviación no da un ganador general: depende de la tarea. En superficie, el norte arriba dio más problemas que el rumbo arriba o el papel (FAA/Volpe, rosap.ntl.bts.gov/view/dot/9028). Propuesta: EV con rumbo arriba, IV con norte arriba, igual que su mapa grande.

## Ruta más corta al hábitat

`TraverseMap.route(start, end)` (`apps/planner/app/traverse/route.py:187`) ya da la ruta más rápida sobre el DTM. Desde E03S26: 400 m, 12.4 min, pendiente máxima 4.9°. Falta exponerla (`GET /walkback?x=&y=`) y usarla al marcar TERMINATE.

## Re-plan real usado en las maquetas

`/replan` con E03S24 "no_ice" (1 m) y objetivo `confirm`: cambia las 5 estaciones (E04S24, E05S25, E05S24, E06S23, E05S23), `changed_fraction` 1.0, `iv_decision` true, margen 20.6 → 24.6 min. Con "ice": no cambia nada (objetivo primario cumplido).
