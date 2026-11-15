import React from "react";
import { Img, staticFile } from "remotion";
import { D, T } from "./theme";

type Box = { xmin: number; xmax: number; ymin: number; ymax: number };
type Station = { id: string; xy: number[]; p_ice: number | null; order: number };

export type MapProps = {
  state: "before" | "after";
  layer: "probability" | "uncertainty";
  view?: Box;
  width: number;
  height: number;
  layerOpacity?: number;
  showRoute?: boolean;
  showChange?: boolean;
  focus?: string;
  labelScale?: number;
  /** Stations shown (in plan order); default all. */
  stationReveal?: number;
  /** Fraction of the route drawn, 0..1; default 1. */
  routeReveal?: number;
};

const FULL = D.view_box_m as Box;

/** Caja que encuadra las estaciones con margen, manteniendo la proporción pedida. */
export const stationsView = (aspect: number, marginM = 220): Box => {
  const pts = [...D.stations_before, ...D.stations_after].map((s) => s.xy);
  let xmin = Math.min(...pts.map((p) => p[0])) - marginM;
  let xmax = Math.max(...pts.map((p) => p[0])) + marginM;
  let ymin = Math.min(...pts.map((p) => p[1])) - marginM;
  let ymax = Math.max(...pts.map((p) => p[1])) + marginM;
  const w = xmax - xmin;
  const h = ymax - ymin;
  if (w / h > aspect) {
    const nh = w / aspect;
    ymin -= (nh - h) / 2;
    ymax += (nh - h) / 2;
  } else {
    const nw = h * aspect;
    xmin -= (nw - w) / 2;
    xmax += (nw - w) / 2;
  }
  return { xmin, xmax, ymin, ymax };
};

export const IceMap: React.FC<MapProps> = ({
  state, layer, view, width, height, layerOpacity = 0.72, showRoute = true, showChange = false, focus, labelScale = 1,
  stationReveal = Infinity, routeReveal = 1,
}) => {
  const v = view ?? stationsView(width / height);
  const sx = width / (v.xmax - v.xmin);
  const sy = height / (v.ymax - v.ymin);
  const px = (x: number, y: number) => [(x - v.xmin) * sx, (v.ymax - y) * sy];
  // Capa completa (FULL) posicionada en coordenadas de pantalla.
  const [fl, ft] = px(FULL.xmin, FULL.ymax);
  const fw = (FULL.xmax - FULL.xmin) * sx;
  const fh = (FULL.ymax - FULL.ymin) * sy;
  const layerFile = `data/${layer === "probability" ? "prob" : "unc"}_${state}.png`;
  const stations: Station[] = state === "before" ? D.stations_before : D.stations_after;
  const route = state === "before" ? D.route_before_xy : D.route_after_xy;
  const measured = D.measurement.station_id;
  const mxy = D.stations_before.find((s) => s.id === measured)!.xy;
  const cb = D.map.change.bbox_xy_m;
  const r = 15 * labelScale;
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", background: "#2a2622" }}>
      <Img src={staticFile("data/hirise_view.png")} style={{ position: "absolute", left: fl, top: ft, width: fw, height: fh, filter: "grayscale(1) contrast(1.08) brightness(0.92)" }} />
      <Img src={staticFile(layerFile)} style={{ position: "absolute", left: fl, top: ft, width: fw, height: fh, opacity: layerOpacity, mixBlendMode: "multiply", imageRendering: "auto" }} />
      {showChange && state === "after" && (
        <Img src={staticFile("data/change.png")} style={{ position: "absolute", left: fl, top: ft, width: fw, height: fh, imageRendering: "pixelated" }} />
      )}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {showRoute && route.map((line, i) => {
          const pts = line.map(([x, y]) => px(x, y));
          const len = pts.slice(1).reduce((a, p, k) => a + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0);
          return (
            <g key={i}>
              <defs><mask id={`route-${i}`}><polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#fff" strokeWidth={8 * labelScale} strokeDasharray={`${len * routeReveal} ${len}`} /></mask></defs>
              <polyline points={pts.map((p) => p.join(",")).join(" ")} mask={`url(#route-${i})`} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2.2 * labelScale} strokeDasharray={`${8 * labelScale} ${6 * labelScale}`} />
            </g>
          );
        })}
        {showChange && state === "after" && cb && (() => {
          const [x0, y0] = px(cb.xmin, cb.ymax);
          const [x1, y1] = px(cb.xmax, cb.ymin);
          return <rect x={x0 - 6} y={y0 - 6} width={x1 - x0 + 12} height={y1 - y0 + 12} fill="none" stroke="#fff" strokeWidth={1.5 * labelScale} strokeDasharray="4 4" />;
        })()}
        {state === "after" && (() => {
          const [x, y] = px(mxy[0], mxy[1]);
          return (
            <g>
              <circle cx={x} cy={y} r={r} fill="#fff" stroke="#000" strokeWidth={2} />
              <path d={`M ${x - r * 0.45} ${y} l ${r * 0.3} ${r * 0.32} l ${r * 0.6} ${-r * 0.62}`} stroke="#000" strokeWidth={2.4 * labelScale} fill="none" />
              <text x={x + r + 8} y={y - r - 2} fill="#fff" fontFamily={T.mono} fontSize={17 * labelScale} fontWeight={600} style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.75)", strokeWidth: 4 }}>{measured} · NO ICE ≤ 1.0 m</text>
            </g>
          );
        })()}
        {stations.filter((s) => s.order <= stationReveal).map((s) => {
          const [x, y] = px(s.xy[0], s.xy[1]);
          const isFocus = s.id === focus;
          return (
            <g key={s.id}>
              <circle cx={x} cy={y} r={isFocus ? r * 1.25 : r} fill={isFocus ? "#fff" : "rgba(9,12,16,0.85)"} stroke="#fff" strokeWidth={2 * labelScale} />
              <text x={x} y={y + 5.5 * labelScale} textAnchor="middle" fill={isFocus ? "#000" : "#fff"} fontFamily={T.mono} fontSize={15 * labelScale} fontWeight={600}>{s.order}</text>
              <text x={s.id.startsWith("E02") ? x - r - 7 : x + r + 7} y={y + 5 * labelScale} textAnchor={s.id.startsWith("E02") ? "end" : "start"} fill="#fff" fontFamily={T.mono} fontSize={15 * labelScale} style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.7)", strokeWidth: 4 }}>{s.id}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const Legend: React.FC<{ layer: "probability" | "uncertainty"; width: number; scale?: number }> = ({ layer, width, scale = 1 }) => {
  const pal = layer === "probability" ? D.map.palette_probability : D.map.palette_uncertainty;
  const grad = `linear-gradient(90deg, ${pal.stops.map((s) => `${s.color} ${s.value * 100}%`).join(", ")})`;
  const label = layer === "probability" ? `P(ice ≤ ${D.site.threshold_m} m)` : "Uncertainty left (1 = prior only)";
  return (
    <div style={{ width, fontFamily: T.sans, color: T.text }}>
      <div style={{ fontSize: 20 * scale, fontWeight: 500, marginBottom: 10 * scale }}>{label}</div>
      <div style={{ height: 14 * scale, background: grad, borderRadius: 2 }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 16 * scale, color: T.dim, marginTop: 6 * scale }}>
        <span>0</span><span>0.5</span><span>1</span>
      </div>
    </div>
  );
};
