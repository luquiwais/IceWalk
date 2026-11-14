import { Body, Footnote } from "@icewalk/ui/text";
import { formatNumber } from "@/lib/format";
import { LIMITS, RADAR_FIRST } from "@/lib/evidence";
import type { Plan } from "@/lib/plan";
import { SiteCard } from "./site-card";

/** Site view panel (design/IceWalk.dc.html, SITE): the site, what to carry, the key finding and the model's limits. */
export function SiteBrief({ plan }: { plan: Plan }) {
  const r = RADAR_FIRST;
  return <section aria-label="Site brief" className="mission-stack">
    <div className="mission-site-title"><Footnote className="mission-kicker">Site brief</Footnote><span className="mission-site-name">S1094b</span>
      <Body tone="secondary">Fresh impact crater in Amazonis Planitia: the exposure of subsurface ice nearest the equator observed on Mars, within walking range of a surface habitat.</Body></div>
    <div className="mission-stack"><Footnote className="mission-kicker">What to carry · P(ice within reach) · 90 % interval</Footnote><SiteCard card={plan.site_assessment} /></div>
    <div className="mission-finding"><Footnote className="mission-kicker">Key finding · radar first, drill second</Footnote>
      <div><span><strong>{formatNumber(r.lift, 1)}×</strong>more often each drill station finds ice</span><span><strong>{formatNumber(r.evasBlind / r.evasGuided, 1)}×</strong>fewer EVAs to confirm ice</span></div>
      <Footnote tone="secondary">{r.source}</Footnote></div>
    <div className="mission-limits"><Footnote className="mission-kicker">Model limits</Footnote>{LIMITS.map((l) => <Body key={l}>{l}</Body>)}</div>
  </section>;
}
