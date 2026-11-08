# Recursos de NASA y afines para S1094b, y aprendizaje automático para predecir hielo

Fecha: 2026-11-08. Sitio: S1094b, 35.1105°N, 189.8273°E (= -170.1727°E), grilla de ~6.6 × 11.6 km.

**Etiquetas.** **[D]** documentado: leído en la fuente o comprobado consultando el servicio. **[D-r]** documentado, pero solo por resumen, ficha o resumen de buscador. **[I]** inferencia nuestra. **[NV]** no verificado. **[C]** consulta o cálculo propio contra un servicio: el resultado es real, pero la interpretación es nuestra.

**Cómo se trabajó.** Mars Trek, USGS STAC, ODE, SWIM y Zenodo se consultaron por API con `curl` y Python. Los scripts están en `scratchpad\scripts\` (`trek_tiles.py`, `swim_sample.py`, `pdf2txt.py`), y las descargas chicas en `scratchpad\downloads\` (`trek\`, `swim_anc\` con 2.2 MB, y los PDF de Mars-Bench, Dundas 2021 y LPSC 2026). No se bajó ningún dataset grande. Para leer los rasters de SWIM se instalaron `numpy`, `tifffile` y `pyshp` en el venv del scratchpad. No se tocó el repo.

**Qué no se repite.** Las variables orbitales y su poder predictivo, la validación de SWIM y la literatura de permafrost y prospección minera ya están en `docs/research/viabilidad-expediciones.md` y en `modelos_previos.md`. Los indicadores de terreno a escala de sitio los investiga otro agente.

---

## Respuesta corta

### Tema 1: recursos

- **Mars Trek es un visor y no aporta datos nuevos de hielo para S1094b.** Su catálogo ecuatorial tiene 225 productos [C]. No hay capas de SWIM, ni de hidrógeno, ni DTM o mosaicos de HiRISE sobre S1094b [C]. El mosaico global de HiRISE llega hasta 2018 y no tiene teselas sobre el sitio. El mosaico CTX beta01 tiene un hueco justo en la tesela del cráter [C]. Sobre el sitio sí hay THEMIS día y noche, TES (inercia, albedo, polvo), MOLA, MOLA-HRSC, la geología de Tanaka 2014 (unidad `lAv`), una capa de 508 puntos con cráteres nuevos y con hielo, y zonas de exploración. Ninguna zona contiene al sitio: la más cercana, Acheron Fossae, está a ~252 km [C]. Las teselas son imágenes renderizadas, no valores físicos. La excepción es el `ImageServer` de MOLA, que devuelve -3946 m en el centro del sitio [C].
- **El hallazgo más útil no es Trek: es el STAC de USGS Astrogeology.** Lista **22 observaciones de HiRISE sobre el cráter, entre febrero de 2022 y septiembre de 2025**, como COG con licencia CC0 que se pueden recortar por HTTP sin bajarlas enteras [C]. El repo cree que la más reciente con el cráter cubierto es de febrero de 2023 (`docs/plans/vision.md`), pero el STAC lista 13 posteriores. Falta comprobar que tengan píxeles sobre el cráter [NV]. El paquete del DTM trae además el **mapa de error del DTM (FOM)** y ortos de julio, septiembre y octubre de 2022, que `layers.yaml` no tiene [C].
- **SWIM se puede bajar por script.** Las URL directas existen (`layers.yaml` dice «manual») [C]. Los anexos traen **10 rasters de formas del terreno a 3 km**. En el píxel de S1094b valen 1 los de cráteres expandidos, manto y terreno texturado, 0.615 el de polígonos y 0 los demás [C]. **S1094b cae dentro de las Reconnaissance Zones** de SWIM [C].
- **Lo que aporta algo que `layers.yaml` no tiene:** las HiRISE 2023-2025, el FOM y los ortos extra del DTM, los anexos y las RZ de SWIM con URL directa, la URL exacta de la inercia térmica de THEMIS (30N180E, 2.5 GB, dominio público), los productos de CRISM TRDR VNIR sobre el cráter (incluidos los de 2022), 4 pistas de SHARAD, la geología `lAv` y la capa de cráteres de Trek.

### Tema 2: aprendizaje automático

- **Hay bastante aprendizaje automático para detectar formas del terreno ligadas al hielo** (brain terrain, cráteres aterrazados, polígonos, cráteres nuevos, escarcha). **No encontramos ningún trabajo que entrene un modelo para predecir presencia o profundidad de hielo enterrado** a partir de esas señales. La búsqueda fue acotada [I]. La razón está escrita: SWIM combina datos con pesos supuestos «in absence of adequate ground truth», y su sucesor de 2026 usa inferencia bayesiana, no aprendizaje automático (Courville et al. 2026) [D]. **El dueño tiene razón en que está poco explorado, pero eso no es una oportunidad libre: es la falta de etiquetas.**
- **Etiquetas de hielo:** unos 48 sitios de impacto con hielo en todo Marte (Daubar 2022; Dundas 2021), solo 2 en la franja de 30-40°N de Daubar. Unos 25 sitios de escarpas, todos entre 50 y 61°. Y los 349 cráteres de Dundas 2023, todos en S1094b [D]. Con eso no se puede entrenar un predictor global de hielo que valga a 35°N. Aprendería latitud y el sesgo de observación por inercia térmica que documenta Wagstaff 2022 [I, apoyado en D].
- **Camino realista en 2 días:** detectar formas del terreno en el propio sitio con pocas etiquetas, usando un extractor preentrenado congelado de licencia permisiva (DINOv2 o SAM, Apache 2.0 [C]) más un clasificador lineal, y validar por bloques espaciales. El resultado va como `periglacial_landform_score` al GP, con peso declarado. Una sola prueba de «predicción directa»: regresar la profundidad censurada de los 349 cráteres contra esos embeddings. Si da nulo, se reporta. **Descartado:** YOLO de Ultralytics (AGPL [C]), el código y los pesos de brain terrain (el repo no tiene licencia [C]), DINOv3 (licencia propia [C], revisar) y un clasificador global entrenado con Daubar.

---

## Tema 1. Inventario de recursos

### Mars Trek: qué ofrece y cómo se consulta

**La API documentada.** Es [trekAPI.html?body=mars](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars). Las capas se sirven por **OGC WMTS REST** con la plantilla `https://{endpoint}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png|jpg`. La página toma la lista de capas por JavaScript desde `config/config.json` [D]. Los endpoints son estos [D]:

