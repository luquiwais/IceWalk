import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { formatNumber, formatPercent } from "@/lib/format";
import { CALIBRATION, GEOLOGY, GROUND_TRUTH, LIMITS, PRECURSOR_LABEL, rankedZones, ZONES } from "@/lib/evidence";
import { RowLabel, Value } from "./parts";

/** Why trust the numbers, and where not to: calibration, ground truth and stated limits. */
export function Evidence() {
  const c = CALIBRATION;
  return (
    <section aria-label="Evidence" className="mission-stack">
      <Title3 as="h3">Calibrated on data the model never saw</Title3>
      <Body>
        {c.impacts} fresh impacts, each predicted without its own region: {formatNumber(c.expectedIce, 1)} ice exposures expected, {c.iceImpacts} observed. Brier {c.brier} vs {c.brierConstant} for a constant rate.
      </Body>
      <ListSection footer={c.source}>
        {c.bins.map((b) => (
          <ListRow key={b.range} trailing={<Value>{formatPercent(b.observed)} observed</Value>}>
            <RowLabel title={`When we say ${b.range}`} detail={`${b.n} impacts · mean prediction ${formatPercent(b.predicted, b.predicted < 0.1 ? 1 : 0)}`} />
          </ListRow>
        ))}
      </ListSection>
      <Title3 as="h3">Where a mission dug</Title3>
      <ListSection footer="Ground truth the model never used.">
        {GROUND_TRUTH.map((g) => (
          <ListRow key={g.site} trailing={<Value>{g.verdict}</Value>}>
            <RowLabel title={`${g.site} · ${g.found}`} detail={`Model: ${g.model} · ${g.source}`} />
          </ListRow>
        ))}
      </ListSection>
      <Title3 as="h3">What does not work</Title3>
      {LIMITS.map((l) => <Footnote key={l} tone="secondary">{l}</Footnote>)}
      <Footnote tone="secondary">Site geology: {GEOLOGY.unit}, {GEOLOGY.name}. {GEOLOGY.description} {GEOLOGY.source}.</Footnote>
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
