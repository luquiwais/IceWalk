import { Crosshair, House, Layers, Plus, Minus } from "lucide-react";

import { Button, IconButton } from "@/components/ui/button";
import { Metric, MetricList } from "@/components/ui/metric";
import {
  Ornament,
  OrnamentGroup,
  OrnamentItem,
  OrnamentSeparator,
} from "@/components/ui/ornament";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToggleButton } from "@/components/ui/toggle-button";
import { Window, WindowBody, WindowHeader, WindowSection } from "@/components/ui/window";
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
    <main className="relative flex min-h-dvh flex-col p-4 sm:p-6">
      <h1 className="sr-only">IceWalk: EVA planning</h1>

      <div className="flex items-center justify-between gap-4">
        <p translate="no" className="text-headline font-bold tracking-tight">
          IceWalk
        </p>
        <Ornament aria-label="View">
          <SegmentedControl label="View" options={VIEWS} defaultValue="planning" />
        </Ornament>
        <div className="w-[4.5rem]" aria-hidden />
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-6 lg:flex-row lg:items-start">
        <Window aria-labelledby="eva-title" className="w-full lg:max-w-md">
          <WindowHeader
            id="eva-title"
            title={`EVA 1 · ${mission_id}`}
            subtitle={`Plan ${plan_id} · S1094b, Amazonis Planitia`}
            actions={
              <IconButton label="Center on habitat" size="small">
                <House />
              </IconButton>
            }
          />
          <WindowBody>
            {summary.is_mock ? (
              <StatusBadge level="advisory">Illustrative values (mock plan)</StatusBadge>
            ) : null}

            <WindowSection>
              <MetricList>
                <Metric label="Duration" value={formatDuration(summary.duration_min)} />
                <Metric
                  label="Traverse"
                  value={formatNumber(summary.distance_km, 1)}
                  unit="km"
                />
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
            </WindowSection>

            <section aria-labelledby="stations-title" className="flex flex-col gap-2">
              <h3 id="stations-title" className="px-1 text-headline font-bold">
                Stations
              </h3>
              <ol className="flex flex-col gap-1">
                {orderedStations.map((station) => (
                  <li key={station.id}>
                    <Button
                      variant="borderless"
                      shape="rounded"
                      className="h-auto w-full justify-between gap-4 px-3 py-2.5 text-left font-medium"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fill text-footnote font-bold tabular-nums">
                          {station.order}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="font-bold">Station {station.id}</span>
                          <span className="truncate text-footnote text-label-secondary">
                            {PRIORITY_LABEL[station.priority]} priority ·{" "}
                            {station.tools.join(", ").replaceAll("_", " ")}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end text-footnote tabular-nums">
                        <span>
                          P(ice) <span className="font-bold">{formatPercent(station.p_ice)}</span>
                        </span>
                        <span className="text-label-secondary">
                          ±{formatNumber(station.uncertainty, 2)} · {formatDuration(station.duration_min)}
                        </span>
                      </span>
                    </Button>
                  </li>
                ))}
              </ol>
            </section>
          </WindowBody>
        </Window>
      </div>

      <div className="pointer-events-none sticky bottom-4 mt-6 flex justify-center sm:bottom-6">
        <Ornament
          aria-label="Map layers and camera"
          className="pointer-events-auto max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
        >
          <OrnamentGroup aria-label="Layers">
            <Layers aria-hidden className="mx-2 size-5 text-label-secondary" />
            {LAYERS.map((layer, index) => (
              <OrnamentItem
                key={layer}
                render={
                  <ToggleButton
                    variant="borderless"
                    size="small"
                    defaultPressed={index === 0}
                  />
                }
              >
                {layer}
              </OrnamentItem>
            ))}
          </OrnamentGroup>
          <OrnamentSeparator />
          <OrnamentGroup aria-label="Camera">
            <OrnamentItem
              render={<IconButton label="Zoom in" variant="borderless" size="small" />}
            >
              <Plus />
            </OrnamentItem>
            <OrnamentItem
              render={<IconButton label="Zoom out" variant="borderless" size="small" />}
            >
              <Minus />
            </OrnamentItem>
            <OrnamentItem
              render={<IconButton label="Fly to site" variant="borderless" size="small" />}
            >
              <Crosshair />
            </OrnamentItem>
          </OrnamentGroup>
        </Ornament>
      </div>
    </main>
  );
}
