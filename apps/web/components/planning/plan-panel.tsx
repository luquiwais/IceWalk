import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Footnote } from "@icewalk/ui/text";
import { Check, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { flightRules, worstLevel, type FlightRule, type RuleDetail } from "@/lib/flight-rules";
import { formatDuration, formatNumber } from "@/lib/format";
import { missionObjective, toolName, totalEquipmentMass, type Plan } from "@/lib/plan";
import { useEvaWindow } from "@/lib/use-eva-window";
import type { PlanSource } from "@/lib/use-plan-session";
import { EvaWindowCard } from "./eva-window-card";
import { FeasibilityCard } from "./feasibility-card";
import { FlightRuleTiles } from "./flight-rules";
import { RowLabel, Value } from "./parts";

type Detail = RuleDetail;
const DETAIL_TITLE: Record<Detail, string> = { walk: "Can we walk it?", window: "EVA window & space weather", gear: "Gear" };

/** The panel's one-line answer: GO or NO-GO, the size of the EVA and which rules need attention. */
function answer(plan: Plan, rules: readonly FlightRule[]) {
  const worst = worstLevel(rules);
  const flagged = rules.filter((r) => r.level !== "go");
  const size = `${plan.stations.length} stations in ${formatDuration(plan.summary.duration_min)}`;
  const go = rules.length - flagged.length;
  if (worst === "warning") return { verdict: "NO-GO", text: `${size}. Over the limit: ${flagged.filter((r) => r.level === "warning").map((r) => r.name).join(", ")}.` };
  if (!flagged.length) return { verdict: "GO", text: `${size}. All ${rules.length} flight rules within limits.` };
  return { verdict: "GO", text: `${size}. ${go} of ${rules.length} flight rules clear; check ${flagged.map((r) => r.name).join(", ")}.` };
}

/**
 * Phase 2, the planner's view at two levels, as in NASA's AEGIS (EVA Composition, then Station
 * Composition): this panel is the EVA level. It answers "is it safe, and does it fit?" with the flight
 * rules, value against limit; each rule opens what supports it. Stations live on the map and in the dock;
 * selecting one opens its composition (station-detail.tsx). After approval it folds to a card.
 */
export function PlanPanel({ plan, source, planSource, pending, approved, onApprove, onEdit, onStrategy, onNext }: {
  plan: Plan; source: string; planSource: PlanSource; pending?: boolean;
  approved: boolean; onApprove: () => void; onEdit: () => void;
  onStrategy?: (strategy: "learn" | "confirm") => void; onNext: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const evaWindow = useEvaWindow(plan.plan_id, planSource);
  const rules = flightRules(plan, evaWindow);
  const go = rules.filter((r) => r.level === "go").length;
  const { verdict, text } = answer(plan, rules);
  const strategy = plan.summary.strategy ?? "learn";
  const equipment = plan.equipment ?? [];
  const mass = totalEquipmentMass(equipment);

  if (approved) {
    return (
      <section aria-label="Approved plan" className="mission-stack mission-plan-approved">
        <p className="mission-approved-line"><Check aria-hidden />Plan approved · {strategy === "confirm" ? "goal: confirm ice" : "goal: reduce uncertainty"}</p>
        <p className="mission-answer"><strong>{verdict}.</strong> {text}</p>
        <Footnote tone="secondary">Flight rules {go} of {rules.length} GO · select a station on the map or in the timeline for its details.</Footnote>
        <div className="mission-next"><Button variant="prominent" onClick={onNext}>Brief the EVA</Button><Button variant="plain" onClick={onEdit}>Edit plan</Button></div>
      </section>
    );
  }

  if (detail) {
    return (
      <section aria-label={DETAIL_TITLE[detail]} className="mission-stack mission-plan-detail">
        <button type="button" className="mission-back-link" onClick={() => setDetail(null)}><ChevronLeft aria-hidden />Flight rules</button>
        <h3 className="mission-detail-title">{DETAIL_TITLE[detail]}</h3>
        {detail === "walk" ? <FeasibilityCard plan={plan} /> : null}
        {detail === "window" ? <EvaWindowCard planId={plan.plan_id} source={planSource} /> : null}
        {detail === "gear" ? <>
          <ListSection footer={`${formatNumber(mass.known_kg, 1)} kg known${mass.unknown ? ` · ${mass.unknown} items without mass` : ""}`}>{equipment.map((item) => <ListRow key={item.tool} trailing={<Value>{item.count} × {item.mass_kg == null ? "Unknown mass" : `${item.mass_kg} kg`}</Value>}><RowLabel title={toolName(item.tool)} detail={item.justification} /></ListRow>)}</ListSection>
          <Footnote tone="secondary">Model & assumptions: {plan.summary.craters_in_model !== undefined ? `${plan.summary.craters_in_model} craters in the model. ` : ""}Probabilities are model estimates, not confirmed ice. Habitat position and instrument performance include assumptions; see the project sources. {plan.plan_id} · {source}</Footnote>
        </> : null}
      </section>
    );
  }

  return (
    <section aria-label="EVA plan" className="mission-plan-eva">
      <p className="mission-answer"><strong>{verdict}.</strong> {text}</p>
      {onStrategy ? (
        <section className="mission-goal" aria-label="EVA goal">
          <div title={`${missionObjective(plan) ?? "EVA goal"}. ${strategy === "confirm" ? "Stations go where ice is likeliest, to confirm a usable resource." : "Stations go where a measurement teaches the most, one per terrain type first."}`}><SegmentedControl label="EVA goal" value={strategy} options={[{ value: "learn", label: "Reduce uncertainty" }, { value: "confirm", label: "Confirm ice" }]} onValueChange={(v) => onStrategy(v as "learn" | "confirm")} /></div>
          {pending ? <Footnote tone="secondary" role="status">Replanning...</Footnote> : null}
        </section>
      ) : null}
      <FlightRuleTiles rules={rules} onOpen={setDetail} />
      <div className="mission-plan-footer">
        <Button variant="prominent" onClick={onApprove} disabled={pending}>Approve plan</Button>
      </div>
    </section>
  );
}
