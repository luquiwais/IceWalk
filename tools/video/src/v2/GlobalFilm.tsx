import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import narration from "../narration.json";
import { T } from "../ui/theme";
import { PIC, clamp, ease, Disclosure, Letterbox, Shot, Subtitle, TopSuper } from "./kit";
import { CampaignGraphic, Descent, EndCard, ScreenInsert } from "./scenes";
import { UIShot, UICursor, UIHighlight, UIVideo } from "../v3/RealUI";
import { UI, GLOBAL_UI } from "../v3/ui-frames";

export const GLOBAL_FILM_FRAMES = 708;

/**
 * Global (30 s, English). Product-first edit after Lucas's feedback: hook → the real IceWalk UI
 * (probability + uncertainty, stations) → one measurement → map and plan update → IV review →
 * campaign result → brand. Blender gives context; the real app interface carries the demo.
 * Edit decision list (frames at 24 fps). Audio events in scripts/sound_global.py follow these cuts.
 */
export const EDL = {
  orbit: [0, 60], descent: [60, 96], uiPlan: [96, 216], drill: [216, 276], result: [276, 300],
  uiUpdate: [300, 420], review: [420, 462], walk: [462, 504], campaign: [504, 648], end: [648, 708],
} as const;

/** Which rendered frames each cut uses (checked against the renders by scripts/test_delivery.py). */
export const SHOT_USES = [
  {"shot": "orbit", "from": 0, "frames": 60},
  {"shot": "drill", "from": 0, "frames": 60},
  {"shot": "drill_result", "from": 0, "frames": 24},
  {"shot": "walk", "from": 26, "frames": 42}
] as const;

const S: React.FC<{ k: keyof typeof EDL; children: React.ReactNode }> = ({ k, children }) => (
  <Sequence name={k} from={EDL[k][0]} durationInFrames={EDL[k][1] - EDL[k][0]}>{children}</Sequence>
);

/** Field result, as EV1 logs it from the helmet. No station id: the app numbers stations 1–6. */
const FieldResult: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8], [0, 1], clamp);
  const x = interpolate(f, [0, 12], [-20, 0], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 96 + x, top: PIC.top + 72, opacity: o, fontFamily: T.mono, color: "#fff", borderLeft: "2px solid rgba(255,255,255,.85)", padding: "14px 26px", background: "linear-gradient(90deg, rgba(4,7,10,.72), rgba(4,7,10,0))" }}>
      <div style={{ fontSize: 17, letterSpacing: 2, color: "#c2c9cd" }}>STATION 1 · EV1 · SIMULATED MEASUREMENT</div>
      <div style={{ fontSize: 46, fontWeight: 600, marginTop: 8 }}>NO ICE ≤ 1.0 m</div>
      <div style={{ fontSize: 18, letterSpacing: 1.2, color: "#c2c9cd", marginTop: 8 }}>LOGGED · SENT TO IV</div>
    </div>
  );
};

/** EV1's field log arriving at the IV console (video graphic, same style as the field result card). */
const Incoming: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 6], [0, 1], clamp);
  const y = interpolate(f, [at, at + 10], [16, 0], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 96, top: PIC.top + 60 + y, opacity: o, fontFamily: T.mono, color: "#fff", borderLeft: "2px solid #86b6ef", padding: "12px 22px", background: "rgba(4,7,10,.82)", borderRadius: 4 }}>
      <div style={{ fontSize: 16, letterSpacing: 2, color: "#9fc3ee" }}>FIELD LOG · EV1 → IV</div>
      <div style={{ fontSize: 30, fontWeight: 600, marginTop: 6 }}>E03S24 · CORE DRILL · NO ICE ≤ 1.0 m</div>
    </div>
  );
};

/** Campaign chart over the site, slowly receding: the result of the whole method. */
const Campaign: React.FC = () => (
  <AbsoluteFill>
    <Descent dur={144} reverse label="S1094b" />
    <CampaignGraphic />
  </AbsoluteFill>
);

const G = GLOBAL_UI;

