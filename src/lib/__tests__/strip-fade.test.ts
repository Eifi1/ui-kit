import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollFocusIntoStrip, scrollIntoStrip, stripFadeMask, useStripFade } from "../strip-fade";

/**
 * The strip fade's own pieces (0.25): the mask as a string — jsdom's style parser drops
 * a gradient with a `calc()` stop, so a component test can only read the start side's —
 * the scrollbars kept out of it, and focus brought clear of it.
 */

afterEach(() => vi.restoreAllMocks());

const NONE = { left: 0, right: 0, bottom: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 };

describe("stripFadeMask", () => {
  it("is undefined while nothing is hidden", () => {
    expect(stripFadeMask({ left: false, right: false })).toBeUndefined();
  });

  it("without scrollbars, is the mask Tabs and AppShell have always drawn", () => {
    expect(stripFadeMask({ left: false, right: true })).toBe(
      "linear-gradient(to right, #000, #000 calc(100% - 24px), transparent)",
    );
    expect(stripFadeMask({ left: true, right: false })).toBe("linear-gradient(to right, transparent, #000 24px, #000)");
    expect(stripFadeMask({ left: true, right: true }, NONE)).toBe(
      "linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent)",
    );
  });

  it("keeps a vertical scrollbar on the faded right side whole and fades inside it", () => {
    expect(stripFadeMask({ left: false, right: true }, { ...NONE, right: 15 })).toBe(
      "linear-gradient(to right, #000, #000 calc(100% - 39px), transparent calc(100% - 15px), #000 calc(100% - 15px))",
    );
    // A border outside the scrollbar fades with the edge, as the frame does elsewhere.
    expect(stripFadeMask({ left: false, right: true }, { ...NONE, right: 15, borderRight: 1 })).toBe(
      "linear-gradient(to right, #000, #000 calc(100% - 40px), transparent calc(100% - 16px), #000 calc(100% - 16px), #000 calc(100% - 1px), transparent calc(100% - 1px))",
    );
  });

  it("keeps an RTL scrollbar on the left whole", () => {
    expect(stripFadeMask({ left: true, right: false }, { ...NONE, left: 15 })).toBe(
      "linear-gradient(to right, #000 0px, #000 15px, transparent 15px, #000 39px, #000)",
    );
  });

  it("a scrollbar on the side that does not fade changes nothing there", () => {
    expect(stripFadeMask({ left: true, right: false }, { ...NONE, right: 15 })).toBe(
      "linear-gradient(to right, transparent, #000 24px, #000)",
    );
  });

  it("adds an opaque layer over the horizontal scrollbar", () => {
    expect(stripFadeMask({ left: false, right: true }, { ...NONE, bottom: 10, borderBottom: 1 })).toBe(
      "linear-gradient(to right, #000, #000 calc(100% - 24px), transparent), linear-gradient(to top, transparent 1px, #000 1px, #000 11px, transparent 11px)",
    );
  });
});

describe("useStripFade", () => {
  // jsdom lays nothing out: every box is given its numbers by hand.
  function strip(geometry: Record<string, number>, style: Partial<CSSStyleDeclaration> = {}) {
    const el = document.createElement("div");
    for (const [key, value] of Object.entries(geometry)) Object.defineProperty(el, key, { configurable: true, value });
    Object.assign(el.style, style);
    document.body.append(el);
    return el;
  }

  it("spares the scrollbars only when asked", () => {
    const el = strip({ scrollWidth: 600, clientWidth: 285, offsetWidth: 300, clientHeight: 185, offsetHeight: 200, clientLeft: 0 });
    const ref = { current: el };
    const plain = renderHook(() => useStripFade(ref));
    expect(plain.result.current).toEqual({
      mask: "linear-gradient(to right, #000, #000 calc(100% - 24px), transparent)",
      overflow: "end",
    });
    const spared = renderHook(() => useStripFade(ref, { spareScrollbars: true }));
    expect(spared.result.current.mask).toBe(
      "linear-gradient(to right, #000, #000 calc(100% - 39px), transparent calc(100% - 15px), #000 calc(100% - 15px)), linear-gradient(to top, #000 0px, #000 15px, transparent 15px)",
    );
    el.remove();
  });

  it("finds an RTL scrollbar on the left by clientLeft", () => {
    const el = strip(
      { scrollWidth: 600, clientWidth: 285, offsetWidth: 300, clientHeight: 200, offsetHeight: 200, clientLeft: 15 },
      { direction: "rtl" },
    );
    const { result } = renderHook(() => useStripFade({ current: el }, { spareScrollbars: true }));
    // RTL at its start: the hidden columns are on the LEFT, where the scrollbar is.
    expect(result.current.overflow).toBe("end");
    expect(result.current.mask).toBe("linear-gradient(to right, #000 0px, #000 15px, transparent 15px, #000 39px, #000)");
    el.remove();
  });

  it("takes sub-pixel rounding for no scrollbar", () => {
    const el = strip({ scrollWidth: 600, clientWidth: 299, offsetWidth: 300, clientHeight: 199, offsetHeight: 200, clientLeft: 0 });
    const { result } = renderHook(() => useStripFade({ current: el }, { spareScrollbars: true }));
    expect(result.current.mask).toBe("linear-gradient(to right, #000, #000 calc(100% - 24px), transparent)");
    el.remove();
  });
});

