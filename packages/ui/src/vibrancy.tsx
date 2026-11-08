import { Children, type ReactNode } from "react";
import { cn } from "./utils";

/** Figma's two label paints, independently blended against the surface. */
function Vibrancy({ children, tone = "secondary", className }: { children: ReactNode; tone?: "secondary" | "tertiary"; className?: string }) {
  const nodes = Children.toArray(children);
  const text = nodes.every(n => typeof n === "string" || typeof n === "number") ? nodes.join("") : undefined;
  return <span data-vibrancy={tone} data-vibrancy-copy={text} className={cn("vision-vibrancy", className)}>
    <span className={cn("vision-vibrancy-ink", tone === "secondary" ? "vibrant-secondary" : "vibrant-tertiary")}>{children}</span>
    {text === undefined ? <span aria-hidden className="vision-vibrancy-wash">{children}</span> : null}
  </span>;
}

export { Vibrancy };
