"use client";

import { Button, IconButton } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Ornament, OrnamentGroup, OrnamentItem } from "@icewalk/ui/ornament";
import { Sidebar, SidebarItem } from "@icewalk/ui/sidebar";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { TabBar } from "@icewalk/ui/tab-bar";
import { ToggleButton } from "@icewalk/ui/toggle-button";
import { NavigationBar, Window, WindowControls } from "@icewalk/ui/window";
import {
  Backpack,
  ChevronLeft,
  Clock,
  Crosshair,
  FlaskConical,
  Footprints,
  GitFork,
  Globe2,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Minus,
  Plus,
  Share,
} from "lucide-react";
import { useMemo, useState } from "react";

import { MarsGlobe } from "@/components/globe/mars-globe";

import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import {
  demoMeasurement,
  demoPlan,
  demoReplan,
  orderedStations,
  stationById,
  timelineViolations,
  toolName,
  totalEquipmentMass,
  type Plan,
} from "@/lib/plan";

import { PRIORITY_LABEL, RESULT_LABEL, RowLabel, Value, clock } from "./parts";
import { ReplanSummary } from "./replan-summary";
import { StationDetail } from "./station-detail";

type Section = "overview" | "stations" | "timeline" | "decisions" | "equipment";

const SECTIONS: { value: Section; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "Overview", icon: <LayoutGrid /> },
  { value: "stations", label: "Stations", icon: <MapPin /> },
  { value: "timeline", label: "Timeline", icon: <Clock /> },
  { value: "decisions", label: "Decision points", icon: <GitFork /> },
  { value: "equipment", label: "Equipment", icon: <Backpack /> },
];

const VIEWS = [
  { value: "planning", label: "Planning", icon: <MapIcon /> },
  { value: "ev", label: "EV", icon: <Footprints />, disabled: true },
  { value: "science", label: "Science", icon: <FlaskConical />, disabled: true },
];

const LAYERS = ["Ice probability", "Uncertainty", "Traversability", "HiRISE"];

/**
 * Planning view, composed like a visionOS app (Figma: Examples): a tab bar
 * ornament on the leading side, a window with sidebar and content, a toolbar
 * ornament on the window's bottom edge and the window bar below. Data: the
 * plan contract (lib/plan.ts); the demo measurement swaps in the replan.
 */
