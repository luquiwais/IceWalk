"use client";

import { Disclosure } from "./disclosure";

import "./mission.css";

import { Button, IconButton } from "@icewalk/ui/button";
import { Body, Caption1, Footnote, Title1, Title2 } from "@icewalk/ui/text";
import { Metric, MetricList } from "@icewalk/ui/metric";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Ornament, OrnamentGroup, OrnamentItem } from "@icewalk/ui/ornament";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { TabBar } from "@icewalk/ui/tab-bar";
import { MotionPresence } from "@icewalk/ui/motion";
import { NavigationBar, Window } from "@icewalk/ui/window";
import {
  Clock,
  FlaskConical,
  Footprints,
  Map as MapIcon,
  Maximize2,
  Minus,
  PanelLeft,
  Plus,
  X,
  Layers,
  ListTree,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MarsGlobe } from "@/components/globe/mars-globe";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import {
  demoMeasurement,
  demoPlan,
  orderedStations,
  stationById,
  timelineViolations,
  toolName,
  totalEquipmentMass,
  type Plan,
  type Measurement,
} from "@/lib/plan";
import {
  designLayers,
  designReplan,
  designSession,
  type DesignLayer,
} from "@/mock/design-session";
import { PRIORITY_LABEL, RESULT_LABEL, RowLabel, Value, clock } from "./parts";
import { ReplanSummary } from "./replan-summary";
import { StationDetail } from "./station-detail";
import { MissionStatus, PlanTimeline } from "./mission-status";
import { ToolAssessment } from "./tool-assessment";
import { SiteMap } from "./site-map";
import { EVView, EVScene } from "./ev-view";
import { ScienceView } from "./science-view";

type Section = "overview" | "stations" | "timeline" | "decisions" | "equipment";
type View = "planning" | "ev" | "science";
const VIEWS = [
  { value: "planning", label: "Planning", icon: <MapIcon /> },
  { value: "ev", label: "EV", icon: <Footprints /> },
  { value: "science", label: "Science", icon: <FlaskConical /> },
];