describe("scrolling clear of the fade", () => {
  function box(rect: { left: number; right: number }, geometry: Record<string, number> = {}) {
    const el = document.createElement("div");
    for (const [key, value] of Object.entries(geometry)) Object.defineProperty(el, key, { configurable: true, value });
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ ...rect, width: rect.right - rect.left } as DOMRect);
    return el;
  }

  it("measures from the strip's content edge, inside a scrollbar on the left", () => {
    // A 300px box whose first 15px are an RTL scrollbar: the content starts at 15.
    const strip = box({ left: 0, right: 300 }, { scrollWidth: 600, clientWidth: 285, clientLeft: 15 });
    strip.scrollBy = vi.fn() as unknown as typeof strip.scrollBy;
    const item = box({ left: 20, right: 80 });
    scrollIntoStrip(strip, item);
    // 15 + 24 = 39 is the first clear pixel; the item starts at 20.
    expect(strip.scrollBy).toHaveBeenCalledWith({ left: -19 });
  });

  it("brings a focused control's whole cell clear when the cell fits between the fades", () => {
    const strip = box({ left: 0, right: 300 }, { scrollWidth: 600, clientWidth: 300, clientLeft: 0 });
    strip.scrollBy = vi.fn() as unknown as typeof strip.scrollBy;
    const cell = document.createElement("td");
    const button = document.createElement("button");
    cell.append(button);
    strip.append(cell);
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({ left: 240, right: 340, width: 100 } as DOMRect);
    vi.spyOn(button, "getBoundingClientRect").mockReturnValue({ left: 250, right: 290, width: 40 } as DOMRect);
    scrollFocusIntoStrip(strip, button);
    expect(strip.scrollBy).toHaveBeenCalledWith({ left: 64 });
  });

  it("brings the control itself clear when its cell is wider than the room between the fades", () => {
    const strip = box({ left: 0, right: 300 }, { scrollWidth: 900, clientWidth: 300, clientLeft: 0 });
    strip.scrollBy = vi.fn() as unknown as typeof strip.scrollBy;
    const cell = document.createElement("td");
    const link = document.createElement("a");
    cell.append(link);
    strip.append(cell);
    vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({ left: 100, right: 600, width: 500 } as DOMRect);
    vi.spyOn(link, "getBoundingClientRect").mockReturnValue({ left: 520, right: 580, width: 60 } as DOMRect);
    scrollFocusIntoStrip(strip, link);
    expect(strip.scrollBy).toHaveBeenCalledWith({ left: 304 });
  });

  it("does nothing for the strip itself or an element outside it", () => {
    const strip = box({ left: 0, right: 300 }, { scrollWidth: 600, clientWidth: 300, clientLeft: 0 });
    strip.scrollBy = vi.fn() as unknown as typeof strip.scrollBy;
    scrollFocusIntoStrip(strip, strip);
    scrollFocusIntoStrip(strip, document.createElement("button"));
    expect(strip.scrollBy).not.toHaveBeenCalled();
  });
});
