import React from "react";
import { D, T, fmtH, pct, round1 } from "./theme";
import { Big, Label, Row, Screen, Tag, TopBar } from "./chrome";
import { IceMap, Legend } from "./map";

const W = 1920;
const H = 1080;
const clock = D.clock;
const meas = D.measurement;
const rp = D.replan;

/** Monitor principal del IV: mapa del sitio con capa y barra lateral. */
export const ConsoleMap: React.FC<{ state: "before" | "after"; layer?: "probability" | "uncertainty" }> = ({ state, layer = "probability" }) => {
  const side = 520;
  const stations = state === "before" ? D.stations_before : D.stations_after;
  return (
    <Screen w={W} h={H}>
      <TopBar title={state === "before" ? "Site model · before EVA" : "Site model · updated with E03S24"} right={`SITE ${D.site.id.toUpperCase()} · ${state === "before" ? "plan-demo0001" : rp.plan_id}`} />
      <div style={{ display: "flex", height: H - 64 }}>
        <IceMap state={state} layer={layer} width={W - side} height={H - 64} showChange={state === "after"} focus={state === "after" ? D.next.id : undefined} />
        <div style={{ width: side, padding: 32, borderLeft: `1px solid ${T.line}`, background: T.panel, display: "flex", flexDirection: "column", gap: 26 }}>
          <Legend layer={layer} width={side - 64} />
          <div>
            <Label>Model</Label>
            <Row k="Fresh impacts in model" v={D.site.craters_in_model} />
            <Row k="Cell size" v={`${D.site.cell_size_m} m`} />
            <Row k="Measurements in model" v={state === "before" ? 0 : 1} />
            {state === "after" && <Row k="Cells updated" v={`${D.map.change.cells} · max Δ ${D.map.change.max_abs.toFixed(2)}`} strong />}
          </div>
          <div>
            <Label>{state === "before" ? "Planned stations" : "Remaining stations"}</Label>
            {stations.map((s) => (
              <Row key={s.id} k={`${s.order}  ${s.id}`} v={s.p_ice == null ? "—" : `P ${s.p_ice.toFixed(2)}`} />
            ))}
          </div>
          <div style={{ marginTop: "auto", fontSize: 14, color: T.faint, fontFamily: T.mono }}>{D.site.credit}</div>
        </div>
      </div>
    </Screen>
  );
};

