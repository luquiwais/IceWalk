import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote } from "@icewalk/ui/text";
import { formatNumber, formatPercent } from "@/lib/format";
import { toolName, type Plan } from "@/lib/plan";
import { RowLabel, Value } from "./parts";

const MODE_LABEL = { walk: "Walkable", cart: "Hand cart advised", rover: "Rover advised" } as const;
const MODE_VERDICT = { walk: "GO", cart: "CONDITIONAL", rover: "CONDITIONAL" } as const;
const SOIL_LABEL = { firm: "Firm", loose: "Loose", dust: "Dust", unknown: "Unknown" } as const;

/** "Can we walk it?": effort, load, soil, comms and the walk / cart / rover call (summary.feasibility). */
export function FeasibilityCard({ plan }: { plan: Plan }) {
  const f = plan.summary.feasibility;
  if (!f) return <Footnote tone="secondary">Feasibility unavailable for this plan.</Footnote>;
  const { effort: e, carry: c, soil: s, comms: m } = f;
  const reach = plan.summary.max_distance_from_habitat_km;
  return (
    <section aria-label="Feasibility" className="mission-stack">
      <Body>
        <span className="mission-verdict" data-verdict={MODE_VERDICT[f.mobility.mode]}>{MODE_LABEL[f.mobility.mode]}</span>. {f.mobility.reasons.join(". ")}.
      </Body>
      <ListSection footer="Metabolic rates scaled from NASA's suited walkback (ICES-2026-127) by leg speed and soil; slope only slows the pace.">
        <ListRow trailing={<Value>{formatNumber(e.average_btu_h, 0)} BTU/h</Value>}>
          <RowLabel title="Effort, EVA average" detail={`Design average ${formatNumber(e.average_limit_btu_h ?? 1200, 0)} · peak ${formatNumber(e.peak_btu_h, 0)} of ${formatNumber(e.peak_limit_btu_h ?? 2000, 0)}${e.vo2max_fraction !== undefined ? ` · ${formatPercent(e.vo2max_fraction)} of VO2max` : ""}`} />
        </ListRow>
        {e.o2_kg_per_crew !== undefined ? (
          <ListRow trailing={<Value>{formatNumber(e.o2_kg_per_crew, 2)} kg</Value>}>
            <RowLabel title="Oxygen per crewmember" detail="Metabolic estimate for this plan" />
          </ListRow>
        ) : null}
        <ListRow trailing={<Value>{formatNumber(c.per_crew_kg, 1)} / {formatNumber(c.allowance_kg ?? 23, 0)} kg</Value>}>
          <RowLabel title="Tools per crewmember" detail={`${c.heaviest ? `Heaviest: ${toolName(c.heaviest.tool)}, ${formatNumber(c.heaviest.mass_kg, 1)} kg` : "No masses"}${c.unknown_mass?.length ? ` · ${c.unknown_mass.length} without mass` : ""}`} />
        </ListRow>
        <ListRow trailing={<Value>{SOIL_LABEL[s.class]}</Value>}>
          <RowLabel title="Soil firmness" detail={s.thermal_inertia_median != null ? `Thermal inertia ${formatNumber(s.thermal_inertia_median, 0)} on the route (dust below 100) · THEMIS` : "No thermal inertia data"} />
        </ListRow>
        <ListRow trailing={<Value>{m.route_los_fraction != null ? formatPercent(m.route_los_fraction) : "—"}</Value>}>
          <RowLabel title="Line of sight to habitat" detail={`Longest gap ${formatNumber(m.max_min_without_los, 0)} min of ${formatNumber(m.limit_min ?? 15, 0)}${m.stations_without_los?.length ? ` · blocked at ${m.stations_without_los.join(", ")}` : ""}`} />
        </ListRow>
      </ListSection>
      <Footnote tone="secondary">
        Walkback limit 1.8 km: 30 min at 3.5 km/h if anything fails (NASA ICES-2026-127){reach !== undefined ? `; farthest station ${formatNumber(reach, 2)} km` : ""}. A rover extends the reach only if every point stays within walking distance of safety.
      </Footnote>
    </section>
  );
}
