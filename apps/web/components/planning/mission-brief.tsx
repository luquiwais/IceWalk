import { memo } from "react";
import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Metric, MetricList } from "@icewalk/ui/metric";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { evaLimitMin, evaName, measuringTool, measurementSummary, missionObjective, nextStation, orderedStations, toolName, totalEquipmentMass, type Plan, type Measurement } from "@/lib/plan";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { Disclosure } from "./disclosure";
import { RadarFirst, SiteCard } from "./site-card";
import { BeyondSite, Evidence } from "./evidence";
import { EvaWindowCard } from "./eva-window-card";
import type { PlanSource } from "@/lib/use-plan-session";
import { RowLabel, Value } from "./parts";

export const MissionBrief = memo(function MissionBrief({ plan, measurements, hoveredId, source, planSource = "mock", onSelect, onHover }: {
  plan: Plan; measurements: Measurement[]; hoveredId: string | null; source: string; planSource?: PlanSource;
  onSelect: (id: string) => void; onHover: (id: string | null) => void;
}) {
  const limit = evaLimitMin(plan);
  const next = nextStation(plan, measurements);
  const equipment = plan.equipment ?? [];
  const mass = totalEquipmentMass(equipment);
  return <section aria-label="Mission brief" className="mission-stack">
    <div className="mission-objective"><Footnote tone="secondary">Science traceability matrix · {evaName(plan)}</Footnote><Body>{missionObjective(plan) ?? "Mission objective unavailable"}</Body>{plan.summary.ice_threshold_m !== undefined ? <Footnote tone="secondary">Ice threshold ≤ {plan.summary.ice_threshold_m} m</Footnote> : null}</div>
    <MetricList aria-label="Plan numbers" className="mission-metrics">
      <Metric label={limit ? `Duration · limit ${formatDuration(limit)}` : "Duration"} value={formatDuration(plan.summary.duration_min)} />
      <Metric label="Traverse" value={formatNumber(plan.summary.distance_km, 2)} unit="km" />
      <Metric label="Min walkback margin" value={plan.summary.min_walkback_margin_min === undefined ? "—" : formatNumber(plan.summary.min_walkback_margin_min, 1)} unit="min" />
      <Metric label="Estimated dose" value={plan.summary.dose_estimate_msv === undefined ? "—" : formatNumber(plan.summary.dose_estimate_msv, 2)} unit="mSv" />
    </MetricList>
    <section aria-label="Stations in visit order" className="mission-stations">
      <div className="mission-station-header"><Title3 as="h3">{plan.stations.length} stations</Title3><Footnote tone="secondary">P(ice{plan.summary.ice_threshold_m !== undefined ? ` ≤ ${plan.summary.ice_threshold_m} m` : ""})</Footnote></div>
      {orderedStations(plan).map((s) => {
        const measured = measurements.find((m) => m.station_id === s.id);
        return <Button key={s.id} variant="plain" shape="rounded" className="mission-station-row" data-hovered={hoveredId === s.id}
          aria-label={`Station ${s.order}, ${s.id}, ${formatPercent(s.p_ice)}, ${s.duration_min} min, ${toolName(measuringTool(s))}`}
          onClick={() => onSelect(s.id)} onPointerEnter={() => onHover(s.id)} onPointerLeave={() => onHover(null)} onFocus={() => onHover(s.id)} onBlur={() => onHover(null)}>
          <span className="mission-order">{s.order}</span><span className="mission-station-copy"><strong>{s.id}</strong><span>{measured ? `Measured · ${measurementSummary(measured)}` : `${s.duration_min} min · ${toolName(measuringTool(s))}`}</span></span><span className="mission-station-probability"><strong>{formatPercent(s.p_ice)}</strong><span>{measured ? "Measured" : next?.id === s.id ? "Next" : "Remaining"}</span></span>
        </Button>;
      })}
    </section>
    <div className="mission-disclosures">
      <Disclosure title="Is it worth going? · Site card" defaultOpen><SiteCard card={plan.site_assessment} /></Disclosure>
      <Disclosure title="Radar first, then drill"><RadarFirst /></Disclosure>
      <Disclosure title="EVA window & weather"><EvaWindowCard planId={plan.plan_id} source={planSource} /></Disclosure>
      <Disclosure title="Evidence · why trust it"><Evidence /></Disclosure>
      <Disclosure title="Beyond S1094b · SkyFall & NASA zones"><BeyondSite /></Disclosure>
      <Disclosure title="Decision points"><ListSection footer="Bingo is the latest safe departure, as supplied by the planner.">{(plan.decision_points ?? []).map((p) => <ListRow key={p.station_id} onClick={() => onSelect(p.station_id)}><RowLabel title={p.station_id} detail={`${Math.floor(p.decide_by_min / 60)}:${String(Math.round(p.decide_by_min % 60)).padStart(2, "0")} · ${p.options.length} branches · crew decides`} /></ListRow>)}</ListSection></Disclosure>
      <Disclosure title="Equipment & mass"><ListSection footer={`${formatNumber(mass.known_kg, 1)} kg known${mass.unknown ? ` · ${mass.unknown} items without mass` : ""}`}>{equipment.map((item) => <ListRow key={item.tool} trailing={<Value>{item.count} × {item.mass_kg == null ? "Unknown mass" : `${item.mass_kg} kg`}</Value>}><RowLabel title={toolName(item.tool)} detail={item.justification} /></ListRow>)}</ListSection></Disclosure>
      <Disclosure title="Model & assumptions"><Footnote className="mission-source">{plan.plan_id} · {source}</Footnote><Footnote tone="secondary">{plan.summary.craters_in_model !== undefined ? `${plan.summary.craters_in_model} craters in model. ` : ""}Probabilities are model estimates, not confirmed ice. Habitat position and instrument performance include assumptions; see project sources.</Footnote></Disclosure>
    </div>
  </section>;
});
