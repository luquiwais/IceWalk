import React from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, Freeze, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { HabitatConsole, VIEW } from "./HabitatConsole";
import { FULL, Move } from "./film";
import { D, T } from "./ui/theme";
import { ArHud, Campaign, ConsoleMap, DepthColumn, ReviewCard } from "./ui/screens";

export const MapChange: React.FC = () => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [18, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill><ConsoleMap state="before" /><AbsoluteFill style={{ opacity }}><ConsoleMap state="after" /></AbsoluteFill></AbsoluteFill>;
};

export const ConsoleScene: React.FC<{ mode?: "before" | "after" | "change" | "review" | "confirmed" | "campaign"; wide?: boolean; duration?: number; children?: React.ReactNode }> = ({ mode = "before", wide = false, duration = 84, children }) => {
  const f = useCurrentFrame();
  const screen = children ?? (mode === "change" ? <MapChange /> : mode === "review" || mode === "confirmed" ? <ReviewCard confirmed={mode === "confirmed" || f > duration * .7} /> : mode === "campaign" ? <Campaign /> : <ConsoleMap state={mode} />);
  return <AbsoluteFill>
    <Move from={wide ? FULL : VIEW.left} to={wide ? { x: 50, y: 22, w: 1820, h: 1023.75 } : { x: 240, y: 106, w: 970, h: 545.625 }} dur={duration}>
      <HabitatConsole left={screen} />
    </Move>
  </AbsoluteFill>;
};

export const DrillScene: React.FC<{ depth?: boolean; duration?: number }> = ({ depth = false }) => {
  const frame = Math.min(71, useCurrentFrame());
  return <AbsoluteFill>
    <Freeze frame={frame}><Video src={staticFile("cinema/drill-motion.mp4")} muted style={{ width: 1920, height: 1080 }} /></Freeze>
    {depth ? <><AbsoluteFill style={{ background: "rgba(0,0,0,.22)" }} /><DepthColumn /></> : null}
  </AbsoluteFill>;
};

export const SurfaceScene: React.FC<{ ar?: boolean; duration?: number }> = ({ ar = false }) => {
  const frame = Math.min(71, useCurrentFrame());
  return <AbsoluteFill>
    <Freeze frame={frame}><Video src={staticFile("cinema/walk-proof.mp4")} muted style={{ width: 1920, height: 1080 }} /></Freeze>
    {ar ? <ArHud /> : null}
  </AbsoluteFill>;
};

export const WalkRigProof: React.FC = () => <><Video src={staticFile("cinema/walk-proof.mp4")} muted style={{ width: 1920, height: 1080 }} /><Credit text="RIG / CAMERA PROOF · material and foot contact in review" /></>;

export const OrbitScene: React.FC<{ duration?: number }> = ({ duration = 36 }) => (
  <Move from={{ x: 620, y: 450, w: 400, h: 225 }} to={FULL} dur={duration}>
    <Img src={staticFile("data/hirise_view.png")} style={{ width: 1920, height: 1080, objectFit: "cover", filter: "sepia(.45) brightness(.65)" }} />
  </Move>
);

export const ResultCallout: React.FC<{ spanish?: boolean }> = ({ spanish = false }) => (
  <div style={{ position: "absolute", left: 100, top: 110, padding: "22px 30px", borderLeft: "2px solid rgba(255,255,255,.8)", background: "rgba(6,10,13,.65)", fontFamily: T.mono, color: "white" }}>
    <div style={{ fontSize: 26, color: "#c2c9cd", marginBottom: 12 }}>{D.measurement.station_id} · {spanish ? "MEDICIÓN SIMULADA" : "SIMULATED MEASUREMENT"}</div>
    <div style={{ fontSize: 52 }}>{spanish ? "Sin hielo hasta" : "No ice down to"} {D.measurement.depth_m} m</div>
    <div style={{ fontSize: 27, color: "#c2c9cd", marginTop: 14 }}>{spanish ? "Todavía puede haber hielo más abajo" : "Deeper ice remains possible"}</div>
  </div>
);

export const Credit: React.FC<{ text?: string }> = ({ text = "3D visualization · HiRISE terrain · simulated EVA" }) => (
  <div style={{ position: "absolute", right: 48, top: 35, fontFamily: T.mono, fontSize: 20, color: "rgba(255,255,255,.75)", textShadow: "0 1px 8px #000" }}>{text}</div>
);
