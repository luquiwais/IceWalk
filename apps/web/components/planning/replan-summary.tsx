import { Button } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";

import { formatDuration, formatNumber } from "@/lib/format";
import { diffPlans, type Measurement, type Plan, toolName } from "@/lib/plan";

import { RESULT_LABEL, RowLabel, Value, signed } from "./parts";

/**
 * What the measurement changed (PRD feature 9): which plan this replaces, the
 * measurement that triggered it, stations in and out and the summary deltas.
 */
export function ReplanSummary({
  before,
  after,
  measurement,
  onRevert,
}: {
  before: Plan;
  after: Plan;
  measurement: Measurement;
  onRevert: () => void;
}) {
  const { added, removed, delta } = diffPlans(before, after);
  const depth = measurement.depth_m ? ` to ${formatNumber(measurement.depth_m, 1)} m` : "";

  return (
    <ListSection
      header="Replan"
      headerId="replan"
      footer={`Replanned from ${before.plan_id}. Compare with the nominal plan before approving.`}
    >
      <ListRow trailing={<Value>{measurement.crew_member ?? ""}</Value>}>
        <RowLabel
          title={`${RESULT_LABEL[measurement.result]}${depth} at ${measurement.station_id}`}
          detail={toolName(measurement.tool)}
        />
      </ListRow>
      {removed.length ? (
        <ListRow>
          <RowLabel title="Stations dropped" detail={removed.map((s) => s.id).join(", ")} />
        </ListRow>
      ) : null}
      {added.length ? (
        <ListRow>
          <RowLabel title="Stations added" detail={added.map((s) => s.id).join(", ")} />
        </ListRow>
      ) : null}
      {delta.duration_min !== undefined ? (
        <ListRow trailing={<Value>{signed(delta.duration_min, formatDuration(Math.abs(delta.duration_min)))}</Value>}>
          Duration
        </ListRow>
      ) : null}
      {delta.distance_km !== undefined ? (
        <ListRow trailing={<Value>{signed(delta.distance_km, `${formatNumber(Math.abs(delta.distance_km), 2)} km`)}</Value>}>
          Traverse
        </ListRow>
      ) : null}
      {delta.min_walkback_margin_min !== undefined ? (
        <ListRow
          trailing={
            <Value>{signed(delta.min_walkback_margin_min, `${formatNumber(Math.abs(delta.min_walkback_margin_min), 1)} min`)}</Value>
          }
        >
          Min walkback margin
        </ListRow>
      ) : null}
      <li className="flex justify-end px-5 py-3">
        <Button size="small" onClick={onRevert}>
          Back to nominal plan
        </Button>
      </li>
    </ListSection>
  );
}
