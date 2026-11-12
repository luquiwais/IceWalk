import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Playbook } from "./playbook";

beforeEach(() => {
  window.history.replaceState(null, "", "/design");
  HTMLElement.prototype.scrollTo = vi.fn();
});

describe("Liquid Glass playbook", () => {
  it("previews both appearances and restores the host theme when leaving the playbook", async () => {
    document.documentElement.dataset.theme = "dark";
    const { unmount } = render(<Playbook />);
    await userEvent.click(screen.getByRole("button", { name: "Use light appearance" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    await userEvent.click(screen.getByRole("button", { name: "Use dark appearance" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    await userEvent.click(screen.getByRole("button", { name: "Use light appearance" }));
    unmount();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

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

  it("opens the index from a deep link and links every family to its guidelines", async () => {
    render(<Playbook />);
    window.location.hash = "coverage";
    fireEvent(window, new HashChangeEvent("hashchange"));
    await waitFor(() =>
      expect(
        screen.getAllByRole("link", { name: /^Guidelines:/ }),
      ).toHaveLength(30),
    );
    await userEvent.click(screen.getByRole("button", { name: "Date & time" }));
    expect(
      await screen.findByRole("grid", { name: "Choose a date" }),
    ).toBeInTheDocument();
  });

  it("opens the input extension, changes a number and exposes its validation", async () => {
    render(<Playbook />);
    await userEvent.click(screen.getByRole("button", { name: "Input controls" }));
    const input = await screen.findByRole("spinbutton", { name: "Survey depth" });
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-valuenow", "1.75");
    await userEvent.click(screen.getByRole("switch", { name: "Show validation messages" }));
    expect(input).toHaveAccessibleDescription("Tool reach: 0–3 m Depth must fit the tool reach.");
    await userEvent.click(screen.getByRole("switch", { name: "Disabled" }));
    expect(input).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Evidence filters" })).toBeDisabled();
  });

  it("opens the window transition extension and its live lifecycle specimen", async () => {
    render(<Playbook />);
    await userEvent.click(screen.getByRole("button", { name: "Windows & sheets" }));
    const open = await screen.findByRole("button", { name: "Open specimen window" });
    await userEvent.click(open);
    // The window comes in place, its button staying where it is
    await waitFor(() => expect(screen.getByRole("button", { name: "Station details" })).toBeVisible());
    await userEvent.click(screen.getByRole("button", { name: "Station details" }));
    expect(await screen.findByText("Station 01")).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Close window" })).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Open specimen window" })).toHaveFocus());
  });
});
