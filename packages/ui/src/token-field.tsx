"use client";

import { useRef, useState } from "react";
import { Field } from "./field";
import { MaterialLayers } from "./material";
import { SearchToken } from "./search-token";
import { INPUT, SURFACE, useInputValue } from "./input-utils";
import { cn } from "./utils";

type TokenFieldProps = {
  label: string;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Maximum number of tokens; further entries are ignored. */
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
  description?: string;
  error?: string;
  className?: string;
};

function TokenField({ label, value, defaultValue = [], onValueChange, max = Infinity, disabled, placeholder, name, description, error, className }: TokenFieldProps) {
  const [tokens, change] = useInputValue(value, defaultValue, onValueChange);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  /** Accepts one entry or a comma/line separated list (paste); trims, de-duplicates and respects max. */
  function add(text = draft) {
    const next = [...tokens];
    for (const part of text.split(/[,\n]/)) {
      const token = part.trim();
      if (token && !next.includes(token) && next.length < max) next.push(token);
    }
    if (next.length !== tokens.length) change(next);
    setDraft("");
  }
  return <Field {...{ label, description, error, className }}>{(field) => <>
    <div data-disabled={disabled ? "" : undefined} className={cn(SURFACE, "flex-wrap gap-2 px-2 py-1")}>
      <MaterialLayers kind={disabled ? "regular" : "recessed"} />
      {tokens.map((token, index) => <SearchToken key={`${token}-${index}`} disabled={disabled} onRemove={() => { change(tokens.filter((_, at) => at !== index)); input.current?.focus(); }}>{token}</SearchToken>)}
      <input {...field} ref={input} disabled={disabled} value={draft} placeholder={placeholder} className={cn(INPUT, "h-9 min-w-24 px-3")} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft.trim()) add(); }} onPaste={(event) => { const text = event.clipboardData.getData("text"); if (/[,\n]/.test(text)) { event.preventDefault(); add(draft + text); } }} onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(); }
        else if (event.key === "Backspace" && draft === "" && tokens.length) { event.preventDefault(); change(tokens.slice(0, -1)); }
      }} />
    </div>
    {name ? tokens.map((token, index) => <input key={index} type="hidden" name={name} value={token} disabled={disabled} />) : null}
  </>}</Field>;
}
export { TokenField };
export type { TokenFieldProps };
