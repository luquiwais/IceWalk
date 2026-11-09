/**
 * Types for the plan contract (contracts/schemas/plan.schema.json), the response
 * of POST /plan and POST /replan. The schema is the source of truth; examples and
 * mocks are checked against it by `python contracts/validate.py`.
 */
import type { AlertLevel } from "@icewalk/ui/status-badge";
import mockPlan from "@/mock/plan.json";

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

/**
 * The illustrative plan exported by planner/scripts/export_mocks.py. JSON imports
 * widen tuples and enums, so the cast goes through unknown; the mock itself is
 * validated against the schema in CI.
 */
export const demoPlan = mockPlan as unknown as Plan;
