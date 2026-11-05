# Investigación: factibilidad de un recorrido

Última actualización: 2026-11-04. Conclusiones aplicadas en el PRD y en [`docs/plans/vision.md`](../plans/vision.md).

**Pregunta:** ¿cómo decide NASA si un recorrido es factible, qué tamaño de roca se puede sortear, y qué pesa el clima?

## Respuesta corta

- NASA tiene método: capa de exclusión, costo metabólico, consumibles, duración y regreso a un refugio.
- **No encontramos** fuente de NASA ni revisada por pares sobre qué tamaño, altura o densidad de roca sortea un astronauta caminando por terreno natural.
- Solución adoptada: **regla del pasillo**. Una celda se prohíbe solo si no queda un pasillo que la cruce.
- El clima define **cuándo** salir, no por dónde: va como ventana de EVA.

## Método de NASA

| Criterio | Valor | Condición | Fuente |
| --- | --- | --- | --- |
| Exclusión por pendiente | ±20° "no-go" | Lunar | ICES-2025-129 |
| Algoritmo | A* híbrido con heurísticas de elevación, gradiente y vuelco | Validado en la Tierra, n = 4 | ICES-2025-129 |
| Costo metabólico | Función de pendiente, velocidad, peso, carga y coeficiente de terreno | Correlación 0.95, piloto | ICES-2025-129 |
| Velocidad Apollo | V = −0.01θ + 0.75 m/s | Apollo 12 y 14 | ICES-2025-129 |
| Alcance a pie | 2 km del refugio, 16 km acumulados, ~2 km/h | Lunar; sin contar pendiente ni bloques | xEVA Con Ops |
| Regreso con rover | ~10 km (5 h a pie) | Falla del rover, lunar | xEVA Con Ops |
| Duración en Marte | 2-8 h | Tabla D-9 | xEVA Con Ops |
| Marte | Rangos de regreso y detalle de EVA | **Trabajo pendiente** | xEVA Con Ops |
| Caso Apollo 14 | Pendiente ≤ 15°; ≤ 2000 BTU/h; media ≤ 1600 BTU/h; regreso 1.7 km; 4 h | Paper del MIT, no regla oficial | Carr et al. 2003 |

## Rocas y escalones

| Dato | Valor | Tipo |
| --- | --- | --- |
| Escalón alcanzado, xEMU a 1/6 g | 43.4-76.5 cm | Con traje |
| Máximo recomendado | 12 in (~30 cm), extrapolado | Para hatches y plataformas |
| Rocas y relieve en sitio humano (I-MIM) | < 0.3 m | Aterrizaje y transitabilidad; tolerancias aún no conocidas |
| Campo de rocas de hasta ~0.9 m | 4.96 contra 5.18 km/h, p = 0.13 | Sin traje; densidad sin cuantificar |
| Perseverance | 40 cm | Rover; pasó por un resumidor |
| CFA (fracción de área cubierta) | Cortes en 7 y 15 % | Rover; leído de una figura |
| Pasillo | 1.02 m del hatch | Pasarlo a terreno es **supuesto nuestro** |

La medición confiable desde órbita arranca en ~1.5 m de diámetro, y por eso los 0.30 m no deciden nada desde órbita (inferencia).

## Clima y entorno

| Factor | Peso | Dato |
| --- | --- | --- |
| Temperatura | Alto | Superficie de S1094b, ~160-260 K, leída a ojo de un gráfico (Tusberti). Que el frío sea lo limitante viene de un resumen; el paper no se pudo leer |
| Polvo | Alto | Grandes tormentas de origen norte en Ls 180-240° y 305-350° |
| Radiación | Alto | Ya en el PRD, con DONKI |
| Luz | Medio | Afecta sombras y puntos de referencia |
| Viento | Bajo por sí solo | 20 m/s empujan ~4 N, ~1 % del peso. **Cuenta propia**, con densidad de 0.02 kg/m³ y 1 m² |

**No encontramos umbrales oficiales** de temperatura, viento ni polvo para una EVA en Marte.

## Clases del catálogo

`rock/ice/transient/unknown` mezclaba composición, tiempo y peligro. Quedó: `composition`, `form`, `persistence`, `confidence`, `evidence`, `height_source`. `route_effect` lo calcula el planificador.

Lo que no se ve desde órbita (capacidad portante, filo, cohesión, tracción) no se incluye.

## Sin verificar

MSL y Mars 2020 (0.55 m, 7 %), Golombek 2012, Posiolova 2022 completo, NASA-STD-3001 Rev. C, SEXTANT y AEGIS en el original, flight rules de Artemis, coeficientes de Pandolf, y el preprint sobre viento y astronautas.

## Fuentes

[ICES-2025-129](https://ntrs.nasa.gov/api/citations/20250001829/downloads/ICES%202025%20TraverseModel.pdf?attachment=true) · [xEVA Con Ops](https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf) · [Carr et al. 2003](https://web.mit.edu/aeroastro/www/people/dnewman/pdfs/DJN_paper3.43.pdf) · [ICES-2025-294](https://ntrs.nasa.gov/api/citations/20250004496/downloads/ICES2025-294-stepheight-final.pdf) · [I-MIM](https://science.nasa.gov/wp-content/uploads/2023/10/i-mim-mdt-final-report-31-aug-2022-final-hi-qual-copy-tagged.pdf) · [Rock Yard](https://www.kbr.com/sites/default/files/documents/2025-08/TechnicalJournal20242025_25.pdf) · [Ono 2018](https://wolfcry.net/assets/papers/2018-Mars-2020-Surface-Mission-Performance-Analysis-Part-2-Surface-Traversability.pdf) · [Golombek 2021](https://authors.library.caltech.edu/records/d1t32-akr32/files/Earth_and_Space_Science_-_2021_-_Golombek_-_Rock_Size_u2010Frequency_Distributions_at_the_InSight_Landing_Site_Mars.pdf?download=1) · [Dundas 2025](https://elib.dlr.de/217100/1/1-s2.0-S0019103525002362-main.pdf) · [MEDA](https://arxiv.org/pdf/2109.04601) · [tormentas](https://lweb.cfa.harvard.edu/~hwang/publication/Wang15_dustseq.pdf) · [Mars Climate Database](https://trac.lmd.jussieu.fr/Planeto/export/971/trunk/UTIL/PYTHON/mcd/proto/index5.html)
