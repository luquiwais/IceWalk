import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import narration from "../narration.json";
import { Disclosure, Letterbox, Shot, Subtitle, TopSuper } from "./kit";
import { CampaignGraphic, ConsoleReview, ConsoleWide, EndCard, SectionLabels } from "./scenes";
import { SimExplainer, UIVideo } from "./local";
import { UICursor, UIHighlight, UIShot } from "../v3/RealUI";

export const LOCAL_FILM_FRAMES = 4320;

/** Real app captures (public/ui-real, from apps/web); join/debrief still come from the draft set. */
const ui = (name: string) => `ui-real/${name}`;
const draft = (name: string) => `ui-draft/${name}`;

/**
 * Edit decision list, 24 fps. The interface carries the story; Blender shots give context.
 * Sound events in scripts/sound_local.py follow these cuts.
 */
export const LOCAL_EDL: Record<string, [number, number]> = {
  // 0–15 s: problem and cost of exploring
  orbit: [0, 72], drillEst: [72, 132], drill: [132, 192], walk: [192, 264],
  // 15–35 s: understand the site and choose where to measure
  site: [264, 640], flyto: [640, 777], planClean: [777, 880], legend: [880, 1060], stations: [1060, 1320],
  // 35–95 s: plan → measurement → map → IV review
  metrics: [1320, 1500], brief: [1500, 1572], briefFly: [1572, 1628], briefStation: [1628, 1680], join: [1680, 1781], planStation: [1781, 1840], povStart: [1840, 1900], approach: [1900, 1972],
  drillResult: [1972, 2056], profile: [2056, 2260], section: [2260, 2332], update: [2332, 2580],
  consoleWide: [2580, 2644], review: [2644, 2724], pov: [2724, 2784],
  // 95–125 s: support to keep going
  helmet: [2784, 3030], window: [3030, 3300],
  // 125–155 s: efficiency and how the simulation works
  campaign: [3300, 3652], sim: [3652, 4040],
  // 155–180 s: what was learned, next step
  debrief: [4040, 4200], end: [4200, 4320],
};

export const LOCAL_SHOT_USES = [
  {"shot": "orbit", "from": 0, "frames": 72},
  {"shot": "drill_establish", "from": 0, "frames": 60},
  {"shot": "drill", "from": 0, "frames": 60},
  {"shot": "walk", "from": 0, "frames": 72},
  {"shot": "pov_start", "from": 0, "frames": 60},
  {"shot": "approach", "from": 0, "frames": 72},
  {"shot": "drill_result", "from": 0, "frames": 84},
  {"shot": "core_profile", "from": 0, "frames": 204},
  {"shot": "section", "from": 0, "frames": 72},
  {"shot": "console_wide", "from": 0, "frames": 64},
  {"shot": "console_review", "from": 0, "frames": 80},
  {"shot": "pov", "from": 0, "frames": 60}
] as const;

const S: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <Sequence name={k} from={LOCAL_EDL[k][0]} durationInFrames={LOCAL_EDL[k][1] - LOCAL_EDL[k][0]}>{children}</Sequence>
);
const len = (k: string) => LOCAL_EDL[k][1] - LOCAL_EDL[k][0];
const cam = (x: number, y: number, scale: number) => ({ x, y, scale });

const supers: [number, number, string, string?][] = [
  [4, 126, "DARIONAUTAS · NASA SPACE APPS CHALLENGE 2026", "RETO «INTERPLANETARY SURVIVAL GUIDE: MARTIAN MAP» · MRO 3D: NASA/JPL-CALTECH"],
  [136, 54, "EVA SIMULADA · TALADRO DE 1 m", "HARDWARE ILUSTRATIVO"],
  [268, 96, "IceWalk · SITIO S1094b · 35,11° N 189,83° E", "CAPTURAS DE LA APLICACIÓN"],
  [1844, 54, "EVA SIMULADA · PRIMERA ESTACIÓN", "VISUALIZACIÓN 3D"],
  [2584, 56, "HÁBITAT · CONSOLA DEL IV", "VISUALIZACIÓN 3D"],
  [3304, 90, "SIMULACIÓN MONTE CARLO · SITIO S1094b", "SUPUESTO · NO ES UN RESULTADO DE CAMPO"],
  [4044, 152, "LO QUE SIGUE · CADA EVA DEJA EL MAPA MÁS CLARO PARA LA PRÓXIMA TRIPULACIÓN", "DE UNA SALIDA A UNA CAMPAÑA · SIN PROMETER HIELO"],
];

