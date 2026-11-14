import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { formatDuration, formatNumber } from "@/lib/format";
import { diffPlans, measurementSummary, type Measurement, type Plan, toolName } from "@/lib/plan";
import { RowLabel, Value, signed } from "./parts";
import { Disclosure } from "./disclosure";

export function ReplanSummary({ before, after, measurement, onRevert }: {
  before: Plan; after: Plan; measurement: Measurement; onRevert: () => void;
}) {
  const { added, removed, delta } = diffPlans(before, after);
  const dropped = removed.filter((s) => s.id !== measurement.station_id);
  const margin = before.summary.min_walkback_margin_min !== undefined && after.summary.min_walkback_margin_min !== undefined
    ? ` · walkback ${formatNumber(before.summary.min_walkback_margin_min, 1)} → ${formatNumber(after.summary.min_walkback_margin_min, 1)} min` : "";
  return <section aria-label="Replan" className="mission-stack mission-replan">
    <Title3 as="h3">Replan ready for review</Title3>
    <Body>{measurementSummary(measurement)} at {measurement.station_id} → {dropped.length} stations dropped, {added.length} added{margin}.</Body>
    <Footnote tone="secondary">{before.plan_id} → {after.plan_id}</Footnote>
    <Disclosure title="Change details"><ListSection footer="Review the planner's changes before continuing.">
      <ListRow><RowLabel title={`Measured · ${measurement.station_id}`} detail={`${measurementSummary(measurement)} · ${toolName(measurement.tool)}`} /></ListRow>
      {dropped.length ? <ListRow><RowLabel title="Stations dropped" detail={dropped.map((s) => s.id).join(", ")} /></ListRow> : null}
      {added.length ? <ListRow><RowLabel title="Stations added" detail={added.map((s) => s.id).join(", ")} /></ListRow> : null}
      {delta.duration_min !== undefined ? <ListRow trailing={<Value>{signed(delta.duration_min, formatDuration(Math.abs(delta.duration_min)))}</Value>}>Duration</ListRow> : null}
      {delta.distance_km !== undefined ? <ListRow trailing={<Value>{signed(delta.distance_km, `${formatNumber(Math.abs(delta.distance_km), 2)} km`)}</Value>}>Traverse</ListRow> : null}
    </ListSection></Disclosure>
    <Button size="small" variant="plain" onClick={onRevert}>Back to nominal plan</Button>
  </section>;
}
