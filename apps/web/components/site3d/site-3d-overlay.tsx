"use client";

import { Button } from "@icewalk/ui/button";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import { renderDataUrl } from "@/lib/ice-map";
import { measuringTool, orderedStations, toolName, toolReachM, type Measurement, type Plan, type Station } from "@/lib/plan";
import { hudAt, stationMarks, walkPath, WALK_MPS, type Site3DData } from "@/lib/site3d";
import { useIceMap } from "@/lib/use-ice-map";
import "./site3d.css";

const Site3D = dynamic(() => import("./site-3d").then((m) => m.Site3D), { ssr: false });

/** Time-lapse for the walk: 20 s of real walking per second on screen. */
const TIMELAPSE = 20;
/** The walk stops this close to a station so the crew can measure. */
const ARRIVE_M = 4;
const HAS_API = Boolean(process.env.NEXT_PUBLIC_PLANNER_API_URL?.trim());

export type LogMeasurement = (station: Station, result: Measurement["result"], depth: number, crew: "EV1" | "EV2") => void;

type Props = {
  plan: Plan;
  measurements: readonly Measurement[];
  initial?: "site" | "walk";
  /** When given, the HUD can log a radar sounding at each station and the planner replans live. */
  onLog?: LogMeasurement;
  pending?: boolean;
  onClose: () => void;
};

