"use client";

/**
 * Printable EVA cuff checklist (lib/cuff.ts). With a plan id and the planner API configured it
 * prints that plan, replans included; otherwise the demo plan. Paper layout: black on white.
 */
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getPlan, plannerBaseUrl } from "@/lib/api";
import { cuffChecklist } from "@/lib/cuff";
import { demoPlan, type Plan } from "@/lib/plan";

import "./cuff.css";

export function CuffSheet() {
  const raw = useSearchParams().get("plan");
  const planId = raw && /^plan-[A-Za-z0-9_-]{1,64}$/.test(raw) ? raw : undefined;
  const remote = Boolean(planId && plannerBaseUrl());
  const [plan, setPlan] = useState<Plan | null>(remote ? null : demoPlan);
  const [note, setNote] = useState<string | null>(planId && !remote ? "Planner API not configured: showing the demo plan." : null);

  useEffect(() => {
    if (!remote || !planId) return;
    const controller = new AbortController();
    getPlan(planId, { signal: controller.signal })
      .then(setPlan)
      .catch(() => {
        if (controller.signal.aborted) return;
        setPlan(demoPlan);
        setNote("Plan not found on the planner (it keeps plans only while running): showing the demo plan.");
      });
    return () => controller.abort();
  }, [planId, remote]);

  if (!plan) return <main className="cuff-page"><p>Loading plan...</p></main>;
  const cuff = cuffChecklist(plan);

  return (
    <main className="cuff-page">
      <header className="cuff-head">
        <div>
          <h1>{cuff.title}</h1>
          <p>IceWalk · S1094b · {cuff.planId}{plan.replanned_from ? ` · replanned from ${plan.replanned_from}` : ""}</p>
        </div>
        <button type="button" className="cuff-print" onClick={() => window.print()}>Print</button>
      </header>
      {note ? <p className="cuff-note">{note}</p> : null}
      <dl className="cuff-facts">
        {cuff.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <ol className="cuff-steps">
        {cuff.steps.map((step, i) => (
          <li key={`${step.title}-${i}`} data-decision={step.decision || undefined}>
            <span className="cuff-pet">{step.pet}</span>
            <div>
              <strong>{step.title}</strong>
              {step.lines.map((line) => <p key={line}>{line}</p>)}
            </div>
            <span className="cuff-box" aria-hidden />
          </li>
        ))}
      </ol>
      <section className="cuff-stops">
        <h2>Hard stops</h2>
        <ul>{cuff.hardStops.map((h) => <li key={h}>{h}</li>)}</ul>
        {cuff.notes.length ? <><h2>Notes</h2><ul>{cuff.notes.map((n) => <li key={n}>{n}</li>)}</ul></> : null}
      </section>
      <footer className="cuff-foot">Planning aid built from the plan contract. Values marked as assumptions in docs/SOURCES.md. The crew decides.</footer>
    </main>
  );
}
