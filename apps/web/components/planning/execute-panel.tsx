import { Button } from "@icewalk/ui/button";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import type { ReactNode } from "react";
import { habitatOf } from "@/components/site/site-data";
import { formatNumber } from "@/lib/format";
import { bearing, decisionPointFor, diffPlans, measurementSummary, measuringTool, nextStation, toolName, type Measurement, type Plan, type ReplanAssessment } from "@/lib/plan";
import { RESULT_LABEL } from "./parts";
import { NextStep } from "./phases";

/**
 * Phase 4, IV console: the IV follows the EVA from the habitat. Results come only from the EV
 * at the station (the IV is not there to measure); the IV sees them arrive, reviews the replan
 * and concurs or calls the EVA terminate.
 */
export function ExecutePanel({ plan, previous, measurements, pending, reviewing, returning, walkback, evOnline = false, ivCall = null, onAccept, onReturn, onDebrief, tracker }: {
  plan: Plan; previous: Plan | null; measurements: Measurement[]; pending: boolean; reviewing: boolean; returning: boolean;
  /** An EV1 window is on the loop: the IV's call goes to the helmet to be copied. */
  evOnline?: boolean;
  /** The call the IV already sent on this replan, waiting for EV1 to copy. */
  ivCall?: "continue" | "terminate" | null;
  /** EVA TERMINATE: length and time of the fastest route back (GET /walkback); null if unknown. */
  walkback?: { distanceM: number; minutes: number } | null;
  onAccept: () => void; onReturn: () => void; onDebrief: () => void;
  /** The EV's track map and progress, the same the EV sees in the helmet. */
  tracker?: ReactNode;
}) {
  const last = measurements.at(-1);
  if (reviewing && previous && last) return <>{tracker}<ReplanReview before={previous} after={plan} measurement={last} onAccept={onAccept} onReturn={onReturn} evOnline={evOnline} ivCall={ivCall} /></>;
  const station = returning ? undefined : nextStation(plan, measurements);
  const origin = last?.position ?? habitatOf(plan);
  const direction = station ? bearing(origin, station.position) : undefined;
  const decision = station ? decisionPointFor(plan, station.id) : undefined;
  const nexts = decision ? [...new Set(decision.options.map((o) => o.next_station_ids[0] ?? ""))] : [];
  const then = !decision ? undefined : nexts.length === 1
    ? `${nexts[0] || "habitat"} for any result`
    : decision.options.map((o) => `${RESULT_LABEL[o.if_result]} → ${o.next_station_ids[0] ?? "habitat"}`).join(" · ");
  return (
    <section aria-label="EVA execution" className="mission-stack mission-iv">
      {tracker}
      {returning ? <StatusBadge level="caution">EVA TERMINATE · {walkback ? `fastest walkback ${formatNumber(walkback.distanceM, 0)} m, ${formatNumber(walkback.minutes, 0)} min` : "walkback to the habitat"}</StatusBadge> : null}
      {station && direction ? (
        <section className="mission-iv-station" aria-label={last ? "Next station" : "Current station"}>
          <span className="mission-iv-key">{last ? "Next station" : "Current station"}</span>
          <strong>{String(station.order).padStart(2, "0")} · {station.id}</strong>
          <span>{direction.distanceM >= 1 ? `${Math.round(direction.distanceM)} m ${direction.label}` : "At the habitat"} · {toolName(measuringTool(station)).replace("Powered hand core drill", "Core drill")} · P(ice) {Math.round(station.p_ice * 100)}%</span>
          {then ? <span><b>Then:</b> {then}</span> : null}
        </section>
      ) : <Body>{returning ? (walkback ? "The EV follows the amber route: the fastest way back over the terrain model." : "Walkback route unavailable: the EV heads for the habitat light.") : "All planned stations measured. Return to the habitat."}</Body>}
      {station ? <Footnote role="status">{pending ? "Planner replanning..." : `Waiting for EV1 to report at ${station.id}.`}</Footnote> : null}
      {last ? <Footnote tone="secondary" aria-label="Last report">Last report: {last.station_id} · {measurementSummary(last)} · {last.crew_member ?? "EV"} ({measurements.length} logged by the EV)</Footnote> : null}
      {!station ? <NextStep label="Debrief the EVA" onClick={onDebrief} /> : null}
    </section>
  );
}

const TITLE: Record<ReplanAssessment["recommendation"], string> = { continue: "Continue the EVA", return_to_habitat: "EVA TERMINATE: begin the walkback" };

/** What a measurement changed, and the planner's call, for the IV. Shown over the map with the old route dashed. */
export function ReplanReview({ before, after, measurement, onAccept, onReturn, evOnline = false, ivCall = null }: {
  before: Plan; after: Plan; measurement: Measurement; onAccept: () => void; onReturn: () => void; evOnline?: boolean; ivCall?: "continue" | "terminate" | null;
}) {
  const diff = diffPlans(before, after);
  const r: ReplanAssessment = after.replan ?? {
    stations_kept: after.stations.filter((s) => before.stations.some((b) => b.id === s.id)).map((s) => s.id),
    stations_added: diff.added.map((s) => s.id),
    stations_dropped: diff.removed.filter((s) => s.id !== measurement.station_id).map((s) => s.id),
    margin_before_min: before.summary.min_walkback_margin_min,
    margin_after_min: after.summary.min_walkback_margin_min,
    recommendation: "continue",
    reasons: ["Planner did not assess the change: review it before continuing."],
  };
  const back = r.recommendation === "return_to_habitat";
  return (
    <section aria-label="Replan" className="mission-stack mission-replan">
      <Footnote tone="secondary">{measurementSummary(measurement)} at {measurement.station_id} · replanned</Footnote>
      <Title3 as="h3" className="mission-replan-title">{TITLE[r.recommendation]}</Title3>
      {back ? <StatusBadge level="caution">Planner recommends terminating the EVA</StatusBadge> : null}
      {r.iv_decision ? <StatusBadge level="advisory">Large replan: IV decision</StatusBadge> : null}
      <ul className="mission-reasons">{r.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <section className="mission-iv-station" aria-label="What changed">
        <span className="mission-iv-key">What changed · dashed: the plan before</span>
        <span><b>Kept</b> {r.stations_kept.length} · <b>Added</b> {r.stations_added.join(", ") || "none"} · <b>Dropped</b> {r.stations_dropped.join(", ") || "none"}</span>
        {r.margin_before_min != null && r.margin_after_min != null ? <span><b>Min walkback margin</b> {formatNumber(r.margin_before_min, 1)} → {formatNumber(r.margin_after_min, 1)} min</span> : null}
      </section>
      {ivCall ? (
        <><StatusBadge level={ivCall === "terminate" ? "caution" : "advisory"}>{ivCall === "terminate" ? "Called EVA TERMINATE" : "Called: continue"} · waiting for EV1 to copy</StatusBadge>
          <Button variant="plain" onClick={ivCall === "terminate" ? onAccept : onReturn}>{ivCall === "terminate" ? "Change call: continue" : "Change call: EVA terminate"}</Button></>
      ) : back ? (
        <><Button variant="prominent" onClick={onReturn}>Call EVA terminate</Button><Button variant="plain" onClick={onAccept}>Concur with continuing (crew call)</Button></>
      ) : (
        <><Button variant="prominent" onClick={onAccept}>Concur with replan</Button><Button variant="plain" onClick={onReturn}>Call EVA terminate instead</Button></>
      )}
      <Footnote tone="secondary">{evOnline ? "EV1 is on the loop and copies your call." : "EV1 not connected: your call takes effect here."}</Footnote>
    </section>
  );
}
