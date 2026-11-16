import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import narration from "../narration.json";
import { D } from "../ui/theme";
import { Disclosure, Letterbox, Shot, Subtitle, TopSuper } from "./kit";
import { CampaignGraphic, ConsoleReview, ConsoleWide, Descent, EndCard, Hud, NumbersCard, ResultCard, ScreenInsert, SectionLabels } from "./scenes";

export const GLOBAL_FILM_FRAMES = 708;

/** Edit decision list (frames at 24 fps). Audio events in scripts/sound_global.py follow these cuts. */
export const EDL = {
  orbit: [0, 60], descent: [60, 92], drill: [92, 152], result: [152, 176], section: [176, 245],
  consoleWide: [245, 309], insert: [309, 360], review: [360, 434], pov: [434, 480], walk: [480, 521],
  campaign: [521, 600], back: [600, 662], black: [662, 674], end: [674, 708],
} as const;

/** Which rendered frames each cut uses (checked against the renders by scripts/test_delivery.py). */
export const SHOT_USES = [
  {"shot": "orbit", "from": 0, "frames": 60},
  {"shot": "drill", "from": 0, "frames": 60},
  {"shot": "drill_result", "from": 0, "frames": 24},
  {"shot": "section", "from": 2, "frames": 69},
  {"shot": "console_wide", "from": 0, "frames": 64},
  {"shot": "console_review", "from": 4, "frames": 74},
  {"shot": "pov", "from": 6, "frames": 46},
  {"shot": "walk", "from": 18, "frames": 41}
] as const;

const S: React.FC<{ k: keyof typeof EDL; children: React.ReactNode }> = ({ k, children }) => (
  <Sequence name={k} from={EDL[k][0]} durationInFrames={EDL[k][1] - EDL[k][0]}>{children}</Sequence>
);

export const GlobalFilm: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <S k="orbit"><Shot name="orbit" from={0} /></S>
    <S k="descent"><Descent dur={32} /></S>
    <S k="drill"><Shot name="drill" from={0} /></S>
    <S k="result"><Shot name="drill_result" /><ResultCard /></S>
    <S k="section"><Shot name="section" from={2} /><SectionLabels from={2} /></S>
    <S k="consoleWide"><ConsoleWide from={0} updateAt={18} /></S>
    <S k="insert"><ScreenInsert dur={51} /></S>
    <S k="review"><ConsoleReview from={4} clickAt={52} /></S>
    <S k="pov"><Shot name="pov" from={6} /><Hud dur={46} /></S>
    <S k="walk"><Shot name="walk" from={18} /></S>
    <S k="campaign"><CampaignGraphic /></S>
    <S k="back"><Descent dur={62} reverse /></S>
    <Sequence name="numbers" from={606} durationInFrames={56}><NumbersCard dur={56} /></Sequence>
    <S k="end"><EndCard /></S>

    <Letterbox />
    <Sequence from={4} durationInFrames={52}><TopSuper l1="MARS RECONNAISSANCE ORBITER · HiRISE" l2="3D MODEL: NASA/JPL-CALTECH" dur={52} /></Sequence>
    <Sequence from={62} durationInFrames={30}><TopSuper l1={`SITE ${D.site.id.toUpperCase()} · 35.11° N 189.83° E`} l2="HiRISE ESP_073578_2155 · NASA/JPL-CALTECH/UARIZONA" dur={30} /></Sequence>
    <Sequence from={96} durationInFrames={54}><TopSuper l1={`STATION ${D.measurement.station_id} · CORE DRILL`} l2="SIMULATED EVA · ILLUSTRATIVE HARDWARE" dur={54} /></Sequence>
    <Sequence from={249} durationInFrames={56}><TopSuper l1="HABITAT · IV CONSOLE" l2={`${D.replan.from_plan_id} → ${D.replan.plan_id}`} dur={56} /></Sequence>
    <Sequence from={484} durationInFrames={37}><TopSuper l1={`EV1 · EV2 → ${D.next.id} · ${D.next.distance_m} m`} dur={37} /></Sequence>
    <Sequence durationInFrames={662}><Disclosure text="3D VISUALIZATION · SIMULATED EVA" /></Sequence>

    {narration.global.map((c, i) => (
      <Sequence key={i} from={c.from} durationInFrames={c.duration}>
        <Subtitle text={c.text} who={c.role || undefined} dur={c.duration} />
      </Sequence>
    ))}
    <Audio src={staticFile("audio/global-film-mix.wav")} />
  </AbsoluteFill>
);
