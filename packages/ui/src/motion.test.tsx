import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MotionPresence } from "./motion";

afterEach(() => vi.useRealTimers());

describe("MotionPresence", () => {
  it("retains an inert outgoing surface until its exit completes", () => {
    const exited = vi.fn();
    const { rerender } = render(
      <MotionPresence present onExitComplete={exited}>
        <button>Panel action</button>
      </MotionPresence>,
    );
    rerender(
      <MotionPresence present={false} onExitComplete={exited}>
        <button>Panel action</button>
      </MotionPresence>,
    );
    const outgoing = screen.getByText("Panel action").parentElement!;
    expect(outgoing).toHaveAttribute("inert");
    expect(outgoing).toHaveAttribute("aria-hidden", "true");
    expect(exited).not.toHaveBeenCalled();
    const end = new Event("transitionend", { bubbles: true });
    Object.defineProperty(end, "propertyName", { value: "--vision-lifetime" });
    fireEvent(outgoing, end);
    expect(screen.queryByText("Panel action")).toBeNull();
    expect(exited).toHaveBeenCalledOnce();
  });

  it("cancels a pending exit when reopened, including the fallback cleanup", () => {
    vi.useFakeTimers();
    const exited = vi.fn();
    const { rerender } = render(
      <MotionPresence present onExitComplete={exited}>
        Panel
      </MotionPresence>,
    );
    rerender(
      <MotionPresence present={false} onExitComplete={exited}>
        Panel
      </MotionPresence>,
    );
    act(() => vi.advanceTimersByTime(100));
    rerender(
      <MotionPresence present onExitComplete={exited}>
        Panel
      </MotionPresence>,
    );
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("Panel")).not.toHaveAttribute("inert");
    expect(exited).not.toHaveBeenCalled();
  });

  it("keeps the last visible content when its parent clears the selection", () => {
    vi.useFakeTimers();
    const { rerender } = render(<MotionPresence present>Station details</MotionPresence>);
    rerender(<MotionPresence present={false}>{null}</MotionPresence>);
    expect(screen.getByText("Station details")).toHaveAttribute("aria-hidden", "true");
    act(() => vi.advanceTimersByTime(450));
    expect(screen.queryByText("Station details")).toBeNull();
  });

  it("finishes without waiting for a transition when reduced motion is enabled", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const exited = vi.fn();
    const { rerender } = render(
      <MotionPresence present onExitComplete={exited}>
        Panel
      </MotionPresence>,
    );
    rerender(
      <MotionPresence present={false} onExitComplete={exited}>
        Panel
      </MotionPresence>,
    );
    await waitFor(() => expect(screen.queryByText("Panel")).toBeNull());
    expect(exited).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
