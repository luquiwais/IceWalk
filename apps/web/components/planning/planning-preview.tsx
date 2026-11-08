import { Crosshair, House, Minus, Plus } from "lucide-react";

import { IconButton } from "@icewalk/ui/button";
import { ListRow, ListSection } from "@icewalk/ui/list";
import { Material } from "@icewalk/ui/material";
import { Metric, MetricList } from "@icewalk/ui/metric";
import { Ornament, OrnamentGroup, OrnamentItem } from "@icewalk/ui/ornament";
import { SegmentedControl } from "@icewalk/ui/segmented-control";
import { StatusBadge } from "@icewalk/ui/status-badge";
import { ToggleButton } from "@icewalk/ui/toggle-button";
import { Window, WindowBody, WindowHeader } from "@icewalk/ui/window";
import { formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { demoPlan, type Priority } from "@/lib/plan";

const VIEWS = [
  { value: "planning", label: "Planning" },
  { value: "ev", label: "EV", disabled: true },
  { value: "science", label: "Science", disabled: true },
];

const LAYERS = ["Ice probability", "Uncertainty", "Traversability", "HiRISE"];

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * Base layout of the Planning view, with the mock plan. The 3D scene (Cesium)
 * will replace the backdrop behind the glass.
 */
export function PlanningPreview() {
  const { summary, stations, mission_id, plan_id } = demoPlan;
  const orderedStations = [...stations].sort((a, b) => a.order - b.order);

  return (
    <main className="relative flex min-h-dvh flex-col p-4 pb-32 sm:p-6 sm:pb-32">
      <h1 className="sr-only">IceWalk: EVA planning</h1>

      <div className="flex items-center justify-center gap-4 sm:justify-between">
        <p translate="no" className="hidden text-title-3 tracking-tight sm:block">
          IceWalk
        </p>
        <Ornament aria-label="View" className="p-2">
          <SegmentedControl label="View" options={VIEWS} defaultValue="planning" />
        </Ornament>
        <div className="hidden w-[4.5rem] sm:block" aria-hidden />
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        <Window aria-labelledby="eva-title" className="w-full lg:max-w-lg">
          <WindowHeader
            id="eva-title"
            title="EVA 1"
            subtitle={`${mission_id} · Plan ${plan_id} · S1094b, Amazonis Planitia`}
            actions={
              <IconButton label="Center on habitat">
                <House />
              </IconButton>
            }
          />
          <WindowBody>
            {summary.is_mock ? (
              <StatusBadge level="advisory">Illustrative values (mock plan)</StatusBadge>
            ) : null}

            <Material kind="regular" className="rounded-row p-5">
              <MetricList>
                <Metric label="Duration" value={formatDuration(summary.duration_min)} />
                <Metric label="Traverse" value={formatNumber(summary.distance_km, 1)} unit="km" />
                {summary.min_walkback_margin_min !== undefined ? (
                  <Metric
                    label="Min walkback margin"
                    value={formatNumber(summary.min_walkback_margin_min, 0)}
                    unit="min"
                  />
                ) : null}
                {summary.max_distance_from_habitat_km !== undefined ? (
                  <Metric
                    label="Max from habitat"
                    value={formatNumber(summary.max_distance_from_habitat_km, 1)}
                    unit="km"
                  />
                ) : null}
                {summary.dose_estimate_msv !== undefined ? (
                  <Metric
                    label="Dose estimate"
                    value={formatNumber(summary.dose_estimate_msv, 2)}
                    unit="mSv"
                  />
                ) : null}
                <Metric
                  label="Uncertainty reduced"
                  value={formatPercent(summary.expected_uncertainty_reduction)}
                />
              </MetricList>
            </Material>

            <ListSection header="Stations" headerId="stations-title">
              {orderedStations.map((station) => (
                <ListRow
                  key={station.id}
                  trailing={
                    <span className="flex flex-col items-end text-footnote tabular-nums">
                      <span>
                        P(ice) <span className="font-bold">{formatPercent(station.p_ice)}</span>
                      </span>
                      <span className="vibrant-secondary">
                        ±{formatNumber(station.uncertainty, 2)} · {formatDuration(station.duration_min)}
                      </span>
                    </span>
                  }
                >
                  <span className="vision-surface vision-platter relative grid size-8 shrink-0 place-items-center rounded-full text-footnote font-bold tabular-nums">
                    <span aria-hidden data-vision-layer className="vision-layer vision-fill-lighten" />
                    <span aria-hidden data-vision-layer className="vision-layer vision-fill-dodge" />
                    <span>{station.order}</span>
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">Station {station.id}</span>
                    <span className="vibrant-secondary truncate text-footnote">
                      {PRIORITY_LABEL[station.priority]} priority ·{" "}
                      {station.tools.join(", ").replaceAll("_", " ")}
                    </span>
                  </span>
                </ListRow>
              ))}
            </ListSection>
          </WindowBody>
        </Window>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-6 flex justify-center">
        <Ornament
          aria-label="Map layers and camera"
          className="pointer-events-auto max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
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
    </main>
  );
}
