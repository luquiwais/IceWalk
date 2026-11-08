# Plan del planificador y backend

**Dueño:** Planificador (mercho40). **Código:** `apps/planner/`. **Estado:** transitabilidad y planificador real hechos el 2026-11-08 (`app/eva_planner.py`); falta el catálogo de cráteres para que el mapa informe.

## Qué hace

Recibe la STM, el catálogo y los mapas del GP, y devuelve el plan de EVA del contrato (`plan.schema.json`): estaciones, ruta, timeline, ramas, equipo y margen de regreso. Cada medición re-planifica. La API no cambia al reemplazar el mock.

## Piezas

| Pieza | Estado | Dónde |
| --- | --- | --- |
| Capas del terreno (elevación, pendiente máx./media a 10 m, rugosidad) | Hecho | `app/traverse/terrain.py` |
| Exclusión: pendiente > `max_slope_deg`, fuera del DTM, pasillo < 1.02 m (si hay capa de visión) | Hecho | `app/traverse/route.py` |
| Costo de caminar: tiempo con velocidad que cae con la pendiente | Hecho | `app/traverse/route.py`, `config/traverse.yaml` |
| Rutas y tiempo de regreso desde cada celda (Dijkstra uno a todos) | Hecho | `TraverseMap.route`, `TraverseMap.time_from` |
| Tramos reales en `/plan` y `/replan` | Hecho | `app/eva_planner.py`; `app/mock_planner.py` de respaldo |
| Costo metabólico (Pandolf con gravedad) | Pendiente, cuestión 39 | — |
| Herramientas desde la STM; mínimo por rango; objetivos fijos; tareas en el mejor sitio; Get Aheads | Hecho | `app/eva_planner.py` |
| Elegir estaciones con el GP (potencial + incertidumbre, kriging believer) | Hecho | `app/eva_planner.py`, `app/ice.py` |
| `/replan` con las mediciones acumuladas en el GP | Hecho | `app/main.py` |
| Timeline, tareas EV1/EV2, equipo con masa | Hecho (masas del catálogo, casi todas null) | `app/eva_planner.py` |
| Ramas | Sobre la primera estación de hielo, re-planificando con el resultado simulado; forma final abierta (cuestión 23) | `app/eva_planner.py` |
| Ventana de EVA y DONKI en vivo | Pendiente | `app/main.py` |

## Próximos pasos

1. Correr con el catálogo real de cráteres (cuestión 42) y revisar el plan con Luqui.
2. Fijar `uncertainty`, `value` y los campos nuevos en el esquema (cuestión 41).
3. Reordenar la ruta al final para caminar menos (2-opt), sin perder factibilidad.
4. Costo metabólico en el resumen (cuestión 39); ventana de EVA y DONKI en vivo.
5. Capas en GitHub Releases y carga al arrancar la API en el deploy.

## Cómo se corre

```bash
cd apps/planner && uv sync --extra dev        # instala también packages/model
cd ../..                                      # desde la raíz:
curl -o data/raw/DTEEC_073578_2155_073077_2155_A01.tif \
  https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_073578_2155_ESP_073077_2155/DTEEC_073578_2155_073077_2155_A01.tif   # 164 MB
cd apps/planner && uv run python -m app.traverse.terrain   # ~15 s: data/processed/s1094b/terrain_*.tif
uv run uvicorn app.main:app --reload
```
