"use client";

import { IconButton } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Ornament, OrnamentGroup, OrnamentItem } from "@icewalk/ui/ornament";
import { Sidebar, SidebarItem } from "@icewalk/ui/sidebar";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { TabBar } from "@icewalk/ui/tab-bar";
import { Body, Footnote } from "@icewalk/ui/text";
import { ToggleButton } from "@icewalk/ui/toggle-button";
import { NavigationBar, Window, WindowControls } from "@icewalk/ui/window";
import {
  Backpack,
  Clock,
  Crosshair,
  FlaskConical,
  Footprints,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Minus,
  Plus,
  Share,
} from "lucide-react";
import { useState } from "react";

import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { demoPlan, type Priority } from "@/lib/plan";

type Section = "overview" | "stations" | "timeline" | "equipment";

const SECTIONS: { value: Section; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "Overview", icon: <LayoutGrid /> },
  { value: "stations", label: "Stations", icon: <MapPin /> },
  { value: "timeline", label: "Timeline", icon: <Clock /> },
  { value: "equipment", label: "Equipment", icon: <Backpack /> },
];

const VIEWS = [
  { value: "planning", label: "Planning", icon: <MapIcon /> },
  { value: "ev", label: "EV", icon: <Footprints />, disabled: true },
  { value: "science", label: "Science", icon: <FlaskConical />, disabled: true },
];

const LAYERS = ["Ice probability", "Uncertainty", "Traversability", "HiRISE"];

const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

function clock(minutes: number) {
  const total = Math.round(minutes);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <Body as="span" tone="secondary" className="tabular-nums">
      {children}
    </Body>
  );
}

/**
 * Planning view, composed like a visionOS app (Figma: Examples): a tab bar
 * ornament on the leading side, a window with sidebar and content, a toolbar
 * ornament on the window's bottom edge and the window bar below.
 */
