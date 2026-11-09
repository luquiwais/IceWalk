import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, IconButton } from "./button";

describe("Button", () => {
  it("runs its action when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Generate plan</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Generate plan" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("ignores presses while disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Generate plan
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Generate plan" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("is keyboard operable", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Replan</Button>);

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "Replan" })).toHaveFocus();
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("IconButton", () => {
  it("exposes its label as the accessible name", () => {
    render(
      <IconButton label="Center on habitat">
        <svg />
      </IconButton>,
    );

    expect(
      screen.getByRole("button", { name: "Center on habitat" }),
    ).toBeInTheDocument();
  });

  it("marks a text-and-symbol label so its symbol uses the 17/19/22pt slots", () => {
    render(
      <>
        <Button size="small"><svg data-testid="s" />Add</Button>
        <Button size="small">Only text</Button>
        <IconButton label="Icon only"><svg data-testid="i" /></IconButton>
      </>,
    );
    expect(screen.getByTestId("s").closest("[data-slot='button']")).toHaveAttribute("data-with-symbol");
    expect(screen.getByRole("button", { name: "Only text" })).not.toHaveAttribute("data-with-symbol");
    expect(screen.getByRole("button", { name: "Icon only" })).not.toHaveAttribute("data-with-symbol");
  });
});
