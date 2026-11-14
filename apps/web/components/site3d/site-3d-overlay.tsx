"use client";

import { Button } from "@icewalk/ui/button";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/format";
import type { Measurement, Plan } from "@/lib/plan";
import { hudAt, walkPath, WALK_MPS, type Site3DData, type Site3DLevelName } from "@/lib/site3d";
import "./site3d.css";

const Site3D = dynamic(() => import("./site-3d").then((m) => m.Site3D), { ssr: false });

/** Time-lapse for the walk: 20 s of real walking per second on screen. */
const TIMELAPSE = 20;

type Props = { plan: Plan; measurements: readonly Measurement[]; initial?: "site" | "walk"; onClose: () => void };

/** Full-screen 3D: fly over the real site, then walk the route at eye height with the helmet HUD. */
export function Site3DOverlay({ plan, measurements, initial = "site", onClose }: Props) {
  const [data, setData] = useState<Site3DData>();
  const [error, setError] = useState("");
  const [view, setView] = useState<"site" | "walk">(initial);
  const [exaggeration, setExaggeration] = useState(initial === "walk" ? 1 : 3);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(initial === "walk");
  const path = useMemo(() => walkPath(plan), [plan]);
  const total = path.length ? path[path.length - 1].s : 0;

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

  useEffect(() => {
    if (!playing || view !== "walk") return;
    let last = performance.now();
    let id = 0;
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        const next = p + dt * WALK_MPS * TIMELAPSE;
        if (next >= total) { setPlaying(false); return total; }
        return next;
      });
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [playing, view, total]);

  const onError = useCallback((message: string) => setError(message), []);
  const level: Site3DLevelName = view === "walk" ? "detail" : "overview";
  const hud = hudAt(plan, measurements, path, progress);

  return (
    <div className="site3d-overlay" role="dialog" aria-modal="true" aria-label="3D site view">
      {data && !error ? (
        <Site3D data={data} level={level} plan={plan} path={path} mode={view === "walk" ? "walk" : "orbit"} progressM={progress} exaggeration={exaggeration} onError={onError} />
      ) : (
        <div className="site3d-status">{error || "Loading the HiRISE terrain…"}</div>
      )}

      <div className="site3d-toolbar">
        <SegmentedControl label="3D view" value={view} options={[{ value: "site", label: "Site · fly over" }, { value: "walk", label: "Walk · helmet view" }]} onValueChange={(v) => { setView(v as "site" | "walk"); setExaggeration(v === "walk" ? 1 : 3); }} />
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
        </section>
      ) : null}

      {view === "walk" ? (
        <div className="site3d-walkbar">
          <Button size="small" onClick={() => { if (progress >= total) setProgress(0); setPlaying((p) => !p); }}>{playing ? "Pause" : progress >= total ? "Replay" : "Walk"}</Button>
          <input className="site3d-scrub" type="range" min={0} max={Math.max(total, 1)} step={1} value={progress} aria-label="Position along the route" onChange={(e) => { setPlaying(false); setProgress(Number(e.target.value)); }} />
          <span className="site3d-note">Time-lapse ×{TIMELAPSE}</span>
        </div>
      ) : null}

      <p className="site3d-credit">
        {view === "walk" ? "True terrain from the HiRISE DTM (2 m) and 25 cm ortho" : "HiRISE DTM (6 m) and 1.5 m ortho, relief exaggerated when ×3"} · boulders detected from their shadows · red-band image, tinted · NASA/JPL-Caltech/UArizona, USGS
      </p>
    </div>
  );
}
