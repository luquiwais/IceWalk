import React from "react";
import { Freeze, staticFile, useCurrentFrame } from "remotion";
import { CornerPin } from "./ui/cornerpin";
import { Video } from "@remotion/media";
import motion from "./scene-motion.json";
import type { Rect } from "./film";
import geometry from "./scene-geometry.json";

type Pt = [number, number];
export const MON = {
  left: geometry.main as [Pt, Pt, Pt, Pt],
  mid: geometry.review as [Pt, Pt, Pt, Pt],
};
export const VIEW: Record<string, Rect> = {
  room: { x: 0, y: 0, w: 1920, h: 1080 },
  left: { x: 225, y: 95, w: 1000, h: 562.5 },
  mid: { x: 225, y: 95, w: 1000, h: 562.5 },
};

/** Physical console rendered in Blender; screen positions projected by its camera. */
export const HabitatConsole: React.FC<{ left?: React.ReactNode; mid?: React.ReactNode; small?: React.ReactNode }> = ({ left, mid, small }) => {
  const frame = Math.min(71, useCurrentFrame());
  const corners = motion[frame].main as [Pt, Pt, Pt, Pt];
  return (
  <div style={{ position: "absolute", width: 1920, height: 1080 }}>
    <Freeze frame={frame}><Video src={staticFile("cinema/console-motion.mp4")} muted style={{ position: "absolute", width: 1920, height: 1080 }} /></Freeze>
    {left || mid || small ? <CornerPin w={1920} h={1080} corners={corners} glow={0} blur={0.25} opacity={1}>{left ?? mid ?? small}</CornerPin> : null}
  </div>
);
};
