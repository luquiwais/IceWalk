# Project page: draft for the Space Apps submission form

Draft of each field of the official form (Project Submission Guide, 13/11). All content in English, as the rules require. Review before pasting: the demo link (`TODO`) waits for the published video, and the "Use of Super Intelligence" text must match how the team actually worked. Images to upload with the page: `img/conops.png` (concept of operations) and `img/evidence.png` (validation), made by `make_figures.py` from the numbers in `docs/EXPERIMENTS.md`. Wording follows `docs/research/categorias-globales-2026-11-14.md` (Science, Mission Concept, Data).

---

## Project Name

IceWalk

## High-Level Project Summary

*Will this EVA reach ice, and with which instrument?* IceWalk answers that question for the first Mars crews. Every Mars EVA tool tells astronauts where they can walk; IceWalk also tells them whether the walk is worth it. At crater S1094b (35°N, the lowest-latitude ice ever exposed on Mars) it estimates, from 349 real craters and a model calibrated on 383 fresh impacts, the probability of ice within each tool's reach, with its uncertainty. It plans a two-person EVA inside NASA limits (slope, 1.8 km walk-back, effort and consumables, comms line of sight, live space weather from NASA DONKI, dust from the Emirates Mars Mission) on the real HiRISE terrain, gives the EV a helmet view with waypoints and the IV a console in the habitat (linked across devices, with the IV directing the EVA as NASA's Mars concept of operations prescribes), re-plans after every measurement the crew logs, and on EVA TERMINATE routes the crew home by the fastest path over the terrain. Drilling where a radar flags shallow ice needs 2.9 times fewer EVAs to confirm ice than drilling blind: the strategy NASA's SkyFall radar helicopters will enable.

## Link to Project Demo

TODO: public link (YouTube or Google Drive) to the 30-second video. Test it in a private window.

## Link to Final Project

- Web app: https://icewalk.vercel.app (project page, with the planner at https://icewalk.vercel.app/app)
- Public repository: https://github.com/luquiwais/IceWalk

## Detailed Project Description

**What it does.** IceWalk answers three questions a crew and its science team face before and during every ice-prospecting EVA:

1. *Is it worth going, and with which tool?* A **site card** gives, for each instrument, the probability that ice is within its reach, with a 90 % interval and a GO / CONDITIONAL / NO_GO verdict against a threshold the mission declares. At S1094b, a 1 m drill is NO_GO (6 %), NASA's SkyFall-class 3 m radar is CONDITIONAL (52 %) and a 10 m ground-penetrating radar is GO (97 %).
2. *Where do we go, can we walk it, and can we come back?* A **traverse plan** for EV1 and EV2 on the HiRISE terrain model at 10 m: 20° slope limit, the 2808 boulders our vision module detected from their shadows, a 1.8 km walk-back limit (30 min at 3.5 km/h, NASA ICES-2026-127) with caution margins, the metabolic cost and oxygen of each leg against NASA's design rates, tool mass per crewmember, soil firmness from THEMIS thermal inertia, line of sight to the habitat antenna, and a walk / hand cart / rover call. Stations are spread across terrain units of different thermal inertia, to test whether it tracks shallow ice. The best EVA window over the next sols combines sunlight, Viking Lander 2 temperature and wind, dust opacity measured by the Emirates Mars Mission over the site, and solar particle events and CME arrivals at Mars from NASA DONKI.
3. *What changed after the last measurement?* Every radar sounding or drill result updates the ice map and the plan on site (**re-plan**), because the crew cannot wait up to 22 minutes for each answer from Earth.

**Concept of operations** (image: `conops.png`). NASA's SkyFall radar helicopters (launch 2028) will sound ice at 0.5-3 m. IceWalk turns those soundings into crew decisions: the site card chooses the instrument, the planner builds a two-person traverse inside NASA limits, and every radar or drill result re-plans the EVA. At SkyFall's reference site AP-105, a 3 m radar is GO (93 %); SkyFall site proposals close on December 1, 2026.

**See it.** Five phases, in the order of NASA's plan, train, fly:
- **Site:** is ice within reach, and with which tool?
- **Plan:** where, and is it safe? The planner's traverse with its eight flight rules; the crew can drag a station or switch a tool off and sees at once whether the EVA still fits.
- **Brief:** the real HiRISE terrain in 3D: fly over, stand where the crew will work at each station, print the cuff checklist.
- **EVA:** each crewmember joins a seat, on the same screen or on two devices linked by a code. The EV walks the real terrain in a helmet view (waypoint rings and light columns, range and steering, a track map, PET, walk-back margin and bingo) and logs each result at the station; only the EV logs. The planner re-plans; the IV in the habitat reviews it and makes the call (continue or EVA TERMINATE), and the EV copies it. On EVA TERMINATE both see the fastest walk-back route over the terrain model, with its length and time. The IV can also look through the EV's camera.
- **Debrief:** what each measurement means (no ice within 1 m means ice deeper than the tool reaches) and what the last re-plan changed.

