# Plan del planificador y backend

**Dueño:** Planificador (mercho40). **Código:** `apps/planner/`. **Estado:** transitabilidad hecha el 2026-11-08; estaciones todavía mock.

## Qué hace

Recibe la STM, el catálogo y los mapas del GP, y devuelve el plan de EVA del contrato (`plan.schema.json`): estaciones, ruta, timeline, ramas, equipo y margen de regreso. Cada medición re-planifica. La API no cambia al reemplazar el mock.

## Piezas

| Pieza | Estado | Dónde |
| --- | --- | --- |
| Capas del terreno (elevación, pendiente máx./media a 10 m, rugosidad) | Hecho | `app/traverse/terrain.py` |
| Exclusión: pendiente > `max_slope_deg`, fuera del DTM, pasillo < 1.02 m (si hay capa de visión) | Hecho | `app/traverse/route.py` |
| Costo de caminar: tiempo con velocidad que cae con la pendiente | Hecho | `app/traverse/route.py`, `config/traverse.yaml` |
| Rutas y tiempo de regreso desde cada celda (Dijkstra uno a todos) | Hecho | `TraverseMap.route`, `TraverseMap.time_from` |
| Tramos reales en `/plan` y `/replan` | Hecho (estaciones mock) | `app/mock_planner.py` |
| Costo metabólico (Pandolf con gravedad) | Pendiente, cuestión 39 | — |
| Elegir estaciones con el GP: potencial + incertidumbre, por minuto, dentro del presupuesto | Siguiente | con `packages/model/gp` |
| Timeline, tareas EV1/EV2, equipo con masa | Mock | `app/mock_planner.py` |
| Ramas como puntos de decisión | Abierto, cuestión 23 | — |
| Ventana de EVA y DONKI en vivo | Pendiente | `app/main.py` |

## Próximos pasos

1. Selección codiciosa de estaciones sobre la subgrilla de 100 m: puntaje del GP (`scores(..., "potential_uncertainty")` o la función que acordemos con Luqui), factible si `t + tramo + estación + regreso + ingreso ≤ presupuesto`, con los tiempos de `time_from`.
2. `/replan` con el posterior actualizado por la medición (`gp.observations.from_measurement`).
3. Costo metabólico en el resumen del plan (cuestión 39).
4. Capas en GitHub Releases y carga al arrancar la API en el deploy.

## Cómo se corre

```bash
cd apps/planner && uv sync --extra dev        # instala también packages/model
cd ../..                                      # desde la raíz:
curl -o data/raw/DTEEC_073578_2155_073077_2155_A01.tif \
  https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_073578_2155_ESP_073077_2155/DTEEC_073578_2155_073077_2155_A01.tif   # 164 MB
cd apps/planner && uv run python -m app.traverse.terrain   # ~15 s: data/processed/s1094b/terrain_*.tif
uv run uvicorn app.main:app --reload
```
