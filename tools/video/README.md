# IceWalk — video

Proyecto Remotion y Blender. Fuente editorial: [docs/submission/video](../../docs/submission/video/README.md).
Estado vigente v3: `GlobalFilm` exportado (708 cuadros, 29,5 s); `LocalFilm`
(4320 cuadros, 180 s) quedó pausado. Astronauta articulado, pantallas integradas
y voces Gemini Orus/Charon. Sin filmación ni material Higgsfield.
Preview en `http://localhost:3100/GlobalFilm` y `/LocalFilm`.
Studio y renders están apagados por pedido de Eitan. Antes de reanudarlos, leer
[el traspaso editorial y técnico](../../docs/submission/video/handoff-2026-11-15.md).

## Comandos

Desde `tools/video`:

```sh
bun install --frozen-lockfile
bun run dev
bun run lint
bun run build
```

Usa su propio `package.json`, `bun.lock` y `node_modules`; no participa en moon ni
en los workspaces Bun de la app. `build` compila a `out/bundle`, sin exportar video.
`remotionb` es el CLI de Rspack, ya usado por el proyecto original.

## Carpetas

| Ruta | Contenido | Git |
| --- | --- | --- |
| `src/` | Global, pantallas, corner pin, Three | Sí |
| `scripts/prepare_data.py` | Convierte fuentes del planificador e imágenes HiRISE | Sí |
| `blender/*.py` | Escena y cámaras W1, W2, P1 | Sí |
| `fixtures/` | Ocho fuentes JSON del episodio original, commit `2a633fb` | Sí |
| `public/data/data.json` | Números y hashes consumidos por Remotion | Sí |
| `public/site/*.json` | Metadata del sitio | Sí |
| `assets/` | Originales NASA, IA existente, PBR y referencias ajenas | Local, ignorado |
| `public/` (resto) | Imágenes, clips, modelos y heightmaps | Local, ignorado |
| `out/`, `blender/renders/`, `blender/*.blend*` | Animatic, capturas y pruebas 3D | Local, ignorado |

Inventario con rutas desde la raíz, tamaños, SHA-256 y procedencia:
[assets.json](../../docs/submission/video/assets.json). Ningún Release publicado.
Un clon limpio necesita recuperar los medios antes de compilar; el manifiesto no
es un descargador ni una autorización de redistribución.

## Episodio congelado

El guion usa las salidas de `2a633fb`, anteriores al pull. Los ocho JSON de
`fixtures/` coinciden con `public/data/data.json` → `sources`. Mantenerlos juntos;
no regenerar silenciosamente desde los mocks actuales. La medición es ficticia.

Para preparar un episodio nuevo deliberadamente, con Pillow instalado:

```sh
python3 scripts/prepare_data.py ../..
```

Eso reemplaza `public/data/` con datos de main y exige revisar guion, tiempos,
mapas y márgenes. No se ejecutó durante la reorganización. Blender usa rutas
relativas al proyecto; el `.blend` puede conservar rutas absolutas antiguas.
`~/Developer/icewalk-video` enlaza a este proyecto: una sola copia activa.

## Histórico v1: producción y QA

Estos comandos reproducen la primera maqueta. El flujo v3 vigente está en la
sección «Revisión del 15/11» de abajo; no regenerar las voces Microsoft para la
entrega actual.

```sh
python3 scripts/test_delivery.py
uv run --with edge-tts scripts/prepare_neural_audio.py
python3 scripts/prepare_audio.py
blender -b --python blender/cinematic.py -- console --motion
blender -b --python blender/cinematic.py -- drill --motion
blender -b --python blender/cinematic.py -- walk --preview
```

`prepare_neural_audio.py` requiere red para sintetizar las voces de catálogo;
`prepare_audio.py` mezcla esas tomas sin comprimirlas. Los archivos quedan locales.
Los PNG de animación están en `assets/renders/`; se codificaron a MP4 con ffmpeg
(24 fps, libx264) en `public/cinema/`. Los `.blend` originales no se sobrescriben.
El mapa y las capas siguen congelados; la migración a Node evita un fallo de
`stream.unref` de Studio bajo Bun.

## Límites de la primera maqueta (histórico)

Son pruebas, no un video terminado. Los clips 3D duran 3 s y se mantienen en el
último frame si el bloque dura más; hay que extenderlos para el local. El rig
necesita pulido de apoyo, deslizamiento y pose; los modelos, iluminación y
materiales todavía requieren revisión de realismo. La órbita es una maqueta de
zoom, sin la transición 3D final. Las voces son sintéticas naturales de catálogo,
no actuación humana grabada; falta escucha y dirección final.

## Revisión del 15/11: astronauta, voces y cobertura

Studio sigue en `http://localhost:3100/GlobalFilm`. La prueba del nuevo rig está
en `http://localhost:3100/AstronautProof`: modelo de LasquetiSpice con sus 91
articulaciones y skin originales, CMU retargeteado y materiales adaptados.
Licencia, procedencia y crédito completo en
[el registro del activo](../../docs/research/astronaut-assets-2026-11-15.md).

Las mezclas actuales usan Orus (narración/IV) y Charon (EV), voces masculinas
dirigidas por diálogo completo. No volver a ejecutar el generador anterior de
Microsoft para GlobalFilm/LocalFilm. `scripts/generate_directed_dialogue.py`
genera las tomas mediante Gemini Interactions; `align_dialogue.py` las alinea
con Whisper y `sound_global.py` / `sound_local.py` producen las mezclas. La clave
se lee del entorno o del `.env` ignorado; no forma parte del código.

```sh
blender -b --python-exit-code 1 --python blender/v2/validate_scene.py
blender -b --python-exit-code 1 --python blender/v3/render_shots.py -- drill
RENDER_REVISION=v3 zsh scripts/encode_shots.sh drill
python3 scripts/produce_v3.py
```

La validación comprueba contacto de ambas palmas durante 60 cuadros, avance y
giro visibles del taladro y movimiento del observador. Después de cambiar el
rig, volver a validar para regenerar `assets/scenes/drill-v3.blend`, que usa el
renderizador como escena base. La marcha se apoya contra el DTM; las texturas
de microrelieve siguen siendo ilustrativas.

`produce_v3.py` renderiza y codifica las tomas de `shot-manifest.json`, con
pantallas integradas en la geometría. Mantiene el montaje existente hasta que
estén completos todos los clips del nuevo montaje de cada película. Luego
instala las plantillas de `blender/v3/edit-templates`, verifica tipos, exporta y
ejecuta los tests de entrega. No sube archivos. Estado y logs:
`out/v3-production/status.json`. Si se modifica código de producción mientras
corre, se detiene para no mezclar esa modificación con la revisión en curso.

Los nuevos montajes eliminan los `hold` de personas y los intervalos de video
reutilizados dentro de cada película. Hasta que se activen, el test nuevo de
repetición/congelado señala deliberadamente los problemas del montaje anterior.
Las exportaciones requieren revisión visual y escucha antes de la entrega.
