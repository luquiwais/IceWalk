import type { CSSProperties, ReactNode } from "react";
import { cn } from "./utils";

/** Layered circular app icon; artwork is supplied by the application. */
function AppIcon({
  children,
  label,
  size = "medium",
  badge,
  color = "#0a84ff",
  className,
}: {
  children: ReactNode;
  label: string;
  size?: "small" | "medium" | "large" | "extra-large";
  badge?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`${label}${badge ? `, ${badge} notifications` : ""}`}
      className={cn(
        "vision-app-icon relative inline-flex shrink-0 items-center justify-center rounded-full",
        size === "small"
          ? "size-11"
          : size === "medium"
            ? "size-13"
            : size === "large"
              ? "size-22"
              : "size-32",
        className,
      )}
      style={{ "--app-color": color } as CSSProperties}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[linear-gradient(145deg,#ffffff55,transparent_60%)] shadow-[inset_0_1px_1px_#ffffff70,0_4px_12px_#0003]"
      />
      <span
        aria-hidden
        className="relative flex size-[55%] items-center justify-center text-white drop-shadow-[0_2px_3px_#0004] [&_svg]:size-full"
      >
        {children}
      </span>
      {badge ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-caption-1 text-white"
        >
          {badge}
        </span>
      ) : null}
    </span>
  );
}
export { AppIcon };
