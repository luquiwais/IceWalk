"use client";

import { ArrowBigUp, Delete, Keyboard as KeyboardIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { IconButton } from "./button";
import { SurfaceScroll } from "./material";
import { Text } from "./text";
import { cn } from "./utils";

/** A web keyboard specimen; typing is local and never invokes device dictation. */
function Keyboard({
  value,
  onValueChange,
  onReturn,
  disabled = false,
}: {
  value: string;
  onValueChange: (text: string) => void;
  onReturn?: () => void;
  disabled?: boolean;
}) {
  const [shift, setShift] = useState(false);
  const [numeric, setNumeric] = useState(false);
  function key(
    label: string,
    action: () => void,
    content: ReactNode = label,
    className?: string,
    pressed?: boolean,
  ) {
    return (
      <button
        key={label}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
        onClick={action}
        className={cn(
          "ui-key relative flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full pb-1 text-body outline-none hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-label disabled:text-label-disabled [&_svg]:size-[1.1875rem]",
          className,
        )}
      >
        {content}
      </button>
    );
  }
  function insert(text: string) {
    onValueChange(value + text);
    if (shift) setShift(false);
  }
  const rows = numeric
    ? ["1234567890", '-/:;()$&@"', ".,?!'"]
    : ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  return (
    <div
      data-slot="keyboard"
      className="lb relative w-[34rem] max-w-full overflow-clip rounded-[2.125rem] text-label"
    >
      <header className="relative flex h-12 items-center justify-between bg-black/31 px-4">
        <IconButton
          label="Clear keyboard input"
          size="small"
          disabled={disabled}
          showTooltip={false}
          onClick={() => onValueChange("")}
        >
          <KeyboardIcon aria-hidden />
        </IconButton>
        <Text variant="body" className="max-w-[24rem] truncate">
          {value || "Type something"}
          <span aria-hidden className="ml-0.5 border-r-2 border-white/70" />
        </Text>
        <span className="size-8" />
      </header>
      <SurfaceScroll direction="horizontal" className="relative">
        <div key={`${numeric}-${shift}`} className="ui-swap flex w-[34rem] flex-col gap-2 p-4">
          <div className="mb-1 flex gap-3">
            {["Hello", "the", "to"].map((word) =>
              key(
                `Suggestion ${word}`,
                () => onValueChange(value.replace(/\S*$/, word + " ")),
                word,
                "h-8 min-w-0 flex-1 text-caption-1",
              ),
            )}
          </div>
          {rows.map((row, i) => (
            <div key={i} className="flex justify-center gap-2">
              {i === 2
                ? key(
                    "Shift",
                    () => setShift(!shift),
                    <ArrowBigUp aria-hidden />,
                    "mr-auto",
                    shift,
                  )
                : null}
              {Array.from(row).map((letter) =>
                key(
                  shift ? letter.toUpperCase() : letter,
                  () => insert(shift ? letter.toUpperCase() : letter),
                  undefined,
                  "w-11",
                ),
              )}
              {i === 2
                ? key(
                    "Delete",
                    () =>
                      onValueChange(Array.from(value).slice(0, -1).join("")),
                    <Delete aria-hidden />,
                    "ml-auto",
                  )
                : null}
            </div>
          ))}
          <div className="flex gap-2">
            {key(
              numeric ? "ABC" : "123",
              () => setNumeric(!numeric),
              numeric ? "ABC" : "123",
              "w-[5.0625rem] text-callout",
            )}
            {key("Space", () => insert(" "), "space", "flex-1")}
            {key(
              "Return",
              () => (onReturn ? onReturn() : insert("\n")),
              "return",
              "w-[5.0625rem] text-callout",
            )}
          </div>
        </div>
      </SurfaceScroll>
    </div>
  );
}

export { Keyboard };
