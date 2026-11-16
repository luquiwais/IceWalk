import { ListRow, ListSection } from "@icewalk/ui/list";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Body, Footnote } from "@icewalk/ui/text";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useState } from "react";

import { formatDuration, formatNumber, formatOdds, formatPercent } from "@/lib/format";
import { decisionPointFor, measuringTool, orderedStations, stationBlock, toolName, type Plan, type Station } from "@/lib/plan";
import { useEvaWindow } from "@/lib/use-eva-window";
import type { PlanSource } from "@/lib/use-plan-session";

import { PRIORITY_LABEL, RESULT_LABEL, RowLabel, clock } from "./parts";

const RESULT_PLAIN = { ice: "Ice", no_ice: "Not within reach", inconclusive: "Inconclusive", any: "Any result" } as const;

function soil(ti: number | null | undefined) {
  if (ti == null) return { value: "Unknown", note: "no THEMIS data" };
  if (ti < 100) return { value: "Dust", note: "may not bear weight" };
  if (ti < 200) return { value: "Loose", note: "THEMIS" };
  return { value: "Firm", note: "THEMIS" };
}

/**
 * Station composition (the second level, as in AEGIS): why the station is there in plain words, the
 * numbers that matter at it, and what happens after measuring. Crew tasks, tools and the hypothesis fold
 * into one disclosure so the first view fits without scrolling.
 */
export function StationDetail({ plan, station, source, onSelect, onRemove }: { plan: Plan; station: Station; source: PlanSource; onSelect?: (id: string) => void; onRemove?: () => void }) {
  const threshold = plan.summary.ice_threshold_m;
  const point = decisionPointFor(plan, station.id);
  const block = stationBlock(plan, station.id);
  const evaWindow = useEvaWindow(plan.plan_id, source);
  const conditions = evaWindow.stations?.find((c) => c.station_id === station.id);
  const tool = measuringTool(station);
  const ground = soil(station.soil_ti);
  const crew = (["EV1", "EV2"] as const).filter((member) => station.tasks[member]?.length);
  const [crewOpen, setCrewOpen] = useState(false);
  const order = orderedStations(plan);
  const at = order.findIndex((s) => s.id === station.id);
  const prev = at > 0 ? order[at - 1] : undefined;
  const after = at >= 0 && at < order.length - 1 ? order[at + 1] : undefined;
  const nexts = point ? [...new Set(point.options.map((o) => o.next_station_ids[0] ?? ""))] : [];

  return (
    <section className="mission-station" aria-label="Station composition">
      {station.reason || onRemove ? (
        <section className="mission-why" aria-label="Why this station">
          {station.reason ? <span><strong>Why here:</strong> {station.reason}</span> : null}
          {onRemove ? <span className="mission-why-edit">Drag it on the map to move it · <button type="button" className="mission-text-link" onClick={onRemove}>Remove</button></span> : null}
        </section>
      ) : null}

      <dl className="mission-facts" aria-label="Station numbers">
        <div><dt>{threshold ? `P(ice ≤ ${threshold} m)` : "P(ice)"}</dt><dd>{formatPercent(station.p_ice)}<small>{formatOdds(station.p_ice)}</small></dd></div>
        <div><dt>Ice depth</dt><dd>{station.depth_median_m != null ? `${formatNumber(station.depth_median_m, 1)} m` : "Unknown"}{station.depth_shallow_m != null ? <small>shallow {formatNumber(station.depth_shallow_m, 1)} m</small> : null}</dd></div>
        <div><dt>At station</dt><dd>{block ? `${clock(block.t_start_min)}–${clock(block.t_end_min)}` : "—"}<small>{formatDuration(station.duration_min)}</small></dd></div>
        <div><dt>Walkback here</dt><dd>{block?.walkback_margin_min != null ? `${formatNumber(block.walkback_margin_min, 0)} min` : "—"}</dd></div>
        <div><dt>Comms</dt><dd>{station.comm_los == null ? "Unknown" : station.comm_los ? "In view" : "Relay via EV2"}</dd></div>
        <div><dt>Soil</dt><dd>{ground.value}<small>{ground.note}</small></dd></div>
        <div><dt>Sun · temp.</dt><dd>{conditions ? <>{formatNumber(conditions.sun_elevation_deg, 0)}° · {formatNumber(conditions.temperature_k - 273.15, 0)} °C<small>{conditions.arrival_ltst} LTST</small></> : "—"}</dd></div>
        <div><dt>Tools</dt><dd>{toolName(tool).replace("Powered hand core drill", "Core drill")}<small>+ GPR walking</small></dd></div>
        {point ? <div><dt>Bingo</dt><dd>{clock(point.decide_by_min)}<small>latest departure</small></dd></div> : null}
      </dl>

      <section className="mission-after" aria-label="After this station">
        <strong>Then:</strong>{" "}
        {!point ? <>{after ? `${after.id}, next in walking order` : "walk back to the habitat"}.</>
          : nexts.length === 1
            ? <>{nexts[0] || "habitat"} for any result; the plan does not change.</>
            : point.options.map((o) => `${RESULT_PLAIN[o.if_result]} → ${o.next_station_ids[0] ?? "habitat"}`).join(" · ")}
      </section>

      <nav className="mission-station-nav" aria-label="Other stations">
        {onSelect && prev ? <button type="button" onClick={() => onSelect(prev.id)}><ChevronLeft aria-hidden />Station {prev.order}</button> : <span />}
        <button type="button" aria-expanded={crewOpen} onClick={() => setCrewOpen((v) => !v)}>Tasks & tools{crewOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}</button>
        {onSelect && after ? <button type="button" onClick={() => onSelect(after.id)}>Station {after.order}<ChevronRight aria-hidden /></button> : <span />}
      </nav>

      {crewOpen ? (
        <div className="mission-stack" aria-label="Crew tasks, tools and hypothesis" role="region">
          {station.planetary_protection === "sensitive" ? <StatusBadge level="advisory">Planetary protection: IV GO before heat-generating tasks</StatusBadge> : null}
          {crew.map((member) => (
            <ListSection key={member} header={`${member} tasks`} headerId={`station-${member}`}>
              {station.tasks[member]!.map((task) => <ListRow key={task}>{task}</ListRow>)}
            </ListSection>
          ))}
          <ListSection header="Tools" headerId="station-tools">{station.tools.map((t) => <ListRow key={t}>{toolName(t)}</ListRow>)}</ListSection>
          <ListSection header="Hypothesis" headerId="station-hypothesis">
            <ListRow><RowLabel title={<Body as="span" className="whitespace-normal">{station.hypothesis}</Body>} detail={`${PRIORITY_LABEL[station.priority]} priority · STM objective ${station.objective_ranks.join(", ")}`} /></ListRow>
          </ListSection>
          <Footnote tone="secondary">Uncertainty {formatNumber(station.uncertainty, 2)} bits (1 = coin flip) · value of measuring {formatNumber(station.value, 2)}.{point?.options.length ? ` Options: ${point.options.map((o) => `${RESULT_LABEL[o.if_result]} → ${o.next_station_ids.join(", ") || "habitat"}`).join("; ")}.` : ""}{point?.hard_stop ? ` Hard stop: ${point.hard_stop}` : ""}</Footnote>
        </div>
      ) : null}
    </section>
  );
}
