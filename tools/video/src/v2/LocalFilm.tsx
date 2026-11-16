import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import narration from "../narration.json";
import { D } from "../ui/theme";
import { Disclosure, Letterbox, Shot, Subtitle, TopSuper } from "./kit";
import { CampaignGraphic, ConsoleReview, ConsoleWide, Descent, EndCard, Hud, NumbersCard, ResultCard, ScreenInsert, SectionLabels } from "./scenes";
import { Archive, ClockExplainer, MapStory, ReviewInsert, ToolsInsert, WindowInsert } from "./local";

export const LOCAL_FILM_FRAMES = 4320;

/** Edit decision list, 24 fps. Sound events in scripts/sound_local.py follow these cuts. */
export const LOCAL_EDL: Record<string, [number, number]> = {
  orbit: [0, 72], descent: [72, 132], drill: [132, 192], walk: [192, 264], pov: [264, 324],
  consoleWide: [324, 388], tools: [388, 513], prob: [513, 686], unc: [686, 852], tools2: [852, 936],
  section: [936, 1008], desert: [1008, 1152], stations: [1152, 1320], route: [1320, 1464],
  window: [1464, 1608], window2: [1608, 1752], chapea: [1752, 1896], drill2: [1896, 1956],
  consoleWide2: [1956, 2020], review0: [2020, 2064], povHud: [2064, 2124], clock: [2124, 2376],
  drill3: [2376, 2436], result: [2436, 2520], section2: [2520, 2592], sectionHold: [2592, 2724],
  consoleWide3: [2724, 2788], insert: [2788, 3048], reviewA: [3048, 3250], review: [3250, 3330],
  reviewB: [3330, 3408], povHud2: [3408, 3468], walk2: [3468, 3540], routeAfter: [3540, 3696],
  campaign: [3696, 4080], back: [4080, 4188], end: [4188, 4320],
};

export const LOCAL_SHOT_USES = [
  {"shot": "orbit", "from": 0, "frames": 72},
  {"shot": "drill", "from": 0, "frames": 60},
  {"shot": "walk", "from": 0, "frames": 72},
  {"shot": "pov", "from": 0, "frames": 60},
  {"shot": "console_wide", "from": 0, "frames": 64},
  {"shot": "section", "from": 0, "frames": 72},
  {"shot": "console_review", "from": 0, "frames": 44},
  {"shot": "console_review", "from": 0, "frames": 80},
  {"shot": "drill", "from": 59, "frames": 1},
  {"shot": "section", "from": 71, "frames": 1},
  {"shot": "walk", "from": 40, "frames": 1}
] as const;

const S: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <Sequence name={k} from={LOCAL_EDL[k][0]} durationInFrames={LOCAL_EDL[k][1] - LOCAL_EDL[k][0]}>{children}</Sequence>
);
const len = (k: string) => LOCAL_EDL[k][1] - LOCAL_EDL[k][0];

const supers: [number, number, string, string?][] = [
  [4, 66, "MARS RECONNAISSANCE ORBITER · HiRISE", "MODELO 3D: NASA/JPL-CALTECH"],
  [76, 54, `SITIO ${D.site.id.toUpperCase()} · 35,11° N 189,83° E`, "HiRISE ESP_073578_2155 · NASA/JPL-CALTECH/UARIZONA"],
  [136, 54, `ESTACIÓN ${D.measurement.station_id} · TALADRO`, "EVA SIMULADA · HARDWARE ILUSTRATIVO"],
  [1012, 136, "NASA DESERT RATS · ENSAYO EN LA TIERRA (2010)", "CONTEXTO OPERATIVO · NO ES IceWalk"],
  [1468, 136, "VENTANA DE EVA · MÓDULO DE EJEMPLO", "CONDICIONES DE OTRA FECHA"],
  [1756, 136, "NASA CHAPEA · HÁBITAT ANÁLOGO", "ENSAYO EN LA TIERRA · NO ES UNA MISIÓN DE IceWalk"],
  [1960, 56, "HÁBITAT · CONSOLA DEL IV"],
  [2728, 56, "HÁBITAT · CONSOLA DEL IV", `${D.replan.from_plan_id} → ${D.replan.plan_id}`],
];

