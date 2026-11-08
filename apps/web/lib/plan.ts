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
  p_ice: number;
  uncertainty: number;
  value: number;
  planetary_protection?: "none" | "sensitive";
  terrain_unit?: number;
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
};

export type PlanAlert = {
  level: AlertLevel;
  message: string;
  source?: string;
};

export type Plan = {
  mission_id: string;
  plan_id: string;
  replanned_from?: string | null;
  stations: Station[];
  route: { type: "FeatureCollection"; features: unknown[] };
  timeline: TimelineItem[];
  branches?: unknown[];
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