/** Tarjeta de revisión del plan que confirma el IV. */
export const ReviewCard: React.FC<{ confirmed?: boolean }> = ({ confirmed = false }) => (
  <Screen w={W} h={H}>
    <TopBar title="Plan review · IV" />
    <div style={{ zoom: 1.22, paddingTop: 24 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28, padding: 40 }}>
      <div style={{ background: T.panel, padding: 32, borderRadius: 10, border: `1px solid ${T.line}` }}>
        <Label>Trigger</Label>
        <Big>{meas.station_id}</Big>
        <div style={{ fontFamily: T.mono, fontSize: 30, marginTop: 14 }}>NO ICE ≤ {round1(meas.depth_m)} m</div>
        <div style={{ marginTop: 24 }}>
          <Row k="Tool" v="Core drill" />
          <Row k="Logged by" v={meas.crew_member} />
          <Row k="Expected outcome" v={pct(D.decision.p_no_ice_branch)} strong />
          <Row k="Est. ice depth (median)" v={`${round1(D.stations_before[0].depth_median_m!)} m`} />
        </div>
      </div>
      <div style={{ background: T.panel, padding: 32, borderRadius: 10, border: `1px solid ${T.line}` }}>
        <Label>Stations</Label>
        <Big>{rp.stations_kept.length} kept</Big>
        <div style={{ marginTop: 24 }}>
          <Row k="Added" v={rp.stations_added.length} />
          <Row k="Dropped" v={rp.stations_dropped.length} />
          <Row k="Next" v={`${D.next.id} · ${D.next.distance_m} m`} strong />
          <Row k="Next station time" v={`${D.next.duration_min} min`} />
        </div>
      </div>
      <div style={{ background: T.panel, padding: 32, borderRadius: 10, border: `1px solid ${T.line}` }}>
        <Label>Return</Label>
        <Big>{fmtH(clock.station_end.h, clock.station_end.m)}</Big>
        <div style={{ fontFamily: T.sans, fontSize: 19, color: T.dim, marginTop: 8 }}>to required departure</div>
        <div style={{ marginTop: 18 }}>
          <Row k="PET" v={`${Math.round(clock.station_end.pet_min)} min`} />
          <Row k="Lowest walkback margin ahead" v={`${rp.margin_before_min} → ${rp.margin_after_min} min`} strong />
        </div>
      </div>
    </div>
    <div style={{ margin: "0 40px", padding: 32, background: T.panel2, borderRadius: 10, border: `1px solid ${T.lineStrong}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <Label>Recommendation</Label>
        <div style={{ fontFamily: T.mono, fontSize: 46, fontWeight: 600 }}>{rp.recommendation.toUpperCase()}</div>
        <div style={{ fontSize: 21, color: T.dim, marginTop: 8 }}>{rp.reasons[0]}</div>
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 30, fontWeight: 600, padding: "22px 40px", borderRadius: 8, border: "2px solid #fff", background: confirmed ? "#fff" : "transparent", color: confirmed ? "#000" : "#fff" }}>
        {confirmed ? `GO ${D.next.id} · SENT` : `CONFIRM · GO ${D.next.id}`}
      </div>
    </div>
    </div>
  </Screen>
);

/** Pantalla del antebrazo del EV (registro y reloj). */
export const Wrist: React.FC<{ mode: "result" | "clock-arrival" | "clock-end" }> = ({ mode }) => {
  const c = mode === "clock-arrival" ? clock.arrival : clock.station_end;
  return (
    <div style={{ width: 1000, height: 640, background: "#06080b", color: T.text, fontFamily: T.sans, padding: 44, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 30, color: T.dim }}>
        <span>{meas.crew_member} · {meas.station_id}</span><span>PET {Math.round(c.pet_min)}</span>
      </div>
      {mode === "result" ? (
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 30, color: T.dim }}>CORE DRILL</div>
          <div style={{ fontFamily: T.mono, fontSize: 92, fontWeight: 600, lineHeight: 1.05 }}>NO ICE</div>
          <div style={{ fontFamily: T.mono, fontSize: 58 }}>down to {round1(meas.depth_m)} m</div>
        </div>
      ) : (
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 30, color: T.dim }}>TO REQUIRED DEPARTURE</div>
          <div style={{ fontFamily: T.mono, fontSize: 104, fontWeight: 600, lineHeight: 1.05 }}>{fmtH(c.h, c.m)}</div>
        </div>
      )}
      <div style={{ fontFamily: T.mono, fontSize: 28, color: T.dim }}>{mode === "result" ? "LOGGED · SENT TO IV" : `NEXT ${D.next.id} · ${D.next.distance_m} m`}</div>
    </div>
  );
};

/** Elementos del visor AR sobre fondo transparente. */
export const ArHud: React.FC<{ clockKey?: "station_end" | "arrival"; minusMin?: number }> = ({ clockKey = "station_end", minusMin = 1 }) => {
  const c = clock[clockKey];
  const total = c.h * 60 + c.m - minusMin;
  return (
    <div style={{ width: W, height: H, position: "relative", fontFamily: T.mono, color: "#f2f6fa", textShadow: "0 0 12px rgba(150,190,255,0.35)" }}>
      <div style={{ position: "absolute", left: 120, top: 110 }}>
        <div style={{ fontSize: 26, opacity: 0.8 }}>NEXT STATION</div>
        <div style={{ fontSize: 64, fontWeight: 600 }}>{D.next.id}</div>
        <div style={{ fontSize: 34 }}>{D.next.distance_m} m · core drill</div>
        <div style={{ fontSize: 24, opacity: 0.75, marginTop: 10 }}>PLAN REVIEWED · GO</div>
      </div>
      <div style={{ position: "absolute", right: 120, top: 110, textAlign: "right" }}>
        <div style={{ fontSize: 26, opacity: 0.8 }}>TO REQUIRED DEPARTURE</div>
        <div style={{ fontSize: 64, fontWeight: 600 }}>{fmtH(Math.floor(total / 60), total % 60)}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 196, textAlign: "center", fontSize: 20, opacity: 0.6, fontFamily: T.sans, letterSpacing: 2 }}>AR INTERFACE CONCEPT</div>
    </div>
  );
};

/** Columna del subsuelo bajo el agujero, para el visor (fondo transparente). */
export const DepthColumn: React.FC<{ progress?: number }> = ({ progress = 1 }) => {
  const s = D.stations_before[0];
  const pxPerM = 230;
  const top = 120;
  const drilled = meas.depth_m * pxPerM * Math.min(1, progress * 1.6);
  const median = s.depth_median_m! * pxPerM;
  const shallow = s.depth_shallow_m! * pxPerM;
  return (
    <div style={{ width: W, height: H, position: "relative", fontFamily: T.mono, color: "#f2f6fa" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="cloud" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#86b6ef" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#86b6ef" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={W / 2} cy={top + median} rx={210} ry={(median - shallow) * 1.15} fill="url(#cloud)" opacity={Math.max(0, progress * 1.4 - 0.4)} />
        <line x1={W / 2} y1={top} x2={W / 2} y2={top + 3.0 * pxPerM} stroke="rgba(255,255,255,0.25)" strokeWidth={2} strokeDasharray="6 8" />
        <rect x={W / 2 - 14} y={top} width={28} height={drilled} fill="rgba(255,255,255,0.9)" />
        {[0, 1, 2, 3].map((m) => (
          <g key={m}>
            <line x1={W / 2 + 40} y1={top + m * pxPerM} x2={W / 2 + 70} y2={top + m * pxPerM} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
            <text x={W / 2 + 82} y={top + m * pxPerM + 9} fill="rgba(255,255,255,0.75)" fontSize={26}>{m} m</text>
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", left: W / 2 - 560, top: top + drilled - 40, width: 500, textAlign: "right", fontSize: 30, opacity: Math.min(1, progress * 2) }}>
        MEASURED 0–{round1(meas.depth_m)} m<br /><span style={{ fontWeight: 600 }}>NO ICE</span>
      </div>
      <div style={{ position: "absolute", left: W / 2 - 560, top: top + median - 30, width: 500, textAlign: "right", fontSize: 30, opacity: Math.max(0, progress * 1.4 - 0.4) }}>
        ESTIMATED ICE DEPTH<br /><span style={{ fontWeight: 600 }}>median {round1(s.depth_median_m!)} m</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 196, textAlign: "center", fontSize: 20, opacity: 0.6, fontFamily: T.sans, letterSpacing: 2 }}>AR INTERFACE CONCEPT · MODEL ESTIMATE, NOT A SUBSURFACE IMAGE</div>
    </div>
  );
};

/** Pantalla secundaria: comparación de campaña simulada. */
export const Campaign: React.FC = () => {
  const c = D.campaign;
  const blind = c.series.find((s) => s.strategy === "blind_drill")!;
  const radar = c.series.find((s) => s.strategy === "radar_first_50")!;
  const max = blind.evas_to_confirm;
  const bar = (label: string, v: number, strong: boolean) => (
    <div style={{ marginBottom: 46 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, marginBottom: 14 }}>
        <span style={{ color: strong ? T.text : T.dim }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontWeight: 600 }}>{v.toFixed(2)} EVAs</span>
      </div>
      <div style={{ height: 46, background: T.panel2, borderRadius: 4 }}>
        <div style={{ width: `${(v / max) * 100}%`, height: "100%", background: strong ? "#3987e5" : "#5b6672", borderRadius: 4 }} />
      </div>
    </div>
  );
  return (
    <Screen w={W} h={H}>
      <TopBar title="Campaign strategy · simulation" />
      <div style={{ padding: "90px 90px", zoom: 1.45 }}>
        <Label scale={1.4}>Expected EVAs to confirm ice</Label>
        <div style={{ height: 30 }} />
        {bar(blind.label, blind.evas_to_confirm, false)}
        {bar(radar.label, radar.evas_to_confirm, true)}
        <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
          <Tag tone="advisory" scale={1.3}>SIMULATION</Tag>
          <span style={{ fontSize: 22, color: T.dim }}>Monte Carlo · drill {round1(c.drill_m)} m · {c.stations_per_eva} stations per EVA · EVAs assumed independent</span>
        </div>
      </div>
    </Screen>
  );
};

/** Ventana ambiental (módulo de ejemplo, otra fecha). */
export const EvaWindow: React.FC = () => {
  const w = D.eva_window;
  const hours = w.hours.slice(0, 72);
  const col = (lvl: string) => (lvl === "warning" ? T.warning : lvl === "caution" ? T.caution : lvl === "advisory" ? T.advisory : "#2a323c");
  const rec = w.recommended as { sol: number; start_ltst: string; end_ltst: string };
  return (
    <Screen w={W} h={H}>
      <TopBar title="EVA window · environment" right={`EXAMPLE MODULE · ${w.requested_utc.slice(0, 10)}`} />
      <div style={{ padding: "50px 60px", zoom: 1.3 }}>
        <Label scale={1.3}>Hourly conditions · 3 sols</Label>
        <div style={{ display: "flex", gap: 4, marginTop: 20 }}>
          {hours.map((h, i) => {
            const inRec = h.sol === rec.sol && h.ltst >= rec.start_ltst && h.ltst < rec.end_ltst;
            return <div key={i} style={{ flex: 1, height: 140, background: col(h.level), outline: inRec ? "3px solid #fff" : "none", outlineOffset: -3, borderRadius: 2 }} />;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 20, color: T.dim, marginTop: 10 }}>
          <span>SOL 0</span><span>SOL 1</span><span>SOL 2</span><span>SOL 3</span>
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 50 }}>
          <div style={{ flex: 1, background: T.panel, padding: 30, borderRadius: 10, border: `1px solid ${T.lineStrong}` }}>
            <Label>Recommended window</Label>
            <Big>SOL {rec.sol} · {rec.start_ltst}–{rec.end_ltst}</Big>
            <div style={{ fontSize: 20, color: T.dim, marginTop: 10 }}>Local true solar time</div>
          </div>
          <div style={{ flex: 1.4, background: T.panel, padding: 30, borderRadius: 10, border: `1px solid ${T.line}` }}>
            <Label>Earliest hour · why not</Label>
            {hours[0].reasons.map((r) => (
              <div key={r} style={{ fontSize: 22, marginBottom: 8, color: T.text }}>· {r}</div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 34, alignItems: "center" }}>
          <Tag tone="warning">WARNING</Tag><Tag tone="caution">CAUTION</Tag><Tag tone="advisory">ADVISORY</Tag>
          <span style={{ fontSize: 19, color: T.dim, marginLeft: 16 }}>Climatology: Viking Lander 2 analogue · Space weather: NASA DONKI (historical, demo)</span>
        </div>
      </div>
    </Screen>
  );
};

/** Fichas de herramientas para la pantalla de pared del brief. */
export const Tools: React.FC = () => {
  const t = D.site_tools as Record<string, { depth_m: number; p_ice: number; verdict: string; precursor?: boolean }>;
  const eq = Object.fromEntries(D.equipment.map((e) => [e.tool, e.mass_kg]));
  const cards = [
    { key: "gpr", name: "Ground-penetrating radar", role: "Find where to look" },
    { key: "core_drill", name: "Core drill", role: "Confirm in place" },
  ];
  return (
    <Screen w={W} h={H}>
      <TopBar title="Tools · reach vs. estimated ice depth" />
      <div style={{ zoom: 1.3, paddingTop: 20 }}>
      <div style={{ display: "flex", gap: 40, padding: 50 }}>
        {cards.map((c) => (
          <div key={c.key} style={{ flex: 1, background: T.panel, padding: 40, borderRadius: 12, border: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 22, color: T.dim }}>{c.role}</div>
            <div style={{ fontSize: 44, fontWeight: 600, margin: "6px 0 26px" }}>{c.name}</div>
            <Row k="Reach" v={`${round1(t[c.key].depth_m)} m`} scale={1.3} strong />
            <Row k="Mass" v={eq[c.key] == null ? "—" : `${round1(eq[c.key] as number)} kg`} scale={1.3} />
            <Row k="P(ice within reach), site" v={t[c.key].p_ice.toFixed(2)} scale={1.3} />
            <div style={{ marginTop: 26 }}><Tag scale={1.4}>{t[c.key].verdict.replace("_", "-")}</Tag></div>
          </div>
        ))}
      </div>
      <div style={{ padding: "0 50px", fontSize: 22, color: T.dim }}>Strategy: radar first, drill to confirm · regional estimate per tool</div>
      </div>
    </Screen>
  );
};
