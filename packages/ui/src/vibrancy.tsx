import { Children, type AriaAttributes, type ReactNode } from "react";
import { cn } from "./utils";

/** Figma's two label paints, independently blended against the surface. */
function Vibrancy({ children, tone = "secondary", className, "aria-hidden": ariaHidden }: { children: ReactNode; tone?: "secondary" | "tertiary"; className?: string; "aria-hidden"?: AriaAttributes["aria-hidden"] }) {
  const nodes = Children.toArray(children);
  const text = nodes.every(n => typeof n === "string" || typeof n === "number") ? nodes.join("") : undefined;
  return <span aria-hidden={ariaHidden} data-vibrancy={tone} data-vibrancy-copy={text} className={cn("vision-vibrancy", className)}>
    <span className={cn("vision-vibrancy-ink", tone === "secondary" ? "vibrant-secondary" : "vibrant-tertiary")}>{children}</span>
    {text === undefined ? <span aria-hidden className="vision-vibrancy-wash">{children}</span> : null}
  </span>;
}

export { Vibrancy };
