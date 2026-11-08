"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { ChevronRight } from "lucide-react";
import type * as React from "react";

import { MaterialLayers } from "./material";
import { cn } from "./utils";

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
function ListSection({ header, footer, headerId, className, children, ...props }: ListSectionProps) {
  return (
    <section
      aria-labelledby={header ? headerId : undefined}
      className={cn("flex flex-col", className)}
      {...props}
    >
      {header ? (
        <h3 id={headerId} className="px-5 pb-[7px] text-title-3">
          {header}
        </h3>
      ) : null}
      <ul className="vision-surface relative flex flex-col rounded-row">
        <MaterialLayers kind="regular" />
        {children}
      </ul>
      {footer ? <p className="vibrant-secondary px-5 pt-1.5 text-footnote">{footer}</p> : null}
    </section>
  );
}

type ListRowProps = {
  children: React.ReactNode;
  /** Trailing content before the chevron (values, badges). */
  trailing?: React.ReactNode;
  /** Makes the row a button with a disclosure chevron. */
  onClick?: () => void;
  className?: string;
};

function ListRow({ children, trailing, onClick, className }: ListRowProps) {
  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-3 text-left">{children}</span>
      {trailing ? <span className="flex shrink-0 items-center gap-2">{trailing}</span> : null}
    </>
  );

  return (
    <li className="border-b border-separator last:border-b-0 first:[&>*]:rounded-t-row last:[&>*]:rounded-b-row">
      {onClick ? (
        <ButtonPrimitive
          onClick={onClick}
          data-platter="false"
          className={cn(
            "vision-control vision-surface relative flex min-h-15 w-full items-center gap-2 py-2 pr-2 pl-5 text-body outline-none",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-label",
            className,
          )}
        >
          <MaterialLayers kind="platter" />
          {content}
          <span className="flex size-11 shrink-0 items-center justify-center">
            <ChevronRight aria-hidden className="vibrant-secondary size-[18px]" strokeWidth={2.5} />
          </span>
        </ButtonPrimitive>
      ) : (
        <div className={cn("flex min-h-15 items-center gap-2 py-2 pr-5 pl-5 text-body", className)}>
          {content}
        </div>
      )}
    </li>
  );
}

export { ListRow, ListSection };
export type { ListRowProps, ListSectionProps };
