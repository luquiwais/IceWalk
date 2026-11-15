# IceWalk — guion y storyboard

14/11/2026 noche · Claude (Opus 5.5), con autorización de Eitan para ajustar («ajustá como te parezca mejor»).

**Guion vigente (base v3), con puesta actualizada al plan de producción v4.**
Global: 29,5 s en inglés; local: 180 s en castellano. Las voces y los tiempos se
conservan. Producción pausada por Eitan: faltan las tres decisiones de
[producción](production.md#9-decisiones-que-faltan). Existe un animatic global
incompleto; no hay película terminada ni composición local. Fuentes y rótulos en
[references.md](references.md); inventario local en [assets.json](assets.json).

---

## 1. Explicación

### Qué tiene que lograr cada video

| | Global | Local |
| --- | --- | --- |
| Para quién | Jurado NASA Space Apps, en inglés | Jurado de la sede Buenos Aires, en castellano |
| Duración | 29.5 s · 708 frames a 24 fps | 180 s · 4320 frames a 24 fps |
| Qué tiene que poder repetir quien lo ve | «Usan datos y mediciones para decidir dónde vale la pena medir en Marte, sin prometer hielo, dentro del tiempo para volver» | Lo mismo, más **cómo**: datos orbitales → herramienta → ruta → ventana → medición → revisión → menos EVAs esperadas |
| Qué le tiene que pasar | Quedar «flasheado»: volver a verlo porque no puede creer que sea tan bueno, mostrárselo a alguien y buscar el proyecto por curiosidad | Lo mismo, y salir pudiendo explicarle a otro cómo funciona |

### La idea en una línea

**IceWalk no promete dónde está el hielo: ayuda a gastar menos EVAs para saber más de un sitio, y a decidir el siguiente paso con el tiempo que queda para volver.**

### El arco (igual en los dos)

1. **Problema.** Desde la órbita vemos mucho, pero no lo que hay en el primer metro. Cada salida cuesta tiempo de la tripulación.
2. **Una medición.** El taladro llega a 1 m: sin hielo.
3. **Entender.** Un negativo también informa. El modelo estimaba hielo más hondo (mediana 2,4 m en esa estación), así que el resultado era el esperado (94 %) y el plan ya tenía preparado ese camino.
4. **Revisar.** El mapa cambia poco y solo cerca del punto (así tiene que ser). El IV revisa: se mantienen las 5 estaciones, se sigue, el regreso queda cubierto.
5. **Actuar.** «GO para la estación 25.» Los dos en superficie siguen.
6. **Por qué importa.** En simulación, radar primero y taladro para confirmar baja las EVAs esperadas de 3,32 a 1,16.
7. **Revelación y vuelta al principio.** Todo número que se vio en pantalla salió de IceWalk; la cámara vuelve a la órbita y el último cuadro empalma con el primero.

### Cómo se cumplen los criterios del equipo

| Criterio | Dónde se cumple |
| --- | --- |
| Explicar la problemática | Primera línea de los dos videos (G01, L01–L02) |
| A qué responde y cuál es el diferencial | G03–G05 / L09–L11: el dato entra al modelo y se revisa el plan; no es un mapa estático. Lo dice L02 en palabras simples |
| No prometemos hielo | Dicho literalmente: G07 y L02, repetido en L13 |
| Menos recursos, menos incertidumbre, mejor entendimiento del sitio | G07 / L13 (EVAs esperadas), L10 (incertidumbre local), L12 (qué aprendimos) |
| Que entren a la landing | **Implícito, por curiosidad: sin URL ni invitación en el video** (pedido de Eitan). Los links van en la ficha del proyecto. El video deja una pregunta abierta y una revelación que da ganas de saber más |
| Que sea cine sin ser solo un corto | La app aparece desde el primer segundo (mapa real en G01/L01). Cada escena dramática termina en un dato o en una acción |

### Diseño para que lo vuelvan a ver

El objetivo no es explicar todo en la primera vista: es que la primera vista deje una sensación («¿cómo hicieron esto?») y la segunda descubra que todo cerraba.

1. **La revelación final.** Antes de la marca, en silencio y sobre la consola del IV (el mismo encuadre del primer plano): `Every number on screen came from IceWalk.` / `Todos los números de este video salieron de IceWalk.`, y debajo, chico: `Planner output · simulated measurement`. Quien lo vio como un corto descubre que era el producto funcionando, y vuelve a mirarlo para ver los números. Es verdad: mapas, PET, estaciones, 100 m, 2,4 m, 94 %, márgenes y campaña salen de `map*.json`, `plan.json`, `replan.json` y `campaign.json`; el reloj se calcula de esos datos (`decide_by_min − PET`). Condición dura: **ningún número en pantalla puede venir de otro lado**. Si hace falta uno que no está en los mocks, se saca o se rotula aparte.
2. **El bucle.** El video empieza por encima del hombro del IV, con el mapa en su consola, y la cámara entra en la pantalla hasta el suelo de Marte. El final hace el camino inverso: desde los astronautas sube, el terreno se vuelve el mapa de la consola y la cámara sale de la pantalla hasta el mismo encuadre del principio, ahora con el punto medido y la línea a E03S25. En reproducción automática o en loop, el final empalma con el principio.
3. **La frase que se paga después.** «Not what's one metre down» al principio; la sección del subsuelo (hielo estimado a 2,4 m) en el medio. En la segunda vista se entiende por qué el «no» de la primera frase era la clave.
4. **Coherencia escondida.** El mismo ID de estación en el visor, en la consola y en el mapa; el mismo reloj de estación (4 h 16) en consola y antebrazo; en tránsito, sin valor numérico hasta validar el regreso desde la posición actual; la sombra con el mismo ángulo en el primer y el último plano. No se señala: se descubre.
5. **El nombre al final.** IceWalk aparece en la interfaz desde el principio (el logo propio de la app en la consola), pero **la voz recién lo dice en el último plano**. La primera vista es «¿qué es esto?»; el nombre llega junto con la revelación.
6. **Frases para repetir.** «Not what's one metre down.» · «You're GO for station twenty-five.» · «We don't promise ice.» Cortas, citables y fáciles de recortar para compartir.

### Qué es real, qué es simulado y qué es concepto

| Tipo | Elementos | Rótulo en pantalla |
| --- | --- | --- |
| Salida real del planificador con medición ficticia | Mapas antes/después, plan, replan, estaciones, PET, márgenes, profundidades | `Simulated EVA` / `EVA simulada` |
| Simulación de campaña | 3,32 → 1,16 EVAs esperadas | `Campaign simulation` / `Simulación · supuestos declarados` |
| Concepto | Visor AR, radio, consola del hábitat | `AR interface concept` / `Concepto de interfaz AR` |
| IA existente | Clip S02 del taladro y referencias; sin nuevas generaciones | `AI-generated dramatization` / `Dramatización generada con IA`, persistente y legible |

### La app vive dentro de la escena

**No hay planos que sean solo la app o solo gráficos.** Cada vez que aparece un dato, está en una superficie del mundo y hay algo más en cuadro: una persona, una mano, una herramienta, el lugar.

| Superficie | Qué muestra | Con qué comparte el cuadro |
| --- | --- | --- |
| Consola del IV (pantalla principal y una secundaria) | Mapa, mapa antes/después, revisión del plan, ventana ambiental, campaña, reloj | Hombro, manos, cara iluminada por la pantalla, reflejo en el vidrio, ventana del hábitat |
| Mesa de brief (pantalla horizontal táctil) | Capas del sitio, catálogo, ruta, estrategia radar → taladro | Tres personas alrededor, manos que señalan y arrastran, herramientas reales apoyadas al lado de su propia ficha, un mapa impreso |
| Pantalla de antebrazo del EV | Registro de la medición, reloj, rol y tareas | Guante, polvo, el taladro, el suelo |
| Visor AR (POV) | Estación siguiente, línea de 100 m, reloj, corte del subsuelo bajo el punto medido | Terreno, guantes, el compañero |

Reglas para que se lea igual:

1. **Legibilidad por cercanía, no por plano plano.** La pantalla ocupa al menos 60 % del cuadro y el dato importante queda legible en un celular durante 2 s o más. Si no se lee, la cámara se acerca; no se corta a una captura frontal.
2. **Pantallas dentro de la escena.** Operador filmado frente al monitor; terreno real recreado en Blender y AR conceptual compuesto en Remotion. Las pantallas leen el episodio congelado de IceWalk. El corner pin sigue disponible para las placas existentes, como alternativa pendiente de decisión.
3. **Movimiento físico.** Empuje lento, cámara en mano suave o foco que pasa de la mano al dato. La pantalla se siente un objeto.
4. **Los rótulos sí pueden ir sobre la imagen** (`Site S1094b · Mars`, `E03S24 · PET 91 min`, la revelación final, la marca de IA), siempre sobre una escena, nunca sobre negro ni sobre un gráfico solo.
5. **El corte del subsuelo es AR,** no una infografía: el visor de EV1 lo dibuja bajo el agujero del taladro, con el guante y el suelo en cuadro, rotulado `AR interface concept · model estimate`.

### Presupuesto de palabras

- Global: **47 palabras** (v2: ~40). Con ~6 s sin voz quedan ~2 palabras/s: entra, pero hay que medirlo con lectura real antes de generar imagen. Si no entra, se recorta primero «Copy. Moving.». El «IceWalk.» final no se toca: es la única vez que se dice el nombre.
- Local: **~310 palabras** en 180 s (~1,7/s promedio; el bloque más denso, L02, ~2,4/s).

---

## 2. Video global — 29.5 s, inglés

Narrador = voz del IV en off (adulto, calmo, sin tono de tráiler). Radio con filtro de banda y clic de PTT. Subtítulos siempre.

### Guion

| # | Tiempo | Voz | En pantalla |
| --- | --- | --- | --- |
| G01 | 0.0–3.5 | **IV (off):** «From orbit, we can map a lot. Not what's one metre down.» | En la consola del IV: mapa `P(ice ≤ 3 m)` sobre HiRISE · rótulo `Site S1094b · Mars` |
| G02 | 3.5–7.0 | **EV1 (radio):** «One metre. No ice.» | En la pantalla del antebrazo: `E03S24 · No ice down to 1 m` · `4 h 16 min to required departure` |
| G03 | 7.0–10.0 | — (respiración, ventilación) | En el visor, bajo el agujero: `Measured: 0–1 m` · `Estimated ice depth: median 2.4 m` · `AR interface concept · model estimate` |
| G04 | 10.0–15.0 | **IV (off):** «Each measurement updates the map — and the plan.» | En la consola: mapa antes/después · `5 stations kept · Continue · Return margin reviewed` |
| G05 | 15.0–19.0 | **IV (radio):** «EV1, plan reviewed. You're GO for station twenty-five.» **EV1:** «Copy. Moving.» | AR: `NEXT E03S25 · 100 m` · `Return time under review` · `AR interface concept` |
| G06 | 19.0–21.5 | — (la música abre) | — |
| G07 | 21.5–25.0 | **IV (off):** «We don't promise ice. We help you learn more with fewer EVAs.» | Filmado IV + W1 en monitor + campaña Remotion |
| G08 | 25.0–29.5 | **IV (off):** «IceWalk.» (sobre el logo, al final) | La cámara sube desde los astronautas, el terreno se vuelve el mapa de la consola y sale al encuadre de G01 → sobre ese plano: `Every number on screen came from IceWalk.` / chico: `Planner output · simulated measurement` → `IceWalk · Darionautas` · `Understand uncertainty. Plan the next step.` · alcance y marca de IA en letra chica legible. **Sin URL** |

### Storyboard

Placas nuevas respecto del v2: **H11** consola del IV por encima del hombro (pantallas neutras, ventana del hábitat al fondo), **H12** POV de EV1 mirando el agujero del taladro, **H13** IV en la consola con la ventana y dos figuras chicas afuera, **H14** mesa de brief cenital con manos y herramientas, **H15** antebrazo del EV con pantalla neutra.

| Plano | Frames | Imagen | Cámara | Acción | Sonido | Origen |
| --- | --- | --- | --- | --- | --- | --- |
| G01a | 0–48 | Por encima del hombro del IV, hábitat en penumbra. En la consola, el mapa real de IceWalk sobre HiRISE con E03S24 marcado; la mano del IV apoyada al lado; el mapa se refleja en el vidrio | Empuje lento hacia la pantalla hasta que el mapa llena el cuadro | El IV no se mueve; solo respira | Ventilación, tono grave | Filmado IV + mapa Remotion |
| G01b | 48–84 | El mapa de la pantalla se funde con el suelo real visto desde arriba, en el mismo punto; entra un guante sobre el taladro | Continúa el empuje; cenital | El taladro gira | Viento; el mecanismo entra | Remotion → bajada Blender → S02 existente |
| G02a | 84–120 | Guante, taladro y antebrazo de EV1. **La sombra de EV1 y del taladro cae sobre el punto.** En la pantalla del antebrazo: `No ice down to 1 m` y el reloj | Detalle, fija; el foco pasa del taladro a la pantalla | El taladro se detiene; la mano queda un instante de más | El mecanismo se apaga; respiración | S02 existente + antebrazo Remotion |
| G02b | 120–168 | Visor de IV, ojos visibles; el registro se refleja tenue en el vidrio | Primer plano, empuje lento | Mira la muñeca y después a EV2 | Radio IV | Filmado: reacción del IV |
| G03a | 168–204 | Consola del IV en tres cuartos; en la pantalla, el mismo punto E03S24 | Match cut del punto; foco en el dedo | El dedo del IV queda quieto sobre el control | Ventilación | Filmado: dedo del IV |
| G03b | 204–240 | POV de EV1 mirando el agujero: el visor dibuja una columna dentro del suelo, firme de 0 a 1 m y una nube difusa más abajo con la mediana en 2,4 m; guante y taladro en cuadro | POV, leve respiración de cámara | EV1 baja la vista; la columna se dibuja | Silencio con pulso tenue | Blender: agujero + AR Remotion |
| G04a | 240–300 | Por encima del hombro del IV: el mapa antes/después en la pantalla, la mano del IV pasando de uno a otro; reflejo de su cara | Fija, foco de la mano a la pantalla | El cambio aparece solo alrededor de E03S24 | Pulso musical contenido | Filmado: mapa antes/después en monitor |
| G04b | 300–360 | Primer plano de la mano sobre la tarjeta de revisión en la pantalla táctil, con los bordes de la consola y la luz sobre los dedos | Detalle, empuje mínimo | Tres focos: estaciones → tiempo → regreso; el dedo espera y confirma | Clic de confirmación | Filmado: revisión en monitor |
| G05a | 360–420 | Perfil del IV con micrófono, la pantalla le ilumina la cara; detrás, desenfocado, el mapa con los dos puntos del equipo | Medio | Habla por radio; la mirada deja la pantalla | Radio IV | Filmado: perfil IV por radio |
| G05b | 420–456 | POV de EV2: suelo y línea recta de 100 m hacia E03S25, reloj en el borde; el guante de EV1 entra en cuadro | POV casi estable | Gira el cuerpo hacia la línea | Radio EV1, pasos | Blender P1 + AR Remotion |
| G06a | 456–480 | Ojos y mandíbula del IV se relajan | Primeros planos | Alivio contenido | Respiración más lenta | Filmado: ojos y mandíbula IV |
| G06b | 480–516 | Plano general: dos astronautas, hábitat cercano, **dos sombras largas** hacia la estación siguiente | Gran plano, travelling lateral lento | Empiezan a caminar | La música abre la armonía | Blender W1: siluetas a contraluz |
| G07 | 516–600 | Dentro del hábitat: el IV se recuesta; en la pantalla secundaria, radar → taladro y `Fewer EVAs · campaign simulation`; por la ventana, las dos figuras chicas caminando | Medio, empuje lento hacia la pantalla secundaria | El IV mira la pantalla y después la ventana | Narrador | Filmado IV + W1 en monitor + campaña Remotion |
| G08a | 600–636 | Desde los dos astronautas la cámara sube; el terreno se convierte en el mapa de la consola y la cámara sale de la pantalla hasta el encuadre exacto de G01a, ahora con E03S24 medido y la línea a E03S25 | Subida continua y salida de la pantalla (espejo de G01) | — | El tono grave de G01 vuelve | Blender W2 → Remotion → filmado IV |
| G08b | 636–672 | Mismo encuadre: sobre el hombro del IV y su consola, la línea `Every number on screen came from IceWalk.` y, chico, `Planner output · simulated measurement` | Fijo | El IV, quieto, mira la pantalla | La música se corta: silencio | Filmado IV + revelación Remotion |
| G08c | 672–708 | Mismo encuadre: `IceWalk · Darionautas`, lema, alcance y marca de IA en letra chica legible. **Sin URL** | Fijo; el último cuadro es igual al primero | — | Narrador «IceWalk.»; acorde y 1 s de cola | Filmado IV + marca Remotion |

---

## 3. Video local — 180 s, castellano

Misma voz del IV como narrador. Estructura: **problema → antes de salir (L03–L07) → afuera (L08–L09) → revisar juntos (L10–L12) → impacto y cierre (L13–L14)**. L01 es un salto adelante: el mismo momento se repite completo en L09.

### Guion

| # | Tiempo | Voz | En pantalla |
| --- | --- | --- | --- |
| L01 | 0–8 | **IV (off):** «Desde la órbita vemos mucho. No lo que hay a un metro.» · **EV1 (radio):** «Un metro. Sin hielo.» | Consola del IV con el mapa → guante · rótulo `E03S24 · PET 91 min` · `Todavía puede haber hielo más abajo` |
| L02 | 8–22 | **IV (off):** «Buscar hielo en Marte cuesta salidas y tiempo de la tripulación. Este sistema no promete dónde está el hielo: ayuda a decidir dónde medir, con qué herramienta y cuánto tiempo invertir antes de volver.» | La app en la consola, con su logo chico en la interfaz (el nombre no se dice) |
| L03 | 22–35 | «Junta datos orbitales de NASA y los convierte en una estimación de hielo hasta tres metros, junto con lo que todavía no sabemos.» | En la mesa de brief: `Planificación · antes de la EVA` · capas con fuente y resolución · `P(hielo ≤ 3 m)` e `Incertidumbre` por separado |
| L04 | 35–48 | «El radar indica dónde conviene buscar; el taladro confirma hasta un metro. Qué llevar y en qué orden cambia cuántas salidas hacen falta.» | En la pared y la mesa, junto a las herramientas reales: catálogo con profundidad, tiempo y masa · `Estrategia: radar primero, taladro para confirmar` |
| L05 | 48–61 | «Con eso arma la EVA: estaciones según lo que pueden enseñarnos, una ruta sobre el terreno, obstáculos vistos desde la órbita y el tiempo para volver.» | En la mesa, bajo el dedo de EV2: ruta sobre HiRISE, estaciones en orden · `Obstáculos: imagen orbital procesada` |
| L06 | 61–73 | «Y elige cuándo salir: luz, temperatura, polvo y clima espacial, con cada aviso y su fuente a la vista.» | En la consola, con la luz de la ventana: ventana ambiental con avisos · `Ejemplo del módulo · otra fecha` · `Climatología análoga` · `DONKI histórico` |
| L07 | 73–86 | «Afuera, uno mide y el otro asiste y vigila el regreso. Adentro, el operador sigue la misión y revisa cada cambio.» | Rol EV y consola IV del prototipo · `Concepto de operación · radio y AR ilustrados` |
| L08 | 86–99 | «Este reloj marca cuánto pueden seguir trabajando antes de emprender la vuelta, contando el trayecto y la entrada al hábitat.» | En el visor y en el antebrazo: `E03S24 · PET 51 min` · `4 h 56 min para iniciar el regreso` → elipsis → `PET 91 · 4 h 16 min` |
| L09 | 99–113 | **EV1 (radio):** «Sin hielo hasta un metro. Registro enviado.» **IV (radio):** «Recibido.» · *(10 frames de negro)* · **IV (off):** «Un resultado negativo también informa. El modelo esperaba el hielo más abajo, y el plan ya tenía preparado este camino.» | Antebrazo: `Sin hielo hasta 1 m · EV1` · visor: `Profundidad estimada: mediana 2,4 m` · consola del IV: `Resultado previsto: 94 %` |
| L10 | 113–127 | «La medición actualiza la estimación cerca del punto, y también su incertidumbre. El cambio es chico y local: así tiene que ser.» | En la consola: mapa antes/después · `P(hielo ≤ 3 m)` · `Incertidumbre` |
| L11 | 127–142 | **IV (radio):** «PET noventa y uno. Cuatro horas dieciséis para el regreso. Plan revisado: cinco estaciones, seguimos. EV1, GO para la estación veinticinco.» **EV1:** «Copiado. En marcha.» | `5 estaciones · Continuar · Margen mínimo previsto 20,5 min` · AR `SIGUIENTE E03S25 · 100 m` |
| L12 | 142–154 | **IV (off):** «Siguen con una decisión revisada: saben qué aprendieron, qué falta conocer y qué margen tienen que cuidar.» | De fondo en la consola, el mapa con la incertidumbre todavía visible |
| L13 | 154–170 | «En nuestra simulación, usar radar primero y el taladro para confirmar baja las salidas esperadas de 3,32 a 1,16. No prometemos hielo: buscamos aprender más con menos EVAs.» | En la pantalla secundaria del IV, con el equipo por la ventana: `Sin radar: 3,32 EVAs esperadas` vs `Radar primero: 1,16` · `Simulación · taladro de 1 m · 6 estaciones por EVA · EVAs independientes (supuesto)` |
| L14 | 170–180 | *(silencio en la revelación)* · durante la subida a la órbita: «IceWalk. Entender la incertidumbre. Planificar el siguiente paso.» | Subida desde los astronautas hasta la consola, encuadre de L01 → sobre ese plano: `Todos los números de este video salieron de IceWalk.` / chico: `Salidas del planificador · medición simulada` → `IceWalk · Darionautas`, alcance y créditos de IA. **Sin URL ni invitación** |

### Storyboard

| Bloque | Acción y encuadre | Fuente |
| --- | --- | --- |
| L01 | Consola del IV → bajada al sitio real → taladro y sombra. La reacción del reporte se ve en el IV. | Filmado + Blender + S02 existente |
| L02 | General del sitio con hábitat; interior de consola y mano sobre la tarjeta. | Blender W1 + filmado IV |
| L03 | Capas y fuentes en el monitor; sobrevuelo con probabilidad sobre terreno real. | Filmado + Blender + Remotion |
| L04 | Fichas de herramientas en el monitor; breve contexto de equipos NASA rotulado. | Filmado + Remotion; NASA xEMU/Desert RATS pendiente |
| L05 | Ruta y estaciones en el terreno; obstáculos detectados desde imágenes orbitales. | Blender + Remotion + filmado |
| L06 | Ventana ambiental con avisos en monitor; luz y sombras del terreno. Otra fecha, rotulada. | Filmado + Blender |
| L07 | Roles en consola; contexto de ensayos análogos claramente rotulado. | Filmado; NASA CHAPEA/Desert RATS pendiente |
| L08 | Caminata subjetiva y elipsis. Reloj numérico solo detenido en E03S24: llegada y fin de medición. | Blender P1 + AR Remotion |
| L09 | Taladro se detiene; registro en antebrazo; negro de 10 frames; columna bajo el agujero; reacción del IV. | S02 + Blender + Remotion + filmado |
| L10 | Mapa e incertidumbre antes/después dentro del monitor. Cambio pequeño y local. | Filmado + Remotion |
| L11 | IV revisa estaciones y regreso, confirma; radio GO; POV hacia E03S25. | Filmado + Blender P1 + AR conceptual |
| L12 | Ojos y mandíbula del IV se relajan; dos siluetas se orientan al siguiente punto. | Filmado + Blender W1 |
| L13 | Campaña en pantalla secundaria, con hombro del IV y vista externa del equipo. Supuestos legibles. | Filmado + W1 en monitor + Remotion |
| L14 | Sombras largas; subida a órbita; mapa → consola; revelación y marca. Empalma con el inicio. | Blender W2 → Remotion → filmado IV |

---

## 4. Producción pendiente

1. Resolver las tres decisiones de [production.md](production.md#9-decisiones-que-faltan).
2. Lectura cronometrada de las voces. El animatic global existe sin voces finales; el local todavía no está implementado.
3. Revisar el animatic contra esta puesta: conserva placas y placeholders del flujo anterior.
4. Validar cada número contra `tools/video/public/data/data.json` y sus fixtures; no regenerar desde los mocks nuevos sin revisar el guion.
5. Antes del final, verificar relojes desde la posición actual, créditos, marcas por tipo de imagen, legibilidad y bucle.
6. Enlace/plazo local: `OPEN_QUESTIONS.md` #92; declaración de IA: #69. La landing se enlaza en la ficha, sin URL en el video.
