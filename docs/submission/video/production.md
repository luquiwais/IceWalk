# IceWalk — producción: filmación, 3D y motion graphics

Plan vigente de producción (base v4, Claude), consolidado el 14/11 ART.
El [guion y storyboard](script.md) conserva voces y tiempos; las caras de superficie
pasan al operador filmado. **Propuesta pendiente de las tres decisiones de §9.**
Hay código, medios, animatic global y pruebas 3D; no hay video final.

## 1. La idea en una línea

**La emoción la ponen personas reales en el hábitat; el lugar, el terreno real en 3D; los números, IceWalk.** En superficie nadie necesita cara: es el sitio, el sol bajo, las sombras y las herramientas. Es la lección de la [referencia Apollo](references.md#apollo-11-ibm): la tensión la carga quien espera en la base.

## 2. Las cinco fuentes

| Fuente | Qué aporta | Para qué sirve | Para qué no |
|---|---|---|---|
| **A. Filmado por el equipo** (celular, 4K 24 fps) | Una persona real como IV en una pieza a oscuras, con auricular, frente a un monitor que muestra la interfaz real | Toda la consola: caras, manos, dedo quieto, confirmación, radio. Pantallas legibles sin componer | Superficie de Marte |
| **B. 3D del sitio real** (Blender, EEVEE) | Terreno HiRISE de S1094b (DTM 2 m y 6 m), ortoimagen real, rocas en las posiciones detectadas por nuestra visión, texturas PBR CC0, trajes Z2 y hábitat HDU de NASA 3D Resources | Planos generales a contraluz, subjetivo caminando a E03S25, subida a la órbita y bajada, ruta y estaciones sobre el terreno | Primeros planos de personas: los modelos no tienen esqueleto y están en pose fija |
| **C. Material real de NASA** (dominio público) | HiRISE; panorámicas de Perseverance y Curiosity; reels de CHAPEA, xEMU y Desert RATS | Contexto «así ensaya NASA» en el local, cielo y suelo reales de referencia, órbita | Nuestros personajes ni nuestra estación: siempre rotulado como contexto |
| **D. Motion graphics con datos** (Remotion) | Pantallas de IceWalk desde `data.json`, AR, columna del subsuelo, transiciones mapa ↔ terreno, subtítulos, revelación | Siempre **dentro** de una escena (monitor filmado, visor sobre 3D). Solo solos en la órbita y la revelación final | Escenas de solo interfaz |
| **E. IA ya generada** (no se genera más) | Clip S02 del taladro (720p), cuadro F01 y referencias | El taladro que se detiene (G02, L01, L09); rotulado como IA | Nada nuevo |

### Reglas de realismo («que parezcan imágenes reales»)

1. **Luz física:** sol bajo (6–11°) a contraluz, sombras largas, cielo marciano butterscotch más claro en el horizonte, neblina por profundidad. Tono AgX de alto contraste.
2. **Cámara de verdad:** lentes de 24, 35 y 50 mm; profundidad de campo; movimientos lentos con micro temblor de cámara en mano; nada de vuelos imposibles salvo la subida a la órbita.
3. **Terminación de cine en Remotion sobre todo el material:** grano, viñeta, aberración cromática leve, brillo del sol (bloom) y una misma corrección de color, para que el 3D, lo filmado y la IA se vean de un mismo rodaje.
4. **Disimular los límites del 3D:** personas siempre lejos o en silueta a contraluz; en los primeros planos de superficie, manos y herramientas (clip S02), nunca caras 3D.
5. **Sin logos:** quitar el emblema de NASA y la bandera de las texturas del Z2 y del hábitat antes de renderizar.

## 3. Video global (29,5 s) — fuente de cada plano

| Plano | Frames | Imagen | Fuente |
|---|---|---|---|
| G01a | 0–48 | Por encima del hombro del IV, empuje hacia el mapa en su monitor | **A** + D en pantalla |
| G01b | 48–84 | El mapa se funde con la ortoimagen HiRISE y la cámara baja sobre el terreno real hasta E03S24; corte al taladro | **D → B** (bajada 3D) → **E** |
| G02a | 84–120 | El taladro se detiene; sombra sobre el punto; antebrazo con el registro | **E** (S02) + D |
| G02b | 120–168 | **Cambia:** la reacción la pone el IV. Su cara al oír «One metre. No ice.» | **A** |
| G03a | 168–204 | Dedo del IV quieto sobre el control | **A** |
| G03b | 204–240 | Subjetivo mirando el agujero; el visor dibuja la columna 0–1 m y la mediana 2,4 m | **B** (3D) + D |
| G04a | 240–300 | Mapa antes/después en el monitor, la mano pasa de uno a otro | **A** (pantalla real) |
| G04b | 300–360 | Mano sobre la revisión: 5 estaciones, continuar, confirma | **A** |
| G05a | 360–420 | IV de perfil por radio: «You're GO for station twenty-five» | **A** |
| G05b | 420–456 | Subjetivo caminando hacia E03S25 sobre el terreno real, AR con estación y reloj | **B** (P1) + D |
| G06a | 456–480 | **Cambia:** la mandíbula del IV se relaja | **A** |
| G06b | 480–516 | Plano general a contraluz: dos siluetas, sombras largas, el sol en cuadro | **B** (W1) |
| G07 | 516–600 | El IV se recuesta; en su segundo monitor, la cámara exterior muestra al equipo (el render W1) y en el tercero, la campaña | **A** + B en pantalla + D |
| G08a | 600–636 | Subida a la órbita sobre el terreno real → ortoimagen → mapa en el monitor → afuera de la pantalla | **B** (W2) → D → **A** |
| G08b–c | 636–708 | Mismo encuadre que G01a: revelación y marca; el último cuadro es igual al primero | **A** + D |

Cambio de guion: los dos primeros planos de cara en superficie (G02b y G06a) pasan al IV. Las voces y los tiempos no cambian.

## 4. Video local (3 min) — fuente por bloque

| Bloque | Fuente principal | Notas |
|---|---|---|
| L01 Hook | A → B → E | Igual que G01–G02 |
| L02 La pregunta | B (general) + A (consola) | Plano general del sitio con el hábitat a 200 m |
| L03 Entender el sitio | A (monitor con capas) + B (sobrevuelo del sitio con la capa de probabilidad proyectada sobre el terreno) | El 3D muestra que el mapa es de un lugar real |
| L04 Herramientas | A (ficha de herramientas en pantalla) + C (reel xEMU / Desert RATS, rotulado) | «Así se prueban los equipos en NASA» |
| L05 Plan | B (la ruta y las estaciones dibujadas sobre el terreno 3D, cámara aérea lenta) + A | Las rocas son las detectadas por nuestra visión: se puede decir |
| L06 Cuándo salir | A (ventana ambiental en monitor) + B (paso del sol y largo de sombras) | Rótulo «Ejemplo del módulo · otra fecha» |
| L07 Repartir tareas | C (CHAPEA / Desert RATS, rotulado) + A | Contexto real de operaciones análogas |
| L08 El reloj | B (P1) + D (AR) | Elipsis con cambio de luz en el 3D |
| L09 Reportar | E (S02) + A (IV) + B (columna AR) | El negro de 10 frames, sobre el visor |
| L10 Lo que aprendimos | A (monitor) | Cambio chico y local |
| L11 Decisión | A + B (P1) | «GO para la estación veinticinco» |
| L12 Confianza | A (IV) + B (W1) | |
| L13 Impacto | A (monitor con campaña) + B | |
| L14 Cierre | B (W2) → A | Bucle |

## 5. Lo que tiene que filmar el equipo (unos 20 minutos)

Una persona adulta como IV, ropa oscura lisa, auricular con micrófono. Pieza a oscuras con una lámpara cálida a un costado y la luz del monitor en la cara. Celular en 4K a 24 fps, en trípode o apoyado. En el monitor corren los videos en loop que renderizo (mapa antes/después, revisión, campaña, cámara exterior). Tomas: por encima del hombro con empuje lento; tres cuartos con el dedo sobre una tecla; perfil hablando por el micrófono; primer plano de ojos y mandíbula; manos sobre el teclado y el mouse; recostándose y mirando el segundo monitor. Lista detallada con encuadre y duración cuando se confirme.

## 6. Estado del 3D

- Ya funciona: `tools/video/blender/build_scene.py` arma la escena con el DTM y la ortoimagen reales, las rocas detectadas, las texturas PBR, los trajes y el hábitat. `shots.py` contiene W1, W2 y P1. Los tiempos medidos por Claude no constituyen una validación de los planos finales.
- Problemas encontrados, todavía sin verificación de cierre: uniones blancas entre capas de terreno, neblina que tapa la subida a la órbita, cámara subjetiva dentro del traje y sol fuera de cuadro.
- Pendiente: borrar logos de las texturas y hacer la bajada desde la órbita de G01b.

## 7. Créditos y reglas

- NASA: revisar los derechos y créditos de cada recurso según sus [pautas de uso de medios](https://www.nasa.gov/nasa-brand-center/images-and-media/). Crédito en pantalla o en la ficha, sin logos ni insinuación de respaldo. Revisar cada reel antes de usarlo.
- NASA 3D Resources (Z2, HDU, MRO): revisar términos por recurso; la eliminación de logos está pendiente, no completada.
- Poly Haven (texturas y rocas): CC0.
- HiRISE: NASA/JPL-Caltech/UArizona; DTM vía USGS Astrogeology (CC0).
- IA: solo S02, F01 y referencias. La marca «AI-generated» va solo sobre esos planos; el resto se rotula según su fuente («3D render of HiRISE terrain», «NASA analog footage»).
- La revelación final sigue siendo verdad: todos los números salen de `data.json`.

## 8. Tiempos estimados

| Trabajo | Quién | Tiempo |
|---|---|---|
| Videos en loop para el monitor | Producción | 20 min |
| Filmar el lado del IV | Equipo | 20–30 min |
| Planos 3D (W1, W2, P1, bajada, POV del agujero, ruta) | Producción | 2–3 h, gran parte de render desatendido |
| Grabar la voz en off y la radio | Equipo | 15 min |
| Montaje global y terminación | Producción | 1–2 h |
| Local | Producción | 2–3 h sobre lo anterior |

## 9. Decisiones que faltan

1. **¿Pueden filmar el lado del IV?** Quién actúa y con qué celular. Sin eso, el plan B es la placa del hábitat generada (R4) con las pantallas compuestas, que se ve bien pero no es real.
2. **¿Se mantiene el clip de IA del taladro (S02)?** Recomendación: sí, rotulado; no hay otra forma realista de mostrar el taladro deteniéndose.
3. **¿Se usa material de análogos de NASA en el local?** Recomendación: sí, poco y rotulado, para anclar «prácticas documentadas de NASA».

## 10. Ubicación y estado de los materiales

- Código y comandos: [tools/video/README.md](../../../tools/video/README.md).
- Archivos disponibles, hashes, procedencia y revisión pendiente: [assets.json](assets.json).
- Medios locales en `tools/video/assets/`, `public/`, `out/` y `blender/`; se ignoran los binarios. Ningún Release publicado.
- Referencias ajenas en `tools/video/assets/references/`: solo análisis, sin permiso de redistribución.
- Documentos anteriores respaldados fuera del repo; las decisiones vigentes están en [DECISIONS.md](../../DECISIONS.md).
- No hay tomas finales del IV, voces finales, montaje local ni renders finales. No reanudar producción por la sola existencia de estos archivos.
