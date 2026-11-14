"use client";
import { Button } from "@icewalk/ui/button";
import { Footnote } from "@icewalk/ui/text";
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

/** Phase 1 scene: Mars whole, with the NASA zones; `flying` flies to S1094b and calls `onArrive`. */
export function GlobeEntry({ plan, flying, onArrive }: { plan: Plan; flying: boolean; onArrive: () => void }) {
  const [overlay, setOverlay] = useState<GlobeOverlay>("none");
  const [showZones, setShowZones] = useState(true);
  const stations = useMemo(() => plan.stations.flatMap((s) => s.lonlat ? [{ id: s.id, lonlat: s.lonlat, label: `${s.order}` }] : []), [plan]);
  return <section className="mission-globe" aria-label="Mars globe">
    <MarsGlobe stations={stations} route={plan.route as RouteFeatureCollection} focus={flying ? SITE_FOCUS : undefined} onFocusComplete={onArrive} creditsClassName="mission-globe-credits" overlay={overlay} zones={showZones ? ZONE_POINTS : []} />
    <div className="mission-globe-layers" role="group" aria-label="Globe layers">
      <Button variant="glass" size="small" aria-pressed={showZones} onClick={() => setShowZones((v) => !v)}>NASA exploration zones</Button>
      {(Object.keys(TREK_OVERLAYS) as Exclude<GlobeOverlay, "none">[]).map((k) => <Button key={k} variant="glass" size="small" aria-pressed={overlay === k} onClick={() => setOverlay((cur) => (cur === k ? "none" : k))}>{TREK_OVERLAYS[k].label}</Button>)}
      {showZones ? <Footnote>NASA Mars Trek (EZMars) · regional prior</Footnote> : null}
    </div>
  </section>;
}
