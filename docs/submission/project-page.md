# Project page: draft for the Space Apps submission form

Draft of each field of the official form (Project Submission Guide, 13/11). All content in English, as the rules require. Review before pasting: links marked `TODO` depend on the deploy, and the "Use of Super Intelligence" text must match how the team actually worked. Images to upload with the page: `img/conops.png` (concept of operations) and `img/evidence.png` (validation), made by `make_figures.py` from the numbers in `docs/EXPERIMENTS.md`. Wording follows `docs/research/categorias-globales-2026-11-14.md` (Science, Mission Concept, Data).

---

## Project Name

IceWalk

## High-Level Project Summary

*Will this EVA reach ice, and with which instrument?* IceWalk answers that question for the first Mars crews. Every Mars EVA tool tells astronauts where they can walk; IceWalk also tells them whether the walk is worth it. At crater S1094b (35°N, the lowest-latitude ice ever exposed on Mars) it estimates, from 349 real craters and a model calibrated on 383 fresh impacts, the probability of ice within each tool's reach, with its uncertainty. It plans a two-person EVA inside NASA limits (slope, 1.8 km walk-back, effort and consumables, comms line of sight, live space weather from NASA DONKI, dust from the Emirates Mars Mission) on the real HiRISE terrain, lets the crew walk it in 3D with a helmet display, and re-plans after every measurement. Drilling where a radar flags shallow ice needs 2.9 times fewer EVAs to confirm ice than drilling blind: the strategy NASA's SkyFall radar helicopters will enable.

## Link to Project Demo

TODO: public link (YouTube or Google Drive) to the 30-second video. Test it in a private window.

## Link to Final Project