| Uso | Endpoint |
| --- | --- |
| Listar capas (Solr) | `https://trek.nasa.gov/mars/TrekServices/ws/index/eq/searchItems?start=0&rows=5000&facetKeys=itemType&facetValues=product` (también `np` y `sp` para los polos) |
| Servicios de una capa | `https://trek.nasa.gov/mars/TrekServices/ws/index/getLayerServices?uuid={item_UUID}` |
| Capacidades WMTS | `https://trek.nasa.gov/tiles/Mars/EQ/{productLabel}/1.0.0/WMTSCapabilities.xml` |
| Resumen y metadatos | `https://trek.nasa.gov/mars/TrekWS/rest/cat/abstract?label=` y `.../cat/metadata/fgdc/html?label=` |
| Vectores y rásteres crudos | ArcGIS REST: `https://trek.nasa.gov/mars/trekarcgis/rest/services/{servicio}/MapServer/{n}/query` y `.../ImageServer/identify` |

**Cuadrícula de teselas.** Es equirectangular, empieza en (-180, 90) y el nivel `z` tiene 2^(z+1) × 2^z teselas de 256 px [D, capacidades]. **HiRISE_Global y CTX beta01 no los sirve Trek:** sus capacidades apuntan a Esri, `https://astro.arcgis.com/arcgis/rest/services/OnMars/{HiRISE|CTX}/MapServer/tile/{z}/{row}/{col}`, con teselas de 512 px [C].

**El catálogo** tiene 225 productos ecuatoriales: 94 mosaicos de imagen, 40 DEM, 23 sombreados, 40 de pendiente, 8 de formas del terreno, mineralogía, 2 de zonas de exploración, geología, rugosidad, polvo e inercia [C]. Casi todos los DEM y mosaicos locales son de sitios de rovers, Valles Marineris, Deuteronilus, Jezero y Columbia Hills [C].

**Qué cubre S1094b.** Lo comprobamos con las cajas del catálogo y pidiendo teselas [C]:

| Capa de Trek | Cobertura | Resolución real del servicio | Comentario |
| --- | --- | --- | --- |
| `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018` y `..._DayIR_...` | Sí (tesela 200) | Nivel máximo 9, ~81 m/px | PNG de 8 bits para visualizar; para valores, usar el STAC o la PDS |
| `TES_Thermal_Inertia` | Global | Nivel máximo 1 en WMTS | Solo visualización; el dato de 3 km está en la PDS y en JMARS |
| `mola128_mola64_merge_90Nto90S_SimpleC_clon0` | Sí | 128 px/° (~463 m) | **`ImageServer` con valores S16**: `identify` en el sitio da **-3946 m** |
| `Mars_MOLA_blend200ppx_HRSC_DEM_...` | Global en el catálogo | - | Sus capacidades WMTS dan 404; usar la copia de USGS que ya está en `layers.yaml` |
| `HiRISE_Global` (Esri) | **No**: 404 en los niveles 10-17 y teselas vacías en los niveles 8-9 | Hasta ~0.16 m | El mosaico llega «through 2018» [D]; las imágenes del sitio son de 2022 en adelante |
| `CTX_beta01_uncontrolled_5m_Caltech` (Esri) | **Hueco en la tesela del cráter** en el nivel 11 (~10 m); las vecinas sí tienen datos | ~5 m | Para el sitio sirve el V01 de Murray Lab, que ya está en `layers.yaml` |
| `SIM3292_Global_Geology` (Tanaka 2014) | Sí, por `identify` | 1:20M | **Unidad `lAv`, «Late Amazonian volcanic unit»** |
| `RSLs_Gullies_New-IcyCraters_clon0` | Global, 508 puntos | Puntos | 365 cráteres nuevos (Daubar 2013), 22 «icy impact site» (Dundas 2014), 34 cárcavas activas, 27 de dunas, 26 RSL y 34 RSL dudosas. El sitio con hielo más cercano está en 39.1°N, 190.2°E |
| `EZMars` (zonas de exploración, 2015) | El sitio no cae en ninguna zona ni en su radio de 100 km | Polígonos | Acheron Fossae (39°N, 192°E) a ~252 km; Amazonis Planitia (46.16°N, 188.8°E) a ~655 km (distancias [C]) |
| TES (polvo, albedo, minerales), rugosidad de MOLA, MOC, Viking | Global | km | Visualización |

**Lo que Trek no tiene** [C]: SWIM, hidrógeno (MONS o FREND), DTM de HiRISE sobre el sitio, mosaicos locales de HiRISE o CTX sobre el sitio, ni CRISM sobre el sitio. Solo encontramos dos teselas de CRISM, en otras regiones.

**Licencia de Trek:** no encontramos los términos de uso [NV]. Los datos de origen son de NASA o PDS. Las teselas de Esri piden «Source: NASA/JPL/MSSS/Caltech Murray Lab/Esri» para CTX, y Murray Lab «grants free use of the beta01 version of the mosaic for all purposes» [D].

**Recorte por script:**
- Para rásteres con valores, como MOLA: `ImageServer/exportImage?bbox=...&format=tiff&pixelType=S16&f=image` [I: la operación es estándar de ArcGIS; solo probamos `identify`].
- Para imágenes renderizadas: armar las teselas con `owslib` o con `requests` y la plantilla WMTS. Para ver nuestro cálculo de índices, mirar `scratchpad\scripts\trek_tiles.py`.
- Para vectores: `MapServer/0/query?where=1=1&outFields=*&f=geojson` (probado con `f=json`) [C].

