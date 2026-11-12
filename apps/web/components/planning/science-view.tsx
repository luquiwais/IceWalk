import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { Check } from "lucide-react";
import { decisionPointFor, measurementSummary, nextStation, toolName, type Plan, type Measurement } from "@/lib/plan";
import { RESULT_LABEL, RowLabel, Value } from "./parts";

export function ScienceView({ plan, measurements, approved, onApprove, onReset }: {
  plan: Plan; measurements: Measurement[]; approved: boolean; onApprove: () => void; onReset: () => void;
}) {
  const last = measurements.at(-1);
  const next = nextStation(plan, measurements);
  const decision = last ? decisionPointFor(plan, last.station_id) : undefined;
  return <div className="mission-stack">
    <section aria-label="Measurement log" className="mission-stack"><Title3 as="h3">Measurement log</Title3>
      {measurements.length ? <ListSection footer="Measurements recorded in this session.">{measurements.map((m, i) => <ListRow key={`${m.station_id}-${i}`} trailing={<Value>{m.crew_member ?? ""}</Value>}><RowLabel title={`${m.station_id} · ${measurementSummary(m)}`} detail={`${toolName(m.tool)} · ${new Date(m.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`} /></ListRow>)}</ListSection> : <><Body>Waiting for the first measurement</Body><Footnote tone="secondary">Record a result in EV to update the plan.</Footnote></>}
    </section>
    <section aria-label="Recommended next" className="mission-stack"><Title3 as="h3">Recommended next</Title3><Body>{next ? `Station ${next.order} · ${next.id}` : "Return to habitat"}</Body><Footnote tone="secondary">{next ? next.hypothesis : "All stations in the current plan have been measured."}</Footnote>
      {decision ? <ListSection footer="Options and rationale from the planner. The crew decides.">{decision.options.map((o) => <ListRow key={o.rank}><RowLabel title={`${o.rank}. ${RESULT_LABEL[o.if_result]} → ${o.next_station_ids.join(", ")}${o.rank === decision.default_option ? " (default)" : ""}`} detail={o.rationale} /></ListRow>)}</ListSection> : null}
    </section>
    <section aria-label="Plan approval" className="mission-stack"><Footnote tone="secondary">{plan.plan_id} · local review</Footnote><Footnote tone="secondary">{approved ? "Approval saved in this session." : "Review station changes, bingo time and the planned walkback margin."}</Footnote><Button disabled={approved} onClick={onApprove}>{approved ? <><Check />Plan approved</> : "Approve plan"}</Button><Button variant="plain" onClick={onReset}>Reset session</Button></section>
  </div>;
}
