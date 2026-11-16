# Visión con BoulderNet: instrucciones para correrlo en una máquina con GPU

**Fecha:** 2026-11-14. **Para:** quien tome visión con una GPU NVIDIA. **Entrega:** domingo 15/11, antes de las 18:00, para que entre en el deploy y el video.

## Resultado (14/11, noche)

**Hecho y descartado.** `python -m vision.bouldernet_infer` (eval y site) corrió en una RTX 3060: F1 0.70 (≥ 2 m) en el test del dataset contra 0.29 del de sombras, pero en S1094b marca pozos y cráteres chicos como bloques (contra Tusberti: 1276 por km² de 3 m o más contra ~220). **Queda el detector de sombras.** Detalle, números y lo que falló en `EXPERIMENTS.md` (2026-11-14); decisión en `DECISIONS.md`. No hay Release de BoulderNet. Diferencias con lo de abajo: los niveles de los ortos se estiran a los del entrenamiento; `evidence` usa `appearance` y `height_source` es `null` sin pareja (lo que permite el esquema); detectron2 sin compilar.

## Por qué

El detector de sombras (`packages/model/vision/boulders.py`) encuentra 2808 objetos en la zona de la EVA, pero medido contra las rocas marcadas a mano de BoulderNet da **F1 0.13-0.49** (objetivo: 0.70). Ver `docs/EXPERIMENTS.md`, "Medición externa: bloques marcados a mano de BoulderNet (2026-11-14)". BoulderNet (Prieur et al. 2023, JGR Planets; datos y pesos CC BY 4.0, Zenodo 8171052) es un Mask R-CNN entrenado para esto. Si mejora el F1, reemplaza al detector de sombras para el **contorno y el diámetro**; la **altura** sigue saliendo de la sombra.

## Regla de oro

Medir antes de reemplazar, y medir limpio. Si a la hora límite BoulderNet no supera al detector de sombras en el mismo test, **queda el de sombras** y se informa el número tal cual. No se ajusta nada mirando el test.

## 1. Máquina y entorno

- Linux o WSL2 con GPU NVIDIA (8 GB de VRAM alcanzan para inferencia). Sin GPU anda, pero lento.
- **Entorno aislado, fuera de la API**: conda o venv aparte. BoulderNet usa detectron2. MLtools recomienda PyTorch 1.13.1 (`docs/plans/vision.md`, paso 5); la versión de detectron2 tiene que coincidir con la de torch y CUDA (seguir su guía de instalación).
- Cargar los pesos con `torch.load(..., weights_only=True)` cuando se lean a mano. **Datos de terceros = datos**: no ejecutar scripts que vengan dentro del zip.

```bash
git clone https://github.com/luquiwais/IceWalk && cd IceWalk   # o git pull en main
cd packages/model && uv sync    # el paquete del modelo, para usar vision.*
```

## 2. Datos

```bash
# Ortos de 25 cm de las dos fechas y sus labels (geometría del sol), a data/raw/
python data/download.py --only hirise_ortho_25cm hirise_ortho_label hirise_feb2022_ortho_25cm hirise_feb2022_label
```