**Space Apps 2026.** El enunciado nombra «JPL's Mars Trek and the USGS-NASA Planetary Geologic Mapping Program», pero dice que están «built for regional and global views rather than the hyperlocalized areas astronauts will target». Sugiere además «at least three kinds of data» [D, snapshot de Wayback del 2026-11-01]. La pestaña Resources no está archivada y el sitio actual da error de certificado: no la pudimos leer [NV]. El enunciado avisa: «More resources may be added before the hackathon begins» [D]. Esto refuerza el posicionamiento del repo: Trek es contexto, no competencia [I].

### USGS Astrogeology STAC: el recurso más útil para el sitio

API: `https://stac.astrogeology.usgs.gov/api`. Colecciones de Marte: `mro_hirise_uncontrolled_observations`, `mro_hirise_socet_dtms`, `mo_themis_controlled_mosaics` y `mro_ctx_controlled_usgs_dtms`. Todas tienen licencia **CC0-1.0** [C].

**HiRISE sin controlar.** Un punto sobre el cráter (`bbox=189.82,35.10,189.83,35.12`) devuelve 44 ítems: **22 observaciones, cada una en RED y COLOR** [C]. La lista: ESP_073077 y ESP_073578 (feb y abr de 2022), 074989 (jul 2022), 075622 (sep), 075978 (oct, 50 cm), 076400 (nov, 50 cm), 076677 (dic), 076888 (dic), 077719 (feb 2023), 079776 (ago 2023), 081398 (dic 2023), 083099 (abr 2024), 084312 (jul 2024), 085591 (oct 2024), 086303 (dic 2024), 086659 y 086725 (ene 2025, 25 cm), 086870 (feb 2025), 087859 (abr 2025, 25 cm), 088360 (jun 2025), 088716 (jun 2025, 25 cm) y 089784 (sep 2025).
- Los COG pesan entre 0.36 y 1.96 GB. **El RED de ESP_089784 pesa 1.2 MB**: sospechamos que está vacío o roto [C].
- La ubicación tiene «uncertainty [...] around 100 meters», porque las imágenes no están controladas [D, metadatos].
- El STAC filtra por caja: que un ítem aparezca no garantiza píxeles sobre el cráter. ESP_083099, por ejemplo, tiene una franja sin datos ahí, según el repo [I].
- Los archivos de procedencia muestran que el origen es un espejo público de la PDS: `s3://asc-pds-mars-reconnaissance-orbiter/HiRISE/PDS3/RDR/...`, con `--no-sign-request` [D].

**El DTM controlado** (`DTEEC_073578_2155_073077_2155_A01`, 164 MB) viene con [C]:
- `DTFEC_..._A01.tif`, el **mapa de figura de mérito o error del DTM** (125 MB).
- El sombreado.
- 18 ortos en COG: RED e IRB (color) de ESP_073077 y 073578, y **ESP_074989 (jul 2022), ESP_075622 (sep 2022) y ESP_075978 (oct 2022)**, todos coalineados con el DTM.
- Ruta: `https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_073578_2155_ESP_073077_2155/`.

**THEMIS controlado:** `mc02_diacria_dir` y `mc02_diacria_nir` (día y noche) cubren el sitio como COG [C].

**CTX DTM de USGS:** no hay ninguno sobre el sitio [C].

**Recorte por script** [I: patrón estándar; el COG y los rangos HTTP están comprobados con `Accept-Ranges: bytes`]:

```python
from pystac_client import Client
import rasterio
from rasterio.windows import from_bounds

cat = Client.open("https://stac.astrogeology.usgs.gov/api")
items = cat.search(
    collections=["mro_hirise_uncontrolled_observations"],
    bbox=[189.79, 35.06, 189.87, 35.16],
).items()
for it in items:
    href = it.assets["image"].href  # COG en S3
    with rasterio.open(href) as src:  # GDAL /vsicurl/: lee solo la ventana
        # transformar la caja de la grilla al CRS del ítem (proj:wkt2) y leer la ventana
        ...
```

### SWIM: lo que `layers.yaml` todavía no aprovecha

- **URL directas** [C]. Los compuestos están en `https://swim.psi.edu/output/SWIM4MIM/Global/Composite/SWIM4MIM_Ci_0_1.tif`, `..._Ci_1_5.tif`, `..._Ci_5.tif` y `..._OriginalCi.tif`. La geomorfología está en `.../Global/Datasets/SWIM4MIM_G_{0_1,1_5,5}.tif`. Los anexos, en `.../Datasets/SWIM4MIM_G_{0_1,1_5,5}_Ancillary.zip` y `SWIM4MIM_RZ_Ancillary.zip`. Cada GeoTIFF pesa 68 MB, con fecha del 2025-08-04. En `layers.yaml` pueden pasar de «manual» a «scripted».
- **Formas del terreno a 3 km.** El anexo de 0-1 m trae 10 GeoTIFF, uno por forma, con su peso en la ecuación [D, README]: cráteres expandidos 0.1, relleno 0.1, glaciares (LDA, LVF, CCF) 0.75, manto 0.1, cráteres de pedestal 0.75, **polígonos (escala HiRISE) 1**, ring-mold 0.1, festoneado 0.75, aterrazados 0.1 y texturado 0.1.
- **Valores en el píxel de S1094b** [C, `swim_sample.py`]: ExpCraters 1, Mantled 1, Textured 1, **Polygons 0.615**, y todos los demás 0, también en una ventana de 5 × 5 píxeles. La celda mide 2963.7 m y va de -180 a 180°E, no de 0 a 360 como dice el README [C].
  - No sabemos qué significa el 0.615 de los polígonos: quizás una fracción de imágenes HiRISE con polígonos [NV].
  - Que el manto valga 1 contrasta con el «manto que termina en 33-34°N» de Dundas 2023, aunque el sitio está a 35°N, así que no se contradicen [I].
