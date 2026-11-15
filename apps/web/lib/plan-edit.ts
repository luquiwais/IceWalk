/**
 * Editing a plan by hand (Plan, before approval): the stations as POST /evaluate takes them, and the
 * planner's verdict on the result in one line, for the dragged marker and the panel.
 */
import type { EditedStation } from "./api";
import { formatNumber } from "./format";
import { orderedStations, type Plan } from "./plan";

/** The plan's stations in walking order, with one moved to `move.xy` or `remove` left out. */
export function editedStations(plan: Plan, change: { move?: { id: string; xy: [number, number] }; remove?: string }): EditedStation[] {
  return orderedStations(plan)
    .filter((s) => s.id !== change.remove)
    .map((s) => ({ id: s.id, position: s.id === change.move?.id ? change.move.xy : [s.position[0], s.position[1]] }));
}

export type EditLevel = "go" | "caution" | "warning";

const hm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")}`;

/** Viable or not, and why, from the planner's own alerts and margin (never a rule of our own). */
export function editVerdict(plan: Plan): { level: EditLevel; text: string } {
  const margin = plan.summary.min_walkback_margin_min;
  const m = margin == null ? "margin unknown" : `margin ${formatNumber(margin, 0)} min`;
  const alerts = plan.alerts ?? [];
  if (alerts.some((a) => a.level === "warning") || (margin != null && margin < 0)) return { level: "warning", text: `Not viable · ${m}` };
  const caution = plan.summary.walkback_caution_min;
  if (alerts.some((a) => a.level === "caution" && /walkback/i.test(a.message)) || (margin != null && caution != null && margin < caution)) {
    return { level: "caution", text: `Viable, tight · ${m} · EVA ${hm(plan.summary.duration_min)}` };
  }
  return { level: "go", text: `Viable · ${m} · EVA ${hm(plan.summary.duration_min)}` };
}
