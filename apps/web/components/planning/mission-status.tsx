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
      <div><span title="Phase elapsed time">{execution ? "PET · simulated" : "Plan phase"}</span><strong>{execution ? clock(elapsedMin) : "Pre-egress"}</strong></div>
      <div><span>Min walkback margin</span><strong>{plan.summary.min_walkback_margin_min == null ? "Unavailable" : `${formatNumber(plan.summary.min_walkback_margin_min, 1)} min`}</strong></div>
      <div><span>Bingo · latest departure</span><strong>{bingo ? `${clock(bingo.decide_by_min)} · ${bingo.station_id}` : "None ahead"}</strong></div>
    </div>
    <div className="mission-status-source">
      {session.status === "loading" || session.status === "idle" ? <Footnote role="status">{session.source === "api" ? "Replanning…" : "Loading plan…"}</Footnote> : null}
      {alert ? <StatusBadge level={alert.level}>{alert.message}</StatusBadge> : null}
      <Footnote className="mission-provenance">{mock ? session.source === "mock" ? "Bundled mock data" : "Mock planner" : describeSource(session)}</Footnote>
      {session.error ? <Footnote role="status">{session.source === "mock" ? "Planner API unavailable. Using bundled mock data." : "Replan failed. Showing the last plan."}</Footnote> : null}
    </div>
  </section>;
});
