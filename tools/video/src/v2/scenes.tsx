import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { CornerPin } from "../ui/cornerpin";
import { IceWalkMark } from "../ui/chrome";
import { ConsoleMap, EvaWindow, ReviewCard } from "../ui/screens";
import { D, T, round1 } from "../ui/theme";
import { PIC, Shot, clamp, ease } from "./kit";
import wide from "./console_wide-screens.json";
import review from "./console_review-screens.json";
import section from "./section-screens.json";
import coreProfile from "./core_profile-screens.json";
import renderStatus from "./render-status.json";

type Pt = [number, number];
type Quad = [Pt, Pt, Pt, Pt];
// Blender exports corners in monitor-local order; the monitors face the camera, so local X is mirrored.
const quad = (c: number[][]): Quad => [c[1], c[0], c[3], c[2]] as Quad;

/** Live IceWalk UI composited on the monitor glass (screen blend keeps the glass reflections). */
const Pinned: React.FC<{ corners: Quad; children: React.ReactNode }> = ({ corners, children }) => (
  <div style={{ position: "absolute", inset: 0 }}>
    <CornerPin w={1920} h={1080} corners={corners} glow={0.05} blur={0.4} opacity={0.97}>{children}</CornerPin>
  </div>
);

const MapUpdate: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 14], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <ConsoleMap state="before" />
      <AbsoluteFill style={{ opacity: o }}><ConsoleMap state="after" /></AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ConsoleWide: React.FC<{ from?: number; updateAt?: number }> = ({ from = 0, updateAt = 20 }) => {
  const f = useCurrentFrame();
  if (renderStatus.console_wide) return <Shot name="console_wide" from={from} />;
  const k = Math.min(wide.length - 1, f + from);
  const s = wide[k] as Record<string, number[][]>;
  return (
    <Shot name="console_wide" from={from}>
      <Pinned corners={quad(s.main)}><MapUpdate at={updateAt} /></Pinned>
      <Pinned corners={quad(s.right)}><EvaWindow /></Pinned>
      <Pinned corners={quad(s.left)}><ReviewCard /></Pinned>
    </Shot>
  );
};

/** IV mouse cursor travelling to CONFIRM and clicking (screen-space of the 1920x1080 UI). */
const Cursor: React.FC<{ clickAt: number }> = ({ clickAt }) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [clickAt - 34, clickAt - 4], [1180, 1585], { ...clamp, easing: ease });
  const y = interpolate(f, [clickAt - 34, clickAt - 4], [520, 868], { ...clamp, easing: ease });
  const press = f >= clickAt && f < clickAt + 4 ? 0.85 : 1;
  return (
    <svg width={44} height={52} viewBox="0 0 22 26" style={{ position: "absolute", left: x, top: y, transform: `scale(${press * 1.6})`, transformOrigin: "0 0" }}>
      <path d="M1 1 L1 20 L6 15 L10 24 L13 23 L9 14 L16 14 Z" fill="#fff" stroke="#000" strokeWidth="1.2" />
    </svg>
  );
};

export const ConsoleReview: React.FC<{ from?: number; clickAt: number }> = ({ from = 0, clickAt }) => {
  const f = useCurrentFrame();
  if (renderStatus.console_review) return <Shot name="console_review" from={from} />;
  const k = Math.min(review.length - 1, f + from);
  const s = review[k] as Record<string, number[][]>;
  return (
    <Shot name="console_review" from={from}>
      <Pinned corners={quad(s.main)}><ConsoleMap state="after" /></Pinned>
      <Pinned corners={quad(s.right)}>
        <AbsoluteFill><ReviewCard confirmed={f >= clickAt} /><Cursor clickAt={clickAt} /></AbsoluteFill>
      </Pinned>
      <Pinned corners={quad(s.left)}><EvaWindow /></Pinned>
    </Shot>
  );
};

