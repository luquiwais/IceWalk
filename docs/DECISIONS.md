# Decisiones

Registro corto. Una línea por decisión: fecha, qué, por qué. El detalle vive en el PRD.

| Fecha | Decisión | Por qué |
| --- | --- | --- |
| 2026-10-28 | Sitio de demo: cráter S1094b (Amazonis). Plan B: Erebus Montes | Hielo confirmado a la latitud más baja; DTM HiRISE de 1 m disponible |
| 2026-10-28 | Objetivo: hielo a ≤ 1 m | Lo que detecta un espectrómetro de neutrones y se perfora a mano |
| 2026-10-28 | Entrada = STM con objetivos priorizados, sin tipos fijos | Práctica de NASA (BASALT, JETT3, Artemis III) |
| 2026-10-28 | Catálogo de herramientas configurable; el sistema recomienda, decide ciencia | Práctica de Artemis |
| 2026-10-28 | Modelo: prior regional + clustering + anomalías + GP local + detección de bloques | Probabilidad e incertidumbre; actualizable en ms |
| 2026-10-28 | Sin aprendizaje por refuerzo para rutas | Sin datos para entrenar; menos explicable |
| 2026-10-28 | Vistas: Planning (MVP), EV acotada (MVP), Science (extra) | El núcleo evaluado es el mapa con capas |
| 2026-10-28 | Monorepo, Apache 2.0, datos fuera de Git | Contratos en un lugar; reglas piden código abierto |
| 2026-10-28 | Grilla de 10 m, estaciones en 100 m, equirectangular centrada en el sitio | Ver PRD, Contrato de grilla |
| 2026-10-28 | Teaser sin integrantes en pantalla | Estética + regla de menores |
| 2026-10-28 | Globo/terreno: CesiumJS 1.133+ con `Ellipsoid.MARS`; Cesium Mars (ion) para el globo; DTM propio para el sitio | Soporte oficial de Marte en Cesium desde sept. 2025 |
| 2026-10-28 | Clima espacial: DONKI en `ccmc.gsfc.nasa.gov/DONKI-API/get/` (sin key) | La API de api.nasa.gov se migró el 30/9/2026 |
| 2026-11-04 | Visión solo orbital: se precalcula antes de la EVA sobre HiRISE, sin cámara del astronauta | Datos reales; no hay imágenes de astronautas en Marte; alcance acotado |
| 2026-11-04 | Detector: sombras como base y BoulderNet en paralelo; queda el mejor en un test congelado | Sombras da altura y es explicable; hay GPU para comparar |
| 2026-11-04 | Regla del pasillo: una celda se prohíbe solo si no queda un pasillo que la cruce; el ancho mínimo lo define Planificador, con `"assumption": true` (a acordar con Planificador) | No hay fuente de NASA ni revisada por pares sobre qué tamaño de roca sortea un astronauta |
| 2026-11-04 | Catálogo separado en composición, forma, persistencia y certeza; ausente en la última imagen no implica "desapareció" | El hielo puede quedar cubierto por un residuo (Dundas et al. 2025); `transient` mezclaba conceptos |
| 2026-11-04 | Factibilidad con el método de NASA: exclusión, costo metabólico, consumibles, duración y regreso | ICES-2025-129 y xEVA Con Ops |
| 2026-11-04 | Ventana de EVA: temperatura, viento, polvo, luz y clima espacial definen cuándo salir, no por dónde | Varían poco dentro del sitio; umbrales como supuesto |
| 2026-11-04 | Visión suma formas del terreno y zonas; anomalías queda opcional | Aportan al GP y al plan; las anomalías no tienen contra qué validarse |
| 2026-11-04 | Grilla corregida: centro en el cráter (35.1105°N, 189.8273°E), radio de HiRISE, caja de 6.56 × 11.63 km | El centro anterior quedaba a ~1.8 km del cráter |
| 2026-11-04 | Luqui toma el GP; visión pasa a otro integrante | Interés personal; el GP define la demo. Ver `docs/plans/` |
| 2026-11-04 | Persistencia de bloques cerca del cráter con ESP_077719 (feb 2023), no con ESP_083099 (abr 2024) | La imagen de 2024 tiene una franja sin datos sobre el cráter, también en color |
| 2026-11-04 | El GP modela la profundidad a la tabla de hielo con datos censurados, usando cráteres de fondo plano; plan B, modelo sí/no | En S1094b el hielo poroso empieza cerca de 1 m y el masivo a varios metros (Dundas 2023, Wójcicka 2025) |
| 2026-11-04 | `hirise_ortho_25cm` pasa de rol `cost` a `visual` | Es imagen cruda; a transitabilidad llegan las capas `boulder_*` |
| 2026-11-05 | El GP usa EP en lugar de Laplace | Laplace falló con las cotas y a veces ignoraba un "no"; EP iguala media y desvío de la respuesta exacta. Ver `EXPERIMENTS.md` |
| 2026-11-05 | El feedback de una medición no se reduce a sí/no; las ramas del plan no quedan simplificadas a `ice` / `no_ice` sin investigar antes cómo opera NASA | Pedido de Luqui: radar y taladro dan profundidad, y el taladro también da cotas |
| 2026-11-05 | Se propone a Planificador reemplazar las ramas por puntos de decisión con opciones ordenadas, recortados a las dos primeras estaciones y hasta 3 opciones. El contrato no cambia hasta acordarlo | Aprobado por Luqui como propuesta. NASA usa listas ordenadas, plazos y límites duros; no se encontraron árboles a nivel de EVA. Ver `research/decisiones-nasa.md` |
| 2026-11-05 | Un cráter sin fondo plano dice `d > 0.2 × D` (`NON_FLAT_RATIO = 0.2`) | Con 0.1, el 75 % de los cráteres con fondo plano no encaja con la regla; con 0.2, ninguno. Dundas 2023 presenta ambos valores |
| 2026-11-05 | La tabla de cráteres de Dundas 2023 es el catálogo inicial del GP; no hace falta mapear a mano para arrancar | Trae 349 cráteres en todo el sitio; marco comprobado contra la imagen y estadísticas reproducidas |
| 2026-11-05 | El modelo tiene que poder aplicarse a otras zonas: los valores de cada sitio quedan fuera del código | Pedido de Luqui; el PRD pide un pipeline replicable. Probar un segundo sitio sigue siendo opcional |
| 2026-11-04 | Excepción: `model/vision-contract` pasó a `main` por push directo, sin PR ni revisión | Decisión de Luqui para arrancar el GP desde `main`; `gh` no estaba instalado. La regla de PR sigue vigente |
| 2026-11-08 | Frontend en Next.js 16 (App Router) + Tailwind v4 + Base UI, con Bun como gestor de paquetes. Reemplaza React + Vite del PRD; Cesium se mantiene | Decisión del dueño de Frontend: deploy en Vercel y patrones de vercel-labs. Falta actualizar el PRD (cuestión 29) |
| 2026-11-08 | Estilo visual tipo visionOS: ventanas de vidrio, ornaments, el estado activado en blanco; color solo para alertas y estado | Preferencia del dueño de Frontend tras una ronda de referencias; sigue las guías de Apple y no choca con el PRD. Diseño todavía no tiene dueño |
| 2026-11-08 | Color de advisory: cian (`oklch(0.83 0.09 230)`), como supuesto; warning rojo y caution ámbar | No se encontró el color de advisory en una fuente de NASA; a revisar con Diseño |
| 2026-11-08 | Monorepo con moon 2.6.5, instalado en el repo como devDependency de Bun (`@moonrepo/cli` en `package.json` de la raíz), con su store en `.moon/home`; nada global | Pedido de Eitan: sin instalaciones globales. Se usa con `bun run moon ...` |
| 2026-11-08 | moon no descarga herramientas: usa el Bun y el Python del sistema. Bun 1.4.2 queda declarado en `packageManager` y CI lo usa | Fijar y descargar versiones con moon requiere proto en `~/.proto`, fuera del repo. El soporte de Python en moon todavía es inestable |
| 2026-11-08 | Proyectos de moon: web, planner, model y contracts, con las mismas tareas que ya existían | Un solo comando para todo el repo; no cambia el código de cada rol |
| 2026-11-08 | CI pasa a un solo job con `moon ci` (solo tareas afectadas, con historial completo de Git) | Más rápido y sin duplicar comandos entre CI y local |
| 2026-11-08 | Telemetría de moon apagada | No mandar datos de uso del repo a terceros |
