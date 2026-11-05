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
