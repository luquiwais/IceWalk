import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote } from "@icewalk/ui/text";
import { formatNumber, formatPercent } from "@/lib/format";
import { PRECURSOR_LABEL, RADAR_FIRST } from "@/lib/evidence";
import { toolName, type SiteAssessment } from "@/lib/plan";
import { RowLabel, Value } from "./parts";

/** Verdict words; "No-go" reads as "Out of reach" (the tool cannot reach the ice), never in red: it is not a warning. */
const VERDICT_LABEL = { GO: "GO", CONDITIONAL: "Conditional", NO_GO: "Out of reach", INSUFFICIENT_DATA: "No data" } as const;

/** Short tool names for the table, so none is cut. */
const SHORT: Record<string, string> = {
  neutron_spectrometer: "Neutron spectrometer",
  core_drill: "Core drill",
  gpr: "Ground radar (GPR)",
  skyfall_radar: "SkyFall radar (aerial)",
};

function name(id: string) {
  return SHORT[id] ?? PRECURSOR_LABEL[id] ?? toolName(id);
}

/**
 * "Is it worth going, and with which tool?" from plan.site_assessment: the verdict first, then one
 * compact row per tool (reach, P(ice within reach), verdict). The model notes live in their own view.
 */
export function SiteCard({ card }: { card: SiteAssessment | undefined }) {
  if (!card) return <Footnote tone="secondary">Site card unavailable for this plan.</Footnote>;
  const rows = Object.entries(card.tools).sort(([, a], [, b]) => a.depth_m - b.depth_m);
  const best = [...rows].filter(([, t]) => !t.precursor).sort(([, a], [, b]) => b.p_ice - a.p_ice)[0];
  return (
    <section aria-label="Site card" className="mission-stack mission-site-card">
      <section className="mission-why" aria-label="Verdict">
        <span>
          {card.verdict && best ? <><strong>{VERDICT_LABEL[card.verdict]}</strong> with {name(best[0]).replace(/ \(.*\)/, "").toLowerCase()}: {formatPercent(best[1].p_ice)} within {formatNumber(best[1].depth_m, 0)} m · </> : null}
          median depth {card.median_depth_m ? `${formatNumber(card.median_depth_m, 1)} m` : "unknown"}
          {card.median_depth_90_m ? ` (90 %: ${formatNumber(card.median_depth_90_m[0], 1)}–${formatNumber(card.median_depth_90_m[1], 1)})` : ""}.
        </span>
      </section>
      <table className="mission-site-tools">
        <caption className="sr-only">P(ice within each tool&apos;s reach), regional prior before landing</caption>
        <thead><tr><th scope="col">Tool</th><th scope="col">Reach</th><th scope="col">P(ice)</th><th scope="col">Verdict</th></tr></thead>
        <tbody>
          {rows.map(([id, t]) => (
            <tr key={id} title={`90 %: ${formatPercent(t.p_ice_90[0])}–${formatPercent(t.p_ice_90[1])}${t.precursor ? " · flies before the EVA (2030)" : ""}`}>
              <th scope="row">{name(id)}</th>
              <td>{formatNumber(t.depth_m, t.depth_m < 1 ? 1 : 0)} m</td>
              <td>{formatPercent(t.p_ice)}</td>
              <td><span className="mission-verdict" data-verdict={t.verdict}>{t.verdict ? VERDICT_LABEL[t.verdict] : "—"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** The model notes behind the card: what the numbers assume and where they extrapolate. */
export function SiteNotes({ card }: { card: SiteAssessment | undefined }) {
  if (!card) return null;
  const local = card.nearby_impacts;
  return (
    <section aria-label="Model notes" className="mission-stack mission-site-notes">
      <Footnote tone="secondary">P(ice within each tool&apos;s reach) from the regional prior, before landing.{card.min_p ? ` GO needs the whole 90 % interval above ${formatPercent(card.min_p)} (mission threshold, an assumption).` : ""}</Footnote>
      {local ? <Footnote tone="secondary">Nearby fresh impacts (±{local.window_deg[0]}° lat, ±{local.window_deg[1]}° lon): {local.ice} with ice vs {formatNumber(local.expected_ice, 1)} expected.</Footnote> : null}
      {card.warnings.map((w) => <Footnote key={w} tone="secondary">{w}</Footnote>)}
    </section>
  );
}

/** Radar first, then drill: the decision chain the planner enables. */
export function RadarFirst() {
  const r = RADAR_FIRST;
  return (
    <section aria-label="Radar first, then drill" className="mission-stack">
      <Body>Drill where the radar flags ice within 1 m.</Body>
      <ListSection footer={r.source}>
        <ListRow trailing={<Value>{formatPercent(r.blindHit)} → {formatPercent(r.guidedHit)}</Value>}>
          <RowLabel title="Ice found per drill station" detail={`×${formatNumber(r.lift, 1)} (×${r.liftRange[0]}–${r.liftRange[1]} across radar assumptions)`} />
        </ListRow>
        <ListRow trailing={<Value>{formatNumber(r.evasBlind, 1)} → {formatNumber(r.evasGuided, 2)}</Value>}>
          <RowLabel title="EVAs to confirm ice" detail={`${r.soundingsPerEva} radar soundings per EVA · ${formatNumber(r.evasGuided20, 2)} with 20`} />
        </ListRow>
      </ListSection>
      <Footnote tone="secondary">It does not need spatial structure: radar and drill measure the same spot. Replanning after each sounding is what makes it work.</Footnote>
    </section>
  );
}
