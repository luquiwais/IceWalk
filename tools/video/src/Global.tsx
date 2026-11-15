import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { AiMark, Clip, FULL, Fade, Grade, Move, Pending, Plate, Sub, Super } from "./film";
import { HabitatConsole, VIEW } from "./HabitatConsole";
import { D, T } from "./ui/theme";
import { IceWalkMark } from "./ui/chrome";
import { ArHud, Campaign, ConsoleMap, DepthColumn, ReviewCard } from "./ui/screens";

// Video global v3: 29.5 s, 24 fps, 708 frames. Tiempos de docs/submission/video/script.md.
export const GLOBAL_FRAMES = 708;

const mapBefore = <ConsoleMap state="before" />;
const mapAfter = <ConsoleMap state="after" />;

/** El mapa pasa de antes a después en el mismo monitor. */
const MapSwap: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "relative", width: 1920, height: 1080 }}>
      <div style={{ position: "absolute", inset: 0 }}>{mapBefore}</div>
      <div style={{ position: "absolute", inset: 0, opacity: o }}>{mapAfter}</div>
    </div>
  );
};

const ReviewTimed: React.FC<{ confirmAt: number }> = ({ confirmAt }) => {
  const f = useCurrentFrame();
  return <ReviewCard confirmed={f >= confirmAt} />;
};

const DepthGrow: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return <DepthColumn progress={interpolate(f, [0, dur * 0.8], [0, 1], { extrapolateRight: "clamp" })} />;
};

const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, 30, 36], [0, 1, 1, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.55)", opacity: o }}>
      <div style={{ fontFamily: T.sans, fontSize: 64, fontWeight: 500, color: "#fff" }}>Every number on screen came from IceWalk.</div>
      <div style={{ fontFamily: T.mono, fontSize: 28, color: "#c9d3dd", marginTop: 18 }}>Planner output · simulated measurement</div>
    </AbsoluteFill>
  );
};

const Brand: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.6)", opacity: o }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <IceWalkMark size={84} />
        <div style={{ fontFamily: T.sans, fontSize: 104, fontWeight: 600, color: "#fff" }}>IceWalk</div>
      </div>
      <div style={{ fontFamily: T.sans, fontSize: 40, color: "#e9eef3", marginTop: 20 }}>Understand uncertainty. Plan the next step.</div>
      <div style={{ fontFamily: T.mono, fontSize: 24, color: "#9aa6b2", marginTop: 34 }}>Darionautas · NASA Space Apps Challenge 2026</div>
      <div style={{ position: "absolute", bottom: 60, fontFamily: T.sans, fontSize: 22, color: "rgba(255,255,255,0.7)" }}>
        Prototype · simulated EVA · AR interface concept · AI-generated dramatization · HiRISE: NASA/JPL-Caltech/UArizona
      </div>
    </AbsoluteFill>
  );
};

