import { Button } from "@icewalk/ui/button";
import { Footnote } from "@icewalk/ui/text";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatPercent } from "@/lib/format";
import { measurementSummary, toolName, toolReachM, type Measurement, type Plan, type Station } from "@/lib/plan";
import type { DecisionEntry } from "@/lib/use-eva-link";
import { CampaignChart } from "./campaign-chart";
import { Evidence, GroundTruth, Limits } from "./evidence";

type View = "summary" | "decisions" | "campaign" | "trust" | "truth" | "limits";
const VIEW_LABEL: Record<Exclude<View, "summary">, string> = { decisions: "Decision log", campaign: "Beyond one EVA", trust: "Why trust the numbers", truth: "Where a mission dug", limits: "Limits" };

/** What a result means for the next EVA, in the model's own terms (a "no" is ice deeper than the reach). */
function meaning(m: Measurement): string {
  const reach = m.depth_m ?? toolReachM(m.tool);
  if (m.result === "ice") return "Ice confirmed: a target for sampling.";
  if (m.result === "no_ice") return `Ice, if any, is deeper than ${reach != null ? `${reach.toFixed(1)} m` : "the reach"}: a radar or deeper-core candidate for EVA 2.`;
  return "Inconclusive: repeat or use another tool.";
}

/**
 * Phase 5: what the EVA measured and what that changed, all in view; the campaign, the evidence and
 * the limits open in place with a way back (the same pattern as Site), so nothing scrolls.
 */
export function DebriefPanel({ plan, previousPlan, measurements, decisions = [], terminated = false, onNext, onReset }: { plan: Plan; previousPlan?: Plan; measurements: Measurement[]; decisions?: DecisionEntry[]; terminated?: boolean; onNext: () => void; onReset: () => void }) {
  const [view, setView] = useState<View>("summary");
  if (view !== "summary") {
    return (
      <section aria-label={VIEW_LABEL[view]} className="mission-stack mission-site mission-debrief">
        <button type="button" className="mission-text-link mission-site-back" onClick={() => setView("summary")}><ChevronLeft aria-hidden />Back to the debrief</button>
        {view === "decisions" ? <DecisionLog plan={plan} previousPlan={previousPlan} measurements={measurements} decisions={decisions} terminated={terminated} /> : view === "campaign" ? <CampaignChart /> : view === "trust" ? <Evidence /> : view === "truth" ? <GroundTruth /> : <Limits />}
      </section>
    );
  }

  const planned = (id: string): Station | undefined => plan.stations.find((s) => s.id === id) ?? previousPlan?.stations.find((s) => s.id === id);
  const count = (r: Measurement["result"]) => measurements.filter((m) => m.result === r).length;
  const visited = new Set(measurements.map((m) => m.station_id)).size;
  const answer = measurements.length
    ? `${visited} station${visited === 1 ? "" : "s"} measured · ${count("ice")} ice · ${count("no_ice")} not within reach${count("inconclusive") ? ` · ${count("inconclusive")} inconclusive` : ""}`
    : "No measurements yet";

  return (
    <section aria-label="Debrief" className="mission-stack mission-site mission-debrief">
      <p className="mission-answer"><strong>{measurements.length ? "Debrief" : "Waiting"}</strong> · {answer}</p>
      {measurements.length ? (
        <ol className="mission-debrief-log" aria-label="Measurement log">
          {measurements.slice(-2).map((m, i) => {
            const s = planned(m.station_id);
            return (
              <li key={`${m.station_id}-${i}`} data-result={m.result} title={`${s ? `Expected P(ice) ${formatPercent(s.p_ice)}, ${s.uncertainty.toFixed(2)} bits unknown; now measured. ` : ""}${meaning(m)}`}>
                <div className="mission-debrief-row"><strong>{m.station_id}</strong><span>{measurementSummary(m)}</span><small>{toolName(m.tool)}{m.crew_member ? ` · ${m.crew_member}` : ""}</small></div>
                <div className="mission-debrief-note">{meaning(m)}</div>
              </li>
            );
          })}
        </ol>
      ) : <Footnote tone="secondary">The EV logs results from the helmet; each one updates the ice map and the plan.</Footnote>}
      {measurements.length > 2 ? <Footnote tone="secondary">Last 2 of {measurements.length} results; the decision log has every call.</Footnote> : null}
      <nav className="mission-debrief-links" aria-label="More">
        {(Object.keys(VIEW_LABEL) as Exclude<View, "summary">[]).map((v) => (
          <button key={v} type="button" className="mission-debrief-link" onClick={() => setView(v)}>{VIEW_LABEL[v]}<ChevronRight aria-hidden /></button>
        ))}
      </nav>
      <div className="mission-next mission-debrief-next">
        <div className="mission-debrief-next-note"><Footnote tone="secondary">The next plan starts from what this EVA measured.</Footnote><button type="button" className="mission-text-link" onClick={onReset}>Reset session</button></div>
        <Button variant="prominent" onClick={onNext}>Plan the next EVA</Button>
      </div>
    </section>
  );
}

