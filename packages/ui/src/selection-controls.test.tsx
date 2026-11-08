import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Checkbox, Switch } from "./selection-controls";

it("changes a switch with Space and reports its value", async () => {
  const onCheckedChange = vi.fn();
  render(<Switch label="Notifications" onCheckedChange={onCheckedChange} />);
  await userEvent.tab();
  await userEvent.keyboard(" ");
  expect(screen.getByRole("switch", { name: "Notifications" })).toHaveAttribute("aria-checked", "true");
  expect(onCheckedChange).toHaveBeenCalledWith(true);
});

it("submits the checkbox value and blocks disabled changes", async () => {
  const onCheckedChange = vi.fn();
  render(<form aria-label="Preferences"><Checkbox label="Include layers" name="layers" defaultChecked /><Switch label="Disabled toggle" disabled onCheckedChange={onCheckedChange} /></form>);
  const form = screen.getByRole("form", { name: "Preferences" }) as HTMLFormElement;
  expect(new FormData(form).get("layers")).toBe("on");
  await userEvent.click(screen.getByRole("switch", { name: "Disabled toggle" }));
  expect(onCheckedChange).not.toHaveBeenCalled();
});
