# Fuentes

Las reglas de Space Apps exigen citar toda fuente usada. Sumar acá cada dato, imagen, paper o librería nueva.

## Datos

| Dato | Fuente | Crédito / cita |
| --- | --- | --- |
| HiRISE DTM y ortoimágenes de S1094b | https://hirise.lpl.arizona.edu/dtm/ESP_073578_2155 | NASA/JPL-Caltech/UArizona |
| Mapas de consistencia de hielo SWIM | https://swim.psi.edu/SWIM4MIMProducts.php | Morgan et al. (2021) Nature Astronomy; SWIM (PSI/JPL) |
| Mosaico global CTX | https://murray-lab.caltech.edu/CTX/ | Dickson et al. (2024) Earth and Space Science; NASA/JPL/MSSS/The Murray Lab |
| Inercia térmica THEMIS | https://astrogeology.usgs.gov | Fergason et al. (2006) JGR; USGS / ASU |
| MOLA-HRSC 200 m | https://astrogeology.usgs.gov/search/map/mars_mgs_mola_mex_hrsc_blended_dem_global_200m | Fergason, Hare & Laura (2018) USGS |
| Catálogo de cráteres nuevos | https://zenodo.org/record/6604912 | Daubar et al. (2022) JGR Planets |
| Exposiciones de hielo | https://doi.org/10.5066/P9Y8FR1R | Dundas et al. (2021) USGS |
| Clima espacial | https://ccmc.gsfc.nasa.gov/tools/DONKI | NASA CCMC DONKI (acreditar a CCMC) |

## Ciencia y operación

| Tema | Fuente |
| --- | --- |
| S1094b: hielo a la latitud más baja observada | NASA/JPL, PIA25583; Posiolova et al. (2022) Science |
| Mapa geológico y bloques de S1094b | DPS 2023, https://baas.aas.org/pub/2023n8i300p03 |
| Conteo de bloques y pérdida de hielo en S1094b (vara de validación de visión) | Tusberti et al., póster INAF, https://indico.ict.inaf.it/event/2923/attachments/8535/17568/Filippo_Tusberti.pdf |
| Densidad de bloques de S1094b, feb y dic 2022 | arXiv 2608.02492, https://arxiv.org/pdf/2608.02492 |
| Detección de bloques por sombras | Golombek et al. (2008) JGR, doi:10.1029/2007JE003065; Hood et al. (2022) Earth and Space Science, doi:10.1029/2022EA002410 |
| BoulderNet: detección de bloques con Mask R-CNN (datos y pesos CC BY 4.0) | Prieur et al. (2023) JGR Planets; https://zenodo.org/records/8171052 |
| Prioridades científicas para humanos en Marte | National Academies (2025), A Science Strategy for the Human Exploration of Mars |
| Hielo limpio a < 1 m en latitudes medias | Dundas et al. (2021) JGR Planets |
| STM y planificación de EVA (BASALT) | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6442241/ |
| JETT3 / Artemis | https://ntrs.nasa.gov/api/citations/20230003806/downloads/Young.theintegration.poster.pdf |
| Catálogo de herramientas de Artemis | https://ntrs.nasa.gov/citations/20210000242 |
| Modelo de traverse y costo metabólico | ICES-2025-129, https://ntrs.nasa.gov/api/citations/20250001829/downloads/ICES%202025%20TraverseModel.pdf?attachment=true |
| Rangos de caminata, regreso y EVA en Marte | EVA-EXP-0042 Rev. B, https://ntrs.nasa.gov/api/citations/20205008200/downloads/EVA-EXP-0042%20xEVA%20System%20Con%20Ops%20Rev%20B%20Final%20dtd%2010192020_REF%20DOC.pdf |
| Reglas de evaluación de traverse (caso Apollo 14) | Carr, Hodges y Newman (2003) ICES 2003-01-2416 |
| Escalones y hatch con traje | ICES-2025-294, https://ntrs.nasa.gov/api/citations/20250004496/downloads/ICES2025-294-stepheight-final.pdf |
| Hielo de S1094b y eyecta | Wójcicka et al. (2025) JGR Planets; Dundas et al. (2025) Icarus |
| Profundidad del hielo por modelo térmico (no intentada en esta región, según Dundas 2023) | Piqueux et al. (2019) GRL |
| Estructura del hielo en S1094b: hielo poroso desde ~1 m y masivo en profundidad | Dundas et al. (2023) GRL, doi:10.1029/2022GL100747 |
| Origen del hielo excavado, 3.2-11 m | Wójcicka et al. (2025) JGR Planets, doi:10.1029/2024JE008875 |
| Revisión de indicadores de hielo en latitudes medias | Butcher (2022), https://eprints.whiterose.ac.uk/id/eprint/184536/ |
| Controles de estabilidad del hielo | Mellon y Jakosky (1993) JGR; Bramson et al. (2017) JGR Planets |
| Clima de Marte (candidata para la ventana de EVA) | Mars Climate Database, LMD, https://trac.lmd.jussieu.fr/Planeto/export/971/trunk/UTIL/PYTHON/mcd/proto/index5.html |
| Pendiente máxima 20° con traje | https://ntrs.nasa.gov/api/citations/20210000827/downloads/Exporation%20EVA%20Testing%20and%20Analogs%2020210000827.pdf |
| Walkback 10 km | Vos et al. (2007) SAE 2007-01-3133 |
| Reserva 20 % (Apollo 15) | https://www.nasa.gov/wp-content/uploads/static/history/alsj/19790073512_1979073512.pdf |
| AxEMU: EVA de 8 h | Axiom Space / NASA |
| DAN (~60 cm) | NASA photojournal PIA17762 |
| RIMFAX (≤ 10 m, 15-30 cm) | Hamran et al. (2020) Space Science Reviews |
| Dosis RAD 0.67 mSv/día | Hassler et al. (2014) Science |
| Regiones especiales | Kminek et al. (2010) Advances in Space Research (COSPAR) |
| Playbook, SUITS, NASA-STD-3001 | Ver sección Interfaz del PRD |

## Software

| Librería | Licencia |
| --- | --- |
| FastAPI, pydantic, uvicorn | MIT / BSD |
| CesiumJS | Apache 2.0 (Cesium ion: términos aparte si se usa Cesium Mars) |
| GDAL, rasterio | MIT / BSD |
