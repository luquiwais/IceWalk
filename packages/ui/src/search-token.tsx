"use client";

import { ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

function SearchToken({
  children,
  category,
  onRemove,
  onClick,
  disabled = false,
  selected = false,
}: {
  children: ReactNode;
  category?: string;
  onRemove?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <span
      data-slot="search-token"
      data-disabled={disabled ? "" : undefined}
      data-selected={selected ? "" : undefined}
      className="ui-fill relative data-selected:ui-selected inline-flex max-w-full items-center overflow-hidden rounded-[0.625rem] text-callout"
    >
      {onClick ? (
        <Button
          variant="plain"
          disabled={disabled}
          shape="rounded"
          size="small"
          onClick={onClick}
          className="min-w-0 gap-1 rounded-none text-inherit"
        >
          {category ? (
            <span className="font-normal opacity-70">{category}:</span>
          ) : null}
          <span className="truncate">{children}</span>
          <ChevronDown aria-hidden className="size-3" />
        </Button>
      ) : (
        <span className="relative flex h-8 min-w-0 items-center gap-1 px-3">
          {category ? (
            <span className="font-normal opacity-70">{category}:</span>
          ) : null}
          <span className="truncate">{children}</span>
        </span>
      )}
      {onRemove ? (
        <button
          type="button"
          disabled={disabled}
          aria-label={`Remove ${typeof children === "string" ? children : "filter"}`}
          onClick={onRemove}
          className="flex size-8 shrink-0 items-center justify-center border-l border-white/20 outline-none hover:bg-white/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white disabled:opacity-40"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </span>
  );
}
export { SearchToken };
