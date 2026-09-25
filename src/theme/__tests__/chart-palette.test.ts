import { CHART_COLORS, HEATMAP_HEX, PALETTE_HEX, lerpHex, paletteFor, textOn } from "../chart-palette";
import { contrast } from "../color";
import { DEFAULT_PRESET } from "../palette-presets";

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

  it("wraps negative indices too, and never names a token that does not exist", () => {
    // `-1 % 9` is -1 in JS, so this returned `var(--chart-0)` — no such token, and a
    // series painted with it had no stroke at all.
    expect(paletteFor(-1)).toBe("var(--chart-9)");
    expect(paletteFor(-9)).toBe("var(--chart-1)");
    expect(paletteFor(-10)).toBe("var(--chart-9)");
    expect(paletteFor(2.7)).toBe("var(--chart-3)");
    for (const bad of [NaN, Infinity, -Infinity]) expect(paletteFor(bad)).toBe("var(--chart-1)");
    for (let i = -30; i <= 30; i++) expect(paletteFor(i)).toMatch(/^var\(--chart-[1-9]\)$/);
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

  it("picks the ink that MEASURES better on every chart hue (audit 2026-09-22 §7)", () => {
    // Rec.601 luma > 0.6 is a brightness heuristic, not a contrast measure, and on this
    // palette it disagrees with the measurement on six of the eighteen hues — a third of
    // the ramp got the worse of the two inks. #44aa99 is the plainest: luma says "dark
    // enough for white text", while white measures 2.69:1 on it and near-black 6.18:1.
    // keksdose measured the same thing and forked textOn locally for its treemap.
    const INKS = ["#1a1a1a", "#f8fafc"];
    for (const theme of ["light", "dark"] as const) {
      PALETTE_HEX[theme].forEach((fill, i) => {
        const chosen = textOn(fill);
        const best = INKS.reduce((a, b) => (contrast(fill, a) >= contrast(fill, b) ? a : b));
        expect(
          contrast(fill, chosen),
          `${theme} chart-${i + 1} (${fill}): chose ${chosen} at ${contrast(fill, chosen).toFixed(2)}:1, ` +
            `${best} measures ${contrast(fill, best).toFixed(2)}:1`,
        ).toBeCloseTo(contrast(fill, best), 10);
      });
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

  /**
   * These constants are the JS-side copy of what `DEFAULT_PRESET` writes as CSS custom
   * properties: the heatmaps and the treemap interpolate in JS, and CSS vars cannot be
   * lerped, so the same colours have to exist twice. Nothing kept the two copies
   * together, and they drifted — five of the six light heat stops, including a
   * `neutral` still on Tailwind's slate-100, a cool grey sitting on the warm cream page
   * the default light theme has used since #328. A chart painted the drifted stop next
   * to a surface painted the token, in the same view.
   *
   * Resynced by hand rather than derived, because `chart-palette.ts` is the whole of the
   * `@eifi1/ui-kit/chart` subpath's colour layer and importing the preset bank into it
   * would pull every preset's token set into that chunk for two objects' worth of data.
   * This test is what replaces the import.
   */
  it("has not drifted from DEFAULT_PRESET", () => {
    expect(HEATMAP_HEX.light).toEqual(DEFAULT_PRESET.light.heat);
    expect(HEATMAP_HEX.dark).toEqual(DEFAULT_PRESET.dark.heat);
    expect(PALETTE_HEX.light).toEqual(DEFAULT_PRESET.light.chart);
    expect(PALETTE_HEX.dark).toEqual(DEFAULT_PRESET.dark.chart);
  });
});