export function PlanningView({ backdrop }: { backdrop: "reference" | "mars" }) {
  const [section, setSection] = useState<Section>("overview");
  const { summary, stations, timeline, equipment, mission_id } = demoPlan;
  const ordered = [...stations].sort((a, b) => a.order - b.order);
  const current = SECTIONS.find((s) => s.value === section) ?? SECTIONS[0];

  return (
    <main
      className={
        backdrop === "reference"
          ? "relative min-h-dvh bg-[url(/reference/visionos-room.jpg)] bg-cover bg-center"
          : "mars-backdrop relative min-h-dvh"
      }
    >
      <h1 className="sr-only">IceWalk: EVA planning</h1>

      <div className="flex min-h-dvh items-center gap-6 p-4 md:pl-[max(2rem,calc(50vw-34rem))]">
        <TabBar className="hidden md:block" label="Views" tabs={VIEWS} defaultValue="planning" />

        <div className="relative flex w-full flex-col items-center md:w-auto">
          <Window
            aria-labelledby="eva-title"
            className="h-[min(45rem,calc(100dvh-12rem))] w-full md:w-[57.5rem]"
          >
            <Sidebar
              className="hidden md:flex"
              label="EVA sections"
              title="EVA 1"
              titleId="eva-title"
            >
              {SECTIONS.map((s) => (
                <SidebarItem
                  key={s.value}
                  icon={s.icon}
                  current={section === s.value}
                  counter={
                    s.value === "stations"
                      ? stations.length
                      : s.value === "equipment"
                        ? equipment?.length
                        : undefined
                  }
                  onSelect={() => setSection(s.value)}
                >
                  {s.label}
                </SidebarItem>
              ))}
            </Sidebar>

            <div className="flex min-w-0 flex-1 flex-col">
              <NavigationBar
                title={current.label}
                trailing={
                  <IconButton label="Share plan">
                    <Share />
                  </IconButton>
                }
              />
              <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 pb-24 md:px-10">
                {section === "overview" ? (
                  <>
                    {summary.is_mock ? (
                      <StatusBadge level="advisory">Illustrative values (mock plan)</StatusBadge>
                    ) : null}
                    <ListSection header="Summary" headerId="summary" footer={mission_id}>
                      <ListRow trailing={<Value>{formatDuration(summary.duration_min)}</Value>}>Duration</ListRow>
                      <ListRow trailing={<Value>{formatNumber(summary.distance_km, 1)} km</Value>}>Traverse</ListRow>
                      {summary.min_walkback_margin_min !== undefined ? (
                        <ListRow trailing={<Value>{formatNumber(summary.min_walkback_margin_min, 0)} min</Value>}>
                          Min walkback margin
                        </ListRow>
                      ) : null}
                      {summary.max_distance_from_habitat_km !== undefined ? (
                        <ListRow trailing={<Value>{formatNumber(summary.max_distance_from_habitat_km, 1)} km</Value>}>
                          Max distance from habitat
                        </ListRow>
                      ) : null}
                      {summary.dose_estimate_msv !== undefined ? (
                        <ListRow trailing={<Value>{formatNumber(summary.dose_estimate_msv, 2)} mSv</Value>}>
                          Dose estimate
                        </ListRow>
                      ) : null}
                      <ListRow trailing={<Value>{formatPercent(summary.expected_uncertainty_reduction)}</Value>}>
                        Expected uncertainty reduction
                      </ListRow>
                    </ListSection>
                  </>
                ) : null}

                {section === "overview" || section === "stations" ? (
                  <ListSection header="Stations" headerId="stations">
                    {ordered.map((station) => (
                      <ListRow
                        key={station.id}
                        onClick={() => setSection("stations")}
                        trailing={
                          <Value>
                            P(ice) {formatPercent(station.p_ice)} · ±{formatNumber(station.uncertainty, 2)}
                          </Value>
                        }
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">
                            {station.order}. Station {station.id}
                          </span>
                          <Footnote as="span" tone="secondary" className="truncate">
                            {PRIORITY_LABEL[station.priority]} priority · {formatDuration(station.duration_min)} ·{" "}
                            {station.tools.join(", ").replaceAll("_", " ")}
                          </Footnote>
                        </span>
                      </ListRow>
                    ))}
                  </ListSection>
                ) : null}

                {section === "timeline" ? (
                  <ListSection header="EVA timeline" headerId="timeline">
                    {timeline.map((item) => (
                      <ListRow
                        key={`${item.kind}-${item.t_start_min}`}
                        trailing={
                          <Value>
                            {clock(item.t_start_min)}–{clock(item.t_end_min)}
                          </Value>
                        }
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{item.label}</span>
                          {item.walkback_margin_min !== undefined ? (
                            <Footnote as="span" tone="secondary" className="truncate">
                              Walkback margin {formatNumber(item.walkback_margin_min, 0)} min
                            </Footnote>
                          ) : null}
                        </span>
                      </ListRow>
                    ))}
                  </ListSection>
                ) : null}

                {section === "equipment" ? (
                  <ListSection header="Equipment" headerId="equipment">
                    {(equipment ?? []).map((item) => (
                      <ListRow key={item.tool} trailing={<Value>× {item.count}</Value>}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{item.tool.replaceAll("_", " ")}</span>
                          {item.justification ? (
                            <Footnote as="span" tone="secondary" className="truncate">{item.justification}</Footnote>
                          ) : null}
                        </span>
                      </ListRow>
                    ))}
                  </ListSection>
                ) : null}
              </div>
            </div>
          </Window>

          {/* Toolbar ornament centered on the window's bottom edge (half of its 68pt height). */}
          <div className="pointer-events-none mt-4 flex w-full justify-center md:absolute md:inset-x-0 md:top-[calc(min(45rem,100dvh-12rem)-2.125rem)] md:mt-0">
            <Ornament
              aria-label="Map layers and camera"
              className="pointer-events-auto max-w-full"
            >
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
                <OrnamentItem render={<IconButton label="Fly to site" variant="plain" />}>
                  <Crosshair />
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