/** Full-frame monitor insert: the uncertainty layer before/after, legible. */
export const ScreenInsert: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], [1.04, 1.16], { ...clamp, easing: ease });
  const o = interpolate(f, [14, 20], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, overflow: "hidden", background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${s}) translateY(-60px)`, transformOrigin: "40% 45%" }}>
        <div style={{ position: "absolute", left: 0, top: -138, width: 1920, height: 1080 }}>
          <ConsoleMap state="before" layer="uncertainty" />
          <AbsoluteFill style={{ opacity: o }}><ConsoleMap state="after" layer="uncertainty" /></AbsoluteFill>
        </div>
      </AbsoluteFill>
      {/* Monitor texture: pixel grid, glass sheen, soft defocus at the edges. */}
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.10) 0 1px, transparent 1px 3px)", mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: "linear-gradient(115deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,0) 35%)" }} />
      <AbsoluteFill style={{ backdropFilter: "blur(2px)", WebkitMaskImage: "radial-gradient(ellipse at 45% 50%, transparent 55%, black 100%)", maskImage: "radial-gradient(ellipse at 45% 50%, transparent 55%, black 100%)" }} />
    </AbsoluteFill>
  );
};

/** Orbit → site: real HiRISE imagery, zooming to station E03S24. */
export const Descent: React.FC<{ dur: number; reverse?: boolean }> = ({ dur, reverse = false }) => {
  const f0 = useCurrentFrame();
  const f = reverse ? dur - f0 : f0;
  const t = interpolate(f, [0, dur], [0, 1], { ...clamp, easing: ease });
  // Overview: 2000 px = 3000 m, station at (.5, .654). Detail: 2000 px = 900 m, station at (.444, .556).
  // Equal ground resolution when s_detail = 0.3 * s_overview.
  const sOv = interpolate(t, [0, .55], [.9, 3.0], clamp);
  const sDt = t < .55 ? .3 * sOv : interpolate(t, [.55, 1], [.9, 3.6], clamp);
  const cross = interpolate(t, [.42, .55], [0, 1], clamp);
  const cx = 960, cy = PIC.h / 2;
  const ovH = 2000 * 2600 / 3000;
  const field = 1920 / (2000 * sDt) * 900;
  const blur = interpolate(t, [0, .15, .85, 1], [2, 0, 0, 1], clamp);
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, overflow: "hidden", background: "#000", filter: `blur(${blur}px) sepia(.55) saturate(1.6) hue-rotate(-14deg) brightness(.9) contrast(1.15)` }}>
      <Img src={staticFile("data/hirise_view.png")} style={{ position: "absolute", width: 2000, height: ovH, left: cx - .5 * 2000 * sOv, top: cy - .654 * ovH * sOv, transform: `scale(${sOv})`, transformOrigin: "0 0" }} />
      <Img src={staticFile("data/hirise_detail.png")} style={{ position: "absolute", width: 2000, height: 2000, left: cx - .444 * 2000 * sDt, top: cy - .556 * 2000 * sDt, transform: `scale(${sDt})`, transformOrigin: "0 0", opacity: cross }} />
      <svg width={1920} height={PIC.h} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={interpolate(t, [0, 1], [70, 26])} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth={1.5} />
        <line x1={cx - 110} y1={cy} x2={cx - 46} y2={cy} stroke="rgba(255,255,255,.7)" />
        <line x1={cx + 46} y1={cy} x2={cx + 110} y2={cy} stroke="rgba(255,255,255,.7)" />
      </svg>
      <div style={{ position: "absolute", left: cx + 84, top: cy - 58, fontFamily: T.mono, color: "#fff", fontSize: 20, letterSpacing: 1.5, textShadow: "0 1px 6px #000" }}>
        {D.measurement.station_id}<br /><span style={{ color: "#d4d9dd", fontSize: 16 }}>FIELD {Math.round(t < .55 ? 1920 / (2000 * sOv) * 3000 : field)} m</span>
      </div>
    </AbsoluteFill>
  );
};

/** Labels tracking the depth lines of the 3D cutaway. */
export const SectionLabels: React.FC<{ from?: number; es?: boolean; profile?: boolean }> = ({ from = 0, es = false, profile = false }) => {
  const f = useCurrentFrame();
  const tracking = profile ? coreProfile : section;
  const s = tracking[Math.min(tracking.length - 1, f + from)] as Record<string, number[]>;
  const st = D.stations_before[0];
  const row = (p: number[], top: string, bottom: string, color: string, appear: number) => {
    // The local profile continues across two cuts; keep its labels revealed.
    const o = interpolate(profile ? f + from : f, [appear, appear + 10], [0, 1], clamp);
    if (p[1] < 20 || p[1] > PIC.h - 20) return null;
    return (
      <div style={{ position: "absolute", left: Math.max(40, p[0] - 360), top: p[1] - 30, width: 330, textAlign: "right", opacity: o, fontFamily: T.mono, color }}>
        <div style={{ fontSize: 15, letterSpacing: 1.8, opacity: .8 }}>{top}</div>
        <div style={{ fontSize: 24, fontWeight: 600 }}>{bottom}</div>
      </div>
    );
  };
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h }}>
      {row(s.measured, es ? "TALADRO · MEDIDO" : "CORE DRILL · MEASURED", es ? `0–${round1(D.measurement.depth_m)} m · SIN HIELO` : `0–${round1(D.measurement.depth_m)} m · NO ICE`, "#ffffff", 4)}
      {row(s.median, es ? "ESTIMACIÓN DEL MODELO · MEDIANA" : "MODEL ESTIMATE · MEDIAN", es ? `hielo posible ≈ ${round1(st.depth_median_m!)} m` : `ice possible ≈ ${round1(st.depth_median_m!)} m`, "#a9c8f0", 26)}
      {row(s.horizon, es ? "ALCANCE DEL MODELO" : "MODEL HORIZON", `${round1(D.site.threshold_m)} m`, "#7f9cc4", 40)}
      <div style={{ position: "absolute", right: 64, bottom: 24, fontFamily: T.mono, fontSize: 15, letterSpacing: 1.6, color: "#8b97a4" }}>{es ? "ESTIMACIÓN · NO ES UNA IMAGEN DEL SUBSUELO" : "ESTIMATE · NOT A SUBSURFACE IMAGE"}</div>
    </AbsoluteFill>
  );
};

export const ResultCard: React.FC<{ es?: boolean }> = ({ es = false }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8], [0, 1], clamp);
  const x = interpolate(f, [0, 12], [-20, 0], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 96 + x, top: PIC.top + 72, opacity: o, fontFamily: T.mono, color: "#fff", borderLeft: "2px solid rgba(255,255,255,.85)", padding: "14px 26px", background: "linear-gradient(90deg, rgba(4,7,10,.72), rgba(4,7,10,0))" }}>
      <div style={{ fontSize: 17, letterSpacing: 2, color: "#c2c9cd" }}>{D.measurement.station_id} · {D.measurement.crew_member} · {es ? "MEDICIÓN SIMULADA" : "SIMULATED MEASUREMENT"}</div>
      <div style={{ fontSize: 46, fontWeight: 600, marginTop: 8 }}>{es ? "SIN HIELO" : "NO ICE"} ≤ {round1(D.measurement.depth_m)} m</div>
      <div style={{ fontSize: 18, letterSpacing: 1.2, color: "#c2c9cd", marginTop: 8 }}>{es ? "REGISTRADO · ENVIADO AL IV" : "LOGGED · SENT TO IV"}</div>
    </div>
  );
};

/** Transit HUD: the station distance is a snapshot, and no live return clock is validated. */
export const Hud: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame();
  const on = interpolate(f, [2, 12], [0, 1], clamp);
  const sway = Math.sin(f / 9) * 6;
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, color: "#eaf3ff", fontFamily: T.mono, textShadow: "0 0 10px rgba(120,170,255,.45)", opacity: on }}>
      {/* Visor edge: curved glass, slight chromatic vignette. */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 120% at 50% 45%, rgba(0,0,0,0) 62%, rgba(10,14,20,.55) 88%, rgba(0,0,0,.9) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(160deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 30%)" }} />
      {/* Bearing tape. */}
      <svg width={1920} height={80} style={{ position: "absolute", left: 0, top: 26 }}>
        {Array.from({ length: 25 }, (_, i) => i - 12).map((k) => (
          <line key={k} x1={960 + k * 40 + sway} y1={k % 3 === 0 ? 20 : 30} x2={960 + k * 40 + sway} y2={44} stroke="rgba(234,243,255,.6)" strokeWidth={1.2} />
        ))}
        <text x={960 + sway} y={70} fill="#eaf3ff" fontSize={18} textAnchor="middle" fontFamily={T.mono}>NEXT STATION</text>
        <path d="M955 4 L965 4 L960 14 Z" fill="#eaf3ff" />
      </svg>
      {/* Station marker anchored at the horizon ahead. */}
      <div style={{ position: "absolute", left: 960 - 14 + sway * 1.4, top: 340 + Math.sin(f / 6.5) * 4 }}>
        <svg width={28} height={28}><path d="M14 2 L26 14 L14 26 L2 14 Z" fill="none" stroke="#eaf3ff" strokeWidth={2} /></svg>
        <div style={{ position: "absolute", left: 40, top: -6, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{D.next.id}</div>
          <div style={{ fontSize: 18, opacity: .85 }}>{D.next.distance_m} m FROM {D.measurement.station_id} · CORE DRILL</div>
        </div>
      </div>
      {/* Left block: reviewed plan. Right block: a check, never a fabricated transit clock. */}
      <div style={{ position: "absolute", left: 120, top: 150 }}>
        <div style={{ fontSize: 15, letterSpacing: 2, opacity: .75 }}>PLAN REVIEWED</div>
        <div style={{ fontSize: 30, fontWeight: 600 }}>GO {D.next.id}</div>
        <div style={{ fontSize: 15, opacity: .7, marginTop: 6 }}>{D.replan.stations_kept.length} STATIONS KEPT</div>
      </div>
      <div style={{ position: "absolute", right: 120, top: 150, textAlign: "right" }}>
        <div style={{ fontSize: 15, letterSpacing: 2, opacity: .75 }}>TRAVERSE IN PROGRESS</div>
        <div style={{ fontSize: 30, fontWeight: 600 }}>FOLLOW REVIEWED PLAN</div>
        <div style={{ fontSize: 15, opacity: .7, marginTop: 6 }}>RECHECK DEPARTURE AT STATION</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, textAlign: "center", fontSize: 13, letterSpacing: 3, opacity: .55 }}>AR INTERFACE CONCEPT</div>
    </AbsoluteFill>
  );
};

/** Campaign strategy as a film graphic over a darkened plate. */
export const CampaignGraphic: React.FC<{ es?: boolean }> = ({ es = false }) => {
  const f = useCurrentFrame();
  const c = D.campaign;
  const blind = c.series.find((s) => s.strategy === "blind_drill")!;
  const radar = c.series.find((s) => s.strategy === "radar_first_50")!;
  const grow = (d: number) => interpolate(f, [d, d + 22], [0, 1], { ...clamp, easing: ease });
  const count = (v: number, d: number) => (v * grow(d)).toFixed(2);
  const max = blind.evas_to_confirm;
  const bar = (label: string, v: number, d: number, strong: boolean) => (
    <div style={{ marginBottom: 46, opacity: interpolate(f, [d - 6, d], [0, 1], clamp) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span style={{ fontSize: 28, color: strong ? "#eef2f5" : "#8b97a4" }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontSize: strong ? 64 : 44, fontWeight: 600, color: strong ? "#ffffff" : "#8b97a4" }}>{count(v, d)}<span style={{ fontSize: 24, marginLeft: 10, fontWeight: 400 }}>EVAs</span></span>
      </div>
      <div style={{ height: strong ? 18 : 12, background: "rgba(255,255,255,.08)" }}>
        <div style={{ width: `${(v / max) * 100 * grow(d)}%`, height: "100%", background: strong ? "#86b6ef" : "#5b6672" }} />
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, color: "#eef2f5", fontFamily: T.sans }}>
      <AbsoluteFill style={{ background: "rgba(3,5,8,.72)" }} />
      <div style={{ position: "absolute", left: 220, right: 220, top: 150 }}>
        <div style={{ fontFamily: T.mono, fontSize: 17, letterSpacing: 2.6, color: "#8b97a4", marginBottom: 40 }}>{es ? "EVAs ESPERADAS PARA CONFIRMAR HIELO" : "EXPECTED EVAs TO CONFIRM ICE"} · {es ? "SITIO" : "SITE"} {c.site}</div>
        {bar(es ? "Taladro sin radar" : blind.label, blind.evas_to_confirm, 6, false)}
        {bar(es ? "Radar primero, 50 sondeos por EVA" : radar.label, radar.evas_to_confirm, 22, true)}
        <div style={{ fontFamily: T.mono, fontSize: 15, letterSpacing: 1.4, color: "#8b97a4", opacity: grow(34) }}>
          {es
            ? `SIMULACIÓN · MONTE CARLO · TALADRO ${round1(c.drill_m)} m · ${c.stations_per_eva} ESTACIONES POR EVA · EVAs INDEPENDIENTES (SUPUESTO)`
            : `SIMULATION · MONTE CARLO · DRILL ${round1(c.drill_m)} m · ${c.stations_per_eva} STATIONS PER EVA · EVAs ASSUMED INDEPENDENT`}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const NumbersCard: React.FC<{ dur: number; es?: boolean }> = ({ dur, es = false }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [6, 18, dur - 10, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: T.sans, fontSize: 52, fontWeight: 500, color: "#fff", textShadow: "0 2px 18px rgba(0,0,0,.8)" }}>{es ? "Todos los números de este video salieron de IceWalk." : "Every number on screen came from IceWalk."}</div>
      <div style={{ fontFamily: T.mono, fontSize: 18, letterSpacing: 2, color: "#c2c9cd", marginTop: 22 }}>{es ? "SALIDA DEL PLANIFICADOR · MEDICIÓN SIMULADA" : "PLANNER OUTPUT · SIMULATED MEASUREMENT"} · HiRISE: NASA/JPL-CALTECH/UARIZONA</div>
    </AbsoluteFill>
  );
};

export const EndCard: React.FC<{ es?: boolean }> = ({ es = false }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10], [0, 1], clamp);
  const sub = interpolate(f, [10, 22], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: T.sans }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28, opacity: o }}><IceWalkMark size={74} /><span style={{ fontSize: 96, fontWeight: 600, letterSpacing: 1 }}>IceWalk</span></div>
      <div style={{ fontSize: 30, marginTop: 26, color: "#c9d1d8", opacity: sub }}>{es ? "Entender la incertidumbre. Planificar el siguiente paso." : "Understand uncertainty. Plan the next step."}</div>
      <div style={{ position: "absolute", bottom: PIC.top + 88, fontFamily: T.mono, fontSize: 15, letterSpacing: 1.6, color: "#6f7b87", opacity: sub }}>
        {es
          ? "DARIONAUTAS · NASA SPACE APPS CHALLENGE 2026 · PROTOTIPO · EVA SIMULADA · AR CONCEPTUAL · VISUALIZACIÓN 3D"
          : "DARIONAUTAS · NASA SPACE APPS CHALLENGE 2026 · PROTOTYPE · SIMULATED EVA · AR CONCEPT · 3D VISUALIZATION"}
      </div>
      <div style={{ position: "absolute", bottom: PIC.top + 54, fontFamily: T.mono, fontSize: 14, letterSpacing: 1.2, color: "#89939d", opacity: sub }}>
        {es ? "VOCES SINTÉTICAS" : "SYNTHETIC VOICES"}: GEMINI · ORUS / CHARON
      </div>
      <div style={{ position: "absolute", bottom: PIC.top + 28, fontFamily: T.mono, fontSize: 14, color: "#89939d", opacity: sub }}>
        Astronaut: “Animated Astronaut Character in Space Suit Loop” · LasquetiSpice · CC BY 4.0 · Adapted
      </div>
    </AbsoluteFill>
  );
};
