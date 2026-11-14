import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { measurementSummary, toolName, type Measurement, type Plan } from "@/lib/plan";
import { CampaignChart } from "./campaign-chart";
import { Disclosure } from "./disclosure";
import { Evidence } from "./evidence";
import { RowLabel, Value } from "./parts";
import { NextStep } from "./phases";

/** Phase 5: what the EVA measured, what that changed, why trust the model, and the next EVA. */
export function DebriefPanel({ plan, measurements, onNext, onReset }: { plan: Plan; measurements: Measurement[]; onNext: () => void; onReset: () => void }) {
  return (
    <section aria-label="Debrief" className="mission-stack">
      <section aria-label="Measurement log" className="mission-stack">
        <Title3 as="h3">Measurement log</Title3>
        {measurements.length ? (
          <ListSection footer="Measurements recorded in this session. The map shows what they changed.">
            {measurements.map((m, i) => <ListRow key={`${m.station_id}-${i}`} trailing={<Value>{m.crew_member ?? ""}</Value>}><RowLabel title={`${m.station_id} · ${measurementSummary(m)}`} detail={toolName(m.tool)} /></ListRow>)}
          </ListSection>
        ) : <><Body>Waiting for the first measurement</Body><Footnote tone="secondary">Log a result in Execute to update the map and the plan.</Footnote></>}
      </section>
      <section aria-label="Campaign" className="mission-stack">
        <Title3 as="h3">Beyond one EVA</Title3>
        <CampaignChart />
      </section>
      <Disclosure title="Why trust the numbers"><Evidence /></Disclosure>
      <Disclosure title="Limits">
        <Footnote tone="secondary">Neighbouring craters do not predict ice at site scale, so the map shows where we lack evidence instead of promising where the ice is. The prior uses latitude only. Radar performance, suit antenna heights and the habitat position are assumptions. {plan.plan_id}</Footnote>
      </Disclosure>
      <NextStep label="Plan the next EVA" onClick={onNext} note="The next plan starts from what this EVA measured." />
      <Button size="small" variant="plain" onClick={onReset}>Reset session</Button>
    </section>
  );
}
