import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Metric, MetricList } from "@icewalk/ui/metric";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { useState } from "react";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { evaLimitMin, highestAlert, measurementSummary, measuringTool, missionObjective, nextBingo, nextStation, orderedStations, toolName, totalEquipmentMass, type Measurement, type Plan } from "@/lib/plan";
import type { PlanSource } from "@/lib/use-plan-session";
import { Disclosure } from "./disclosure";
import { EvaWindowCard } from "./eva-window-card";
import { FeasibilityCard } from "./feasibility-card";
import { clock, RowLabel, Value } from "./parts";

const MOBILITY = { walk: "Walkable", cart: "Hand cart advised", rover: "Rover advised" } as const;
type Tab = "stations" | "checks" | "gear";
type Check = { key: string; label: string; value: string; level?: "advisory" | "caution" | "warning" };

/** The three go/no-go checks as short chips: walk, comms, alerts. */
function checks(plan: Plan): Check[] {
  const f = plan.summary.feasibility;
  const noLos = f?.comms.stations_without_los ?? [];
  const alert = highestAlert(plan.alerts ?? []);
  return [
    { key: "walk", label: "Walk", value: f ? MOBILITY[f.mobility.mode] : "Not assessed", level: f && f.mobility.mode !== "walk" ? "advisory" : undefined },
    { key: "comms", label: "Comms", value: !f ? "Not assessed" : noLos.length ? `No line of sight at ${noLos.length}` : "Habitat in view", level: noLos.length ? "caution" : undefined },
    { key: "alerts", label: "Alerts", value: alert ? alert.level : "None", level: alert?.level },
  ];
}

function PlanNumbers({ plan }: { plan: Plan }) {
  const limit = evaLimitMin(plan);
  const bingo = nextBingo(plan);
  return (
    <MetricList aria-label="Plan numbers" className="mission-metrics mission-metrics-compact">
      <Metric label={limit ? `Duration · limit ${formatDuration(limit)}` : "Duration"} value={formatDuration(plan.summary.duration_min)} />
      <Metric label="Traverse" value={formatNumber(plan.summary.distance_km, 2)} unit="km" />
      <Metric label="Spare time to return" value={plan.summary.min_walkback_margin_min == null ? "-" : formatNumber(plan.summary.min_walkback_margin_min, 0)} unit="min" />
      <Metric label="First bingo" value={bingo ? clock(bingo.decide_by_min) : "-"} />
    </MetricList>
  );
}

function CheckChips({ plan }: { plan: Plan }) {
  return (
    <ul className="mission-chips" aria-label="Go / no-go checks">
      {checks(plan).map((c) => (
        <li key={c.key} data-level={c.level ?? "go"} title={`${c.label}: ${c.value}`}><span>{c.label}</span><strong>{c.value}</strong></li>
      ))}
    </ul>
  );
}

/**
 * Phase 2. Before approval the panel is the focus: goal, numbers, checks and the stations, with
 * details in tabs and "Approve plan" always at hand. After approval it shrinks to a card and the
 * map and the timeline take the space (Maestro's edit / follow-execution modes).
 */