export const Global: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {/* G01a · 0–48: por encima del hombro del IV, empuje hacia el mapa (provisoria: placa del hábitat) */}
    <Sequence durationInFrames={56}>
      <Move from={VIEW.room} to={VIEW.left} dur={56}>
        <HabitatConsole left={mapBefore} mid={<ReviewCard />} small={<Campaign />} />
      </Move>
      <Pending id="S01" />
    </Sequence>
    {/* G01b · 48–84 y G02a · 84–120: del mapa al suelo, el taladro se detiene (S02) */}
    <Sequence from={48} durationInFrames={72}>
      <Fade dur={72} inF={10}>
        <Clip src="clips/S02_drill_overhead_v1.mp4" startFrom={12} />
      </Fade>
      <Sequence from={10}><Super l1={`Site ${D.site.id.toUpperCase()} · Mars`} l2={`${D.measurement.station_id} · PET ${Math.round(D.clock.station_end.pet_min)} min`} /></Sequence>
    </Sequence>
    {/* G02b · 120–168: ojos de EV1 (provisoria R1) */}
    <Sequence from={120} durationInFrames={48}>
      <Move from={{ x: 1000, y: 40, w: 760, h: 428 }} to={{ x: 1060, y: 90, w: 640, h: 360 }} dur={48}>
        <Plate src="plates/R1_EV1.png" />
      </Move>
      <Pending id="S05" />
    </Sequence>
    {/* G03a · 168–204: IV, dedo quieto (provisoria R3) */}
    <Sequence from={168} durationInFrames={36}>
      <Move from={{ x: 1100, y: 60, w: 760, h: 428 }} to={{ x: 1150, y: 100, w: 680, h: 383 }} dur={36}>
        <Plate src="plates/R3_IV.png" />
      </Move>
      <Pending id="S06" />
    </Sequence>
    {/* G03b · 204–240: POV hacia el agujero con la columna AR (provisoria F01) */}
    <Sequence from={204} durationInFrames={36}>
      <Move from={{ x: 380, y: 420, w: 1000, h: 563 }} to={{ x: 440, y: 470, w: 880, h: 495 }} dur={36}>
        <Plate src="plates/F01_drill_overhead.png" />
      </Move>
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.35)" }} />
      <DepthGrow dur={36} />
      <Pending id="S07" />
    </Sequence>
    {/* G04a · 240–300: mapa antes/después en la consola */}
    <Sequence from={240} durationInFrames={60}>
      <Move from={VIEW.left} to={{ ...VIEW.left, x: VIEW.left.x + 10, y: VIEW.left.y + 6, w: VIEW.left.w - 30, h: (VIEW.left.w - 30) * 9 / 16 }} dur={60}>
        <HabitatConsole left={<MapSwap at={18} />} />
      </Move>
      <Pending id="S01" />
    </Sequence>
    {/* G04b · 300–360: revisión del IV y confirmación */}
    <Sequence from={300} durationInFrames={60}>
      <Move from={VIEW.mid} to={{ ...VIEW.mid, x: VIEW.mid.x + 8, w: VIEW.mid.w - 24, h: (VIEW.mid.w - 24) * 9 / 16 }} dur={60}>
        <HabitatConsole mid={<ReviewTimed confirmAt={44} />} left={mapAfter} />
      </Move>
      <Pending id="S06" />
    </Sequence>
    {/* G05a · 360–420: IV por radio (provisoria R3) */}
    <Sequence from={360} durationInFrames={60}>
      <Move from={{ x: 860, y: 40, w: 900, h: 506 }} to={{ x: 900, y: 70, w: 820, h: 461 }} dur={60}>
        <Plate src="plates/R3_IV.png" />
      </Move>
      <Pending id="S08" />
    </Sequence>
    {/* G05b · 420–456: POV de EV2 con AR (provisoria R5) */}
    <Sequence from={420} durationInFrames={36}>
      <Move from={{ x: 200, y: 260, w: 1300, h: 731 }} to={{ x: 260, y: 300, w: 1200, h: 675 }} dur={36}>
        <Plate src="plates/R5_SITE.png" />
      </Move>
      <ArHud />
      <Pending id="S09" />
    </Sequence>
    {/* G06a · 456–480: asentimiento (provisoria R1) */}
    <Sequence from={456} durationInFrames={24}>
      <Move from={{ x: 1060, y: 90, w: 640, h: 360 }} to={{ x: 1080, y: 100, w: 600, h: 338 }} dur={24}>
        <Plate src="plates/R1_EV1.png" />
      </Move>
      <Pending id="S05" />
    </Sequence>
    {/* G06b · 480–516 y G07 · 516–600: plano general, y el IV mira la campaña */}
    <Sequence from={480} durationInFrames={36}>
      <Move from={FULL} to={{ x: 60, y: 34, w: 1800, h: 1013 }} dur={36}>
        <Plate src="plates/R5_SITE.png" />
      </Move>
      <Pending id="S11" />
    </Sequence>
    <Sequence from={516} durationInFrames={84}>
      <Move from={{ x: 1300, y: 400, w: 420, h: 236 }} to={VIEW.small} dur={84}>
        <HabitatConsole small={<Campaign />} left={mapAfter} mid={<ReviewCard confirmed />} />
      </Move>
      <Pending id="S12" />
    </Sequence>
    {/* G08a · 600–636: subida a la órbita → mapa (provisoria) */}
    <Sequence from={600} durationInFrames={36}>
      <Fade dur={36} outF={12}>
        <Move from={{ x: 760, y: 500, w: 600, h: 338 }} to={FULL} dur={36}>
          <Img src={staticFile("data/hirise_detail.png")} style={{ position: "absolute", width: 1920, height: 1080, objectFit: "cover", filter: "grayscale(1)" }} />
        </Move>
      </Fade>
      <Pending id="S13" />
    </Sequence>
    {/* G08b–c · 624–708: vuelve al encuadre del principio, revelación y marca */}
    <Sequence from={624} durationInFrames={84}>
      <Fade dur={84} inF={12}>
        <Move from={VIEW.left} to={VIEW.room} dur={30}>
          <HabitatConsole left={mapAfter} mid={<ReviewCard confirmed />} small={<Campaign />} />
        </Move>
      </Fade>
    </Sequence>
    <Sequence from={636} durationInFrames={36}><Reveal /></Sequence>
    <Sequence from={672} durationInFrames={36}><Brand /></Sequence>

    {/* Voces y radio (subtítulos; tiempos provisorios hasta la lectura cronometrada) */}
    <Sequence from={4} durationInFrames={76}><Sub text="From orbit, we can map a lot. Not what's one metre down." /></Sequence>
    <Sequence from={118} durationInFrames={44}><Sub who="EV1" text="One metre. No ice." /></Sequence>
    <Sequence from={250} durationInFrames={100}><Sub text="Each measurement updates the map — and the plan." /></Sequence>
    <Sequence from={366} durationInFrames={62}><Sub who="IV" text="EV1, plan reviewed. You're GO for station twenty-five." /></Sequence>
    <Sequence from={432} durationInFrames={24}><Sub who="EV1" text="Copy. Moving." /></Sequence>
    <Sequence from={524} durationInFrames={72}><Sub text="We don't promise ice. We help you learn more with fewer EVAs." /></Sequence>

    <Grade />
    <Sequence durationInFrames={672}><AiMark text="AI-generated dramatization · simulated EVA" /></Sequence>
  </AbsoluteFill>
);
