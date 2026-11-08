# ¿Alcanza el diferencial de IceWalk para un jurado técnico?

Notas del 8 de noviembre de 2026. Parten de `docs/EXPERIMENTS.md` (secciones del 2026-11-08 y la prueba de estructura del 2026-11-05), `docs/research/viabilidad-expediciones.md` y `docs/research/competencia.md`. No repiten lo que ya está ahí. Arora 2019, Candela 2017, BASALT y los criterios de 2022 ya figuraban; acá se suman cifras nuevas o se leen de otra forma.

Etiquetas: **documentado** (leído en la fuente, con URL; «solo resumen» si se leyó el resumen o la ficha), **inferencia** (razonamiento nuestro) y **no verificado** (visto en un buscador o en una fuente débil). Los números calculados por nosotros van como **cálculo propio**.

## Respuesta corta

**Alcanza, pero no por el número solo, y hoy tiene un punto débil que un experto va a encontrar.**

- **El tamaño del efecto es normal, no excepcional.** Pasar de una chance de 18 % a 50 % (×2.8, +32 puntos) o sumar +0.9 a +1.4 puntos con hielo de 6 cae dentro de lo que la literatura reporta para muestreo dirigido contra sistemático o al azar: ×1.8 a ×4 en simulación ecológica, ×2 a ×7.5 en campo, y 93 % contra 24 % de AEGIS en Marte. Un jurado técnico no se va a sorprender por la magnitud. Lo que sí le da credibilidad es que el resultado **coincide con lo publicado**, incluido el resultado negativo: en la literatura, los planificadores de "máxima información" con presupuestos chicos tampoco le ganan con claridad a una cobertura sistemática (inferencia sobre la tabla de abajo).
- **Lo sorprendente es el mecanismo, no el cociente.** Hay tres ideas que se entienden en 30 segundos: usar 349 cráteres orbitales como sensor de profundidad; "apuntar a la respuesta rinde más que apuntar al conocimiento"; y una herramienta que dice "acá no vale la caminata" donde no hay cráteres (inferencia).
- **El punto débil:** según cómo está escrito `model/gp/simulation.py`, toda la ventaja depende de la correlación espacial de 100 m con `rho` = 0.5. Esa correlación es el mejor ajuste, pero **no es significativa** (p = 0.09 en `EXPERIMENTS.md`). La verdad simulada sale del mismo modelo, y el caso "verdad distinta" solo probó **más** estructura, nunca menos. Con `rho` = 0, el posterior en las celdas candidatas no depende de los cráteres y la ventaja debería ser nula (inferencia por lectura del código; no se corrió). Además, "blancos" y "potencial + incertidumbre" dan casi lo mismo, así que la objeción "un geólogo elegiría los cráteres a ojo" tiene base.
- **Cómo presentarlo:** como contrafáctico con la misma caminata (mismas 8 h, mismos 8 km, dos planes lado a lado) y un contador de campaña: "EVAs esperadas hasta confirmar hielo: 5.6 contra 2.0". Hay que mostrar el intervalo y decir dónde no sirve. Antes del 14 conviene correr dos controles baratos: la sensibilidad a `rho` (0, 0.25, 0.5) y la validación con cráteres reales ocultos. Si la ventaja sobrevive con datos reales, eso es lo que convence a un jurado técnico. Si no sobrevive, el pitch cambia a "dónde vale la pena caminar y con qué herramienta", y es mejor saberlo el 10 que en la ronda de preguntas (inferencia).

## 1. Comparación con lo publicado

