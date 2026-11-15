import { memo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { formatNumber } from "@/lib/format";
import { highestAlert, nextStation, orderedStations, stationBlock, timelineViolations, type DecisionPoint, type Measurement, type Plan } from "@/lib/plan";
import type { PlanSessionState } from "@/lib/use-plan-session";
import { PlanTimeline } from "./plan-timeline";
import { clock } from "./parts";

/** The bingo the crew faces next: the decision point of the next station in walking order (not the earliest time). */
export function nextStationBingo(plan: Plan, measurements: readonly Measurement[]): DecisionPoint | undefined {
  const points = plan.decision_points ?? [];
  const done = new Set(measurements.map((m) => m.station_id));
  for (const s of orderedStations(plan)) {
    if (done.has(s.id)) continue;
    const point = points.find((p) => p.station_id === s.id);
    if (point) return point;
  }
  return undefined;
}

type Props = {
  plan: Plan; previousPlan?: Plan; measurements: readonly Measurement[]; session: PlanSessionState;
  execution: boolean; elapsedMin: number; open: boolean; onToggle: () => void;
  stationId: string | null; hoveredId: string | null; onSelectStation: (id: string) => void; onHoverStation: (id: string | null) => void;
};

/**
 * Bottom dock, the same in every map phase (NASA-STD-3001 [V2 10005], HIDH 10.6.15): one status line with
 * PET, walkback margin, the next bingo and the top alert, and the traverse timeline on demand.
 */
export const MissionDock = memo(function MissionDock({ plan, previousPlan, measurements, session, execution, elapsedMin, open, onToggle, stationId, hoveredId, onSelectStation, onHoverStation }: Props) {
  const next = nextStation(plan, [...measurements]);
  const nextMargin = next ? stationBlock(plan, next.id)?.walkback_margin_min : undefined;
  const planMin = plan.summary.min_walkback_margin_min;
  const caution = plan.summary.walkback_caution_min ?? 15;
  const margin = execution && nextMargin != null ? nextMargin : planMin;
  const bingo = nextStationBingo(plan, measurements);
  const alert = highestAlert([...(plan.alerts ?? []), ...timelineViolations(plan)]);
  const pending = session.status === "loading" || session.status === "idle";
  const end = Math.max(...plan.timeline.map((t) => t.t_end_min), 1);
  const blocks = plan.timeline.filter((t) => t.t_end_min > t.t_start_min);
  return <section className="mission-dock" aria-label="EVA status" data-open={open} data-pending={pending || undefined}>
    <div className="mission-dock-line">
      <div className="mission-dock-cell" title={execution ? "PET: phase elapsed time, the EVA clock from egress (simulated)" : "Planned EVA duration: the EVA has not started"}><span>PET</span><strong>{pending && !execution ? "—" : clock(execution ? elapsedMin : plan.summary.duration_min)}</strong><span className="mission-dock-mode" data-sim={execution || undefined}>{execution ? "SIM" : "planned"}</span></div>
      <div className="mission-dock-cell" title="Walkback margin: minutes to spare if the crew had to walk back to the habitat. During the EVA, at the next station; the plan minimum beside it" data-alert={margin != null && margin < caution ? "caution" : undefined}>
        <span>Walkback margin</span><strong>{pending ? "—" : margin == null ? "Unavailable" : `${formatNumber(margin, 0)} min`}<small>{execution && nextMargin != null && planMin != null ? ` plan min ${formatNumber(planMin, 0)}` : " plan min"}</small></strong>
      </div>
      <div className="mission-dock-cell" title="Bingo: the latest time to leave the next decision station and still get back with margin"><span>Bingo</span><strong>{pending ? "—" : bingo ? <>{clock(bingo.decide_by_min)}<small> {bingo.station_id}</small></> : "None ahead"}</strong></div>
      <div className="mission-dock-cell mission-dock-alert"><span>Alerts</span>{pending ? <strong role="status">{session.source === "api" ? "Replanning…" : "Loading…"}</strong> : alert ? <span className="mission-dock-badge" title={alert.message}><StatusBadge level={alert.level}>{alert.message}</StatusBadge></span> : <strong>None</strong>}</div>
      <div className="mission-dock-bar" aria-hidden>
        {blocks.map((t, i) => <i key={i} data-kind={t.kind} style={{ left: `${t.t_start_min / end * 100}%`, width: `${(t.t_end_min - t.t_start_min) / end * 100}%` }} />)}
        {execution ? <b style={{ left: `${Math.min(100, elapsedMin / end * 100)}%` }} /> : null}
      </div>
      <button type="button" className="mission-dock-toggle" aria-expanded={open} onClick={onToggle}>Timeline{open ? <ChevronDown aria-hidden /> : <ChevronUp aria-hidden />}</button>
    </div>
    {open ? <PlanTimeline bare plan={plan} previousPlan={previousPlan} stationId={stationId} hoveredId={hoveredId} elapsedMin={execution ? elapsedMin : undefined} onSelectStation={onSelectStation} onHoverStation={onHoverStation} /> : null}
  </section>;
});
