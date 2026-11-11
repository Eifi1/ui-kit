import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetDeviceSettings } from "../../lib/device-settings";
import { createThemeStore } from "../theme-store";
import { createFixedPalette } from "../fixed-palette";
import { createContrastStore } from "../contrast";
import { contrastStep, rememberedTokenSet } from "../contrast-tokens";
import { DEFAULT_PRESET } from "../palette-presets";

/**
 * A device reset in an app WITHOUT a palette layer (docs/settings-harmonization.md §11.4,
 * KS 3.3). Kurvenschmiede creates the palette for its chart hues (`createFixedPalette`,
 * `useChartHex`) and never paints it: its base tokens come from tokens.css. Creating the
 * palette, reading its hooks and the reset write nothing to <html>. An imperative
 * `applyTokenSet` in any of them would remember a token set on <html>; the contrast store
 * would then take its palette branch, and a theme switch afterwards would no longer
 * re-write the stepped tokens for the new theme.
 *
 * Until 0.60 this held `createPaletteStore`'s state-only reset to the same; the fixed
 * palette has no state to reset, but the rule for <html> is unchanged.
 *
 * Its own file on purpose, like contrast.no-palette.test.tsx: the kit remembers the set
 * `applyTokenSet` last wrote to an element, and in this file nothing ever writes one.
 */

const root = () => document.documentElement;
const inline = (name: string) => root().style.getPropertyValue(name);

afterEach(() => {
  localStorage.clear();
  root().classList.remove("dark");
  root().removeAttribute("style");
  root().removeAttribute("data-contrast");
  vi.unstubAllGlobals();
});

describe("Reset this device without a palette layer", () => {
  it("writes nothing inline for the palette, remembers no token set, and a theme switch still re-steps", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { useTheme, useApplyTheme } = createThemeStore("test-np-theme");
    const { useChartHex } = createFixedPalette(useTheme, { legacyStorageKey: "test-np-palette" });
    const { useContrastStore, useApplyContrast } = createContrastStore("test-np-contrast");
    act(() => {
      useTheme.getState().setPreference("light");
      useContrastStore.getState().setContrast("standard");
    });
    // The account asks for More contrast, so More stays on after the device's choice goes.
    const { result } = renderHook(() => {
      useApplyTheme();
      useApplyContrast({ account: "more" });
      return useChartHex();
    });
    expect(result.current).toBe(DEFAULT_PRESET.light.chart);
    expect(root().getAttribute("data-contrast")).toBe("standard");
    expect(rememberedTokenSet(root())).toBeUndefined();

    act(() => void resetDeviceSettings());
    expect(rememberedTokenSet(root())).toBeUndefined();
    // Only the contrast's stepped tokens are inline; the palette's are not.
    expect(root().getAttribute("data-contrast")).toBe("more");
    expect(inline("--brand")).toBe("");
    expect(inline("--bg-page")).toBe("");
    expect(inline("--text-muted")).toBe(contrastStep(DEFAULT_PRESET.light).textMuted);

    await act(async () => {
      useTheme.getState().setPreference("dark");
      await Promise.resolve();
    });
    expect(root().classList.contains("dark")).toBe(true);
    expect(result.current).toBe(DEFAULT_PRESET.dark.chart);
    expect(rememberedTokenSet(root())).toBeUndefined();
    expect(inline("--text-muted")).toBe(contrastStep(DEFAULT_PRESET.dark).textMuted);
    expect(inline("--brand")).toBe("");
  });
});
