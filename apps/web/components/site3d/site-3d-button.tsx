"use client";

import { Button } from "@icewalk/ui/button";
import dynamic from "next/dynamic";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { Measurement, Plan } from "@/lib/plan";
import type { LogMeasurement } from "./site-3d-overlay";

const Site3DOverlay = dynamic(() => import("./site-3d-overlay").then((m) => m.Site3DOverlay), { ssr: false });

/** Opens the full-screen 3D view: "site" flies over the crater and route, "walk" is the helmet view. */
export function Site3DButton({ plan, measurements, initial, onLog, pending, children }: {
  plan: Plan; measurements: readonly Measurement[]; initial: "site" | "walk"; onLog?: LogMeasurement; pending?: boolean; children: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>{children}</Button>
      {open ? createPortal(<Site3DOverlay plan={plan} measurements={measurements} initial={initial} onLog={onLog} pending={pending} onClose={() => setOpen(false)} />, document.body) : null}
    </>
  );
}
