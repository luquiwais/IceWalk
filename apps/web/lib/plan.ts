/**
 * Types for the plan contract (contracts/schemas/plan.schema.json), the response
 * of POST /plan and POST /replan. The schema is the source of truth; examples and
 * mocks are checked against it by `python contracts/validate.py`.
 */
import type { AlertLevel } from "@icewalk/ui/status-badge";
import mockMeasurement from "@/mock/measurement.json";
import mockPlan from "@/mock/plan.json";
import mockReplan from "@/mock/replan.json";
import toolsCatalog from "../../../packages/contracts/examples/tools.catalog.json";
import defaultStm from "../../../packages/contracts/examples/stm.s1094b.json";

export type Priority = "high" | "medium" | "low";

export type Station = {
  id: string;
  order: number;
  /** Grid meters (contracts/grid.json). */
  position: [number, number];
  /** East longitude and latitude, for the web. */
  lonlat?: [number, number];
  priority: Priority;
  objective_ranks: number[];
  tools: string[];
  tasks: { EV1?: string[]; EV2?: string[] };
  duration_min: number;
  hypothesis: string;
  /** P(ice depth ≤ the STM threshold), from the GP. */
  p_ice: number;
  /** Entropy of p_ice in bits: 0 = known, 1 = most ambiguous. */
  uncertainty: number;
  /** Value of measuring here, in [0, 1] (gp.planning.rank_candidates). */
  value: number;
  planetary_protection?: "none" | "sensitive";
  terrain_unit?: number;
  /** survey: chosen by the ice map; target: fixed position from the STM. */
  kind?: "survey" | "target";
  depth_median_m?: number;
  depth_shallow_m?: number;
};

export type TimelineItem = {
  t_start_min: number;
  t_end_min: number;
  kind: "egress" | "traverse" | "station" | "ingress" | "reserve";
  label: string;
  station_id?: string | null;
  walkback_margin_min?: number;
};

export type PlanSummary = {
  duration_min: number;
  distance_km: number;
  max_distance_from_habitat_km?: number;
  min_walkback_margin_min?: number;
  /** Caution threshold for the walkback margin, from the STM. */
  walkback_caution_min?: number;
  dose_estimate_msv?: number;
  expected_uncertainty_reduction: number;
  crew?: number;
  is_mock?: boolean;
  ice_threshold_m?: number;
  craters_in_model?: number;
};

export type PlanAlert = {
  level: AlertLevel;
  message: string;
  source?: string;
};

export type DecisionOption = {
  rank: number;
  if_result: "ice" | "no_ice" | "inconclusive" | "any";
  probability?: number | null;
  next_station_ids: string[];
  /** Stations of this option that are not in the nominal plan. */
  next_stations?: { id: string; position: [number, number]; lonlat?: [number, number]; p_ice?: number }[];
  rationale: string;
};

/** What to do after measuring at a station (contract: decision_points). The crew decides. */
export type DecisionPoint = {
  station_id: string;
  /** Bingo time: latest minute to leave the station with walkback margin ≥ 0. */
  decide_by_min: number;
  hard_stop?: string;
  default_option: number;
  options: DecisionOption[];
};

export type Plan = {
  mission_id: string;
  plan_id: string;
  replanned_from?: string | null;
  stations: Station[];
  route: { type: "FeatureCollection"; features: unknown[] };
  timeline: TimelineItem[];
  decision_points?: DecisionPoint[];
  equipment?: { tool: string; count: number; mass_kg?: number | null; justification?: string }[];
  summary: PlanSummary;
  alerts?: PlanAlert[];
};

/** A measurement logged at a station (contracts/schemas/measurement.schema.json). */
export type Measurement = {
  station_id: string;
  tool: string;
  result: "ice" | "no_ice" | "inconclusive";
  depth_m?: number | null;
  weh_percent?: number | null;
  position: [number, number];
  timestamp: string;
  crew_member?: "EV1" | "EV2";
  notes?: string;
};

/**
 * The demo plan, its replan after the first measurement and that measurement, as
 * exported by apps/planner/scripts/export_mocks.py. JSON imports widen tuples and
 * enums, so the casts go through unknown; the mocks are validated against the
 * schemas in CI (contracts:validate).
 */
export const demoPlan = mockPlan as unknown as Plan;
export const demoReplan = mockReplan as unknown as Plan;
export const demoMeasurement = mockMeasurement as unknown as Measurement;

export function orderedStations(plan: Plan): Station[] {
  return [...plan.stations].sort((a, b) => a.order - b.order);
}

export function stationById(plan: Plan, id: string): Station | undefined {
  return plan.stations.find((s) => s.id === id);
}

export function decisionPointFor(plan: Plan, stationId: string): DecisionPoint | undefined {
  return plan.decision_points?.find((p) => p.station_id === stationId);
}

export type TimelineViolation = { index: number; level: AlertLevel; message: string };

/**
 * Constraint violations the plan itself defines: a negative walkback margin means
 * the crew could not get back with the reserve. The UI adds no thresholds of its
 * own; the planner reports everything else as alerts.
 */
export function timelineViolations(plan: Plan): TimelineViolation[] {
  return plan.timeline.flatMap((item, index) =>
    item.walkback_margin_min !== undefined && item.walkback_margin_min < 0
      ? [{ index, level: "warning" as const, message: `${item.label}: walkback margin ${item.walkback_margin_min} min` }]
      : [],
  );
}

