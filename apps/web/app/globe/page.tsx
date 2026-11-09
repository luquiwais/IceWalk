"use client";

import { useState } from "react";

import { MarsGlobe } from "@/components/globe/mars-globe";
import plan from "@/mock/plan.json";

// Preview page for the Mars background: mock plan stations and route, camera on S1094b.
const stations = plan.stations.map((s) => ({
  id: s.id,
  lonlat: s.lonlat as [number, number],
}));
// Crater S1094b is at 189.8273 E, 35.1105 N (grid.json); the EVA area is ~4 km south of it.
// Frame the stations themselves.
const lon = stations.reduce((a, s) => a + s.lonlat[0], 0) / stations.length;
const lat = stations.reduce((a, s) => a + s.lonlat[1], 0) / stations.length;
const FOCUS = { lonlat: [lon, lat] as [number, number], heightM: 1_500 };

export default function GlobePreviewPage() {
  const [selected, setSelected] = useState<string | null>(stations[0]?.id ?? null);
  const [focused, setFocused] = useState(true);
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-black">
      <MarsGlobe
        stations={stations.map((s) => ({ ...s, selected: s.id === selected }))}
        route={plan.route as never}
        focus={focused ? FOCUS : undefined}
        onSelectStation={setSelected}
      />
      <div className="absolute left-3 top-3 flex items-center gap-3 text-xs text-white/70">
        <p>MarsGlobe preview · selected: {selected ?? "none"}</p>
        <button
          type="button"
          className="rounded-full border border-white/30 px-3 py-1 hover:bg-white/10"
          onClick={() => setFocused((f) => !f)}
        >
          {focused ? "Show whole globe" : "Fly to S1094b"}
        </button>
      </div>
    </main>
  );
}
