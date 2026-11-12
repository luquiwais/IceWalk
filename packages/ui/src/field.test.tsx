import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { Combobox } from "./combobox";
import { Field } from "./field";
import { FileField } from "./file-field";
import { NumberField } from "./number-field";
import { OTPField } from "./otp-field";
import { Radio, RadioGroup } from "./radio-group";
import { RangeSlider } from "./range-slider";
import { Rating } from "./rating";
import { Select } from "./select";
import { Stepper } from "./stepper";
import { TextArea } from "./text-area";
import { TokenField } from "./token-field";

const options = [{ value: "radar", label: "Radar" }, { value: "drill", label: "Drill" }];

function Kit({ suffix, error }: { suffix: string; error?: string }) {
  return <>
    <Field label={`Sample ${suffix}`} error={error}>{(props) => <input {...props} name="sample" defaultValue="S1" />}</Field>
    <NumberField label={`Depth ${suffix}`} name="depth" defaultValue={2} controls unit="m" error={error} />
    <Stepper label={`Crew ${suffix}`} name="crew" defaultValue={3} error={error} />
    <TextArea label={`Notes ${suffix}`} name="notes" defaultValue="Dry" error={error} />
    <Select label={`Tool ${suffix}`} name="tool" options={options} defaultValue="radar" error={error} />
    <RadioGroup label={`Outcome ${suffix}`} name="outcome" defaultValue="ice" error={error}><Radio value="ice" label="Ice" /><Radio value="none" label="None" /></RadioGroup>
    <Combobox label={`Search ${suffix}`} name="search" options={options} defaultValue="drill" error={error} />
    <TokenField label={`Filters ${suffix}`} name="filters" defaultValue={["a", "b"]} error={error} />
    <RangeSlider label={`Interval ${suffix}`} name="interval" defaultValue={[1, 2]} max={3} error={error} />
    <OTPField label={`Code ${suffix}`} name="code" length={4} defaultValue="1234" error={error} />
    <FileField label={`Evidence ${suffix}`} name="evidence" error={error} />
    <Rating label={`Quality ${suffix}`} name="quality" defaultValue={4} error={error} />
  </>;
}

const CONTROLS = "input:not([type=hidden]):not([aria-hidden=true]):not([tabindex='-1']), textarea, button, [role=combobox], [role=radio], [role=slider], [role=spinbutton], [role=radiogroup]";

it("links the label, description, and inline validation to its control", () => {
  render(<Field label="Depth" description="Below the surface" error="Enter a positive value">{(props) => <input {...props} />}</Field>);
  const input = screen.getByRole("textbox", { name: "Depth" });
  expect(input).toHaveAccessibleDescription("Below the surface Enter a positive value");
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("Enter a positive value")).toHaveAttribute("aria-live", "polite");
});

it("stays valid without an error, focuses through its label and honors a caller id", async () => {
  render(<Field label="Depth" id="depth" description="Below the surface">{(props) => <input {...props} />}</Field>);
  const input = screen.getByRole("textbox", { name: "Depth" });
  expect(input).toHaveAttribute("id", "depth");
  expect(input).not.toHaveAttribute("aria-invalid");
  expect(input).toHaveAccessibleDescription("Below the surface");
  await userEvent.click(screen.getByText("Depth"));
  expect(input).toHaveFocus();
});

it("keeps a hidden label as the accessible name", () => {
  render(<Field label="Depth" showLabel={false}>{(props) => <input {...props} />}</Field>);
  expect(screen.getByRole("textbox", { name: "Depth" })).toBeInTheDocument();
  expect(screen.getByText("Depth")).toHaveClass("sr-only");
});

it("gives every control in two copies of the kit a unique id, a name and its own error", () => {
  const { container } = render(<><Kit suffix="A" error="Review A" /><Kit suffix="B" /></>);
  const ids = Array.from(container.querySelectorAll("[id]")).map((element) => element.id);
  expect(ids.length).toBeGreaterThan(24);
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  const controls = Array.from(container.querySelectorAll<HTMLElement>(CONTROLS));
  expect(controls.length).toBeGreaterThan(40);
  for (const control of controls) expect(control, control.outerHTML.slice(0, 160)).toHaveAccessibleName();
  for (const reference of Array.from(container.querySelectorAll("[aria-describedby], [aria-labelledby]"))) {
    for (const id of `${reference.getAttribute("aria-describedby") ?? ""} ${reference.getAttribute("aria-labelledby") ?? ""}`.split(" ").filter(Boolean)) {
      expect(document.getElementById(id), `${id} referenced by ${reference.outerHTML.slice(0, 120)}`).not.toBeNull();
    }
  }
  for (const [role, name] of [["textbox", "Sample"], ["spinbutton", "Depth"], ["spinbutton", "Crew"], ["textbox", "Notes"], ["combobox", "Tool"], ["radiogroup", "Outcome"], ["combobox", "Search"], ["textbox", "Filters"], ["slider", "Interval minimum"], ["slider", "Interval maximum"], ["textbox", "Code"], ["radiogroup", "Quality"]] as const) {
    expect(screen.getByRole(role, { name: `${name.replace(/ (minimum|maximum)$/, "")} A${name.match(/ (minimum|maximum)$/)?.[0] ?? ""}` }), `${name} A`).toHaveAccessibleDescription("Review A");
    expect(screen.getByRole(role, { name: `${name.replace(/ (minimum|maximum)$/, "")} B${name.match(/ (minimum|maximum)$/)?.[0] ?? ""}` }), `${name} B`).not.toHaveAccessibleDescription();
  }
  expect(screen.getByLabelText("Evidence A")).toHaveAccessibleDescription("Review A");
  expect(screen.getByLabelText("Evidence A")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Evidence B")).not.toHaveAttribute("aria-invalid");
});

it("submits every named control with a native form", () => {
  const { container } = render(<form><Kit suffix="A" /></form>);
  const data = new FormData(container.querySelector("form")!);
  expect(data.get("sample")).toBe("S1");
  expect(data.get("depth")).toBe("2");
  expect(data.get("crew")).toBe("3");
  expect(data.get("notes")).toBe("Dry");
  expect(data.get("tool")).toBe("radar");
  expect(data.get("outcome")).toBe("ice");
  expect(data.get("search")).toBe("drill");
  expect(data.getAll("filters")).toEqual(["a", "b"]);
  expect(data.getAll("interval")).toEqual(["1", "2"]);
  expect(data.get("code")).toBe("1234");
  expect(data.get("quality")).toBe("4");
});
