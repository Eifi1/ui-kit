import { describe, expect, it } from "vitest";
import { PALETTES, applyTokenSet, type TokenSet } from "../palette-presets";

/**
 * Every field of a `TokenSet` has to reach the element.
 *
 * This is the guard that `TOKEN_VARS` pretended to be. That was a hand-maintained
 * list of the same 24 custom-property names `applyTokenSet` writes, introduced as
 * "also used to clear the overrides when returning to the default" — except nothing
 * cleared anything (`presetById` falls back to `DEFAULT_PRESET`, which is then
 * APPLIED), so its only consumer was `clearTokenSet`, which no consumer called. Two
 * copies of one list, neither compared with the other, and the only thing that could
 * have noticed a token added to one and not the other was dead code. Both are gone.
 *
 * What was actually worth checking is checked here instead, against the type rather
 * than against a transcription of it: add a field to `TokenSet` and forget the
 * `setProperty` line and this fails, because the preset objects carry that field and
 * the element does not.
 */

/** `bgSurface2` → `--bg-surface-2`, `moneyIncome` → `--money-income`. */
const cssName = (key: string) => `--${key.replace(/([A-Z0-9])/g, (c) => `-${c.toLowerCase()}`)}`;

/** The two fields that are deliberately NOT one property each: `chart` is a ramp
 *  written as `--chart-1…n`, and `heat` is interpolated in JS (the heatmaps read it
 *  through the palette store), so it never becomes CSS at all. */
const NOT_ONE_PROPERTY = ["chart", "heat"];

describe("applyTokenSet", () => {
  for (const preset of PALETTES) {
    for (const mode of ["light", "dark"] as const) {
      it(`writes every ${preset.id} ${mode} token onto the element`, () => {
        const t: TokenSet = preset[mode];
        const el = document.createElement("div");
        applyTokenSet(el, t);

        const scalars = Object.keys(t).filter((k) => !NOT_ONE_PROPERTY.includes(k));
        for (const key of scalars) {
          expect(el.style.getPropertyValue(cssName(key))).toBe(t[key as keyof TokenSet]);
        }
        t.chart.forEach((c, i) => {
          expect(el.style.getPropertyValue(`--chart-${i + 1}`)).toBe(c);
        });

        // Nothing beyond those, so a stale property left behind by a renamed token
        // shows up here rather than silently shadowing the stylesheet.
        expect(el.style.length).toBe(scalars.length + t.chart.length);
      });
    }
  }

  it("is not vacuous — a preset really does carry the fields being counted", () => {
    const t = PALETTES[0].light;
    expect(Object.keys(t).length).toBeGreaterThan(10);
    expect(t.chart).toHaveLength(9);
  });
});
