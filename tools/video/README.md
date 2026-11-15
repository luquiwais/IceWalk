# IceWalk — video

Proyecto Remotion y Blender. Fuente editorial: [docs/submission/video](../../docs/submission/video/README.md).
Estado: animatic global de 708 frames a 24 fps, pantallas, pruebas de composición
y escena 3D incompleta. Sin voces finales, película final ni composición local.
La producción está pausada por pedido de Eitan.

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

## Límites pendientes

El animatic conserva placas IA y placeholders anteriores: no implementa todavía
la puesta de producción vigente. El 3D tenía costuras, problemas de bruma, cámara
dentro del traje y sol fuera de cuadro, sin cierre verificado. Quitar logos sigue
pendiente. Cada recurso NASA requiere revisar créditos antes del uso final.
Las referencias ajenas son solo para análisis. No publicar `assets/` completo.
