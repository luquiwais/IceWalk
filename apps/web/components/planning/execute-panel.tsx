import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import type { ReactNode } from "react";
import { HABITAT_XY } from "@/components/site/site-data";
import { formatNumber } from "@/lib/format";
import { bearing, decisionPointFor, diffPlans, measurementSummary, measuringTool, nextStation, toolName, type Measurement, type Plan, type ReplanAssessment } from "@/lib/plan";
import { RESULT_LABEL, RowLabel, Value } from "./parts";
import { NextStep } from "./phases";

/**
 * Phase 4, IV console: the IV follows the EVA from the habitat. Results come only from the EV
 * at the station (the IV is not there to measure); the IV sees them arrive, reviews the replan
 * and concurs or calls the EVA terminate.
 */
export function ExecutePanel({ plan, previous, measurements, pending, reviewing, returning, onAccept, onReturn, onDebrief, tracker }: {
  plan: Plan; previous: Plan | null; measurements: Measurement[]; pending: boolean; reviewing: boolean; returning: boolean;
  onAccept: () => void; onReturn: () => void; onDebrief: () => void;
  /** The EV's track map and progress, the same the EV sees in the helmet. */
  tracker?: ReactNode;
}) {
  const last = measurements.at(-1);
  if (reviewing && previous && last) return <>{tracker}<ReplanReview before={previous} after={plan} measurement={last} onAccept={onAccept} onReturn={onReturn} /></>;
  const station = returning ? undefined : nextStation(plan, measurements);
  const origin = last?.position ?? HABITAT_XY;
  const direction = station ? bearing(origin, station.position) : undefined;
  const decision = station ? decisionPointFor(plan, station.id) : undefined;
  return (
    <section aria-label="EVA execution" className="mission-stack">
      {tracker}
      {returning ? <StatusBadge level="caution">EVA TERMINATE · walkback to the habitat · margin {formatNumber(plan.summary.min_walkback_margin_min ?? 0, 0)} min</StatusBadge> : null}
      {station && direction ? (
        <ListSection header={last ? "Next station" : "Current station"} headerId="ev-station">
          <ListRow trailing={<Value>{String(station.order).padStart(2, "0")}</Value>}><RowLabel title={station.id} detail={station.tools.map(toolName).join(" · ")} /></ListRow>
          <ListRow trailing={<Value>{Math.round(direction.distanceM)} m</Value>}><RowLabel title={direction.distanceM ? direction.label : "At the habitat"} detail="Straight-line distance from the last position" /></ListRow>
          <ListRow trailing={<Value>{Math.round(station.p_ice * 100)}%</Value>}><RowLabel title="P(ice within reach)" detail={`${toolName(measuringTool(station))} · model estimate`} /></ListRow>
        </ListSection>
      ) : <Body>{returning ? "Follow the traverse back to the habitat." : "All planned stations measured. Return to the habitat."}</Body>}
      {decision && station ? (
        <ListSection header="After this station" footer="Options from the planner. The crew decides.">
          {decision.options.map((o) => <ListRow key={o.rank}><RowLabel title={`${RESULT_LABEL[o.if_result]} → ${o.next_station_ids[0] ?? "habitat"}${o.rank === decision.default_option ? " (nominal)" : ""}`} detail={o.rationale} /></ListRow>)}
        </ListSection>
      ) : null}
      {station ? <Footnote role="status">{pending ? "Planner replanning..." : `Waiting for EV1 to report at ${station.id}.`}</Footnote> : null}
      {measurements.length ? (
        <ListSection header="Reported by the crew" footer="Results are logged by the EV at the station.">
          {[...measurements].reverse().map((m, i) => <ListRow key={`${m.station_id}-${i}`} trailing={<Value>{m.crew_member ?? "EV"}</Value>}><RowLabel title={`${m.station_id} · ${measurementSummary(m)}`} detail={toolName(m.tool)} /></ListRow>)}
        </ListSection>
      ) : null}
      {!station ? <NextStep label="Debrief the EVA" onClick={onDebrief} /> : null}
    </section>
  );
}

const TITLE: Record<ReplanAssessment["recommendation"], string> = { continue: "Continue the EVA", return_to_habitat: "EVA TERMINATE: begin the walkback" };

/** What a measurement changed, and the planner's call, for the IV. Shown over the map with the old route dashed. */
export function ReplanReview({ before, after, measurement, onAccept, onReturn }: {
  before: Plan; after: Plan; measurement: Measurement; onAccept: () => void; onReturn: () => void;
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
      <Title3 as="h3">{TITLE[r.recommendation]}</Title3>
      {back ? <StatusBadge level="caution">Planner recommends terminating the EVA</StatusBadge> : null}
      {r.iv_decision ? <StatusBadge level="advisory">Large replan: IV decision</StatusBadge> : null}
      <ul className="mission-reasons">{r.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      <ListSection header="What changed" footer="Dashed on the map: the plan before this result.">
        <ListRow trailing={<Value>{r.stations_kept.length}</Value>}><RowLabel title="Stations kept" detail={r.stations_kept.join(", ") || "None"} /></ListRow>
        <ListRow trailing={<Value>{r.stations_added.length}</Value>}><RowLabel title="Stations added" detail={r.stations_added.join(", ") || "None"} /></ListRow>
        <ListRow trailing={<Value>{r.stations_dropped.length}</Value>}><RowLabel title="Stations dropped" detail={r.stations_dropped.join(", ") || "None"} /></ListRow>
        {r.margin_before_min != null && r.margin_after_min != null ? <ListRow trailing={<Value>{formatNumber(r.margin_before_min, 1)} → {formatNumber(r.margin_after_min, 1)} min</Value>}>Min walkback margin</ListRow> : null}
      </ListSection>
      {back ? (
        <><Button variant="prominent" onClick={onReturn}>Call EVA terminate</Button><Button variant="plain" onClick={onAccept}>Concur with continuing (crew call)</Button></>
      ) : (
        <><Button variant="prominent" onClick={onAccept}>Concur with replan</Button><Button variant="plain" onClick={onReturn}>Call EVA terminate instead</Button></>
      )}
      <Footnote tone="secondary">The EV sees the same update in the helmet and copies it.</Footnote>
    </section>
  );
}