export const LocalFilm: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <S k="orbit"><Shot name="orbit" /></S>
    <S k="descent"><Descent dur={len("descent")} /></S>
    <S k="drill"><Shot name="drill" /></S>
    <S k="walk"><Shot name="walk" /></S>
    <S k="pov"><Shot name="pov" /></S>
    <S k="consoleWide"><ConsoleWide updateAt={10000} /></S>
    <S k="tools"><ToolsInsert dur={len("tools")} /></S>
    <S k="prob"><MapStory dur={len("prob")} layer="probability" reveal="layer" caption={`ESTIMACIÓN REGIONAL · ${D.site.craters_in_model} CRÁTERES FRESCOS`} sub={`CELDA ${D.site.cell_size_m} m · HiRISE NASA/JPL-CALTECH/UARIZONA`} /></S>
    <S k="unc"><MapStory dur={len("unc")} layer="uncertainty" reveal="layer" caption="LO QUE TODAVÍA NO SABEMOS" sub="1 = SOLO EL PRIOR, SIN MEDICIONES" /></S>
    <S k="tools2"><ToolsInsert dur={len("tools2")} /></S>
    <S k="section"><Shot name="section" /><SectionLabels es /></S>
    <S k="desert"><Archive src="nasa/desert-rats-context.mp4" frames={120} /></S>
    <S k="stations"><MapStory dur={len("stations")} layer="probability" reveal="stations" caption="ESTACIONES · LO QUE PUEDE ENSEÑARNOS CADA PUNTO" /></S>
    <S k="route"><MapStory dur={len("route")} layer="probability" reveal="route" caption="RUTA · OBSTÁCULOS VISTOS POR HiRISE" sub="CON TIEMPO PARA VOLVER AL HÁBITAT" /></S>
    <S k="window"><WindowInsert dur={len("window")} zoom={[1.0, 1.12]} origin="50% 30%" /></S>
    <S k="window2"><WindowInsert dur={len("window2")} zoom={[1.12, 1.25]} origin="50% 92%" /></S>
    <S k="chapea"><Archive src="nasa/chapea-context.mp4" frames={144} /></S>
    <S k="drill2"><Shot name="drill" /></S>
    <S k="consoleWide2"><ConsoleWide updateAt={10000} /></S>
    <S k="review0"><ConsoleReview clickAt={10000} /></S>
    <S k="povHud"><Shot name="pov" /><Hud dur={60} /></S>
    <S k="clock"><ClockExplainer dur={len("clock")} /></S>
    <S k="drill3"><Shot name="drill" /></S>
    <S k="result"><Shot name="drill" from={59} hold zoom={[1.0, 1.08]} dur={len("result")} origin="48% 55%" /><ResultCard es /></S>
    <S k="section2"><Shot name="section" /><SectionLabels es /></S>
    <S k="sectionHold"><Shot name="section" from={71} hold zoom={[1.0, 1.1]} dur={len("sectionHold")} origin="30% 60%" /><SectionLabels es from={71} /></S>
    <S k="consoleWide3"><ConsoleWide updateAt={18} /></S>
    <S k="insert"><ScreenInsert dur={len("insert")} /></S>
    <S k="reviewA"><ReviewInsert dur={len("reviewA")} /></S>
    <S k="review"><ConsoleReview clickAt={50} /></S>
    <S k="reviewB"><ReviewInsert dur={len("reviewB")} confirmAt={0} /></S>
    <S k="povHud2"><Shot name="pov" /><Hud dur={60} /></S>
    <S k="walk2"><Shot name="walk" /></S>
    <S k="routeAfter"><MapStory dur={len("routeAfter")} layer="probability" state="after" caption={`PLAN REVISADO · ${D.replan.stations_kept.length} ESTACIONES`} sub={`MARGEN MÍNIMO PREVISTO ${D.replan.margin_before_min} → ${D.replan.margin_after_min} min`} /></S>
    <S k="campaign"><Shot name="walk" from={40} hold zoom={[1.12, 1.0]} dur={len("campaign")} /><CampaignGraphic es /></S>
    <S k="back"><Shot name="orbit" /><NumbersCard dur={len("back")} es /></S>
    <S k="end"><EndCard es /></S>

    <Letterbox />
    {supers.map(([from, dur, l1, l2], i) => (
      <Sequence key={i} from={from} durationInFrames={dur}><TopSuper l1={l1} l2={l2} dur={dur} /></Sequence>
    ))}
    <Sequence durationInFrames={1008}><Disclosure text="VISUALIZACIÓN 3D · EVA SIMULADA" /></Sequence>
    <Sequence from={1008} durationInFrames={144}><Disclosure text="ARCHIVO NASA" /></Sequence>
    <Sequence from={1152} durationInFrames={600}><Disclosure text="VISUALIZACIÓN 3D · EVA SIMULADA" /></Sequence>
    <Sequence from={1752} durationInFrames={144}><Disclosure text="ARCHIVO NASA" /></Sequence>
    <Sequence from={1896} durationInFrames={2292}><Disclosure text="VISUALIZACIÓN 3D · EVA SIMULADA" /></Sequence>
    {narration.local.map((c, i) => (
      <Sequence key={i} from={c.from} durationInFrames={c.duration}>
        <Subtitle text={c.text} who={c.role || undefined} dur={c.duration} />
      </Sequence>
    ))}
    <Audio src={staticFile("audio/local-film-mix.wav")} />
  </AbsoluteFill>
);
