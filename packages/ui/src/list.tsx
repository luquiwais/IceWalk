"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Check, ChevronRight } from "lucide-react";
import type * as React from "react";

import { MaterialLayers } from "./material";
import { Footnote, Title3 } from "./text";
import { cn } from "./utils";
import { Vibrancy } from "./vibrancy";

type ListSectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** Section header (Title 3), above the rows. */
  header?: React.ReactNode;
  /** Footnote under the rows. */
  footer?: React.ReactNode;
  headerId?: string;
};

/*
 * visionOS inset grouped list (Figma: Lists > Row - Inset): rows on the Regular
 * material with a 16 pt radius, 60 pt rows and hairline separators.
 */
function ListSection({
  header,
  footer,
  headerId,
  className,
  children,
  ...props
}: ListSectionProps) {
  return (
    <section
      aria-labelledby={header ? headerId : undefined}
      className={cn("flex flex-col", className)}
      {...props}
    >
      {header ? (
        <Title3 as="h3" id={headerId} className="px-5 pb-[0.4375rem]">
          {header}
        </Title3>
      ) : null}
      <ul className="vision-surface relative flex flex-col rounded-row">
        <MaterialLayers kind="regular" />
        {children}
      </ul>
      {footer ? (
        <Footnote tone="secondary" className="px-5 pt-2">
          {footer}
        </Footnote>
      ) : null}
    </section>
  );
}

type ListRowProps = {
  children: React.ReactNode;
  /** Trailing content before the chevron (values, badges). */
  trailing?: React.ReactNode;
  /** Makes the row a button with a disclosure chevron. */
  onClick?: () => void;
  disabled?: boolean;
  /** Navigation, single selection, or an action without an accessory. */
  accessory?: "disclosure" | "selection" | "none";
  selected?: boolean;
  /** Only supply these when the row actually opens a content panel. */
  expanded?: boolean;
  controls?: string;
  className?: string;
};

function ListRow({
  children,
  trailing,
  onClick,
  disabled,
  accessory = "disclosure",
  selected,
  expanded,
  controls,
  className,
}: ListRowProps) {
  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
        {children}
      </span>
      {trailing ? (
        <span className="flex shrink-0 items-center gap-2">{trailing}</span>
      ) : null}
    </>
  );

  return (
    <li className="border-b border-separator last:border-b-0 first:[&>*]:rounded-t-row last:[&>*]:rounded-b-row">
      {onClick ? (
        <ButtonPrimitive
          data-slot="list-row"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={accessory === "selection" ? selected : undefined}
          aria-expanded={expanded}
          aria-controls={controls}
          data-platter="false"
          className={cn(
            "vision-control vision-surface relative flex min-h-15 w-full items-center gap-2 py-2 pr-2 pl-5 text-body outline-none",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-label",
            className,
          )}
        >
          <MaterialLayers kind="platter" />
          {content}
          {accessory !== "none" ? (
            <span
              data-slot={
                accessory === "disclosure"
                  ? "list-disclosure"
                  : "list-selection"
              }
              className="flex size-11 shrink-0 items-center justify-center"
            >
              <Vibrancy>
                {accessory === "disclosure" ? (
                  <ChevronRight
                    aria-hidden
                    className={cn("size-5", expanded && "rotate-90")}
                    strokeWidth={2.25}
                  />
                ) : selected ? (
                  <Check aria-hidden className="size-5" strokeWidth={2.25} />
                ) : null}
              </Vibrancy>
            </span>
          ) : null}
        </ButtonPrimitive>
      ) : (
        <div
          data-slot="list-row"
          className={cn(
            "flex min-h-15 items-center gap-2 py-2 pr-5 pl-5 text-body",
            className,
          )}
        >
          {content}
        </div>
      )}
    </li>
  );
}

export { ListRow, ListSection };
export type { ListRowProps, ListSectionProps };
