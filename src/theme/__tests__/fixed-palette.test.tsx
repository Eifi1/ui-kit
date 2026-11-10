import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceSettings, resetDeviceSettings } from "../../lib/device-settings";
import { createThemeStore } from "../theme-store";
import { createFixedPalette } from "../fixed-palette";
import { contrastStep, rememberedTokenSet } from "../contrast-tokens";
import { DEFAULT_PRESET, PAUL_TOL_PRESET } from "../palette-presets";

/**
 * One palette, no choice (2026-11-10: none of the three apps offers a chart palette any
 * more): `createFixedPalette` paints a preset's token set for the theme's resolved mode,
 * before mount and on every mode change, and keeps nothing. The app's old `*-palette` key
 * is removed once, and nothing joins the device reset.
 */

const root = () => document.documentElement;
const inline = (name: string) => root().style.getPropertyValue(name);
let n = 0;
const fresh = (what: string) => `test-fixed-${what}-${++n}`;
const storedKeys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));

/** A theme store held at `mode`, as an app's `createThemeStore` hands it over. */
function themeAt(mode: "light" | "dark") {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  const key = fresh("theme");
  const store = createThemeStore(key);
  act(() => store.useTheme.getState().setPreference(mode));
  return { ...store, key };
}

afterEach(() => {
  localStorage.clear();
  root().classList.remove("dark");
  root().removeAttribute("style");
  root().removeAttribute("data-contrast");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createFixedPalette", () => {
  it("paints the default preset's set for the mode it is given, before React mounts", () => {
    const { useTheme } = themeAt("light");
    const { applyPalette } = createFixedPalette(useTheme);
    applyPalette("dark");
    expect(inline("--bg-page")).toBe(DEFAULT_PRESET.dark.bgPage);
    expect(inline("--chart-1")).toBe(DEFAULT_PRESET.dark.chart[0]);
    // Remembered, so a contrast change re-applies this set (the palette layer's contract).
    expect(rememberedTokenSet(root())).toBe(DEFAULT_PRESET.dark);
  });

  it("re-paints on every mode change once useApplyPalette is mounted", () => {
    const { useTheme } = themeAt("light");
    const { useApplyPalette } = createFixedPalette(useTheme);
    expect(DEFAULT_PRESET.light.bgPage).not.toBe(DEFAULT_PRESET.dark.bgPage);
    renderHook(() => useApplyPalette());
    expect(inline("--bg-page")).toBe(DEFAULT_PRESET.light.bgPage);

    act(() => useTheme.getState().setPreference("dark"));
    expect(inline("--bg-page")).toBe(DEFAULT_PRESET.dark.bgPage);
    act(() => useTheme.getState().setPreference("light"));
    expect(inline("--bg-page")).toBe(DEFAULT_PRESET.light.bgPage);
  });

  it("hands the charts the mode's hues, heat stops and token set", () => {
    const { useTheme } = themeAt("light");
    const { useActiveTokenSet, useChartHex, useHeatStops } = createFixedPalette(useTheme);
    const { result } = renderHook(() => ({ set: useActiveTokenSet(), hex: useChartHex(), heat: useHeatStops() }));
    expect(result.current).toEqual({
      set: DEFAULT_PRESET.light,
      hex: DEFAULT_PRESET.light.chart,
      heat: DEFAULT_PRESET.light.heat,
    });

    act(() => useTheme.getState().setPreference("dark"));
    expect(result.current.set).toBe(DEFAULT_PRESET.dark);
    expect(result.current.hex).toBe(DEFAULT_PRESET.dark.chart);
    expect(result.current.heat).toBe(DEFAULT_PRESET.dark.heat);
  });

  it("takes another preset: Paul Tol's nine, all of them painted", () => {
    const { useTheme } = themeAt("light");
    const { applyPalette, useChartHex } = createFixedPalette(useTheme, { preset: PAUL_TOL_PRESET });
    applyPalette("light");
    expect(inline("--chart-9")).toBe(PAUL_TOL_PRESET.light.chart[8]);
    expect(renderHook(() => useChartHex()).result.current).toBe(PAUL_TOL_PRESET.light.chart);
  });

  it("steps the set under More contrast, as the palette layer always has", () => {
    const { useTheme } = themeAt("light");
    root().setAttribute("data-contrast", "more");
    createFixedPalette(useTheme).applyPalette("light");
    expect(inline("--text-muted")).toBe(contrastStep(DEFAULT_PRESET.light).textMuted);
  });

  it("keeps nothing: no key written, and nothing joins the device reset", () => {
    const { useTheme, key: themeKey } = themeAt("light");
    const before = deviceSettings().map((e) => e.key);
    const { applyPalette, useApplyPalette, useChartHex } = createFixedPalette(useTheme, {
      legacyStorageKey: fresh("palette"),
    });
    applyPalette("light");
    renderHook(() => {
      useApplyPalette();
      useChartHex();
    });
    act(() => useTheme.getState().setPreference("dark"));

    expect(deviceSettings().map((e) => e.key)).toEqual(before);
    // The theme store's own key is the only thing in storage.
    expect(storedKeys()).toEqual([themeKey]);
  });

  it("a device reset re-paints it for the mode the theme goes back to", () => {
    const { useTheme } = themeAt("dark");
    const { useApplyPalette } = createFixedPalette(useTheme);
    renderHook(() => useApplyPalette());
    expect(inline("--bg-page")).toBe(DEFAULT_PRESET.dark.bgPage);

    // "System", and the stubbed device prefers light.
    act(() => void resetDeviceSettings());
    expect(useTheme.getState().mode).toBe("light");
    expect(inline("--bg-page")).toBe(DEFAULT_PRESET.light.bgPage);
  });
});

