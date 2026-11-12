import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Collapse, MotionPresence, PopupContent } from "./motion";

afterEach(() => vi.useRealTimers());

function rect(x: number, y: number, width: number, height: number) {
  return { x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON() {} } as DOMRect;
}

describe("PopupContent", () => {
  it("clips the popup to its trigger's footprint once Base UI has positioned it", async () => {
    const view = render(
      <>
        <button id="trigger">Library</button>
        <div data-testid="positioner">
          <div data-testid="popup" aria-labelledby="trigger" data-starting-style="">
            <PopupContent>Items</PopupContent>
          </div>
        </div>
      </>,
    );
    const popup = view.getByTestId("popup");
    const trigger = view.getByRole("button");
    // Base UI positions after mount: the measurement must follow, not precede it.
    trigger.getBoundingClientRect = () => rect(100, 50, 120, 44);
    popup.getBoundingClientRect = () => rect(100, 102, 280, 400);
    view.getByTestId("positioner").style.setProperty("transform", "translate(100px, 102px)");
    await waitFor(() =>
      expect(popup.style.getPropertyValue("--popup-clip-right")).toBe("160px"),
    );
    expect(popup.style.getPropertyValue("--popup-clip-top")).toBe("0px");
    expect(popup.style.getPropertyValue("--popup-clip-left")).toBe("0px");
    expect(popup.style.getPropertyValue("--popup-clip-bottom")).toBe("356px");
    expect(popup.style.getPropertyValue("--popup-clip-radius")).toBe("22px");
  });

  it("re-measures when the popup starts closing, toward where the trigger is now", async () => {
    const view = render(
      <>
        <button id="trigger">Library</button>
        <div>
          <div data-testid="popup" aria-labelledby="trigger">
            <PopupContent>Items</PopupContent>
          </div>
        </div>
      </>,
    );
    const popup = view.getByTestId("popup");
    view.getByRole("button").getBoundingClientRect = () => rect(260, 50, 20, 44);
    popup.getBoundingClientRect = () => rect(100, 102, 280, 400);
    popup.setAttribute("data-ending-style", "");
    // Trigger near the popup's right edge: the footprint is clamped inside it.
    await waitFor(() =>
      expect(popup.style.getPropertyValue("--popup-clip-left")).toBe("160px"),
    );
    expect(popup.style.getPropertyValue("--popup-clip-right")).toBe("100px");
  });
});

describe("MotionPresence", () => {
  it("returns focus to the previous control when no explicit destination was supplied", () => {
    const trigger = document.createElement("button"); document.body.append(trigger); trigger.focus();
    const { rerender } = render(<MotionPresence present><button>Dismiss auto</button></MotionPresence>);
    screen.getByText("Dismiss auto").focus();
    rerender(<MotionPresence present={false}><button>Dismiss auto</button></MotionPresence>);
    expect(trigger).toHaveFocus(); trigger.remove();
  });
  it("restores focus before hiding a focused closing surface", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    const restoreFocus = { current: trigger };
    const { rerender } = render(<MotionPresence present restoreFocus={restoreFocus}><button>Dismiss</button></MotionPresence>);
    screen.getByText("Dismiss").focus();
    rerender(<MotionPresence present={false} restoreFocus={restoreFocus}><button>Dismiss</button></MotionPresence>);
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("does not steal focus when it already moved outside the closing surface", () => {
    const trigger = document.createElement("button");
    const other = document.createElement("button");
    document.body.append(trigger, other);
    const restoreFocus = { current: trigger };
    const { rerender } = render(<MotionPresence present restoreFocus={restoreFocus}>Notice</MotionPresence>);
    other.focus();
    rerender(<MotionPresence present={false} restoreFocus={restoreFocus}>Notice</MotionPresence>);
    expect(other).toHaveFocus();
    trigger.remove(); other.remove();
  });

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

describe("Collapse", () => {
  // React only gives `transitionend` a transition event: on run and cancel the
  // synthetic event has no propertyName, so the native event must be read.
  const transition = (type: string, propertyName: string) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, "propertyName", { value: propertyName });
    return event;
  };

  it("marks its height animation so an enclosing glass morph can stand down", () => {
    render(<Collapse open data-testid="panel">Details</Collapse>);
    const panel = screen.getByTestId("panel");
    fireEvent(panel, transition("transitionrun", "opacity"));
    expect(panel).not.toHaveAttribute("data-layout-animating");
    fireEvent(panel, transition("transitionrun", "height"));
    expect(panel).toHaveAttribute("data-layout-animating");
    fireEvent(panel, transition("transitionend", "height"));
    expect(panel).not.toHaveAttribute("data-layout-animating");
  });

  it("clears the mark when the height animation is cancelled", () => {
    render(<Collapse open data-testid="panel">Details</Collapse>);
    const panel = screen.getByTestId("panel");
    fireEvent(panel, transition("transitionrun", "height"));
    fireEvent(panel, transition("transitioncancel", "height"));
    expect(panel).not.toHaveAttribute("data-layout-animating");
  });
});