export function PlanPanel({ plan, measurements, hoveredId, source, planSource, pending, approved, onApprove, onEdit, onStrategy, onSelect, onHover, onNext }: {
  plan: Plan; measurements: Measurement[]; hoveredId: string | null; source: string; planSource: PlanSource; pending?: boolean;
  approved: boolean; onApprove: () => void; onEdit: () => void;
  onStrategy?: (strategy: "learn" | "confirm") => void;
  onSelect: (id: string) => void; onHover: (id: string | null) => void; onNext: () => void;
}) {
  const [tab, setTab] = useState<Tab>("stations");
  if (approved) {
    return (
      <section aria-label="Approved plan" className="mission-stack">
        <StatusBadge level="advisory">Plan approved · {(plan.summary.strategy ?? "learn") === "confirm" ? "goal: confirm ice" : "goal: reduce uncertainty"}</StatusBadge>
        <PlanNumbers plan={plan} />
        <CheckChips plan={plan} />
        <Footnote tone="secondary">{plan.stations.length} stations · the map and the timeline show the traverse. Select a station for its details.</Footnote>
        <div className="mission-next"><Button variant="prominent" onClick={onNext}>Brief the EVA</Button><Button variant="plain" onClick={onEdit}>Edit plan</Button></div>
      </section>
    );
  }
  const f = plan.summary.feasibility;
  const noLos = f?.comms.stations_without_los ?? [];
  const equipment = plan.equipment ?? [];
  const mass = totalEquipmentMass(equipment);
  return (
    <section aria-label="EVA plan" className="mission-stack mission-plan">
      <Footnote tone="secondary" className="mission-objective-line" title={missionObjective(plan)}>{missionObjective(plan) ?? "Mission objective unavailable"}</Footnote>
      {onStrategy ? (
        <section className="mission-stack" aria-label="EVA goal">
          <SegmentedControl label="EVA goal" value={plan.summary.strategy ?? "learn"} options={[{ value: "learn", label: "Reduce uncertainty" }, { value: "confirm", label: "Confirm ice" }]} onValueChange={(v) => onStrategy(v as "learn" | "confirm")} />
          <Footnote tone="secondary">{pending ? "Replanning..." : (plan.summary.strategy ?? "learn") === "confirm"
            ? "Stations go where ice is likeliest, to confirm a usable resource."
            : "Stations go where a measurement teaches the most, one per terrain type first."}</Footnote>
        </section>
      ) : null}
      <PlanNumbers plan={plan} />
      <CheckChips plan={plan} />
      <SegmentedControl label="Plan details" value={tab} options={[{ value: "stations", label: `Stations · ${plan.stations.length}` }, { value: "checks", label: "Checks" }, { value: "gear", label: "Gear" }]} onValueChange={(v) => setTab(v as Tab)} />
      {tab === "stations" ? <StationList plan={plan} measurements={measurements} hoveredId={hoveredId} onSelect={onSelect} onHover={onHover} /> : null}
      {tab === "checks" ? (
        <section aria-label="Go / no-go details" className="mission-stack">
          <Disclosure title={<span className="mission-check"><span>Can we walk it?</span><strong>{f ? MOBILITY[f.mobility.mode] : "Not assessed"}</strong></span>}><FeasibilityCard plan={plan} /></Disclosure>
          <Disclosure title={<span className="mission-check"><span>EVA window & space weather</span><strong>Best start</strong></span>}><EvaWindowCard planId={plan.plan_id} source={planSource} /></Disclosure>
          <Disclosure title={<span className="mission-check"><span>Comms with the habitat</span><strong>{!f ? "Not assessed" : noLos.length ? `No line of sight at ${noLos.length}` : "In view at every station"}</strong></span>}>
            <Footnote tone="secondary">{noLos.length ? `No line of sight at ${noLos.join(", ")}: keep the EV partner as relay.` : "Every station sees the habitat antenna over the HiRISE terrain model."} Longest stretch without line of sight: {f ? formatNumber(f.comms.max_min_without_los, 0) : "-"} min (limit {f?.comms.limit_min ?? 15} min, an assumption).</Footnote>
          </Disclosure>
          {(plan.alerts ?? []).length ? <ListSection header="Planner alerts">{(plan.alerts ?? []).map((a, i) => <ListRow key={i}><RowLabel title={a.level} detail={a.message} /></ListRow>)}</ListSection> : null}
        </section>
      ) : null}
      {tab === "gear" ? (
        <section aria-label="Gear" className="mission-stack">
          <ListSection footer={`${formatNumber(mass.known_kg, 1)} kg known${mass.unknown ? ` · ${mass.unknown} items without mass` : ""}`}>{equipment.map((item) => <ListRow key={item.tool} trailing={<Value>{item.count} × {item.mass_kg == null ? "Unknown mass" : `${item.mass_kg} kg`}</Value>}><RowLabel title={toolName(item.tool)} detail={item.justification} /></ListRow>)}</ListSection>
          <Disclosure title="Model & assumptions"><Footnote className="mission-source">{plan.plan_id} · {source}</Footnote><Body>{plan.summary.craters_in_model !== undefined ? `${plan.summary.craters_in_model} craters in the model. ` : ""}Probabilities are model estimates, not confirmed ice. Habitat position and instrument performance include assumptions; see the project sources.</Body></Disclosure>
        </section>
      ) : null}
      <div className="mission-plan-footer">
        <Button variant="prominent" onClick={onApprove} disabled={pending}>Approve plan</Button>
        <Footnote tone="secondary">Approval locks this plan for the brief. Changing the goal withdraws it.</Footnote>
      </div>
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