| Dominio | Trabajo | Comparación | Cifra | Qué mide | Etiqueta |
| --- | --- | --- | --- | --- | --- |
| Robótica en Marte | AEGIS en Curiosity (Francis et al. 2017, *Science Robotics*) | Elección autónoma del blanco contra apuntado "a ciegas" | Más de 93 % de blancos preferidos contra ~24 % esperado a ciegas (×3.9) en el primer año; más de 86 % contra menos de 20 % en cuatro años (Verma 2020) | Si el blanco tiene el material que pidieron los científicos | documentado en la página del proyecto en JPL ([AEGIS](https://superintelligence.jpl.nasa.gov/public/projects/aegis)); el paper no se abrió |
| Robótica en Marte | AEGIS, uso acumulado | - | 596 blancos en MSL y 293 en Perseverance al 11 de mayo de 2026; el blanco del sol 910 dio la primera detección de sílice hidrotermal en Jezero (Beck et al. 2025) | Adopción operativa | documentado ([AEGIS](https://superintelligence.jpl.nasa.gov/public/projects/aegis)) |
| Robótica en Marte | JPL, nota de 2017 | Antes de AEGIS | «Half the time it would just hit soil» | Tasa a ciegas, sin cifra formal | documentado ([JPL](https://www.jpl.nasa.gov/news/laser-targeting-ai-yields-more-mars-science)) |
| Robótica en Marte | PIXL en Perseverance (Lawson et al. 2024) | Muestreo adaptivo a bordo | Sin cifra de mejora; «the first autonomous decision-making based on real-time compositional analysis» | Precedente | documentado, solo resumen ([arXiv 2405.14471](https://arxiv.org/abs/2405.14471)) |
| Robótica analógica | Kodgule, Candela y Wettergreen 2019 | Planificador no miope contra paso fijo (tipo grilla) y azar, Cuprite | Error de reconstrucción con 25 muestras: 1201 contra 1270 fijo (−5 %) y 1780 azar. Con 125 muestras: 396 contra 880 fijo (−55 %) | Error del mapa | documentado ([arXiv 1904.12255](https://ar5iv.labs.arxiv.org/html/1904.12255)); la asignación de columnas la infirió el resumidor |
| Robótica analógica | Arora et al., FSR 2018, datos de MVP | Planificador informativo contra cobertura | «at least as well as a coverage-based algorithm» | Información | documentado, solo resumen ([UTS](https://opus.lib.uts.edu.au/handle/10453/127742)) |
| Robótica analógica | Arora 2019 (ya en el repo) | Contra azar | 59.17 ± 18.63 contra 52.23 ± 11.76, con desvíos que se solapan | Ganancia de información | documentado (`viabilidad-expediciones.md`) |
| Robótica analógica | Edelson, tesis de CMU de 2020 | Planificador ergódico contra azar y codicioso | 31.2 % mejor que el azar y 16.3 % mejor que el codicioso | Reducción de entropía | no verificado (snippet del buscador) |
| Prospección minera | Mern y Caers 2023, *Intelligent Prospector* | Perforación secuencial (POMDP) contra grilla de 16 y azar | Igualó la exactitud de la grilla completa de 16 con 7 a 10 mediciones (40-55 % menos) | Incertidumbre del depósito; 2D sintético | documentado ([GMD](https://gmd.copernicus.org/articles/16/289/2023/gmd-16-289-2023.html)) |
| Prospección minera | Prensa de inversores, atribuido a MinEx | Programas sobre anomalías contra perforación a ciegas | "~3 veces" más acierto; 1 en 300 en programas iniciales contra 1 en 8 en seguimiento | Descubrimiento | no verificado (fuente débil, sin dato primario) |
| Ecología | Guisan et al. 2006, *Conservation Biology* | Muestreo guiado por modelo contra muestreo al azar | ×1.8 a ×4 según la medida, en simulación; «may save up to 70% of the time spent in the field» | Nuevas poblaciones de una planta rara | documentado, solo resumen ([UNIGE](https://archive-ouverte.unige.ch/unige:19297)) |
| Ecología | Le Lay et al. 2010, *Ecography* | Modelo contra azar en campo, 240 sitios | Rara: chance de encontrarla de 0 a 50 %. Comunes: el doble de nuevas poblaciones | Detección | no verificado (resumen visto por el buscador; el repositorio pidió captcha) |
| Ecología | Aizpurua et al. 2015, *J. Applied Ecology* | Modelo, experto y estratificado al azar, en campo | 95, 72 y 11 territorios nuevos. Modelo ×7.5 y experto ×5.3 contra el estratificado; **modelo ×1.4 contra experto** (significativo) | Territorios nuevos por km² | documentado (PDF completo, p. 1612-1614, [PDF](https://cra.wallonie.be/uploads/2018/03/TAP_659_-_Aizpurua_et_al__-_2015_-_Reconciling_expert_judgement_and_habitat_suitabili.pdf)) |
| Ecología | Muestreo adaptivo por conglomerados | Contra muestreo al azar simple | "Casi el doble" de eficiencia con conglomerados apretados; puede ser «highly inefficient» si la población no es agregada | Varianza del estimador | no verificado (snippets); el resumen de Hariharan 2013 no trae cifras ([arXiv 1304.2460](https://arxiv.org/abs/1304.2460)) |
| Hielo en análogos | Permafrost, georradar antes de perforar | Geofísica para elegir pozos | Solo cualitativo: «fewer boreholes»; pozos que no encuentran cuñas esperadas | - | no verificado (snippets); **no encontramos una tasa de acierto dirigida contra grilla para hielo** |
| Hielo en análogos | BASALT (Brady et al. 2019) | Estaciones elegidas por imagen y consenso experto | De más de 65 candidatas a ~30; a veces el rasgo «not present at all» | Sin tasa | documentado ([PMC6442241](https://pmc.ncbi.nlm.nih.gov/articles/PMC6442241/)) |

**Lectura.**
- **Un ×2.8 (o +32 puntos) es normal y hasta modesto** frente a ×4 a ×7.5 en ecología de campo y ×3.9 en AEGIS. Esos estudios tienen bases chicas, y los cocientes con base chica se inflan. Los +0.9 a +1.4 puntos de 6 con herramienta de 3 m son un +23-35 %, el tamaño típico de las comparaciones con presupuesto chico en robótica (inferencia).
- **El resultado negativo coincide con la literatura.** Con 25 muestras, el no miope de Kodgule le gana por solo ~5 % al paso fijo, y la brecha recién se abre con más presupuesto. Arora llega a "al menos tan bien como cobertura". Una EVA de 6 estaciones es un presupuesto chiquito, así que lo esperable es que "información" empate con la grilla. Esto convierte la debilidad en un argumento de validez (inferencia).
- **Aizpurua es el antecedente más útil.** Es el único caso de campo que compara modelo, experto y referencia sistemática. El experto se lleva la mayor parte de la ganancia (×5.3) y el modelo agrega ×1.4. Es la forma honesta de responder a la objeción del geólogo (documentado e inferencia).

## 2. Traducción a costo operativo de EVA

### Datos de NASA

| Dato | Valor | Etiqueta |
| --- | --- | --- |
| EVA en Marte, tabla D-9 | Duración promedio 8 h; 2 tripulantes; «Up to 27 hours/week»; estadía de ~7-540 días | documentado ([EVA-EXP-0042 Rev. B, p. 150-151](https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf)); la tabla no aclara si las 27 h son por persona o por equipo |
| Preparación y post-EVA en Marte | «forward work» (TBD-9.2.1-011 y TBD-9.2.2-012) | documentado (misma fuente) |
| Luna, día lunar | 3-4 días por semana, EVAs de 2-8 h (1 h de salida y entrada, 1.5-7.5 h de tareas) | documentado (misma fuente, p. 30 y 109) |
| Artemis fase 1 | 6.5 días (~156 h) en superficie, 2-5 EVAs, «up to 8 hours in duration (6±2 hours)» | documentado ([EVA-EXP-0075, Coan 2020](https://ntrs.nasa.gov/api/citations/20200001071/downloads/20200001071.pdf)) |
| Exploración | Hasta 24 h de EVA por persona por semana; EVAs de 6-8 h, 3-4 por semana | documentado ([Evidence Report, EVA Risk, 2022](https://ntrs.nasa.gov/api/citations/20220004017/downloads/2021%20EVA%20Injury%20Evidence%20Report%20Final.docx.pdf)) |
| Riesgo de lesión | 0.05 lesiones por hora en 1087.8 h de EVA, o 0.26 por EVA (Scheuring 2009). El riesgo de EVA está en **rojo** para toda misión de superficie, y en superficie es «likely greater» que en órbita | documentado (misma fuente) |
| Consumibles | La masa de comida y agua para EVA está «directly associated with the required EVA hours» | documentado (misma fuente) |
| ISS, preparación | «at least 124 crew hours» para preparar una EVA de EE. UU.; 262 h de tripulación para ejecutar 3 EVAs; tiempo de tripulación valuado en USD 3.9 M por día | documentado ([Mularski y Alpert, ICES-2017-333](https://ntrs.nasa.gov/api/citations/20170003938/downloads/20170003938.pdf)); es la ISS en microgravedad, no Marte |
| AxEMU | 8 h | ya en el repo (`SOURCES.md`) |

### La cuenta (cálculo propio, no validado)

Supuestos: cada EVA es independiente, con la misma probabilidad `p` de confirmar al menos un punto con hielo; EVA de 2 tripulantes × 8 h = 16 horas-persona de EVA; ~3 EVAs por semana (27 h / 8 h). El número de EVAs hasta el primer éxito sigue una distribución geométrica: el valor esperado es `1/p`, y para llegar al 90 % hacen falta `ln 0.1 / ln(1 − p)`.

| | Grilla, hábitat 2 (`p` = 0.18) | IceWalk, hábitat 2 (`p` = 0.50) | Grilla, hábitat 1 (`p` = 0.47) | IceWalk, hábitat 1 (`p` = 0.77) |
| --- | --- | --- | --- | --- |
| EVAs esperadas hasta confirmar | **5.6** | **2.0** | 2.1 | 1.3 |
| Horas-persona de EVA esperadas | 89 | 32 | 34 | 21 |
| EVAs para 90 % de confianza | 12 (~4 semanas) | 4 (~1.3 semanas) | 4 | 2 |
| Chance con 3 EVAs (estadía corta tipo Artemis) | 45 % | 88 % | 85 % | 99 % |
| Lesiones esperadas (0.26 por EVA) | 1.4 | 0.5 | 0.55 | 0.34 |

- Con herramienta de 1 m en el hábitat 2, la diferencia esperada es de **~3.6 EVAs y ~57 horas-persona de EVA** por cada punto confirmado. Si se le suma la preparación de la ISS como cota (124 h por EVA, que no aplica tal cual a Marte), serían ~440 horas de tripulación más.
- La lectura más fuerte para el pitch es la de estadía corta: con 3 EVAs, la chance de confirmar pasa de "menos que una moneda" (45 %) a "casi seguro" (88 %).
- **Herramienta de 3 m:** con 3.82-3.98 puntos por EVA contra 4.68-5.37, juntar un número dado de puntos confirmados pide un 18-26 % menos de EVAs.
- **Límites de la cuenta (inferencia):** (1) La independencia es optimista para IceWalk: en EVAs sucesivas desde el mismo hábitat se gastan primero los mejores blancos y `p` baja. Es el mismo efecto del "próximo sitio" que registra `EXPERIMENTS.md`. Hay que simular la campaña, no suponerla geométrica. (2) Con 60 mundos, el error estándar de cada proporción es de ~5-6.5 puntos, así que el ×2.8 tiene un intervalo ancho. Conviene comunicar la diferencia (+32 puntos) con su intervalo. (3) Las 8 h son el techo del traje, no el tiempo de tareas. (4) Todos los valores de la EVA en la simulación son supuestos.

## 3. Qué lo haría sorprendente ante el jurado

- **Criterios (documentado, guía de 2022):** Impact («big problem or a little problem?»), Creativity («novel [...] or [...] an incremental improvement»), Validity («Is the solution scientifically valid? [...] Can it work in the real world?»), Relevance y Presentation. Best Use of Science premia «the best and most valid use of science and/or the scientific method», y Best Mission Concept premia «the most plausible concept and design» ([guía 2022](https://spaceapps-prod.s3.amazonaws.com/media/documents/Space_Apps_2022_Judging_and_Awards_Guide.pdf)). La guía vigente no se pudo abrir (error de certificado TLS), y los criterios de 2026 salen el 13 de noviembre (`competencia.md`).
- **Ganadores de 2025 (documentado):** Best Use of Science fue para SpaceGenes+, un panel interactivo, y Best Mission Concept para PureFlow, con «design, model in 3D, and validate» ([NASA](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/)). Las descripciones no mencionan métricas cuantitativas de validación. Lo que se repite es una herramienta usable con datos de NASA y una validación visible (inferencia).
- **¿Un ×2.8 impresiona?** Solo, no mucho: a un evaluador experto de NASA le va a sonar a "simulación propia con tu propio modelo" (inferencia). Lo que suma puntos en Validity es mostrar el control que la mayoría de los equipos no hace: la validación con cráteres reales ocultos y lo que no funcionó.
- **Formato que conviene (inferencia):**
  1. **Contrafáctico de la misma caminata:** dos mapas lado a lado con las mismas 8 h y los mismos 8 km. A la izquierda la grilla, a la derecha IceWalk. Las estaciones se van revelando con animación y un contador: "puntos con hielo: 0 contra 1".
  2. **Contador de campaña:** "EVAs hasta confirmar hielo: 5.6 contra 2.0", con barras de 89 contra 32 horas-persona de EVA. Traduce el porcentaje al recurso que le importa a NASA: el tiempo de tripulación con riesgo de EVA en rojo.
  3. **El mapa de ventaja:** de qué lado del sitio conviene IceWalk y de qué lado da lo mismo. Muestra la honestidad del "sin cráteres no hay ventaja" como función: la tarjeta de sitio dice "NO_GO / necesita precursor".
  4. **Una diapositiva de "lo que no funcionó":** maximizar información no le gana a la grilla, igual que en la literatura con presupuestos chicos. Muy pocos equipos muestran esto, y un jurado técnico lo premia en Validity.
  5. **La analogía con AEGIS:** "AEGIS demostró en Marte que elegir el blanco con datos rinde 93 % contra 24 %. IceWalk lleva esa idea a dónde para una tripulación". Es una comparación nuestra, no una afirmación de NASA.
- **Ajuste del lema (inferencia):** «We plan what to learn» queda débil si "aprender" es justo lo que no gana. Una variante: «NASA already plans routes. We plan where to look».

## 4. Objeciones fuertes y respuestas posibles

| Objeción | Qué tiene de cierto | Respuesta posible |
| --- | --- | --- |
| "Es una simulación con el mismo modelo que la evalúa" | Cierto, salvo el caso de verdad distinta, que solo probó más estructura | "Por eso la validamos con cráteres reales ocultos: el modelo no los ve, la estrategia elige y medimos aciertos reales" (requiere hacer la recomendación 2). Además, la sensibilidad a `rho` muestra cuánto de la ventaja es supuesto |
| "Toda tu ventaja sale de una correlación de 100 m que tu propia prueba no confirmó (p = 0.09)" | **Es la más peligrosa.** La ventaja depende de que un cráter informe sobre las celdas a 50-100 m | Mostrar la curva de ventaja contra `rho` (0, 0.25, 0.5, 0.8). Si en 0 da cero, decirlo: "si el hielo no tiene estructura, ningún plan le gana a la grilla, y IceWalk te lo dice". Si hay validación con datos reales, apoyarse en ella |
| "Un geólogo elegiría los cráteres someros a ojo" | Cierto en el caso fácil: "blancos" ≈ "potencial + incertidumbre" | Aizpurua 2015: el experto rinde ×5.3 y el modelo ×1.4 por encima del experto. Lo nuestro no reemplaza al geólogo: hace explícita su intuición con 349 cráteres, datos censurados y restricciones de caminata y regreso, en segundos y reproducible. Además da la probabilidad para decidir si vale salir y con qué herramienta. Sumar a la simulación una estrategia "geólogo" (los cráteres de fondo plano más someros al alcance) y mostrar el resultado aunque empate |
| "Sin cráteres no sirve" | Cierto: hábitat de 25 cráteres, sin ventaja | Es una función: lo dice antes de gastar una EVA (tarjeta de sitio, `INSUFFICIENT_DATA` o `NO_GO`) y convierte la falta de datos en un pedido de reconocimiento previo, que es lo que piden NASEM e I-MIM (`viabilidad-expediciones.md`) |
| "La capa resistente puede no ser hielo" | Abierto (`viabilidad-expediciones.md`) | La simulación cuenta aciertos de "capa a ≤ t", y por eso la EVA confirma la interpretación además de la profundidad. Decirlo en la diapositiva |
| "6 estaciones y 8 km son supuestos" | Cierto | Mostrar que la conclusión se mantiene con 4, 6 y 12 estaciones, o decir que no se probó. Los valores de NASA dan el techo (8 h, 2 km de regreso a pie) |
| "Una EVA no confirma nada que un rover no pueda" | Cierto en buena parte (`viabilidad-expediciones.md`) | El motor es agnóstico: el contador de campaña vale igual en "soles de rover" o "EVAs". La EVA es el caso con más costo por hora, y ahí más rinde elegir bien |
| "×2.8 sale de bases chicas y 60 mundos" | Cierto | Reportar la diferencia con su intervalo, más mundos y una métrica fijada antes (una sola primaria por herramienta), para que no parezca elegida a posteriori entre 7 estrategias y 3 métricas |
| "La EVA real no es en línea recta" | Cierto | Repetir un hábitat con la ruta A* del planificador, o declararlo como límite |

## 5. Cómo hacerlo más robusto y creíble antes del 14

### A. Validación con cráteres reales ocultos (la prueba central)

Idea: el modelo no ve un subconjunto de los 349 cráteres; una estrategia elige cuáles visitar entre esos ocultos, y se cuentan los aciertos reales.

1. **Pliegues:** reusar los 5 bloques de 2 km de `covariate_test.py` (96, 93, 62, 62 y 36 cráteres), que evitan filtrar la información de los vecinos. También se puede sacar un 20 % al azar como contraste.
2. **Candidatas = cráteres ocultos dentro del radio de caminata de un hábitat** (no la grilla de 100 m, porque solo ahí se conoce la verdad). Se usan los mismos hábitats y, mejor todavía, 20-50 hábitats al azar dentro de cada pliegue.
3. **Verdad con t = 1 m:** acierto si el cráter tiene fondo plano y `d` ≤ 1 m (29 de los 48 fondos planos lo cumplen, según `viabilidad-expediciones.md`). Los cráteres sin fondo plano con `0.2 × D` ≥ 1 m (D ≥ 5 m) son errores seguros. Los de D < 5 m son ambiguos: se reportan con cota optimista y pesimista. Con t = 3 m, la censura deja muchos ambiguos, así que va como análisis secundario.
4. **Estrategias:** potencial + incertidumbre y blancos, con el GP ajustado solo con los cráteres de entrenamiento y actualizado con lo que revela cada visita. Contra repartida (grilla) y azar sobre el mismo conjunto, con el mismo presupuesto de distancia.
5. **Control de permutación:** mezclar 200 veces las profundidades entre los cráteres ocultos, manteniendo las posiciones, y recalcular la ventaja. Da un p-valor contra "el mapa no sabe nada".
6. **Control por tamaño:** los secundarios vecinos se parecen en `D`, y `D` condiciona la censura. Hay que comparar contra un modelo que use solo `D` y mostrar que el GP agrega algo por encima. En el terreno, una celda que no es cráter no tiene `D` (inferencia).
7. **Versión más simple, presentable en una diapositiva:** dejar afuera un cráter (o un bloque), predecir `P(d ≤ 1 m)` con el resto y calcular el AUC y la calibración. "Sin ver un cráter, el mapa lo ordena bien un X % de las veces". Con 29 positivos, el error estándar del AUC es de ~0.05, así que un AUC de ~0.6 o más ya se distingue (cálculo propio aproximado).

**Riesgo a declarar (inferencia):** con estructura débil y no significativa, esta prueba puede dar una ventaja chica o nula. Igual hay que correrla: un nulo con datos reales es un resultado, y es mejor que lo encuentre el equipo antes que el jurado.

### B. Otros controles

- **Sensibilidad a `rho` y al alcance:** `rho` en 0, 0.25 y 0.5, con alcance de 50, 100 y 200 m. Es la curva que responde la objeción más fuerte.
- **Estrategia "geólogo":** los cráteres de fondo plano más someros al alcance y después repartir.
- **Campaña de varias EVAs** desde el mismo hábitat, sin repetir celdas, para medir las EVAs hasta confirmar en vez de suponer independencia.
- **Más mundos** (60 a 300) y una métrica primaria fijada de antemano: `any_hit` con 1 m y `hits` con 3 m.
- **Mapa de ventaja** con 50-100 hábitats al azar: qué fracción del sitio gana y cuánto. Sirve como control y como imagen.
- **Ruta A* real** en uno de los hábitats.

## Recomendaciones concretas y su costo

Los costos son estimaciones nuestras (inferencia).

| # | Recomendación | Costo | Por qué |
| --- | --- | --- | --- |
| 1 | Sensibilidad a `rho` (0, 0.25 y 0.5) y estrategia "geólogo" en `simulation.py`; registrar en `EXPERIMENTS.md` aunque dé cero | 2-4 horas de código, más cómputo | Responde las dos objeciones más fuertes y dice si el ×2.8 es un supuesto o un hallazgo |
| 2 | Validación con cráteres ocultos: AUC y calibración con validación cruzada por bloques, más la EVA sobre cráteres ocultos con control de permutación | 0.5-1 persona-día (GP) | Es la única prueba con datos reales. Sube Validity más que cualquier otra cosa |
| 3 | Simular la campaña de varias EVAs (EVAs hasta confirmar, sin suponer independencia) y pasar el resultado a horas-persona de EVA con la tabla D-9 | 2-4 horas | Da el número operativo del pitch ("5.6 contra 2.0 EVAs") con respaldo propio y no con una fórmula |
| 4 | Diapositiva y demo contrafáctica: misma caminata, dos planes, contador de campaña, mapa de ventaja y una lámina de "lo que no funcionó", con intervalos | 1 persona-día (Frontend y Producto) | Es el formato que se entiende en 30 segundos; muestra honestidad y el mecanismo |
| 5 | Ajustar el mensaje: de "×2.8" a "+32 puntos [IC] en la misma caminata, donde hay cráteres; donde no, te dice que no vale"; lema «We plan where to look»; analogía con AEGIS | Horas (Producto) | Evita prometer más de lo validado y cambia la debilidad por una función |

Orden sugerido: 1 y 2 el 9-10 de noviembre, y 3 a 5 una vez que se sabe si la ventaja sobrevive.

## Qué no se pudo abrir o verificar

- La guía vigente de Judging & Awards de spaceappschallenge.org (error de certificado TLS con WebFetch y curl; no se desactivó TLS) ni su copia en web.archive.org (bloqueada). Se usó la guía de 2022.
- El paper de Francis 2017 en *Science Robotics*: las cifras de 93 % y 24 % salen de la página del proyecto en JPL. No se verificó Verma 2020.
- Le Lay 2010 y la ficha de Guisan 2006 en serval o iris (pedían captcha). Guisan se leyó por el resumen en UNIGE; Le Lay quedó como no verificado.
- La tesis de Thompson 2008 (PDF de más de 10 MB), el IROS 2017 de Candela (sin cifras en las fichas), las cifras de Edelson 2020 y el MODSIM de Brown 2011 (sin texto extraíble).
- Una tasa de acierto de perforación dirigida contra grilla en minería o en hielo, de fuente sólida: no la encontramos. Las cifras de la prensa minera son débiles.
- El tiempo de preparación y post-EVA en Marte: NASA lo deja como trabajo pendiente.
- Si las 27 h por semana de la tabla D-9 son por persona o por equipo.
- Los videos y las páginas de proyecto de los ganadores de 2025.

## Fuentes

| Fuente | Para qué | URL |
| --- | --- | --- |
| AEGIS, página del proyecto en JPL | 93 % contra 24 %, 86 % contra < 20 %, usos, sílice del sol 910 | https://superintelligence.jpl.nasa.gov/public/projects/aegis |
| JPL 2017, nota de AEGIS | Línea de base "la mitad suelo" | https://www.jpl.nasa.gov/news/laser-targeting-ai-yields-more-mars-science |
| Lawson et al. 2024, PIXL | Muestreo adaptivo en Perseverance | https://arxiv.org/abs/2405.14471 |
| Kodgule, Candela y Wettergreen 2019 | No miope contra paso fijo y azar | https://ar5iv.labs.arxiv.org/html/1904.12255 |
| Arora et al., FSR 2018 | "At least as well as coverage" | https://opus.lib.uts.edu.au/handle/10453/127742 |
| Arora et al. 2017/2019, arXiv | Percepción activa con datos de MVP | https://arxiv.org/abs/1712.09716 |
| Mern y Caers 2023, GMD | Perforación secuencial: 7-10 contra 16 | https://gmd.copernicus.org/articles/16/289/2023/gmd-16-289-2023.html |
| Guisan et al. 2006 | ×1.8 a ×4; hasta 70 % menos tiempo de campo | https://archive-ouverte.unige.ch/unige:19297 |
| Le Lay et al. 2010 | De 0 a 50 %; el doble (no verificado) | https://serval.unil.ch/notice/serval:BIB_CB43008622FD |
| Aizpurua et al. 2015 | Modelo, experto y estratificado: 95, 72 y 11 | https://cra.wallonie.be/uploads/2018/03/TAP_659_-_Aizpurua_et_al__-_2015_-_Reconciling_expert_judgement_and_habitat_suitabili.pdf |
| Hariharan et al. 2013 | Muestreo adaptivo por conglomerados contra azar simple | https://arxiv.org/abs/1304.2460 |
| Brady et al. 2019, BASALT | Estaciones elegidas por imagen | https://pmc.ncbi.nlm.nih.gov/articles/PMC6442241/ |
| Beaton et al. 2019, BASALT-2 | Nueve días con una EVA de ~4 h por día | https://pmc.ncbi.nlm.nih.gov/articles/PMC6442238/ |
| EVA-EXP-0042 Rev. B, xEVA Con Ops | Tabla D-9 de Marte, cadencia lunar, TBD de Marte | https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf |
| EVA-EXP-0075, Coan 2020 | Artemis fase 1: 2-5 EVAs, 6±2 h | https://ntrs.nasa.gov/api/citations/20200001071/downloads/20200001071.pdf |
| Evidence Report, EVA Risk 2022 | 24 h por semana; 0.26 lesiones por EVA; riesgo rojo | https://ntrs.nasa.gov/api/citations/20220004017/downloads/2021%20EVA%20Injury%20Evidence%20Report%20Final.docx.pdf |
| Mularski y Alpert, ICES-2017-333 | 124 horas de tripulación de preparación por EVA en la ISS; USD 3.9 M por día | https://ntrs.nasa.gov/api/citations/20170003938/downloads/20170003938.pdf |
| Space Apps 2022, guía de evaluación | Criterios y premios | https://spaceapps-prod.s3.amazonaws.com/media/documents/Space_Apps_2022_Judging_and_Awards_Guide.pdf |
| NASA, ganadores 2025 | SpaceGenes+, PureFlow y otros | https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/ |
| Space Apps, guía vigente (no abierta) | Criterios actuales | https://www.spaceappschallenge.org/resources/judging-awards-guide |
