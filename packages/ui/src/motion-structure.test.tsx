import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { MotionPresence } from "./motion";
import { Text } from "./text";
import { ToggleButton } from "./toggle-button";
import { Vibrancy } from "./vibrancy";

const css = readFileSync(join(process.cwd(), "src/motion.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** The selector of the first rule whose declarations contain `marker`. */
function selectorOf(marker: RegExp, selectorHas = "") {
  const rules = css.split("}");
  for (const rule of rules) {
    const [selector, body] = rule.split("{").slice(-2);
    if (body && marker.test(body) && selector.includes(selectorHas)) return selector.trim();
  }
  throw new Error(`no rule for ${marker}`);
}

/** Splits a selector list on top-level commas and drops pseudo-element parts. */
function matchable(list: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === "(") depth++;
    else if (list[i] === ")") depth--;
    else if (list[i] === "," && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((p) => p.trim()).filter((p) => !p.includes("::"));
}

const fade = matchable(
  selectorOf(/opacity: calc\(var\(--vision-presence\) \* var\(--vision-arrival\)\);\s*transition: opacity/),
);
const fades = (element: Element) => fade.some((s) => element.matches(s));
const press = matchable(selectorOf(/^\s*scale: 0\.96;\s*$/, ":active"));
const presses = (element: Element) => press.some((s) => element.matches(s));

/** Fails if a faded element contains blended paint, or nests another fade. */
function expectLeafFades(root: Element) {
  const faded = [...root.querySelectorAll("*")].filter(fades);
  for (const element of faded) {
    expect(element.querySelector(".vision-vibrancy, [data-vision-layer]"), element.outerHTML).toBeNull();
    expect(faded.some((other) => other !== element && other.contains(element)), element.outerHTML).toBe(false);
  }
  return faded;
}

describe("motion.css fades only leaves (vibrancy keeps its blend)", () => {
  it("fades the paints of secondary text, not the element that holds them", () => {
    const { container } = render(
      <MotionPresence present>
        <Text tone="secondary">Open in a new window</Text>
        <Text>Primary</Text>
      </MotionPresence>,
    );
    const faded = expectLeafFades(container);
    const secondary = container.querySelector("[data-text-style] .vision-vibrancy")!.parentElement!;
    expect(fades(secondary)).toBe(false);
    expect(fades(secondary.querySelector(".vision-vibrancy-ink")!)).toBe(true);
    expect(faded).toContain(container.querySelectorAll("[data-text-style]")[1]);
  });

  it("never fades an ink container that holds a vibrant subtitle", () => {
    const { container } = render(
      <MotionPresence present>
        <span className="menu-item-main">
          <span>Open</span>
          <Text as="span" variant="footnote" tone="secondary">
            Open in a new window
          </Text>
        </span>
      </MotionPresence>,
    );
    expectLeafFades(container);
    expect(fades(container.querySelector(".menu-item-main")!)).toBe(false);
    expect(fades(container.querySelector(".vision-vibrancy-ink")!)).toBe(true);
  });

  it("never fades a toolbar toggle's content wrapper, which holds a Vibrancy", () => {
    const { container } = render(
      <MotionPresence present>
        <ToggleButton appearance="toolbar">Layers</ToggleButton>
        <Button>
          <svg data-testid="icon" />
          Measure
        </Button>
      </MotionPresence>,
    );
    expectLeafFades(container);
    const [toolbar, button] = container.querySelectorAll("[data-vision-content]");
    expect(fades(toolbar)).toBe(false);
    expect(fades(toolbar.querySelector(".vision-vibrancy-ink")!)).toBe(true);
    // Plain content still fades as one element, with its symbol inside it.
    expect(fades(button)).toBe(true);
    expect(fades(container.querySelector("[data-testid=icon]")!)).toBe(false);
  });

  it("presses the ink of a vibrant toggle, not its wrapper", () => {
    const { container } = render(
      <ToggleButton appearance="toolbar">Layers</ToggleButton>,
    );
    // jsdom can't be :active; check the selector with the state forced in.
    const forced = press.map((s) => s.replaceAll(":active", ""));
    const content = container.querySelector("[data-vision-content]")!;
    expect(forced.some((s) => content.matches(s))).toBe(false);
    expect(forced.some((s) => content.querySelector(".vision-vibrancy-ink")!.matches(s))).toBe(true);
    expect(presses(content)).toBe(false);
  });

  it("fades loose vibrant symbols through their paints", () => {
    const { container } = render(
      <MotionPresence present>
        <Vibrancy>
          <svg />
        </Vibrancy>
      </MotionPresence>,
    );
    expectLeafFades(container);
    expect(fades(container.querySelector(".vision-vibrancy-ink")!)).toBe(true);
    expect(fades(container.querySelector(".vision-vibrancy-wash")!)).toBe(true);
  });
});

/** Declarations of every rule (optionally inside `@starting-style`) for `selector`. */
function declarationsFor(selector: string, starting = false) {
  const found: string[] = [];
  const pattern = /@starting-style\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g;
  const source = starting
    ? [...css.matchAll(pattern)].map((match) => match[1]).join("\n")
    : css.replace(pattern, "");
  for (const rule of source.split("}")) {
    const [head, body] = rule.split("{").slice(-2);
    if (body && head.split(",").some((part) => part.replace(/\s+/g, " ").trim() === selector)) found.push(body);
  }
  return found.join(";");
}

describe("motion.css entry and exit clocks", () => {
  it("fades the window glass in on open, not only its scale", () => {
    // The shared starting rule is :where() (specificity 0) and loses to
    // `.vision-layer { opacity }`, so the window needs its own starting opacity.
    const start = declarationsFor('.vision-window-motion [data-slot="window"] > .vision-layer', true);
    expect(start).toMatch(/opacity:\s*0\b/);
    expect(start).toMatch(/scale:\s*\.96/);
  });

  it("fades the dialog backdrop out on the exit clock, so it isn't removed mid-fade", () => {
    const ending = declarationsFor(".vision-motion-backdrop[data-ending-style]");
    expect(ending).toMatch(/transition-duration:\s*var\(--motion-exit\)/);
  });
});
