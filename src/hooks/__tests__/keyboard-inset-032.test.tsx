import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readKeyboardInset, useVisualViewport } from "../use-anchored-panel";

/**
 * A zoomed page keeps the keyboard inset at 0 (docs/text-size-harmonization.md §10.2):
 * a pinch-zoom shrinks `visualViewport.height` exactly like a keyboard, and following it
 * would drag a pinned row on every pan — and gave PickerSheet the zoomed region's height
 * at the page's full width, its close button off screen.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

function visualViewport({ height, offsetTop = 0, scale = 1 }: { height: number; offsetTop?: number; scale?: number }) {
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("visualViewport", {
    height,
    offsetTop,
    scale,
    addEventListener() {},
    removeEventListener() {},
  });
}

describe("readKeyboardInset", () => {
  it("reads the keyboard's height at rest", () => {
    visualViewport({ height: 500 });
    expect(readKeyboardInset()).toBe(300);
  });

  it("answers 0 while the page is zoomed, whatever the visual viewport says", () => {
    visualViewport({ height: 400, scale: 2 });
    expect(readKeyboardInset()).toBe(0);
  });

  it("answers 0 below the 100 px floor, and takes another floor", () => {
    visualViewport({ height: 740 });
    expect(readKeyboardInset()).toBe(0);
    expect(readKeyboardInset({ minimum: 50 })).toBe(60);
  });

  it("answers 0 without visualViewport", () => {
    vi.stubGlobal("visualViewport", undefined);
    expect(readKeyboardInset()).toBe(0);
  });
});

describe("useVisualViewport (PickerSheet)", () => {
  it("corrects for a keyboard", () => {
    visualViewport({ height: 500, offsetTop: 10 });
    const { result } = renderHook(() => useVisualViewport(true));
    expect(result.current).toEqual({ top: 10, height: 500 });
  });

  it("keeps the static box on a zoomed page (the same guard)", () => {
    visualViewport({ height: 400, offsetTop: 120, scale: 2 });
    const { result } = renderHook(() => useVisualViewport(true));
    expect(result.current).toBeNull();
  });
});
