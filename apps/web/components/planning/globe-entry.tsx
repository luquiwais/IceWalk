"use client";
import { Button } from "@icewalk/ui/button";
import { Footnote, Title1 } from "@icewalk/ui/text";
import { useMemo, useState } from "react";
import { MarsGlobe } from "@/components/globe/mars-globe";
import { TREK_OVERLAYS, type GlobeFocus, type GlobeOverlay, type GlobeZone, type RouteFeatureCollection } from "@/components/globe/globe-model";
import { ZONES } from "@/lib/evidence";
import { CRATER_XY } from "@/components/site/site-data";
import { gridToLonLat } from "@/lib/grid";
import type { Plan } from "@/lib/plan";

/** The site on the planet: the grid origin (contracts/grid.json), seen from 12 km. */
const SITE_FOCUS: GlobeFocus = { lonlat: gridToLonLat(CRATER_XY) };

/** NASA Exploration Zones with data, plus S1094b and SkyFall's AP-105, shaded by the 3 m radar P(ice). */
const ZONE_POINTS: GlobeZone[] = [
  ...ZONES.zones.filter((z) => z.site_assessment.status !== "no_data").map((z) => ({ id: `${z.name}-${z.lat_deg}`, lonlat: [z.lon_e_deg, z.lat_deg] as [number, number], label: z.name, p: z.site_assessment.tools.skyfall_radar?.p_ice })),
  { id: "ap-105", lonlat: [ZONES.skyfall.reference_site.lon_e_deg, ZONES.skyfall.reference_site.lat_deg], label: "SkyFall AP-105", p: ZONES.skyfall.reference_site.site_assessment.tools.skyfall_radar?.p_ice, highlight: true },
];

/**
 * Entry from the globe: Mars whole, then a flight to S1094b that hands over to
 * the site scene when it lands. "Enter site now" never waits for the flight.
 */
export function GlobeEntry({ plan, onEnter }: { plan: Plan; onEnter: () => void }) {
  const [flying, setFlying] = useState(false);
  const [overlay, setOverlay] = useState<GlobeOverlay>("none");
  const [showZones, setShowZones] = useState(true);
  const stations = useMemo(() => plan.stations.flatMap((s) => s.lonlat ? [{ id: s.id, lonlat: s.lonlat, label: `${s.order}` }] : []), [plan]);
  return <section className="mission-globe" aria-label="Mars globe">
    <MarsGlobe stations={stations} route={plan.route as RouteFeatureCollection} focus={flying ? SITE_FOCUS : undefined} onFocusComplete={onEnter} creditsClassName="mission-globe-credits" overlay={overlay} zones={showZones ? ZONE_POINTS : []} />
    <header className="mission-heading"><Title1 as="h2">Mars</Title1><Footnote>S1094b · 35.11°N, 189.83°E · 2021 impact site</Footnote></header>
    <div className="mission-globe-layers" role="group" aria-label="Globe layers">
      <Button variant="glass" size="small" aria-pressed={showZones} onClick={() => setShowZones((v) => !v)}>NASA exploration zones</Button>
      {(Object.keys(TREK_OVERLAYS) as Exclude<GlobeOverlay, "none">[]).map((k) => <Button key={k} variant="glass" size="small" aria-pressed={overlay === k} onClick={() => setOverlay((cur) => (cur === k ? "none" : k))}>{TREK_OVERLAYS[k].label}</Button>)}
      {showZones ? <Footnote>Zones shaded by P(ice within 3 m) for a SkyFall-class radar · NASA Mars Trek (EZMars) · regional prior</Footnote> : null}
    </div>
    <div className="mission-globe-actions">
      <Button variant="glass" disabled={flying} onClick={() => setFlying(true)}>{flying ? "Flying to S1094b…" : "Fly to S1094b"}</Button>
      <Button variant="glass" onClick={onEnter}>Enter site now</Button>
    </div>
  </section>;
}
