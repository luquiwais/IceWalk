import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DatePicker, TimePicker } from "./pickers";

describe("Picker placement", () => {
  it.each(["date", "time"] as const)(
    "opens the %s picker on the requested side and returns focus on Escape",
    async (kind) => {
      const onValueChange = vi.fn();
      const props = {
        label: "Event",
        side: "top" as const,
        align: "end" as const,
        onValueChange,
      };
      render(
        kind === "date" ? (
          <DatePicker {...props} value="2026-11-12" />
        ) : (
          <TimePicker {...props} value="09:41" />
        ),
      );

      const trigger = screen.getByRole("button", { name: "Event" });
      await userEvent.tab();
      await userEvent.keyboard("{Enter}");
      const dialog = await screen.findByRole("dialog", { name: "Event" });
      await waitFor(() => expect(dialog).toHaveAttribute("data-side", "top"));
      expect(dialog).toHaveAttribute("data-align", "end");
      expect(trigger).toBeVisible();
      expect(trigger).toHaveAttribute("aria-expanded", "true");

      await userEvent.keyboard("{Escape}");
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(trigger).toHaveFocus();
      expect(onValueChange).not.toHaveBeenCalled();
    },
  );
});
