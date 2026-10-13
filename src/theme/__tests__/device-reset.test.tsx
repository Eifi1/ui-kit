import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceSettings, resetDeviceSettings } from "../../lib/device-settings";
import { applyPersistedTheme, createThemeStore } from "../theme-store";
import { applyPersistedPalette, createPaletteStore } from "../palette-store";
import { createTextSizeStore, readPersistedTextSize } from "../text-size";
import { createContrastStore, readPersistedContrast } from "../contrast";
import { DEFAULT_PRESET, presetById } from "../palette-presets";

/**
 * The four appearance stores join the reset of this device's settings on their own
 * (docs/settings-harmonization.md §11.4, §11.6 item 4): each at creation, with its key,
 * as appearance; and a reset puts each value back LIVE, through the store's own setter,
 * leaving the persisted blob the pre-paint call reads next load.
 */

const root = () => document.documentElement;
const inline = (name: string) => root().style.getPropertyValue(name);
const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null") as unknown;

let n = 0;
const fresh = (what: string) => `test-${what}-${++n}`;

/** `matchMedia` answering the OS's colour scheme; `prefers-contrast` answers no. */
function stubSystem(scheme: "light" | "dark") {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-color-scheme: dark") ? scheme === "dark" : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
}

beforeEach(() => stubSystem("light"));

afterEach(() => {
  localStorage.clear();
  root().classList.remove("dark");
  root().removeAttribute("style");
  root().removeAttribute("data-text-size");
  root().removeAttribute("data-contrast");
  vi.unstubAllGlobals();
});

describe("each store joins at creation, with its key, as appearance", () => {
  it("theme, palette, text size and contrast", () => {
    const themeKey = fresh("theme");
    const paletteKey = fresh("palette");
    const sizeKey = fresh("size");
    const contrastKey = fresh("contrast");
    const { useTheme } = createThemeStore(themeKey);
    createPaletteStore(paletteKey, useTheme);
    createTextSizeStore(sizeKey);
    createContrastStore(contrastKey);
    const joined = deviceSettings().filter((e) => [themeKey, paletteKey, sizeKey, contrastKey].includes(e.key));
    expect(joined.map((e) => [e.key, e.kind, e.prefix ?? false, typeof e.reset])).toEqual([
      [themeKey, "appearance", false, "function"],
      [paletteKey, "appearance", false, "function"],
      [sizeKey, "appearance", false, "function"],
      [contrastKey, "appearance", false, "function"],
    ]);
  });
});

describe("a reset puts each value back live", () => {
  it("theme: back to System, and the .dark class follows the system", () => {
    stubSystem("dark");
    const key = fresh("theme");
    const { useTheme, useApplyTheme } = createThemeStore(key);
    act(() => useTheme.getState().setPreference("light"));
    renderHook(() => useApplyTheme());
    expect(root().classList.contains("dark")).toBe(false);

    act(() => void resetDeviceSettings());
    expect(useTheme.getState().preference).toBe("system");
    expect(useTheme.getState().mode).toBe("dark");
    expect(root().classList.contains("dark")).toBe(true);
    // What the pre-paint call reads next load.
    expect(stored(key)).toEqual({ state: { preference: "system" }, version: 2 });
    root().classList.remove("dark");
    expect(applyPersistedTheme(key)).toBe("dark");
  });

  it("palette: back to Default, re-written inline where useApplyPalette is mounted", () => {
    const { useTheme } = createThemeStore(fresh("theme"));
    const key = fresh("palette");
    const { usePalette, useApplyPalette } = createPaletteStore(key, useTheme);
    const other = presetById("ink");
    expect(other.light.brand).not.toBe(DEFAULT_PRESET.light.brand);
    act(() => usePalette.getState().setId(other.id));
    renderHook(() => useApplyPalette());
    expect(inline("--brand")).toBe(other.light.brand);

    act(() => void resetDeviceSettings());
    expect(usePalette.getState().id).toBe(DEFAULT_PRESET.id);
    expect(inline("--brand")).toBe(DEFAULT_PRESET.light.brand);
    expect(stored(key)).toEqual({ state: { id: DEFAULT_PRESET.id }, version: 1 });
    root().removeAttribute("style");
    applyPersistedPalette(key, "light");
    expect(inline("--brand")).toBe(DEFAULT_PRESET.light.brand);
  });

  it("text size: no choice on this device, so the account's size applies again, else Normal", () => {
    const key = fresh("size");
    const { useTextSizeStore, useApplyTextSize } = createTextSizeStore(key);
    act(() => useTextSizeStore.getState().setSize("large"));
    const { rerender } = renderHook<string, { account?: string }>(({ account }) => useApplyTextSize({ account }), {
      initialProps: { account: "xlarge" },
    });
    expect(root().getAttribute("data-text-size")).toBe("large");

    act(() => void resetDeviceSettings());
    expect(useTextSizeStore.getState().size).toBeNull();
    expect(root().getAttribute("data-text-size")).toBe("xlarge");
    rerender({ account: undefined });
    expect(root().getAttribute("data-text-size")).toBe("normal");
    expect(stored(key)).toEqual({ state: { size: null }, version: 1 });
    expect(readPersistedTextSize(key)).toBeNull();
  });

  it("contrast: no choice on this device, so the account's mode applies again, else System", () => {
    const key = fresh("contrast");
    const { useContrastStore, useApplyContrast } = createContrastStore(key);
    act(() => useContrastStore.getState().setContrast("more"));
    const { rerender } = renderHook<string, { account?: string }>(({ account }) => useApplyContrast({ account }), {
      initialProps: { account: "standard" },
    });
    expect(root().getAttribute("data-contrast")).toBe("more");

    act(() => void resetDeviceSettings());
    expect(useContrastStore.getState().contrast).toBeNull();
    expect(root().getAttribute("data-contrast")).toBe("standard");
    // The account says More: this device follows it again.
    rerender({ account: "more" });
    expect(root().getAttribute("data-contrast")).toBe("more");
    // No account value: "system", which the device (prefers-contrast: no) puts at Standard.
    rerender({ account: undefined });
    expect(root().getAttribute("data-contrast")).toBe("standard");
    expect(stored(key)).toEqual({ state: { contrast: null }, version: 1 });
    expect(readPersistedContrast(key)).toBeNull();
  });
});
