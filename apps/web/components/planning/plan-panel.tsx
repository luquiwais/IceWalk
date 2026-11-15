import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Metric, MetricList } from "@icewalk/ui/metric";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Footnote, Title3 } from "@icewalk/ui/text";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { evaLimitMin, measurementSummary, measuringTool, missionObjective, nextBingo, nextStation, orderedStations, toolName, totalEquipmentMass, type Measurement, type Plan } from "@/lib/plan";
import type { PlanSource } from "@/lib/use-plan-session";
import { Disclosure } from "./disclosure";
import { EvaWindowCard } from "./eva-window-card";
import { FeasibilityCard } from "./feasibility-card";
import { clock, RowLabel, Value } from "./parts";
import { NextStep } from "./phases";

const MOBILITY = { walk: "Walkable", cart: "Hand cart advised", rover: "Rover advised" } as const;

/** Phase 2: the plan in numbers, three go/no-go checks, the stations, and the next step. */
export function PlanPanel({ plan, measurements, hoveredId, source, planSource, pending, onStrategy, onSelect, onHover, onNext }: {
  plan: Plan; measurements: Measurement[]; hoveredId: string | null; source: string; planSource: PlanSource; pending?: boolean;
  onStrategy?: (strategy: "learn" | "confirm") => void;
  onSelect: (id: string) => void; onHover: (id: string | null) => void; onNext: () => void;
}) {
  const limit = evaLimitMin(plan);
  const bingo = nextBingo(plan);
  const f = plan.summary.feasibility;
  const noLos = f?.comms.stations_without_los ?? [];
  const equipment = plan.equipment ?? [];
  const mass = totalEquipmentMass(equipment);
  return (
    <section aria-label="EVA plan" className="mission-stack">
      <Footnote tone="secondary">{missionObjective(plan) ?? "Mission objective unavailable"}</Footnote>
      {onStrategy ? (
        <section className="mission-stack" aria-label="EVA goal">
          <SegmentedControl label="EVA goal" value={plan.summary.strategy ?? "learn"} options={[{ value: "learn", label: "Reduce uncertainty" }, { value: "confirm", label: "Confirm ice" }]} onValueChange={(v) => onStrategy(v as "learn" | "confirm")} />
          <Footnote tone="secondary">{pending ? "Replanning..." : (plan.summary.strategy ?? "learn") === "confirm"
            ? "Stations go where ice is likeliest, to confirm a usable resource."
            : "Stations go where a measurement teaches the most, one per terrain type first."}</Footnote>
        </section>
      ) : null}
      <MetricList aria-label="Plan numbers" className="mission-metrics">
        <Metric label={limit ? `Duration · limit ${formatDuration(limit)}` : "Duration"} value={formatDuration(plan.summary.duration_min)} />
        <Metric label="Traverse" value={formatNumber(plan.summary.distance_km, 2)} unit="km" />
        <Metric label="Min walkback margin" value={plan.summary.min_walkback_margin_min == null ? "-" : formatNumber(plan.summary.min_walkback_margin_min, 1)} unit="min" />
        <Metric label="First bingo" value={bingo ? clock(bingo.decide_by_min) : "-"} />
      </MetricList>

      <section aria-label="Go / no-go checks" className="mission-stack">
        <Title3 as="h3">Go / no-go checks</Title3>
        <Disclosure title={<span className="mission-check"><span>Can we walk it?</span><strong>{f ? MOBILITY[f.mobility.mode] : "Not assessed"}</strong></span>}><FeasibilityCard plan={plan} /></Disclosure>
        <Disclosure title={<span className="mission-check"><span>EVA window & space weather</span><strong>Best start</strong></span>}><EvaWindowCard planId={plan.plan_id} source={planSource} /></Disclosure>
        <Disclosure title={<span className="mission-check"><span>Comms with the habitat</span><strong>{!f ? "Not assessed" : noLos.length ? `No line of sight at ${noLos.length}` : "In view at every station"}</strong></span>}>
          <Footnote tone="secondary">{noLos.length ? `No line of sight at ${noLos.join(", ")}: keep the EV partner as relay.` : "Every station sees the habitat antenna over the HiRISE DTM."} Longest stretch without line of sight: {f ? formatNumber(f.comms.max_min_without_los, 0) : "-"} min (limit {f?.comms.limit_min ?? 15} min, an assumption).</Footnote>
        </Disclosure>
      </section>

      <StationList plan={plan} measurements={measurements} hoveredId={hoveredId} onSelect={onSelect} onHover={onHover} />

      <div className="mission-disclosures">
        <Disclosure title="Equipment & mass"><ListSection footer={`${formatNumber(mass.known_kg, 1)} kg known${mass.unknown ? ` · ${mass.unknown} items without mass` : ""}`}>{equipment.map((item) => <ListRow key={item.tool} trailing={<Value>{item.count} × {item.mass_kg == null ? "Unknown mass" : `${item.mass_kg} kg`}</Value>}><RowLabel title={toolName(item.tool)} detail={item.justification} /></ListRow>)}</ListSection></Disclosure>
        <Disclosure title="Model & assumptions"><Footnote className="mission-source">{plan.plan_id} · {source}</Footnote><Footnote tone="secondary">{plan.summary.craters_in_model !== undefined ? `${plan.summary.craters_in_model} craters in the model. ` : ""}Probabilities are model estimates, not confirmed ice. Habitat position and instrument performance include assumptions; see the project sources.</Footnote></Disclosure>
      </div>
      <NextStep label="Brief the EVA in 3D" onClick={onNext} note="Walk the real terrain before going out." />
    </section>
  );
}

export function StationList({ plan, measurements, hoveredId, onSelect, onHover }: {
  plan: Plan; measurements: Measurement[]; hoveredId: string | null; onSelect: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const next = nextStation(plan, measurements);
  return (
    <section aria-label="Stations in visit order" className="mission-stations">
      <div className="mission-station-header"><Title3 as="h3">{plan.stations.length} stations</Title3><Footnote tone="secondary">P(ice{plan.summary.ice_threshold_m !== undefined ? ` ≤ ${plan.summary.ice_threshold_m} m` : ""})</Footnote></div>
      {orderedStations(plan).map((s) => {
        const measured = measurements.find((m) => m.station_id === s.id);
        return <Button key={s.id} variant="plain" shape="rounded" className="mission-station-row" data-hovered={hoveredId === s.id}
          aria-label={`Station ${s.order}, ${s.id}, ${formatPercent(s.p_ice)}, ${s.duration_min} min, ${toolName(measuringTool(s))}`}
          onClick={() => onSelect(s.id)} onPointerEnter={() => onHover(s.id)} onPointerLeave={() => onHover(null)} onFocus={() => onHover(s.id)} onBlur={() => onHover(null)}>
          <span className="mission-order">{s.order}</span><span className="mission-station-copy"><strong>{s.id}</strong><span>{measured ? `Measured · ${measurementSummary(measured)}` : `${s.duration_min} min · ${toolName(measuringTool(s))}`}</span>{s.reason && !measured ? <span className="mission-station-why">{s.reason.split(":")[0]}</span> : null}</span><span className="mission-station-probability"><strong>{formatPercent(s.p_ice)}</strong><span>{measured ? "Measured" : next?.id === s.id ? "Next" : "Remaining"}</span></span>
        </Button>;
      })}
    </section>
  );
}
