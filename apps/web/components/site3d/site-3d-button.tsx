"use client";

import { Button } from "@icewalk/ui/button";
import dynamic from "next/dynamic";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { Measurement, Plan } from "@/lib/plan";

const Site3DOverlay = dynamic(() => import("./site-3d-overlay").then((m) => m.Site3DOverlay), { ssr: false });

/** Opens the full-screen 3D view: "site" flies over the crater and route, "walk" is the helmet view. */
export function Site3DButton({ plan, measurements, initial, children }: {
  plan: Plan; measurements: readonly Measurement[]; initial: "site" | "walk"; children: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>{children}</Button>
      {open ? createPortal(<Site3DOverlay plan={plan} measurements={measurements} initial={initial} onClose={() => setOpen(false)} />, document.body) : null}
    </>
  );
}
