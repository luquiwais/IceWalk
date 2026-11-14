import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote } from "@icewalk/ui/text";
import { formatNumber, formatPercent } from "@/lib/format";
import { PRECURSOR_LABEL, RADAR_FIRST } from "@/lib/evidence";
import { toolName, type SiteAssessment } from "@/lib/plan";
import { RowLabel, Value } from "./parts";

const VERDICT_LABEL = { GO: "GO", CONDITIONAL: "Conditional", NO_GO: "No-go", INSUFFICIENT_DATA: "Insufficient data" } as const;

function name(id: string) {
  return PRECURSOR_LABEL[id] ?? toolName(id);
}

/** "Is it worth going, and with which tool?" from plan.site_assessment. */
export function SiteCard({ card }: { card: SiteAssessment | undefined }) {
  if (!card) return <Footnote tone="secondary">Site card unavailable for this plan.</Footnote>;
  const rows = Object.entries(card.tools).sort(([, a], [, b]) => a.depth_m - b.depth_m);
  const local = card.nearby_impacts;
  return (
    <section aria-label="Site card" className="mission-stack">
      <Body>
        {card.verdict ? <><span className="mission-verdict" data-verdict={card.verdict}>{VERDICT_LABEL[card.verdict]}</span> with the best tool. </> : null}
        Median depth to ice {card.median_depth_m ? `${formatNumber(card.median_depth_m, 1)} m` : "unknown"}
        {card.median_depth_90_m ? ` (90 %: ${formatNumber(card.median_depth_90_m[0], 1)}–${formatNumber(card.median_depth_90_m[1], 1)} m)` : ""}.
      </Body>
      <ListSection footer={`Probability that ice is within each tool's reach, regional prior before landing.${card.min_p ? ` GO needs the whole 90 % interval above ${formatPercent(card.min_p)} (mission threshold, an assumption).` : ""}`}>
        {rows.map(([id, t]) => (
          <ListRow key={id} trailing={<Value><span className="mission-verdict" data-verdict={t.verdict}>{t.verdict ? VERDICT_LABEL[t.verdict] : ""}</span> {formatPercent(t.p_ice)}</Value>}>
            <RowLabel title={`${name(id)} · ≤ ${formatNumber(t.depth_m, t.depth_m < 1 ? 1 : 0)} m`} detail={`90 %: ${formatPercent(t.p_ice_90[0])}–${formatPercent(t.p_ice_90[1])}${t.precursor ? " · flies before the EVA" : ""}`} />
          </ListRow>
        ))}
      </ListSection>
      {local ? <Footnote tone="secondary">Nearby fresh impacts (±{local.window_deg[0]}° lat, ±{local.window_deg[1]}° lon): {local.ice} with ice vs {formatNumber(local.expected_ice, 1)} expected.</Footnote> : null}
      {card.warnings.map((w) => <Footnote key={w} tone="secondary">Note · {w}</Footnote>)}
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
