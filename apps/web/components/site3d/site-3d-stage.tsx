"use client";

import { SegmentedControl } from "@icewalk/ui/segmented-control";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HABITAT_XY } from "@/components/site/site-data";
import { formatNumber } from "@/lib/format";
import { ICE_RADIUS_M, renderIceView } from "@/lib/ice-view";
import type { Measurement, Plan } from "@/lib/plan";
import { hudFrom, walkPath, type Site3DData } from "@/lib/site3d";
import { useIceMap } from "@/lib/use-ice-map";
import type { PlanSource } from "@/lib/use-plan-session";
import type { FreePose } from "./site-3d";
import "./site3d.css";

const Site3D = dynamic(() => import("./site-3d").then((m) => m.Site3D), { ssr: false });

export type Site3DJump = FreePose & { key: number };

/**
 * The rehearsal view: the real S1094b terrain (HiRISE DTM and ortho) inline in the mission
 * layout. "Fly over" orbits the whole site; "Walk" stands at eye height and moves freely.
 */
export function Site3DStage({ plan, measurements, source, jump }: { plan: Plan; measurements: readonly Measurement[]; source: PlanSource; jump?: Site3DJump }) {
  const [data, setData] = useState<Site3DData>();
  const [error, setError] = useState("");
  const [chosen, setView] = useState<"fly" | "walk">("fly");
  const [iceOn, setIceOn] = useState(true);
  const [pose, setPose] = useState<FreePose>({ x: HABITAT_XY[0], y: HABITAT_XY[1], headingDeg: 0 });
  const path = useMemo(() => walkPath(plan), [plan]);
  const iceMap = useIceMap(plan.plan_id, source);
  const ice = useMemo(() => (iceOn && iceMap.map ? renderIceView(iceMap.map, "likely", HABITAT_XY, ICE_RADIUS_M) ?? null : null), [iceOn, iceMap.map]);
  // A jump always lands in the walk view.
  const view = jump && chosen === "fly" && jump.key > 0 ? "walk" : chosen;

  useEffect(() => {
    let alive = true;
    fetch("/site/s1094b-3d.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Site3DData) => { if (alive) setData(d); })
      .catch(() => { if (alive) setError("Could not load the 3D site data."); });
    return () => { alive = false; };
  }, []);

  const onError = useCallback((message: string) => setError(message), []);
  const hud = hudFrom(plan, [...measurements], pose.x, pose.y);

  return (
    <div className="site3d-stage" aria-label="3D site view">
      {data && !error ? (
        <Site3D data={data} level={view === "walk" ? "detail" : "overview"} plan={plan} path={path} mode={view === "walk" ? "free" : "orbit"} progressM={0}
          exaggeration={view === "walk" ? 1 : 3} ice={ice} onError={onError} teleport={jump} onMove={setPose} />
      ) : (
        <div className="site3d-status">{error || "Loading the HiRISE terrain..."}</div>
      )}
      <div className="site3d-toolbar">
        <SegmentedControl label="3D view" value={view} options={[{ value: "fly", label: "Fly over · relief ×3" }, { value: "walk", label: "Walk · true relief" }]} onValueChange={(v) => setView(v as "fly" | "walk")} />
        <SegmentedControl label="Ice map" value={iceOn ? "on" : "off"} options={[{ value: "on", label: "Where ice is likely" }, { value: "off", label: "Imagery only" }]} onValueChange={(v) => setIceOn(v === "on")} />
      </div>
      {view === "walk" ? (
        <section className="site3d-hud" aria-label="Helmet HUD" aria-live="polite">
          <div className="site3d-hud-row"><span className="site3d-hud-key">Heading</span><span className="site3d-hud-value">{String(Math.round(pose.headingDeg) % 360).padStart(3, "0")}°</span></div>
          <div className="site3d-hud-row"><span className="site3d-hud-key">Next</span><span className="site3d-hud-value">{hud.next ? `${String(hud.next.order).padStart(2, "0")} ${hud.next.id}` : "Habitat"}</span></div>
          {hud.next ? (
            <>
              <div className="site3d-hud-row"><span className="site3d-hud-key">Range</span><span className="site3d-hud-value">{formatNumber(hud.next.distanceM, 0)} m {hud.next.heading}</span></div>
              <div className="site3d-hud-row"><span className="site3d-hud-key">Tool</span><span className="site3d-hud-value">{hud.next.tool}</span></div>
              <div className="site3d-hud-row"><span className="site3d-hud-key">P(ice)</span><span className="site3d-hud-value">{Math.round(hud.next.pIce * 100)}%</span></div>
              <div className="site3d-hud-row"><span className="site3d-hud-key">Comms</span><span className="site3d-hud-value" data-alert={hud.next.commLos === false ? "caution" : undefined}>{hud.next.commLos === false ? "No line of sight · relay EV2" : "Habitat in view"}</span></div>
            </>
          ) : <div className="site3d-hud-row"><span className="site3d-hud-key">Habitat</span><span className="site3d-hud-value">{formatNumber(hud.remainingKm, 2)} km</span></div>}
        </section>
      ) : null}
      <p className="site3d-credit">
        {ice ? "Dots: P(ice within reach), filled where craters or measurements back it · " : ""}
        {view === "walk" ? "HiRISE DTM (2 m) and 25 cm ortho, true relief" : "HiRISE DTM (6 m) and 1.5 m ortho, relief ×3"} · HiRISE RED band, grayscale as acquired · boulders sized from their shadows, shapes illustrative · sky color illustrative · NASA/JPL-Caltech/UArizona, USGS
      </p>
    </div>
  );
}
