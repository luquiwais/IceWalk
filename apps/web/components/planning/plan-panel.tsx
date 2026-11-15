import { Button } from "@icewalk/ui/button";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Footnote } from "@icewalk/ui/text";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { flightRules, worstLevel, type FlightRule } from "@/lib/flight-rules";
import { formatDuration } from "@/lib/format";
import { missionObjective, orderedStations, type Plan } from "@/lib/plan";
import { editVerdict } from "@/lib/plan-edit";
import { useEvaWindow } from "@/lib/use-eva-window";
import type { PlanSource } from "@/lib/use-plan-session";
import { FlightRuleTiles } from "./flight-rules";
import { RuleDetail } from "./rule-detail";


/** The panel's one-line answer: GO or NO-GO, the size of the EVA and which rules need attention. */
function answer(plan: Plan, rules: readonly FlightRule[]) {
  const worst = worstLevel(rules);
  const flagged = rules.filter((r) => r.level !== "go");
  const size = `${plan.stations.length} stations · ${formatDuration(plan.summary.duration_min)}`;
  const go = rules.length - flagged.length;
  if (worst === "warning") return { verdict: "NO-GO", text: `${size} · over the limit: ${flagged.filter((r) => r.level === "warning").map((r) => r.name).join(", ")}` };
  return { verdict: "GO", text: `${size} · ${go} of ${rules.length} rules clear` };
}

/**
 * Phase 2, the planner's view at two levels, as in NASA's AEGIS (EVA Composition, then Station
 * Composition): this panel is the EVA level. It answers "is it safe, and does it fit?" with the flight
 * rules, value against limit; each rule opens what supports it. Stations live on the map and in the dock;
 * selecting one opens its composition (station-detail.tsx). After approval it folds to a card.
 */
export function PlanPanel({ plan, planSource, pending, approved, onApprove, onEdit, onStrategy, onNext, onSelect, onTimeline, edit, tools }: {
  plan: Plan; planSource: PlanSource; pending?: boolean;
  approved: boolean; onApprove: () => void; onEdit: () => void;
  onStrategy?: (strategy: "learn" | "confirm") => void; onNext: () => void;
  /** Open a station's composition (and zoom the map to it). */
  onSelect: (id: string) => void;
  /** Open the dock's timeline: where duration and the walkback margin are drawn. */
  onTimeline: () => void;
  /** The plan was edited by hand: the one before it, to compare and undo. */
  edit?: { base: Plan; onUndo: () => void };
  /** Tools the crew carries, with a switch per tool (in the carry detail). */
  tools?: { carried: readonly string[] | null; onChange: (tools: string[]) => void; disabled?: boolean };
}) {
  const [detail, setDetail] = useState<string | null>(null);
  const evaWindow = useEvaWindow(plan.plan_id, planSource);
  const rules = flightRules(plan, evaWindow);
  const go = rules.filter((r) => r.level === "go").length;
  const { verdict, text } = answer(plan, rules);
  const strategy = plan.summary.strategy ?? "learn";

  if (approved) {
    return (
      <section aria-label="Approved plan" className="mission-stack mission-plan-approved">
        <p className="mission-approved-line"><Check aria-hidden />Plan approved · {strategy === "confirm" ? "goal: confirm ice" : "goal: reduce uncertainty"}</p>
        <p className="mission-answer"><strong>{verdict}</strong> · {text}</p>
        <Footnote tone="secondary">Flight rules {go} of {rules.length} GO · select a station on the map or in the timeline for its details.</Footnote>
        <div className="mission-next"><Button variant="prominent" onClick={onNext}>Brief the EVA</Button><Button variant="plain" onClick={onEdit}>Edit plan</Button></div>
      </section>
    );
  }

  const open = detail ? rules.find((r) => r.id === detail) : undefined;
  if (open) {
    return (
      <section aria-label={open.name} className="mission-stack mission-plan-detail">
        <button type="button" className="mission-back-link" onClick={() => setDetail(null)}><ChevronLeft aria-hidden />Flight rules</button>
        <RuleDetail rule={open} plan={plan} window={evaWindow} onTimeline={onTimeline} tools={tools} />
      </section>
    );
  }

  if (pending) {
    return (
      <section aria-label="EVA plan" aria-busy="true" className="mission-plan-eva mission-plan-loading">
        <p className="mission-answer" role="status">Building a new plan…</p>
        <div className="mission-skeleton mission-skeleton-goal" />
        <ul className="mission-rules" aria-hidden>{rules.map((r) => <li key={r.id}><div className="mission-rule mission-skeleton-rule"><span className="mission-rule-name">{r.name}</span><span className="mission-skeleton mission-skeleton-line" /></div></li>)}</ul>
        <div className="mission-skeleton mission-skeleton-strip" />
        <div className="mission-plan-footer"><Button variant="prominent" disabled>Approve plan</Button></div>
      </section>
    );
  }

  return (
    <section aria-label="EVA plan" className="mission-plan-eva">
      <p className="mission-answer"><strong>{verdict}</strong> · {text}</p>
      {edit ? <EditStrip plan={plan} base={edit.base} onUndo={edit.onUndo} /> : onStrategy ? (
        <section className="mission-goal" aria-label="EVA goal">
          <div title={`${missionObjective(plan) ?? "EVA goal"}. ${strategy === "confirm" ? "Stations go where ice is likeliest, to confirm a usable resource." : "Stations go where a measurement teaches the most, one per terrain type first."}`}><SegmentedControl label="EVA goal" value={strategy} options={[{ value: "learn", label: "Reduce uncertainty" }, { value: "confirm", label: "Confirm ice" }]} onValueChange={(v) => onStrategy(v as "learn" | "confirm")} /></div>
          {pending ? <Footnote tone="secondary" role="status">Replanning...</Footnote> : null}
        </section>
      ) : null}
      <FlightRuleTiles rules={rules} onOpen={(r) => setDetail(r.id)} />
      <nav className="mission-station-strip" aria-label="Review stations">
        <span>Review stations</span>
        <span className="mission-station-chips">{orderedStations(plan).map((st) => <button type="button" key={st.id} aria-label={`Review station ${st.order}, ${st.id}`} title={`${st.id} · P(ice) ${Math.round(st.p_ice * 100)}%`} onClick={() => onSelect(st.id)}>{st.order}</button>)}</span>
        <ChevronRight aria-hidden />
      </nav>
      <div className="mission-plan-footer">
        <Button variant="prominent" onClick={onApprove} disabled={pending}>Approve plan</Button>
      </div>
    </section>
  );
}

/** The plan as the operator left it against the planner's: verdict, the numbers that moved, and undo. */
function EditStrip({ plan, base, onUndo }: { plan: Plan; base: Plan; onUndo: () => void }) {
  const v = editVerdict(plan);
  const hm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")}`;
  const a = base.summary, b = plan.summary;
  const margin = (m?: number | null) => (m == null ? "—" : `${Math.round(m)}`);
  return (
    <section className="mission-edit" aria-label="Edited plan" data-level={v.level}>
      <span className="mission-edit-verdict">{v.level === "warning" ? "Not viable" : v.level === "caution" ? "Viable, tight" : "Viable"}<small> · edited by hand</small></span>
      <span className="mission-edit-numbers">EVA {hm(a.duration_min)} → {hm(b.duration_min)} · margin {margin(a.min_walkback_margin_min)} → {margin(b.min_walkback_margin_min)} min</span>
      <button type="button" className="mission-text-link mission-edit-undo" onClick={onUndo}>Undo</button>
    </section>
  );
}
