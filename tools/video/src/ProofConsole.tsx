import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { CornerPin } from "./ui/cornerpin";
import { Campaign, ConsoleMap, ReviewCard } from "./ui/screens";

// Esquinas medidas sobre R4_HAB (1344x752), escaladas a 1920x1080.
const S = 1920 / 1344;
type Pt = [number, number];
const q = (pts: number[][]) => pts.map(([x, y]) => [x * S, y * S]) as [Pt, Pt, Pt, Pt];
const LEFT = q([[404.5, 205.5], [678.1, 215.1], [677, 375.5], [404.5, 397]]);
const MID = q([[702, 220.8], [969.4, 220.8], [969.4, 375.5], [702, 378.3]]);
const SMALL = q([[1022, 322.8], [1136.5, 321.6], [1130, 397], [1025, 395.3]]);

/** Prueba de composición: pantallas reales de IceWalk dentro del plano del hábitat. */
export const ProofConsole: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Img src={staticFile("plates/R4_HAB.png")} style={{ width: 1920, height: 1080 }} />
    <CornerPin w={1920} h={1080} corners={LEFT}><ConsoleMap state="after" /></CornerPin>
    <CornerPin w={1920} h={1080} corners={MID}><ReviewCard /></CornerPin>
    <CornerPin w={1920} h={1080} corners={SMALL}><Campaign /></CornerPin>
  </AbsoluteFill>
);
