import { afterEach, describe, expect, it, vi } from "vitest";
import { anchoredInline, viewportSize } from "../use-anchored-panel";

/**
 * Round 0.34 Wave 2, DUP-7: the horizontal half of anchored placement, once. Popover,
 * DropdownPanel, ComboboxPanel, HoverMenu and the AppShell flyout each wrote their own,
 * against three different widths of the viewport — and only Tooltip had learned
 * (keksdose live #381) that `innerWidth` is the wrong one on a phone.
 */

const TRIGGER = { left: 100, right: 200 };

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document.documentElement, "clientWidth");
});

describe("anchoredInline", () => {
  const at = (rect: { left: number; right: number }, width: number, opts: Parameters<typeof anchoredInline>[2]) =>
    anchoredInline(rect, width, { viewportWidth: 1000, ...opts }).left;

  it("lines the panel's start or end edge up with the trigger's, by reading direction", () => {
    expect(at(TRIGGER, 150, { align: "start" })).toBe(100);
    expect(at(TRIGGER, 150, { align: "end" })).toBe(50);
    expect(at(TRIGGER, 150, { align: "start", dir: "rtl" })).toBe(50);
    expect(at(TRIGGER, 150, { align: "end", dir: "rtl" })).toBe(100);
    // Physical edges ignore the direction.
    expect(at(TRIGGER, 150, { align: "left", dir: "rtl" })).toBe(100);
    expect(at(TRIGGER, 150, { align: "right" })).toBe(50);
  });

  it("puts a flyout beside the trigger's end edge", () => {
    expect(at({ left: 100, right: 300 }, 150, { align: "after" })).toBe(300);
    expect(at({ left: 700, right: 900 }, 150, { align: "after", dir: "rtl" })).toBe(550);
  });

  it("clamps at the end edge of the glass", () => {
    expect(at({ left: 900, right: 990 }, 150, { align: "start" })).toBe(1000 - 8 - 150);
    expect(at({ left: 900, right: 990 }, 150, { align: "end", dir: "rtl" })).toBe(842);
  });

  it("clamps at the start edge of the glass", () => {
    expect(at({ left: 10, right: 100 }, 150, { align: "end" })).toBe(8);
    expect(at({ left: 10, right: 100 }, 150, { align: "start", dir: "rtl" })).toBe(8);
  });

  it("keeps the panel's START on the glass when it is wider than the room", () => {
    expect(at(TRIGGER, 990, { align: "start" })).toBe(8);
    expect(at(TRIGGER, 990, { align: "start", dir: "rtl" })).toBe(1000 - 8 - 990);
  });

  it("takes another edge gap", () => {
    expect(at({ left: 0, right: 10 }, 100, { align: "start", edge: 16 })).toBe(16);
  });

  it("gives the CSS `right` of the same box, for a panel hung from its right edge", () => {
    expect(anchoredInline(TRIGGER, 150, { viewportWidth: 1000, dir: "rtl", align: "start" })).toEqual({
      left: 50,
      right: 1000 - 50 - 150,
    });
  });

  it("measures against the glass, not the grown layout viewport (live #381)", () => {
    // A phone whose page something has widened: the layout viewport is 430, the screen 400.
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(430);
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 400 });
    expect(anchoredInline({ left: 300, right: 420 }, 200, { align: "start" }).left).toBe(400 - 8 - 200);
  });
});

describe("viewportSize", () => {
  it("is the root's client width — the glass — where there is a layout", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(430);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 400 });
    expect(viewportSize()).toEqual({ width: 400, height: 800 });
  });

  it("falls back to the window where nothing is laid out (jsdom)", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(768);
    expect(viewportSize()).toEqual({ width: 1024, height: 768 });
  });
});
