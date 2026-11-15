import { Footnote } from "@icewalk/ui/text";
import { ChevronRight } from "lucide-react";
import { HABITAT_XY } from "@/components/site/site-data";
import type { FlightRule } from "@/lib/flight-rules";
import { formatNumber, formatPercent } from "@/lib/format";
import { decisionPointFor, missionConstraints, orderedStations, stationBlock, toolName, totalEquipmentMass, type Plan } from "@/lib/plan";
import type { EvaWindow } from "@/lib/use-eva-window";
import { EvaWindowCard } from "./eva-window-card";
import { clock } from "./parts";

const SOIL_LABEL = { firm: "Firm", loose: "Loose", dust: "Dust", unknown: "Unknown" } as const;
const MODE_LABEL = { walk: "Walkable", cart: "Hand cart advised", rover: "Rover advised" } as const;
const dash = "—";

/** One fact: label, value and an optional note under it. */
function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div><dt>{label}</dt><dd>{value}{note ? <small>{note}</small> : null}</dd></div>;
}

/**
 * The detail of one flight rule: what supports that number, from the plan, the planner's feasibility, the
 * STM and the EVA window. Each rule shows its own evidence; nothing repeats the tile's headline.
 */
export function RuleDetail({ rule, plan, window, source, onTimeline }: { rule: FlightRule; plan: Plan; window: EvaWindow; source: string; onTimeline: () => void }) {
  const f = plan.summary.feasibility;
  const stations = orderedStations(plan);
  const head = <h3 className="mission-detail-title">{rule.name} <span className="mission-detail-value">{rule.value} · {rule.limit.replace("*", "")}</span></h3>;

  if (rule.id === "duration") {
    const c = missionConstraints(plan);
    const sum = (kind: string) => plan.timeline.filter((t) => t.kind === kind).reduce((a, t) => a + (t.t_end_min - t.t_start_min), 0);
    const budget = c ? c.eva_max_h * 60 * (1 - c.reserve) : undefined;
    return <section className="mission-detail" aria-label="Duration detail">{head}
      <dl className="mission-facts">
        <Fact label="Egress" value={clock(sum("egress"))} />
        <Fact label="Walking" value={clock(sum("traverse"))} note={`${formatNumber(plan.summary.distance_km, 2)} km`} />
        <Fact label="At stations" value={clock(sum("station"))} note={`${stations.length} stations`} />
        <Fact label="Ingress" value={clock(sum("ingress"))} />
        <Fact label="Reserve" value={c ? clock(c.eva_max_h * 60 * c.reserve) : dash} note={c ? `${Math.round(c.reserve * 100)} % of ${c.eva_max_h} h, kept free` : "STM unknown"} />
        <Fact label="Left in budget" value={budget ? clock(Math.max(0, budget - plan.summary.duration_min)) : dash} />
      </dl>
      <button type="button" className="mission-text-link" onClick={onTimeline}>Show on the timeline<ChevronRight aria-hidden /></button>
    </section>;
  }

  if (rule.id === "walkback") {
    return <section className="mission-detail" aria-label="Walkback detail">{head}
      <table className="mission-table">
        <thead><tr><th>#</th><th>Station</th><th>At</th><th>Margin</th><th>Bingo</th></tr></thead>
        <tbody>{stations.map((s) => { const b = stationBlock(plan, s.id); const p = decisionPointFor(plan, s.id); return <tr key={s.id}><td>{s.order}</td><td>{s.id}</td><td>{b ? clock(b.t_start_min) : dash}</td><td>{b?.walkback_margin_min != null ? `${formatNumber(b.walkback_margin_min, 0)} min` : dash}</td><td>{p ? clock(p.decide_by_min) : dash}</td></tr>; })}</tbody>
      </table>
      <Footnote tone="secondary">Minutes to spare if the crew turned back at each station. {plan.summary.walkback_caution_min != null ? `Caution below ${formatNumber(plan.summary.walkback_caution_min, 0)} min is an assumption of the STM.` : "No caution threshold in the STM."}</Footnote>
      <button type="button" className="mission-text-link" onClick={onTimeline}>Show on the timeline<ChevronRight aria-hidden /></button>
    </section>;
  }

  if (rule.id === "distance") {
    const far = Math.max(...stations.map((s) => Math.hypot(s.position[0] - HABITAT_XY[0], s.position[1] - HABITAT_XY[1])));
    return <section className="mission-detail" aria-label="Distance detail">{head}
      <table className="mission-table">
        <thead><tr><th>#</th><th>Station</th><th>From habitat</th><th></th></tr></thead>
        <tbody>{stations.map((s) => { const d = Math.hypot(s.position[0] - HABITAT_XY[0], s.position[1] - HABITAT_XY[1]); return <tr key={s.id}><td>{s.order}</td><td>{s.id}</td><td>{formatNumber(d / 1000, 2)} km</td><td>{d === far ? "farthest" : ""}</td></tr>; })}</tbody>
      </table>
      <Footnote tone="secondary">{f ? `${MODE_LABEL[f.mobility.mode]}: ${f.mobility.reasons.join("; ").toLowerCase()}. ` : ""}Straight-line distance. The walkback limit is 30 min at 3.5 km/h if a suit or rover fails (NASA ICES-2026-127).</Footnote>
    </section>;
  }

  if (rule.id === "slope") {
    const c = missionConstraints(plan);
    return <section className="mission-detail" aria-label="Slope detail">{head}
      <dl className="mission-facts">
        <Fact label="Climb" value={f?.effort.climb_m != null ? `${formatNumber(f.effort.climb_m, 0)} m` : dash} note="whole traverse" />
        <Fact label="Soil firmness" value={f ? SOIL_LABEL[f.soil.class] : dash} note={f?.soil.thermal_inertia_median != null ? `TI ${formatNumber(f.soil.thermal_inertia_median, 0)} · THEMIS` : undefined} />
        <Fact label="Terrain factor" value={f?.soil.terrain_coefficient != null ? `×${formatNumber(f.soil.terrain_coefficient, 1)}` : dash} note="slows the pace" />
        <Fact label="Walking speed" value={c?.walking_speed_kmh != null ? `${formatNumber(c.walking_speed_kmh, 1)} km/h` : dash} note="STM, flat ground" />
      </dl>
      <Footnote tone="secondary">The route is the fastest path on the HiRISE terrain model (DTM): slope only slows the pace and legs over the STM limit are excluded.</Footnote>
    </section>;
  }

  if (rule.id === "comms") {
    return <section className="mission-detail" aria-label="Comms detail">{head}
      <table className="mission-table">
        <thead><tr><th>#</th><th>Station</th><th>Line of sight to habitat</th></tr></thead>
        <tbody>{stations.map((s) => <tr key={s.id}><td>{s.order}</td><td>{s.id}</td><td>{s.comm_los == null ? "Unknown" : s.comm_los ? "In view" : "Blocked · relay via EV2"}</td></tr>)}</tbody>
      </table>
      <Footnote tone="secondary">{f?.comms.route_los_fraction != null ? `${formatPercent(f.comms.route_los_fraction)} of the route in view. ` : ""}Habitat antenna over the HiRISE terrain model; the antenna height and the gap limit are assumptions.</Footnote>
    </section>;
  }

  if (rule.id === "effort") {
    const e = f?.effort;
    return <section className="mission-detail" aria-label="Effort detail">{head}
      <dl className="mission-facts">
        <Fact label="Peak" value={e ? `${formatNumber(e.peak_btu_h, 0)}` : dash} note={e?.peak_limit_btu_h != null ? `of ${formatNumber(e.peak_limit_btu_h, 0)} BTU/h` : "BTU/h"} />
        <Fact label="VO2max" value={e?.vo2max_fraction != null ? formatPercent(e.vo2max_fraction) : dash} note={e?.vo2max_fraction_limit != null ? `limit ${formatPercent(e.vo2max_fraction_limit)}` : undefined} />
        <Fact label="Oxygen per EV" value={e?.o2_kg_per_crew != null ? `${formatNumber(e.o2_kg_per_crew, 2)} kg` : dash} note="metabolic estimate" />
        <Fact label="Moved mass" value={e?.moved_mass_kg != null ? `${formatNumber(e.moved_mass_kg, 0)} kg` : dash} note="crew, suit and load" />
        <Fact label="Climb" value={e?.climb_m != null ? `${formatNumber(e.climb_m, 0)} m` : dash} />
        <Fact label="Soil" value={f ? SOIL_LABEL[f.soil.class] : dash} />
      </dl>
      <Footnote tone="secondary">Rates scaled from NASA&apos;s suited walkback (ICES-2026-127) by leg speed and soil.</Footnote>
    </section>;
  }

  if (rule.id === "carry") {
    const equipment = plan.equipment ?? [];
    const mass = totalEquipmentMass(equipment);
    return <section className="mission-detail" aria-label="Gear list">{head}
      <table className="mission-table">
        <thead><tr><th>Tool</th><th>Count</th><th>Mass</th><th>For</th></tr></thead>
        <tbody>{equipment.map((item) => <tr key={item.tool}><td>{toolName(item.tool)}</td><td>{item.count}</td><td>{item.mass_kg == null ? "Unknown" : `${item.mass_kg} kg`}</td><td>{(item.justification ?? "").replace("Objectives", "Obj.").replace("Objective", "Obj.")}</td></tr>)}</tbody>
      </table>
      <Footnote tone="secondary">{formatNumber(mass.known_kg, 1)} kg known{mass.unknown ? `, ${mass.unknown} item${mass.unknown === 1 ? "" : "s"} without a mass yet` : ""}, {plan.summary.crew != null ? `shared by ${plan.summary.crew} EVs` : "per EVA"}{f?.carry.heaviest ? `; heaviest: ${toolName(f.carry.heaviest.tool)}` : ""}. {plan.plan_id} · {source}</Footnote>
    </section>;
  }

  // EVA window
  return <section className="mission-detail" aria-label="Window detail">{head}<EvaWindowCard data={window} /></section>;
}