TODO: deployed web app (first) and public repository (https://github.com/luquiwais/IceWalk).

## Detailed Project Description

**What it does.** IceWalk answers three questions a crew and its science team face before and during every ice-prospecting EVA:

1. *Is it worth going, and with which tool?* A **site card** gives, for each instrument, the probability that ice is within its reach, with a 90 % interval and a GO / CONDITIONAL / NO_GO verdict against a threshold the mission declares. At S1094b, a 1 m drill is NO_GO (6 %), NASA's SkyFall-class 3 m radar is CONDITIONAL (52 %) and a 10 m ground-penetrating radar is GO (97 %).
2. *Where do we go, can we walk it, and can we come back?* A **traverse plan** for EV1 and EV2 on the HiRISE terrain model at 10 m: 20° slope limit, the 2808 boulders our vision module detected from their shadows, a 1.8 km walk-back limit (30 min at 3.5 km/h, NASA ICES-2026-127) with caution margins, the metabolic cost and oxygen of each leg against NASA's design rates, tool mass per crewmember, soil firmness from THEMIS thermal inertia, line of sight to the habitat antenna, and a walk / hand cart / rover call. Stations are spread across terrain units of different thermal inertia, to test whether it tracks shallow ice. The best EVA window over the next sols combines sunlight, Viking Lander 2 temperature and wind, dust opacity measured by the Emirates Mars Mission over the site, and solar particle events and CME arrivals at Mars from NASA DONKI.
3. *What changed after the last measurement?* Every radar sounding or drill result updates the ice map and the plan on site (**re-plan**), because the crew cannot wait up to 22 minutes for each answer from Earth.

**Concept of operations** (image: `conops.png`). NASA's SkyFall radar helicopters (launch 2028) will sound ice at 0.5-3 m. IceWalk turns those soundings into crew decisions: the site card chooses the instrument, the planner builds a two-person traverse inside NASA limits, and every radar or drill result re-plans the EVA. At SkyFall's reference site AP-105, a 3 m radar is GO (93 %); SkyFall site proposals close on December 1, 2026.

**See it.** A 3D view built from the real HiRISE terrain model and photographs of the site: fly over the crater where the ice was exposed, then walk the planned route at eye height with a helmet display (next station, range and heading, instrument, probability of ice, walk-back margin, comms). The probability of ice is painted on the ground; when the crew logs a sounding at a station, the planner re-plans and the map and route redraw from where they stand.

**The science** (image: `evidence.png`).
- **Question.** Can orbital data tell a crew whether ice lies within reach of a drill or a radar at a specific EVA site?
- **Hypothesis we tested and rejected.** Neighbouring ice-exposing craters predict ice at site scale. They do not (349 craters, AUC 0.52), and a power test shows that check cannot rule spatial structure in or out. So IceWalk reports uncertainty instead of promising where the ice is.
- **What holds, out of sample.** A latitude prior calibrated on 383 fresh impacts it never saw: Brier score 0.033 against 0.087 for a constant rate, and 36.2 expected ice exposures against 37 observed. Independent ground truth: Phoenix measured ice at 4.6 cm; IceWalk predicts 7 cm (90 %: 2-22 cm). At Viking Lander 2, no ice in a 15 cm trench, and the model gives 1 %.
- **Test of the strategy.** Radar first, then drill: ice found per drill station rises from 6 % to 50 %, and EVAs to confirm ice drop from 3.3 to 1.16 with 50 radar soundings per EVA (1.58 with 20).
- **Limits.** The prior extrapolates south of 39.1°N, where S1094b sits, and is conservative in Arcadia; the card flags both. Our shadow boulder detector reaches F1 0.30-0.49 for boulders of 3 m or more against expert labels (BoulderNet); it is a hazard map, not a rock census. All EVA thresholds without a NASA value are marked as assumptions.

**How it works.**
- **Ice model:** a Gaussian-process (kriging) model of the depth to the ice table that handles censored data with expectation propagation. Craters with a flat floor give a depth; craters without one give a lower bound. Radar and neutron spectrometer readings enter with their documented errors.
- **Planner:** classic and explainable (value of a measurement per minute plus least-time routing on the terrain). No reinforcement learning. Every rule traces to a NASA source (EVA-EXP-0042, ICES-2025-129, ICES-2026-127, Artemis EVA planning); values without a source are flagged as assumptions.
- **Vision:** shadow-based boulder detection on two HiRISE orthoimages of 25 cm, with height from shadow length and sun geometry.

**Beyond one crater.** The same card runs on the 51 candidate Exploration Zones NASA proposed for human missions (Mars Trek) and on SkyFall's reference site AP-105.

**Benefits.**
- Fewer EVAs, the scarcest and riskiest crew resource, to confirm a water resource.
- Explicit uncertainty and verdicts that a science team can audit.
- A way to turn precursor radar data (SkyFall) into crew decisions, on site and without waiting for Earth.

**Tools.** Python (FastAPI, NumPy, SciPy, rasterio), TypeScript (Next.js, Tailwind, CesiumJS with the Mars ellipsoid, three.js), Bun and moon (monorepo), JSON Schema contracts between modules, GitHub Actions CI.

## Use of Super Intelligence (SI)

Yes. We used Claude (Anthropic) as a coding and research assistant:
- writing and reviewing code and tests;
- searching and summarising the scientific literature and NASA documents;
- drafting documentation.

The project concept, the scientific choices (what to model, which validations to run and which results to accept or reject) and the product decisions were made by the team. Each AI-assisted commit carries a `Co-Authored-By: Claude` trailer in the repository metadata, and the README states where SI was used. Charts are plotted from our data with code. No SI-generated images, video or audio are used; if any are added, they will carry a visible watermark. No NASA branding is generated or modified.

## NASA Data

More than a dozen datasets from NASA and three partner agencies, from 463 m/px to 0.25 m/px, fused on one 10 m grid to answer a single crew question.

| Layer | Mission / agency | Resolution | Decision it drives |
| --- | --- | --- | --- |
| Terrain model and orthoimages of S1094b | MRO HiRISE (NASA/JPL-Caltech/UArizona), USGS controlled copy (CC0) | 1 m, 0.25 m | Slope limit, routes, 3D view, boulders |
| Fresh craters and ice exposures | Dundas et al. 2023; Daubar et al. 2022 (HiRISE analyses) | Per crater | Ice model and its calibration |
| Ice consistency (SWIM) | MRO SHARAD (Italian Space Agency), MOLA, THEMIS, via PSI/JPL | ~km | Context for the regional prior |
| Thermal inertia | Mars Odyssey THEMIS (NASA/ASU, USGS) | 100 m | Soil firmness, terrain units |
| Exploration Zones, THEMIS and MOLA layers | JPL Mars Trek (official challenge resource) | Global | Beyond-the-site cards, globe |
| Geologic map | USGS-NASA SIM 3292 (official challenge resource) | 1:20M | Site unit `lAv` |
| Space weather | NASA CCMC DONKI | Events | EVA window (SEP, CME) |
| Dust opacity | Emirates Mars Mission EMIRS (MBRSC) | 0.5° | EVA window, unreported dust |
| Climate and surface images | Viking Lander 2 (PDS; PIA00399, PIA00571) | Point | Temperature and wind; first-person analogue |
| Ground truth | Phoenix lander (Mellon et al. 2009) | Point | Model validation |
| Precursor mission | NASA SkyFall mission information | - | Site card tool, AP-105 |

## Space Agency Partner Data and Other References

**Space Agency Partner data:**
- **Mohammed Bin Rashid Space Center (MBRSC), UAE: Emirates Mars Mission (Hope), EMIRS** L3 gridded dust optical depth over the site region, used as the background dust opacity of the EVA window (Edwards et al. 2021, Space Sci. Rev. 217, 77).
- **Italian Space Agency (ASI): SHARAD** radar, inside the SWIM ice consistency maps.
- **ESA: Mars Express HRSC** (instrument team at DLR), inside the MOLA-HRSC blended DEM (CC BY-SA 3.0 IGO).

**Data and papers:**
- Dundas et al. (2023) GRL, doi:10.1029/2022GL100747: crater table, CC BY-NC-ND 4.0, used unmodified and not redistributed in adapted form.
- Daubar et al. (2022) JGR Planets, doi:10.1029/2021JE007145, Zenodo 6604912, CC BY 4.0.
- Mellon et al. (2009) JGR, doi:10.1029/2009JE003417.
- Byrne et al. (2009) Science, doi:10.1126/science.1175307.
- Courville et al. (2026) PSJ 7:183, doi:10.3847/PSJ/ae8904.
- Sizemore et al. (2026) PSJ 7:175, doi:10.3847/PSJ/ae7b38.
- Prieur et al. (2023) JGR Planets, BoulderNet (Zenodo 8171052, CC BY 4.0).
- Fergason et al. (2006) JGR, THEMIS thermal inertia; Soule and Goldman (1972), terrain coefficients.
- SWIM project (PSI/JPL), https://swim.psi.edu.
- Tanaka et al. (2014) USGS SIM 3292, doi:10.3133/sim3292.
- Hamran et al. (2020), RIMFAX.
- Rasmussen and Williams (2006), Gaussian Processes for Machine Learning.

**NASA operations documents:**
- EVA-EXP-0042 Rev. B (xEVA System ConOps).
- Ogilvie et al., Mars Spacesuit Mass Requirements, ICES-2026-127 (NASA JSC).
- Kostak, Caswell and Young, EVA Development in Exploration-Driven Human Spaceflight (NTRS 20250006988).
- ICES-2025-129 (traverse model) and ICES-2025-294 (step height).
- Surface EVA Architectural Drivers (NTRS 20230014957).
- Human Health and Performance (NTRS 20230015521).
- NASA-STD-3001.
- SkyFall mission information package (Sep 2026).

**Software:** FastAPI, NumPy, SciPy, rasterio, Next.js, CesiumJS, three.js, Tailwind CSS, Base UI, Bun, moon.

Full list with every value and its source: `docs/SOURCES.md` in the repository.
