import { describe, expect, it } from "vitest";

import {
  PINCH_MIN_SHARE,
  PINCH_MIN_SPREAD,
  clampWindow,
  extentOf,
  isWholeRange,
  panWindow,
  pinchWindow,
  pinchZoomed,
} from "../zoom-window";

/** A sweep of 0…1000 on a plot 500 px wide: 2 units a pixel, unzoomed. */
const WHOLE = [0, 1000] as const;
const WIDTH = 500;

describe("clampWindow / panWindow", () => {
  it("leaves a window inside the range where it is", () => {
    expect(clampWindow([200, 400], WHOLE)).toEqual([200, 400]);
  });

  it("moves a window back in from the edge it crossed, keeping its width", () => {
    expect(clampWindow([-50, 150], WHOLE)).toEqual([0, 200]);
    expect(clampWindow([900, 1100], WHOLE)).toEqual([800, 1000]);
  });

  it("is the whole range for a window wider than it", () => {
    expect(clampWindow([-100, 1200], WHOLE)).toEqual([0, 1000]);
  });

  it("says nothing about a range with no width", () => {
    expect(clampWindow([5, 9], [3, 3])).toEqual([5, 9]);
  });

  it("pans by a value and stops at the edge instead of narrowing", () => {
    expect(panWindow([200, 400], 100, WHOLE)).toEqual([300, 500]);
    expect(panWindow([200, 400], -500, WHOLE)).toEqual([0, 200]);
    expect(panWindow([700, 900], 500, WHOLE)).toEqual([800, 1000]);
  });
});

describe("isWholeRange", () => {
  it("is true for the range itself and anything covering it, a rounding error short included", () => {
    expect(isWholeRange([0, 1000], WHOLE)).toBe(true);
    expect(isWholeRange([-1, 1001], WHOLE)).toBe(true);
    expect(isWholeRange([1e-10, 1000 - 1e-10], WHOLE)).toBe(true);
    expect(isWholeRange([0, 999], WHOLE)).toBe(false);
    expect(isWholeRange([1, 1000], WHOLE)).toBe(false);
  });
});

describe("pinchWindow", () => {
  const start = { window: [0, 1000] as const, a: 200, b: 300 };

  it("halves the window when the fingers spread twice as far, about their midpoint", () => {
    // Midpoint 250 px is the value 500; spread 100 → 200 px.
    expect(pinchWindow(start, 150, 350, WIDTH, WHOLE)).toEqual([250, 750]);
  });

  it("keeps the value under the midpoint under it as the midpoint moves: two fingers together pan", () => {
    const zoomed = { window: [400, 600] as const, a: 200, b: 300 };
    // 200 units over 500 px: the fingers move 50 px left, the window 20 units right.
    expect(pinchWindow(zoomed, 150, 250, WIDTH, WHOLE)).toEqual([420, 620]);
  });

  it("widens when the fingers close, and stops at the whole range", () => {
    const zoomed = { window: [400, 600] as const, a: 200, b: 300 };
    const wider = pinchWindow(zoomed, 225, 275, WIDTH, WHOLE);
    expect(wider[1] - wider[0]).toBeCloseTo(400);
    const all = pinchWindow({ window: [400, 600], a: 0, b: 500 }, 240, 260, WIDTH, WHOLE);
    expect(all).toEqual([0, 1000]);
  });

  it("stays inside the range, however far the fingers pan", () => {
    const zoomed = { window: [400, 600] as const, a: 200, b: 300 };
    expect(pinchWindow(zoomed, 1200, 1300, WIDTH, WHOLE)).toEqual([0, 200]);
    expect(pinchWindow(zoomed, -1300, -1200, WIDTH, WHOLE)).toEqual([800, 1000]);
  });

  it("narrows one gesture no further than its floor", () => {
    const narrow = pinchWindow({ window: [0, 1000], a: 249, b: 251 }, 0, 5000, WIDTH, WHOLE);
    expect(narrow[1] - narrow[0]).toBeCloseTo(1000 * PINCH_MIN_SHARE);
  });

  it("measures a spread from its floor, so fingers one above the other do not zoom to infinity", () => {
    // 0 px apart across, then 48: twice the floor, so half the window.
    const stacked = pinchWindow({ window: [0, 1000], a: 250, b: 250 }, 226, 274, WIDTH, WHOLE);
    expect(stacked[1] - stacked[0]).toBeCloseTo((1000 * PINCH_MIN_SPREAD) / 48);
  });

  it("returns to its first window when the fingers do", () => {
    const zoomed = { window: [400, 600] as const, a: 200, b: 300 };
    pinchWindow(zoomed, 100, 400, WIDTH, WHOLE);
    expect(pinchWindow(zoomed, 200, 300, WIDTH, WHOLE)).toEqual([400, 600]);
  });

  it("does nothing on a plot or a window with no width", () => {
    expect(pinchWindow(start, 150, 350, 0, WHOLE)).toEqual([0, 1000]);
    expect(pinchWindow({ window: [5, 5], a: 0, b: 100 }, 0, 200, WIDTH, WHOLE)).toEqual([5, 5]);
  });
});

describe("pinchZoomed", () => {
  it("tells a zoom from a pan by the change in width, 2 % either way", () => {
    expect(pinchZoomed([0, 1000], [250, 750])).toBe(true);
    expect(pinchZoomed([400, 600], [420, 620])).toBe(false);
    expect(pinchZoomed([400, 600], [400, 603])).toBe(false);
    expect(pinchZoomed([400, 600], [400, 605])).toBe(true);
  });
});

describe("extentOf", () => {
  it("is the lowest and highest finite number under the key", () => {
    expect(extentOf([{ x: 3 }, { x: -1 }, { x: "7" }, { x: NaN }, { x: 9 }, {}], "x")).toEqual([-1, 9]);
    expect(extentOf([{ x: "a" }], "x")).toBeUndefined();
    expect(extentOf([], "x")).toBeUndefined();
  });
});