type SummaryNumber = "duration_min" | "distance_km" | "min_walkback_margin_min" | "dose_estimate_msv" | "max_distance_from_habitat_km";

export type PlanDiff = {
  added: Station[];
  removed: Station[];
  /** after - before; undefined when either plan lacks the value. */
  delta: Record<SummaryNumber, number | undefined>;
};

const SUMMARY_NUMBERS: SummaryNumber[] = [
  "duration_min",
  "distance_km",
  "min_walkback_margin_min",
  "dose_estimate_msv",
  "max_distance_from_habitat_km",
];

/** What a replan changed: stations in and out, and the summary deltas. */
export function diffPlans(before: Plan, after: Plan): PlanDiff {
  const beforeIds = new Set(before.stations.map((s) => s.id));
  const afterIds = new Set(after.stations.map((s) => s.id));
  const delta = Object.fromEntries(
    SUMMARY_NUMBERS.map((key) => {
      const a = before.summary[key];
      const b = after.summary[key];
      return [key, a === undefined || b === undefined ? undefined : b - a];
    }),
  ) as PlanDiff["delta"];

  return {
    added: orderedStations(after).filter((s) => !beforeIds.has(s.id)),
    removed: orderedStations(before).filter((s) => !afterIds.has(s.id)),
    delta,
  };
}

type CatalogTool = { id: string; name: string; mass_kg?: number | null; depth_m?: number; measures?: string[] };
const TOOLS = new Map((toolsCatalog as CatalogTool[]).map((t) => [t.id, t]));

/** Tool name from the certified catalog (contracts/examples/tools.catalog.json). */
export function toolName(id: string): string {
  return TOOLS.get(id)?.name ?? id.replaceAll("_", " ");
}

/** First remaining station, independent of whether a result caused a re-plan. */
export function nextStation(plan: Plan, measurements: readonly Measurement[]): Station | undefined {
  const measured = new Set(measurements.map((m) => m.station_id));
  return orderedStations(plan).find((s) => !measured.has(s.id));
}

export function toolReachM(id: string): number | undefined {
  return TOOLS.get(id)?.depth_m;
}

/** Prefer an assigned ice-presence instrument; never substitute an unassigned tool. */
export function measuringTool(station: Station): string {
  return station.tools.find((id) => TOOLS.get(id)?.measures?.includes("ice_presence")) ?? station.tools[0] ?? "";
}

export function measurementSummary(measurement: Measurement): string {
  if (measurement.result === "inconclusive") return "inconclusive";
  const depth = measurement.depth_m;
  const label = measurement.result === "ice" ? "ice" : "no ice";
  return depth == null ? label : `${label} ${measurement.result === "ice" ? "at" : "to"} ${depth.toFixed(1)} m`;
}

/** Grid bearing, clockwise from north; positions are meters in the common grid. */
export function bearing(from: readonly number[], to: readonly number[]) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const deg = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
  const point = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
  return { deg, point, distanceM: Math.hypot(dx, dy), label: `${String(Math.round(deg) % 360).padStart(3, "0")}° ${point}` };
}

/**
 * Heading of the leg ahead, in grid degrees: toward the next unmeasured station,
 * or along the route after it when the crew already stands on that station.
 */
export function traverseHeading(plan: Plan, measurements: readonly Measurement[], from: readonly number[]): number | undefined {
  const measured = new Set(measurements.map((m) => m.station_id));
  const remaining = orderedStations(plan).filter((s) => !measured.has(s.id));
  const ahead = remaining.find((s) => bearing(from, s.position).distanceM >= 1);
  return remaining.length && ahead ? bearing(from, ahead.position).deg : undefined;
}

/** The planner's default STM is known only for this mission id (main.py DEFAULT_STM). */
export function evaLimitMin(plan: Plan): number | undefined {
  return plan.mission_id === defaultStm.mission_id ? defaultStm.constraints.eva_max_h * 60 : undefined;
}

export function missionObjective(plan: Plan): string | undefined {
  return plan.mission_id === defaultStm.mission_id ? defaultStm.objectives[0].title : undefined;
}

export function evaName(plan: Plan): string {
  const match = plan.mission_id.match(/(?:^|-)eva(\d+)$/i);
  return match ? `EVA ${Number(match[1])}` : plan.mission_id;
}

export function nextBingo(plan: Plan, elapsedMin = 0): DecisionPoint | undefined {
  return [...(plan.decision_points ?? [])].filter((p) => p.decide_by_min >= elapsedMin)
    .sort((a, b) => a.decide_by_min - b.decide_by_min)[0];
}

export function stationBlock(plan: Plan, id: string): TimelineItem | undefined {
  return plan.timeline.find((t) => t.kind === "station" && t.station_id === id);
}

export function highestAlert(alerts: readonly PlanAlert[]): PlanAlert | undefined {
  const rank = { advisory: 1, caution: 2, warning: 3 };
  return [...alerts].sort((a, b) => rank[b.level] - rank[a.level])[0];
}

/** Total of the known masses; tools without a mass in the catalog are counted apart. */
export function totalEquipmentMass(equipment: NonNullable<Plan["equipment"]>) {
  return equipment.reduce(
    (acc, item) =>
      item.mass_kg === null || item.mass_kg === undefined
        ? { ...acc, unknown: acc.unknown + item.count }
        : { ...acc, known_kg: acc.known_kg + item.mass_kg * item.count },
    { known_kg: 0, unknown: 0 },
  );
}
