import { useEffect } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import { removeStored } from "../lib/safe-storage";
import type { HeatStops } from "./chart-palette";
import { applyTokenSet, DEFAULT_PRESET, type PalettePreset, type TokenSet } from "./palette-presets";
import type { ThemeMode, ThemeState } from "./theme-store";

/**
 * One palette, and no choice of it (Marcel, 2026-11-10: none of the three apps offers a
 * chart palette any more). `createPaletteStore` kept a choice per device until 0.60 removed
 * it; with nothing to choose, what is left is a preset painted for the light or dark mode in
 * force — what keksdose's own `palette-store.ts` became (7e64b326), here so the other two do
 * not write it a second and a third time.
 *
 * **Nothing is kept**, so nothing joins the device reset (docs/settings-harmonization.md
 * §11.4): there is no value to put back, and an entry would make the reset report, and an
 * app's own list of what the browser keeps (Kurvenschmiede's `KIND_OF`), name a key that is
 * never there. A reset still re-paints it: the theme's reset flips the mode, and
 * `useApplyPalette` follows the mode.
 *
 * **Painting is the app's call, never the factory's.** Creating it and reading its hooks
 * writes nothing to `<html>`, so an app without a palette layer (Kurvenschmiede: its base
 * tokens are tokens.css's, which mirror the default preset) can take only the chart hooks
 * and keep the contrast store's branch for a page with no token set remembered
 * (contrast.ts, `reapplyContrastTokens`).
 */
export interface FixedPaletteOptions {
  /** The preset painted. Default {@link DEFAULT_PRESET} (anyplot's "Imprint"), the one
   *  tokens.css mirrors. */
  preset?: PalettePreset;
  /**
   * The key the app's `createPaletteStore` kept the device's choice under
   * (`keksdose-palette`, `kastlan-palette`, `steering-palette`). Removed when the palette
   * is created and by `applyPalette`, the boot's call (never on a mode change): nothing
   * reads it any more, and a privacy page that lists what the device keeps should not
   * have to list it. Whatever it held, the preset paints.
   */
  legacyStorageKey?: string;
}

/** What {@link createFixedPalette} hands back: the names the removed `createPaletteStore`
 *  used, so an app's `palette-store.ts` swapped one call and its consumers kept their
 *  imports. */
export interface FixedPalette {
  /** Paint the preset's set for `mode` on `<html>`. Before React mounts: at module scope
   *  in `main.tsx`, with the mode `applyPersistedTheme` returned. */
  applyPalette: (mode: ThemeMode) => void;
  /** Mount once near the root: paints the set for the theme's mode, and again on every
   *  change of it. */
  useApplyPalette: () => void;
  /** The preset's token set for the theme's mode, for what interpolates hex in JS. */
  useActiveTokenSet: () => TokenSet;
  /** The categorical chart hues for the theme's mode (treemap cells, canvas charts). */
  useChartHex: () => string[];
  /** The heatmap interpolation stops for the theme's mode. */
  useHeatStops: () => HeatStops;
}

/**
 * The app's one palette, bound to its theme store (for the light/dark mode in force):
 *
 * ```ts
 * // palette-store.ts
 * export const { applyPalette, useApplyPalette, useChartHex, useHeatStops } =
 *   createFixedPalette(useTheme, { legacyStorageKey: "myapp-palette" });
 * // main.tsx, before createRoot
 * applyPalette(applyPersistedTheme("myapp-theme"));
 * ```
 *
 * More contrast still steps it: `applyTokenSet` reads `<html data-contrast>`, and the
 * contrast store re-applies the set written last when the contrast changes.
 */
export function createFixedPalette(
  useTheme: UseBoundStore<StoreApi<ThemeState>>,
  options: FixedPaletteOptions = {},
): FixedPalette {
  const preset = options.preset ?? DEFAULT_PRESET;
  // At creation, which an app does at module scope: once per load, and the only removal
  // an app without a palette layer gets (KS never paints). Again in the boot's
  // `applyPalette`, never in the hook's mode changes. `removeStored` is the kit's guard,
  // so a browser that refuses storage throws nothing here.
  const forgetLegacy = () => {
    if (options.legacyStorageKey) removeStored(options.legacyStorageKey);
  };
  forgetLegacy();

  function applyPalette(mode: ThemeMode): void {
    forgetLegacy();
    applyTokenSet(document.documentElement, preset[mode]);
  }

  function useApplyPalette(): void {
    const mode = useTheme((s) => s.mode);
    useEffect(() => {
      applyTokenSet(document.documentElement, preset[mode]);
    }, [mode]);
  }

  function useActiveTokenSet(): TokenSet {
    return preset[useTheme((s) => s.mode)];
  }

  function useChartHex(): string[] {
    return useActiveTokenSet().chart;
  }

  function useHeatStops(): HeatStops {
    return useActiveTokenSet().heat;
  }

  return { applyPalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops };
}
