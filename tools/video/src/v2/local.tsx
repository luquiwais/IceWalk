import React from "react";
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Legend, IceMap, stationsView } from "../ui/map";
import { EvaWindow, ReviewCard, Tools } from "../ui/screens";
import { D, T, fmtH } from "../ui/theme";
import { PIC, clamp, ease } from "./kit";

/** Full-frame UI insert (a monitor seen up close): slow push, pixel grid, glass sheen. */
export const UiInsert: React.FC<{ dur: number; zoom?: [number, number]; origin?: string; children: React.ReactNode }> = ({ dur, zoom = [1.02, 1.12], origin = "50% 45%", children }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], zoom, { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, overflow: "hidden", background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: origin }}>
        <div style={{ position: "absolute", left: 0, top: -138, width: 1920, height: 1080 }}>{children}</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.10) 0 1px, transparent 1px 3px)", mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: "linear-gradient(115deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,0) 35%)" }} />
    </AbsoluteFill>
  );
};

/** Site map story: probability or uncertainty layer, stations appearing in order, route drawn. */
export const MapStory: React.FC<{ dur: number; layer: "probability" | "uncertainty"; state?: "before" | "after"; reveal?: "layer" | "stations" | "route" | "none"; caption: string; sub?: string }> = ({ dur, layer, state = "before", reveal = "none", caption, sub }) => {
  const f = useCurrentFrame();
  const w = 1920, h = PIC.h;
  const layerOp = reveal === "layer" ? interpolate(f, [10, 50], [0, .78], clamp) : .78;
  const st = reveal === "stations" ? Math.floor(interpolate(f, [12, dur - 30], [0, 6.99], clamp)) : reveal === "layer" ? 0 : 9;
  const route = reveal === "route" ? interpolate(f, [10, dur - 20], [0, 1], { ...clamp, easing: ease }) : reveal === "stations" ? 0 : 1;
  const s = interpolate(f, [0, dur], [1.0, 1.08], { ...clamp, easing: ease });
  const view = stationsView(w / h, 160);
  return (
    <AbsoluteFill style={{ top: PIC.top, height: h, overflow: "hidden", background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: "50% 50%" }}>
        <IceMap state={state} layer={layer} width={w} height={h} view={view} layerOpacity={layerOp} stationReveal={st} routeReveal={route} labelScale={1.5} showRoute={reveal !== "layer"} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 72, bottom: 54, width: 520, padding: "22px 26px", background: "rgba(5,8,11,.78)", borderLeft: "2px solid rgba(255,255,255,.8)" }}>
        <div style={{ fontFamily: T.mono, fontSize: 15, letterSpacing: 2, color: "#9aa7b4", marginBottom: 14 }}>{caption}</div>
        <Legend layer={layer} width={460} />
        {sub ? <div style={{ fontFamily: T.mono, fontSize: 14, letterSpacing: 1.2, color: "#8b97a4", marginTop: 14 }}>{sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

/** The departure clock, explained on the EVA timeline (all minutes from the planner). */
export const ClockExplainer: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = D.timeline, c = D.clock.station_end, dec = D.decision;
  const total = dec.decide_by_min;
  const W = 1500, x0 = 210;
  const X = (m: number) => x0 + (m / total) * W;
  const grow = interpolate(f, [8, 60], [0, 1], { ...clamp, easing: ease });
  const now = interpolate(f, [30, 70], [0, 1], clamp);
  const seg = (a: number, b: number, color: string, label: string, k: number, below = false) => (
    <g opacity={interpolate(f, [8 + k * 8, 20 + k * 8], [0, 1], clamp)}>
      <rect x={X(a)} y={330} width={Math.max(2, (X(b) - X(a)) * grow)} height={34} fill={color} />
      <line x1={X((a + b) / 2)} y1={below ? 364 : 330} x2={X((a + b) / 2)} y2={below ? 382 : 312} stroke="#5b6672" />
      <text x={X((a + b) / 2)} y={below ? 402 : 302} textAnchor="middle" fill="#9aa7b4" fontFamily={T.mono} fontSize={17} letterSpacing={1.5}>{label}</text>
    </g>
  );
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, background: "#06090c" }}>
      <svg width={1920} height={PIC.h}>
        <rect x={x0} y={330} width={W} height={34} fill="rgba(255,255,255,.05)" />
        {seg(0, t.egress_end_min, "#3a4450", "SALIDA", 0)}
        {seg(t.egress_end_min, t.arrive_E03S24_min, "#55606c", "TRAYECTO", 1, true)}
        {seg(t.arrive_E03S24_min, t.depart_E03S24_min, "#86b6ef", D.measurement.station_id, 2)}
        <g opacity={now}>
          <line x1={X(c.pet_min)} y1={260} x2={X(c.pet_min)} y2={440} stroke="#fff" strokeWidth={2} />
          <text x={X(c.pet_min)} y={250} fill="#fff" fontFamily={T.mono} fontSize={22} textAnchor="middle">PET {Math.round(c.pet_min)}</text>
          <line x1={X(c.pet_min)} y1={420} x2={X(total)} y2={420} stroke="#fff" strokeWidth={1.5} strokeDasharray="6 6" />
          <line x1={X(total)} y1={300} x2={X(total)} y2={440} stroke="#f0b43c" strokeWidth={2} />
          <text x={X(total)} y={290} fill="#f0b43c" fontFamily={T.mono} fontSize={18} textAnchor="end">DECIDIR ANTES DE · {Math.round(total)} min</text>
        </g>
      </svg>
      <div style={{ position: "absolute", left: x0 + (X(c.pet_min) - x0) + 30, top: 460, opacity: now, fontFamily: T.mono, color: "#fff" }}>
        <div style={{ fontSize: 17, letterSpacing: 2, color: "#9aa7b4" }}>HASTA LA PARTIDA OBLIGATORIA</div>
        <div style={{ fontSize: 64, fontWeight: 600 }}>{fmtH(c.h, c.m)}</div>
        <div style={{ fontSize: 17, letterSpacing: 1.2, color: "#9aa7b4", marginTop: 10, maxWidth: 900, lineHeight: 1.5, opacity: interpolate(f, [80, 100], [0, 1], clamp) }}>
          INCLUYE EL REGRESO Y EL INGRESO AL HÁBITAT · LA RESERVA YA ESTÁ EN EL PRESUPUESTO DE LA EVA
        </div>
      </div>
      <div style={{ position: "absolute", right: 64, bottom: 24, fontFamily: T.mono, fontSize: 14, letterSpacing: 1.6, color: "#6f7b87" }}>{D.clock.formula.toUpperCase()}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, background: `linear-gradient(90deg, #86b6ef ${(f / dur) * 100}%, transparent 0)` , opacity: 0 }} />
    </AbsoluteFill>
  );
};

