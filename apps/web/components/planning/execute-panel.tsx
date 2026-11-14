import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { HABITAT_XY } from "@/components/site/site-data";
import { formatNumber } from "@/lib/format";
import { bearing, decisionPointFor, diffPlans, measurementSummary, measuringTool, nextStation, toolName, type Measurement, type Plan, type ReplanAssessment, type Station } from "@/lib/plan";
import { MeasurementForm } from "./ev-view";
import { RESULT_LABEL, RowLabel, Value } from "./parts";
import { NextStep } from "./phases";

type Log = (station: Station, result: Measurement["result"], depth: number, crew: "EV1" | "EV2") => void;

/**
 * Phase 4: the current station and its procedure. After a result, the replan waits for review
 * (what changed and the planner's continue / return call) before the crew goes on.
 */
export function ExecutePanel({ plan, previous, measurements, pending, reviewing, returning, onLog, onAccept, onReturn, onRevert, onDebrief }: {
  plan: Plan; previous: Plan | null; measurements: Measurement[]; pending: boolean; reviewing: boolean; returning: boolean;
  onLog: Log; onAccept: () => void; onReturn: () => void; onRevert: () => void; onDebrief: () => void;
}) {
  const last = measurements.at(-1);
  if (reviewing && previous && last) return <ReplanReview before={previous} after={plan} measurement={last} onAccept={onAccept} onReturn={onReturn} onRevert={onRevert} />;
  const station = returning ? undefined : nextStation(plan, measurements);
  const origin = last?.position ?? HABITAT_XY;
  const direction = station ? bearing(origin, station.position) : undefined;
  const decision = station ? decisionPointFor(plan, station.id) : undefined;
  return (
    <section aria-label="EVA execution" className="mission-stack">
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
      {last ? <Footnote tone="secondary">Last result: {last.station_id} · {measurementSummary(last)}</Footnote> : null}
      {station ? <MeasurementForm key={station.id} station={station} pending={pending} onLog={onLog} /> : null}
      {!station ? <NextStep label="Debrief the EVA" onClick={onDebrief} /> : null}
    </section>
  );
}

const TITLE: Record<ReplanAssessment["recommendation"], string> = { continue: "Continue the EVA", return_to_habitat: "EVA TERMINATE: begin the walkback" };

/** What a measurement changed, and the planner's call. Shown over the map with the old route dashed. */
export function ReplanReview({ before, after, measurement, onAccept, onReturn, onRevert }: {
  before: Plan; after: Plan; measurement: Measurement; onAccept: () => void; onReturn: () => void; onRevert: () => void;
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
        <><Button variant="prominent" onClick={onReturn}>Terminate EVA · walk back</Button><Button variant="plain" onClick={onAccept}>Continue anyway (crew decision)</Button></>
      ) : (
        <><Button variant="prominent" onClick={onAccept}>Accept replan</Button><Button variant="plain" onClick={onReturn}>Terminate EVA instead</Button></>
      )}
      <Button size="small" variant="plain" onClick={onRevert}>Back to nominal plan</Button>
    </section>
  );
}
