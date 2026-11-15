# IceWalk — producción en curso

## Versión 2 (15/11, Claude): composiciones `GlobalFilm` y `LocalFilm`

Reemplazan a `Global` y `Local` (que quedan registrados solo como referencia).

| Pieza | Cómo | Estado |
| --- | --- | --- |
| Set de Marte | `blender/v2/mars.py`: DTM HiRISE del sitio, 364 bloques reales, regolito PBR con subdivisión adaptativa, cielo y perspectiva aérea | Hecho; Cycles |
| Astronautas | `blender/v2/actor.py`: esqueleto de 21 huesos sobre el Z2, pesos suaves, mocap CMU retargeteado, IK de manos, pies plantados | Hecho |
| Taladro | `blender/v2/props.py`: taladro de testigo ilustrativo, polvo y detritos | Hecho; no es hardware certificado |
| Planos | `blender/v2/shots.py`: órbita (MRO), taladro, corte del subsuelo, consola amplia, revisión, subjetiva, caminata | Render final en cola |
| Montaje | `src/v2/`: 2,39:1, subtítulos en barra, UI real en monitores (corner pin por cuadro), HUD AR, mapas animados, campaña | Hecho; falta render final |
| Sonido | `scripts/sound_global.py` y `sound_local.py`: voces con radio y Quindar, viento real SuperCam, efectos y partitura sintetizados, −16 LUFS | Hecho; sin escucha humana todavía |
| Voces | Microsoft Neural (sin cambios) | Eitan las cambiará después (ElevenLabs u otra) |

Comandos (desde `tools/video`):

```sh
blender -b --python blender/v2/shots.py -- <shot> [--layout|--preview] [--still N] [--samples 48]
./scripts/encode_shots.sh                 # PNG -> public/v2/<shot>.mp4
uv run --with numpy --with scipy --with soundfile scripts/sound_global.py
uv run --with numpy --with scipy --with soundfile scripts/sound_local.py
python3 scripts/test_delivery.py          # 8 tests: datos, cuadros por plano, sincronía, subtítulos
```

## Versión 1 (14/11 noche, Codex)


Dirección corregida por Eitan: **sin filmación, sin clips ni placas Higgsfield**.
3D con modelos detallados, materiales PBR y animación real de personas, objetos y
cámaras. Archivo NASA solo como contexto claramente rotulado. Voces naturales.
Las pruebas actuales todavía no alcanzan el acabado final pedido.

## Material y herramientas

- Blender: `tools/video/blender/cinematic.py`, escena base HiRISE y modelos NASA.
  Consola física con monitores, teclado, metal, goma, luz cálida y rebote de pantalla.
- `rig_walk.py`: esqueleto de 13 huesos por Z2, skinning y caminata de prueba.
  Falló el heat weighting: se sustituyó por pesos anatómicos explícitos. Se valida
  deformación real de la malla, no solo desplazamiento del personaje entero.
- Suelo: DTM continuo, texturas Poly Haven, mapas de relieve y roughness. La prueba
  aún tiene reflejos y aspecto sintético: seguir corrigiendo antes de darla por final.
- Taladro: primeras primitivas descartadas como acabado. Se prueba un conjunto
  ilustrativo con modelo NASA Pistol Grip Tool y tubo adaptado; **no representa un
  taladro certificado ni prueba capacidad de muestreo del PGT**. Orientación,
  detalle y texturas siguen en revisión. Modelo de guante descargado para estudio.
- Remotion en Node: `bun run dev -- --no-open --port=3100`. Bun ejecutando el servidor
  directamente fallaba por `stream.unref`; Node resuelve el fallo sin cambiar versiones.

## Estado de las piezas

| Pieza | Hecho | Falta |
| --- | --- | --- |
| Global, 29,5 s | Timeline rehecho sin Higgsfield, datos, rótulos y voces neuronales | Predominan fondos estáticos: integrar tomas animadas y revisar estética/ritmo |
| Local, 180 s | Timeline nuevo, 14 bloques, datos y dos insertos NASA rotulados | Revisión visual completa, cortes, actuación sonora y animación definitiva |
| Consola | Prueba Cycles 1080p y composición con esquinas proyectadas por Blender | Prueba de cámara 3D y tracking por frame implementada; falta extender y pulir |
| Astronautas | Rig, deformación validada y primeros 72 frames de prueba | Apoyo de pies, deslizamiento, pose, caminar con herramientas e interacción |
| Taladro | Materiales físicos y pruebas de modelo con fuente NASA | Giro/parada y cámara probados; falta mayor fidelidad de modelo e interacción |
| Voces | Andrew/Guy en inglés; Tomás/Elena en español argentino, sin `atempo` | Escucha crítica, interpretación y mezcla final; no son voces humanas grabadas |

## Fuentes del local

- CHAPEA Facility Resource Reel, NASA JSC, sin audio: fragmento 160–166 s, rotulado
  como hábitat análogo en la Tierra. Fuente y crédito en los metadatos originales.
- Desert RATS, NASA GSFC, 2010: fragmento 112–117 s, sin audio original y rotulado
  como ensayo terrestre, no misión IceWalk.
- Los insertos están en `tools/video/public/nasa/`, ignorados por Git. Modelos y
  originales en `assets/`. No hubo generación de imágenes ni clips con IA.

## Pruebas disponibles

Tres clips de 72 frames: consola y taladro 1920×1080; caminata 960×540 con
rig y cámara. Integrados en las maquetas, manteniendo el frame final cuando el
bloque es más largo. [WalkRigProof](http://localhost:3100/WalkRigProof) permite
ver el ciclo aparte. Lint, TypeScript, build y cuatro checks de entrega pasan.
No se verificó de oído toda la mezcla ni se aprobó el acabado visual.

## Criterios antes de exportar

1. Ningún asset Higgsfield en composiciones registradas (prueba automatizada).
2. Datos y reloj conservan el episodio congelado. En tránsito, sin reloj numérico
   hasta validar el regreso desde la posición actual.
3. Revisar realismo a tamaño de entrega, no solo en miniatura: anatomía, contacto,
   textura, escala, roughness, sombras, profundidad de campo y continuidad.
4. Animación de cámara y rig suave, sin pies flotantes, interpenetraciones ni saltos
   por loops cortos. No presentar las pruebas de movimiento como planos terminados.
5. Voz natural: sin acelerarla para tapar un guion que no entra. Si hace falta,
   recortar palabras o mover el corte, respetando los límites 29,5/180 s.
6. Revisar derechos/créditos por recurso, declaración de herramientas y legibilidad.

La preview de trabajo está en [Global](http://localhost:3100/Global) y
[Local](http://localhost:3100/Local). Todavía no hay exportaciones finales.