/** NASA archive insert (Earth analogues), cropped to the film frame and labelled as context. */
export const Archive: React.FC<{ src: string; frames: number }> = ({ src, frames }) => {
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", left: 0, top: -138, width: 1920, height: 1080 }}>
        <OffthreadVideo src={staticFile(src)} trimAfter={frames} muted style={{ width: 1920, height: 1080, objectFit: "cover", filter: "saturate(.85) contrast(1.05)" }} />
      </div>
    </AbsoluteFill>
  );
};

export const ToolsInsert: React.FC<{ dur: number; detail?: boolean }> = ({ dur, detail = false }) => <UiInsert dur={dur} zoom={detail ? [1.3, 1.45] : [1.02, 1.12]} origin={detail ? "72% 55%" : "50% 45%"}><Tools /></UiInsert>;
export const WindowInsert: React.FC<{ dur: number; zoom?: [number, number]; origin?: string }> = ({ dur, zoom, origin }) => <UiInsert dur={dur} zoom={zoom} origin={origin}><EvaWindow /></UiInsert>;
export const ReviewInsert: React.FC<{ dur: number; confirmAt?: number }> = ({ dur, confirmAt = 1e9 }) => {
  const f = useCurrentFrame();
  return <UiInsert dur={dur} zoom={[1.0, 1.1]} origin="60% 70%"><ReviewCard confirmed={f >= confirmAt} /></UiInsert>;
};

/** Real app screen recording (1920x1080) shown inside the picture area. */
export const UIVideo: React.FC<{ src: string; trimBefore?: number; top?: number }> = ({ src, trimBefore, top = -120 }) => (
  <AbsoluteFill style={{ top: PIC.top, height: PIC.h, overflow: "hidden", background: "#000" }}>
    <div style={{ position: "absolute", left: 0, top, width: 1920, height: 1080 }}>
      <OffthreadVideo src={staticFile(src)} trimBefore={trimBefore} muted style={{ width: 1920, height: 1080 }} />
    </div>
  </AbsoluteFill>
);

/** How the campaign simulation works (values from docs/EXPERIMENTS.md, 14/11: Monte Carlo, S1094b prior). */
export const SimExplainer: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const c = D.campaign;
  const inn = (d: number) => interpolate(f, [d, d + 14], [0, 1], { ...clamp, easing: ease });
  const dots = (n: number, hits: number, d: number, color: string) => (
    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ width: 40, height: 40, borderRadius: 20, border: "2px solid #5b6672", background: i < hits ? color : "transparent", opacity: inn(d + i * 3) }} />
      ))}
    </div>
  );
  const row = (title: string, sub: string, val: string, d: number, strong: boolean, hits: number) => (
    <div style={{ marginBottom: 54, opacity: inn(d) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 30, color: strong ? "#eef2f5" : "#9aa7b4" }}>{title}</span>
        <span style={{ fontFamily: T.mono, fontSize: 40, fontWeight: 600, color: strong ? "#fff" : "#9aa7b4" }}>{val}</span>
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 16, letterSpacing: 1.4, color: "#8b97a4", marginTop: 8 }}>{sub}</div>
      {dots(c.stations_per_eva, hits, d + 10, strong ? "#86b6ef" : "#5b6672")}
    </div>
  );
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, background: "#05080b", color: "#eef2f5", fontFamily: T.sans }}>
      <div style={{ position: "absolute", left: 240, right: 240, top: 96 }}>
        <div style={{ fontFamily: T.mono, fontSize: 17, letterSpacing: 2.6, color: "#8b97a4", marginBottom: 44 }}>CÓMO FUNCIONA LA SIMULACIÓN · UNA EVA = {c.stations_per_eva} ESTACIONES · TALADRO DE {c.drill_m.toFixed(0)} m</div>
        {row("Taladro a ciegas", "P(HIELO) POR PERFORACIÓN ≈ 0,06 · PRIOR DE S1094b", "≈ 6 / 100", 8, false, 0)}
        {row("Radar primero: perforar donde marca hielo ≤ 1 m", "50 SONDEOS DE RADAR POR EVA · P(HIELO) POR PERFORACIÓN ≈ 0,50", "≈ 50 / 100", Math.round(dur * 0.48), true, 3)}
        <div style={{ fontFamily: T.mono, fontSize: 15, letterSpacing: 1.4, color: "#8b97a4", opacity: inn(Math.round(dur * 0.7)), lineHeight: 1.6 }}>
          MONTE CARLO · SONDEOS Y EVAs INDEPENDIENTES (SUPUESTO) · ESTACIONES ILUSTRATIVAS · NO ES UN RESULTADO DE CAMPO
        </div>
      </div>
    </AbsoluteFill>
  );
};
