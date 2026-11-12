"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Layout } from "@fluidkit/react";
import { Check, ChevronRight } from "lucide-react";
import type * as React from "react";

import { Footnote, Title3 } from "./text";
import { cn } from "./utils";

type ListSectionProps = Omit<React.ComponentProps<"section">, "title"> & {
  /** Section header (Title 3), above the rows. */
  header?: React.ReactNode;
  /** Footnote under the rows. */
  footer?: React.ReactNode;
  headerId?: string;
};

/*
 * visionOS inset grouped list (Figma: Lists > Row - Inset): rows on glass with a 16pt radius,
 * 60pt rows and hairline separators. Rows that come, go or move slide to their places on springs
 * (Fluid Kit Layout).
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
        <Title3 as="h3" id={headerId} className="px-4 pb-2 text-headline">
          {header}
        </Title3>
      ) : null}
      <Layout.Root render={<ul />} className="ui-well relative flex flex-col rounded-row">
        {children}
      </Layout.Root>
      {footer ? (
        <Footnote tone="secondary" className="px-4 pt-2">
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
          className={cn(
            "relative flex min-h-11 w-full items-center gap-2 py-2.5 pr-2 pl-4 text-body outline-none hover:bg-white/6 active:bg-white/10 disabled:text-label-disabled",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-label",
            className,
          )}
        >
          {content}
          {accessory !== "none" ? (
            <span
              data-slot={
                accessory === "disclosure"
                  ? "list-disclosure"
                  : "list-selection"
              }
              className="flex size-8 shrink-0 items-center justify-center text-label-tertiary data-[slot=list-selection]:text-accent"
            >
                {accessory === "disclosure" ? (
                  <ChevronRight
                    aria-hidden
                    className={cn("size-5 transition-transform duration-(--fk-snappy-duration) ease-(--fk-snappy-easing)", expanded && "rotate-90")}
                    strokeWidth={2.25}
                  />
                ) : selected ? (
                  <Check aria-hidden className="size-5" strokeWidth={2.25} />
                ) : null}
            </span>
          ) : null}
        </ButtonPrimitive>
      ) : (
        <div
          data-slot="list-row"
          className={cn(
            "flex min-h-11 items-center gap-2 py-2.5 pr-4 pl-4 text-body",
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
