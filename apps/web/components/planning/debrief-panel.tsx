import { Button } from "@icewalk/ui/button";
import { Footnote } from "@icewalk/ui/text";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatPercent } from "@/lib/format";
import { measurementSummary, toolName, toolReachM, type Measurement, type Plan, type Station } from "@/lib/plan";
import { CampaignChart } from "./campaign-chart";
import { Evidence, GroundTruth, Limits } from "./evidence";
import { NextStep } from "./phases";

type View = "summary" | "campaign" | "trust" | "truth" | "limits";
const VIEW_LABEL: Record<Exclude<View, "summary">, string> = { campaign: "Beyond one EVA", trust: "Why trust the numbers", truth: "Where a mission dug", limits: "Limits" };

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
export function DebriefPanel({ plan, previousPlan, measurements, onNext, onReset }: { plan: Plan; previousPlan?: Plan; measurements: Measurement[]; onNext: () => void; onReset: () => void }) {
  const [view, setView] = useState<View>("summary");
  if (view !== "summary") {
    return (
      <section aria-label={VIEW_LABEL[view]} className="mission-stack mission-site mission-debrief">
        <button type="button" className="mission-text-link mission-site-back" onClick={() => setView("summary")}><ChevronLeft aria-hidden />Back to the debrief</button>
        {view === "campaign" ? <CampaignChart /> : view === "trust" ? <Evidence /> : view === "truth" ? <GroundTruth /> : <Limits />}
      </section>
    );
  }

  const planned = (id: string): Station | undefined => plan.stations.find((s) => s.id === id) ?? previousPlan?.stations.find((s) => s.id === id);
  const count = (r: Measurement["result"]) => measurements.filter((m) => m.result === r).length;
  const visited = new Set(measurements.map((m) => m.station_id)).size;
  const replan = plan.replan;
  const answer = measurements.length
    ? `${visited} station${visited === 1 ? "" : "s"} measured · ${count("ice")} ice · ${count("no_ice")} not within reach${count("inconclusive") ? ` · ${count("inconclusive")} inconclusive` : ""}`
    : "No measurements yet";

  return (
    <section aria-label="Debrief" className="mission-stack mission-site mission-debrief">
      <p className="mission-answer"><strong>{measurements.length ? "Debrief" : "Waiting"}</strong> · {answer}</p>
      {measurements.length ? (
        <ol className="mission-debrief-log" aria-label="Measurement log">
          {measurements.slice(-4).map((m, i) => {
            const s = planned(m.station_id);
            return (
              <li key={`${m.station_id}-${i}`} data-result={m.result}>
                <div className="mission-debrief-row"><strong>{m.station_id}</strong><span>{measurementSummary(m)}</span><small>{toolName(m.tool)}{m.crew_member ? ` · ${m.crew_member}` : ""}</small></div>
                <div className="mission-debrief-note">{s ? <>Expected P(ice) {formatPercent(s.p_ice)}, {s.uncertainty.toFixed(2)} bits unknown; now measured. </> : null}{meaning(m)}</div>
              </li>
            );
          })}
        </ol>
      ) : <Footnote tone="secondary">The EV logs results from the helmet; each one updates the ice map and the plan.</Footnote>}
      {measurements.length > 4 ? <Footnote tone="secondary">Showing the last 4 of {measurements.length} measurements.</Footnote> : null}
      {replan ? (
        <div className="mission-iv-station">
          <span className="mission-iv-key">What the last result changed</span>
          <span>
            {replan.changed_fraction != null ? <><b>{formatPercent(replan.changed_fraction)}</b> of the plan changed. </> : null}
            {replan.stations_added.length ? <>Added {replan.stations_added.join(", ")}. </> : null}
            {replan.stations_dropped.length ? <>Dropped {replan.stations_dropped.join(", ")}. </> : null}
            {replan.recommendation === "return_to_habitat" ? "Recommendation: EVA TERMINATE." : "Recommendation: continue."}
          </span>
        </div>
      ) : null}
      <nav className="mission-debrief-links" aria-label="More">
        {(Object.keys(VIEW_LABEL) as Exclude<View, "summary">[]).map((v) => (
          <button key={v} type="button" className="mission-debrief-link" onClick={() => setView(v)}>{VIEW_LABEL[v]}<ChevronRight aria-hidden /></button>
        ))}
      </nav>
      <NextStep label="Plan the next EVA" onClick={onNext} note="The next plan starts from what this EVA measured." />
      <Button size="small" variant="plain" onClick={onReset}>Reset session</Button>
    </section>
  );
}