/** Full-screen 3D: fly over the real site, then walk the route at eye height with the helmet HUD. */
export function Site3DOverlay({ plan, measurements, initial = "site", onLog, pending = false, onClose }: Props) {
  const [data, setData] = useState<Site3DData>();
  const [error, setError] = useState("");
  const [view, setView] = useState<"site" | "walk">(initial);
  const [exaggeration, setExaggeration] = useState(initial === "walk" ? 1 : 3);
  const [iceOn, setIceOn] = useState(true);
  // Walk progress belongs to a plan: a replan starts a new route from where the crew is.
  const [walk, setWalk] = useState({ planId: plan.plan_id, progress: 0, playing: initial === "walk" });
  const current = walk.planId === plan.plan_id ? walk : { planId: plan.plan_id, progress: 0, playing: false };
  const { progress, playing } = current;
  const path = useMemo(() => walkPath(plan), [plan]);
  const total = path.length ? path[path.length - 1].s : 0;
  const iceMap = useIceMap(plan.plan_id, HAS_API ? "api" : "mock");
  const ice = useMemo(() => {
    if (!iceOn || !iceMap.map) return null;
    const url = renderDataUrl(iceMap.map, "probability");
    return url ? { url, bounds: iceMap.map.bounds_xy_m } : null;
  }, [iceOn, iceMap.map]);

  useEffect(() => {
    let alive = true;
    fetch("/site/s1094b-3d.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Site3DData) => { if (alive) setData(d); })
      .catch(() => { if (alive) setError("Could not load the 3D site data."); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Stop at the next unmeasured station on the way.
  const stops = useMemo(() => {
    const measured = new Set(measurements.map((m) => m.station_id));
    return stationMarks(path, orderedStations(plan)).filter((m) => !measured.has(m.station.id)).map((m) => m.s);
  }, [path, plan, measurements]);

  useEffect(() => {
    if (!playing || view !== "walk") return;
    let last = performance.now();
    let id = 0;
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setWalk((w) => {
        if (w.planId !== plan.plan_id || !w.playing) return w;
        const next = w.progress + dt * WALK_MPS * TIMELAPSE;
        const stop = stops.find((s) => s - ARRIVE_M > w.progress && s - ARRIVE_M <= next);
        if (stop !== undefined) return { ...w, progress: stop - ARRIVE_M + 0.5, playing: false };
        if (next >= total) return { ...w, progress: total, playing: false };
        return { ...w, progress: next };
      });
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [playing, view, total, stops, plan.plan_id]);

  const onError = useCallback((message: string) => setError(message), []);
  const hud = hudAt(plan, measurements, path, progress);
  const atStation = hud.next && hud.next.distanceM <= ARRIVE_M + 2 ? plan.stations.find((s) => s.id === hud.next!.id) : undefined;
  const setPlaying = (p: boolean) => setWalk({ ...current, playing: p });
  const sound = (station: Station, result: Measurement["result"]) => {
    const reach = toolReachM(measuringTool(station));
    onLog?.(station, result, Math.min(1, reach ?? 1), "EV1");
  };

  return (
    <div className="site3d-overlay" role="dialog" aria-modal="true" aria-label="3D site view">
      {data && !error ? (
        <Site3D data={data} level={view === "walk" ? "detail" : "overview"} plan={plan} path={path} mode={view === "walk" ? "walk" : "orbit"} progressM={progress} exaggeration={exaggeration} ice={ice} onError={onError} />
      ) : (
        <div className="site3d-status">{error || "Loading the HiRISE terrain…"}</div>
      )}

      <div className="site3d-toolbar">
        <SegmentedControl label="3D view" value={view} options={[{ value: "site", label: "Site · fly over" }, { value: "walk", label: "Walk · helmet view" }]} onValueChange={(v) => { setView(v as "site" | "walk"); setExaggeration(v === "walk" ? 1 : 3); }} />
        <SegmentedControl label="Ice map" value={iceOn ? "on" : "off"} options={[{ value: "on", label: "P(ice)" }, { value: "off", label: "Imagery only" }]} onValueChange={(v) => setIceOn(v === "on")} />
        <SegmentedControl label="Vertical scale" value={String(exaggeration)} options={[{ value: "1", label: "True relief" }, { value: "3", label: "Relief ×3" }]} onValueChange={(v) => setExaggeration(Number(v))} />
        <Button variant="plain" autoFocus onClick={onClose}>Close</Button>
      </div>

      {view === "walk" ? (
        <section className="site3d-hud" aria-label="Helmet HUD" aria-live="polite">
          <div className="site3d-hud-row">
            <span className="site3d-hud-key">Next</span>
            <span className="site3d-hud-value">{hud.next ? `${String(hud.next.order).padStart(2, "0")} ${hud.next.id}` : "Habitat"}</span>
          </div>
          {hud.next ? (
            <>
              <div className="site3d-hud-row"><span className="site3d-hud-key">Range</span><span className="site3d-hud-value">{formatNumber(hud.next.distanceM, 0)} m {hud.next.heading}</span></div>
              <div className="site3d-hud-row"><span className="site3d-hud-key">Tool</span><span className="site3d-hud-value">{hud.next.tool}</span></div>
              <div className="site3d-hud-row"><span className="site3d-hud-key">P(ice)</span><span className="site3d-hud-value">{Math.round(hud.next.pIce * 100)}%</span></div>
              {hud.next.walkbackMarginMin !== undefined ? <div className="site3d-hud-row"><span className="site3d-hud-key">Walkback</span><span className="site3d-hud-value">{formatNumber(hud.next.walkbackMarginMin, 0)} min margin</span></div> : null}
              <div className="site3d-hud-row"><span className="site3d-hud-key">Comms</span><span className="site3d-hud-value" data-alert={hud.next.commLos === false ? "caution" : undefined}>{hud.next.commLos === false ? "No line of sight · relay EV2" : "Habitat in view"}</span></div>
            </>
          ) : <div className="site3d-hud-row"><span className="site3d-hud-key">Status</span><span className="site3d-hud-value">Return to habitat</span></div>}
          <div className="site3d-hud-row"><span className="site3d-hud-key">EVA</span><span className="site3d-hud-value">{formatNumber(hud.elapsedMin, 0)} min walked · {formatNumber(hud.remainingKm, 2)} km to go</span></div>
          {atStation && onLog ? (
            <div className="site3d-hud-measure">
              <span className="site3d-hud-key">At {atStation.id} · {toolName(measuringTool(atStation))}</span>
              <div className="site3d-hud-actions">
                <Button size="small" disabled={pending} onClick={() => sound(atStation, "ice")}>Ice found</Button>
                <Button size="small" disabled={pending} onClick={() => sound(atStation, "no_ice")}>No ice</Button>
              </div>
              {pending ? <span className="site3d-hud-value">Replanning…</span> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {view === "walk" ? (
        <div className="site3d-walkbar">
          <Button size="small" onClick={() => { if (progress >= total) setWalk({ ...current, progress: 0, playing: true }); else setPlaying(!playing); }}>{playing ? "Pause" : progress >= total ? "Replay" : "Walk"}</Button>
          <input className="site3d-scrub" type="range" min={0} max={Math.max(total, 1)} step={1} value={progress} aria-label="Position along the route" onChange={(e) => setWalk({ ...current, progress: Number(e.target.value), playing: false })} />
          <span className="site3d-note">Time-lapse ×{TIMELAPSE}</span>
        </div>
      ) : null}

      <p className="site3d-credit">
        {ice ? "P(ice within reach): darker blue = likelier (IceWalk model, updates with each measurement) · " : ""}
        {view === "walk" ? "True terrain from the HiRISE DTM (2 m) and 25 cm ortho" : "HiRISE DTM (6 m) and 1.5 m ortho, relief exaggerated when ×3"} · boulders detected from their shadows · red-band image, tinted · NASA/JPL-Caltech/UArizona, USGS
      </p>
    </div>
  );
}
