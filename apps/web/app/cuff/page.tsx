import type { Metadata } from "next";
import { Suspense } from "react";

import { CuffSheet } from "./cuff-sheet";

export const metadata: Metadata = { title: "EVA cuff checklist · IceWalk" };

/** /cuff?plan=<plan_id>: the cuff checklist of a plan, ready to print. */
export default function CuffPage() {
  return <Suspense fallback={<main className="cuff-page"><p>Loading plan...</p></main>}><CuffSheet /></Suspense>;
}
