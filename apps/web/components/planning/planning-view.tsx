"use client";
import "./mission.css";
import { Button, IconButton } from "@icewalk/ui/button";
import { Footnote, Title1, Title2 } from "@icewalk/ui/text";
import { TabBar } from "@icewalk/ui/tab-bar";
import { Window, WindowContent, WindowMotion } from "@icewalk/ui/window";
import { ArrowLeft, ChevronDown, ChevronUp, Maximize2, Minus, Plus, Scan } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SiteScene, type SiteSceneHandle, type SiteLayers, type SiteRaster } from "@/components/site/site-scene";
import { type Insets } from "@/components/site/camera";
import { Site3DStage } from "@/components/site3d/site-3d-stage";
import type { FreePose } from "@/components/site3d/site-3d";
import { EvaMinimap } from "@/components/site3d/eva-minimap";
import { walkPath } from "@/lib/site3d";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { Body } from "@icewalk/ui/text";
import { describeSource, usePlanSession } from "@/lib/use-plan-session";
import { useIceMap } from "@/lib/use-ice-map";
import { ICE_RADIUS_M, ICE_VIEW_MODES, renderIceView, type IceViewMode } from "@/lib/ice-view";
import { bearing, stationWithNeighbors, demoConfirm, demoPlan, demoReplan, measuringTool, nextStation, orderedStations, stationBlock, stationById, type Measurement, type Plan, type Station } from "@/lib/plan";
import { HABITAT_XY, SITE_IMAGERY } from "@/components/site/site-data";
import { MissionDock } from "./mission-dock";
import { StationDetail } from "./station-detail";
import { sceneInsets } from "./layout";
import { GlobeEntry } from "./globe-entry";
import { IceViewLegend } from "./ice-view-legend";
import { PHASES, phaseIndex, type Phase } from "./phases";
import { SitePanel } from "./site-panel";
import { PlanPanel } from "./plan-panel";
import { RehearsePanel, type Jump } from "./rehearse-panel";
import { ExecutePanel } from "./execute-panel";
import { DebriefPanel } from "./debrief-panel";

