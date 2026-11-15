# Astronauta articulado para el video — 15/11/2026

Eitan pidió un modelo más realista y con mejor esqueleto. Se descargó un candidato
con su rig original, sin volver a aplicar los pesos automáticos del Z2 de las
primeras tomas. Es una visualización de EVA, no hardware certificado para Marte.

## Activo seleccionado para pruebas e integración

- **Animated Astronaut Character in Space Suit Loop**, LasquetiSpice.
- Original: https://sketchfab.com/3d-models/animated-astronaut-character-in-space-suit-loop-8fe5c8d3365e4d87bb7bc253d53a64e1
- Autor: https://sketchfab.com/LasquetiSpice
- Licencia adjunta: **CC BY 4.0**, permite uso comercial con atribución.
- Copia pública descargada, conservando `license.txt`:
  https://huggingface.co/datasets/fernandotonon/QtMeshEditor-motion-corpus/tree/main/raw/sketchfab/Animated_Astronaut_Character_in_Space_Suit_Loop_8fe5c8d3
- Archivos locales: `tools/video/assets/third-party/lasqueti-astronaut/`.
  `source.json` conserva URLs, tamaños y SHA-256 verificados de los archivos.

Inspección del glTF y Blender: **91 articulaciones**, cuatro mallas con skin,
dedos con tres segmentos, segmentos auxiliares de torsión de brazos y codos,
mochila y accesorios articulados. Cuatro animaciones originales: `wave`,
`floating`, `idle`, `moon_walk`. Ocho mapas de textura (color, normales,
oclusión y specular/glossiness).

## Adaptaciones

- Se preservan skin y huesos del autor. Importación con heurística TEMPERANCE.
- La marcha lunar tiene demasiado tiempo en el aire para estas tomas. Se probó
  retarget de locomoción CMU sobre el rig original y corrección de altura de
  botas sobre el terreno; necesita revisión visual continua en el set final.
- Agarre del taladro: IK de dos segmentos hasta la muñeca, orientación de guante
  independiente y dedos flexionados alrededor del manillar. Validación en toda
  la secuencia, además de inspección de acercamientos.
- Blender aproxima el F0 de specular/glossiness importado con IOR 1000. Se cambia
  a IOR dieléctrico 1,46 para tela y carcasa, conservando color, normal y roughness
  convertidos. Tela con sheen y microrelieve; visor con shader metálico y máscara
  por texel para evitar bordes triangulares. Es una decisión artística, no una
  caracterización medida del traje.

La composición `AstronautProof` de Remotion permite ver el candidato aislado.
Que el modelo esté integrado en los scripts no implica que todos los planos
finales ya estén renderizados o aprobados visualmente.

## Crédito para acompañar las exportaciones

This work is based on "Animated Astronaut Character in Space Suit Loop"
(https://sketchfab.com/3d-models/animated-astronaut-character-in-space-suit-loop-8fe5c8d3365e4d87bb7bc253d53a64e1)
by LasquetiSpice (https://sketchfab.com/LasquetiSpice), licensed under CC BY 4.0
(https://creativecommons.org/licenses/by/4.0/). Materials, animation and poses
adapted for IceWalk.
