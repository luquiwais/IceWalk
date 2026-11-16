import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote } from "@icewalk/ui/text";
import { formatNumber, formatPercent } from "@/lib/format";
import { CALIBRATION, GEOLOGY, GROUND_TRUTH, LIMITS, PRECURSOR_LABEL, rankedZones, ZONES } from "@/lib/evidence";
import { RowLabel, Value } from "./parts";

/**
 * Why trust the numbers, and where not to: calibration and ground truth as two compact tables
 * (they open in place in the debrief, so they fit without scrolling); the limits are their own view.
 */
export function Evidence() {
  const c = CALIBRATION;
  return (
    <section aria-label="Evidence" className="mission-stack mission-evidence">
      <p className="mission-evidence-lead"><strong>Calibrated on data the model never saw.</strong> {c.impacts} fresh impacts, each predicted without its own region: {formatNumber(c.expectedIce, 1)} ice exposures expected, {c.iceImpacts} observed. Brier {c.brier} vs {c.brierConstant} for a constant rate.</p>
      <table className="mission-site-tools">
        <thead><tr><th scope="col">We say</th><th scope="col">Impacts</th><th scope="col">Mean</th><th scope="col">Observed</th></tr></thead>
        <tbody>{c.bins.map((b) => <tr key={b.range}><th scope="row">{b.range}</th><td>{b.n}</td><td>{formatPercent(b.predicted, b.predicted < 0.1 ? 1 : 0)}</td><td>{formatPercent(b.observed)}</td></tr>)}</tbody>
      </table>
      <Footnote tone="secondary">{c.source}.</Footnote>
    </section>
  );
}

/** Places where a mission dug: ground truth the model never used. */
export function GroundTruth() {
  return (
    <section aria-label="Ground truth" className="mission-stack mission-evidence">
      <p className="mission-evidence-lead"><strong>Where a mission dug.</strong> Ground truth the model never used.</p>
      <ul className="mission-evidence-truth">
        {GROUND_TRUTH.map((g) => <li key={g.site}><span><b>{g.site}</b> · {g.found}</span><span>Model: {g.model} · <b>{g.verdict}</b></span><span>{g.source}</span></li>)}
      </ul>
    </section>
  );
}

/** What does not work, stated, and the site geology. */
export function Limits() {
  return (
    <section aria-label="Limits" className="mission-stack mission-evidence">
      <ul className="mission-evidence-truth">{LIMITS.map((l) => <li key={l}><span>{l}</span></li>)}</ul>
      <Footnote tone="secondary">Radar performance, suit antenna heights and the habitat position are assumptions. Site geology: {GEOLOGY.unit}, {GEOLOGY.name}. {GEOLOGY.description} {GEOLOGY.source}.</Footnote>
    </section>
  );
}

/** SkyFall and NASA's candidate zones: the same question beyond S1094b. */
export function BeyondSite() {
  const ref = ZONES.skyfall.reference_site;
  const radar = ref.site_assessment.tools.skyfall_radar;
  const drill = ref.site_assessment.tools.core_drill;
  return (
    <section aria-label="Beyond S1094b" className="mission-stack">
      <Body>
        NASA&apos;s SkyFall helicopters will fly ice radar (0.5–3 m) from 2030. At its reference site {ref.name.replace("SkyFall reference site ", "")}: {PRECURSOR_LABEL.skyfall_radar.split(" ·")[0]} {formatPercent(radar.p_ice)} ({radar.verdict}), 1 m drill {formatPercent(drill.p_ice)} ({drill.verdict}).
      </Body>
      <ListSection footer={`NASA Exploration Zones (2015 workshop, Mars Trek) ranked by the 3 m radar. Candidate SkyFall regions: ${ZONES.skyfall.candidate_regions.join(", ")}.`}>
        {rankedZones().map((z) => (
          <ListRow key={`${z.name}-${z.lat_deg}`} trailing={<Value>{formatPercent(z.site_assessment.tools.skyfall_radar.p_ice)}</Value>}>
            <RowLabel title={`${z.name} · ${formatNumber(z.lat_deg, 1)}°N`} detail={`1 m drill ${formatPercent(z.site_assessment.tools.core_drill.p_ice)} · ${z.site_assessment.status === "extrapolated" ? "extrapolated" : "in data range"}`} />
          </ListRow>
        ))}
      </ListSection>
      <Footnote tone="secondary">Not a landing-site selection: the same site card, run where NASA already proposed to go.</Footnote>
    </section>
  );
}
