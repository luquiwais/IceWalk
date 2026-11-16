import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { PIC, clamp, ease } from "../v2/kit";
import { T } from "../ui/theme";

/**
 * Real IceWalk app captures (public/ui-real/*.png, from apps/web at 1920x1080 CSS px, possibly @2x)
 * shown full width inside the picture area. All coordinates are in 1920x1080 app pixels.
 */
export type Cam = { x: number; y: number; scale: number };

/** Image offset so that (x, y) sits at the picture centre, clamped to keep the frame covered. */
const place = (cam: Cam) => {
  const w = 1920 * cam.scale, h = 1080 * cam.scale;
  const left = Math.min(0, Math.max(1920 - w, 960 - cam.x * cam.scale));
  const top = Math.min(0, Math.max(PIC.h - h, PIC.h / 2 - cam.y * cam.scale));
  return { left, top, w, h };
};

/** Maps an app-pixel point to picture-area pixels for a given camera. */
export const project = (cam: Cam, x: number, y: number) => {
  const { left, top } = place(cam);
  return { x: left + x * cam.scale, y: top + y * cam.scale };
};

export const camAt = (f: number, dur: number, from: Cam, to: Cam, start = 0): Cam => {
  const t = interpolate(f, [start, dur], [0, 1], { ...clamp, easing: ease });
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, scale: from.scale + (to.scale - from.scale) * t };
};

const Layer: React.FC<{ src: string; cam: Cam; opacity?: number }> = ({ src, cam, opacity = 1 }) => {
  const p = place(cam);
  return <Img src={staticFile(src)} style={{ position: "absolute", left: p.left, top: p.top, width: p.w, height: p.h, opacity }} />;
};

/** Camera shared with overlays so cursors/highlights follow the Ken Burns move. */
export const CamContext = React.createContext<Cam>({ x: 960, y: 540, scale: 1 });

/** Ken Burns over a real UI capture. `b`/`at`/`len` optionally crossfade to a second capture. */
export const UIShot: React.FC<{
  src: string; dur: number; from?: Cam; to?: Cam;
  b?: string; at?: number; len?: number; moveStart?: number; children?: React.ReactNode;
}> = ({ src, dur, from = { x: 960, y: 540, scale: 1 }, to, b, at = 0, len = 12, moveStart = 0, children }) => {
  const f = useCurrentFrame();
  const cam = camAt(f, dur, from, to ?? from, moveStart);
  const o = b ? interpolate(f, [at, at + len], [0, 1], clamp) : 0;
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, overflow: "hidden", background: "#000" }}>
      <Layer src={src} cam={cam} />
      {b ? <Layer src={b} cam={cam} opacity={o} /> : null}
      <CamContext.Provider value={cam}>{children}</CamContext.Provider>
    </AbsoluteFill>
  );
};

/** Crossfade between two captures with the same framing (e.g. map before → after a measurement). */
export const UICrossfade: React.FC<{ a: string; b: string; at: number; len?: number; dur: number; from?: Cam; to?: Cam; children?: React.ReactNode }> = ({ a, b, at, len = 14, dur, from, to, children }) => (
  <UIShot src={a} b={b} at={at} len={len} dur={dur} from={from} to={to}>{children}</UIShot>
);

/** macOS-style pointer travelling through [frame, x, y] keyframes (app pixels); optional click pulse. */
export const UICursor: React.FC<{ points: [number, number, number][]; clickAt?: number }> = ({ points, clickAt }) => {
  const f = useCurrentFrame();
  const cam = React.useContext(CamContext);
  const fr = points.map((p) => p[0]);
  const x = interpolate(f, fr, points.map((p) => p[1]), { ...clamp, easing: ease });
  const y = interpolate(f, fr, points.map((p) => p[2]), { ...clamp, easing: ease });
  const p = project(cam, x, y);
  const o = interpolate(f, [fr[0], fr[0] + 4], [0, 1], clamp);
  const press = clickAt !== undefined && f >= clickAt && f < clickAt + 4 ? 0.86 : 1;
  const ring = clickAt !== undefined ? interpolate(f, [clickAt, clickAt + 12], [0, 1], clamp) : 0;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, opacity: o }}>
      {clickAt !== undefined && f >= clickAt ? (
        <div style={{ position: "absolute", left: -26 * ring, top: -26 * ring, width: 52 * ring, height: 52 * ring, borderRadius: "50%", border: "2px solid rgba(255,255,255,.8)", opacity: 1 - ring }} />
      ) : null}
      <svg width={30} height={40} viewBox="0 0 22 30" style={{ transform: `scale(${press})`, transformOrigin: "0 0", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))" }}>
        <path d="M1 1 L1 22 L6.5 16.8 L10.4 26 L14 24.5 L10.2 15.6 L17.6 15.6 Z" fill="#000" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** Calls out a region of the UI (app pixels) with an outline and an optional mono label. */
export const UIHighlight: React.FC<{ box: [number, number, number, number]; at: number; until?: number; label?: string; labelSide?: "above" | "below" | "left"; round?: boolean }> = ({ box, at, until = 99999, label, labelSide = "below", round = false }) => {
  const f = useCurrentFrame();
  const cam = React.useContext(CamContext);
  const o = interpolate(f, [at, at + 8, until - 6, until], [0, 1, 1, 0], clamp);
  const grow = interpolate(f, [at, at + 10], [8, 0], { ...clamp, easing: ease });
  const a = project(cam, box[0], box[1]);
  const w = box[2] * cam.scale, h = box[3] * cam.scale;
  const lab: React.CSSProperties = labelSide === "above" ? { left: 0, bottom: h + 14 } : labelSide === "left" ? { right: w + 18, top: 0, textAlign: "right" } : { left: 0, top: h + 14 };
  return (
    <div style={{ position: "absolute", left: a.x - grow, top: a.y - grow, width: w + 2 * grow, height: h + 2 * grow, opacity: o }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: round ? "50%" : 14, border: "2px solid rgba(255,255,255,.92)", boxShadow: "0 0 0 9999px rgba(0,0,0,.28), 0 0 24px rgba(134,182,239,.45)" }} />
      {label ? (
        <div style={{ position: "absolute", ...lab, whiteSpace: "nowrap", fontFamily: T.mono, fontSize: 20, letterSpacing: 1.8, color: "#fff", background: "rgba(4,7,10,.78)", padding: "8px 14px", borderRadius: 8 }}>{label}</div>
      ) : null}
    </div>
  );
};

/** A real screen recording of the app (1920x1080) in the picture area, same crop as UIShot. `from` in seconds. */
export const UIVideo: React.FC<{ src: string; fromSec?: number; cam?: Cam; children?: React.ReactNode }> = ({ src, fromSec = 0, cam = { x: 960, y: 540, scale: 1 }, children }) => {
  const p = place(cam);
  return (
    <AbsoluteFill style={{ top: PIC.top, height: PIC.h, overflow: "hidden", background: "#000" }}>
      <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(fromSec * 24)} muted style={{ position: "absolute", left: p.left, top: p.top, width: p.w, height: p.h }} />
      <CamContext.Provider value={cam}>{children}</CamContext.Provider>
    </AbsoluteFill>
  );
};