export const GlobalFilm: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <S k="orbit"><Shot name="orbit" from={0} /></S>
    <S k="descent"><Descent dur={36} label="S1094b" /></S>

    <S k="uiPlan">
      <Sequence durationInFrames={78}>
        <UIShot src={UI(G.plan.src)} dur={78} from={G.plan.from}>
          <UIHighlight box={G.plan.ring} at={4} until={32} label={G.plan.ringLabel} labelSide="below" round />
          <UIHighlight box={G.plan.legend} at={32} until={56} label={G.plan.legendLabel} labelSide="above" />
          <UIHighlight box={G.plan.route} at={56} until={80} label={G.plan.routeLabel} labelSide="left" />
        </UIShot>
      </Sequence>
      {/* Real recording: the plan map flies to station 1 and opens its detail (core drill, then E03S25). */}
      <Sequence from={78} durationInFrames={42}><UIVideo src={UI("plan-station.mp4")} fromSec={0.3} /></Sequence>
    </S>

    <S k="drill"><Shot name="drill" from={0} /></S>
    <S k="result"><Shot name="drill_result" from={0} /><FieldResult /></S>

    <S k="uiUpdate">
      <Sequence durationInFrames={52}>
        <UIShot src={UI(G.update.src)} dur={52} from={G.update.from} to={G.update.to}>
          <UIHighlight box={G.update.card} at={4} label={G.update.label} labelSide="below" />
        </UIShot>
        <Incoming at={16} />
      </Sequence>
      <Sequence from={52} durationInFrames={68}><ScreenInsert dur={68} /></Sequence>
    </S>

    <S k="review">
      <UIShot src={UI(G.review.src)} dur={42} from={G.review.from} to={G.review.to}>
        <UICursor points={[[2, G.review.cursorFrom[0], G.review.cursorFrom[1]], [28, G.review.button[0], G.review.button[1]]]} clickAt={32} />
      </UIShot>
    </S>
    <S k="walk"><Shot name="walk" from={26} /></S>

    <S k="campaign"><Campaign /></S>
    <S k="end"><EndCard /></S>

    <Letterbox />
    <Sequence from={4} durationInFrames={52}><TopSuper l1="MARS RECONNAISSANCE ORBITER · HiRISE" l2="3D MODEL: NASA/JPL-CALTECH" dur={52} /></Sequence>
    <Sequence from={62} durationInFrames={34}><TopSuper l1="SITE S1094b · 35.11° N 189.83° E" l2="HiRISE · NASA/JPL-CALTECH/UARIZONA" dur={34} /></Sequence>
    <Sequence from={98} durationInFrames={116}><TopSuper l1="ICEWALK · PLAN" l2="MODEL ESTIMATE FROM 349 REAL CRATERS · NOT A PROMISE OF ICE" dur={116} /></Sequence>
    <Sequence from={220} durationInFrames={78}><TopSuper l1="STATION 1 · CORE DRILL" l2="SIMULATED EVA · ILLUSTRATIVE HARDWARE" dur={78} /></Sequence>
    <Sequence from={302} durationInFrames={50}><TopSuper l1="HABITAT · IV CONSOLE" l2="EVA IN PROGRESS · REAL ICEWALK UI" dur={50} /></Sequence>
    <Sequence from={354} durationInFrames={64}><TopSuper l1="AFTER ONE MEASUREMENT" l2="UNCERTAINTY NEAR THE STATION · BEFORE → AFTER · PLANNER OUTPUT" dur={64} /></Sequence>
    <Sequence from={422} durationInFrames={40}><TopSuper l1="HABITAT · IV CONSOLE" l2="PLAN REVIEW" dur={40} /></Sequence>
    <Sequence from={464} durationInFrames={40}><TopSuper l1="EV1 · EV2 → NEXT STATION" dur={40} /></Sequence>
    <Sequence durationInFrames={648}><Disclosure text="REAL ICEWALK UI · 3D VISUALIZATION · SIMULATED EVA" /></Sequence>

    {narration.global.map((c, i) => (
      <Sequence key={i} from={c.from} durationInFrames={c.duration}>
        <Subtitle text={c.text} who={c.role || undefined} dur={c.duration} />
      </Sequence>
    ))}
    <Audio src={staticFile("audio/global-film-mix.wav")} />
  </AbsoluteFill>
);
