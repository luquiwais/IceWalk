import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { LegacyRedirect } from "@/components/landing/legacy-redirect";
import site from "@/public/landing/site.jpg";
import plan from "@/public/landing/plan.jpg";
import brief from "@/public/landing/brief.jpg";
import helmet from "@/public/landing/helmet.jpg";
import iv from "@/public/landing/iv.jpg";
import debrief from "@/public/landing/debrief.jpg";
import "./landing.css";

/*
 * Landing page (brief in docs/research/submission-brief-2026-11-14.md, section 5): the decision in one
 * line, the problem, the product in its five phases, why trust the numbers (and where not to), the data
 * behind each decision, the limits and the team. Every number comes from docs/submission/project-page.md
 * and docs/EXPERIMENTS.md; the screenshots are the app running on the bundled output of the real model.
 */

export const metadata: Metadata = {
  title: "IceWalk · Will this EVA reach ice, and with which instrument?",
  description:
    "EVA planner for ice prospecting on Mars: the probability of ice within each tool's reach, a two-person traverse inside NASA limits on real HiRISE terrain, and a new plan after every measurement. NASA Space Apps Challenge 2026.",
};

const REPO = "https://github.com/luquiwais/IceWalk";
/** The 30-second demo submitted to NASA Space Apps (public link). */
const DEMO = "https://drive.google.com/file/d/1anZsRElUcrL2DbDIZDFlYQW7qZZU5jLL/view";

const PHASES: { n: number; name: string; question: string; image: StaticImageData; alt: string; points: string[] }[] = [
  {
    n: 1, name: "Site", question: "Is there ice within reach here?", image: site,
    alt: "Mars globe with NASA's exploration zones and the S1094b site card: P(ice) per tool and its verdict",
    points: [
      "A site card per instrument: the probability that ice is within its reach, with a 90 % interval and a verdict.",
      "At S1094b a 1 m drill is out of reach (6 %), a SkyFall-class 3 m radar is conditional (52 %) and a 10 m ground radar is GO (97 %).",
      "The same card runs on NASA's 51 candidate Exploration Zones from Mars Trek.",
    ],
  },
  {
    n: 2, name: "Plan", question: "Where do we go, and is it safe?", image: plan,
    alt: "Plan view: the ice map over HiRISE, a six-station traverse from the habitat and eight flight rules with their limits",
    points: [
      "A two-person traverse on the HiRISE terrain model at 10 m, checked against eight flight rules: duration, walk-back margin, distance, slope, comms, metabolic rate, carried mass and EVA window.",
      "Every station says why it is there. Drag one, add one, move it earlier or later, and the planner answers at once whether the EVA still fits.",
      "Choose the tools the crew carries and see what leaving the radar behind costs.",
    ],
  },
  {
    n: 3, name: "Brief", question: "What will we find at each station?", image: brief,
    alt: "Brief: the real HiRISE terrain in 3D, standing at station 1 with what to expect there",
    points: [
      "The real HiRISE terrain in 3D: fly over the traverse or stand where the crew will work.",
      "What to expect at each station: ice depth against the tool's reach, time, walk-back margin and bingo.",
      "A printable cuff checklist with the hard stops.",
    ],
  },
  {
    n: 4, name: "EVA", question: "During the EVA: what now?", image: helmet,
    alt: "EV1 helmet view: a plan update after a result at station E03S24, awaiting the IV's call",
    points: [
      "EV1 walks the terrain in a helmet view with waypoint cues, range and steering, and logs each result at the station; the IV follows from the habitat, on the same screen or on another device linked by a code.",
      "The planner re-plans on site: the crew cannot wait up to 22 minutes for an answer from Earth. The IV makes the call, as NASA's Mars concept of operations prescribes, and EV1 copies it.",
      "On EVA TERMINATE both see the fastest route home over the terrain model, with its length and time.",
    ],
  },
  {
    n: 5, name: "Debrief", question: "What did we learn?", image: debrief,
    alt: "Debrief: the measurement log, what it means for the next EVA and how the ice map changed",
    points: [
      "What each result means: a \"no\" within 1 m is ice deeper than the tool, a candidate for radar or a deeper core.",
      "How the ice map moved, and a decision log: what the planner recommended after each result and what the IV decided.",
      "The next plan starts from what this EVA measured.",
    ],
  },
];

