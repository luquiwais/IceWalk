"use client";

import { Button } from "@icewalk/ui/button";
import { Caption1 } from "@icewalk/ui/text";
import { orderedStations, type Plan } from "@/lib/plan";
import { type DesignLayer } from "@/mock/design-session";

// Display coordinates for the illustrative scene. They are not georeferenced imagery.
const SCENE_POINTS: Record<string, [number, number]> = {
  E03S22: [295, 510],
  E04S22: [390, 435],
  E04S23: [490, 470],
  E03S23: [555, 390],
  E02S23: [645, 430],
  E01S23: [715, 345],
  E02S22: [600, 520],
};
export function SiteMap({
  plan,
  selectedId,
  onSelect,
  zoom,
  layer,
  replanned,
}: {
  plan: Plan;
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoom: number;
  layer: DesignLayer;
  replanned: boolean;
}) {
  const scale = 1.12 ** zoom;
  const points = orderedStations(plan).map((s, i) => {
    const [x, y] = SCENE_POINTS[s.id] ?? [300 + i * 65, 450];
    return { ...s, x: 500 + (x - 500) * scale, y: 350 + (y - 350) * scale };
  });
  return (
    <div className="site-map" data-layer={layer}>
      <div
        className="site-map-image"
        style={{ transform: `scale(${scale})` }}
      />
      <svg viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="site-potential">
            <stop stopColor="#c1b2e4" stopOpacity=".3" />
            <stop offset="1" stopColor="#9885c2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="site-uncertainty">
            <stop stopColor="white" stopOpacity=".28" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <pattern
            id="site-hatch"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <path d="M0 0V12" stroke="white" strokeOpacity=".2" />
          </pattern>
        </defs>
        {layer === "potential" ? (
          <ellipse
            cx="560"
            cy="430"
            rx="250"
            ry="170"
            fill="url(#site-potential)"
          />
        ) : null}
        {layer === "uncertainty" ? (
          <ellipse
            cx="460"
            cy="360"
            rx="240"
            ry="190"
            fill="url(#site-uncertainty)"
          />
        ) : null}
        {layer === "traversability" ? (
          <ellipse cx="760" cy="365" rx="110" ry="80" fill="url(#site-hatch)" />
        ) : null}
        {layer === "targets" ? (
          <g
            fill="none"
            stroke="white"
            strokeOpacity=".65"
            strokeWidth="1"
            strokeDasharray="4 6"
          >
            <ellipse cx="760" cy="365" rx="110" ry="80" />
            <circle cx="555" cy="390" r="45" />
            <circle cx="645" cy="430" r="30" />
          </g>
        ) : null}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="white"
          strokeOpacity=".45"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        {replanned ? (
          <polyline
            points="295,510 390,435 490,470 555,390 645,430 715,345"
            fill="none"
            stroke="white"
            strokeOpacity=".22"
            strokeWidth="1"
            strokeDasharray="4 7"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
      <div className="site-map-hit-layer">
        {points.map((s) => (
          <Button
            key={s.id}
            shape="circle"
            variant="glass"
            className={`site-map-marker ${s.id === selectedId ? "vision-selected" : ""}`}
            aria-label={`Map ${s.id}`}
            aria-pressed={s.id === selectedId}
            onClick={() => onSelect(s.id)}
            style={{ left: `${s.x / 10}%`, top: `${s.y / 7}%` }}
          >
            <span aria-hidden="true">{s.order}</span>
            <Caption1
              as="span"
              aria-hidden="true"
              className="site-map-station-label"
            >
              {s.id}
            </Caption1>
          </Button>
        ))}
      </div>
    </div>
  );
}