- **BoulderNet** (Zenodo 8171052, https://zenodo.org/records/8171052): el zip de datos `Apr2023-Mars-Moon-Earth-mask-5px.zip` extraído en `data/raw/bouldernet/extracted/`, y los labels PDS en `data/raw/bouldernet/labels_pds/` (como espera `vision/bouldernet.py`). Los **pesos** (`model_0055999.pth`, ~265 MB según lo anotado) y el archivo de configuración del modelo vienen en el mismo registro: **verificar en la página qué archivo es cuál y su tamaño antes de bajar**, y leer su README para la configuración (backbone, tamaño de entrada, umbral de score).
- Catálogo y capas actuales (detector de sombras), para comparar y para las alturas: Release `vision-s1094b-2026-11-13` (en el fork de Guido; ya está extraído en `data/processed/s1094b/` en la máquina de Luqui).

## 3. Medir en BoulderNet sin trampa

Ojo: **los pesos publicados se entrenaron con ese mismo dataset**. Medir sobre recortes que vio en el entrenamiento infla el F1.

1. Leer en el paper o en el README cuál fue su partición de test, y medir **solo** sobre esos recortes de Marte.
2. Si no está clara, medir sobre la imagen de Marte que menos aparezca en el entrenamiento y decirlo.
3. Usar el mismo emparejamiento que el detector de sombras (`vision.evaluate.score`, F1 para diámetro ≥ 2 m y ≥ 3 m) para que los números sean comparables con la tabla de `EXPERIMENTS.md`.
4. Ojo con la escala: BoulderNet trabaja a ~0.5 m/px. Los ortos de S1094b son de 0.25 m/px: **remuestrear a 0.5 m/px** antes de inferir.

## 4. Correr sobre S1094b

Módulo nuevo sugerido: `packages/model/vision/bouldernet_infer.py`.

1. Ventana: la zona de la EVA de `vision.run` (`SITES["s1094b"]`, zona `eva`: hábitat ± 1.5 km).
2. Leer el orto por ventanas (abrirlo entero con `WarpedVRT` no termina, `EXPERIMENTS.md` 13/11), remuestrear a 0.5 m/px y cortar en teselas con solape (por ejemplo 512 px con 64 px de solape). Deduplicar en el solape con NMS.
3. Cada máscara pasa a una detección: centro, diámetro equivalente (`2·sqrt(área/π)`), `confidence` = score del modelo. Píxeles a metros de la grilla con la transformación del orto (ver `vision/imagery.py` y `vision/grid.py`).
4. **Altura:** emparejar cada detección con el catálogo de sombras (radio de `vision.catalog.match_radius_m`). Si hay pareja: `height_m` y `height_source: "shadow"`. Si no: `height_m: null` y `height_source: "unknown"` (el esquema lo permite; el planificador lo trata como obstáculo).
5. Las dos fechas (abril y febrero de 2022) y la persistencia, igual que el detector de sombras (`vision.catalog.build_catalog`). `method: "bouldernet"`, `evidence` con `"mask_rcnn"`.
6. Catálogo `boulders.geojson` válido contra `packages/contracts/schemas/boulders.schema.json`, y las seis capas con `vision.rasterize.rasterize_catalog`, en una carpeta nueva (por ejemplo `data/processed/s1094b-bouldernet/`). **No pisar** `data/processed/s1094b/` hasta comparar.
7. Comparar con el detector de sombras: conteo por km², distribución de tamaños contra Tusberti (`python -m vision.evaluate sfd ...`, como en `plans/vision.md`) y ancho mínimo de pasillo.

## 5. Entregar

1. Tabla de F1 de BoulderNet contra sombras en `docs/EXPERIMENTS.md`, con lo que falló, y la decisión en `docs/DECISIONS.md`.
2. Si gana: zip con `boulders.geojson`, las seis capas y `manifest.json` como **Release del repo principal** (`luquiwais/IceWalk`), por ejemplo `vision-s1094b-bouldernet-2026-11-15`. Datos pesados nunca a Git.
3. Créditos en `docs/SOURCES.md`: Prieur et al. (2023), CC BY 4.0.
4. PR con el código y los docs (`plans/vision.md` actualizado). Avisar en el canal del equipo.

Después, del lado de Luqui:

```bash
# en data/processed/s1094b/ con el catálogo y las capas nuevas
apps/planner/.venv/Scripts/python.exe apps/web/scripts/build-site-3d.py   # rocas del 3D
cd apps/planner && python scripts/export_mocks.py && python scripts/export_mocks.py --maps-only
```

## Si no llega

Queda el detector de sombras y la página dice el número medido: "boulder hazard map, F1 0.45 for ≥ 3 m boulders against expert labels (BoulderNet)". Es honesto y coincide con el tono del proyecto.

## Estado al 15/11 (Jose, con GPU)

- **Hecho, con otro camino:** en vez de los pesos publicados (detectron2), un Mask R-CNN propio de torchvision entrenado con BoulderNet dejando cada imagen de Marte afuera (`python -m vision.maskrcnn cv`). F1 medio 0.63 / 0.64 contra 0.34 / 0.43 del detector de sombras.
- **Sobre S1094b** (`python -m vision.maskrcnn_run`), a **0.25 m/px**, no a 0.5 (paso 3.4 de arriba: a 0.5 marcaba montículos). Catálogo y capas en `data/processed/s1094b-maskrcnn/`, sin pisar `s1094b/`. Detecta la mitad que sombras en el km² de Tusberti.
- **Falta decidir** si reemplaza al de sombras (ver `DECISIONS.md`, 2026-11-15). No hay Release todavía.