- **Reconnaissance Zones:** es un único polígono multiparte, en metros, en una proyección equirectangular de esfera de 3396190 m. **S1094b está adentro**, y el vértice más cercano queda a ~314 km [C]. El archivo `.dbf` no viene en el zip [C].
- **Licencia:** la página no la declara; solo pide citar a Morgan y Putzig et al. 2025 (PSJ 6:29) [D, README]. Para usar los datos: [NV].
- **Posible error en `layers.yaml`:** la página SWIM4MIM solo muestra compuestos, geomorfología y RZ. No vimos los productos individuales de neutrones, térmica y radar, que `layers.yaml` atribuye a esa página. Pueden estar en `SWIM2Products.php` [NV].
- **Courville et al., LPSC 2026:** la versión probabilística de SWIM, con un modelo bayesiano de fracciones de aire, hielo y roca entre 60°S y 60°N. Dice textualmente: «In absence of adequate ground truth, the SWIM project applied a weighting scheme» [D, PDF leído]. No encontramos sus mapas publicados [NV].

### PDS y ODE

ODE REST: `https://oderest.rsl.wustl.edu/live2/?query=product&target=mars&results=c|m&output=json&ihid=..&iid=..&pt=..&minlat=..&maxlat=..&westernlon=..&easternlon=..`. Los productos disponibles salen de `query=iipt` [D].

**Conteos sobre la caja del cráter** (35.08-35.14°N, 189.80-189.86°E) [C]:

| Instrumento | Conteo |
| --- | --- |
| HiRISE RDRV11 | 40 |
| HiRISE DTM | 1 |
| CTX EDR | 63 |
| CRISM MTRDR | 0 |
| CRISM MRDR4 | 4 |
| CRISM TRDR | Varias observaciones entre 2008 y 2022; incluye el 2022-02-27 con el comentario «Candidate impact site formed between Dec 24 2021 and Dec 25 2021» y la descripción «VNIR [...] full resolution short» |
| SHARAD RDR | 4 |
| SHARAD USRDRV2 | 3 |
| THEMIS IRBTR | 30 |
| THEMIS IRGEO2 | 16 |
| HRSC REFDR4 | 36 |
| HRSC DTMRDR | 0 |
| CaSSIS CALSC | 0 |

- Que CRISM 2022 tenga solo VNIR concuerda con el fin del infrarrojo de CRISM, pero esa fecha no la verificamos [NV].
- **Las 63 CTX** permitirían armar un DTM de CTX con estéreo, pero el sitio ya tiene DTM de HiRISE [I].

### THEMIS: inercia térmica cuantitativa

La tesela que contiene al sitio es **`THEMIS_TI_Mosaic_Quant_30N180E_100mpp.cub`** [D]: ISIS3, 32 bits, 2.53 GB, dominio público («Public domain» en la ficha), en `https://asc-astropedia.s3.us-west-2.amazonaws.com/Mars/Odyssey/THEMIS-Global-Thermal-Inertia-Mosaic/Quantitative-32-Bit/` ([ficha](https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_quantitative_30n180e_100mpp)). Exactitud absoluta de ~20 %, según la ficha de otra tesela [D-r]. Esto resuelve la nota «verify exact product name» de `layers.yaml`.
- **Recorte:** `gdal_translate -projwin ... /vsicurl/https://.../THEMIS_TI_Mosaic_Quant_30N180E_100mpp.cub recorte.tif`. GDAL lee ISIS3 por rangos HTTP [I: no lo probamos].

### Murray Lab CTX V01

Tesela `MurrayLab_GlobalCTXMosaic_V01_E-172_N32.zip`: 2.0 GB, nombre confirmado [C]. Viene en zip, así que no admite recorte remoto: hay que bajarla entera [I]. Crédito: «NASA/JPL/MSSS/The Murray Lab», con Dickson et al. 2024, como ya registra `layers.yaml` [D].

### JMARS

Cliente de escritorio gratuito, con cuenta. El código se liberó como open source GPL [D-r, búsqueda]. Los términos de uso y cita no se leyeron [NV]. Sus páginas `jmars.mars.asu.edu/maps/?layer=...` cargan por JavaScript, y no encontramos un WMS público documentado [C]. Para un pipeline reproducible conviene ir a la fuente (PDS, USGS o SWIM) y usar JMARS solo para explorar [I].

### MOLA, CRISM y MCS

- **MOLA:** el `ImageServer` de Trek da valores crudos [C]. Los MEGDR están en la PDS. El MOLA-HRSC de 200 m ya está en `layers.yaml`.
- **CRISM:** ver los conteos de ODE. Sobre el sitio no hay MTRDR, así que no hay cubos hiperespectrales proyectados [C]. Los mapas de minerales hidratados de Trek son globales y de puntos [C].
- **MCS:** los productos de la PDS (DDR, RDR) son atmosféricos. Los mapas de profundidad de hielo de Piqueux 2019 y 2025 no los encontramos publicados como datos [NV].

### Tabla de recursos

«Nuevo» significa que aporta algo que `data/layers.yaml` no tiene.

