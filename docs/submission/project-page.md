# Project page: draft for the Space Apps submission form

Draft of each field of the official form (Project Submission Guide, 13/11). All content in English, as the rules require. Review before pasting: links marked `TODO` depend on the deploy, and the "Use of Super Intelligence" text must match how the team actually worked.

---

## Project Name

IceWalk

## High-Level Project Summary

IceWalk is a planning tool for the first astronauts who will walk on Mars looking for water ice. Every Mars EVA tool tells the crew where to walk; IceWalk also tells them whether the walk is worth it and with which instrument. At crater S1094b (35°N, the lowest-latitude ice exposure ever seen on Mars) it estimates, from 349 real craters and a regional model calibrated on 383 fresh impacts, the probability of finding ice within each tool's reach, with its uncertainty. It then plans a safe EVA for a two-person crew (slope, walk-back margin, EVA window, live space weather from NASA DONKI) and re-plans after every measurement. Its key result: drilling where a ground-penetrating radar flags shallow ice needs about 2.9 times fewer EVAs to confirm ice than drilling blind, exactly the strategy NASA's SkyFall radar helicopters will enable from 2030.

## Link to Project Demo

TODO: public link (YouTube or Google Drive) to the 30-second video or the 7-slide deck. Test it in a private window.

## Link to Final Project

