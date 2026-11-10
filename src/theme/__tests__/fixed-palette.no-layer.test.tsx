import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetDeviceSettings } from "../../lib/device-settings";
import { createThemeStore } from "../theme-store";
import { createFixedPalette } from "../fixed-palette";
import { createContrastStore } from "../contrast";
import { contrastStep, rememberedTokenSet } from "../contrast-tokens";
import { DEFAULT_PRESET } from "../palette-presets";

/**
 * `createFixedPalette` in an app WITHOUT a palette layer — Kurvenschmiede: it takes the
 * chart hooks and never paints, its base tokens are tokens.css's. Creating the palette and
 * reading its hooks must write nothing to <html> and remember no token set, or the contrast
 * store would take its palette branch, where a theme switch no longer re-writes the
 * stepped tokens (KS 3.3, as device-reset.no-palette.test.tsx holds for the old store).
 *
 * Its own file on purpose: the kit remembers the set `applyTokenSet` last wrote to an
 * element, and in this file nothing ever writes one.
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

describe("createFixedPalette without a palette layer", () => {
  it("paints nothing for the charts' hooks, and a device reset and a theme switch still re-step", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { useTheme, useApplyTheme } = createThemeStore("test-fixed-nl-theme");
    localStorage.setItem("test-fixed-nl-palette", JSON.stringify({ state: { id: "ink" }, version: 1 }));
    const { useActiveTokenSet, useChartHex } = createFixedPalette(useTheme, {
      legacyStorageKey: "test-fixed-nl-palette",
    });
    const { useContrastStore, useApplyContrast } = createContrastStore("test-fixed-nl-contrast");
    act(() => {
      useTheme.getState().setPreference("light");
      useContrastStore.getState().setContrast("standard");
    });
    // The account asks for More contrast, so More stays on after the device's choice goes.
    const { result } = renderHook(() => {
      useApplyTheme();
      useApplyContrast({ account: "more" });
      return { set: useActiveTokenSet(), hex: useChartHex() };
    });
    expect(result.current.hex).toBe(DEFAULT_PRESET.light.chart);
    expect(localStorage.getItem("test-fixed-nl-palette")).toBeNull();
    expect(rememberedTokenSet(root())).toBeUndefined();
    expect(inline("--bg-page")).toBe("");

    act(() => void resetDeviceSettings());
    expect(root().getAttribute("data-contrast")).toBe("more");
    expect(rememberedTokenSet(root())).toBeUndefined();
    // Only the contrast's stepped tokens are inline; the palette's base tokens are not.
    expect(inline("--brand")).toBe("");
    expect(inline("--bg-page")).toBe("");
    expect(inline("--text-muted")).toBe(contrastStep(DEFAULT_PRESET.light).textMuted);

    await act(async () => {
      useTheme.getState().setPreference("dark");
      await Promise.resolve();
    });
    expect(result.current.set).toBe(DEFAULT_PRESET.dark);
    expect(rememberedTokenSet(root())).toBeUndefined();
    expect(inline("--text-muted")).toBe(contrastStep(DEFAULT_PRESET.dark).textMuted);
    expect(inline("--brand")).toBe("");
  });
});
