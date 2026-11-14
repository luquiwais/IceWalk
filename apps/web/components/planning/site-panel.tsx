import { Body, Footnote } from "@icewalk/ui/text";
import type { Plan } from "@/lib/plan";
import { Disclosure } from "./disclosure";
import { BeyondSite } from "./evidence";
import { NextStep } from "./phases";
import { SiteCard } from "./site-card";

/** Phase 1: is it worth going? The regional site card per tool, before any plan. */
export function SitePanel({ plan, flying, onPlan, onSkip }: { plan: Plan; flying: boolean; onPlan: () => void; onSkip: () => void }) {
  return (
    <section aria-label="Site selection" className="mission-stack">
      <Body>S1094b: a 2021 impact at 35°N that threw out bright water ice (HiRISE). A study site, not one of NASA&apos;s 51 exploration zones (the nearest is about 250 km away). The regional model says how likely ice is within each tool&apos;s reach, before landing.</Body>
      <SiteCard card={plan.site_assessment} />
      <Disclosure title="Other NASA exploration zones"><BeyondSite /></Disclosure>
      <NextStep label={flying ? "Flying to S1094b..." : "Fly to S1094b and plan the EVA"} disabled={flying} onClick={onPlan} note="Regional prior only: the site plan adds the 349 craters around the site." />
      <button type="button" className="mission-text-link" onClick={onSkip}>Skip the flight</button>
      <Footnote tone="secondary">Zones on the globe: NASA Mars Trek exploration zones, shaded by P(ice within 3 m) for a SkyFall-class radar.</Footnote>
    </section>
  );
}
