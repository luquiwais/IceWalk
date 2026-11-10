import { ListRow, ListSection } from "@icewalk/ui/list";
import { Metric, MetricList } from "@icewalk/ui/metric";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { Body } from "@icewalk/ui/text";

import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import {
  decisionPointFor,
  type Plan,
  type Station,
  toolName,
} from "@/lib/plan";

import { PRIORITY_LABEL, RESULT_LABEL, RowLabel, Value, clock } from "./parts";

/**
 * Station card (PRD feature 6): priority, EV1/EV2 tasks, tools, time, hypothesis
 * and the model's numbers, then what to do after measuring (decision point).
 */
export function StationDetail({
  plan,
  station,
}: {
  plan: Plan;
  station: Station;
}) {
  const threshold = plan.summary.ice_threshold_m;
  const point = decisionPointFor(plan, station.id);
  const crew = (["EV1", "EV2"] as const).filter(
    (member) => station.tasks[member]?.length,
  );

  return (
    <>
      {station.planetary_protection === "sensitive" ? (
        <StatusBadge level="advisory">
          Planetary protection: sampling protocol applies
        </StatusBadge>
      ) : null}

      <MetricList aria-label="Station numbers">
        <Metric
          label={threshold ? `P(ice ≤ ${threshold} m)` : "P(ice)"}
          value={formatPercent(station.p_ice)}
        />
        <Metric
          label="Uncertainty"
          value={formatNumber(station.uncertainty, 2)}
          unit="bits"
        />
        <Metric
          label="Value of measuring"
          value={formatNumber(station.value, 2)}
        />
        <Metric
          label="Station time"
          value={formatDuration(station.duration_min)}
        />
        {station.depth_median_m !== undefined ? (
          <Metric
            label="Ice depth, median"
            value={formatNumber(station.depth_median_m, 1)}
            unit="m"
          />
        ) : null}
        {station.depth_shallow_m !== undefined ? (
          <Metric
            label="Ice depth, shallow"
            value={formatNumber(station.depth_shallow_m, 1)}
            unit="m"
          />
        ) : null}
      </MetricList>

      <ListSection header="Hypothesis" headerId="station-hypothesis">
        <ListRow>
          <RowLabel
            title={
              <Body as="span" className="whitespace-normal">
                {station.hypothesis}
              </Body>
            }
            detail={`${PRIORITY_LABEL[station.priority]} priority · STM objective ${station.objective_ranks.join(", ")}${
              station.kind
                ? ` · ${station.kind === "target" ? "STM target" : "Survey"}`
                : ""
            }`}
          />
        </ListRow>
      </ListSection>

      <div className="station-crew-grid">
        {crew.map((member) => (
          <ListSection
            key={member}
            header={`${member} tasks`}
            headerId={`station-${member}`}
          >
            {station.tasks[member]!.map((task) => (
              <ListRow key={task}>{task}</ListRow>
            ))}
          </ListSection>
        ))}
      </div>

      <ListSection header="Tools" headerId="station-tools">
        {station.tools.map((tool) => (
          <ListRow key={tool}>{toolName(tool)}</ListRow>
        ))}
      </ListSection>

      {point ? (
        <ListSection
          header="Decision point"
          headerId="station-decision"
          footer="Recommendation with its rationale: the crew decides."
        >
          <ListRow trailing={<Value>{clock(point.decide_by_min)}</Value>}>
            <RowLabel
              title="Decide by (bingo time)"
              detail="Latest time to leave with walkback margin ≥ 0"
            />
          </ListRow>
          {point.options.map((option) => (
            <ListRow
              key={option.rank}
              trailing={
                option.probability !== null &&
                option.probability !== undefined ? (
                  <Value>{formatPercent(option.probability)}</Value>
                ) : undefined
              }
            >
              <RowLabel
                title={`${option.rank}. If ${RESULT_LABEL[option.if_result].toLowerCase()} → ${option.next_station_ids.join(", ")}${
                  option.rank === point.default_option ? " (default)" : ""
                }`}
                detail={
                  <span className="whitespace-normal">{option.rationale}</span>
                }
              />
            </ListRow>
          ))}
          {point.hard_stop ? (
            <ListRow>
              <RowLabel
                title="Hard stop"
                detail={
                  <span className="whitespace-normal">{point.hard_stop}</span>
                }
              />
            </ListRow>
          ) : null}
        </ListSection>
      ) : null}
    </>
  );
}