export function PlanningView({ backdrop }: { backdrop: "reference" | "mars" }) {
  const [section, setSection] = useState<Section>("overview");
  const [stationId, setStationId] = useState<string | null>(null);
  const [replanned, setReplanned] = useState(false);

  const plan: Plan = replanned ? demoReplan : demoPlan;
  const station = stationId ? stationById(plan, stationId) : undefined;
  const current = SECTIONS.find((s) => s.value === section) ?? SECTIONS[0];
  const canLogDemo = !replanned && station?.id === demoMeasurement.station_id;
  const [focusSite, setFocusSite] = useState(true);
  const site = useMemo(() => siteFocus(plan), [plan]);

  function openSection(value: Section) {
    setSection(value);
    setStationId(null);
  }

  function logDemoMeasurement() {
    setReplanned(true);
    setStationId(null);
    setSection("overview");
  }

  return (
    <main
      className={
        backdrop === "reference"
          ? "relative min-h-dvh bg-[url(/reference/visionos-room.jpg)] bg-cover bg-center"
          : "mars-backdrop relative min-h-dvh overflow-hidden"
      }
    >
      <h1 className="sr-only">IceWalk: EVA planning</h1>

      {backdrop === "mars" ? (
        <MarsGlobe
          stations={orderedStations(plan).flatMap((s) =>
            s.lonlat ? [{ id: s.id, lonlat: s.lonlat, label: `${s.order}. ${s.id}`, selected: s.id === stationId }] : [],
          )}
          route={plan.route as React.ComponentProps<typeof MarsGlobe>["route"]}
          focus={focusSite ? site : undefined}
          onSelectStation={setStationId}
        />
      ) : null}

      {/* The scene stays interactive around the windows: only they take pointer events. */}
      <div className="pointer-events-none relative flex min-h-dvh items-center gap-6 p-4 md:pl-[max(2rem,calc(50vw-34rem))] [&>*]:pointer-events-auto">
        <TabBar className="hidden md:block" label="Views" tabs={VIEWS} defaultValue="planning" />

        <div className="relative flex w-full flex-col items-center md:w-auto">
          <Window
            aria-labelledby="eva-title"
            className="h-[min(45rem,calc(100dvh-12rem))] w-full md:w-[57.5rem]"
          >
            <Sidebar className="hidden md:flex" label="EVA sections" title="EVA 1" titleId="eva-title">
              {SECTIONS.map((s) => (
                <SidebarItem
                  key={s.value}
                  icon={s.icon}
                  current={section === s.value}
                  counter={
                    s.value === "stations"
                      ? plan.stations.length
                      : s.value === "decisions"
                        ? plan.decision_points?.length
                        : s.value === "equipment"
                          ? plan.equipment?.length
                          : undefined
                  }
                  onSelect={() => openSection(s.value)}
                >
                  {s.label}
                </SidebarItem>
              ))}
            </Sidebar>

            <div className="flex min-w-0 flex-1 flex-col">
              <NavigationBar
                title={station ? `Station ${station.id}` : current.label}
                leading={
                  station ? (
                    <IconButton label="Back" onClick={() => setStationId(null)}>
                      <ChevronLeft />
                    </IconButton>
                  ) : undefined
                }
                trailing={
                  canLogDemo ? (
                    <Button size="small" onClick={logDemoMeasurement}>
                      Log measurement
                    </Button>
                  ) : (
                    <IconButton label="Share plan">
                      <Share />
                    </IconButton>
                  )
                }
              />
              {/* Keyed by what it shows, so each view opens scrolled to the top. */}
              <div
                key={`${plan.plan_id}-${section}-${station?.id ?? ""}`}
                className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 pb-24 md:px-10"
              >
                {station ? (
                  <StationDetail plan={plan} station={station} />
                ) : (
                  <SectionContent
                    plan={plan}
                    section={section}
                    replanned={replanned}
                    onOpenStation={setStationId}
                    onRevert={() => setReplanned(false)}
                  />
                )}
              </div>
            </div>
          </Window>

          {/* Toolbar ornament centered on the window's bottom edge (half of its 68pt height). */}
          <div className="pointer-events-none mt-4 flex w-full justify-center md:absolute md:inset-x-0 md:top-[calc(min(45rem,100dvh-12rem)-2.125rem)] md:mt-0">
            <Ornament aria-label="Map layers and camera" className="pointer-events-auto max-w-full">
              <OrnamentGroup aria-label="Layers">
                {LAYERS.map((layer, index) => (
                  <OrnamentItem
                    key={layer}
                    render={<ToggleButton appearance="toolbar" defaultPressed={index === 0} />}
                  >
                    {layer}
                  </OrnamentItem>
                ))}
              </OrnamentGroup>
              <OrnamentGroup aria-label="Camera">
                <OrnamentItem render={<IconButton label="Zoom in" variant="plain" />}>
                  <Plus />
                </OrnamentItem>
                <OrnamentItem render={<IconButton label="Zoom out" variant="plain" />}>
                  <Minus />
                </OrnamentItem>
                <OrnamentItem
                  render={
                    <IconButton
                      label={focusSite ? "Show whole Mars" : "Fly to site"}
                      variant="plain"
                      onClick={() => setFocusSite((f) => !f)}
                    />
                  }
                >
                  {focusSite ? <Globe2 /> : <Crosshair />}
                </OrnamentItem>
              </OrnamentGroup>
            </Ornament>
          </div>

          <WindowControls className="mt-6 hidden md:mt-[3.75rem] md:flex" />
        </div>
      </div>
    </main>
  );
}

/** Camera target: the centroid of the plan's stations, 1.5 km above the ellipsoid. */
function siteFocus(plan: Plan) {
  const points = plan.stations.flatMap((s) => (s.lonlat ? [s.lonlat] : []));
  if (!points.length) return undefined;
  const lon = points.reduce((a, p) => a + p[0], 0) / points.length;
  const lat = points.reduce((a, p) => a + p[1], 0) / points.length;
  return { lonlat: [lon, lat] as [number, number], heightM: 1_500 };
}