| Recurso | Qué ofrece | Resolución | ¿Cubre S1094b? | Formato | Licencia | Recorte por script | ¿Nuevo? | URL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mars Trek, WMTS | Visualización de ~225 capas | Según capa; THEMIS hasta ~81 m/px | Parcial (tabla de arriba) | PNG y JPG de 8 bits | No hallada [NV] | WMTS: teselas por índice [C] | No (solo visual) | https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars |
| Mars Trek, `ImageServer` de MOLA | Elevación en valores crudos | ~463 m | Sí, -3946 m [C] | ArcGIS REST, S16 | [NV] | `identify` o `exportImage` | Marginal | https://trek.nasa.gov/mars/trekarcgis/rest/services/mola128_mola64_merge_90Nto90S_SimpleC_clon0/ImageServer |
| Mars Trek, cráteres nuevos y con hielo | 508 puntos: Daubar 2013, Dundas 2014, cárcavas y RSL | Puntos | Global; ninguno en el sitio | ArcGIS Feature | [NV] | `query?where=1=1&f=json` [C] | Sí (versión vieja de las etiquetas) | https://trek.nasa.gov/mars/trekarcgis/rest/services/RSLs_Gullies_New_IcyCraters_clon0/MapServer/0 |
| Mars Trek, zonas de exploración | 47 zonas de 2015, radio de 100 km | Polígonos | El sitio no cae en ninguna [C] | ArcGIS Feature | [NV] | `query` | Sí (contexto) | https://trek.nasa.gov/mars/trekarcgis/rest/services/EZMars/MapServer |
| Geología de Tanaka 2014 (SIM 3292) | Unidades geológicas | 1:20M | `lAv` [C] | ArcGIS y shapefile de USGS | Dominio público de USGS [I] | `identify` [C] | Sí (máscara) | https://trek.nasa.gov/mars/trekarcgis/rest/services/SIM3292_Global_Geology/MapServer |
| **STAC de USGS, HiRISE sin controlar** | 22 observaciones RED y COLOR, 2022-2025 | 0.25-0.5 m | Sí (por caja; falta revisar píxeles) | COG UInt16 | CC0 [C] | `pystac-client` y ventana de `rasterio` | **Sí** (13 fechas posteriores a feb 2023) | https://stac.astrogeology.usgs.gov/api/collections/mro_hirise_uncontrolled_observations |
| **STAC de USGS, paquete del DTM** | DTM, **FOM (error del DTM)**, sombreado, 18 ortos | 1 m y 0.25-0.5 m | Sí | COG | CC0 [C] | Igual | **Sí** (FOM y ortos de jul, sep y oct 2022) | https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_073578_2155_ESP_073077_2155/ |
| STAC de USGS, THEMIS controlado | Mosaicos IR de día y de noche (Diacria) | 100 m | Sí | COG | CC0 [C] | Igual | Sí (noche y día en valores) | https://stac.astrogeology.usgs.gov/api/collections/mo_themis_controlled_mosaics |
| THEMIS, inercia cuantitativa 30N180E | Inercia térmica | 100 m | Sí (por tesela) | ISIS3 `.cub`, 2.5 GB | Dominio público [D] | `/vsicurl/` de GDAL [I] | Sí (URL exacta) | https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_quantitative_30n180e_100mpp |
| **SWIM 4 MIM, compuestos** | Ci 0-1, 1-5 y > 5 m; Ci original | ~3 km | Sí | GeoTIFF de 68 MB | No declarada; citar Morgan 2025 [NV] | URL directa [C] | Sí (pasa a script) | https://swim.psi.edu/output/SWIM4MIM/Global/Composite/ |
| **SWIM 4 MIM, formas del terreno** | 10 rasters de presencia por forma, con pesos | ~3 km | Sí; valores arriba [C] | GeoTIFF en zip | Igual [NV] | URL directa | **Sí** | https://swim.psi.edu/output/SWIM4MIM/Global/Datasets/SWIM4MIM_G_0_1_Ancillary.zip |
| **SWIM, Reconnaissance Zones** | Zonas prioritarias para buscar hielo a la menor latitud | Polígonos | **Sí, adentro** [C] | Shapefile sin `.dbf` | Igual [NV] | URL directa | **Sí** | https://swim.psi.edu/output/SWIM4MIM/Global/Datasets/SWIM4MIM_RZ_Ancillary.zip |
| ODE REST | Búsqueda de productos PDS por caja | - | Sí (conteos arriba) | JSON | Datos PDS, públicos [I] | URL de consulta [C] | Herramienta | https://oderest.rsl.wustl.edu/live2/ |
| Espejo PDS en S3 | RDR de HiRISE y otros | Nativa | Sí | JP2 y LBL | Datos PDS [I] | `aws s3 cp --no-sign-request` [D] | Alternativa a hirise.lpl | s3://asc-pds-mars-reconnaissance-orbiter/ |
| CRISM TRDR | Espectros VNIR dirigidos, incluido feb 2022 | ~18-36 m [NV] | Sí [C] | PDS | Públicos [I] | ODE `FilesURL` | Sí (no aporta para hielo enterrado) | https://oderest.rsl.wustl.edu/live2/?query=product&target=mars&ihid=MRO&iid=CRISM&pt=TRDR |
| SHARAD RDR y USRDRV2 | Radargramas | ~0.3-3 km por 15 m vertical [D-r, repo] | 3-4 pistas [C] | PDS | Públicos [I] | ODE | Sí (contexto de capa masiva) | https://oderest.rsl.wustl.edu/live2/ |
| HRSC REFDR4 | Imagen proyectada; sin DTM en el sitio | ~12.5-25 m [NV] | Sí, 36 [C] | PDS | ESA, uso libre [NV] | ODE | Marginal | https://oderest.rsl.wustl.edu/live2/ |
| CTX EDR | Imagen cruda, 63 tomas | ~6 m | Sí [C] | PDS | Públicos [I] | ODE | Marginal | https://oderest.rsl.wustl.edu/live2/ |
| Murray Lab CTX V01 | Mosaico global | 5 m | Sí, tesela E-172_N32 de 2 GB [C] | Zip con GeoTIFF | Uso libre con crédito [D, beta01] | Bajar la tesela entera | No (ya registrado) | https://murray-lab.caltech.edu/CTX/V01/tiles/ |
| JMARS | Cliente con cientos de capas | Varias | Sí | Cliente Java | GPL el código; términos [NV] | Exportar desde el cliente | No | https://jmars.mars.asu.edu |
| Mars Exploration Zones (HLS2) | Zonas propuestas en 2015 | - | No | Ver Trek | - | Ver Trek | Contexto | https://trek.nasa.gov/mars/trekarcgis/rest/services/EZMars/MapServer |
| Space Apps 2026, Resources | Pestaña aún no legible | - | - | - | - | - | [NV] | https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/ |
| Courville 2026 (SWIM probabilístico) | Probabilidad y abundancia de hielo a < 5 m | ~3 km [I] | Probable | Sin datos publicados [NV] | - | - | Futuro | https://www.hou.usra.edu/meetings/lpsc2026/pdf/1792.pdf |

