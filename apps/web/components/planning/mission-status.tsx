import { memo } from "react";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Footnote } from "@icewalk/ui/text";
import { highestAlert, nextBingo, timelineViolations, type Plan } from "@/lib/plan";
import { formatNumber } from "@/lib/format";
import type { PlanSessionState } from "@/lib/use-plan-session";
import { describeSource } from "@/lib/use-plan-session";
import { clock } from "./parts";

export const MissionStatus = memo(function MissionStatus({ plan, elapsedMin, execution, session }: {
  plan: Plan; elapsedMin: number; execution: boolean; session: PlanSessionState;
}) {
  const bingo = nextBingo(plan, elapsedMin);
  const alert = highestAlert([...(plan.alerts ?? []), ...timelineViolations(plan)]);
  const mock = session.source === "mock" || session.isMock;
  return <section className="mission-status" aria-label="EVA status">
    <div className="mission-status-values">
      <div title={execution ? "Phase elapsed time: the EVA clock (simulated)" : "The EVA has not started"}><span>{execution ? <>EVA clock <span className="mission-sim" title="Simulated execution">SIM</span></> : "Status"}</span><strong>{execution ? clock(elapsedMin) : "Planning"}</strong></div>
      <div title="Minutes to spare if the crew had to walk back to the habitat from the worst point of the plan (walkback margin)"><span>Spare time to return</span><strong>{plan.summary.min_walkback_margin_min == null ? "Unavailable" : `${formatNumber(plan.summary.min_walkback_margin_min, 0)} min`}</strong></div>
      <div title="Bingo: the latest time to leave the next decision station and still get back safely"><span>Leave by (bingo)</span><strong>{bingo ? `${clock(bingo.decide_by_min)} · ${bingo.station_id}` : "None ahead"}</strong></div>
    </div>
    {alert || session.error || session.status === "loading" || session.status === "idle" ? <div className="mission-status-source">
      {session.status === "loading" || session.status === "idle" ? <Footnote role="status">{session.source === "api" ? "Replanning…" : "Loading plan…"}</Footnote> : null}
      {alert ? <span title={alert.message}><StatusBadge level={alert.level}>{alert.message}</StatusBadge></span> : null}
      {session.error ? <Footnote role="status">{session.source === "mock" ? "Planner API unavailable. Using bundled mock data." : "Replan failed. Showing the last plan."}</Footnote> : null}
    </div> : null}
    <Footnote className="mission-provenance">{mock ? session.source === "mock" ? "Bundled mock data" : "Mock planner" : describeSource(session)}</Footnote>
  </section>;
});
