import React from "react";
import { D, T } from "./theme";

/** Barra superior común a las pantallas de consola. */
export const TopBar: React.FC<{ title: string; right?: string; scale?: number }> = ({ title, right, scale = 1 }) => (
  <div style={{ height: 96 * scale, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${48 * scale}px`, borderBottom: `1px solid ${T.line}`, fontFamily: T.sans, color: T.text, background: "#10151b" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 18 * scale }}>
      <IceWalkMark size={34 * scale} />
      <span style={{ fontSize: 28 * scale, fontWeight: 600, letterSpacing: -0.5 }}>IceWalk</span>
      <span style={{ width: 1, height: 24 * scale, background: T.line }} />
      <span style={{ fontSize: 24 * scale, color: T.dim }}>{title}</span>
    </div>
    <div style={{ fontFamily: T.mono, fontSize: 19 * scale, color: T.dim }}>{right ?? `SITE ${D.site.id.toUpperCase()} · ${D.replan.plan_id}`}</div>
  </div>
);

/** Marca simple: anillo con un punto medido. */
export const IceWalkMark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="11" fill="none" stroke="#e9eef3" strokeWidth="2" />
    <circle cx="13" cy="13" r="4.5" fill="#86b6ef" />
  </svg>
);

export const Label: React.FC<{ children: React.ReactNode; scale?: number }> = ({ children, scale = 1 }) => (
  <div style={{ fontFamily: T.sans, fontSize: 15 * scale, letterSpacing: 1.6, textTransform: "uppercase", color: T.dim, marginBottom: 8 * scale }}>{children}</div>
);

export const Big: React.FC<{ children: React.ReactNode; scale?: number; color?: string }> = ({ children, scale = 1, color }) => (
  <div style={{ fontFamily: T.mono, fontSize: 44 * scale, fontWeight: 500, color: color ?? T.text, lineHeight: 1.1 }}>{children}</div>
);

export const Row: React.FC<{ k: string; v: React.ReactNode; scale?: number; strong?: boolean }> = ({ k, v, scale = 1, strong }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: `${10 * scale}px 0`, borderBottom: `1px solid ${T.line}` }}>
    <span style={{ fontFamily: T.sans, fontSize: 19 * scale, color: T.dim }}>{k}</span>
    <span style={{ fontFamily: T.mono, fontSize: 21 * scale, color: T.text, fontWeight: strong ? 600 : 400 }}>{v}</span>
  </div>
);

export const Tag: React.FC<{ children: React.ReactNode; tone?: "neutral" | "advisory" | "caution" | "warning"; scale?: number }> = ({ children, tone = "neutral", scale = 1 }) => {
  const c = tone === "neutral" ? T.text : T[tone];
  return <span style={{ fontFamily: T.mono, fontSize: 15 * scale, fontWeight: 600, letterSpacing: 1, color: c, border: `1.5px solid ${c}`, borderRadius: 4, padding: `${3 * scale}px ${8 * scale}px` }}>{children}</span>;
};

export const Screen: React.FC<{ w: number; h: number; children: React.ReactNode }> = ({ w, h, children }) => (
  <div style={{ width: w, height: h, background: "radial-gradient(ellipse at 30% 0%,#1b232c,#0b1016 75%)", color: T.text, fontFamily: T.sans, fontVariantNumeric: "tabular-nums", WebkitFontSmoothing: "antialiased", overflow: "hidden", position: "relative" }}>{children}</div>
);
