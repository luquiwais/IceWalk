"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import type { ComponentProps } from "react";
import { cn } from "./utils";

/** A panel that opens to its measured height on Fluid Kit's spring (Base UI Collapsible). */
function Collapse({ open, className, ...props }: ComponentProps<"div"> & { open: boolean }) {
  return (
    <Collapsible.Root open={open}>
      <Collapsible.Panel className={cn("ui-collapse", className)} {...props} />
    </Collapsible.Root>
  );
}

/**
 * Comes in when `present`, goes out when not (Fluid Kit's `fk-transition`, CSS only). It stays in
 * the page as `hidden`, so it never jumps and its content keeps its state.
 */
function Presence({ present, className, ...props }: ComponentProps<"div"> & { present: boolean }) {
  return <div hidden={!present} className={cn("fk-transition fk-blur-replace", className)} {...props} />;
}

export { Collapse, Presence };
