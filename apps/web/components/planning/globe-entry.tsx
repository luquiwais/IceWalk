"use client";
import { Button } from "@icewalk/ui/button";
import { Footnote, Title1 } from "@icewalk/ui/text";
import { useMemo, useState } from "react";
import { MarsGlobe } from "@/components/globe/mars-globe";
import type { GlobeFocus, RouteFeatureCollection } from "@/components/globe/globe-model";
import { CRATER_XY } from "@/components/site/site-data";
import { gridToLonLat } from "@/lib/grid";
import type { Plan } from "@/lib/plan";

/** The site on the planet: the grid origin (contracts/grid.json), seen from 12 km. */
const SITE_FOCUS: GlobeFocus = { lonlat: gridToLonLat(CRATER_XY) };

/**
 * Entry from the globe: Mars whole, then a flight to S1094b that hands over to
 * the site scene when it lands. "Enter site now" never waits for the flight.
 */
export function GlobeEntry({ plan, onEnter }: { plan: Plan; onEnter: () => void }) {
  const [flying, setFlying] = useState(false);
  const stations = useMemo(() => plan.stations.flatMap((s) => s.lonlat ? [{ id: s.id, lonlat: s.lonlat, label: `${s.order}` }] : []), [plan]);
  return <section className="mission-globe" aria-label="Mars globe">
    <MarsGlobe stations={stations} route={plan.route as RouteFeatureCollection} focus={flying ? SITE_FOCUS : undefined} onFocusComplete={onEnter} creditsClassName="mission-globe-credits" />
    <header className="mission-heading"><Title1 as="h2">Mars</Title1><Footnote>S1094b · 35.11°N, 189.83°E · 2021 impact site</Footnote></header>
    <div className="mission-globe-actions">
      <Button variant="glass" disabled={flying} onClick={() => setFlying(true)}>{flying ? "Flying to S1094b…" : "Fly to S1094b"}</Button>
      <Button variant="glass" onClick={onEnter}>Enter site now</Button>
    </div>
  </section>;
}
