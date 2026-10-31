import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs } from "../tabs";
import { TAB_FADE_PX } from "../../lib/strip-fade";

/**
 * With `overflowCue`, the open tab ends clear of the fade INSIDE the cue gutters
 * (refactor audit 2026-10-30, DSP-16).
 *
 * The gutters exist only once the strip is measured as overflowing, a render after the
 * mount, and they take 24px off each end. The open tab was scrolled into view in the
 * mount's layout effect, before them, and not again — so on a deep link (keksdose's
 * eleven routed report tabs) or a reload on a late tab it ended 24px past the strip's
 * visible end, under the fade and the › cue.
 *
 * jsdom lays nothing out, so the geometry is modelled: ten 100px tabs in a 300px strip;
 * while the gutters are there (`px-[24px]` on the strip's box) the strip starts 24px in
 * and is 48px narrower. `scrollBy` moves the strip as a browser would.
 */
const TAB_PX = 100;
const STRIP_PX = 300;
const GUTTER_PX = 24;
const geo = { left: 0 };
const saved: [string, PropertyDescriptor | undefined][] = [];

const isStrip = (el: Element) => el.getAttribute("role") === "tablist";
const guttered = (strip: Element) => strip.parentElement?.classList.contains("px-[24px]") === true;
const stripLeft = (strip: Element) => (guttered(strip) ? GUTTER_PX : 0);
const stripWidth = (strip: Element) => (guttered(strip) ? STRIP_PX - 2 * GUTTER_PX : STRIP_PX);
const scrollWidth = (strip: Element) => strip.querySelectorAll('[role="tab"]').length * TAB_PX;
const rect = (left: number, width: number) =>
  ({ left, right: left + width, x: left, width, top: 0, bottom: 0, y: 0, height: 0 }) as DOMRect;

function stub(name: string, value: PropertyDescriptor) {
  saved.push([name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)]);
  Object.defineProperty(HTMLElement.prototype, name, { configurable: true, ...value });
}

beforeEach(() => {
  geo.left = 0;
  stub("scrollWidth", {
    get(this: HTMLElement) {
      return isStrip(this) ? scrollWidth(this) : 0;
    },
  });
  stub("clientWidth", {
    get(this: HTMLElement) {
      return isStrip(this) ? stripWidth(this) : 0;
    },
  });
  stub("scrollLeft", {
    get(this: HTMLElement) {
      return isStrip(this) ? geo.left : 0;
    },
  });
  stub("scrollBy", {
    value: vi.fn(function (this: HTMLElement, options: ScrollToOptions) {
      if (!isStrip(this)) return;
      const max = scrollWidth(this) - stripWidth(this);
      geo.left = Math.min(max, Math.max(0, geo.left + (options.left ?? 0)));
    }),
  });
  stub("getBoundingClientRect", {
    value(this: HTMLElement) {
      if (isStrip(this)) return rect(stripLeft(this), stripWidth(this));
      const strip = this.closest('[role="tablist"]');
      if (!strip || this.getAttribute("role") !== "tab") return rect(0, 0);
      const index = Array.from(strip.querySelectorAll('[role="tab"]')).indexOf(this);
      return rect(stripLeft(strip) + index * TAB_PX - geo.left, TAB_PX);
    },
  });
});

afterEach(() => {
  for (const [name, desc] of saved.splice(0)) {
    if (desc) Object.defineProperty(HTMLElement.prototype, name, desc);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name];
  }
});

const TABS = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, label: `Report ${i}` }));

/** How far the open tab's end sits from the strip's visible end, minus the fade: ≥ 0 is clear. */
function clearance() {
  const strip = screen.getByRole("tablist");
  const visibleEnd = strip.getBoundingClientRect().left + strip.clientWidth;
  const open = screen.getByRole("tab", { selected: true });
  return visibleEnd - TAB_FADE_PX - open.getBoundingClientRect().right;
}

describe("Tabs overflowCue: the open tab is clear of the cue gutters", () => {
  it("on mount on a late tab (a deep link, a reload)", () => {
    render(<Tabs tabs={TABS} active="t7" onChange={() => {}} overflowCue />);
    // The gutters are there, so the measurement this depends on has happened.
    expect(document.querySelector('[data-tabs-cue-gutter="end"]')).not.toBeNull();
    expect(clearance()).toBeGreaterThanOrEqual(0);
  });

  it("when the newly opened tab arrives with the overflow", () => {
    // Three tabs fit; five, with the fourth opened in the same render, do not.
    const { rerender } = render(<Tabs tabs={TABS.slice(0, 3)} active="t0" onChange={() => {}} overflowCue />);
    expect(document.querySelector("[data-tabs-cue-gutter]")).toBeNull();
    act(() => {
      rerender(<Tabs tabs={TABS.slice(0, 5)} active="t3" onChange={() => {}} overflowCue />);
    });
    expect(document.querySelector('[data-tabs-cue-gutter="end"]')).not.toBeNull();
    expect(clearance()).toBeGreaterThanOrEqual(0);
  });
});