---

## Tema 2. Aprendizaje automático para predecir hielo a partir del terreno

### Trabajos publicados

| Trabajo | Qué detecta | Desempeño | Datos | Código, pesos y licencia | Etiqueta | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Palafox et al. 2017, Computers & Geosciences | Conos sin raíz y TAR (no hielo) | Mejor que SVM con HOG; «96 %» para conos según una entrevista | HiRISE | No encontrado | D-r | https://ui.adsabs.harvard.edu/abs/2017CG....101...48P/abstract |
| Nagle-McNaughton et al. 2020, PlaNet | TAR a escala de 50 m; los autores mencionan que «promete» para polígonos | Precisión 92.9 % | HiRISE, dataset propio | No encontrado | D (abstract en Crossref) | https://doi.org/10.3390/rs12213607 |
| Wilhelm et al. 2020, DoMars16k | 15 formas del terreno en CTX (incluye texturado, montículos, cráter, campo de cráteres) | La cifra del abstract no se pudo leer (MDPI dio 403) | 16 150 recortes de 200 px (~1.2 km) de 163 CTX | **Datos y modelos en Zenodo, CC BY 4.0** (127 MB y 969 MB) | D (Zenodo y Crossref) | https://zenodo.org/record/4291940 |
| Doran, Lu, Wagstaff et al., landmarks de HiRISE v1, v3 y v3.2 | 8 clases: cráter, dunas oscuras y claras, slope streak, eyecta, swiss cheese, spider, otro. **Ninguna es de hielo enterrado** | Ver Wagstaff 2021 | v3.2: 10 815 originales y 64 947 aumentados, de 232 imágenes | v1 CC BY-SA 4.0; v3 y v3.2 CC BY 4.0 | D (Zenodo) | https://zenodo.org/record/4002935 |
| Wagstaff et al. 2018 y 2021 (AAAI) | Clasificación de contenido para el PDS Imaging Atlas | No leído | Landmarks de arriba | No verificado | D-r | (citados en Mars-Bench) |
| Wagstaff, Daubar et al. 2022, Icarus | Cráteres nuevos en CTX | 69 impactos nuevos confirmados con HiRISE. **Los candidatos replican el sesgo hacia inercia térmica baja**; se mitigó por bandas de inercia | Inception-v3 con 1858 positivos y 4973 negativos (trabajo previo) | No verificado | D-r | https://arxiv.org/abs/2207.05679 |
| Doran et al. 2024, escarcha | Escarcha en HiRISE, desplegado en > 20 000 observaciones; el recall cae en terrenos poco representados | - | Dataset en Zenodo 6561242, CC BY 4.0 (4.7 GB) | Dataset CC BY 4.0 | D-r | https://arxiv.org/abs/2403.12080 ; https://zenodo.org/records/6561242 |
| Pearson et al. 2024, brain terrain | Segmenta brain terrain, ligado a congelamiento y deshielo | ~93 % de exactitud con 95 % menos de cómputo; > 52 000 imágenes buscadas; > 200 con detecciones | **20 imágenes con brain terrain y 129 de fondo** (README) | Código y pesos en GitHub, **sin licencia** (la API da `license: null`): no se pueden reutilizar sin permiso | D | https://arxiv.org/abs/2311.12292 ; https://github.com/pearsonkyle/Mars-Brain-Coral-Network |
| Brito 2023, tesis de Western | Polígonos: sí o no, tipo de polígono y segmentación con U-Net | Sin números en la ficha | HiRISE; tamaño no informado | Sin código ni licencia declarados | D-r | https://uwo.scholaris.ca/handle/20.500.14721/37216 |
| Faletti et al., EPSC 2026 | Cráteres aterrazados, ligados a hielo en el subsuelo | Precisión 0.92 y recall 0.63 con confianza ≥ 0.8, en 9 imágenes CTX de prueba | Fino ajuste sobre CTX anotadas; 22 cráteres con DTM | YOLOv5x (AGPL-3.0); código sin declarar | D (abstract) | https://meetingorganizer.copernicus.org/EPSC2026/EPSC2026-235.html |
| Barrett et al., EPSC 2026 | TAR con Mask R-CNN: ~20 millones en ~10 000 HiRISE | Comparado con vientos de GCM | ~5000 TAR etiquetados en 6 imágenes | No declarado | D (abstract) | https://meetingorganizer.copernicus.org/EPSC2026/EPSC2026-233.html |
| NOAH-H (Barrett et al.) | Facies de terreno en HiRISE para ExoMars | «Noisier» por píxel | ~1500 recortes de 128 m | No verificado | D-r | https://aminer.org/pub/6565d490939a5f4082af65dd |
| Purohit et al. 2025, Mars-Bench (NeurIPS) | 20 datasets: cráteres, conos, bloques, escarcha, polvo, landmarks, DoMars16k. **Ninguno de polígonos, festoneado, brain terrain ni hielo enterrado** | Gemini 2.0 Flash y GPT-4o mini: ~0.34-0.36 de exactitud en DoMars16k; en segmentación, U-Net le gana a los transformers | Todos los datasets en versión CC BY 4.0 | Datos CC BY 4.0; licencia del código [NV] | D (PDF) | https://arxiv.org/abs/2510.24010 |
| Gergácz y Kereszturi 2023 | Parches de hielo de superficie entre 40 y 60°S | 94 % | HiRISE | - | D-r (ya en el repo) | https://arxiv.org/abs/2312.15260 |
| BoulderNet (Prieur 2023) | Bloques | - | HiRISE | CC BY 4.0 (ya en el repo) | D (repo) | https://zenodo.org/records/8171052 |
| Rangarajan et al. 2023, Icarus | Hielo expuesto de alta pureza con índices multiespectrales de HiRISE. No queda claro si usa aprendizaje automático | - | Productos UNFILTERED de HiRISE en Zenodo (sin licencia declarada) | [NV] | D-r | https://zenodo.org/records/8018838 |
| SWIM (Morgan 2025) y Courville 2026 | Consistencia con pesos supuestos; probabilidad bayesiana | Sin ground truth adecuado | Órbita | - | D | https://www.hou.usra.edu/meetings/lpsc2026/pdf/1792.pdf |