function SectionContent({
  plan,
  section,
  replanned,
  onOpenStation,
  onRevert,
}: {
  plan: Plan;
  section: Section;
  replanned: boolean;
  onOpenStation: (id: string) => void;
  onRevert: () => void;
}) {
  const { summary } = plan;
  const violations = timelineViolations(plan);

  return (
    <>
      {section === "overview" ? (
        <>
          {replanned ? (
            <ReplanSummary before={demoPlan} after={plan} measurement={demoMeasurement} onRevert={onRevert} />
          ) : null}
          {summary.is_mock ? <StatusBadge level="advisory">Illustrative values (mock plan)</StatusBadge> : null}
          {(plan.alerts ?? []).map((alert) => (
            <StatusBadge key={alert.message} level={alert.level}>
              {alert.message}
            </StatusBadge>
          ))}
          {violations.map((v) => (
            <StatusBadge key={v.index} level={v.level}>
              {v.message}
            </StatusBadge>
          ))}
          <ListSection header="Summary" headerId="summary" footer={`${plan.mission_id} · ${plan.plan_id}`}>
            <ListRow trailing={<Value>{formatDuration(summary.duration_min)}</Value>}>Duration</ListRow>
            <ListRow trailing={<Value>{formatNumber(summary.distance_km, 2)} km</Value>}>Traverse</ListRow>
            {summary.min_walkback_margin_min !== undefined ? (
              <ListRow trailing={<Value>{formatNumber(summary.min_walkback_margin_min, 0)} min</Value>}>
                Min walkback margin
              </ListRow>
            ) : null}
            {summary.max_distance_from_habitat_km !== undefined ? (
              <ListRow trailing={<Value>{formatNumber(summary.max_distance_from_habitat_km, 2)} km</Value>}>
                Max distance from habitat
              </ListRow>
            ) : null}
            {summary.dose_estimate_msv !== undefined ? (
              <ListRow trailing={<Value>{formatNumber(summary.dose_estimate_msv, 2)} mSv</Value>}>
                Dose estimate
              </ListRow>
            ) : null}
            {summary.crew !== undefined ? <ListRow trailing={<Value>{summary.crew}</Value>}>Crew</ListRow> : null}
            {summary.ice_threshold_m !== undefined ? (
              <ListRow trailing={<Value>≤ {summary.ice_threshold_m} m</Value>}>Ice depth threshold (STM)</ListRow>
            ) : null}
            {summary.craters_in_model !== undefined ? (
              <ListRow trailing={<Value>{summary.craters_in_model}</Value>}>Craters in the model</ListRow>
            ) : null}
            <ListRow trailing={<Value>{formatPercent(summary.expected_uncertainty_reduction)}</Value>}>
              Expected uncertainty reduction
            </ListRow>
          </ListSection>
        </>
      ) : null}

      {section === "overview" || section === "stations" ? (
        <ListSection header="Stations" headerId="stations">
          {orderedStations(plan).map((s) => (
            <ListRow
              key={s.id}
              onClick={() => onOpenStation(s.id)}
              trailing={
                <Value>
                  P(ice) {formatPercent(s.p_ice)} · {formatNumber(s.uncertainty, 2)} bits
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
        <ListSection header="EVA timeline" headerId="timeline" footer="Mission elapsed time (h:mm).">
          {plan.timeline.map((item, index) => {
            const violation = violations.find((v) => v.index === index);
            return (
              <ListRow
                key={`${item.kind}-${item.t_start_min}-${index}`}
                onClick={item.kind === "station" && item.station_id ? () => onOpenStation(item.station_id!) : undefined}
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
                      <span className={violation ? "font-semibold text-warning" : undefined}>
                        {violation ? "Warning: " : ""}Walkback margin {formatNumber(item.walkback_margin_min, 0)} min
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
                <ListRow key={option.rank} onClick={() => onOpenStation(point.station_id)}>
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

      {section === "equipment" ? <Equipment plan={plan} /> : null}
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
              {item.mass_kg !== null && item.mass_kg !== undefined ? ` · ${formatNumber(item.mass_kg, 1)} kg` : ""}
            </Value>
          }
        >
          <RowLabel title={toolName(item.tool)} detail={item.justification} />
        </ListRow>
      ))}
    </ListSection>
  );
}
