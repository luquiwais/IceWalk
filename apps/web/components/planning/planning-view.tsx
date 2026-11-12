"use client";
import "./mission.css";
import { Button, IconButton } from "@icewalk/ui/button";
import { Footnote, Title1, Title2 } from "@icewalk/ui/text";
import { TabBar } from "@icewalk/ui/tab-bar";
import { Window, WindowContent, WindowMotion } from "@icewalk/ui/window";
import { ArrowLeft, FlaskConical, Footprints, Globe, Map as MapIcon, Maximize2, Minus, Plus, Scan } from "lucide-react";
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { SiteScene, type SiteSceneHandle, type SiteLayers, type SiteProjection } from "@/components/site/site-scene";
import { type Insets } from "@/components/site/camera";
import { describeSource, usePlanSession } from "@/lib/use-plan-session";
import { bearing, demoPlan, demoReplan, evaName, measuringTool, nextStation, stationBlock, stationById, toolName, traverseHeading, type Measurement, type Plan, type Station } from "@/lib/plan";
import { formatOdds } from "@/lib/format";
import { MissionBrief } from "./mission-brief";
import { MissionStatus } from "./mission-status";
import { PlanTimeline } from "./plan-timeline";
import { StationDetail } from "./station-detail";
import { EVView, MeasurementForm } from "./ev-view";
import { ScienceView } from "./science-view";
import { ReplanSummary } from "./replan-summary";
import { sceneInsets } from "./layout";
import { GlobeEntry } from "./globe-entry";
import { TraverseMinimap } from "./traverse-minimap";
import { HABITAT_XY } from "@/components/site/site-data";

