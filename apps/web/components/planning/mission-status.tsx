import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Caption1 } from "@icewalk/ui/text";
import { formatNumber } from "@/lib/format";
import { orderedStations, type Plan } from "@/lib/plan";
import { clock, Value } from "./parts";

/** Time-proportional visualization; the interactive station blocks use kit buttons. */
export function PlanTimeline({
  plan,
  stationId,
  elapsedMin,
  onSelectStation,
}: {
  plan: Plan;
  stationId: string | null;
  elapsedMin: number;
  onSelectStation: (id: string) => void;
}) {
  const end = Math.max(...plan.timeline.map((t) => t.t_end_min), 1);
  return (
    <div className="mission-timeline" role="group" aria-label="Plan timeline">
      <div className="mission-timeline-track">
        {plan.timeline
          .filter((item) => item.t_end_min > item.t_start_min)
          .map((item, i) => {
            const station =
              item.kind === "station"
                ? orderedStations(plan).find((s) => s.id === item.station_id)
                : undefined;
            const style = {
              left: `${(item.t_start_min / end) * 100}%`,
              width: `${((item.t_end_min - item.t_start_min) / end) * 100}%`,
            };
            return station ? (
              <Button
                key={i}
                size="small"
                shape="rounded"
                style={style}
                className="mission-timeline-station"
                aria-label={`${item.label}, ${clock(item.t_start_min)} to ${clock(item.t_end_min)}`}
                aria-pressed={stationId === station.id}
                onClick={() => onSelectStation(station.id)}
              >
                {station.order}
              </Button>
            ) : (
              <span
                key={i}
                style={style}
                data-kind={item.kind}
                className="mission-timeline-segment"
                title={`${item.label} · ${clock(item.t_start_min)}–${clock(item.t_end_min)}`}
              />
            );
          })}
        <span
          className="mission-now"
          style={{ left: `${Math.min(100, (elapsedMin / end) * 100)}%` }}
        >
          <Caption1 as="span">Now {clock(elapsedMin)}</Caption1>
        </span>
      </div>
      <div className="mission-timeline-scale">
        <Caption1 tone="secondary">Egress · 0:00</Caption1>
        <Caption1 tone="secondary">Traverse & stations</Caption1>
        <Caption1 tone="secondary">{clock(end)} · limit</Caption1>
      </div>
    </div>
  );
}

export function MissionStatus({
  plan,
  elapsedMin,
}: {
  plan: Plan;
  stationId: string | null;
  elapsedMin: number;
  onSelectStation: (id: string) => void;
}) {
  const bingo = [...(plan.decision_points ?? [])]
    .filter((p) => p.decide_by_min >= elapsedMin)
    .sort((a, b) => a.decide_by_min - b.decide_by_min)[0];
  return (
    <div className="mission-stack">
      <ListSection footer="Design demo · simulated execution values.">
        <ListRow trailing={<Value>{clock(elapsedMin)}</Value>}>PET</ListRow>
        <ListRow
          trailing={
            <Value>
              {formatNumber(plan.summary.min_walkback_margin_min ?? 0, 1)} min
            </Value>
          }
        >
          Min planned walkback
        </ListRow>
        <ListRow
          trailing={
            <Value>{bingo ? clock(bingo.decide_by_min) : "None"}</Value>
          }
        >
          Next bingo {bingo?.station_id ?? ""}
        </ListRow>
      </ListSection>
      {(plan.alerts ?? []).map((alert) => (
        <StatusBadge key={alert.message} level={alert.level}>
          {alert.message}
        </StatusBadge>
      ))}
    </div>
  );
}