const DATA: { layer: string; source: string; decision: string; official?: boolean }[] = [
  { layer: "Terrain model and orthoimages of S1094b", source: "MRO HiRISE (NASA/JPL-Caltech/UArizona), USGS controlled copy", decision: "Slope limit, routes, 3D views, boulders" },
  { layer: "Fresh craters and ice exposures", source: "Dundas et al. 2023; Daubar et al. 2022 (HiRISE analyses)", decision: "Ice model and its calibration" },
  { layer: "Exploration Zones, THEMIS and MOLA layers", source: "JPL Mars Trek", decision: "Site cards beyond S1094b, the globe", official: true },
  { layer: "Geologic map", source: "USGS-NASA SIM 3292", decision: "Site unit lAv", official: true },
  { layer: "Thermal inertia", source: "Mars Odyssey THEMIS (NASA/ASU, USGS)", decision: "Soil firmness, terrain units" },
  { layer: "Space weather", source: "NASA CCMC DONKI", decision: "EVA window (solar particle events, CMEs)" },
  { layer: "Dust opacity", source: "Emirates Mars Mission EMIRS (MBRSC)", decision: "EVA window" },
  { layer: "Ice consistency (SWIM)", source: "MRO SHARAD (ASI), MOLA, THEMIS via PSI/JPL", decision: "Context for the regional prior" },
  { layer: "Climate and ground truth", source: "Viking Lander 2; Phoenix (Mellon et al. 2009)", decision: "Temperature and wind; model validation" },
  { layer: "Precursor mission", source: "NASA SkyFall mission information", decision: "Radar tool on the site card" },
];

