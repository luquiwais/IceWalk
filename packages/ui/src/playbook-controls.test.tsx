import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { ActivityIndicator, PageControl, ProgressBar } from "./indicators";
import { Keyboard } from "./keyboard";
import { DropdownMenu } from "./menu";
import { Calendar, DatePicker, TimePicker } from "./pickers";
import { SearchToken } from "./search-token";
import { Slider } from "./slider";
import { Alert } from "./system-surfaces";

describe("playbook controls", () => {
  it("navigates the calendar across a leap-day boundary before selecting", async () => {
    const change = vi.fn();
    render(
      <Calendar label="Event date" value="2028-02-29" onValueChange={change} />,
    );
    const day = screen.getByRole("button", {
      name: "Tuesday, February 29, 2028",
    });
    day.focus();
    await userEvent.keyboard("{ArrowRight}");
    const next = await screen.findByRole("button", {
      name: "Wednesday, March 1, 2028",
    });
    expect(next).toHaveFocus();
    expect(change).not.toHaveBeenCalled();
    await userEvent.keyboard("{Enter}");
    expect(change).toHaveBeenCalledWith("2028-03-01");
  });

  it("keeps disabled calendar triggers closed", async () => {
    render(
      <DatePicker
        label="Disabled date"
        value="2026-11-08"
        onValueChange={vi.fn()}
        disabled
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Disabled date" }),
    );
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("converts wheel selection to 24-hour time", () => {
    const change = vi.fn();
    render(
      <TimePicker
        label="Start"
        value="09:41"
        onValueChange={change}
        expanded
      />,
    );
    fireEvent.focus(screen.getByRole("spinbutton", { name: "Start period" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Start period" }), {
      target: { value: "PM" },
    });
    fireEvent.blur(screen.getByRole("spinbutton", { name: "Start period" }));
    expect(change).toHaveBeenCalledWith("21:41");
  });

  it("edits wheel numbers directly and uses arrows to step without a selector", async () => {
    function Example() {
      const [value, setValue] = useState("09:41");
      return (
        <TimePicker
          label="Time"
          value={value}
          onValueChange={setValue}
          expanded
        />
      );
    }
    render(<Example />);
    const minute = screen.getByRole("spinbutton", { name: "Time minute" });
    await userEvent.click(minute);
    await userEvent.clear(minute);
    await userEvent.type(minute, "07{Enter}");
    expect(minute).toHaveValue("07");
    minute.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(minute).toHaveValue("08");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("types, shifts and deletes complete unicode characters", async () => {
    function Example() {
      const [value, setValue] = useState("🚀");
      return (
        <>
          <output aria-label="Result">{value}</output>
          <Keyboard value={value} onValueChange={setValue} />
        </>
      );
    }
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByLabelText("Result")).toHaveTextContent("");
    await userEvent.click(screen.getByRole("button", { name: "Shift" }));
    await userEvent.click(screen.getByRole("button", { name: "A" }));
    await userEvent.click(screen.getByRole("button", { name: "b" }));
    expect(screen.getByLabelText("Result")).toHaveTextContent("Ab");
  });

  it("opens a menu by keyboard, skips disabled actions, and returns focus", async () => {
    const change = vi.fn();
    render(
      <DropdownMenu
        label="Actions"
        items={[
          {
            id: "disabled",
            label: "Unavailable",
            disabled: true,
            onSelect: change,
          },
          { id: "open", label: "Open", onSelect: change },
        ]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("menu");
    await userEvent.keyboard("{Enter}");
    expect(change).toHaveBeenCalledOnce();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("dismisses an alert with Escape and restores trigger focus", async () => {
    render(
      <Alert
        trigger={<Button>Show alert</Button>}
        title="Save changes?"
        description="Keep this space."
        actions={[{ label: "Save" }, { label: "Cancel" }]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Show alert" });
    await userEvent.click(trigger);
    expect(
      await screen.findByRole("alertdialog", { name: "Save changes?" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it("clamps progress and gives loading a single accessible status", () => {
    render(
      <>
        <ProgressBar label="Download" value={150} />
        <ActivityIndicator label="Loading space" />
      </>,
    );
    expect(
      screen.getByRole("progressbar", { name: "Download" }),
    ).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("status")).toHaveTextContent("Loading space");
  });

  it("selects pages and prevents disabled page selection", async () => {
    const change = vi.fn();
    const { rerender } = render(
      <PageControl count={3} value={0} onValueChange={change} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(change).toHaveBeenLastCalledWith(1);
    rerender(
      <PageControl count={3} value={0} onValueChange={change} disabled />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(change).toHaveBeenCalledOnce();
  });

  it("separates token remove and selection actions and disables both", async () => {
    const select = vi.fn(),
      remove = vi.fn();
    const { rerender } = render(
      <SearchToken onClick={select} onRemove={remove}>
        Design
      </SearchToken>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Design" }),
    );
    expect(remove).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
    rerender(
      <SearchToken onClick={select} onRemove={remove} disabled>
        Design
      </SearchToken>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Design" }));
    expect(select).not.toHaveBeenCalled();
  });

  it("exposes range limits and forwards the selected numeric value", () => {
    const change = vi.fn();
    render(
      <Slider
        label="Volume"
        value={50}
        min={0}
        max={100}
        step={25}
        onValueChange={change}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Volume" });
    fireEvent.change(slider, { target: { value: "75" } });
    expect(change).toHaveBeenCalledWith(75);
    expect(slider).toHaveAttribute("step", "25");
  });

  it("opening the collapsible time picker does not focus the hour field", async () => {
    render(<TimePicker label="Start" value="09:41" onValueChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    const hour = await screen.findByRole("spinbutton", { name: "Start hour" });
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    // Let Base UI finish its open-time focus management before asserting.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(hour).not.toHaveFocus();
    expect(document.activeElement?.getAttribute("role")).not.toBe("spinbutton");
  });

  it("draws the wheel focus ring inside the field so overflow-hidden cannot clip it", () => {
    render(<TimePicker label="Start" value="09:41" onValueChange={vi.fn()} expanded />);
    const field = screen.getByRole("spinbutton", { name: "Start hour" });
    expect(field.className).toContain("focus:ring-inset");
    expect(field.className).not.toMatch(/focus:ring-offset/);
  });
});