TODO: deployed web app and public repository (https://github.com/luquiwais/IceWalk).

## Detailed Project Description

**What it does.** IceWalk answers three questions a crew and its science team face before every ice-prospecting EVA:

1. *Is it worth going, and with which tool?* A **site card** gives, for each instrument, the probability that ice is within its reach, with a 90 % interval and a GO / CONDITIONAL / NO_GO verdict against a threshold the mission declares. At S1094b, a 1 m drill is NO_GO (6 %), NASA's SkyFall-class 3 m radar is CONDITIONAL (52 %) and a 10 m ground-penetrating radar is GO (97 %).
2. *Where do we go, and can we come back?* A **traverse plan** for EV1 and EV2 on the HiRISE terrain model at 10 m: slope limit of 20°, walk-back margin with caution and warning thresholds, consumables reserve, the best EVA window over the next sols (sunlight, temperature and wind from the Viking Lander 2 climatology, dust, and solar particle events and CME arrivals at Mars from NASA DONKI), and decision points with backup options.
3. *What changed after the last measurement?* Every radar sounding or drill result updates the ice map and the plan (**re-plan**), because the crew cannot wait up to 22 minutes for each answer from Earth.

**How it works.**
- **Ice model:** a Gaussian-process (kriging) model of the depth to the ice table that handles censored data with expectation propagation. Craters with a flat floor give a depth; craters without one give a lower bound. Radar and neutron spectrometer readings enter with their documented errors.
- **Regional prior:** depth by latitude, fitted on the Daubar et al. (2022) catalogue of fresh impacts that did or did not excavate ice.
- **Planner:** classic and explainable (value of a measurement plus A* routing). No reinforcement learning.
- **Every rule traces to a NASA source** (EVA-EXP-0042, NASA-STD-3001, Artemis EVA operations). Values without a source are flagged as assumptions.

**Why we trust it, and where we don't.**
- Out-of-sample calibration on 383 fresh impacts: Brier score 0.033 against 0.087 for a constant rate, and 36.2 expected ice exposures against 37 observed.
- Independent ground truth the model never saw: Phoenix found ice at 4.6 cm, and our model predicts 7 cm (90 % range 2-22 cm).
- We also report what does not work. Neighbouring craters do not predict ice at site scale, so IceWalk shows uncertainty instead of promising where the ice is. A power test showed that this check cannot rule spatial structure in or out.
- The card flags where the latitude-only model is conservative (Arcadia has twice the expected ice exposures) and where it extrapolates (south of 39.1°N).

**Beyond one crater.** The same card runs on the 51 candidate Exploration Zones NASA proposed for human missions (Mars Trek) and on SkyFall's reference site AP-105 in Arcadia, where a 3 m radar is GO (93 %).

**Benefits.**
- Fewer EVAs, the scarcest and riskiest crew resource, to confirm a water resource.
- Explicit uncertainty and verdicts that a science team can audit.
- A way to turn precursor radar data (SkyFall) into crew decisions.

**Tools.** Python (FastAPI, NumPy, SciPy, rasterio), TypeScript (Next.js, Tailwind, CesiumJS with the Mars ellipsoid), Bun and moon (monorepo), JSON Schema contracts between modules, GitHub Actions CI.

## Use of Super Intelligence (SI)

Yes. We used Claude (Anthropic) as a coding and research assistant:
- writing and reviewing code and tests;
- searching and summarising the scientific literature and NASA documents;
- drafting documentation.

The project concept, the scientific choices (what to model, which validations to run and which results to accept or reject) and the product decisions were made by the team. Each AI-assisted commit carries a `Co-Authored-By: Claude` trailer in the repository metadata, and the README states where SI was used. No SI-generated images, video or audio are used; if any are added, they will carry a visible watermark. No NASA branding is generated or modified.

## NASA Data

- **JPL Mars Trek** (official challenge resource): Exploration Zones layer (EZMars) and Viking MDIM 2.1 mosaic tiles for the globe.
- **MRO HiRISE:** DTM and orthoimages of S1094b (NASA/JPL-Caltech/UArizona), via the USGS Astrogeology STAC (CC0).
- **USGS-NASA Geologic Map of Mars** (SIM 3292, Tanaka et al. 2014; official challenge resource): site unit `lAv`, Late Amazonian volcanic unit.
- **NASA DONKI (CCMC):** live solar particle events and CME arrivals at Mars.
- **Viking Lander 2:** climatology (PDS) and surface images as a first-person analogue (PIA00399, PIA00571).
- **Mars Odyssey THEMIS:** thermal inertia (USGS).
- **MOLA:** elevation.
- **Phoenix lander:** ground-truth ice depth (Mellon et al. 2009).
- **NASA SkyFall** mission information.
- **Ice exposures:** Dundas et al. (2023) and Daubar et al. (2022), both from NASA-funded HiRISE analyses.

## Space Agency Partner Data and Other References

**Space Agency Partner data:**
- **ESA/DLR:** Mars Express HRSC, inside the MOLA-HRSC blended DEM (CC BY-SA 3.0 IGO).
- **ASI:** SHARAD radar, inside the SWIM ice consistency maps.

**Data and papers:**
- Dundas et al. (2023) GRL, doi:10.1029/2022GL100747: crater table, CC BY-NC-ND 4.0, used unmodified and not redistributed in adapted form.
- Daubar et al. (2022) JGR Planets, doi:10.1029/2021JE007145, Zenodo 6604912, CC BY 4.0.
- Mellon et al. (2009) JGR, doi:10.1029/2009JE003417.
- Byrne et al. (2009) Science, doi:10.1126/science.1175307.
- Courville et al. (2026) PSJ 7:183, doi:10.3847/PSJ/ae8904.
- Sizemore et al. (2026) PSJ 7:175, doi:10.3847/PSJ/ae7b38.
- SWIM project (PSI/JPL), https://swim.psi.edu.
- Tanaka et al. (2014) USGS SIM 3292, doi:10.3133/sim3292.
- Hamran et al. (2020), RIMFAX.
- Rasmussen and Williams (2006), Gaussian Processes for Machine Learning.

**NASA operations documents:**
- EVA-EXP-0042 Rev. B (xEVA System ConOps).
- Surface EVA Architectural Drivers (NTRS 20230014957).
- Human Health and Performance (NTRS 20230015521).
- NASA-STD-3001.
- SkyFall mission information package (Sep 2026).

**Software:** FastAPI, NumPy, SciPy, rasterio, Next.js, CesiumJS, Tailwind CSS, Base UI, Bun, moon.

Full list with every value and its source: `docs/SOURCES.md` in the repository.