const COMPACT_QUERY = "(max-width: 759px)";
function subscribeCompact(listener: () => void) {
  if (!window.matchMedia) return () => {};
  const media = window.matchMedia(COMPACT_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function PlanningView() {
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia?.(COMPACT_QUERY).matches ?? false,
    () => false,
  );
  const [view, setView] = useState<View>("planning");
  const [stationId, setStationId] = useState<string | null>(null);
  const [replanned, setReplanned] = useState(false);
  const [mapFocus, setMapFocus] = useState(false);
  const [focusSite, setFocusSite] = useState(true);
  const [zoom, setZoom] = useState(0);
  const [layer, setLayer] = useState<DesignLayer>("imagery");
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [approved, setApproved] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [panel, setPanel] = useState<
    | "brief"
    | "station"
    | "layers"
    | "timeline"
    | "status"
    | "ev"
    | "science"
    | null
  >(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const plan: Plan = replanned ? designReplan : demoPlan;
  const station = stationId ? stationById(plan, stationId) : undefined;

  useEffect(() => {
    if (!panel || mapFocus) {
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && !active.closest(".immersive-panel"))
      returnFocusRef.current = active;
    const frame = requestAnimationFrame(() => contentRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [panel, mapFocus]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (mapFocus) setMapFocus(false);
        else setPanel(null);
      }
    }
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [mapFocus]);

  function openStation(id: string) {
    setStationId(id);
    setMapFocus(false);
    setView("planning");
    setPanel("station");
    requestAnimationFrame(() => contentRef.current?.focus());
  }
  function logMeasurement(
    result: Measurement["result"],
    depth = 1,
    crew: "EV1" | "EV2" = "EV1",
  ) {
    const logged = {
      ...demoMeasurement,
      result,
      depth_m: depth,
      crew_member: crew,
    };
    setMeasurement(logged);
    setReplanned(result === "no_ice");
    setApproved(false);
    setStationId(null);
    if (view === "planning") setPanel("brief");
    setAnnouncement(
      `${RESULT_LABEL[result]} recorded at ${logged.station_id}. ${result === "no_ice" ? "Replanned traverse ready for review." : "Nominal traverse retained."} Simulated result.`,
    );
  }
  function reset() {
    setReplanned(false);
    setMeasurement(null);
    setApproved(false);
    setStationId(null);
    setAnnouncement("Demo reset to the nominal plan.");
  }

  function openCurrentPanel() {
    setPanel(view === "ev" ? "ev" : view === "science" ? "science" : "brief");
    setMapFocus(false);
  }

  const panelTitle =
    panel === "station" && station
      ? `Station ${station.id}`
      : panel === "layers"
        ? "Map layers"
        : panel === "status"
          ? "EVA status"
          : panel === "ev"
            ? "Surface operations"
            : panel === "science"
              ? "Science"
              : panel === "timeline"
                ? "Traverse"
                : "Mission brief";
  return (
    <main className="immersive-app" data-view={view} data-focused={mapFocus}>
      <h1 className="sr-only">IceWalk: EVA planning</h1>
      <div role="status" aria-label="Session update" className="sr-only">
        {announcement}
      </div>
      <MotionPresence
        present={view === "ev"}
        className="immersive-scene-motion"
      >
        <EVScene
          station={orderedStations(plan)[0]}
          onSelect={() => setPanel("ev")}
        />
      </MotionPresence>
      <MotionPresence
        present={view !== "ev" && focusSite}
        className="immersive-scene-motion"
      >
        <SiteMap
          plan={plan}
          layer={layer}
          selectedId={stationId}
          onSelect={openStation}
          zoom={zoom}
          replanned={replanned}
        />
      </MotionPresence>
      <MotionPresence
        present={view !== "ev" && !focusSite}
        className="immersive-scene-motion"
      >
        <MarsGlobe
          stations={orderedStations(plan).flatMap((s) =>
            s.lonlat
              ? [
                  {
                    id: s.id,
                    lonlat: s.lonlat,
                    label: `${s.order}. ${s.id}`,
                    selected: s.id === stationId,
                  },
                ]
              : [],
          )}
          route={plan.route as React.ComponentProps<typeof MarsGlobe>["route"]}
          onSelectStation={openStation}
        />
      </MotionPresence>
      <header className="immersive-heading">
        <Title1>IceWalk</Title1>
        <Footnote tone="secondary">
          S1094b
          <span className="immersive-site-region"> · Arcadia Planitia</span>
        </Footnote>
      </header>
      <div
        inert={mapFocus}
        aria-hidden={mapFocus}
        className="immersive-view-tabs"
      >
        <TabBar
          orientation={compact ? "horizontal" : "vertical"}
          label="Views"
          tabs={VIEWS}
          value={view}
          onValueChange={(v) => {
            setView(v as View);
            setStationId(null);
            setMapFocus(false);
            setPanel(v === "planning" ? null : (v as "ev" | "science"));
          }}
        />
      </div>
      <section className="immersive-safety" aria-label="EVA status">
        <Ornament aria-label="EVA quick status">
          <OrnamentItem
            render={
              <Button
                variant="plain"
                aria-label={`Walkback ${formatNumber(plan.summary.min_walkback_margin_min ?? 0, 1)} min`}
                onClick={() => setPanel("status")}
              />
            }
          >
            <span className="immersive-status-value">
              <Footnote as="span" className="immersive-compact-status-label">
                Walkback
              </Footnote>
              <Body as="span">
                <span className="immersive-wide-status-label">Walkback </span>
                {formatNumber(plan.summary.min_walkback_margin_min ?? 0, 1)} min
              </Body>
            </span>
          </OrnamentItem>
          <Footnote as="span" tone="secondary" className="immersive-clock">
            PET {clock(designSession.elapsedMin)}
          </Footnote>
        </Ornament>
        {(plan.alerts ?? [])
          .filter((a) => a.level !== "advisory")
          .slice(0, 1)
          .map((a) => (
            <StatusBadge key={a.message} level={a.level}>
              {a.message}
            </StatusBadge>
          ))}
        <Caption1 tone="secondary" className="immersive-demo-tag">
          Design demo · simulated data
        </Caption1>
      </section>
      <MotionPresence present={Boolean(panel) && !mapFocus}>
        <aside
          className={`immersive-panel ${panel === "timeline" ? "immersive-timeline-panel" : ""}`}
        >
          <Window
            aria-label={panelTitle}
            className="immersive-panel-window vision-panel-motion"
          >
            <NavigationBar
              titleAlign="leading"
              title={panelTitle}
              trailing={
                <IconButton label="Close panel" onClick={() => setPanel(null)}>
                  <X />
                </IconButton>
              }
            />
            <div
              key={panel}
              ref={contentRef}
              tabIndex={-1}
              className="immersive-panel-content vision-motion-enter"
            >
              {panel === "brief" ? (
                <>
                  {replanned ? (
                    <ReplanSummary
                      before={demoPlan}
                      after={plan}
                      measurement={measurement ?? demoMeasurement}
                      onRevert={reset}
                    />
                  ) : null}
                  <section aria-label="Mission brief" className="mission-stack">
                    <Body>Survey shallow ice around S1094b.</Body>
                    <MetricList>
                      <Metric
                        label="Duration"
                        value={formatDuration(plan.summary.duration_min)}
                      />
                      <Metric
                        label="Traverse"
                        value={formatNumber(plan.summary.distance_km, 2)}
                        unit="km"
                      />
                    </MetricList>
                    <Caption1 tone="secondary">{plan.plan_id}</Caption1>
                  </section>
                  <div className="mission-disclosures">
                    <Disclosure title="Which tool?">
                      <ToolAssessment />
                    </Disclosure>
                    <Disclosure title={<>Stations · {plan.stations.length}</>}>
                      <SectionContent
                        plan={plan}
                        section="stations"
                        replanned={replanned}
                        onOpenStation={openStation}
                        onRevert={reset}
                      />
                    </Disclosure>
                    <Disclosure title="Decision points">
                      <SectionContent
                        plan={plan}
                        section="decisions"
                        replanned={replanned}
                        onOpenStation={openStation}
                        onRevert={reset}
                      />
                    </Disclosure>
                    <Disclosure title="Equipment & mass">
                      <Equipment plan={plan} />
                    </Disclosure>
                    <Disclosure title="Model & assumptions">
                      <Footnote tone="secondary">
                        Ice threshold ≤ {plan.summary.ice_threshold_m} m ·{" "}
                        {plan.summary.craters_in_model} craters. Execution,
                        surface imagery and tool yield are illustrative. Backend
                        contracts are unchanged.
                      </Footnote>
                    </Disclosure>
                  </div>
                </>
              ) : null}
              {panel === "station" && station ? (
                <>
                  <div className="mission-stack">
                    <Title2>{formatDuration(station.duration_min)}</Title2>
                    <Body tone="secondary">
                      {station.tools.map(toolName).join(" · ")}
                    </Body>
                  </div>
                  <Disclosure title="Station details">
                    <StationDetail plan={plan} station={station} />
                  </Disclosure>
                  {!measurement && station.id === demoMeasurement.station_id ? (
                    <Button onClick={() => logMeasurement("no_ice")}>
                      Log measurement
                    </Button>
                  ) : null}
                </>
              ) : null}
              {panel === "layers" ? (
                <>
                  <ListSection aria-label="Layers">
                    {designLayers.map((l) => (
                      <ListRow
                        key={l.id}
                        accessory="selection"
                        selected={layer === l.id}
                        onClick={() => {
                          setFocusSite(true);
                          setLayer(l.id);
                        }}
                      >
                        {l.label}
                      </ListRow>
                    ))}
                  </ListSection>
                  <div className="immersive-camera">
                    <IconButton
                      label="Zoom out"
                      disabled={zoom <= 0}
                      onClick={() => {
                        setFocusSite(true);
                        setZoom((z) => Math.max(0, z - 1));
                      }}
                    >
                      <Minus />
                    </IconButton>
                    <IconButton
                      label="Zoom in"
                      disabled={zoom >= 3}
                      onClick={() => {
                        setFocusSite(true);
                        setZoom((z) => Math.min(3, z + 1));
                      }}
                    >
                      <Plus />
                    </IconButton>
                    <Button
                      variant="plain"
                      onClick={() => setFocusSite((f) => !f)}
                    >
                      {focusSite ? "Whole Mars" : "Return to site"}
                    </Button>
                  </div>
                </>
              ) : null}
              {panel === "status" ? (
                <>
                  <MissionStatus
                    plan={plan}
                    stationId={stationId}
                    elapsedMin={designSession.elapsedMin}
                    onSelectStation={openStation}
                  />
                  <Disclosure title="Safety limits">
                    <Footnote tone="secondary">
                      8 h EVA window · 2 crew. Follow the plan’s bingo time and
                      hard stop. All execution data in this preview is
                      simulated.
                    </Footnote>
                  </Disclosure>
                  <Button variant="plain" onClick={reset}>
                    Restart demo
                  </Button>
                </>
              ) : null}
              {panel === "timeline" ? (
                <>
                  <PlanTimeline
                    plan={plan}
                    stationId={stationId}
                    elapsedMin={designSession.elapsedMin}
                    onSelectStation={openStation}
                  />
                  <Disclosure title="Full timeline & margins">
                    <SectionContent
                      plan={plan}
                      section="timeline"
                      replanned={replanned}
                      onOpenStation={openStation}
                      onRevert={reset}
                    />
                  </Disclosure>
                </>
              ) : null}
              {panel === "ev" ? (
                <EVView
                  plan={plan}
                  measurement={measurement}
                  onLog={logMeasurement}
                  onReview={() => {
                    setView("science");
                    setPanel("science");
                  }}
                />
              ) : null}
              {panel === "science" ? (
                <ScienceView
                  plan={plan}
                  measurement={measurement}
                  approved={approved}
                  onApprove={() => {
                    setApproved(true);
                    setAnnouncement(
                      `Plan ${plan.plan_id} approved locally for this demo.`,
                    );
                  }}
                  onReset={reset}
                />
              ) : null}
            </div>
          </Window>
        </aside>
      </MotionPresence>
      <div className="immersive-dock">
        <Ornament aria-label="Mission controls">
          <OrnamentGroup className="gap-4">
            <MotionPresence
              present={!mapFocus}
              className="mission-dock-secondary"
            >
              <OrnamentItem
                render={
                  compact ? (
                    <IconButton
                      label={
                        view === "ev"
                          ? "Procedure"
                          : view === "science"
                            ? "Science"
                            : "Mission brief"
                      }
                      variant="plain"
                      onClick={openCurrentPanel}
                    />
                  ) : (
                    <Button variant="plain" onClick={openCurrentPanel} />
                  )
                }
              >
                {compact ? (
                  <ListTree />
                ) : view === "ev" ? (
                  "Procedure"
                ) : view === "science" ? (
                  "Science"
                ) : (
                  "Mission brief"
                )}
              </OrnamentItem>
              <OrnamentItem
                render={
                  <IconButton
                    label="Layers"
                    variant="plain"
                    onClick={() => {
                      setPanel("layers");
                      setMapFocus(false);
                    }}
                  />
                }
              >
                <Layers />
              </OrnamentItem>
              <OrnamentItem
                render={
                  <IconButton
                    label="Timeline"
                    variant="plain"
                    onClick={() => {
                      setPanel("timeline");
                      setMapFocus(false);
                    }}
                  />
                }
              >
                <Clock />
              </OrnamentItem>
            </MotionPresence>
            <OrnamentItem
              render={
                <IconButton
                  label={mapFocus ? "Show planning window" : "Map focus"}
                  variant="plain"
                  onClick={() => {
                    setMapFocus((f) => !f);
                  }}
                />
              }
            >
              {mapFocus ? <PanelLeft /> : <Maximize2 />}
            </OrnamentItem>
          </OrnamentGroup>
        </Ornament>
      </div>
      <Caption1 tone="secondary" className="immersive-image-credit">
        {focusSite || view === "ev"
          ? "Design demo · AI terrain · simulated values"
          : "Design demo · simulated values"}
      </Caption1>
    </main>
  );
}

function SectionContent({
  plan,
  section,
  onOpenStation,
}: {
  plan: Plan;
  section: Section;
  replanned: boolean;
  onOpenStation: (id: string) => void;
  onRevert: () => void;
}) {
  const violations = timelineViolations(plan);

  return (
    <>
      {section === "stations" ? (
        <ListSection header="Stations" headerId="stations">
          {orderedStations(plan).map((s) => (
            <ListRow
              key={s.id}
              onClick={() => onOpenStation(s.id)}
              trailing={
                <Value>
                  P(ice) {formatPercent(s.p_ice)} ·{" "}
                  {formatNumber(s.uncertainty, 2)} bits
                </Value>
              }
            >
              <RowLabel
                title={`${s.order}. Station ${s.id}`}
                detail={`${PRIORITY_LABEL[s.priority]} priority · ${formatDuration(s.duration_min)} · ${s.tools
                  .map(toolName)
                  .join(", ")}`}
              />
            </ListRow>
          ))}
        </ListSection>
      ) : null}

      {section === "timeline" ? (
        <ListSection
          header="EVA timeline"
          headerId="timeline"
          footer="Mission elapsed time (h:mm)."
        >
          {plan.timeline.map((item, index) => {
            const violation = violations.find((v) => v.index === index);
            return (
              <ListRow
                key={`${item.kind}-${item.t_start_min}-${index}`}
                onClick={
                  item.kind === "station" && item.station_id
                    ? () => onOpenStation(item.station_id!)
                    : undefined
                }
                trailing={
                  <Value>
                    {clock(item.t_start_min)}–{clock(item.t_end_min)}
                  </Value>
                }
              >
                <RowLabel
                  title={item.label}
                  detail={
                    item.walkback_margin_min !== undefined ? (
                      <span
                        className={
                          violation ? "font-semibold text-warning" : undefined
                        }
                      >
                        {violation ? "Warning: " : ""}Walkback margin{" "}
                        {formatNumber(item.walkback_margin_min, 0)} min
                      </span>
                    ) : undefined
                  }
                />
              </ListRow>
            );
          })}
        </ListSection>
      ) : null}

      {section === "decisions" ? (
        (plan.decision_points ?? []).length ? (
          (plan.decision_points ?? []).map((point) => (
            <ListSection
              key={point.station_id}
              header={`After ${point.station_id}`}
              headerId={`decision-${point.station_id}`}
              footer={`Decide by ${clock(point.decide_by_min)}. Default: option ${point.default_option}.`}
            >
              {point.options.map((option) => (
                <ListRow
                  key={option.rank}
                  onClick={() => onOpenStation(point.station_id)}
                >
                  <RowLabel
                    title={`${option.rank}. ${RESULT_LABEL[option.if_result]} → ${option.next_station_ids.join(", ")}`}
                    detail={option.rationale}
                  />
                </ListRow>
              ))}
            </ListSection>
          ))
        ) : (
          <ListSection header="Decision points" headerId="decisions">
            <ListRow>This plan has no decision points.</ListRow>
          </ListSection>
        )
      ) : null}
    </>
  );
}

function Equipment({ plan }: { plan: Plan }) {
  const equipment = plan.equipment ?? [];
  const mass = totalEquipmentMass(equipment);

  return (
    <ListSection
      header="Equipment"
      headerId="equipment"
      footer={`Known mass ${formatNumber(mass.known_kg, 1)} kg${mass.unknown ? ` · ${mass.unknown} item(s) without a mass in the catalog` : ""}.`}
    >
      {equipment.map((item) => (
        <ListRow
          key={item.tool}
          trailing={
            <Value>
              × {item.count}
              {item.mass_kg !== null && item.mass_kg !== undefined
                ? ` · ${formatNumber(item.mass_kg, 1)} kg`
                : ""}
            </Value>
          }
        >
          <RowLabel title={toolName(item.tool)} detail={item.justification} />
        </ListRow>
      ))}
    </ListSection>
  );
}
