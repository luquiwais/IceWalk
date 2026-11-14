import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { NavigationBar, Window, WindowMotion } from "./window";

function MorphWindowExample() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const origin = useRef<HTMLSpanElement>(null);
  return (
    <>
      <Button
        ref={trigger}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span
          ref={origin}
          aria-hidden
          className="absolute inset-0 rounded-[inherit]"
        />
        Open details
      </Button>
      <WindowMotion open={open} morphOrigin={origin} restoreFocus={trigger}>
        <Window aria-label="Details" data-testid="details-window">
          <Button onClick={() => setOpen(false)}>Close details</Button>
        </Window>
      </WindowMotion>
    </>
  );
}

describe("Window morph lifecycle", () => {
  it("mounts the window for its morph and restores focus without hiding the invoking button", async () => {
    render(<MorphWindowExample />);
    expect(screen.queryByTestId("details-window")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Open details" });
    await userEvent.click(trigger);
    const close = await screen.findByRole("button", { name: "Close details" });
    await waitFor(() => expect(close).toHaveFocus());
    expect(trigger).toBeVisible();
    await userEvent.click(close);
    await waitFor(() =>
      expect(screen.queryByTestId("details-window")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
    expect(trigger).toBeVisible();
  });

  it("can reverse an opening and then open again", async () => {
    render(<MorphWindowExample />);
    const trigger = screen.getByRole("button", { name: "Open details" });
    await userEvent.dblClick(trigger);
    await waitFor(() =>
      expect(screen.queryByTestId("details-window")).not.toBeInTheDocument(),
    );
    await userEvent.click(trigger);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close details" }),
      ).toBeVisible(),
    );
    expect(trigger).toBeVisible();
  });
});

describe("Window", () => {
  it("is a region named by its navigation bar title", () => {
    render(
      <Window aria-labelledby="eva-title">
        <NavigationBar id="eva-title" title="EVA 1" />
      </Window>,
    );

    expect(screen.getByRole("region", { name: "EVA 1" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "EVA 1" }),
    ).toBeInTheDocument();
  });

  it("can use another heading level", () => {
    render(<NavigationBar title="Stations" level={3} />);

    expect(
      screen.getByRole("heading", { level: 3, name: "Stations" }),
    ).toBeInTheDocument();
  });
});