export default function Landing() {
  return (
    <div className="landing">
      <LegacyRedirect />
      <header className="landing-nav">
        <Link href="/" className="landing-mark">IceWalk</Link>
        <nav aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#evidence">Evidence</a>
          <a href="#data">Data</a>
          <a href="#limits">Limits</a>
        </nav>
        <Link href="/app" className="landing-cta landing-cta-small">Open the planner</Link>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="hero-title">
          <p className="landing-eyebrow">NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map</p>
          <h1 id="hero-title">Will this EVA reach ice, and with which instrument?</h1>
          <p className="landing-lead">
            Every Mars EVA tool tells astronauts where they can walk. IceWalk also tells them whether the walk is worth it: the probability of ice within each tool&apos;s reach, a two-person traverse inside NASA limits on the real HiRISE terrain, and a new plan after every measurement.
          </p>
          <div className="landing-actions">
            <Link href="/app" className="landing-cta">Open the planner</Link>
            <a href={DEMO} className="landing-cta landing-cta-plain" target="_blank" rel="noopener">Watch the 30 s demo</a>
            <a href={REPO} className="landing-cta landing-cta-plain" target="_blank" rel="noopener">Source on GitHub</a>
          </div>
          <figure className="landing-shot landing-hero-shot">
            <Image src={plan} alt="IceWalk Plan view: the ice map over HiRISE at crater S1094b, a six-station traverse and its flight rules" priority sizes="(max-width: 1200px) 100vw, 1120px" />
          </figure>
          <dl className="landing-stats">
            <div><dt>Site</dt><dd>S1094b, 35°N</dd><span>the lowest-latitude ice ever exposed on Mars</span></div>
            <div><dt>Real craters in the ice model</dt><dd>349</dd><span>Dundas et al. 2023</span></div>
            <div><dt>Calibrated out of sample on</dt><dd>383 impacts</dd><span>36.2 ice exposures expected, 37 observed</span></div>
            <div><dt>Radar first, then drill</dt><dd>2.9× fewer EVAs</dd><span>to confirm ice, in simulation</span></div>
          </dl>
        </section>

        <section className="landing-section" aria-labelledby="problem-title">
          <h2 id="problem-title">Where the crew can walk is not where the ice is</h2>
          <div className="landing-cards">
            <article><h3>Regional maps stop short</h3><p>Orbital data say ice is likely in a region. A crew needs to know whether it lies within 1 m of a drill or 3 m of a radar at the stations it can actually reach.</p></article>
            <article><h3>EVA time is the scarcest resource</h3><p>Every station costs walking, oxygen and walk-back margin. A blind drill hole that finds nothing spends all of them.</p></article>
            <article><h3>Earth is up to 22 minutes away</h3><p>When a result comes in, the plan has to change on site, inside the same safety limits, without waiting for an answer from home.</p></article>
          </div>
        </section>

        <section id="how" className="landing-section" aria-labelledby="how-title">
          <h2 id="how-title">Five phases, in the order of NASA&apos;s plan, train, fly</h2>
          <p className="landing-section-lead">Each phase answers one question. Every number on screen comes from the planner and the ice model.</p>
          <ol className="landing-loop" aria-label="The loop">
            <li><b>Choose the tool</b><span>site card</span></li>
            <li><b>Plan the traverse</b><span>inside NASA limits</span></li>
            <li><b>Measure</b><span>radar or drill, at the station</span></li>
            <li><b>Re-plan</b><span>the IV calls, EV1 copies</span></li>
          </ol>
          <div className="landing-phases">
            {PHASES.map((p) => (
              <article key={p.n} className="landing-phase">
                <figure className="landing-shot">
                  <Image src={p.image} alt={p.alt} sizes="(max-width: 900px) 100vw, 640px" />
                </figure>
                <div className="landing-phase-text">
                  <p className="landing-phase-step">{p.n} · {p.name}</p>
                  <h3>{p.question}</h3>
                  <ul>{p.points.map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
          <figure className="landing-shot landing-wide">
            <Image src={iv} alt="IV console in the habitat: the EV's position, the old route dashed against the new one, and the call to make" sizes="(max-width: 1200px) 100vw, 1120px" />
            <figcaption>The IV console in the habitat: the replan under review, the plan before it dashed, and the call (concur or EVA TERMINATE) that EV1 copies in the helmet. Both windows stay in sync.</figcaption>
          </figure>
        </section>

        <section id="evidence" className="landing-section" aria-labelledby="evidence-title">
          <h2 id="evidence-title">Why trust the numbers, and where not to</h2>
          <div className="landing-evidence">
            <article>
              <p className="landing-big">0.033</p>
              <h3>Brier score, out of sample</h3>
              <p>A latitude prior calibrated on 383 fresh impacts it never saw, each predicted without its own region; a constant rate scores 0.087. 36.2 ice exposures expected, 37 observed.</p>
            </article>
            <article>
              <p className="landing-big">7 cm <small>vs 4.6 cm</small></p>
              <h3>Phoenix, ground truth</h3>
              <p>Phoenix measured ice at 4.6 cm; IceWalk predicts 7 cm (90 %: 2-22 cm). At Viking Lander 2, no ice in a 15 cm trench, and the model gives 1 %.</p>
            </article>
            <article>
              <p className="landing-big">3.3 → 1.16</p>
              <h3>EVAs to confirm ice</h3>
              <p>Drilling where a radar flags shallow ice, with 50 soundings per EVA (1.58 with 20). Ice found per drill station rises from 6 % to 50 %. A simulation on the S1094b prior, not a field result.</p>
            </article>
          </div>
          <aside className="landing-callout">
            <h3>What does not work, stated</h3>
            <p>Neighbouring craters do not predict ice at site scale (349 craters, AUC 0.52). So IceWalk does not promise where the ice is: the map shows where the model has local evidence and where it only has the regional prior, and every measurement narrows it.</p>
          </aside>
        </section>

        <section id="data" className="landing-section" aria-labelledby="data-title">
          <h2 id="data-title">Data, and the decision each one drives</h2>
          <p className="landing-section-lead">From 463 m/px to 0.25 m/px, fused on one 10 m grid to answer a single crew question.</p>
          <div className="landing-table-wrap">
            <table className="landing-table">
              <thead><tr><th scope="col">Layer</th><th scope="col">Mission / source</th><th scope="col">Decision it drives</th></tr></thead>
              <tbody>
                {DATA.map((d) => (
                  <tr key={d.layer}>
                    <th scope="row">{d.layer}</th>
                    <td>{d.source}{d.official ? <span className="landing-badge">Challenge resource</span> : null}</td>
                    <td>{d.decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="limits" className="landing-section" aria-labelledby="limits-title">
          <h2 id="limits-title">Limits</h2>
          <ul className="landing-limits">
            <li>A hackathon prototype, not a certified or NASA-approved system. EVA thresholds without a NASA value are marked as assumptions in the app.</li>
            <li>The regional prior extrapolates south of 39.1°N, where S1094b sits, and is conservative in Arcadia; the site card flags both.</li>
            <li>The shadow-based boulder detector is a hazard map, not a rock census (F1 0.30-0.49 for boulders of 3 m or more against expert labels).</li>
            <li>The EVA is simulated: the helmet waypoints are a concept of AR cues, and radar performance and suit antenna heights are assumptions.</li>
          </ul>
        </section>

        <section className="landing-end" aria-labelledby="end-title">
          <h2 id="end-title">See it on the real terrain</h2>
          <div className="landing-actions">
            <Link href="/app" className="landing-cta">Open the planner</Link>
            <a href={DEMO} className="landing-cta landing-cta-plain" target="_blank" rel="noopener">Watch the 30 s demo</a>
            <a href={REPO} className="landing-cta landing-cta-plain" target="_blank" rel="noopener">Source on GitHub</a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p><b>IceWalk</b> · Team Darionautas, Buenos Aires · NASA Space Apps Challenge 2026</p>
        <p>HiRISE imagery: NASA/JPL-Caltech/UArizona. Mars Trek: NASA/JPL-Caltech. THEMIS: NASA/JPL-Caltech/ASU. Full references in the repository (docs/SOURCES.md).</p>
        <p>NASA does not endorse this project. No NASA branding is used or implied.</p>
      </footer>
    </div>
  );
}
