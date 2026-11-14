# IceWalk

**Every Mars EVA tool tells the crew where to walk. IceWalk tells them whether the walk is worth it, and with which instrument.**

IceWalk plans ice-prospecting EVAs for the first crews on Mars. At crater S1094b (Amazonis Planitia, 35.11°N, 189.83°E), the lowest-latitude ice exposure ever seen on Mars, it does four things:

- estimates the probability of ice within each tool's reach, with its uncertainty, from 349 real craters and a regional model calibrated on 383 fresh impacts;
- recommends which instrument to take (site card: GO / CONDITIONAL / NO_GO);
- plans a safe two-person traverse with NASA constraints (slope ≤ 20°, walk-back margin, EVA window, live space weather from NASA DONKI);
- re-plans after every measurement.

NASA Space Apps Challenge 2026, challenge *Interplanetary Survival Guide: Martian Map*. Team Darionautas, Buenos Aires.

## Key results

| Result | Value | Where |
| --- | --- | --- |
| Site card at S1094b | 1 m drill NO_GO (6 %); SkyFall-class 3 m radar CONDITIONAL (52 %); 10 m GPR GO (97 %) | `packages/model/gp/regional.py` |
| Radar first, then drill | 8.7× more hits per drill station; about 2.9× fewer EVAs to confirm ice | `packages/model/gp/tool_strategy.py` |
| Out-of-sample calibration | Brier 0.033 vs 0.087 (constant rate); 36.2 expected vs 37 observed ice exposures | `packages/model/gp/regional_validation.py` |
| Phoenix ground truth (never seen by the model) | Measured 4.6 cm; predicted 7 cm (90 %: 2-22 cm) | same |
| NASA Exploration Zones and SkyFall reference site AP-105 | Site card for 51 zones; AP-105: 3 m radar GO (93 %) | `packages/contracts/examples/exploration_zones.json` |
| What does not work | Neighbouring craters do not predict ice at site scale, so we show uncertainty instead of promising where the ice is | `docs/EXPERIMENTS.md` |

## Structure

`apps/` holds what runs; `packages/` holds what is shared.

| Folder | What it contains |
| --- | --- |
| `apps/web/` | Next.js + CesiumJS (Mars ellipsoid); `apps/web/mock/` lets it run without the API |
| `apps/planner/` | FastAPI planner: `/plan`, `/replan`, `/maps`, `/eva-window`, `/spaceweather` |
| `packages/model/` | Ice model: censored Gaussian process (EP), regional prior, validation, tool strategy |
| `packages/contracts/` | Grid, JSON Schemas and examples that connect the modules (`validate.py`) |
| `packages/ui/` | visionOS-style design system |
| `data/` | Layer registry (`layers.yaml`) and download scripts; data itself is not in Git |
| `docs/` | Sources, decisions, experiments (including failures), research and daily log. Internal docs are in Spanish |

## Quick start

```bash
bun install                       # installs moon (monorepo task runner)
bun run moon run :lint :test      # lint and tests for every project
bun run moon run web:dev          # web on :3000
bun run moon run planner:dev      # API on :8000

cd apps/planner && uv sync && uv run uvicorn app.main:app --reload   # API docs at /docs
cd packages/model && uv sync --extra dev && uv run pytest -q         # ice model tests
python packages/contracts/validate.py                                # contracts
python data/download.py --list                                       # data layers and links
```

## Data and credits

NASA:
- HiRISE (NASA/JPL-Caltech/UArizona), via the USGS Astrogeology STAC;
- JPL Mars Trek (Exploration Zones, Viking MDIM 2.1);
- USGS-NASA Geologic Map of Mars (SIM 3292);
- NASA CCMC DONKI;
- Viking Lander 2, Phoenix, MOLA and THEMIS.

Space Agency Partners: ESA/DLR (Mars Express HRSC, in the MOLA-HRSC DEM) and ASI (SHARAD, in the SWIM maps).

Science: Dundas et al. 2023 (CC BY-NC-ND 4.0, not redistributed), Daubar et al. 2022 (CC BY 4.0), SWIM (PSI/JPL), Mellon et al. 2009, Courville et al. 2026, Sizemore et al. 2026.

Every value and its source: [`docs/SOURCES.md`](docs/SOURCES.md).

## Use of Super Intelligence (SI)

We used Claude (Anthropic) as a coding and research assistant (code and tests, literature search, documentation drafts). The concept, scientific choices and product decisions are the team's. Each AI-assisted commit carries a `Co-Authored-By: Claude` trailer. No SI-generated images, video or audio are used.

## License

Apache 2.0. NASA/JPL/USGS data are public domain; third-party data keep their own licenses (see `docs/SOURCES.md`).