const COMPACT_QUERY = "(max-width: 759px)";
function subscribeCompact(listener: () => void) {
  if (!window.matchMedia) return () => {};
  const media = window.matchMedia(COMPACT_QUERY); media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const TABS = PHASES.map((p, i) => ({ value: p.value, label: `${i + 1} ${p.label}`, icon: p.icon }));
/** Where the EV starts: at the habitat, facing the first station. */
function startPose(plan: Plan): FreePose {
  const first = orderedStations(plan)[0];
  return { x: HABITAT_XY[0], y: HABITAT_XY[1], headingDeg: first ? bearing(HABITAT_XY, first.position).deg : 0 };
}

/**
 * IceWalk: the EVA in five phases (phases.tsx). The scene changes with the phase (globe, 2D map,
 * 3D terrain); the right column always holds the phase's question, its content and the next step.
 */
export function PlanningView({ initialPhase = "site", initialEvaView = "ev" }: { initialPhase?: Phase; initialEvaView?: "ev" | "iv" }) {
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia?.(COMPACT_QUERY).matches ?? false, () => false);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [flying, setFlying] = useState(false);
  const [stationId, setStationId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState(false);
  const [layers, setLayers] = useState<SiteLayers>({ grid: false, rings: false });
  const [mapMode, setMapMode] = useState<IceViewMode | null>("likely");
  const [reviewing, setReviewing] = useState(false);
  const [returning, setReturning] = useState(false);
  const [jump, setJump] = useState<Jump>();
  // The dock's timeline opens on demand so the map keeps the space (closed by default).
  const [timelineOpen, setTimelineOpen] = useState(false);
  // The legend explains the ice map, so it starts open; it folds to one button.
  const [legendOpen, setLegendOpen] = useState(true);
  // Plan approval belongs to one plan: a new plan (another goal, a replan) withdraws it.
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [evaView, setEvaView] = useState<"ev" | "iv">(initialEvaView);
  // The EV and brief poses live here so a phase change never loses the walk.
  const [evPose, setEvPose] = useState<FreePose>(() => startPose(demoPlan));
  const [briefPose, setBriefPose] = useState<FreePose>(() => startPose(demoPlan));
  const [announcement, setAnnouncement] = useState("");
  const [insets, setInsets] = useState<Insets>({ top: 0, right: 0, bottom: 0, left: 0 });
  const rootRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SiteSceneHandle>(null);
  const panelOrigin = useRef<HTMLElement | null>(null);
  const reopenRef = useRef<HTMLButtonElement | null>(null);
  const session = usePlanSession({ fallback: { plan: demoPlan, replan: demoReplan, confirm: demoConfirm } });
  const plan: Plan = session.plan;
  const iceMap = useIceMap(plan.plan_id, session.source);
  const raster: SiteRaster | undefined = useMemo(() => {
    if (!iceMap.map || !mapMode) return undefined;
    return renderIceView(iceMap.map, mapMode, HABITAT_XY, ICE_RADIUS_M);
  }, [iceMap.map, mapMode]);
  const helmet = phase === "execute" && evaView === "ev";
  const approved = approvedId === plan.plan_id;
  const compactPanel = (phase === "plan" && approved && !stationId) || phase === "rehearse";
  const evaPath = useMemo(() => walkPath(plan), [plan]);
  const onMap = phase === "plan" || phase === "debrief" || (phase === "execute" && evaView === "iv");
  const station = phase === "plan" && stationId ? stationById(plan, stationId) : undefined;
  const next = nextStation(plan, session.measurements);
  const elapsedMin = next ? stationBlock(plan, next.id)?.t_start_min ?? 0 : plan.summary.duration_min;
  const executing = phase === "execute";
  const pending = session.status === "loading" || session.status === "idle";
  const sceneStationId = phase === "plan" ? stationId : null;
  const current = PHASES[phaseIndex(phase)];

  useLayoutEffect(() => {
    const root = rootRef.current;
    const tabs = tabsRef.current;
    const timeline = timelineRef.current;
    if (!root || !tabs) return;
    const hud = root.querySelector<HTMLElement>(".site-hud");
    function measure() {
      const rootBox = root!.getBoundingClientRect();
      const statusBox = tabs!.getBoundingClientRect();
      const timelineBox = timeline?.getBoundingClientRect() ?? new DOMRect(rootBox.left, rootBox.bottom, rootBox.width, 0);
      root!.style.setProperty("--mission-panel-top", `${statusBox.bottom - rootBox.top + 16}px`);
      const panel = mapFocus ? undefined : panelRef.current?.getBoundingClientRect();
      root!.style.setProperty("--mission-panel-y", `${(panel?.top ?? timelineBox.top) - rootBox.top}px`);
      // Wide: the layers and legend form a column at the top left, so the map frames to its right.
      const tools = compact ? { above: legendRef.current?.getBoundingClientRect(), below: hud?.getBoundingClientRect() } : { left: toolsRef.current?.getBoundingClientRect() };
      root!.style.setProperty("--mission-timeline-y", `${rootBox.bottom - timelineBox.top}px`);
      root!.style.setProperty("--mission-tabs-bottom", `${tabs!.getBoundingClientRect().bottom - rootBox.top}px`);
      // Wide layout: status sits in the right column (theme-dc.css), so only the header bounds the map's top.
      const value = sceneInsets(rootBox, compact ? statusBox : tabs!.getBoundingClientRect(), tabs!.getBoundingClientRect(), panel, timelineBox, tools);
      setInsets((old) => Object.keys(value).every((key) => old[key as keyof Insets] === value[key as keyof Insets]) ? old : value);
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    [root, tabs, timeline, panelRef.current, toolsRef.current, legendRef.current, hud].forEach((node) => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [mapFocus, compact, phase, evaView, timelineOpen, legendOpen]);

  const hoverStation = useCallback((id: string | null) => setHoveredId(id), []);
  // Opening the timeline folds the legend to its button so the map keeps room; closing restores it.
  const legendBefore = useRef(true);
  function toggleTimeline() {
    if (!timelineOpen) { legendBefore.current = legendOpen; setLegendOpen(false); } else setLegendOpen(legendBefore.current);
    setTimelineOpen(!timelineOpen);
  }
  const selectStation = useCallback((id: string | null) => {
    const fromPanel = !!panelRef.current?.contains(document.activeElement);
    if (fromPanel && document.activeElement instanceof HTMLElement) panelOrigin.current = document.activeElement;
    setStationId(id); setMapFocus(false); setPhase("plan");
    // Zoom to the station with its legs: the focus is on it, the route around it stays readable.
    if (id) sceneRef.current?.fit(stationWithNeighbors(plan, id));
    if (fromPanel) requestAnimationFrame(() => contentRef.current?.focus());
  }, [plan]);

  function backToPlan() {
    const hadFocus = !!panelRef.current?.contains(document.activeElement);
    setStationId(null);
    sceneRef.current?.fit(); // back at the EVA level, the whole plan in view
    if (hadFocus) requestAnimationFrame(() => { const target = panelOrigin.current; if (target?.isConnected) target.focus(); else contentRef.current?.focus(); panelOrigin.current = null; });
  }
  function goTo(value: string) {
    const target = value as Phase;
    setPhase(target); setMapFocus(false); setFlying(false); panelOrigin.current = null;
    if (target === "debrief" && session.measurements.length) setMapMode("change");
    else if (target !== "debrief" && mapMode === "change") setMapMode("likely");
    if (target === "debrief") requestAnimationFrame(() => sceneRef.current?.fit());
  }
  const arrive = useCallback(() => { setFlying(false); setPhase("plan"); }, []);
  function reset() { session.reset(); setStationId(null); setReviewing(false); setReturning(false); setEvPose(startPose(demoPlan)); setAnnouncement("Session reset to the nominal plan."); }
  const accept = () => { setReviewing(false); setAnnouncement("Replan accepted."); };
  const terminate = () => { setReviewing(false); setReturning(true); setAnnouncement("EVA terminated: walking back to the habitat."); };
  async function logMeasurement(target: Station, result: Measurement["result"], depth: number, crew: "EV1" | "EV2") {
    if (pending) return;
    const measurement: Measurement = { station_id: target.id, position: target.position, tool: measuringTool(target), result, depth_m: depth, timestamp: new Date().toISOString(), crew_member: crew };
    const outcome = await session.logMeasurement(measurement, stationBlock(plan, target.id)?.t_end_min ?? elapsedMin);
    if (outcome === "busy" || outcome === "superseded") return;
    if (outcome === "failed") { setAnnouncement("Replan failed. The last plan is still shown."); return; }
    setStationId(null);
    setReviewing(outcome === "replanned");
    setAnnouncement(`${result === "no_ice" ? "No ice" : result === "ice" ? "Ice" : "Inconclusive"} recorded at ${target.id}. ${outcome === "replanned" ? "Replanned traverse ready for review." : "Nominal traverse retained."}`);
  }

  const scene = phase === "site" ? <GlobeEntry plan={plan} flying={flying} onArrive={arrive} />
    : phase === "rehearse" ? <Site3DStage mode="brief" plan={plan} measurements={session.measurements} source={session.source} jump={jump} pose={briefPose} onPose={setBriefPose} />
      : helmet ? <Site3DStage mode="helmet" plan={plan} measurements={session.measurements} source={session.source} pose={evPose} onPose={setEvPose} previousPlan={session.previous ?? undefined}
        reviewing={reviewing} returning={returning} pending={pending} elapsedMin={elapsedMin} onLog={logMeasurement} onAccept={accept} onReturn={terminate} onLeave={() => setEvaView("iv")}
        onComplete={() => { setReturning(false); setEvaView("iv"); goTo("debrief"); setAnnouncement("EVA complete: back at the habitat."); }} />
      : <SiteScene ref={sceneRef} plan={plan} previousPlan={reviewing || phase === "debrief" ? session.previous ?? undefined : undefined} measurements={session.measurements} selectedStationId={sceneStationId} hoveredStationId={hoveredId} onSelectStation={selectStation} onHoverStation={hoverStation} layers={layers} insets={insets} raster={raster} crew={phase === "execute" ? evPose : undefined} />;

  const panel = phase === "site" ? <SitePanel plan={plan} flying={flying} onPlan={() => setFlying(true)} onSkip={arrive} />
    : phase === "plan" ? station
      ? <StationDetail plan={plan} station={station} source={session.source} onSelect={selectStation} />
      : <PlanPanel plan={plan} planSource={session.source} pending={pending} approved={approved}
        onApprove={() => { setApprovedId(plan.plan_id); if (!timelineOpen) toggleTimeline(); setAnnouncement("Plan approved."); }} onEdit={() => setApprovedId(null)}
        onStrategy={(s) => { setStationId(null); setApprovedId(null); void session.setStrategy(s); }} onNext={() => goTo("rehearse")}
        onSelect={selectStation} onTimeline={() => { if (!timelineOpen) toggleTimeline(); }} />
      : phase === "rehearse" ? <RehearsePanel plan={plan} onJump={setJump} onNext={() => goTo("execute")} />
        : phase === "execute" ? <section className="mission-stack" aria-label="EVA">
          <SegmentedControl label="EVA view" value={evaView} options={[{ value: "ev", label: "EV1 helmet" }, { value: "iv", label: "IV console" }]} onValueChange={(v) => setEvaView(v as "ev" | "iv")} />
          {helmet ? <EvGuide plan={plan} measurements={session.measurements} returning={returning} reviewing={reviewing} onDebrief={() => goTo("debrief")} />
            : <ExecutePanel plan={plan} previous={session.previous} measurements={session.measurements} pending={pending} reviewing={reviewing} returning={returning}
              onAccept={accept} onReturn={terminate} onDebrief={() => goTo("debrief")}
              tracker={<div className="mission-tracker"><EvaMinimap plan={plan} path={evaPath} measurements={session.measurements} pose={evPose} nextId={returning ? undefined : next?.id} elapsedMin={elapsedMin} marginMin={plan.summary.min_walkback_margin_min} /></div>} />}
        </section>
          : <DebriefPanel plan={plan} measurements={session.measurements} onNext={() => { setReturning(false); goTo("plan"); }} onReset={reset} />;

  return <main ref={rootRef} className="mission-app" data-phase={phase} data-focused={mapFocus} data-helmet={helmet} data-panel={compactPanel ? "compact" : "full"} onKeyDown={(e) => { if (e.key === "Escape") { if (mapFocus) setMapFocus(false); else if (stationId) backToPlan(); } }}>
    <h1 className="sr-only">IceWalk: EVA planning</h1><div role="status" aria-label="Session update" className="sr-only">{announcement}</div>
    <div className="mission-scene">{scene}</div>
    <header className="mission-heading"><Title1>IceWalk</Title1><Footnote>S1094b · 35.11°N, 189.83°E</Footnote></header>
    <div className="mission-tabs" ref={tabsRef}><TabBar label="Mission phase" layout={compact ? "compact" : "regular"} value={phase} tabs={TABS} onValueChange={goTo} /></div>
    {onMap ? <div className="mission-camera"><IconButton variant="glass" label="Zoom in" onClick={() => sceneRef.current?.zoomBy(1.5)}><Plus /></IconButton><IconButton variant="glass" label="Zoom out" onClick={() => sceneRef.current?.zoomBy(1 / 1.5)}><Minus /></IconButton><IconButton variant="glass" label="Frame plan" onClick={() => sceneRef.current?.fit()}><Scan /></IconButton></div> : null}
    <WindowMotion open={!mapFocus} initialFocus={contentRef} restoreFocus={reopenRef} className="mission-panel-presence"><div className="mission-panel" ref={panelRef}><Window className="mission-panel-window" aria-label="Phase window">
      <header className="mission-panel-heading">{station ? <IconButton label="Back to plan" variant="plain" onClick={backToPlan}><ArrowLeft /></IconButton> : null}<div className="mission-panel-title"><Footnote tone="secondary">Step {phaseIndex(phase) + 1} of {PHASES.length} · {current.label}</Footnote><Title2 as="h2">{station ? `Station ${station.order} · ${station.id}` : current.question}</Title2></div>{onMap ? <IconButton label="Map focus" variant="plain" onClick={() => setMapFocus(true)}><Maximize2 /></IconButton> : null}</header>
      {phase === "plan" && session.error ? <Footnote role="status" className="mission-api-note">{session.source === "mock" ? "Planner API unavailable. Using bundled mock data." : "Replan failed. Showing the last plan."}</Footnote> : null}
      <div className="mission-panel-scroll" tabIndex={-1} ref={contentRef}>
        <WindowContent contentKey={phase === "plan" ? stationId ?? "plan" : phase} direction={station ? "forward" : "back"}>{panel}</WindowContent>
      </div>
    </Window></div></WindowMotion>
    {mapFocus ? <Button ref={reopenRef} variant="glass" className="mission-show-panel" onClick={() => setMapFocus(false)}>Show {current.label.toLowerCase()} window</Button> : null}
    {onMap ? <div className="mission-map-tools" ref={toolsRef}>
      {legendOpen ? <Window className="mission-legend-card">
      <div className="mission-legend" role="group" aria-label="Map legend" ref={legendRef}>
        {iceMap.map && mapMode ? <IceViewLegend map={iceMap.map} mode={mapMode} /> : null}
        <span className="mission-legend-keys">
          <span><i data-key="hab" aria-hidden />Habitat</span><span><i data-key="route" aria-hidden />Traverse</span>{phase === "plan" ? <span><i data-key="station" aria-hidden>1</i>Station · select for details</span> : null}
          {layers.rings ? <span><i data-key="ring" aria-hidden />Distance rings</span> : null}{(reviewing || phase === "debrief") && session.previous ? <span><i data-key="previous" aria-hidden />Plan before the last result</span> : null}
        </span>
        <span className="mission-legend-source">Model estimate{plan.summary.craters_in_model !== undefined ? ` · ${plan.summary.craters_in_model} craters` : ""} · {describeSource(session)}</span>
      </div>
      </Window> : null}
      <Window className="mission-map-card">
      <section className="mission-layer-position" aria-label="Map layers"><div className="mission-layer-window">
        {iceMap.map ? ICE_VIEW_MODES.filter((m) => m.value !== "change" || session.measurements.length).map((m) => <Button key={m.value} variant="plain" size="small" aria-pressed={mapMode === m.value} onClick={() => setMapMode((cur) => (cur === m.value ? null : m.value))}>{m.label}</Button>) : <Button variant="plain" size="small" disabled>{iceMap.loading ? "Ice map · loading" : "Ice map unavailable"}</Button>}
        <Button variant="plain" size="small" aria-pressed={layers.rings} onClick={() => setLayers((s) => ({ ...s, rings: !s.rings }))}>Range rings</Button>
        <Button variant="plain" size="small" aria-pressed={layers.grid} onClick={() => setLayers((s) => ({ ...s, grid: !s.grid }))}>Grid</Button>
        <Button variant="plain" size="small" className="mission-legend-toggle" aria-expanded={legendOpen} onClick={() => setLegendOpen((v) => !v)}>Legend{legendOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}</Button>
      </div></section>
      </Window>
    </div> : null}
    {onMap ? <p className="mission-map-credit">{SITE_IMAGERY.credit} · context: THEMIS Day IR (NASA/JPL-Caltech/ASU)</p> : null}
    {onMap ? <div className="mission-dock-position" ref={timelineRef}><Window className="mission-dock-window">
      <MissionDock plan={plan} previousPlan={reviewing ? session.previous ?? undefined : undefined} measurements={session.measurements} session={session} execution={executing} elapsedMin={elapsedMin}
        open={timelineOpen} onToggle={toggleTimeline} stationId={sceneStationId} hoveredId={hoveredId} onSelectStation={selectStation} onHoverStation={hoverStation} />
    </Window></div> : null}
  </main>;
}

/** Side panel while the EV view is up: how to work the helmet view, and where the crew stands. */
function EvGuide({ plan, measurements, returning, reviewing, onDebrief }: { plan: Plan; measurements: Measurement[]; returning: boolean; reviewing: boolean; onDebrief: () => void }) {
  const next = returning ? undefined : nextStation(plan, measurements);
  return (
    <section className="mission-stack" aria-label="EV guide">
      <Body>Walk to the bright light column. Entering its rings fills the inner circle: work the station and log the result in the HUD.</Body>
      <Footnote tone="secondary">Drag to look · W A S D or arrows to walk · Shift to move faster</Footnote>
      {reviewing ? <Footnote>The planner replanned: read the plan update in the helmet and copy it.</Footnote> : null}
      <Footnote tone="secondary">{returning ? "EVA terminated: walk back to the habitat." : next ? `Next: station ${next.order}, ${next.id}. ${measurements.length} measured.` : "All stations measured: walk back to the habitat."}</Footnote>
      {!next ? <button type="button" className="mission-text-link" onClick={onDebrief}>Debrief the EVA</button> : null}
    </section>
  );
}
