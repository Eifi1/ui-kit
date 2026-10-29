import { describe, expect, it } from "vitest";
import { contrast, hexToOklch } from "../color";
import { CONTRAST_STEPPED_VARS, WELL_INK_MORE, WELL_STEP_MIN, contrastStep, mix } from "../contrast-tokens";
import { DEFAULT_PRESET, PALETTES, applyTokenSet } from "../palette-presets";

/**
 * More contrast's light well (0.36, docs/colour-roles-harmonization.md §13.3, §13.4): in a
 * light set the well is 10 % ink into the card, each money colour under 4.5:1 on it is
 * solved darker at its own hue and chroma, and the border is solved against it. A dark set
 * steps none of that.
 */

const MONEY = ["moneyIncome", "moneyExpense", "moneyNet", "moneyNeutral"] as const;

describe("contrastStep's well (§13.4)", () => {
  it("answers Default light's hexes", () => {
    const step = contrastStep(DEFAULT_PRESET.light);
    expect(step.well).toEqual({
      bgSurface2: "#e3d9c7",
      moneyIncome: "#0b6650", // 4.95:1 on the well already: as it is
      moneyExpense: "#895400",
      moneyNet: "#774ca0",
      moneyNeutral: "#665f4f",
    });
    // The border re-solves against the stepped well: #8b8170 against the page.
    expect(step.border).toBe("#847a69");
  });

  it("is 10 % ink into the card, 1.17:1 or more from it, in every light preset", () => {
    expect(WELL_INK_MORE).toBe(0.1);
    for (const preset of PALETTES) {
      const t = preset.light;
      const well = contrastStep(t).well!;
      expect(well.bgSurface2, preset.id).toBe(mix(t.textPrimary, t.bgSurface, WELL_INK_MORE));
      expect(contrast(well.bgSurface2, t.bgSurface), preset.id).toBeGreaterThanOrEqual(WELL_STEP_MIN);
    }
  });

  it("solves every money colour to 4.5:1 on its stepped well, at its own hue and chroma", () => {
    for (const preset of PALETTES) {
      const t = preset.light;
      const well = contrastStep(t).well!;
      for (const key of MONEY) {
        const label = `${preset.id} ${key} ${t[key]} → ${well[key]}`;
        expect(contrast(well[key], well.bgSurface2), label).toBeGreaterThanOrEqual(4.5);
        if (contrast(t[key], well.bgSurface2) >= 4.5) {
          expect(well[key], label).toBe(t[key]);
          continue;
        }
        const a = hexToOklch(t[key])!;
        const b = hexToOklch(well[key])!;
        expect(b.l, label).toBeLessThan(a.l);
        expect(Math.abs(a.c - b.c), label).toBeLessThanOrEqual(0.01);
        // A near-grey's hue moves with any rounding; a coloured one keeps it.
        if (a.c >= 0.03) expect(Math.abs(((a.h - b.h + 540) % 360) - 180), label).toBeLessThanOrEqual(1);
        // Darker at the same hue: the page and the card only gain.
        expect(contrast(well[key], t.bgPage), label).toBeGreaterThan(contrast(t[key], t.bgPage));
      }
    }
  });

  it("clears 3:1 with the border on the stepped well, the page and the card", () => {
    for (const preset of PALETTES) {
      const t = preset.light;
      const step = contrastStep(t);
      for (const bg of [t.bgPage, t.bgSurface, step.well!.bgSurface2]) {
        expect(contrast(step.border, bg), preset.id).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("gives a dark set no well step", () => {
    for (const preset of PALETTES) expect(contrastStep(preset.dark).well, preset.id).toBeNull();
  });

  it("lists the nine variables it can write", () => {
    expect([...CONTRAST_STEPPED_VARS]).toEqual([
      "--text-secondary",
      "--text-muted",
      "--text-placeholder",
      "--border",
      "--bg-surface-2",
      "--money-income",
      "--money-expense",
      "--money-net",
      "--money-neutral",
    ]);
  });
});

describe("applyTokenSet writes the stepped well and money (§13.4 item 2)", () => {
  const css = (key: string) => `--${key.replace(/([A-Z0-9])/g, (c) => `-${c.toLowerCase()}`)}`;

  it("for a light set under More contrast", () => {
    for (const preset of PALETTES) {
      const el = document.createElement("div");
      applyTokenSet(el, preset.light, true);
      const well = contrastStep(preset.light).well!;
      for (const key of ["bgSurface2", ...MONEY] as const) {
        expect(el.style.getPropertyValue(css(key)), `${preset.id} ${key}`).toBe(well[key]);
      }
    }
  });

  it("the set's own in dark under More contrast, and at Standard in both", () => {
    for (const preset of PALETTES) {
      for (const [mode, more] of [
        ["dark", true],
        ["dark", false],
        ["light", false],
      ] as const) {
        const el = document.createElement("div");
        applyTokenSet(el, preset[mode], more);
        for (const key of ["bgSurface2", ...MONEY] as const) {
          expect(el.style.getPropertyValue(css(key)), `${preset.id} ${mode} ${more} ${key}`).toBe(preset[mode][key]);
        }
      }
    }
  });

  it("back to the set's own when More contrast is turned off", () => {
    const el = document.createElement("div");
    applyTokenSet(el, DEFAULT_PRESET.light, true);
    expect(el.style.getPropertyValue("--bg-surface-2")).toBe("#e3d9c7");
    applyTokenSet(el, DEFAULT_PRESET.light, false);
    expect(el.style.getPropertyValue("--bg-surface-2")).toBe(DEFAULT_PRESET.light.bgSurface2);
    expect(el.style.getPropertyValue("--money-expense")).toBe(DEFAULT_PRESET.light.moneyExpense);
  });
});