**Lo que no apareció en una búsqueda acotada:** aprendizaje automático para predecir presencia o profundidad de hielo enterrado en Marte; detección automática de festoneado; y un modelo con pesos públicos para polígonos. Que no apareciera no prueba que no exista [I].

### Etiquetas disponibles

| Dataset | Qué etiqueta | Casos | Dónde | Licencia | Etiqueta | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Daubar et al. 2022 | Cráteres nuevos, con o sin hielo | 1203 sitios: 48 con hielo, 20 posibles; 2 con hielo en 30-40°N | Global | Zenodo (licencia en el repo) | D (repo) | https://zenodo.org/record/6604912 |
| Dundas et al. 2021, data release | Escarpas con hielo y cráteres con hielo | **48 sitios de impacto con hielo** con HiRISE; solo 5 con hielo en CRISM, contra 23 con CRISM sin detección. Escarpas: 21 sitios en el sur, entre 50 y 61°S; en Milankovič, 4 sitios con «over 70 features»; unos pocos más y uno en Utopia | Escarpas entre 50 y 61°; cráteres desde ~39°N | CC0 | D (PDF de HAL, págs. 9, 22 y 29-31). La tabla misma (ScienceBase dio 403): [NV] | https://doi.org/10.5066/P9Y8FR1R |
| Dundas et al. 2014, en la capa de Trek | Sitios de impacto con hielo | 22 | Global | [NV] | C | (capa de Trek de arriba) |
| Daubar et al. 2013, en Trek | Cráteres nuevos | 365 | Global | [NV] | C | Igual |
| Dundas et al. 2023 | Diámetro y fondo plano, de donde sale la profundidad a la capa resistente | 349, de los cuales 48 tienen fondo plano | **Solo S1094b** | Sin confirmar (repo) | D (repo) | https://doi.org/10.1029/2022GL100747 |
| SWIM, formas del terreno 0-1, 1-5 y > 5 m | Presencia de 10 formas por celda de 3 km | 2400 × 7200 celdas; fracción no nula a nivel global: polígonos 12.6 %, texturado 29.7 %, manto 33.4 %, expandidos 9.0 %, festoneado 6.0 % [C] | 60°S a 60°N | No declarada [NV] | C | (anexo de SWIM de arriba) |
| SWIM, Reconnaissance Zones | Zonas prioritarias | 1 multipolígono | 57°S a 51°N | Igual | C | Igual |
| Brain terrain (Pearson) | Máscaras | 20 imágenes positivas y 129 de fondo | Global | **Sin licencia** | D | Repo de arriba |
| Escarcha en HiRISE (Doran) | Escarcha sí o no por tesela de 299 px | Mars-Bench: 30 124 / 11 415 / 12 249 | Latitudes medias del norte | CC BY 4.0 | D | https://zenodo.org/records/6561242 |
| DoMars16k | 15 clases, incluido «textured terrain» | 16 150 | Global, CTX | CC BY 4.0 | D | https://zenodo.org/record/4291940 |
| Mapas de manto y polígonos de Levy 2009 y Kreslavsky y Head | Polígonos y manto | No abierto | - | - | NV | - |

### Viabilidad

