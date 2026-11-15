import { ListRow, ListSection } from "@icewalk/ui/list";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Body, Footnote } from "@icewalk/ui/text";

import { formatDuration, formatNumber, formatOdds, formatPercent } from "@/lib/format";
import { decisionPointFor, measuringTool, stationBlock, toolName, type Plan, type Station } from "@/lib/plan";
import { useEvaWindow } from "@/lib/use-eva-window";
import type { PlanSource } from "@/lib/use-plan-session";

import { Disclosure } from "./disclosure";
import { PRIORITY_LABEL, RESULT_LABEL, RowLabel, clock } from "./parts";

const RESULT_PLAIN = { ice: "Ice", no_ice: "Not within reach", inconclusive: "Inconclusive", any: "Any result" } as const;

function soil(ti: number | null | undefined) {
  if (ti == null) return { value: "Unknown", note: "THEMIS, 100 m" };
  if (ti < 100) return { value: "Dust", note: `TI ${formatNumber(ti, 0)} · may not bear weight` };
  if (ti < 200) return { value: "Loose", note: `TI ${formatNumber(ti, 0)}` };
  return { value: "Firm", note: `TI ${formatNumber(ti, 0)}` };
}

/**
 * Station composition (the second level, as in AEGIS): why the station is there in plain words, the
 * numbers that matter at it, and what happens after measuring. Crew tasks, tools and the hypothesis fold
 * into one disclosure so the first view fits without scrolling.
 */
export function StationDetail({ plan, station, source }: { plan: Plan; station: Station; source: PlanSource }) {
  const threshold = plan.summary.ice_threshold_m;
  const point = decisionPointFor(plan, station.id);
  const block = stationBlock(plan, station.id);
  const evaWindow = useEvaWindow(plan.plan_id, source);
  const conditions = evaWindow.stations?.find((c) => c.station_id === station.id);
  const tool = measuringTool(station);
  const ground = soil(station.soil_ti);
  const crew = (["EV1", "EV2"] as const).filter((member) => station.tasks[member]?.length);
  const nexts = point ? [...new Set(point.options.map((o) => o.next_station_ids[0] ?? ""))] : [];

  return (
    <section className="mission-station" aria-label="Station composition">
      {station.reason ? (
        <section className="mission-why" aria-label="Why this station">
          <span className="mission-kicker">Why here · {toolName(tool).replace("Powered hand core drill", "core drill").toLowerCase()}, GPR on the traverse</span>
          <span>{station.reason}</span>
        </section>
      ) : null}

      <dl className="mission-facts" aria-label="Station numbers">
        <div><dt>{threshold ? `P(ice ≤ ${threshold} m)` : "P(ice)"}</dt><dd>{formatPercent(station.p_ice)}<small> {formatOdds(station.p_ice)}</small></dd></div>
        <div><dt>Ice depth</dt><dd>{station.depth_median_m != null ? `${formatNumber(station.depth_median_m, 1)} m` : "Unknown"}{station.depth_shallow_m != null ? <small> shallow case {formatNumber(station.depth_shallow_m, 1)} m</small> : null}</dd></div>
        <div><dt>At station</dt><dd>{block ? `${clock(block.t_start_min)}–${clock(block.t_end_min)}` : "—"}<small> {formatDuration(station.duration_min)}</small></dd></div>
        <div><dt>Walkback margin here</dt><dd>{block?.walkback_margin_min != null ? `${formatNumber(block.walkback_margin_min, 0)} min` : "—"}</dd></div>
        <div><dt>Comms</dt><dd>{station.comm_los == null ? "Unknown" : station.comm_los ? "Habitat in view" : "Relay via EV2"}</dd></div>
        <div><dt>Soil</dt><dd>{ground.value}<small> {ground.note}</small></dd></div>
        <div><dt>Sun · temperature</dt><dd>{conditions ? <>{formatNumber(conditions.sun_elevation_deg, 0)}° · {formatNumber(conditions.temperature_k - 273.15, 0)} °C<small> {conditions.arrival_ltst} LTST</small></> : "—"}</dd></div>
        <div><dt>Bingo</dt><dd>{point ? clock(point.decide_by_min) : "—"}</dd></div>
      </dl>

      {point ? (
        <section className="mission-after" aria-label="After this station">
          <strong>After this station:</strong>{" "}
          {nexts.length === 1
            ? <>any result → {nexts[0] || "habitat"}. This measurement does not change the next stations.</>
            : point.options.map((o) => `${RESULT_PLAIN[o.if_result]} → ${o.next_station_ids[0] ?? "habitat"}`).join(" · ")}
        </section>
      ) : null}

      <Disclosure title="Crew tasks, tools and hypothesis">
        <div className="mission-stack">
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
      </Disclosure>
    </section>
  );
}
