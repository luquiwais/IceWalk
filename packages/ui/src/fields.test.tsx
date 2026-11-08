import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { TextField } from "./fields";

it("reports typing, clears a search field, and keeps its label", async () => {
  const onValueChange = vi.fn();
  render(<TextField label="Search components" kind="search" onValueChange={onValueChange} />);
  await userEvent.type(screen.getByRole("searchbox", { name: "Search components" }), "glass");
  expect(onValueChange).toHaveBeenLastCalledWith("glass");
  await userEvent.click(screen.getByRole("button", { name: "Clear Search components" }));
  expect(screen.getByRole("searchbox")).toHaveValue("");
  expect(onValueChange).toHaveBeenLastCalledWith("");
});

it("uses a secure native field and blocks disabled input", async () => {
  render(<TextField label="Password" kind="secure" disabled defaultValue="secret" />);
  const input = screen.getByLabelText("Password");
  expect(input).toHaveAttribute("type", "password");
  await userEvent.type(input, "changed");
  expect(input).toHaveValue("secret");
});
