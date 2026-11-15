"use client";

import { Button } from "@icewalk/ui/button";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { habitatOf } from "@/components/site/site-data";
import { formatNumber } from "@/lib/format";
import { probabilityAt } from "@/lib/ice-map";
import { ICE_RADIUS_M, renderIceView } from "@/lib/ice-view";
import { bearing, decisionPointFor, measuringTool, nextStation, toolName, toolReachM, type Measurement, type Plan, type ReplanAssessment, type Station } from "@/lib/plan";
import { walkPath, type Site3DData } from "@/lib/site3d";
import { useIceMap } from "@/lib/use-ice-map";
import type { PlanSource } from "@/lib/use-plan-session";
import { EvaMinimap } from "./eva-minimap";
import type { FreePose } from "./site-3d";
import "./site3d.css";

const Site3D = dynamic(() => import("./site-3d").then((m) => m.Site3D), { ssr: false });
/** Inside the middle waypoint ring (site-3d.tsx RINGS_M) the helmet asks for the result. */
const AT_STATION_M = 5;

export type Site3DJump = FreePose & { key: number };
type Log = (station: Station, result: Measurement["result"], depth: number, crew: "EV1" | "EV2") => void;

type Props = {
  plan: Plan;
  measurements: readonly Measurement[];
  source: PlanSource;
  /** "brief": fly over or stand at a station before the EVA. "helmet": the EV walking during the EVA. */
  mode: "brief" | "helmet";
  jump?: Site3DJump;
  pose: FreePose;
  onPose: (pose: FreePose) => void;
  previousPlan?: Plan;
  reviewing?: boolean;
  returning?: boolean;
  pending?: boolean;
  elapsedMin?: number;
  onLog?: Log;
  onAccept?: () => void;
  onReturn?: () => void;
  /** Helmet only: leave the full-screen helmet for the IV console. */
  onLeave?: () => void;
  /** Helmet only: the EV is back at the habitat with nothing left to do. */
  onComplete?: () => void;
};

const fmtClock = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;

/**
 * The real S1094b terrain (HiRISE DTM and ortho) inline in the mission layout. In the brief it is
 * the map book; during the EVA it is the EV's helmet view with waypoint rings, arrival and the
 * plan update when a measurement replans the traverse.
 */
