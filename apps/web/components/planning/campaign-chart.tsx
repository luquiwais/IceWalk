"use client";

import { Footnote } from "@icewalk/ui/text";
import { useEffect, useState } from "react";
import { getCampaign, plannerBaseUrl, type Campaign } from "@/lib/api";
import mockCampaign from "@/mock/campaign.json";

/*
 * P(ice confirmed) after 1..N EVAs, drilling blind against radar first (GET /campaign).
 * Identity by line style and a direct label, not color alone: blue solid = radar with 50
 * soundings, blue dashed = 20 soundings, neutral grey = drilling blind (the baseline).
 * Palette checked with the dataviz validator on the dark surface (separation and contrast pass;
 * the grey is neutral on purpose).
 */
const STYLE: Record<string, { color: string; dash?: string; label: string }> = {
  radar_first_50: { color: "#3987e5", label: "Radar first · 50 soundings" },
  radar_first_20: { color: "#3987e5", dash: "5 4", label: "Radar first · 20 soundings" },
  blind_drill: { color: "#a3a3a0", label: "Drill blind" },
};
const W = 320, H = 190, L = 34, R = 12, T = 12, B = 30;

export function CampaignChart() {
  const [data, setData] = useState<Campaign>(mockCampaign as Campaign);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (!plannerBaseUrl()) return;
    const c = new AbortController();
    getCampaign({ signal: c.signal }).then(setData).catch(() => undefined);
    return () => c.abort();
  }, []);
  const n = data.evas.length;
  const x = (i: number) => L + (i / Math.max(n - 1, 1)) * (W - L - R);
  const y = (p: number) => T + (1 - p) * (H - T - B);
  const order = ["blind_drill", "radar_first_20", "radar_first_50"];
  const series = order.map((k) => data.series.find((s) => s.strategy === k)).filter((s) => s !== undefined);
  const radar = data.series.find((s) => s.strategy === "radar_first_50");
  const blind = data.series.find((s) => s.strategy === "blind_drill");
  return (
    <figure className="mission-campaign">
      <p className="mission-campaign-hero"><strong>×{data.speedup}</strong> fewer EVAs to confirm ice when the radar goes first</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`P(ice confirmed) after 1 to ${n} EVAs: radar first reaches ${Math.round((radar?.p_confirmed[1] ?? 0) * 100)}% after 2 EVAs, drilling blind ${Math.round((blind?.p_confirmed[1] ?? 0) * 100)}%.`}
        onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((g) => <g key={g}><line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="mission-campaign-grid" /><text x={L - 6} y={y(g) + 4} textAnchor="end" className="mission-campaign-axis">{g * 100}%</text></g>)}
        {data.evas.map((e, i) => <text key={e} x={x(i)} y={H - 10} textAnchor="middle" className="mission-campaign-axis">{e}</text>)}
        {series.map((s) => {
          const st = STYLE[s.strategy];
          const pts = s.p_confirmed.map((p, i) => `${x(i)},${y(p)}`).join(" ");
          return <g key={s.strategy}>
            <polyline points={pts} fill="none" stroke={st.color} strokeWidth={2} strokeDasharray={st.dash} strokeLinejoin="round" />
            {s.p_confirmed.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r={hover === i ? 4.5 : 3} fill={st.color} stroke="var(--color-surface, #1c1c1e)" strokeWidth={1.5} />)}
          </g>;
        })}
        {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="mission-campaign-cross" /> : null}
        {data.evas.map((e, i) => <rect key={e} x={x(i) - (W - L - R) / (2 * Math.max(n - 1, 1))} y={T} width={(W - L - R) / Math.max(n - 1, 1)} height={H - T - B} fill="transparent" onPointerEnter={() => setHover(i)} />)}
      </svg>
      <div className="mission-campaign-tip" aria-live="polite">
        {hover !== null ? <>After {data.evas[hover]} EVA{data.evas[hover] > 1 ? "s" : ""}: {series.slice().reverse().map((s) => `${STYLE[s.strategy].label} ${Math.round(s.p_confirmed[hover] * 100)}%`).join(" · ")}</> : "Hover the chart for the values per EVA."}
      </div>
      <ul className="mission-campaign-legend">
        {series.slice().reverse().map((s) => <li key={s.strategy}><svg width="22" height="8" aria-hidden><line x1="0" x2="22" y1="4" y2="4" stroke={STYLE[s.strategy].color} strokeWidth="2" strokeDasharray={STYLE[s.strategy].dash} /></svg>{STYLE[s.strategy].label} · {s.evas_to_confirm} EVAs expected</li>)}
      </ul>
      <figcaption><Footnote tone="secondary">EVAs (x) against P(at least one station with ice within the 1 m drill), {data.stations_per_eva} stations per EVA. Monte Carlo on the S1094b prior; EVAs assumed independent; radar performance is an assumption.</Footnote></figcaption>
      <table className="sr-only"><caption>P(ice confirmed) by EVA</caption><thead><tr><th>EVAs</th>{series.map((s) => <th key={s.strategy}>{STYLE[s.strategy].label}</th>)}</tr></thead><tbody>{data.evas.map((e, i) => <tr key={e}><td>{e}</td>{series.map((s) => <td key={s.strategy}>{Math.round(s.p_confirmed[i] * 100)}%</td>)}</tr>)}</tbody></table>
    </figure>
  );
}
