# IceWalk — referencias y límites de evidencia

Investigaciones realizadas por Codex y Claude el 14/11/2026; consolidadas sin
nueva revisión audiovisual. Se conservan los hallazgos útiles y sus límites.
Los análisis originales están respaldados fuera del repo. Guion vigente:
[script.md](script.md); realización propuesta: [production.md](production.md).

## Apollo 11 (IBM)

Referencia de Eitan: [film de IBM sobre su equipo de apoyo al alunizaje](https://www.youtube.com/watch?v=XPgtfOwuUGY),
publicado el 12/07/2019, 3:59 según el relevamiento de Claude. Es un film con
entrevistas y archivo, contado desde tierra; el lanzamiento ocupa un plano breve.
No se reutilizan planos, música ni audio. Derechos de IBM, sin licencia de
redistribución documentada.

Método: cuadros cada 3 s, 61 cortes detectados con ffmpeg, subtítulos automáticos
y perfil RMS. La mezcla no se escuchó; no se verificó instrumentación. Los
subtítulos tienen errores; timecodes aproximados, ±2 s.

| Tiempo | Observación del análisis | Aplicación al relato vigente |
| --- | --- | --- |
| 0:00–0:21 | Apertura que identifica una incógnita antes de explicar | Plantear desde el inicio qué no sabemos bajo la superficie |
| 0:21–1:28 | Contexto breve y personas del equipo de apoyo | El IV como protagonista emocional, sin entrevista corporativa |
| 1:29–2:05 | Revisión Go/No-Go, cifras y recurso limitado, expresados con calma | Ritual de revisión y GO para E03S25, usando cifras reales del episodio |
| 2:05–2:21 | Descenso de volumen, negro y resultado visto como sombra | Negro de diez frames en el local; sombra del taladro |
| 2:21–2:52 | Alivio contenido y regreso como preocupación | Microexpresión del IV y vuelta a la operación |
| 2:58–3:30 | Escala humana y paisaje como coda | Sombras largas y cierre que vuelve al encuadre inicial |

No trasladar el peligro de combustible del alunizaje a una urgencia inventada:
el reloj del episodio está en horas. No sugerir que el ordenador reemplaza la
decisión humana. La propuesta opcional de Tierra en el cielo (PIA17936) no fue
seleccionada ni verificada; no forma parte de producción. #88 quedó resuelta con
el guion v3; la lectura cronometrada sigue pendiente.

## Demos de Space Apps

Fuentes primarias localizadas: [ganadores NASA 2025](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/)
y [ganadores NASA 2024](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/).
La revisión visual efectiva abarcó dos demos. No se escuchó la mezcla sonora ni
se comprobó científicamente lo que los equipos afirman sobre sus productos.

| Caso | Evidencia observada | Aplicación o límite |
| --- | --- | --- |
| [PureFlow](https://www.spaceappschallenge.org/2025/find-a-team/pureflow2/?tab=project), [demo](https://youtu.be/hHUpo7bTVuc) | Muestreo en 0, 4, 8, 12, 16, 20, 24, 28 s; flujo de configuración → editor 3D → feedback → resultado | Hacer visible medición → actualización → revisión → indicación. No medir proporciones de planos a partir de ocho cuadros |
| [Resonant Exoplanets](https://www.spaceappschallenge.org/2025/find-a-team/resonant-exoplanets/?tab=project), [demo](https://www.youtube.com/watch?v=5fBB5YJpfwU) | Cuadros cada 4 s y subtítulos automáticos; problema, método, documentos y pantalla de producto | Mostrar contribución y evidencia. Métricas del equipo sin verificar; evitar texto técnico ilegible |
| [HerCode / A Solar Tale](https://youtu.be/1C9ueho9ero) | Página leída; reproductor no cargó | Sin análisis del montaje |
| [SpaceGenes+](https://drive.google.com/file/d/1nUliPCPSrPXtbi7LartC2WfROIni7pFv/view) | Archivo enlazado devolvió inexistente | Solo página del proyecto |
| [Twisters](https://drive.google.com/file/d/1LDaKDOHBKm3PxC03xcEJGfdybsVEwOTf/view) | PDF de seis páginas | No atribuir recursos de video |
| [Landsat Connect](https://www.youtube.com/watch?v=hipj00EOSDI) | Capturas se desviaron a una página ajena | No usar esas capturas como evidencia |
| SkyShield y WaterWise | Páginas antiguas sin demo accesible | Sin revisión de videos |

Los archivos de análisis están en `tools/video/assets/references/winning-demos/`,
solo locales e ignorados. No están autorizados para incorporarlos al corte ni
redistribuirlos. La muestra no permite inferir por qué ganaron, una fórmula para
ganar ni que otros equipos vayan a usar IA cinematográfica.

## Límites del episodio de IceWalk

- Mapas y plan son salidas del prototipo; la medición es ficticia. Congelados con
  sus hashes en `tools/video/fixtures/` y `public/data/data.json`.
- Sin hielo hasta 1 m no implica ausencia de hielo más profundo. El mapa estima
  hasta 3 m; la mediana de profundidad es estimación del modelo.
- Actualización local pequeña, cinco estaciones conservadas y recomendación de
  continuar. No se representa un desvío que no existe.
- Reloj válido en E03S24; en tránsito requiere retorno desde posición actual.
  La reserva ya está descontada; el margen mínimo futuro no es ese reloj.
- Campaña 3,32 → 1,16 es simulación, no eficacia demostrada con astronautas.
- Ventana ambiental de otra fecha: mostrar como módulo separado, con avisos y
  climatología análoga, sin armar una cronología falsa con el episodio.
- AR, radio, consola y hardware son concepto. Obstáculos vienen de imágenes
  orbitales procesadas, no de visión en vivo del casco.
- Pautas y fuentes de entrega consultadas en [el relevamiento](../../research/submission-brief-2026-11-14.md).
  Confirmar Drive y plazo local antes de entregar.
