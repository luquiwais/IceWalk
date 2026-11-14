"use client";
import { Button } from "@icewalk/ui/button";
import { TextField } from "@icewalk/ui/fields";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Checkbox } from "@icewalk/ui/selection-controls";
import { Body, Footnote, Title3 } from "@icewalk/ui/text";
import { useState } from "react";
import { measuringTool, toolName, toolReachM, type Measurement, type Station } from "@/lib/plan";
import { RESULT_LABEL } from "./parts";

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
