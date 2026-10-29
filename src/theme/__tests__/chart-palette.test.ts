import {
  CHART_COLORS,
  CHART_INK_HEX,
  CHART_MUTED_HEX,
  CHART_ROLES,
  CVD_ORDER,
  EDGE_MIN_CONTRAST,
  HEATMAP_HEX,
  PALETTE_HEX,
  PALETTE_SIZE,
  chartEdge,
  lerpHex,
  paletteFor,
  textOn,
} from "../chart-palette";
import { contrast } from "../color";
import { DEFAULT_PRESET, PALETTES, PAUL_TOL_PRESET, presetById } from "../palette-presets";

/**
 * Characterisation suite for the chart colour system (refactor plan 2026-08-24,
 * U-1b/U-13).
 */

describe("paletteFor", () => {
  it("returns a theme-aware CSS var and wraps at the palette size (8, 0.49)", () => {
    expect(PALETTE_SIZE).toBe(8);
    expect(paletteFor(0)).toBe("var(--chart-1)"); // the first series is always slot 0
    expect(paletteFor(7)).toBe("var(--chart-8)");
    expect(paletteFor(8)).toBe("var(--chart-1)"); // wraps after eight, not nine
    expect(paletteFor(15)).toBe("var(--chart-8)");
    expect(paletteFor(16)).toBe("var(--chart-1)");
  });

  it("wraps negative indices too, and never names a token that does not exist", () => {
    // `-1 % 9` is -1 in JS, so this returned `var(--chart-0)` — no such token, and a
    // series painted with it had no stroke at all.
    expect(paletteFor(-1)).toBe("var(--chart-8)");
    expect(paletteFor(-8)).toBe("var(--chart-1)");
    expect(paletteFor(-9)).toBe("var(--chart-8)");
    expect(paletteFor(2.7)).toBe("var(--chart-3)");
    for (const bad of [NaN, Infinity, -Infinity]) expect(paletteFor(bad)).toBe("var(--chart-1)");
    for (let i = -30; i <= 30; i++) expect(paletteFor(i)).toMatch(/^var\(--chart-[1-8]\)$/);
  });

  it("offers anyplot's CVD-optimal slot order as an option, not as the default", () => {
    expect(CVD_ORDER).toEqual([0, 1, 7, 6, 4, 5, 2, 3]);
    expect(paletteFor(0, { order: "cvd" })).toBe("var(--chart-1)");
    expect(paletteFor(2, { order: "cvd" })).toBe("var(--chart-8)"); // lime third
    expect(paletteFor(7, { order: "cvd" })).toBe("var(--chart-4)");
    expect(paletteFor(8, { order: "cvd" })).toBe("var(--chart-1)");
    expect(paletteFor(-1, { order: "cvd" })).toBe("var(--chart-4)");
    expect(paletteFor(2)).toBe("var(--chart-3)");
  });

  it("keeps the money colours semantic", () => {
    // Marcel, 2026-10-22: chart money stays on the kit's money tokens, never anyplot's
    // green/red — only a generic total takes the neutral ink.
    expect(CHART_COLORS.income).toBe("var(--money-income)");
    expect(CHART_COLORS.expense).toBe("var(--money-expense)");
    expect(CHART_COLORS.net).toBe("var(--money-net)");
    expect(CHART_COLORS.neutral).toBe("var(--money-neutral)");
    expect(CHART_COLORS.activity).toBe(CHART_COLORS.expense);
    expect(CHART_COLORS.total).toBe("var(--chart-ink)");
  });

  it("names the roles: other/rest/disabled and bands in muted ink, totals/baseline/outline in ink", () => {
    for (const role of ["other", "rest", "disabled", "band"] as const)
      expect(CHART_ROLES[role]).toBe("var(--chart-muted)");
    for (const role of ["total", "baseline", "outline"] as const) expect(CHART_ROLES[role]).toBe("var(--chart-ink)");
    expect(CHART_INK_HEX).toEqual({ light: "#1a1a17", dark: "#f0efe8" });
    expect(CHART_MUTED_HEX).toEqual({ light: "#6b6a63", dark: "#a8a79f" });
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
    expect(textOn(HEATMAP_HEX.light.neutral)).toBe("#1a1a1a"); // the cream midpoint
    expect(textOn(HEATMAP_HEX.dark.neutral)).toBe("#f8fafc"); // the ink midpoint
    expect(textOn(HEATMAP_HEX.light.over)).toBe("#f8fafc"); // matte red is dark
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
  it("carries anyplot's eight hues in slot order, the same in both themes (0.49)", () => {
    const ANYPLOT = ["#009e73", "#c475fd", "#4467a3", "#bd8233", "#ae3030", "#2abccd", "#954477", "#99b314"];
    expect(PALETTE_HEX.light).toEqual(ANYPLOT);
    // Dark mode does not lift red and rose any more: a low-contrast hue gets an ink
    // edge (chartEdge) instead, the way anyplot does it.
    expect(PALETTE_HEX.dark).toEqual(ANYPLOT);
    // Amber is anyplot's semantic warning anchor, not a categorical slot.
    expect(PALETTE_HEX.light).not.toContain("#ddcc77");
  });

  it("sequential runs green → blue; diverging runs red ↔ paper/ink ↔ blue", () => {
    for (const mode of ["light", "dark"] as const) {
      expect(HEATMAP_HEX[mode].seqLow).toBe("#009e73");
      expect(HEATMAP_HEX[mode].seqHigh).toBe("#4467a3");
      expect(HEATMAP_HEX[mode].under).toBe("#4467a3");
      expect(HEATMAP_HEX[mode].over).toBe("#ae3030");
    }
    expect(HEATMAP_HEX.light.neutral).toBe("#faf8f1");
    expect(HEATMAP_HEX.dark.neutral).toBe("#1a1a17");
    // 0 sits at the midpoint: the two halves of a diverging scale meet on the neutral.
    expect(lerpHex(HEATMAP_HEX.light.neutral, HEATMAP_HEX.light.over, 0)).toBe("#faf8f1");
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

describe("the default preset (0.49)", () => {
  it("is Imprint; Paul Tol muted stays selectable", () => {
    expect(DEFAULT_PRESET.name).toBe("Imprint");
    expect(DEFAULT_PRESET.light.chart).toHaveLength(PALETTE_SIZE);
    expect(PALETTES[0]).toBe(DEFAULT_PRESET);
    expect(PALETTES).toContain(PAUL_TOL_PRESET);
    expect(presetById("paul-tol")).toBe(PAUL_TOL_PRESET);
    expect(PAUL_TOL_PRESET.light.chart[0]).toBe("#332288");
    // The id an app persisted for the old Imprint choice lands on the new default.
    expect(presetById("imprint")).toBe(DEFAULT_PRESET);
  });

  it("keeps the money tokens, not anyplot's green and red", () => {
    expect(DEFAULT_PRESET.light.moneyIncome).toBe(PAUL_TOL_PRESET.light.moneyIncome);
    expect(DEFAULT_PRESET.light.moneyExpense).toBe(PAUL_TOL_PRESET.light.moneyExpense);
  });
});

describe("chartEdge — the WCAG 1.4.11 ink edge", () => {
  const LIGHT = ["#ede3cf", "#f6ecd9"];
  const DARK = ["#0e0f1c", "#181a2c"];

  it("edges exactly the hues under 3:1 against the surface, and no others", () => {
    expect(EDGE_MIN_CONTRAST).toBe(3);
    for (const [surfaces, mode] of [
      [LIGHT, "light"],
      [DARK, "dark"],
    ] as const) {
      for (const hex of PALETTE_HEX[mode]) {
        const worst = Math.min(...surfaces.map((s) => contrast(hex, s)));
        expect(chartEdge(hex, surfaces), `${mode} ${hex} at ${worst.toFixed(2)}:1`).toBe(
          worst < 3 ? "var(--chart-ink)" : undefined,
        );
      }
    }
  });

  it("strokes cyan and lime on cream but leaves blue and red bare", () => {
    expect(chartEdge("#2abccd", LIGHT)).toBe("var(--chart-ink)");
    expect(chartEdge("#99b314", LIGHT)).toBe("var(--chart-ink)");
    expect(chartEdge("#ddcc77", LIGHT)).toBe("var(--chart-ink)"); // amber, the anchor
    expect(chartEdge("#4467a3", LIGHT)).toBeUndefined();
    expect(chartEdge("#ae3030", LIGHT)).toBeUndefined();
    // On the dark ground it is the other way round for red and rose.
    expect(chartEdge("#ae3030", DARK)).toBe("var(--chart-ink)");
    expect(chartEdge("#954477", DARK)).toBe("var(--chart-ink)");
    expect(chartEdge("#2abccd", DARK)).toBeUndefined();
  });

  it("draws nothing for a colour it cannot measure", () => {
    expect(chartEdge("var(--chart-1)", LIGHT)).toBeUndefined();
    expect(chartEdge("#2abccd", [])).toBeUndefined();
    expect(chartEdge("#2abccd", ["not-a-colour"])).toBeUndefined();
  });

  it("keeps the ink and the muted ink legible against every default surface", () => {
    for (const s of LIGHT) {
      expect(contrast(CHART_INK_HEX.light, s)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(CHART_MUTED_HEX.light, s)).toBeGreaterThanOrEqual(3);
    }
    for (const s of DARK) {
      expect(contrast(CHART_INK_HEX.dark, s)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(CHART_MUTED_HEX.dark, s)).toBeGreaterThanOrEqual(3);
    }
  });
});