type View = "planning" | "ev" | "science";
const VIEWS = [{ value: "planning", label: "Planning", icon: <MapIcon /> }, { value: "ev", label: "EV", icon: <Footprints /> }, { value: "science", label: "Science", icon: <FlaskConical /> }];
const COMPACT_QUERY = "(max-width: 759px)";
/** EV looks along the leg ahead; web-design.md, "EV y Science": rotateX(58deg). */
const EV_PITCH_DEG = 58;
function subscribeCompact(listener: () => void) {
  if (!window.matchMedia) return () => {};
  const media = window.matchMedia(COMPACT_QUERY); media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function PlanningView() {
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia?.(COMPACT_QUERY).matches ?? false, () => false);
  const [view, setView] = useState<View>("planning");
  const [stationId, setStationId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState(false);
  const [globe, setGlobe] = useState(false);
  const [layers, setLayers] = useState<SiteLayers>({ grid: false, rings: false });
  const [approved, setApproved] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [insets, setInsets] = useState<Insets>({ top: 0, right: 0, bottom: 0, left: 0 });
  const rootRef = useRef<HTMLElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const globeButtonRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef<SiteSceneHandle>(null);
  const panelOrigin = useRef<HTMLElement | null>(null);
  const reopenRef = useRef<HTMLButtonElement | null>(null);
  const session = usePlanSession({ fallback: { plan: demoPlan, replan: demoReplan } });
  const plan: Plan = session.plan;
  const station = stationId ? stationById(plan, stationId) : undefined;
  const next = nextStation(plan, session.measurements);
  const last = session.measurements.at(-1);
  const elapsedMin = next ? stationBlock(plan, next.id)?.t_start_min ?? 0 : plan.summary.duration_min;
  const pending = session.status === "loading" || session.status === "idle";
  const position = last?.position ?? HABITAT_XY;
  const direction = next ? bearing(position, next.position) : undefined;
  const heading = traverseHeading(plan, session.measurements, position);
  const [px, py] = position;
  const projection: SiteProjection | undefined = view === "ev"
    ? { headingDeg: heading ?? 0, pitchDeg: EV_PITCH_DEG, focus: [px, py] }
    : undefined;
  const sceneStationId = view === "planning" ? stationId : null;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const status = statusRef.current;
    const tabs = tabsRef.current;
    const timeline = timelineRef.current;
    if (!root || !status || !tabs || !timeline) return;
    const hud = root.querySelector<HTMLElement>(".site-hud");
    function measure() {
      root!.style.setProperty("--mission-panel-top", `${status!.getBoundingClientRect().bottom - root!.getBoundingClientRect().top + 16}px`);
      const panel = mapFocus ? undefined : panelRef.current?.getBoundingClientRect();
      root!.style.setProperty("--mission-panel-y", `${(panel?.top ?? timeline!.getBoundingClientRect().top) - root!.getBoundingClientRect().top}px`);
      // Wide: tools and legend sit above the timeline. Narrow: the legend sits under the tabs.
      const tools = compact ? { above: legendRef.current?.getBoundingClientRect(), below: hud?.getBoundingClientRect() } : { below: toolsRef.current?.getBoundingClientRect() };
      root!.style.setProperty("--mission-timeline-y", `${root!.getBoundingClientRect().bottom - timeline!.getBoundingClientRect().top}px`);
      root!.style.setProperty("--mission-tabs-bottom", `${tabs!.getBoundingClientRect().bottom - root!.getBoundingClientRect().top}px`);
      const value = sceneInsets(root!.getBoundingClientRect(), status!.getBoundingClientRect(), tabs!.getBoundingClientRect(), panel, timeline!.getBoundingClientRect(), tools);
      setInsets((old) => Object.keys(value).every((key) => old[key as keyof Insets] === value[key as keyof Insets]) ? old : value);
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    [root, status, tabs, timeline, panelRef.current, toolsRef.current, legendRef.current, hud].forEach((node) => { if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [mapFocus, compact, view, globe]);

  const hoverStation = useCallback((id: string | null) => setHoveredId(id), []);
  const selectStation = useCallback((id: string | null) => {
    const fromPanel = !!panelRef.current?.contains(document.activeElement);
    if (fromPanel && document.activeElement instanceof HTMLElement) panelOrigin.current = document.activeElement;
    setStationId(id); setMapFocus(false); setView("planning");
    if (id) sceneRef.current?.fit([id]);
    if (fromPanel) requestAnimationFrame(() => contentRef.current?.focus());
  }, []);

  function backToBrief() {
    const hadFocus = !!panelRef.current?.contains(document.activeElement);
    setStationId(null);
    if (hadFocus) requestAnimationFrame(() => { const target = panelOrigin.current; if (target?.isConnected) target.focus(); else contentRef.current?.focus(); panelOrigin.current = null; });
  }
  function switchView(value: string) { setView(value as View); setMapFocus(false); panelOrigin.current = null; if (value === "science") sceneRef.current?.fit(); }
  const enterSite = useCallback(() => { setGlobe(false); requestAnimationFrame(() => globeButtonRef.current?.focus()); }, []);
  function reset() { session.reset(); setStationId(null); setApproved(false); setAnnouncement("Session reset to the nominal plan."); }
  async function logMeasurement(target: Station, result: Measurement["result"], depth: number, crew: "EV1" | "EV2") {
    if (pending) return;
    const measurement: Measurement = { station_id: target.id, position: target.position, tool: measuringTool(target), result, depth_m: depth, timestamp: new Date().toISOString(), crew_member: crew };
    const outcome = await session.logMeasurement(measurement, stationBlock(plan, target.id)?.t_end_min ?? elapsedMin);
    if (outcome === "busy" || outcome === "superseded") return;
    if (outcome === "failed") { setAnnouncement("Replan failed. The last plan is still shown."); return; }
    setApproved(false); setStationId(null);
    setAnnouncement(`${result === "no_ice" ? "No ice" : result === "ice" ? "Ice" : "Inconclusive"} recorded at ${target.id}. ${outcome === "replanned" ? "Replanned traverse ready for review." : "Nominal traverse retained."}`);
  }
  const title = view === "ev" ? "Surface operations" : view === "science" ? "Science review" : station ? `Station ${station.id}` : evaName(plan);
  return <main ref={rootRef} className="mission-app" data-view={view} data-focused={mapFocus} onKeyDown={(e) => { if (e.key === "Escape") { if (mapFocus) setMapFocus(false); else if (stationId) backToBrief(); } }}>
    <h1 className="sr-only">IceWalk: EVA planning</h1><div role="status" aria-label="Session update" className="sr-only">{announcement}</div>
    <div className="mission-scene" inert={globe}><SiteScene ref={sceneRef} plan={plan} previousPlan={session.previous ?? undefined} measurements={session.measurements} projection={projection} selectedStationId={sceneStationId} hoveredStationId={hoveredId} onSelectStation={selectStation} onHoverStation={hoverStation} layers={layers} insets={insets} /></div>
    {globe ? <GlobeEntry plan={plan} onEnter={enterSite} /> : <>
    <header className="mission-heading"><Title1>IceWalk</Title1><Footnote>S1094b · 35.11°N, 189.83°E</Footnote></header>
    <div className="mission-status-position" ref={statusRef}><Window className="mission-status-window"><MissionStatus plan={plan} elapsedMin={view === "planning" ? 0 : elapsedMin} execution={view !== "planning"} session={session} /></Window></div>
    <div className="mission-tabs" ref={tabsRef}><TabBar label="Mission view" orientation={compact ? "horizontal" : "vertical"} value={view} tabs={VIEWS} onValueChange={switchView} /></div>
    <div className="mission-camera"><IconButton ref={globeButtonRef} variant="glass" label="View Mars" onClick={() => setGlobe(true)}><Globe /></IconButton>{view !== "ev" ? <><IconButton variant="glass" label="Zoom in" onClick={() => sceneRef.current?.zoomBy(1.5)}><Plus /></IconButton><IconButton variant="glass" label="Zoom out" onClick={() => sceneRef.current?.zoomBy(1 / 1.5)}><Minus /></IconButton><IconButton variant="glass" label="Frame plan" onClick={() => sceneRef.current?.fit()}><Scan /></IconButton></> : null}</div>
    <WindowMotion open={!mapFocus} initialFocus={contentRef} restoreFocus={reopenRef} className="mission-panel-presence"><div className="mission-panel" ref={panelRef}><Window className="mission-panel-window" aria-label="Contextual planning window">
      <header className="mission-panel-heading">{station && view === "planning" ? <IconButton label="Back to brief" variant="plain" onClick={backToBrief}><ArrowLeft /></IconButton> : null}<Title2 as="h2">{title}</Title2><IconButton label="Map focus" variant="plain" onClick={() => setMapFocus(true)}><Maximize2 /></IconButton></header>
      <div className="mission-panel-scroll" tabIndex={-1} ref={contentRef}>
        <WindowContent contentKey={view === "planning" ? stationId ?? "brief" : view} direction={station ? "forward" : "back"}>
        {session.previous && last ? <ReplanSummary before={session.previous} after={plan} measurement={last} onRevert={reset} /> : null}
        {view === "planning" ? station ? <section className="mission-stack" aria-label="Station detail"><Footnote>{formatOdds(station.p_ice)} chance of ice at the STM threshold</Footnote><StationDetail plan={plan} station={station} /><MeasurementForm key={station.id} compact station={station} pending={pending} onLog={logMeasurement} /></section>
          : <MissionBrief plan={plan} measurements={session.measurements} hoveredId={hoveredId} source={describeSource(session)} onSelect={selectStation} onHover={hoverStation} />
          : view === "ev" ? <EVView plan={plan} measurements={session.measurements} pending={pending} onLog={logMeasurement} onReview={() => switchView("science")} />
          : <ScienceView plan={plan} measurements={session.measurements} approved={approved} onApprove={() => { setApproved(true); setAnnouncement("Plan approved locally in this session."); }} onReset={reset} />}
        </WindowContent>
      </div>
    </Window></div></WindowMotion>
    {mapFocus ? <Button ref={reopenRef} variant="glass" className="mission-show-panel" onClick={() => setMapFocus(false)}>Show planning window</Button> : null}
    {view === "ev" && !compact && next && direction ? <div className="mission-destination"><Footnote>Next station · {next.order} · {next.id}</Footnote><Title2>{direction.distanceM >= 1 ? `${Math.round(direction.distanceM)} m · ${direction.label}` : "On station"}</Title2><Footnote>{toolName(measuringTool(next))}</Footnote><Footnote>Simulated position · heading-up oblique of the flat ortho</Footnote></div> : null}
    <div className="mission-map-tools" ref={toolsRef}>
      {view === "ev" ? <TraverseMinimap plan={plan} measurements={session.measurements} position={position} headingDeg={heading} />
        : <section className="mission-layer-position" aria-label="Map layers"><Window className="mission-layer-window"><Button variant="plain" size="small" disabled>HiRISE imagery</Button><Button variant="plain" size="small" aria-pressed={layers.grid} onClick={() => setLayers((s) => ({ ...s, grid: !s.grid }))}>Grid</Button><Button variant="plain" size="small" aria-pressed={layers.rings} onClick={() => setLayers((s) => ({ ...s, rings: !s.rings }))}>Range rings</Button><Button variant="plain" size="small" disabled title="Awaiting /maps">Ice potential · Awaiting /maps</Button></Window></section>}
      <div className="mission-legend" role="group" aria-label="Map legend" ref={legendRef}>
        <span><i data-key="arc" aria-hidden />Arc · P(ice{plan.summary.ice_threshold_m !== undefined ? ` ≤ ${plan.summary.ice_threshold_m} m` : ""})</span><span><i data-key="hab" aria-hidden />HAB · Habitat</span><span><i data-key="route" aria-hidden />Traverse</span>
        {layers.rings && view !== "ev" ? <span><i data-key="ring" aria-hidden />Rings · distance from habitat</span> : null}{session.previous ? <span><i data-key="previous" aria-hidden />Previous plan</span> : null}
        <span>Model estimate{plan.summary.craters_in_model !== undefined ? ` · ${plan.summary.craters_in_model} craters` : ""} · {describeSource(session)}</span>
      </div>
    </div>
    <div className="mission-timeline-position" ref={timelineRef}><Window className="mission-timeline-window"><PlanTimeline plan={plan} previousPlan={session.previous ?? undefined} stationId={sceneStationId} hoveredId={hoveredId} elapsedMin={view === "planning" ? undefined : elapsedMin} onSelectStation={selectStation} onHoverStation={hoverStation} /></Window></div>
    </>}
  </main>;
}
