"use client";

import { Button } from "@icewalk/ui/button";
import { TextField } from "@icewalk/ui/fields";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Checkbox } from "@icewalk/ui/selection-controls";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { Navigation } from "lucide-react";
import { useState } from "react";
import {
  orderedStations,
  toolName,
  type Measurement,
  type Plan,
  type Station,
} from "@/lib/plan";
import { designSession } from "@/mock/design-session";
import { Disclosure } from "./disclosure";
import { clock, RESULT_LABEL, RowLabel, Value } from "./parts";

export function EVScene({
  station,
  onSelect,
}: {
  station: Station;
  onSelect: () => void;
}) {
  return (
    <div className="ev-scene">
      <div className="ev-scene-image" />
      <div className="ev-destination">
        <Button variant="glass" onClick={onSelect}>
          <Navigation />
          {station.id}
        </Button>
        <Footnote tone="secondary">
          {designSession.distanceToStationM} m · simulated
        </Footnote>
      </div>
    </div>
  );
}

export function EVView({
  plan,
  measurement,
  onLog,
  onReview,
}: {
  plan: Plan;
  measurement: Measurement | null;
  onLog: (
    result: Measurement["result"],
    depth: number,
    crew: "EV1" | "EV2",
  ) => void;
  onReview: () => void;
}) {
  const [crew, setCrew] = useState<"EV1" | "EV2">("EV1");
  const [checked, setChecked] = useState<string[]>([]);
  const [depth, setDepth] = useState("1");
  const [error, setError] = useState("");
  const stations = orderedStations(plan);
  const station = stations[0];
  const tasks = station.tasks[crew] ?? [];
  function submit(result: Measurement["result"]) {
    const n = Number(depth);
    if (!depth.trim() || !Number.isFinite(n) || n < 0 || n > 1) {
      setError("Enter a depth from 0 to 1 m for the demo drill.");
      return;
    }
    setError("");
    onLog(result, n, crew);
  }
  return (
    <div className="mission-stack">
      <ListSection
        header={measurement ? "Next station" : "Current station"}
        headerId="ev-station"
      >
        <ListRow trailing={<Value>{formatStationOrder(station.order)}</Value>}>
          <RowLabel
            title={station.id}
            detail={station.tools.map(toolName).join(" · ")}
          />
        </ListRow>
        <ListRow trailing={<Value>{designSession.distanceToStationM} m</Value>}>
          040° NE
        </ListRow>
      </ListSection>
      <Disclosure title="Suit consumables">
        <ListSection footer="Simulated suit values.">
          <ListRow
            trailing={<Value>{clock(designSession.oxygenRemainingMin)}</Value>}
          >
            Oxygen remaining
          </ListRow>
          <ListRow trailing={<Value>{designSession.batteryPercent}%</Value>}>
            Battery
          </ListRow>
        </ListSection>
      </Disclosure>
      <section aria-labelledby="ev-procedure-title" className="mission-stack">
        <Title3 as="h3" id="ev-procedure-title">
          {measurement ? "Measurement recorded" : "Station procedure"}
        </Title3>
        {measurement ? (
          <>
            <Body>
              {RESULT_LABEL[measurement.result]} at {measurement.station_id} ·{" "}
              {measurement.depth_m} m
            </Body>
            <Footnote tone="secondary">
              {measurement.result === "no_ice"
                ? "Traverse replanned. Review the change with IV before continuing."
                : "Nominal traverse retained. Continue with the next station."}
            </Footnote>
            <Button onClick={onReview}>Review in Science</Button>
          </>
        ) : (
          <>
            <SegmentedControl
              label="Crew member"
              value={crew}
              options={[
                { value: "EV1", label: "EV1 · Operations" },
                { value: "EV2", label: "EV2 · Science" },
              ]}
              onValueChange={(value) => {
                setCrew(value as "EV1" | "EV2");
                setChecked([]);
              }}
            />
            <div className="mission-checklist">
              {tasks.map((task) => (
                <Checkbox
                  key={task}
                  label={task}
                  checked={checked.includes(task)}
                  onCheckedChange={(value) =>
                    setChecked((old) =>
                      value ? [...old, task] : old.filter((t) => t !== task),
                    )
                  }
                />
              ))}
            </div>
            <TextField
              showLabel
              label="Measurement depth (m)"
              value={depth}
              onValueChange={setDepth}
              type="number"
              min={0}
              max={1}
              step={0.1}
              aria-invalid={!!error}
              aria-describedby={error ? "depth-error" : undefined}
            />
            {error ? (
              <Body id="depth-error" role="alert">
                {error}
              </Body>
            ) : null}
            <div className="mission-result-buttons">
              {(["ice", "no_ice", "inconclusive"] as const).map((result) => (
                <Button key={result} onClick={() => submit(result)}>
                  {RESULT_LABEL[result]}
                </Button>
              ))}
            </div>
            <Footnote tone="secondary">
              Record a simulated result to preview replanning.
            </Footnote>
          </>
        )}
      </section>
    </div>
  );
}
function formatStationOrder(order: number) {
  return String(order).padStart(2, "0");
}
