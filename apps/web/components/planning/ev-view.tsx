"use client";
import { Button } from "@icewalk/ui/button";
import { TextField } from "@icewalk/ui/fields";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Checkbox } from "@icewalk/ui/selection-controls";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { useState } from "react";
import { bearing, measurementSummary, measuringTool, nextStation, toolName, toolReachM, type Measurement, type Plan, type Station } from "@/lib/plan";
import { HABITAT_XY } from "@/components/site/site-data";
import { RESULT_LABEL, RowLabel, Value } from "./parts";

export function MeasurementForm({ station, pending, onLog, compact = false }: {
  station: Station; pending: boolean; compact?: boolean;
  onLog: (station: Station, result: Measurement["result"], depth: number, crew: "EV1" | "EV2") => void;
}) {
  const tool = measuringTool(station);
  const reach = toolReachM(tool);
  const [crew, setCrew] = useState<"EV1" | "EV2">("EV1");
  const [checked, setChecked] = useState<string[]>([]);
  const [depth, setDepth] = useState(String(Math.min(1, reach ?? 1)));
  const [result, setResult] = useState<Measurement["result"]>("no_ice");
  const [error, setError] = useState("");
  function submit(value: Measurement["result"]) {
    if (pending) return;
    const n = Number(depth);
    if (!depth.trim() || !Number.isFinite(n) || n < 0 || (reach !== undefined && n > reach)) {
      setError(`Enter a depth from 0 to ${reach ?? "the instrument reach"} m for ${toolName(tool)}.`);
      return;
    }
    setError(""); onLog(station, value, n, crew);
  }
  return <section aria-label="Station procedure" className="mission-stack">
    <Title3 as="h3">{compact ? "Record a measurement" : "Station procedure"}</Title3>
    <Footnote tone="secondary">{toolName(tool)}{reach !== undefined ? ` · reach ${reach} m` : ""}</Footnote>
    {!compact ? <><SegmentedControl label="Crew member" value={crew} options={[{ value: "EV1", label: "EV1 · Operations" }, { value: "EV2", label: "EV2 · Science" }]} onValueChange={(v) => { setCrew(v as "EV1" | "EV2"); setChecked([]); }} />
    <div className="mission-checklist">{(station.tasks[crew] ?? []).map((task) => <Checkbox key={task} label={task} checked={checked.includes(task)} onCheckedChange={(value) => setChecked((old) => value ? [...old, task] : old.filter((t) => t !== task))} />)}</div></> : null}
    <TextField showLabel label="Measurement depth (m)" type="number" value={depth} onValueChange={setDepth} min={0} max={reach} step={0.1} disabled={pending} aria-invalid={!!error} aria-describedby={error ? "depth-error" : undefined} />
    {error ? <Body id="depth-error" role="alert">{error}</Body> : null}
    {compact ? <><SegmentedControl label="Measurement result" value={result} options={(["ice", "no_ice", "inconclusive"] as const).map((value) => ({ value, label: RESULT_LABEL[value] }))} onValueChange={(value) => setResult(value as Measurement["result"])} /><Button disabled={pending || !tool} onClick={() => submit(result)}>{pending ? "Saving measurement…" : "Log measurement"}</Button></>
      : <div className="mission-result-buttons">{(["ice", "no_ice", "inconclusive"] as const).map((value) => <Button key={value} disabled={pending || !tool} onClick={() => submit(value)}>{RESULT_LABEL[value]}</Button>)}</div>}
    <Footnote tone="secondary">Execution is simulated. Results update this session.</Footnote>
  </section>;
}

export function EVView({ plan, measurements, pending, onLog, onReview }: {
  plan: Plan; measurements: Measurement[]; pending: boolean;
  onLog: (station: Station, result: Measurement["result"], depth: number, crew: "EV1" | "EV2") => void; onReview: () => void;
}) {
  const station = nextStation(plan, measurements);
  const last = measurements.at(-1);
  const origin = last?.position ?? HABITAT_XY;
  const direction = station ? bearing(origin, station.position) : undefined;
  return <div className="mission-stack">
    <Footnote tone="secondary">Simulated position · heading-up oblique of the flat HiRISE ortho.</Footnote>
    {station ? <ListSection header={last ? "Next station" : "Current station"} headerId="ev-station">
      <ListRow trailing={<Value>{String(station.order).padStart(2, "0")}</Value>}><RowLabel title={station.id} detail={station.tools.map(toolName).join(" · ")} /></ListRow>
      <ListRow trailing={<Value>{Math.round(direction!.distanceM)} m</Value>}><RowLabel title={direction!.distanceM ? direction!.label : "At habitat"} detail="Straight-line grid distance · simulated position" /></ListRow>
    </ListSection> : <Body>All planned stations measured. Return to habitat.</Body>}
    {last ? <section className="mission-last-result" aria-label="Last measurement"><Footnote>Measured {last.station_id} · {measurementSummary(last)}</Footnote><Button size="small" variant="plain" onClick={onReview}>Review in Science</Button></section> : null}
    {station ? <MeasurementForm key={station.id} station={station} pending={pending} onLog={onLog} /> : null}
  </div>;
}
