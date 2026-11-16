import React from "react";
import { AbsoluteFill, Easing, Freeze, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { T } from "../ui/theme";

/** 2.39:1 picture area inside the 1920x1080 frame. */
export const PIC = { top: 138, h: 804, w: 1920 };
export const ease = Easing.bezier(0.45, 0, 0.2, 1);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** A rendered 3D shot (1920x804) inside the letterbox. `from` = first shot frame to show (0-based). */
export const Shot: React.FC<{ name: string; from?: number; children?: React.ReactNode; zoom?: [number, number]; dur?: number; origin?: string; hold?: boolean }> = ({ name, from = 0, children, zoom, dur = 60, origin = "50% 50%", hold = false }) => {
  const f = useCurrentFrame();
  const s0 = zoom ? interpolate(f, [0, dur], zoom, { ...clamp, easing: ease }) : 1;
  // Handheld operator: sub-pixel drift and roll from layered sines (deterministic per frame), with a 1.6% overscan.
  const t = f + from;
  const shakeX = Math.sin(t * 0.21) * 2.2 + Math.sin(t * 0.53 + 1.3) * 0.9;
  const shakeY = Math.sin(t * 0.17 + 0.7) * 1.6 + Math.sin(t * 0.61 + 2.1) * 0.7;
  const roll = Math.sin(t * 0.11 + 0.4) * 0.12;
  const s = s0 * 1.016;
  // Photographic grade: slightly lifted contrast, desaturated toward Mars dust, warm atmospheric haze outdoors.
  const outdoor = !name.startsWith("console");
  const video = <OffthreadVideo src={staticFile(`v2/${name}.mp4`)} trimBefore={from} muted style={{ width: PIC.w, height: PIC.h, filter: outdoor ? "contrast(1.07) saturate(0.9) sepia(0.08) brightness(0.98)" : "contrast(1.05) saturate(0.92)" }} />;
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${shakeX}px, ${shakeY}px) rotate(${roll}deg) scale(${s})`, transformOrigin: origin }}>
        {hold ? <Freeze frame={0}>{video}</Freeze> : video}
      </AbsoluteFill>
      {outdoor ? <Dust seed={name.length * 7} f={t} /> : null}
      {outdoor ? <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(205,160,118,.13) 0%, rgba(205,160,118,.04) 38%, rgba(0,0,0,0) 55%, rgba(20,10,4,.10) 100%)", pointerEvents: "none" }} /> : null}
      {children}
    </AbsoluteFill>
  );
};

/** Airborne dust motes catching the low sun: sparse, soft, drifting downwind. Deterministic per shot. */
const Dust: React.FC<{ seed: number; f: number }> = ({ seed, f }) => {
  const motes = Array.from({ length: 46 }, (_, i) => {
    const r = (k: number) => { const x = Math.sin((i + 1) * 12.9898 + seed * 78.233 + k * 37.719) * 43758.5453; return x - Math.floor(x); };
    const size = 1.2 + r(1) * 3.2;
    const speed = 0.5 + r(2) * 1.6;
    const x = ((r(3) * 2100 + f * speed * 1.8) % 2100) - 90;
    const y = r(4) * PIC.h + Math.sin(f * 0.05 + r(5) * 6) * 14 + f * 0.15 * r(6);
    const o = 0.12 + r(7) * 0.28;
    return <div key={i} style={{ position: "absolute", left: x, top: y % PIC.h, width: size, height: size, borderRadius: "50%", background: "rgba(255,236,214,1)", opacity: o, filter: `blur(${size > 3.4 ? 1.6 : 0.6}px)` }} />;
  });
  return <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>{motes}</AbsoluteFill>;
};

/** Letterbox bars, film grain, vignette and a gentle halation on highlights. */
export const Letterbox: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ top: PIC.top, height: PIC.h, background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 58%, rgba(0,0,0,.38) 100%)" }} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay" }}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={f % 12} /></filter>
        <rect width="1920" height="1080" filter="url(#grain)" />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: PIC.top, background: "#000" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: PIC.top, background: "#000" }} />
    </AbsoluteFill>
  );
};

/** Subtitle in the lower bar. Radio lines carry the speaker call sign. */
export const Subtitle: React.FC<{ text: string; who?: string; dur: number }> = ({ text, who, dur }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 4, dur - 5, dur], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: PIC.top, display: "flex", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: T.sans, fontSize: 36, fontWeight: 500, color: "#f3f5f7", letterSpacing: 0.2, textAlign: "center", lineHeight: 1.25, maxWidth: 1500, textWrap: "balance" }}>
        {who ? <span style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 500, color: "#9aa7b4", letterSpacing: 2, marginRight: 18, verticalAlign: "3px" }}>{who}</span> : null}
        {text}
      </div>
    </div>
  );
};

/** Location / data super in the upper bar, left aligned like a mission film. */
export const TopSuper: React.FC<{ l1: string; l2?: string; dur: number }> = ({ l1, l2, dur }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  const chars = Math.floor(interpolate(f, [0, 14], [0, l1.length], clamp));
  return (
    <div style={{ position: "absolute", left: 64, top: 0, height: PIC.top, display: "flex", flexDirection: "column", justifyContent: "center", opacity: o, fontFamily: T.mono, color: "#e9eef3" }}>
      <div style={{ fontSize: 22, letterSpacing: 2.4, fontWeight: 500 }}>{l1.slice(0, chars)}</div>
      {l2 ? <div style={{ fontSize: 16, letterSpacing: 1.6, color: "#8b97a4", marginTop: 8 }}>{l2}</div> : null}
    </div>
  );
};

/** Persistent disclosure, upper-right bar (Space Apps: AI/visualization transparency). */
export const Disclosure: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", right: 64, top: 0, height: PIC.top, display: "flex", alignItems: "center", fontFamily: T.mono, fontSize: 15, letterSpacing: 1.6, color: "#6f7b87" }}>{text}</div>
);

export const Still: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", ...style }} />
);