describe("createFixedPalette's legacyStorageKey", () => {
  it("removes the app's old palette key when it is created, and paints the preset whatever it held", () => {
    const { useTheme } = themeAt("light");
    const legacy = fresh("palette");
    localStorage.setItem(legacy, JSON.stringify({ state: { id: PAUL_TOL_PRESET.id }, version: 1 }));

    const { applyPalette } = createFixedPalette(useTheme, { legacyStorageKey: legacy });
    expect(localStorage.getItem(legacy)).toBeNull();
    applyPalette("light");
    expect(inline("--chart-9")).toBe(DEFAULT_PRESET.light.chart[0]);
  });

  it("applyPalette, the boot's call, removes it too: a key written after the module loaded", () => {
    // keksdose's own test seeds the old key after importing its palette module, then
    // boots; an app's palette module is imported before main.tsx's body runs.
    const { useTheme } = themeAt("light");
    const legacy = fresh("palette");
    const { applyPalette, useApplyPalette } = createFixedPalette(useTheme, { legacyStorageKey: legacy });
    localStorage.setItem(legacy, JSON.stringify({ state: { id: PAUL_TOL_PRESET.id }, version: 1 }));
    applyPalette("light");
    expect(localStorage.getItem(legacy)).toBeNull();

    // Not on every paint: a mode change is no boot.
    localStorage.setItem(legacy, "{}");
    renderHook(() => useApplyPalette());
    act(() => useTheme.getState().setPreference("dark"));
    expect(localStorage.getItem(legacy)).toBe("{}");
  });

  it("removes only that key, and none without one", () => {
    const { useTheme, key: themeKey } = themeAt("light");
    const other = fresh("palette");
    localStorage.setItem(other, "{}");
    createFixedPalette(useTheme);
    createFixedPalette(useTheme, { legacyStorageKey: fresh("palette") });
    expect(localStorage.getItem(other)).toBe("{}");
    expect(localStorage.getItem(themeKey)).not.toBeNull();
  });

  it("does not throw where the browser refuses storage", () => {
    const { useTheme } = themeAt("light");
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("refused", "SecurityError");
    });
    expect(() => createFixedPalette(useTheme, { legacyStorageKey: fresh("palette") })).not.toThrow();
  });
});
