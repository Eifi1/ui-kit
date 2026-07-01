import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StoreApi, UseBoundStore } from "zustand";
import { logger } from "../lib/logger";
import type { HeatStops } from "./chart-palette";
import { applyTokenSet, DEFAULT_PRESET, presetById, type TokenSet } from "./palette-presets";
import type { ThemeState } from "./theme-store";

// The palette layer flips the whole app between candidate appearance presets at
// runtime (feedback #307), re-skinning every token-driven surface and chart.
// Persisted like the theme so a reload keeps the selection.
interface PaletteState {
  id: string;
  setId: (id: string) => void;
}

/**
 * Build a palette store bound to a consumer-supplied localStorage key, wired to
 * that app's theme store (for the active light/dark mode). Returns the palette
 * hook plus the effect + selector hooks that read the active preset's tokens.
 */
export function createPaletteStore(
  storageKey: string,
  useTheme: UseBoundStore<StoreApi<ThemeState>>,
) {
  const usePalette = create<PaletteState>()(
    logger(
      persist(
        (set) => ({
          id: DEFAULT_PRESET.id,
          setId: (id) => set({ id }),
        }),
        { name: storageKey, version: 1 },
      ),
      "palette",
    ),
  );

  /** Apply the active preset's tokens to <html> as inline CSS custom properties,
   *  re-applying when the preset or the light/dark theme changes. Tailwind v4
   *  strips a bare root token block from the bundle, so this inline write from
   *  the TS source of truth is what actually drives the colours. */
  function useApplyPalette(): void {
    const id = usePalette((s) => s.id);
    const mode = useTheme((s) => s.mode);
    useEffect(() => {
      applyTokenSet(document.documentElement, presetById(id)[mode]);
    }, [id, mode]);
  }

  /** The active preset's token set for the current theme — the source for the
   *  JS-interpolated charts (treemap fills, heatmap stops) that can't read CSS
   *  vars. */
  function useActiveTokenSet(): TokenSet {
    const id = usePalette((s) => s.id);
    const mode = useTheme((s) => s.mode);
    return presetById(id)[mode];
  }

  /** The 9 categorical chart hues for the active preset/theme (treemap cells). */
  function useChartHex(): string[] {
    return useActiveTokenSet().chart;
  }

  /** The active preset/theme heatmap interpolation stops. */
  function useHeatStops(): HeatStops {
    return useActiveTokenSet().heat;
  }

  return { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops };
}

export type PaletteStore = ReturnType<typeof createPaletteStore>;
