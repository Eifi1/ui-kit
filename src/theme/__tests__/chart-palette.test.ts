import { CHART_COLORS, HEATMAP_HEX, PALETTE_HEX, lerpHex, paletteFor, textOn } from "../chart-palette";

/**
 * Characterisation suite for the chart colour system (refactor plan 2026-08-24,
 * U-1b/U-13).
 */

describe("paletteFor", () => {
  it("returns a theme-aware CSS var and wraps at the palette size", () => {
    expect(paletteFor(0)).toBe("var(--chart-1)");
    expect(paletteFor(8)).toBe("var(--chart-9)");
    expect(paletteFor(9)).toBe("var(--chart-1)"); // wraps
    expect(paletteFor(17)).toBe("var(--chart-9)");
  });

  it("keeps the money colours semantic", () => {
    expect(CHART_COLORS.income).toBe("var(--money-income)");
    expect(CHART_COLORS.expense).toBe("var(--money-expense)");
    expect(CHART_COLORS.activity).toBe(CHART_COLORS.expense);
  });
});

describe("lerpHex", () => {
  it("interpolates between two stops and clamps t", () => {
    expect(lerpHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(lerpHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(lerpHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(lerpHex("#000000", "#ffffff", -5)).toBe("#000000");
    expect(lerpHex("#000000", "#ffffff", 5)).toBe("#ffffff");
  });

  it("accepts the three-digit shorthand", () => {
    expect(lerpHex("#000", "#fff", 1)).toBe("#ffffff");
  });

  it("never emits a malformed colour, whatever it is handed (U-13)", () => {
    // parseHex did no validation, so a non-hex stop produced NaN components and
    // lerpHex returned the literal string "#nannannan" — which paints as nothing.
    for (const bad of ["rgba(148,163,184,0.14)", "", "not-a-colour", "#12", "currentColor"]) {
      expect(lerpHex(bad, "#ffffff", 0.5)).toMatch(/^#[0-9a-f]{6}$/);
      expect(lerpHex("#000000", bad, 0.5)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("textOn", () => {
  it("flips the label colour by perceived luminance", () => {
    expect(textOn("#ffffff")).toBe("#1a1a1a"); // dark text on a light fill
    expect(textOn("#000000")).toBe("#f8fafc"); // light text on a dark fill
    expect(textOn(HEATMAP_HEX.light.seqLow)).toBe("#1a1a1a");
    expect(textOn(HEATMAP_HEX.dark.seqHigh)).toBe("#1a1a1a"); // amber-400 is bright
    expect(textOn(HEATMAP_HEX.light.under)).toBe("#f8fafc"); // teal-700 is dark
  });

  it("does not answer 'light text' for a fill it could not read (U-13)", () => {
    // `HEATMAP_HEX.*.empty` is an rgba() string, and it IS passed here: the variance
    // heatmap renders a figure on an `empty` cell whenever a category has zero
    // assigned and POSITIVE activity — an ordinary refund. parseHex returned NaNs,
    // `NaN > 0.6` is false, so the label came back near-white… on a near-white cell.
    // `currentColor` is the answer: inherit whatever the surrounding text already
    // uses, which is correct on both themes by construction. A constant could not be.
    for (const stop of [HEATMAP_HEX.light.empty, HEATMAP_HEX.dark.empty]) {
      expect(textOn(stop)).toBe("currentColor");
    }
    for (const bad of ["", "not-a-colour", "#12", "#1234567"]) {
      expect(textOn(bad)).toBe("currentColor");
    }
  });
});

describe("the exported stop data", () => {
  it("carries nine CVD-safe categorical stops per theme", () => {
    expect(PALETTE_HEX.light).toHaveLength(9);
    expect(PALETTE_HEX.dark).toHaveLength(9);
    for (const hex of [...PALETTE_HEX.light, ...PALETTE_HEX.dark]) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
