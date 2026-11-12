"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Field } from "./field";
import { useInputValue } from "./input-utils";
import { cn } from "./utils";

type FileFieldProps = {
  label: string;
  value?: File[];
  defaultValue?: File[];
  onValueChange?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  name?: string;
  error?: string;
  description?: string;
  className?: string;
};

function accepts(file: File, accept?: string) {
  if (!accept?.trim()) return true;
  return accept.split(",").some((part) => {
    const type = part.trim().toLowerCase();
    if (type.startsWith(".")) return file.name.toLowerCase().endsWith(type);
    if (type.endsWith("/*")) return file.type.toLowerCase().startsWith(type.slice(0, -1));
    return file.type.toLowerCase() === type;
  });
}

function FileField({ label, value, defaultValue = [], onValueChange, accept, multiple, disabled, name, error, description, className }: FileFieldProps) {
  const [files, change] = useInputValue(value, defaultValue, onValueChange);
  const native = useRef<HTMLInputElement>(null);
  const [validation, setValidation] = useState("");
  const [dragging, setDragging] = useState(false);
  function syncNative(next: File[]) {
    if (!native.current) return;
    if (typeof DataTransfer !== "undefined") {
      const transfer = new DataTransfer();
      next.forEach((file) => transfer.items.add(file));
      native.current.files = transfer.files;
    } else if (!next.length) native.current.value = "";
  }
  useEffect(() => { syncNative(files); }, [files]);
  function select(incoming: File[]) {
    const valid = incoming.filter((file) => accepts(file, accept));
    setValidation(valid.length !== incoming.length ? `Choose ${accept} files.` : "");
    if (valid.length) {
      const next = multiple ? valid : valid.slice(0, 1);
      change(next);
      syncNative(value === undefined ? next : files);
    } else syncNative(files);
  }
  return <Field {...{ label, description, className }} error={error || validation}>{(field) => <>
    <div data-disabled={disabled ? "" : undefined} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) select(Array.from(event.dataTransfer.files)); }} className={cn("ui-well relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl px-4 py-5", dragging && "outline-2 outline-offset-2 outline-label")}>
      <Upload aria-hidden className="relative size-6" />
      <span className="relative text-body">{multiple ? "Choose files or drop here" : "Choose a file or drop here"}</span>
      {accept ? <span className="relative text-footnote">{accept}</span> : null}
      <input {...field} ref={native} type="file" name={name} accept={accept} multiple={multiple} disabled={disabled} className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" onChange={(event) => select(Array.from(event.target.files ?? []))} />
    </div>
    <ul aria-label={`${label} selected files`} className="flex flex-col gap-1">
      {files.map((file, index) => <li key={`${file.name}-${index}`} className="flex min-h-11 items-center gap-2 text-footnote"><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" disabled={disabled} aria-label={`Remove ${file.name}`} onClick={() => change(files.filter((_, at) => at !== index))} className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none hover:bg-fill-tertiary focus-visible:outline-2 focus-visible:outline-label disabled:text-label-disabled"><X aria-hidden className="size-4" /></button></li>)}
    </ul>
  </>}</Field>;
}
export { FileField };
export type { FileFieldProps };