export function Site3DStage({ plan, measurements, source, mode, jump, pose, onPose, previousPlan, reviewing = false, returning = false, pending = false, elapsedMin = 0, onLog, onAccept, onReturn, onLeave, onComplete }: Props) {
  const [data, setData] = useState<Site3DData>();
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<"fly" | "stand">("fly");
  const [iceChoice, setIce] = useState<boolean | null>(null);
  const helmet = mode === "helmet";
  const iceOn = iceChoice ?? !helmet;
  const view = helmet ? "stand" : jump && jump.key > 0 && chosen === "fly" ? "stand" : chosen;
  const path = useMemo(() => walkPath(plan), [plan]);
  const iceMap = useIceMap(plan.plan_id, source);
  const ice = useMemo(() => (iceOn && iceMap.map ? renderIceView(iceMap.map, "likely", habitatOf(plan), ICE_RADIUS_M) ?? null : null), [iceOn, iceMap.map, plan]);
  const measuredIds = useMemo(() => measurements.map((m) => m.station_id), [measurements]);
  const next = returning ? undefined : nextStation(plan, [...measurements]);

  useEffect(() => {
    let alive = true;
    fetch("/site/s1094b-3d.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Site3DData) => { if (alive) setData(d); })
      .catch(() => { if (alive) setError("Could not load the 3D site data."); });
    return () => { alive = false; };
  }, []);
  const onError = useCallback((message: string) => setError(message), []);

  const target = next?.position ?? habitatOf(plan);
  const dir = bearing([pose.x, pose.y], target);
  const turn = ((dir.deg - pose.headingDeg + 540) % 360) - 180;
  const arrived = helmet && next && dir.distanceM <= AT_STATION_M && !reviewing;
  // Terminated, or every station done: the light column moves to the habitat; arriving ends the EVA.
  const home = helmet && !next && !reviewing;
  const atHome = home && dir.distanceM <= 12;
  const decide = next ? decisionPointFor(plan, next.id) : undefined;
  const margin = next ? plan.timeline.find((t) => t.kind === "station" && t.station_id === next.id)?.walkback_margin_min : plan.summary.min_walkback_margin_min;

  return (
    <div className="site3d-stage" aria-label="3D site view" data-mode={mode}>
      {data && !error ? (
        <Site3D data={data} level={view === "stand" ? "detail" : "overview"} plan={plan} previousPlan={reviewing ? previousPlan : undefined} path={path}
          mode={view === "stand" ? "free" : "orbit"} allowMove={helmet} exaggeration={view === "stand" ? 1 : 3}
          measured={measuredIds} activeId={next?.id} homeActive={home} ice={ice} onError={onError} initialPose={pose} teleport={jump} onMove={onPose} />
      ) : (
        <div className="site3d-status">{error || "Loading the HiRISE terrain..."}</div>
      )}
      <div className="site3d-toolbar">
        {!helmet ? <SegmentedControl label="3D view" value={view} options={[{ value: "fly", label: "Fly over · relief ×3" }, { value: "stand", label: "Stand at station" }]} onValueChange={(v) => setChosen(v as "fly" | "stand")} /> : null}
        <SegmentedControl label="Ice map" value={iceOn ? "on" : "off"} options={[{ value: "on", label: "Ice map" }, { value: "off", label: "Terrain only" }]} onValueChange={(v) => setIce(v === "on")} />
      </div>

      {helmet ? (
        <section className="site3d-hud" aria-label="Helmet HUD" aria-live="polite">
          <div className="site3d-hud-row"><span className="site3d-hud-key">PET</span><span className="site3d-hud-value">{fmtClock(elapsedMin)} · SIM</span></div>
          {returning ? <div className="site3d-hud-row"><span className="site3d-hud-key">EVA</span><span className="site3d-hud-value" data-alert="caution">TERMINATE · walk back</span></div> : null}
          <div className="site3d-hud-row"><span className="site3d-hud-key">{next ? "Next" : "Habitat"}</span><span className="site3d-hud-value">{next ? `${String(next.order).padStart(2, "0")} ${next.id}` : "Walk back"}</span></div>
          <div className="site3d-hud-row"><span className="site3d-hud-key">Range</span><span className="site3d-hud-value">{formatNumber(dir.distanceM, 0)} m · {dir.label}</span></div>
          <div className="site3d-hud-row"><span className="site3d-hud-key">Steer</span><span className="site3d-hud-value">{Math.abs(turn) < 10 ? "Ahead" : `${turn < 0 ? "Left" : "Right"} ${Math.round(Math.abs(turn))}°`}</span></div>
          {next ? <div className="site3d-hud-row"><span className="site3d-hud-key">Tool</span><span className="site3d-hud-value">{toolName(measuringTool(next))}</span></div> : null}
          {margin != null ? <div className="site3d-hud-row"><span className="site3d-hud-key">Walkback</span><span className="site3d-hud-value" data-alert={margin < (plan.summary.walkback_caution_min ?? 15) ? "caution" : undefined}>{formatNumber(margin, 0)} min margin</span></div> : null}
          {decide ? <div className="site3d-hud-row"><span className="site3d-hud-key">Bingo</span><span className="site3d-hud-value">{fmtClock(decide.decide_by_min)}</span></div> : null}
          {next ? <div className="site3d-hud-row"><span className="site3d-hud-key">Comms</span><span className="site3d-hud-value" data-alert={next.comm_los === false ? "caution" : undefined}>{next.comm_los === false ? "No line of sight · relay EV2" : "Habitat in view"}</span></div> : null}
          {pending ? <div className="site3d-hud-row"><span className="site3d-hud-key">Planner</span><span className="site3d-hud-value">Replanning...</span></div> : null}
        </section>
      ) : null}

      {helmet ? (
        <header className="eva-topbar">
          <span>EV1 · helmet view · <b>SIM</b></span>
          {onLeave ? <Button size="small" variant="glass" onClick={onLeave}>IV console</Button> : null}
        </header>
      ) : null}
      {arrived && next && onLog ? <ArrivalPrompt station={next} pending={pending} onLog={onLog} /> : null}
      {atHome ? (
        <section className="site3d-update eva-arrival" role="alertdialog" aria-label="Back at the habitat">
          <span className="site3d-hud-key">Habitat · ingress</span>
          <strong className="site3d-update-call">EVA complete</strong>
          <span className="site3d-update-line">{measurements.length} station{measurements.length === 1 ? "" : "s"} measured{returning ? " · terminated early" : ""}.</span>
          {onComplete ? <div className="site3d-hud-actions"><Button size="small" variant="prominent" onClick={onComplete}>Go to debrief</Button></div> : null}
        </section>
      ) : null}
      {helmet ? <EvaMinimap plan={plan} path={path} measurements={measurements} pose={pose} nextId={next?.id} elapsedMin={elapsedMin} marginMin={margin ?? undefined} /> : null}
      {helmet && reviewing && previousPlan && measurements.length ? (
        <PlanUpdate before={previousPlan} after={plan} measurement={measurements[measurements.length - 1]} onAccept={onAccept} onReturn={onReturn}
          mapAfter={iceMap.map ? probabilityAt(iceMap.map, measurements[measurements.length - 1].position[0], measurements[measurements.length - 1].position[1]) : undefined} />
      ) : null}

      <p className="site3d-credit">
        {ice ? "Dots: P(ice within reach), filled where craters or measurements back it · " : ""}
        {helmet ? "Rings and light columns: AR waypoint cues (concept), not terrain · " : ""}
        {view === "stand" ? "HiRISE DTM (2 m) and 25 cm ortho, true relief" : "HiRISE DTM (6 m) and 1.5 m ortho, relief ×3"} · HiRISE RED band, grayscale as acquired · boulders sized from their shadows, shapes illustrative · sky color illustrative · NASA/JPL-Caltech/UArizona, USGS
      </p>
    </div>
  );
}

/** On arrival the helmet asks for the result: the station, the tool and its reach, three answers. */
function ArrivalPrompt({ station, pending, onLog }: { station: Station; pending: boolean; onLog: Log }) {
  const tool = measuringTool(station);
  const depth = Math.min(1, toolReachM(tool) ?? 1);
  return (
    <section className="site3d-update eva-arrival" role="alertdialog" aria-label={`At station ${station.id}`}>
      <span className="site3d-hud-key">At station {String(station.order).padStart(2, "0")} · {station.id}</span>
      <strong className="site3d-update-call">What did you find?</strong>
      <span className="site3d-update-line">{toolName(tool)} to {depth} m · P(ice) {Math.round(station.p_ice * 100)}% before measuring</span>
      <div className="site3d-hud-actions">
        <Button size="small" disabled={pending} onClick={() => onLog(station, "ice", depth, "EV1")}>Ice</Button>
        <Button size="small" disabled={pending} onClick={() => onLog(station, "no_ice", depth, "EV1")}>No ice</Button>
        <Button size="small" disabled={pending} onClick={() => onLog(station, "inconclusive", depth, "EV1")}>Inconclusive</Button>
      </div>
      {pending ? <span className="site3d-update-line">Sending to the planner...</span> : null}
    </section>
  );
}

const CALL: Record<ReplanAssessment["recommendation"], string> = { continue: "Continue", return_to_habitat: "EVA TERMINATE · walk back" };

/** The replan as the EV sees it: the planner's call, the next station before and after, the margin. */
function PlanUpdate({ before, after, measurement, onAccept, onReturn, mapAfter }: { before: Plan; after: Plan; measurement: Measurement; onAccept?: () => void; onReturn?: () => void; mapAfter?: number }) {
  const r = after.replan;
  const done = [measurement];
  const oldNext = nextStation(before, done);
  const newNext = nextStation(after, done);
  const back = r?.recommendation === "return_to_habitat";
  const result = measurement.result === "no_ice" ? "No ice" : measurement.result === "ice" ? "Ice" : "Inconclusive";
  const change = oldNext && newNext && oldNext.id !== newNext.id ? ` (was ${oldNext.id})` : oldNext?.id === newNext?.id ? " (unchanged)" : "";
  const mapBefore = before.stations.find((s) => s.id === measurement.station_id)?.p_ice;
  const unchanged = !!r && r.stations_added.length === 0 && r.stations_dropped.length === 0;
  const small = mapBefore != null && mapAfter != null && Math.abs(mapAfter - mapBefore) < 0.05;
  return (
    <section className="site3d-update" role="alertdialog" aria-label="Plan update" data-alert={back ? "caution" : undefined}>
      <span className="site3d-hud-key">Plan update · {result} at {measurement.station_id}</span>
      <strong className="site3d-update-call">{r ? CALL[r.recommendation] : "Review the new plan"}</strong>
      {r?.iv_decision ? <span className="site3d-update-line">Large replan: IV decision</span> : null}
      <span className="site3d-update-line">Next: {newNext ? newNext.id : "habitat"}{change}</span>
      {mapBefore != null && mapAfter != null ? <span className="site3d-update-line">Ice map at {measurement.station_id}: {Math.round(mapBefore * 100)}% → {Math.round(mapAfter * 100)}%</span> : null}
      {unchanged ? <span className="site3d-update-line">Route unchanged: {small ? `a ${toolName(measurement.tool)} result to ${measurement.depth_m ?? "?"} m barely moves P(ice within ${after.summary.ice_threshold_m ?? 3} m)` : "the plan still holds"}.</span> : null}
      {r?.margin_before_min != null && r.margin_after_min != null ? <span className="site3d-update-line">Walkback margin {formatNumber(r.margin_before_min, 0)} → {formatNumber(r.margin_after_min, 0)} min</span> : null}
      {r ? <span className="site3d-update-line">+{r.stations_added.length} / −{r.stations_dropped.length} stations · faded line: old route</span> : null}
      <div className="site3d-hud-actions">
        {back ? <><Button size="small" variant="prominent" onClick={onReturn}>Copy, terminate</Button><Button size="small" onClick={onAccept}>Continue (crew call)</Button></>
          : <><Button size="small" variant="prominent" onClick={onAccept}>Copy, continue</Button><Button size="small" onClick={onReturn}>Terminate</Button></>}
      </div>
    </section>
  );
}
