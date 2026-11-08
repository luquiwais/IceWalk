import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Playbook } from "./playbook";

beforeEach(() => {
  window.history.replaceState(null, "", "/design");
  HTMLElement.prototype.scrollTo = vi.fn();
});

describe("visionOS playbook", () => {
  it("finds a component, opens its live specimen and applies disabled mode", async () => {
    render(<Playbook />);
    await userEvent.type(
      screen.getByRole("textbox", { name: "Find components" }),
      "checkbox",
    );
    expect(
      screen.queryByRole("button", { name: "Text fields" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Toggles & checkboxes" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Toggles & checkboxes",
      ),
    );
    expect(
      screen.getByRole("checkbox", { name: "Include attachments" }),
    ).toBeEnabled();
    await userEvent.click(screen.getByRole("switch", { name: "Disabled" }));
    expect(
      screen.getByRole("checkbox", { name: "Include attachments" }),
    ).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Include attachments" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Include attachments" }),
    ).toBeChecked();
    expect(
      screen.getByRole("textbox", { name: "Find components" }),
    ).toBeEnabled();
  });

  it("opens the source index from a deep link and exposes all 30 source links", async () => {
    render(<Playbook />);
    window.location.hash = "coverage";
    fireEvent(window, new HashChangeEvent("hashchange"));
    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: /^Figma source:/ }),
      ).toHaveLength(30),
    );
    await userEvent.click(screen.getByRole("button", { name: "Date & time" }));
    expect(
      await screen.findByRole("grid", { name: "Choose a date" }),
    ).toBeInTheDocument();
  });
});
