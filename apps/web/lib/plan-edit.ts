/**
 * Editing a plan by hand (Plan, before approval): the stations as POST /evaluate takes them, and the
 * planner's verdict on the result in one line, for the dragged marker and the panel.
 */
import type { EditedStation } from "./api";
import { formatNumber } from "./format";
import { orderedStations, type Plan } from "./plan";

type Change = {
  move?: { id: string; xy: [number, number] };
  remove?: string;
  /** One place earlier (-1) or later (+1) in the walking order. */
  shift?: { id: string; by: -1 | 1 };
  /** A new station (no id: the planner names and scores it) right after `after`. */
  add?: { after: string; xy: [number, number] };
};

/**
 * The plan's stations in walking order, as POST /evaluate takes them (it keeps the order given):
 * one moved, left out, shifted one place, or a new one inserted after another.
 */
export function editedStations(plan: Plan, change: Change): EditedStation[] {
  const list: EditedStation[] = orderedStations(plan)
    .filter((s) => s.id !== change.remove)
    .map((s) => ({ id: s.id, position: s.id === change.move?.id ? change.move.xy : [s.position[0], s.position[1]] }));
  if (change.shift) {
    const i = list.findIndex((s) => s.id === change.shift!.id);
    const j = i + change.shift.by;
    if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
  }
  if (change.add) {
    const i = list.findIndex((s) => s.id === change.add!.after);
    list.splice(i < 0 ? list.length : i + 1, 0, { position: change.add.xy });
  }
  return list;
}

/** Where "Add after" puts a new station: halfway to the next stop (the next station, or the habitat). */
export function midpointAfter(plan: Plan, id: string, habitat: readonly [number, number]): [number, number] {
  const order = orderedStations(plan);
  const i = order.findIndex((s) => s.id === id);
  const a = order[i]?.position ?? habitat;
  const b = order[i + 1]?.position ?? habitat;
  return [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)];
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
