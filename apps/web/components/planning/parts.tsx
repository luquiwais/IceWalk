import { Body, Footnote } from "@icewalk/ui/text";

import type { Priority } from "@/lib/plan";

export const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };

export const RESULT_LABEL = { ice: "Ice", no_ice: "No ice", inconclusive: "Inconclusive", any: "Any result" } as const;

/** Mission elapsed time as h:mm. */
export function clock(minutes: number) {
  const total = Math.round(minutes);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Signed delta, e.g. +3.2 or −30. */
export function signed(value: number, text: string) {
  return `${value > 0 ? "+" : value < 0 ? "−" : "±"}${text.replace(/^-/, "")}`;
}

/** Trailing value of a list row: secondary, tabular numbers. */
export function Value({ children }: { children: React.ReactNode }) {
  return (
    <Body as="span" tone="secondary" className="tabular-nums">
      {children}
    </Body>
  );
}

/** Two-line row label: primary text over a secondary footnote. */
export function RowLabel({ title, detail }: { title: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate">{title}</span>
      {detail ? (
        <Footnote as="span" tone="secondary" className="truncate">
          {detail}
        </Footnote>
      ) : null}
    </span>
  );
}