The ice map shows where the model has local evidence and where it only has the regional prior, instead of a uniform probability.

**The science** (image: `evidence.png`).
- **Question.** Can orbital data tell a crew whether ice lies within reach of a drill or a radar at a specific EVA site?
- **Hypothesis we tested and rejected.** Neighbouring ice-exposing craters predict ice at site scale. They do not (349 craters, AUC 0.52), and a power test shows that check cannot rule spatial structure in or out. So IceWalk reports uncertainty instead of promising where the ice is.
- **What holds, out of sample.** A latitude prior calibrated on 383 fresh impacts it never saw: Brier score 0.033 against 0.087 for a constant rate, and 36.2 expected ice exposures against 37 observed. Independent ground truth: Phoenix measured ice at 4.6 cm; IceWalk predicts 7 cm (90 %: 2-22 cm). At Viking Lander 2, no ice in a 15 cm trench, and the model gives 1 %.
- **Test of the strategy.** Radar first, then drill: ice found per drill station rises from 6 % to 50 %, and EVAs to confirm ice drop from 3.3 to 1.16 with 50 radar soundings per EVA (1.58 with 20).
- **Limits.** The prior extrapolates south of 39.1°N, where S1094b sits, and is conservative in Arcadia; the card flags both. Our shadow boulder detector reaches F1 0.30-0.49 for boulders of 3 m or more against expert labels (BoulderNet); it is a hazard map, not a rock census. A Mask R-CNN we trained on BoulderNet does better on that benchmark (F1 0.63-0.64) but finds half as many boulders at S1094b, so the hazard map keeps the shadow detector. All EVA thresholds without a NASA value are marked as assumptions.

**How it works.**
- **Ice model:** a Gaussian-process (kriging) model of the depth to the ice table that handles censored data with expectation propagation. Craters with a flat floor give a depth; craters without one give a lower bound. Radar and neutron spectrometer readings enter with their documented errors.
- **Planner:** classic and explainable (value of a measurement per minute plus least-time routing on the terrain). No reinforcement learning. Every rule traces to a NASA source (EVA-EXP-0042, ICES-2025-129, ICES-2026-127, Artemis EVA planning); values without a source are flagged as assumptions.
- **Vision:** shadow-based boulder detection on two HiRISE orthoimages of 25 cm, with height from shadow length and sun geometry; a Mask R-CNN (torchvision) trained on BoulderNet as the comparison.
- **Walk-back:** the same least-time search over the terrain that builds every leg of the plan gives the route home from wherever the EV is when the IV calls EVA TERMINATE.

**Beyond one crater.** The same card runs on the 51 candidate Exploration Zones NASA proposed for human missions (Mars Trek) and on SkyFall's reference site AP-105.

**Benefits.**
- Fewer EVAs, the scarcest and riskiest crew resource, to confirm a water resource.
- Explicit uncertainty and verdicts that a science team can audit.
- A way to turn precursor radar data (SkyFall) into crew decisions, on site and without waiting for Earth.

**Tools.** Python (FastAPI, NumPy, SciPy, rasterio, PyTorch/torchvision), TypeScript (Next.js, Tailwind, CesiumJS with the Mars ellipsoid, three.js), Bun and moon (monorepo), JSON Schema contracts between modules, GitHub Actions CI.

## Use of Super Intelligence (SI)

Yes. We used Claude (Anthropic) as a coding and research assistant:
- writing and reviewing code and tests;
- searching and summarising the scientific literature and NASA documents;
- drafting documentation.

The project concept, the scientific choices (what to model, which validations to run and which results to accept or reject) and the product decisions were made by the team. Claude and Codex also assisted with Blender/Remotion video production. Charts are plotted from our data with code. The submission films use Gemini synthetic voices (Orus and Charon), identified in their closing credits. Visuals use rendered 3D models, data graphics and credited NASA material; rejected image/video generations are excluded. Sources, model credits and adaptations are recorded in the repository. No NASA branding is generated or modified.

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
| Habitat model | NASA 3D Resources, Habitat Demonstration Unit (shape only, untextured) | - | Habitat and airlock in the 3D views |

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
