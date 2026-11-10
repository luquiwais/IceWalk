import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Metric, MetricList } from "@icewalk/ui/metric";
import { Body, Caption1, Footnote, Title3 } from "@icewalk/ui/text";
import { Check } from "lucide-react";
import { type Plan, type Measurement } from "@/lib/plan";
import { designSession } from "@/mock/design-session";
import { Disclosure } from "./disclosure";
import { clock, RESULT_LABEL, RowLabel, Value } from "./parts";

export function ScienceView({
  plan,
  measurement,
  approved,
  onApprove,
  onReset,
}: {
  plan: Plan;
  measurement: Measurement | null;
  approved: boolean;
  onApprove: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mission-stack">
      <section aria-labelledby="science-log" className="mission-stack">
        <Title3 as="h3" id="science-log">
          Measurement log
        </Title3>
        {measurement ? (
          <ListSection
            footer={`PET ${clock(designSession.elapsedMin)} · ${measurement.crew_member} · simulated`}
          >
            <ListRow
              trailing={<Value>{RESULT_LABEL[measurement.result]}</Value>}
            >
              <RowLabel
                title={measurement.station_id}
                detail={`Core drill · ${measurement.depth_m} m`}
              />
            </ListRow>
          </ListSection>
        ) : (
          <>
            <Body>Waiting for the first measurement</Body>
            <Footnote tone="secondary">
              Record a result in EV to review the traverse.
            </Footnote>
          </>
        )}
      </section>
      <div className="mission-disclosures">
        <Disclosure title="What did we learn?">
          <div className="mission-stack">
            <MetricList>
              <Metric label="Points measured" value={measurement ? "1" : "0"} />
              <Metric
                label="Local influence"
                value={`~${designSession.localRadiusM}`}
                unit="m"
              />
            </MetricList>
            <Footnote tone="secondary">
              A measurement informs its neighborhood. The rest of the site
              retains the prior.
            </Footnote>
            {measurement ? (
              <Body>
                Local ambiguity: {designSession.localAmbiguityBefore} →{" "}
                {measurement.result === "inconclusive"
                  ? designSession.localAmbiguityBefore
                  : designSession.localAmbiguityAfter}{" "}
                bits. Simulated.
              </Body>
            ) : null}
          </div>
        </Disclosure>
        <Disclosure title="Recommended next">
          <ListSection footer="Illustrative recommendations. The crew decides.">
            <ListRow>
              <RowLabel
                title={
                  measurement?.result === "no_ice"
                    ? "Follow the revised traverse"
                    : "Continue the planned survey"
                }
                detail={
                  measurement?.result === "no_ice"
                    ? "The drill did not confirm ice within 1 m. Move to the next candidate."
                    : "Keep the highest-priority STM objectives within the EVA window."
                }
              />
            </ListRow>
            <ListRow>
              <RowLabel
                title="Return to habitat"
                detail="Use the hard stop and bingo time supplied by the plan. Safety takes precedence."
              />
            </ListRow>
          </ListSection>
        </Disclosure>
        <Disclosure title="Communication delay">
          <ListSection footer="Simulated link. IV leads local operations.">
            <ListRow
              trailing={<Value>{designSession.oneWayDelayMin} min</Value>}
            >
              One-way light time
            </ListRow>
          </ListSection>
        </Disclosure>
      </div>
      <section aria-label="Plan approval" className="mission-stack">
        <Caption1 tone="secondary">{plan.plan_id} · local demo</Caption1>
        <Footnote tone="secondary">
          {approved
            ? "Approval saved in this demo session."
            : "Review station changes and the planned walkback margin."}
        </Footnote>
        <Button disabled={approved} onClick={onApprove}>
          {approved ? (
            <>
              <Check />
              Plan approved
            </>
          ) : (
            "Approve plan"
          )}
        </Button>
        <Button variant="plain" onClick={onReset}>
          Reset demo
        </Button>
      </section>
    </div>
  );
}
