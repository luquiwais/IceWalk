import { formatNumber } from "@/lib/format";
import { missionConstraints, routeMaxSlope, type Plan } from "@/lib/plan";
import type { EvaWindow } from "@/lib/use-eva-window";

export type RuleLevel = "go" | "advisory" | "caution" | "warning" | "unknown";
export type FlightRule = {
  id: string;
  name: string;
  value: string;
  /** Unit of the value when the tile has no room for it (read in the label and the tooltip). */
  unit?: string;
  /** The limit in plain words, e.g. "of 6:24 allowed". */
  limit: string;
  /** One sentence on what the rule protects and where the limit comes from. */
  explain: string;
  level: RuleLevel;
  assumption?: boolean;
};

const hm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")}`;

/**
 * The plan against its flight rules (Kagey 2024; Caswell y Kostak 2025, table 1): value, limit and level,
 * each with one plain sentence. Limits come from the STM and the planner's feasibility; thresholds the STM
 * marks as assumptions are flagged. A rule without data is "unknown", never a pass ([V2 10020]).
 */
export function flightRules(plan: Plan, window?: EvaWindow): FlightRule[] {
  const c = missionConstraints(plan);
  const s = plan.summary;
  const f = s.feasibility;
  const rules: FlightRule[] = [];

  const budget = c ? c.eva_max_h * 60 * (1 - c.reserve) : undefined;
  rules.push({
    id: "duration", name: "Duration", value: hm(s.duration_min),
    limit: budget ? `≤ ${hm(budget)}` : "limit unknown",
    explain: c ? `Egress to ingress, walking included. ${c.eva_max_h} h minus a ${Math.round(c.reserve * 100)} % reserve (STM).` : "Egress to ingress, walking included.",
    level: budget == null ? "unknown" : s.duration_min > budget ? "warning" : "go",
  });

  const margin = s.min_walkback_margin_min;
  const caution = s.walkback_caution_min ?? c?.walkback_caution_min;
  rules.push({
    id: "walkback", name: "Walkback margin", value: margin == null ? "—" : `${formatNumber(margin, 0)} min`,
    limit: caution != null ? `≥ ${formatNumber(caution, 0)} min*` : "> 0 min",
    explain: "Spare time if the crew had to turn back at the worst point of the plan. Below 15 min is a caution; the threshold is an assumption.",
    level: margin == null ? "unknown" : margin < 0 ? "warning" : caution != null && margin < caution ? "caution" : "go",
    assumption: true,
  });

  const out = s.max_distance_from_habitat_km;
  const maxOut = c?.walkback_max_km;
  rules.push({
    id: "distance", name: "Distance out", value: out == null ? "—" : `${formatNumber(out, 2)} km`,
    limit: maxOut != null ? `≤ ${formatNumber(maxOut, 1)} km` : "limit unknown",
    explain: "Farthest station from the habitat: walkable back if a suit or rover fails (30 min at 3.5 km/h, NASA ICES-2026-127).",
    level: out == null || maxOut == null ? "unknown" : out > maxOut ? "warning" : "go",
  });

  const slope = routeMaxSlope(plan);
  rules.push({
    id: "slope", name: "Route slope", value: slope == null ? "—" : `${formatNumber(slope, 1)}°`,
    limit: c ? `≤ ${c.max_slope_deg}°` : "limit unknown",
    explain: "Steepest leg of the traverse on the HiRISE terrain model.",
    level: slope == null || !c ? "unknown" : slope > c.max_slope_deg ? "warning" : "go",
  });

  const gap = f?.comms.max_min_without_los;
  const gapLimit = f?.comms.limit_min;
  rules.push({
    id: "comms", name: "Comms gap", value: gap == null ? "—" : `${formatNumber(gap, 0)} min`,
    limit: gapLimit != null ? `≤ ${formatNumber(gapLimit, 0)} min*` : "limit unknown",
    explain: f?.comms.stations_without_los?.length ? `Longest stretch without line of sight to the habitat; blocked at ${f.comms.stations_without_los.join(", ")}: relay through the EV partner.` : "Longest stretch without line of sight to the habitat antenna. The limit is an assumption.",
    level: gap == null || gapLimit == null ? "unknown" : gap > gapLimit ? "warning" : f?.comms.stations_without_los?.length ? "caution" : "go",
    assumption: true,
  });

  const e = f?.effort;
  rules.push({
    id: "effort", name: "Metabolic rate", value: e ? formatNumber(e.average_btu_h, 0) : "—", unit: "BTU/h",
    limit: e?.average_limit_btu_h != null ? `≤ ${formatNumber(e.average_limit_btu_h, 0)}` : "limit unknown",
    explain: "Average metabolic rate over the EVA, in BTU/h, against the suit design average.",
    level: !e || e.average_limit_btu_h == null ? "unknown" : e.average_btu_h > e.average_limit_btu_h || (e.peak_limit_btu_h != null && e.peak_btu_h > e.peak_limit_btu_h) ? "caution" : "go",
  });

  const carry = f?.carry;
  const unknown = carry?.unknown_mass?.length ?? 0;
  rules.push({
    id: "carry", name: "Carry per EV", value: carry ? `${formatNumber(carry.per_crew_kg, 1)} kg` : "—",
    limit: carry?.allowance_kg != null ? `≤ ${formatNumber(carry.allowance_kg, 0)} kg` : "limit unknown",
    explain: `Tools each EV carries${unknown ? `; ${unknown} item${unknown === 1 ? "" : "s"} without a mass yet` : ""}.`,
    level: !carry || carry.allowance_kg == null ? "unknown" : carry.per_crew_kg > carry.allowance_kg ? "caution" : unknown ? "advisory" : "go",
  });

  const rec = window?.recommended;
  const sep = window?.space_weather?.events.some((ev) => ev.kind === "sep");
  rules.push({
    id: "window", name: "EVA window", value: rec ? `Sol ${rec.sol}` : window ? "None" : "—",
    limit: rec ? `${rec.start_ltst}–${rec.end_ltst}` : window ? "no safe start" : "loading",
    explain: `Best start in the next sols for light, temperature, wind and dust${window?.space_weather ? `; NASA DONKI ${sep ? "reports a solar particle event" : "shows no solar particle event"}` : ""}.`,
    level: !window ? "unknown" : !rec ? "warning" : !rec.go ? "caution" : rec.level === "none" ? "go" : rec.level,
  });

  return rules;
}

/** The worst level among the rules, for the summary line. */
export function worstLevel(rules: readonly FlightRule[]): RuleLevel {
  const rank: Record<RuleLevel, number> = { go: 0, unknown: 1, advisory: 2, caution: 3, warning: 4 };
  return rules.reduce<RuleLevel>((worst, r) => (rank[r.level] > rank[worst] ? r.level : worst), "go");
}