const RESULT_WORD: Record<DecisionEntry["result"], string> = { ice: "ice", no_ice: "not within reach", inconclusive: "inconclusive" };
const fmtPet = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;

/**
 * As run against as planned, and every call the crew made on a replan: what the planner recommended
 * and what the IV (or the EV alone) decided. A call against the planner is said in words.
 */
function DecisionLog({ plan, previousPlan, measurements, decisions, terminated }: { plan: Plan; previousPlan?: Plan; measurements: Measurement[]; decisions: DecisionEntry[]; terminated: boolean }) {
  const measured = new Set(measurements.map((m) => m.station_id)).size;
  const replan = plan.replan;
  // The first plan of the EVA is the one the crew approved; replans keep its count as the yardstick.
  const planned = Math.max(previousPlan?.stations.length ?? 0, plan.stations.length + measured);
  return (
    <section className="mission-stack" aria-label="Decisions">
      <p className="mission-answer"><strong>As run</strong> · {measured} of {planned} planned stations measured · {terminated ? "EVA terminated early" : measured >= planned ? "plan completed" : "EVA in progress"}</p>
      {replan && !decisions.length ? (
        <p className="mission-debrief-note">Last replan: {replan.changed_fraction != null ? `${formatPercent(replan.changed_fraction)} of the plan changed` : "change not measured"}{replan.stations_added.length ? ` · added ${replan.stations_added.join(", ")}` : ""}{replan.stations_dropped.length ? ` · dropped ${replan.stations_dropped.join(", ")}` : ""} · planner: {replan.recommendation === "return_to_habitat" ? "EVA TERMINATE" : "continue"}.</p>
      ) : null}
      {decisions.length ? (
        <ol className="mission-debrief-log mission-decision-log" aria-label="Decision log">
          {decisions.slice(-4).map((d, i) => {
            const planner = d.recommended === "return_to_habitat" ? "EVA TERMINATE" : d.recommended === "continue" ? "continue" : "no recommendation";
            const call = d.call === "terminate" ? "EVA TERMINATE" : "continue";
            const against = d.recommended && ((d.recommended === "return_to_habitat") !== (d.call === "terminate"));
            return (
              <li key={`${d.stationId}-${i}`} data-result={d.result}>
                <div className="mission-debrief-row"><strong>{d.stationId}</strong><span>{RESULT_WORD[d.result]}</span><small>PET {fmtPet(d.petMin)}</small></div>
                <div className="mission-debrief-note">Planner: {planner} · {d.by}: <b>{call}</b>{against ? " (against the planner)" : ""}{d.changedFraction != null ? ` · ${formatPercent(d.changedFraction)} of the plan changed` : ""}{d.marginBefore != null && d.marginAfter != null ? ` · margin ${Math.round(d.marginBefore)} → ${Math.round(d.marginAfter)} min` : ""}</div>
              </li>
            );
          })}
        </ol>
      ) : <Footnote tone="secondary">No replans to decide yet: each result the EV logs can change the plan, and the IV makes the call.</Footnote>}
      {decisions.length > 4 ? <Footnote tone="secondary">Showing the last 4 of {decisions.length} decisions.</Footnote> : null}
      {decisions.length < 3 ? <Footnote tone="secondary">The IV directs the EVA in situ (NASA xEVA Con Ops, sec. 4.3.2 and 8.1); the planner recommends.</Footnote> : null}
    </section>
  );
}
