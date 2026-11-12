"use client";

import { useState } from "react";
import { Combobox } from "@icewalk/ui/combobox";
import { Field } from "@icewalk/ui/field";
import { FileField } from "@icewalk/ui/file-field";
import { TextField } from "@icewalk/ui/fields";
import { NumberField } from "@icewalk/ui/number-field";
import { OTPField } from "@icewalk/ui/otp-field";
import { Radio, RadioGroup } from "@icewalk/ui/radio-group";
import { RangeSlider } from "@icewalk/ui/range-slider";
import { Rating } from "@icewalk/ui/rating";
import { Select } from "@icewalk/ui/select";
import { Switch } from "@icewalk/ui/selection-controls";
import { Stepper } from "@icewalk/ui/stepper";
import { Text } from "@icewalk/ui/text";
import { TextArea } from "@icewalk/ui/text-area";
import { TokenField } from "@icewalk/ui/token-field";
import { Specimen } from "./playbook-specimens";

const TOOLS = [
  { value: "radar", label: "Ground radar", group: "Survey" },
  { value: "neutrons", label: "Neutron spectrometer", group: "Survey" },
  { value: "drill", label: "Hand drill", group: "Sampling" },
  { value: "coring", label: "Deep coring drill", group: "Sampling", disabled: true },
];

export function InputSpecimens({ disabled }: { disabled: boolean }) {
  const [errors, setErrors] = useState(false);
  return <div className="space-y-10">
    <div className="flex flex-col gap-4">
      <Text tone="secondary" className="max-w-[44rem]">These controls extend the source library. They are not in Apple&apos;s kit as complete controls: they are composed from kit materials, field dimensions, and existing menu treatments. The rounded TextField below is the reference for height, corners, and focus.</Text>
      <Switch label="Show validation messages" checked={errors} onCheckedChange={setErrors} />
    </div>
    <Specimen title="Numbers and units" detail="Arrow keys · Shift ×10 · PageUp/Down · Home/End">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <TextField label="Reference text field" shape="rounded" showLabel defaultValue="Field reference" disabled={disabled} />
      <NumberField label="Survey depth" unit="m" defaultValue={1.5} min={0} max={3} step={0.25} precision={2} controls disabled={disabled} description="Tool reach: 0–3 m" error={errors ? "Depth must fit the tool reach." : undefined} />
      <NumberField label="Equipment mass" unit="kg" defaultValue={12.75} min={0} max={100} step={0.25} precision={2} disabled={disabled} error={errors ? "Review the equipment mass." : undefined} />
      <NumberField label="Unavailable depth" unit="m" value={3} disabled />
      </div>
    </Specimen>
    <Specimen title="Stepper" detail="Press and hold to repeat · stops at bounds">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <Stepper label="Crew count" defaultValue={2} min={1} max={4} disabled={disabled} description="1–4 crew members" error={errors ? "Confirm the crew count." : undefined} />
      </div>
    </Specimen>
    <Specimen title="Multiline text" detail="Optional auto-growth and character count">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <TextArea label="Field observations" placeholder="Describe the surface and evidence…" defaultValue="Radar return near the crater apron." maxLength={240} counter autoGrow disabled={disabled} error={errors ? "Add the station identifier." : undefined} />
      </div>
    </Specimen>
    <Specimen title="Value selection" detail="Grouped options · typeahead · arrow navigation">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <Select label="Survey tool" options={TOOLS} defaultValue="radar" disabled={disabled} description="Deep coring is unavailable." error={errors ? "Confirm the survey tool." : undefined} />
      <RadioGroup label="Measurement outcome" defaultValue="no-ice" disabled={disabled} error={errors ? "Confirm the observed outcome." : undefined}>
        <Radio value="ice" label="Ice detected" />
        <Radio value="no-ice" label="No ice detected" />
        <Radio value="pending" label="Laboratory result unavailable" disabled />
      </RadioGroup>
      </div>
    </Specimen>
    <Specimen title="Autocomplete" detail="Filters by label · Escape closes · Enter selects">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <Combobox label="Find a tool" options={TOOLS} placeholder="Search available tools…" disabled={disabled} error={errors ? "Choose an available tool." : undefined} />
      </div>
    </Specimen>
    <Specimen title="Token entry" detail="Enter or comma adds · Backspace removes the last token">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <TokenField label="Evidence filters" defaultValue={["radar", "ice"]} placeholder="Add…" disabled={disabled} description="Enter one filter at a time." error={errors ? "Review the evidence filters." : undefined} />
      </div>
    </Specimen>
    <Specimen title="Range selection" detail="Two independently named handles · keyboard and pointer">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <RangeSlider label="Depth interval" defaultValue={[0.5, 2]} min={0} max={3} step={0.25} unit="m" disabled={disabled} error={errors ? "Confirm the depth interval." : undefined} />
      </div>
    </Specimen>
    <Specimen title="One-time code" detail="Paste, autofill, arrow navigation and Backspace">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <OTPField label="Access code" length={6} disabled={disabled} description="Six digits. Pasting is supported." error={errors ? "Check the six-digit code." : undefined} />
      </div>
    </Specimen>
    <Specimen title="File selection" detail="Native file picker or drag and drop · type validation">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <FileField label="Evidence files" accept="image/*,.csv" multiple disabled={disabled} description="Images or CSV. Files stay in this browser." error={errors ? "Add evidence from the station." : undefined} />
      </div>
    </Specimen>
    <Specimen title="Rating" detail="Named radio choices · arrow navigation">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <Rating label="Image quality" defaultValue={3} disabled={disabled} error={errors ? "Confirm the image quality." : undefined} />
      </div>
    </Specimen>
    <Specimen title="Shared field labeling" detail="Label, supporting text and inline validation">
      <div className="flex w-full min-w-0 flex-wrap items-start gap-4">
      <Field label="Sample identifier" description="Native input using the common field wrapper." error={errors ? "Enter a sample identifier." : undefined}>{(props) => <div data-disabled={disabled ? "" : undefined} className="ui-well relative flex items-center rounded-xl px-5 focus-within:outline-2 focus-within:outline-label"><input {...props} placeholder="S1094b-001" disabled={disabled} className="h-11 w-full bg-transparent text-body text-label caret-accent outline-none placeholder:text-label-tertiary" /></div>}</Field>
      </div>
    </Specimen>
  </div>;
}
