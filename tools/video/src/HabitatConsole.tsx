import React from "react";
import { Img, staticFile } from "remotion";
import { CornerPin } from "./ui/cornerpin";
import type { Rect } from "./film";

// Esquinas de los monitores medidas sobre R4_HAB (1344x752), escaladas a 1920x1080.
const S = 1920 / 1344;
type Pt = [number, number];
const q = (pts: number[][]) => pts.map(([x, y]) => [x * S, y * S]) as [Pt, Pt, Pt, Pt];
export const MON = {
  left: q([[404.5, 205.5], [678.1, 215.1], [677, 375.5], [404.5, 397]]),
  mid: q([[702, 220.8], [969.4, 220.8], [969.4, 375.5], [702, 378.3]]),
  small: q([[1022, 322.8], [1136.5, 321.6], [1130, 397], [1025, 395.3]]),
};

/** Encuadres para acercarse a cada monitor (16:9). */
export const VIEW: Record<string, Rect> = {
  wide: { x: 0, y: 0, w: 1920, h: 1080 },
  room: { x: 380, y: 160, w: 1300, h: 731 },
  left: { x: 512, y: 284, w: 521, h: 293 },
  mid: { x: 955, y: 294, w: 478, h: 269 },
  small: { x: 1440, y: 455, w: 205, h: 115 },
};

/** Placa del hábitat con las pantallas reales de IceWalk en sus monitores. */
export const HabitatConsole: React.FC<{ left?: React.ReactNode; mid?: React.ReactNode; small?: React.ReactNode }> = ({ left, mid, small }) => (
  <div style={{ position: "absolute", width: 1920, height: 1080 }}>
    <Img src={staticFile("plates/R4_HAB.png")} style={{ position: "absolute", width: 1920, height: 1080 }} />
    {left ? <CornerPin w={1920} h={1080} corners={MON.left}>{left}</CornerPin> : null}
    {mid ? <CornerPin w={1920} h={1080} corners={MON.mid}>{mid}</CornerPin> : null}
    {small ? <CornerPin w={1920} h={1080} corners={MON.small}>{small}</CornerPin> : null}
  </div>
);
