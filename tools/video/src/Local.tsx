import React from "react";
import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Brand } from "./Global";
import { Grade, Sub, Super } from "./film";
import { ConsoleScene, Credit, DrillScene, OrbitScene, ResultCallout, SurfaceScene } from "./scenes";
import { EvaWindow, Tools, Wrist } from "./ui/screens";
import cues from "./narration.json";

export const Local: React.FC = () => {
  const frame = useCurrentFrame();
  const nasa = (frame >= 1032 && frame < 1152) || (frame >= 1752 && frame < 1896);
  return (
  <AbsoluteFill style={{ background: "#080b0d" }}>
    <Sequence name="L01 · La pregunta" durationInFrames={72} premountFor={24}><ConsoleScene wide duration={72} /></Sequence>
    <Sequence name="L01b · La medición" from={72} durationInFrames={120} premountFor={24}><DrillScene duration={120} /><ResultCallout spanish /></Sequence>
    <Sequence name="L02 · Cada salida cuesta" from={192} durationInFrames={336} premountFor={24}><SurfaceScene duration={336} /></Sequence>
    <Sequence name="L03 · Datos y lo que no sabemos" from={528} durationInFrames={312} premountFor={24}><ConsoleScene duration={312} /></Sequence>
    <Sequence name="L04 · Radar y taladro" from={840} durationInFrames={192} premountFor={24}><ConsoleScene duration={192}><Tools /></ConsoleScene></Sequence>
    <Sequence name="L04b · Equipos en ensayos NASA" from={1032} durationInFrames={120} premountFor={24}>
      <Video src={staticFile("nasa/desert-rats-context.mp4")} muted premountFor={24} objectFit="cover" style={{ width: 1920, height: 1080 }} />
      <Super l1="NASA Desert RATS · ensayo en la Tierra" l2="Archivo de 2010 · contexto operativo, no IceWalk" />
    </Sequence>
    <Sequence name="L05 · Preparar la EVA" from={1152} durationInFrames={312} premountFor={24}><ConsoleScene wide duration={312} /></Sequence>
    <Sequence name="L06 · Cuándo salir" from={1464} durationInFrames={288} premountFor={24}><ConsoleScene duration={288}><EvaWindow /></ConsoleScene></Sequence>
    <Sequence name="L07 · Ensayar antes de salir" from={1752} durationInFrames={144} premountFor={24}>
      <Video src={staticFile("nasa/chapea-context.mp4")} muted premountFor={24} objectFit="cover" style={{ width: 1920, height: 1080 }} />
      <Super l1="NASA CHAPEA · hábitat análogo" l2="Ensayo en la Tierra · no es una misión de IceWalk" />
    </Sequence>
    <Sequence name="L07b · EV e IV" from={1896} durationInFrames={168} premountFor={24}><ConsoleScene mode="review" wide duration={168} /></Sequence>
    <Sequence name="L08 · Tiempo para volver" from={2064} durationInFrames={312} premountFor={24}><ConsoleScene duration={312}><AbsoluteFill style={{ background: "#070b10", justifyContent: "center", alignItems: "center" }}><div style={{ transform: "scale(1.5)" }}><Wrist mode="clock-end" /></div></AbsoluteFill></ConsoleScene></Sequence>
    <Sequence name="L09 · Sin hielo en el primer metro" from={2376} durationInFrames={336} premountFor={24}><DrillScene depth duration={336} /></Sequence>
    <Sequence name="L10 · Qué cambió" from={2712} durationInFrames={336} premountFor={24}><ConsoleScene mode="change" duration={336} /></Sequence>
    <Sequence name="L11 · La decisión" from={3048} durationInFrames={360} premountFor={24}><ConsoleScene mode="review" duration={360} /></Sequence>
    <Sequence name="L12 · Seguir con evidencia" from={3408} durationInFrames={288} premountFor={24}><SurfaceScene ar duration={288} /></Sequence>
    <Sequence name="L13 · Campaña simulada" from={3696} durationInFrames={384} premountFor={24}><ConsoleScene mode="campaign" duration={384} /></Sequence>
    <Sequence name="L14 · La revelación" from={4080} durationInFrames={144} premountFor={24}><OrbitScene duration={144} /></Sequence>
    <Sequence name="L14b · IceWalk" from={4224} durationInFrames={96} premountFor={24}><ConsoleScene wide duration={96} /><Brand spanish /></Sequence>
    <Credit text={nasa ? "NASA · archivo de análogos terrestres" : "Visualización 3D · EVA simulada · interfaces conceptuales"} />
    {cues.local.map((cue, i) => <Sequence key={i} name={`Narración ${i + 1}`} from={cue.from} durationInFrames={cue.duration}><Sub text={cue.text} who={cue.role} /></Sequence>)}
    <Audio src={staticFile("audio/local-voice.wav")} volume={1} premountFor={24} />
    <Grade />
  </AbsoluteFill>
);
};
