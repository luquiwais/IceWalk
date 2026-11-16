import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, staticFile } from "remotion";
import { Grade, Sub, Super } from "./film";
import { ConsoleScene, Credit, DrillScene, OrbitScene, ResultCallout, SurfaceScene } from "./scenes";
import { IceWalkMark } from "./ui/chrome";
import { T } from "./ui/theme";

export const GLOBAL_FRAMES = 708;

export const Brand: React.FC<{ spanish?: boolean }> = ({ spanish = false }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "rgba(2,5,8,.77)", opacity, color: "white", fontFamily: T.sans }}>
    <div style={{ display: "flex", alignItems: "center", gap: 26 }}><IceWalkMark size={76} /><span style={{ fontSize: 100, fontWeight: 600 }}>IceWalk</span></div>
    <div style={{ fontSize: 36, marginTop: 24 }}>{spanish ? "Entender la incertidumbre. Planificar el siguiente paso." : "Understand uncertainty. Plan the next step."}</div>
    <div style={{ fontSize: 24, marginTop: 45, fontFamily: T.mono, color: "#b6bdc4" }}>Darionautas · NASA Space Apps Challenge 2026</div>
    <div style={{ position: "absolute", bottom: 56, fontSize: 20, color: "#a7afb6" }}>{spanish ? "Prototipo · EVA simulada · AR conceptual · Visualización 3D" : "Prototype · simulated EVA · AR concept · 3D visualization"} · HiRISE: NASA/JPL-Caltech/UArizona</div>
  </AbsoluteFill>;
};

export const Global: React.FC = () => (
  <AbsoluteFill style={{ background: "#07090b" }}>
    <Sequence name="G01 · The question in the console" durationInFrames={48} premountFor={24}><ConsoleScene wide duration={48} /></Sequence>
    <Sequence name="G01b · From orbit to the surface" from={48} durationInFrames={36} premountFor={24}><OrbitScene duration={36} /></Sequence>
    <Sequence name="G02 · One metre, no ice" from={84} durationInFrames={84} premountFor={24}>
      <DrillScene duration={84} /><ResultCallout />
    </Sequence>
    <Sequence name="G03 · Review before acting" from={168} durationInFrames={36} premountFor={24}><ConsoleScene mode="review" duration={36} /></Sequence>
    <Sequence name="G03b · What a negative means" from={204} durationInFrames={36} premountFor={24}><DrillScene depth duration={36} /></Sequence>
    <Sequence name="G04 · Local model update" from={240} durationInFrames={60} premountFor={24}><ConsoleScene mode="change" duration={60} /></Sequence>
    <Sequence name="G04b · Five stations retained" from={300} durationInFrames={60} premountFor={24}><ConsoleScene mode="review" duration={60} /></Sequence>
    <Sequence name="G05 · GO for station twenty-five" from={360} durationInFrames={60} premountFor={24}><ConsoleScene mode="confirmed" duration={60} /></Sequence>
    <Sequence name="G05b · Next station in AR" from={420} durationInFrames={36} premountFor={24}><SurfaceScene ar duration={36} /></Sequence>
    <Sequence name="G06 · A reviewed next step" from={456} durationInFrames={60} premountFor={24}><SurfaceScene duration={60} /></Sequence>
    <Sequence name="G07 · Strategy over a campaign" from={516} durationInFrames={84} premountFor={24}><ConsoleScene mode="campaign" duration={84} /></Sequence>
    <Sequence name="G08 · Return to the first frame" from={600} durationInFrames={36} premountFor={24}><OrbitScene duration={36} /></Sequence>
    <Sequence name="G08b · Every number came from IceWalk" from={636} durationInFrames={36} premountFor={24}>
      <ConsoleScene wide mode="after" duration={36} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "rgba(2,5,8,.72)", color: "white", fontFamily: T.sans }}><div style={{ fontSize: 60 }}>Every number on screen came from IceWalk.</div><div style={{ fontFamily: T.mono, fontSize: 26, color: "#b6bdc4", marginTop: 20 }}>Planner output · simulated measurement</div></AbsoluteFill>
    </Sequence>
    <Sequence name="G08c · IceWalk" from={672} durationInFrames={36} premountFor={24}><ConsoleScene wide duration={36} /><Brand /></Sequence>
    <Sequence name="Site identification" from={48} durationInFrames={36}><Super l1="Site S1094b · Mars" l2="NASA/JPL-Caltech/UArizona" /></Sequence>
    <Sequence name="Opening narration" from={4} durationInFrames={76}><Sub text="We can map Mars. Not one metre down." /></Sequence>
    <Sequence name="EV1 report" from={88} durationInFrames={69}><Sub who="EV1" text="One metre. No ice." /></Sequence>
    <Sequence name="Model update narration" from={244} durationInFrames={108}><Sub text="Each measurement updates the map — and the plan." /></Sequence>
    <Sequence name="IV call" from={362} durationInFrames={70}><Sub who="IV" text="Plan reviewed. You're GO for station twenty-five." /></Sequence>
    <Sequence name="EV1 acknowledgement" from={433} durationInFrames={22}><Sub who="EV1" text="Copy." /></Sequence>
    <Sequence name="Campaign narration" from={520} durationInFrames={78}><Sub text="We don't promise ice. Fewer EVAs." /></Sequence>
    <Sequence name="Source disclosure" durationInFrames={636}><Credit /></Sequence>
    <Audio src={staticFile("audio/global-voice.wav")} volume={1} premountFor={24} />
    <Grade />
  </AbsoluteFill>
);
