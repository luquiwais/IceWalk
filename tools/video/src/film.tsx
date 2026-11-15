import React from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { T } from "./ui/theme";

export type Rect = { x: number; y: number; w: number; h: number };
export const FULL: Rect = { x: 0, y: 0, w: 1920, h: 1080 };

const lerp = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t,
});

/** Encuadre que viaja de un rectángulo a otro del cuadro 1920x1080 (empuje de cámara). */
export const Move: React.FC<{ from: Rect; to: Rect; dur: number; ease?: boolean; children: React.ReactNode }> = ({ from, to, dur, ease = true, children }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease ? Easing.inOut(Easing.cubic) : undefined });
  const r = lerp(from, to, t);
  const s = 1920 / r.w;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 1920, height: 1080, transformOrigin: "0 0", transform: `scale(${s}) translate(${-r.x}px, ${-r.y}px)` }}>{children}</div>
    </AbsoluteFill>
  );
};

export const Plate: React.FC<{ src: string }> = ({ src }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", width: 1920, height: 1080, objectFit: "cover" }} />
);

export const Clip: React.FC<{ src: string; startFrom?: number }> = ({ src, startFrom = 0 }) => (
  <OffthreadVideo src={staticFile(src)} startFrom={startFrom} muted style={{ position: "absolute", width: 1920, height: 1080, objectFit: "cover" }} />
);

/** Etiqueta de toma pendiente: se ve solo mientras la placa es provisoria. */
export const Pending: React.FC<{ id: string }> = ({ id }) => (
  <div style={{ position: "absolute", right: 40, bottom: 160, fontFamily: T.mono, fontSize: 22, color: "#ffcc66", background: "rgba(0,0,0,0.55)", padding: "4px 10px" }}>PLACEHOLDER · {id}</div>
);

/** Grano y viñeta suaves para unificar placas y clips. */
export const Grade: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 24} /></filter>
        <rect width="1920" height="1080" filter="url(#g)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Fade: React.FC<{ dur: number; inF?: number; outF?: number; children: React.ReactNode }> = ({ dur, inF = 0, outF = 0, children }) => {
  const f = useCurrentFrame();
  const o = Math.min(inF ? interpolate(f, [0, inF], [0, 1], { extrapolateRight: "clamp" }) : 1, outF ? interpolate(f, [dur - outF, dur], [1, 0], { extrapolateLeft: "clamp" }) : 1);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

/** Subtítulo de voz o radio. */
export const Sub: React.FC<{ text: string; who?: string }> = ({ text, who }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, textAlign: "center" }}>
    <span style={{ fontFamily: T.sans, fontSize: 44, fontWeight: 500, color: "#fff", background: "rgba(0,0,0,0.5)", padding: "6px 18px", borderRadius: 4, textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
      {who ? <span style={{ fontFamily: T.mono, fontSize: 30, color: "#c9d3dd", marginRight: 14 }}>{who}</span> : null}
      {text}
    </span>
  </div>
);

/** Rótulo de lugar o estación, abajo a la izquierda. */
export const Super: React.FC<{ l1: string; l2?: string }> = ({ l1, l2 }) => (
  <div style={{ position: "absolute", left: 90, bottom: 170, fontFamily: T.mono, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
    <div style={{ fontSize: 34, fontWeight: 500 }}>{l1}</div>
    {l2 ? <div style={{ fontSize: 26, opacity: 0.8 }}>{l2}</div> : null}
  </div>
);

/** Marca de IA persistente (reglas de Space Apps). */
export const AiMark: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", top: 34, right: 44, fontFamily: T.sans, fontSize: 22, color: "rgba(255,255,255,0.72)", letterSpacing: 0.5 }}>{text}</div>
);
