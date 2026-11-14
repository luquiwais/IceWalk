/**
 * Validated numbers shown in the Evidence and "Radar first" panels. They are
 * results of the ice model, not live values: each block names the code that
 * produces it and the experiment entry that records it (docs/EXPERIMENTS.md,
 * 2026-11-12). Update them only by re-running that code.
 */
import zones from "@/mock/exploration-zones.json";
import type { SiteAssessment } from "./plan";

/** packages/model/gp/tool_strategy.py: S1094b prior, 1 m drill, 6 stations. */
export const RADAR_FIRST = {
  blindHit: 0.058,
  guidedHit: 0.504,
  lift: 8.7,
  liftRange: [5.7, 11.4] as const,
  evasBlind: 3.3,
  evasGuided: 1.16,
  evasGuided20: 1.58,
  soundingsPerEva: 50,
  source: "gp/tool_strategy.py · radar error σ 0.18 and 25 % false reflectors (documented assumptions)",
};

/** packages/model/gp/regional_validation.py: each impact predicted without its 60° longitude sector. */
export const CALIBRATION = {
  impacts: 383,
  iceImpacts: 37,
  expectedIce: 36.2,
  brier: 0.033,
  brierConstant: 0.087,
  bins: [
    { range: "0–5 %", n: 306, predicted: 0.003, observed: 0.003 },
    { range: "5–20 %", n: 27, predicted: 0.093, observed: 0.111 },
    { range: "20–50 %", n: 18, predicted: 0.339, observed: 0.333 },
    { range: "50–80 %", n: 13, predicted: 0.643, observed: 0.846 },
    { range: "80–100 %", n: 19, predicted: 0.96, observed: 0.842 },
  ],
  source: "Daubar et al. 2022 fresh impacts (CC BY 4.0) · out-of-sample by longitude sector",
};

/** Places where a mission dug; the model never saw them. */
export const GROUND_TRUTH = [
  {
    site: "Phoenix · 68.2°N",
    found: "Ice at 4.6 cm (mean of the trenches)",
    model: "7 cm median · 90 % range 2–22 cm",
    verdict: "Agrees",
    source: "Mellon et al. 2009, JGR",
  },
  {
    site: "Viking Lander 2 · 48°N",
    found: "No ice in a 10–15 cm trench",
    model: "1 % chance of ice within 15 cm",
    verdict: "Agrees with the observation",
    source: "NASA/JPL PIA12214",
  },
  {
    site: "Viking Lander 2 · Byrne et al. 2009",
    found: "Estimate: ice just below the trench",
    model: "10 % chance within 30 cm",
    verdict: "Open tension, stated",
    source: "Byrne et al. 2009, Science",
  },
];

/** What does not work, stated (EXPERIMENTS 2026-11-08 and 2026-11-12). */
export const LIMITS = [
  "Neighbouring craters do not predict ice at site scale (AUC 0.52), so the map shows uncertainty instead of promising where the ice is.",
  "That test has little power: with real spatial structure, 28 % of simulated sites look just as flat. Only measurements a few tens of meters apart will tell.",
  "Latitude-only prior: conservative in Arcadia (twice the expected ice exposures) and extrapolated south of 39.1°N, where S1094b sits.",
];

/** USGS SIM 3292 (Tanaka et al. 2014), queried through Mars Trek at 35.11°N, 189.83°E. */
export const GEOLOGY = {
  unit: "lAv",
  name: "Late Amazonian volcanic unit",
  description: "Flood lavas of Amazonis Planitia, meters to tens of meters thick (1:20M regional context).",
  source: "USGS-NASA Geologic Map of Mars, SIM 3292",
};

export type ZoneCard = { name: string; lat_deg: number; lon_e_deg: number; site_assessment: SiteAssessment };
type ZonesFile = {
  zones: ZoneCard[];
  reference_site: ZoneCard;
  skyfall: { source: string; reference_site: ZoneCard; candidate_regions: string[]; site_proposals_due?: string };
};

/** packages/model/scripts/exploration_zones.py (Mars Trek EZMars + regional prior). */
export const ZONES = zones as unknown as ZonesFile;

/** NASA zones with data, best first by the SkyFall-class 3 m radar. */
export function rankedZones(limit = 6): ZoneCard[] {
  return ZONES.zones
    .filter((z) => z.site_assessment.status !== "no_data" && z.site_assessment.tools.skyfall_radar)
    .sort((a, b) => b.site_assessment.tools.skyfall_radar.p_ice - a.site_assessment.tools.skyfall_radar.p_ice)
    .slice(0, limit);
}

/** Display names for tools that are not in the crew catalog. */
export const PRECURSOR_LABEL: Record<string, string> = { skyfall_radar: "SkyFall radar · aerial precursor (2030)" };