1. **Los positivos son pocos y están confundidos.** Hay ~48 impactos con hielo en todo Marte, casi todos por encima de ~40°N, y solo 2 en la franja de 30-40°N de Daubar [D]. Un clasificador global aprendería «latitud alta = hielo». En S1094b, a 35°N, quedaría fuera del rango de entrenamiento: el repo ya calificó eso de extrapolación [D, repo; I].
2. **Las etiquetas tienen sesgo de observación.** Los catálogos de impactos favorecen la inercia térmica baja, y un modelo entrenado con ellos reproduce ese sesgo (Wagstaff 2022) [D-r]. Las inercias del sitio entrarían justo como variable confundida [I].
3. **Las etiquetas negativas no son negativas.** Un impacto sin hielo puede no haber excavado lo suficiente: la profundidad de excavación es ~0.084 × D (Dundas 2021, p. 30) [D]. Eso es aprendizaje con positivos y sin etiquetar (PU), o directamente datos censurados, que es lo que ya hace el GP [I]. La prospección minera usa PU porque «the "negative" class is essentially unlabeled» [D-r, búsqueda]. La validación cruzada espacial evita AUC infladas (Airola et al. 2019, [DMKD](https://link.springer.com/10.1007/s10618-018-00607-x)) [D-r].
4. **La escala no calza.** Las etiquetas de SWIM son celdas de 3 km y la grilla es de 10 m: S1094b entero ocupa unos 8 píxeles de SWIM [D, repo]. Las formas del terreno indican sobre todo pérdida pasada de hielo (repo; Dundas 2023) [D].
5. **La única fuente densa de verdad está en el sitio:** los 349 cráteres de Dundas 2023, con el 86 % censurados. El repo midió estructura débil, con un alcance de 100-200 m [D, repo]. Cualquier modelo que use imagen como covariable tiene que ganarle a un GP sin covariables, con validación por bloques espaciales [I].
6. **Literatura análoga** (ya en el repo): en permafrost hacen falta cientos o miles de perforaciones; Random Forest anduvo con < 20 ocurrencias solo en estudios de caso; y el desempeño cae al transferir a otro sitio [D, repo].

**Conclusión de viabilidad** [I]: con lo que existe no alcanza para entrenar un predictor de presencia o profundidad de hielo enterrado que valga en S1094b. Lo que sí alcanza es detectar formas del terreno en el sitio con pocas etiquetas, y usarlas como covariable con peso declarado y validado contra los cráteres.

### Un camino realista para 2 días

| Camino | Qué es | Etiquetas | Riesgo principal | Licencias | Veredicto [I] |
| --- | --- | --- | --- | --- | --- |
| A. Formas del terreno con pocas etiquetas y extractor congelado | Embeddings de DINOv2 o SAM sobre teselas HiRISE de ~10-50 m, más regresión logística o k-NN. Salida: `periglacial_landform_score` por tipo (polígonos, texturado, expandidos) | Decenas de teselas por clase, etiquetadas en QGIS por el equipo. Brain terrain anduvo con 20 imágenes positivas [D] | Que la textura confunda con la eyecta y los bloques; que la forma no informe la profundidad (pérdida pasada) | DINOv2 y SAM: Apache-2.0 [C]. HiRISE en STAC: CC0. Crédito NASA/JPL-Caltech/UArizona | **Recomendado.** Ya está previsto en `vision.md` (paso 6) |
| A'. Afinar con DoMars16k | Modelo CTX de 15 clases, CC BY 4.0 | Ya entrenado | Recortes de 1.2 km: demasiado gruesos para la grilla de 10 m. Sus clases no son de hielo | CC BY 4.0, citar a Wilhelm 2020 | Solo como prior de textura; no vale el tiempo |
| B. Predicción directa en el sitio | Regresión censurada de `log d` de los 349 cráteres contra embeddings, THEMIS y pendiente, validada por bloques espaciales | 349 (301 cotas) | Fuga espacial por cercanía; resultado nulo probable | Igual que A | **Una sola prueba, de 0.5 día.** Si da nulo, se reporta como hallazgo |
| C. Clasificador global de hielo | Entrenar con Daubar y Dundas (48 positivos) sobre capas orbitales | ~48 | Aprende latitud y sesgo de inercia; S1094b fuera de rango | Daubar: ver repo. Dundas: CC0 | **Descartado** |
| D. Detectores de terceros | Brain terrain (sin licencia), YOLOv5 de Faletti (AGPL), YOLO de Ultralytics | - | Licencia incompatible con Apache 2.0 | `license: null` y AGPL-3.0 [C] | **Descartado.** Se puede citar y reimplementar la idea |
| E. VLM sin entrenar | Preguntarle a un VLM por la forma del terreno | 0 | ~0.34 de exactitud en DoMars16k (Mars-Bench) [D] | Según proveedor | Descartado |

**Riesgos comunes:**
- Las HiRISE sin controlar tienen ~100 m de error de ubicación: usar los ortos controlados del paquete del DTM [D].
- El sol y la estación cambian entre fechas (repo).
- La GPU está en otra máquina (memoria del proyecto).
- DINOv3 tiene licencia propia (`NOASSERTION` en GitHub) [C]: leerla antes de usarlo.

**Cómo contarlo en el pitch** [I]: «Usamos IA para detectar formas del terreno, no para inventar hielo. La IA no predice hielo enterrado porque no hay etiquetas: nadie lo hizo, por esa razón. Por eso medimos lo que la IA no puede ver».

---

## Implicancias para el repo (sugerencias; no se aplicó nada)

1. `layers.yaml`: pasar los SWIM a `scripted` con sus URL y sumar `swim_landforms_0_1m` (anexo) y `swim_recon_zones`, todos con `role: evidence` regional o `visual`.
2. `layers.yaml`: sumar `hirise_dtm_fom` (DTFEC, error del DTM, como `cost` o incertidumbre de pendiente) y los ortos controlados de julio, septiembre y octubre de 2022.
3. `docs/plans/vision.md`: corregir «la imagen más reciente con el cráter cubierto es ESP_077719». El STAC lista 13 observaciones posteriores, hasta septiembre de 2025, que hay que revisar una por una. ESP_089784 parece vacía.
4. `layers.yaml`, `themis_ti`: URL exacta 30N180E, 2.5 GB, en ISIS3.
5. `layers.yaml`, `swim_neutron`, `swim_thermal` y `swim_radar_surface`: confirmar de qué página salen [NV].
6. `docs/SOURCES.md`: sumar el STAC de USGS (CC0), los anexos de SWIM, Tanaka 2014 vía Trek, Courville 2026, Mars-Bench, DoMars16k, Pearson 2024, Wagstaff 2022 y Faletti 2026.

## Lo que no se pudo abrir o verificar

| Fuente | Qué pasó |
| --- | --- |
| Pestaña Resources de Space Apps 2026 | No archivada; el sitio da error de certificado (no se desactivó la verificación TLS) |
| Términos de uso de Mars Trek y de JMARS | No encontrados o no leídos |
| Licencia de los datos de SWIM | No declarada en la página |
| Tabla de Dundas 2021 en ScienceBase | 403; los conteos salen del texto del paper |
| DoMars16k, exactitud del paper | MDPI dio 403; Crossref no trae números |
| Palafox 2017, código y cifras | Solo ficha y entrevista |
| PlaNet, código | No encontrado |
| Píxeles reales de las HiRISE 2023-2025 sobre el cráter | Solo por caja del STAC |
| Significado del valor 0.615 de los polígonos de SWIM | No documentado en el README |
| Ci de SWIM en el píxel del sitio | No se bajaron los compuestos de 68 MB; sigue pendiente, como en la recomendación 9 del informe de viabilidad |
| Mapas de Piqueux 2019 y 2025 y de Courville 2026 | No encontrados como datos |
| Licencia del código de Mars-Bench | No verificada |
| Fecha del fin del infrarrojo de CRISM | No verificada |

Créditos HiRISE: NASA/JPL-Caltech/UArizona. CTX: NASA/JPL/MSSS/The Murray Lab.
