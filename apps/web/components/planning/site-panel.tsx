import { Body, Footnote } from "@icewalk/ui/text";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";
import { rankedZones, ZONES } from "@/lib/evidence";
import type { Plan } from "@/lib/plan";
import { NextStep } from "./phases";
import { SiteCard, SiteNotes } from "./site-card";

/**
 * Phase 1: is it worth going? The verdict and the site card per tool, and the step to the plan,
 * all in view; the model notes and NASA's other zones open in place, with a way back.
 */
export function SitePanel({ plan, flying, onPlan, onSkip }: { plan: Plan; flying: boolean; onPlan: () => void; onSkip: () => void }) {
  const [view, setView] = useState<"card" | "notes" | "zones">("card");
  if (view !== "card") {
    return (
      <section aria-label={view === "notes" ? "Model notes" : "Other NASA exploration zones"} className="mission-stack mission-site">
        <button type="button" className="mission-text-link mission-site-back" onClick={() => setView("card")}><ChevronLeft aria-hidden />Back to the verdict</button>
        {view === "notes" ? <SiteNotes card={plan.site_assessment} /> : <Zones />}
      </section>
    );
  }
  return (
    <section aria-label="Site selection" className="mission-stack mission-site">
      <Body className="mission-site-lead">A 2021 impact at 35°N that exposed water ice (HiRISE). A study site, not one of NASA&apos;s 51 exploration zones (nearest about 250 km).</Body>
      <SiteCard card={plan.site_assessment} />
      <div className="mission-site-links">
        <button type="button" className="mission-text-link" onClick={() => setView("notes")}>Model notes</button>
        <button type="button" className="mission-text-link" onClick={() => setView("zones")}>Other NASA zones</button>
        <button type="button" className="mission-text-link mission-site-skip" onClick={onSkip}>Skip the flight</button>
      </div>
      <NextStep label={flying ? "Flying to S1094b..." : "Fly to S1094b and plan the EVA"} disabled={flying} onClick={onPlan} />
    </section>
  );
}

/** NASA's exploration zones ranked by the same site card (3 m radar), top five. */
function Zones() {
  const zones = rankedZones(5);
  return (
    <section className="mission-stack" aria-label="Zones ranked">
      <Footnote tone="secondary">NASA Exploration Zones (2015, Mars Trek) ranked by P(ice within 3 m) for a SkyFall-class radar, as shaded on the globe. The same site card, not a landing-site selection.</Footnote>
      <table className="mission-site-tools">
        <thead><tr><th scope="col">Zone</th><th scope="col">Lat</th><th scope="col">Radar</th><th scope="col">1 m drill</th></tr></thead>
        <tbody>
          {zones.map((z) => (
            <tr key={`${z.name}-${z.lat_deg}`} title={z.site_assessment.status === "extrapolated" ? "Extrapolated beyond the crater data" : "In data range"}>
              <th scope="row">{z.name}</th>
              <td>{formatNumber(z.lat_deg, 1)}°</td>
              <td>{formatPercent(z.site_assessment.tools.skyfall_radar.p_ice)}</td>
              <td>{formatPercent(z.site_assessment.tools.core_drill.p_ice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Footnote tone="secondary">Candidate SkyFall regions: {ZONES.skyfall.candidate_regions.join(", ")}.</Footnote>
    </section>
  );
}
