import { memo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@icewalk/ui/button";
import { Footnote } from "@icewalk/ui/text";
import { stationById, type Plan } from "@/lib/plan";
import { clock } from "./parts";

export const PlanTimeline = memo(function PlanTimeline({ plan, previousPlan, stationId, hoveredId, elapsedMin, onSelectStation, onHoverStation }: {
  plan: Plan; previousPlan?: Plan; stationId: string | null; hoveredId: string | null; elapsedMin?: number;
  onSelectStation: (id: string) => void; onHoverStation: (id: string | null) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState(0);
  const end = Math.max(...plan.timeline.map((t) => t.t_end_min), ...(previousPlan?.timeline.map((t) => t.t_end_min) ?? []), 1);
  const blocks = plan.timeline.filter((t) => t.t_end_min > t.t_start_min);
  const stationBlocks = blocks.filter((t) => t.kind === "station" && stationById(plan, t.station_id ?? ""));
  const margins = plan.timeline.filter((t) => t.walkback_margin_min !== undefined);
  const values = margins.map((t) => t.walkback_margin_min!);
  const min = values.length ? Math.min(...values) : undefined;
  const max = values.length ? Math.max(...values) : 1;
  const minItem = margins.find((t) => t.walkback_margin_min === min);
  const points = margins.map((t) => `${t.t_end_min / end * 1000},${24 - (t.walkback_margin_min! - (min ?? 0)) / Math.max(1, max - (min ?? 0)) * 20}`).join(" ");
  function keydown(event: KeyboardEvent, index: number) {
    const next = event.key === "ArrowRight" ? Math.min(index + 1, stationBlocks.length - 1) : event.key === "ArrowLeft" ? Math.max(0, index - 1) : event.key === "Home" ? 0 : event.key === "End" ? stationBlocks.length - 1 : undefined;
    if (next === undefined) return;
    event.preventDefault(); setFocused(next); refs.current[next]?.focus();
  }
  return <section className="mission-time" aria-label="Traverse timeline">
    <header><Footnote>Traverse · station order</Footnote><Footnote tone="secondary">{min == null ? "Walkback unavailable" : `Min walkback ${min.toFixed(1)} min`}</Footnote></header>
    <div className="mission-time-scroll">
      <div className="mission-time-inner" role="group" aria-label="Plan timeline">
        <svg className="mission-walkback" viewBox="0 0 1000 28" preserveAspectRatio="none" role="img" aria-label={min == null ? "No walkback data" : `Planned walkback margin, minimum ${min.toFixed(1)} minutes`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>
        {minItem ? <span className="mission-walkback-min" style={{ left: `${minItem.t_end_min / end * 100}%` }} aria-hidden>{min!.toFixed(1)} min</span> : null}
        <div className="mission-time-track">
          {blocks.map((t, i) => {
            const station = t.kind === "station" ? stationById(plan, t.station_id ?? "") : undefined;
            const style = { left: `${t.t_start_min / end * 100}%`, width: `${(t.t_end_min - t.t_start_min) / end * 100}%` };
            const label = `${t.label}, ${clock(t.t_start_min)} to ${clock(t.t_end_min)}`;
            const index = stationBlocks.indexOf(t);
            return station ? <Button variant="plain" size="small" shape="rounded" key={i} style={style} ref={(el) => { refs.current[index] = el; }}
              className="mission-time-station" data-hovered={hoveredId === station.id} aria-label={label} aria-pressed={stationId === station.id}
              tabIndex={focused === index ? 0 : -1} onFocus={() => { setFocused(index); onHoverStation(station.id); }} onBlur={() => onHoverStation(null)}
              onPointerEnter={() => onHoverStation(station.id)} onPointerLeave={() => onHoverStation(null)} onMouseEnter={() => onHoverStation(station.id)} onMouseLeave={() => onHoverStation(null)}
              onKeyDown={(e) => keydown(e, index)} onClick={() => onSelectStation(station.id)} title={label}>{station.order}</Button>
              : <span key={i} className="mission-time-segment" data-kind={t.kind} style={style} title={label}>{t.kind === "traverse" ? "›" : t.kind}</span>;
          })}
          {(plan.decision_points ?? []).map((p, i) => <span className="mission-bingo" data-first={i === 0} key={`${p.station_id}-${i}`} style={{ left: `${p.decide_by_min / end * 100}%` }} title={`Bingo ${p.station_id}: latest departure ${clock(p.decide_by_min)}`}><span>Bingo {clock(p.decide_by_min)}</span></span>)}
          {elapsedMin !== undefined ? <span className="mission-time-now" style={{ left: `${Math.min(100, elapsedMin / end * 100)}%` }}><span>Now {clock(elapsedMin)} · simulated</span></span> : null}
        </div>
        {previousPlan ? <div className="mission-time-previous" aria-label="Previous plan timeline">{previousPlan.timeline.map((t, i) => <span key={i} style={{ left: `${t.t_start_min / end * 100}%`, width: `${(t.t_end_min - t.t_start_min) / end * 100}%` }} data-kind={t.kind} />)}</div> : null}
        <div className="mission-time-axis">{Array.from({ length: Math.floor(end / 60) + 1 }, (_, i) => <span key={i} style={{ left: `${i * 60 / end * 100}%` }}>{i}:00</span>)}</div>
      </div>
    </div>
  </section>;
});
