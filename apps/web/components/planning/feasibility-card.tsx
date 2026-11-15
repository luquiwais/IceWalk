import { Footnote } from "@icewalk/ui/text";
import { formatNumber, formatPercent } from "@/lib/format";
import { routeMaxSlope, toolName, type Plan } from "@/lib/plan";

const MODE_LABEL = { walk: "Walkable", cart: "Hand cart advised", rover: "Rover advised" } as const;
const MODE_VERDICT = { walk: "GO", cart: "CONDITIONAL", rover: "CONDITIONAL" } as const;
const SOIL_LABEL = { firm: "Firm", loose: "Loose", dust: "Dust", unknown: "Unknown" } as const;

/** "Can we walk it?": effort, load, soil, comms and the walk / cart / rover call (summary.feasibility). */
export function FeasibilityCard({ plan }: { plan: Plan }) {
  const f = plan.summary.feasibility;
  if (!f) return <Footnote tone="secondary">Feasibility unavailable for this plan.</Footnote>;
  const { effort: e, carry: c, soil: s, comms: m } = f;
  const slope = routeMaxSlope(plan);
  return (
    <section aria-label="Feasibility" className="mission-detail">
      <p className="mission-detail-lead"><span className="mission-verdict" data-verdict={MODE_VERDICT[f.mobility.mode]}>{MODE_LABEL[f.mobility.mode]}</span>. {f.mobility.reasons.join(". ")}.</p>
      <dl className="mission-facts">
        <div><dt>Peak effort</dt><dd>{formatNumber(e.peak_btu_h, 0)}<small>of {formatNumber(e.peak_limit_btu_h ?? 2000, 0)} BTU/h</small></dd></div>
        <div><dt>VO2max</dt><dd>{e.vo2max_fraction !== undefined ? formatPercent(e.vo2max_fraction) : "—"}<small>{e.vo2max_fraction_limit !== undefined ? `limit ${formatPercent(e.vo2max_fraction_limit)}` : "not estimated"}</small></dd></div>
        <div><dt>Oxygen per EV</dt><dd>{e.o2_kg_per_crew !== undefined ? `${formatNumber(e.o2_kg_per_crew, 2)} kg` : "—"}<small>metabolic estimate</small></dd></div>
        <div><dt>Heaviest tool</dt><dd>{c.heaviest ? `${formatNumber(c.heaviest.mass_kg, 1)} kg` : "—"}<small>{c.heaviest ? toolName(c.heaviest.tool) : "no masses"}</small></dd></div>
        <div><dt>Soil firmness</dt><dd>{SOIL_LABEL[s.class]}<small>{s.thermal_inertia_median != null ? `TI ${formatNumber(s.thermal_inertia_median, 0)} · THEMIS` : "no data"}</small></dd></div>
        <div><dt>Route in view</dt><dd>{m.route_los_fraction != null ? formatPercent(m.route_los_fraction) : "—"}<small>{m.stations_without_los?.length ? `blocked at ${m.stations_without_los.join(", ")}` : "of the habitat antenna"}</small></dd></div>
        {slope !== undefined ? <div><dt>Steepest leg</dt><dd>{formatNumber(slope, 1)}°<small>HiRISE DTM</small></dd></div> : null}
        {e.climb_m !== undefined ? <div><dt>Climb</dt><dd>{formatNumber(e.climb_m, 0)} m<small>whole traverse</small></dd></div> : null}
      </dl>
      <Footnote tone="secondary">Effort scaled from NASA&apos;s suited walkback (ICES-2026-127) by speed and soil. Walkback limit: 30 min at 3.5 km/h if anything fails.</Footnote>
    </section>
  );
}