/** [from, to, label] of the persistent disclosure in the upper-right bar. */
const disclosures: [number, number, string][] = [
  [0, 264, "VISUALIZACIÓN 3D · EVA SIMULADA"],
  [264, 1840, "INTERFAZ REAL DE IceWalk · DATOS DEL PROTOTIPO"],
  [1840, 2332, "VISUALIZACIÓN 3D · EVA SIMULADA"],
  [2332, 2580, "INTERFAZ REAL DE IceWalk · DATOS DEL PROTOTIPO"],
  [2580, 2784, "VISUALIZACIÓN 3D · EVA SIMULADA"],
  [2784, 3300, "INTERFAZ REAL DE IceWalk · DATOS DEL PROTOTIPO"],
  [3300, 4040, "SIMULACIÓN · SUPUESTO"],
  [4040, 4200, "INTERFAZ REAL DE IceWalk · DATOS DEL PROTOTIPO"],
];

export const LocalFilm: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {/* 0–15 s */}
    <S k="orbit"><Shot name="orbit" /></S>
    <S k="drillEst"><Shot name="drill_establish" /></S>
    <S k="drill"><Shot name="drill" /></S>
    <S k="walk"><Shot name="walk" /></S>

    {/* 15–35 s: the site card, tool reach, the map */}
    <S k="site">
      <UIShot src={ui("site.png")} dur={170} from={cam(960, 470, 1)} to={cam(1600, 330, 1.6)}>
        <UIHighlight box={[1520, 221, 352, 52]} at={180} until={236} label="MEDIANA 2,9 m · 90 %: 1,9–4,4 m" labelSide="left" />
        <UIHighlight box={[1520, 336, 352, 29]} at={242} until={300} label="TALADRO · ALCANCE 1 m · 6 %" labelSide="left" />
        <UIHighlight box={[1520, 394, 352, 29]} at={300} until={350} label="RADAR DE SUELO · 10 m · 97 %" labelSide="left" />
        <UICursor points={[[318, 1300, 560], [356, 1695, 483]]} clickAt={360} />
      </UIShot>
    </S>
    <S k="flyto"><UIVideo src={ui("flyto-land.mp4")} /></S>
    <S k="planClean"><UIShot src={ui("plan-clean.png")} dur={len("planClean")} from={cam(900, 560, 1.0)} to={cam(860, 560, 1.08)} /></S>
    <S k="legend">
      <UIShot src={ui("plan.png")} dur={90} from={cam(760, 640, 1.1)} to={cam(420, 820, 1.5)}>
        <UIHighlight box={[36, 786, 313, 134]} at={70} label="PROBABILIDAD × CERTEZA · DOS EJES" labelSide="above" />
      </UIShot>
    </S>
    <S k="stations">
      <UIShot src={ui("plan.png")} dur={len("stations")} from={cam(1000, 560, 1.0)} to={cam(1080, 560, 1.06)}>
        <UIHighlight box={[1520, 188, 352, 38]} at={8} until={100} label="MODO: REDUCIR INCERTIDUMBRE" labelSide="below" />
        <UIHighlight box={[840, 250, 230, 640]} at={20} until={100} label="6 ESTACIONES" labelSide="left" />
        <UIHighlight box={[840, 250, 230, 640]} at={112} until={250} label="RUTA · MARGEN DE REGRESO 21 min" labelSide="left" />
      </UIShot>
    </S>

    {/* 35–95 s: plan → measurement → map → IV review */}
    <S k="metrics">
      <UIShot src={ui("plan.png")} dur={110} from={cam(1300, 380, 1.3)} to={cam(1650, 380, 1.7)}>
        <UIHighlight box={[1520, 234, 352, 188]} at={24} until={140} label="CADA VALOR CON SU UMBRAL" labelSide="left" />
        <UICursor points={[[120, 1350, 600], [158, 1695, 500]]} clickAt={162} />
      </UIShot>
    </S>
    <S k="brief">
      <UIShot src={ui("brief.png")} dur={len("brief")} from={cam(1100, 480, 1.0)} to={cam(1300, 420, 1.12)}>
        <UIHighlight box={[1566, 80, 330, 385]} at={8} until={66} />
      </UIShot>
    </S>
    <S k="briefFly"><UIVideo src={ui("brief-flyover.mp4")} trimBefore={12} /></S>
    <S k="briefStation"><UIVideo src={ui("brief-station.mp4")} /></S>
    <S k="join">
      <UIShot src={draft("join.png")} dur={len("join")} from={cam(800, 640, 1.3)} to={cam(800, 640, 1.4)}>
        <UIHighlight box={[640, 452, 316, 300]} at={10} until={80} label="EV1 · AFUERA, MIDE" labelSide="above" />
        <UIHighlight box={[966, 452, 314, 300]} at={84} label="IV · EN EL HÁBITAT, REVISA" labelSide="above" />
      </UIShot>
    </S>
    <S k="planStation"><UIVideo src={ui("plan-station.mp4")} /></S>
    <S k="povStart"><Shot name="pov_start" /></S>
    <S k="approach"><Shot name="approach" /></S>
    <S k="drillResult"><Shot name="drill_result" /></S>
    <S k="profile"><Shot name="core_profile" /><SectionLabels es profile /></S>
    <S k="section"><Shot name="section" /><SectionLabels es /></S>
    <S k="update">
      <UIShot src={ui("plan-clean.png")} dur={len("update")} from={cam(988, 500, 1.5)} to={cam(988, 500, 1.85)}>
        <UIHighlight box={[962, 459, 52, 52]} round at={16} label="ESTACIÓN 1 · SIN HIELO HASTA 1 m" labelSide="below" />
      </UIShot>
    </S>
    <S k="consoleWide"><ConsoleWide /></S>
    <S k="review"><ConsoleReview clickAt={56} /></S>
    <S k="pov"><Shot name="pov" /></S>

    {/* 95–125 s: walkback, conditions, rules */}
    <S k="helmet">
      <UIShot src={ui("ev1-helmet.png")} dur={120} from={cam(960, 640, 1.0)} to={cam(500, 1000, 1.35)}>
        <UIHighlight box={[152, 1010, 412, 46]} at={84} label="MARGEN DE REGRESO · BINGO: HORA DE VOLVER" labelSide="above" />
      </UIShot>
    </S>
    <S k="window">
      <UIShot src={ui("plan.png")} dur={len("window")} from={cam(1560, 400, 1.45)} to={cam(1660, 380, 1.6)}>
        <UIHighlight box={[1696, 384, 180, 46]} at={12} until={168} label="VENTANA DE EVA · SOL 2 · 06:00–12:00" labelSide="left" />
        <UIHighlight box={[1520, 234, 352, 188]} at={178} label="UMBRALES DOCUMENTADOS" labelSide="left" />
      </UIShot>
    </S>

    {/* 125–155 s: efficiency */}
    <S k="campaign">
      <UIShot src={ui("plan-clean.png")} dur={len("campaign")} from={cam(960, 540, 1.0)} to={cam(960, 540, 1.1)} />
      <CampaignGraphic es />
    </S>
    <S k="sim"><SimExplainer dur={len("sim")} /></S>

    {/* 155–180 s: what was learned, next step */}
    <S k="debrief">
      <UIShot src={draft("debrief.png")} dur={len("debrief")} from={cam(1500, 480, 1.5)} to={cam(1690, 412, 2.0)}>
        <UIHighlight box={[1508, 238, 372, 130]} at={20} until={110} label="QUÉ APRENDIMOS · POR QUÉ CONFIAR · LÍMITES" labelSide="left" />
        <UICursor points={[[96, 1400, 520], [130, 1696, 430]]} clickAt={134} />
      </UIShot>
    </S>
    <S k="end"><EndCard es /></S>

    <Letterbox />
    {supers.map(([from, dur, l1, l2], i) => (
      <Sequence key={i} from={from} durationInFrames={dur}><TopSuper l1={l1} l2={l2} dur={dur} /></Sequence>
    ))}
    {disclosures.map(([a, b, text], i) => (
      <Sequence key={`d${i}`} from={a} durationInFrames={b - a}><Disclosure text={text} /></Sequence>
    ))}
    {narration.local.map((c, i) => (
      <Sequence key={i} from={c.from} durationInFrames={c.duration}>
        <Subtitle text={c.text} who={c.role || undefined} dur={c.duration} />
      </Sequence>
    ))}
    <Audio src={staticFile("audio/local-film-mix.wav")} />
  </AbsoluteFill>
);
