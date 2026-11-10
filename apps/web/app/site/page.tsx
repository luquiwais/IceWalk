"use client";

/**
 * Development page for SiteScene (docs/plans/web-design.md, stage 1): the scene
 * full screen with the demo plan, its re-plan diff and the layer controls.
 * Not the app: Planning composes SiteScene with its own chrome in stage 2.
 */
import { Button } from "@icewalk/ui/button";
import { Ornament, OrnamentGroup, OrnamentItem } from "@icewalk/ui/ornament";
import { Caption1, Headline } from "@icewalk/ui/text";
import { ToggleButton } from "@icewalk/ui/toggle-button";
import { useRef, useState, type CSSProperties } from "react";

import type { Insets } from "@/components/site/camera";
import { SiteScene, type SiteLayers, type SiteSceneHandle } from "@/components/site/site-scene";
import { demoPlan, demoReplan } from "@/lib/plan";

import "./site-page.css";

/** The free area of this page: the title above and the controls below. */
const PAGE_INSETS: Insets = { top: 88, right: 0, bottom: 104, left: 0 };
/** Stage 2 Planning layout at 1440x900: tab bar, 400 px window, 96 px timeline. */
/** Ornament items: the kit's 44 px toolbar height with Callout text, to sit quietly over the map. */
const CONTROL = "h-11 px-4 text-callout";
const PLANNING_INSETS: Insets = { top: 88, right: 440, bottom: 176, left: 96 };

export default function SitePage() {
  const scene = useRef<SiteSceneHandle>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [layers, setLayers] = useState<SiteLayers>({ grid: true, rings: true });
  const [replan, setReplan] = useState(false);
  const [planningChrome, setPlanningChrome] = useState(false);

  const plan = replan ? demoReplan : demoPlan;
  const insets = planningChrome ? PLANNING_INSETS : PAGE_INSETS;
  const toggleLayer = (key: keyof SiteLayers) => (pressed: boolean) => setLayers((l) => ({ ...l, [key]: pressed }));

  return (
    <main className="site-page">
      <SiteScene
        ref={scene}
        plan={plan}
        previousPlan={replan ? demoPlan : undefined}
        selectedStationId={plan.stations.some((s) => s.id === selected) ? selected : null}
        hoveredStationId={hovered}
        onSelectStation={setSelected}
        onHoverStation={setHovered}
        layers={layers}
        insets={insets}
      />

      {planningChrome ? (
        <div className="site-page-chrome" aria-hidden style={{ "--chrome-right": `${insets.right}px`, "--chrome-bottom": `${insets.bottom}px`, "--chrome-left": `${insets.left}px` } as CSSProperties}>
          <span data-zone="left" />
          <span data-zone="right" />
          <span data-zone="bottom" />
        </div>
      ) : null}

      <header className="site-page-title">
        <Headline as="h1">IceWalk</Headline>
        <Caption1 as="p" tone="inherit" className="site-page-subtitle">
          S1094b · 35.11°N 189.83°E · {plan.plan_id}
          {replan ? ` (re-plan of ${plan.replanned_from})` : ""}
        </Caption1>
      </header>

      <div className="site-page-controls">
        <Ornament aria-label="Scene controls">
          <OrnamentGroup aria-label="Layers">
            <OrnamentItem render={<ToggleButton appearance="toolbar" className={CONTROL} pressed disabled />}>Imagery</OrnamentItem>
            <OrnamentItem
              render={<ToggleButton appearance="toolbar" className={CONTROL} pressed={layers.grid} onPressedChange={toggleLayer("grid")} />}
            >
              Grid
            </OrnamentItem>
            <OrnamentItem
              render={<ToggleButton appearance="toolbar" className={CONTROL} pressed={layers.rings} onPressedChange={toggleLayer("rings")} />}
            >
              Range rings
            </OrnamentItem>
            <OrnamentItem
              render={<ToggleButton appearance="toolbar" className={CONTROL} disabled aria-label="Ice potential, awaiting /maps" />}
            >
              Ice potential · Awaiting /maps
            </OrnamentItem>
          </OrnamentGroup>
          <span className="site-page-separator" aria-hidden />
          <OrnamentGroup aria-label="Plan">
            <OrnamentItem render={<ToggleButton appearance="toolbar" className={CONTROL} pressed={replan} onPressedChange={setReplan} />}>
              Re-plan diff
            </OrnamentItem>
            <OrnamentItem render={<Button variant="plain" className={CONTROL} onClick={() => scene.current?.fit()} />}>Frame plan</OrnamentItem>
            <OrnamentItem
              render={<ToggleButton appearance="toolbar" className={CONTROL} pressed={planningChrome} onPressedChange={setPlanningChrome} />}
            >
              Planning insets
            </OrnamentItem>
          </OrnamentGroup>
        </Ornament>
      </div>
    </main>
  );
}
