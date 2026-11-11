import { afterEach, describe, expect, it, vi } from "vitest";
import { readPersistedContrast } from "../contrast";
import { readPersistedTextSize } from "../text-size";
import { applyPersistedTheme, createThemeStore } from "../theme-store";
import { createFixedPalette } from "../fixed-palette";
import { DEFAULT_PRESET, presetById } from "../palette-presets";

/**
 * The pre-paint reads, one rule since 0.52 (DUP-8, refactor audit 2026-10-30): each
 * goes through `readStoredJson` with its own shape check, where each had its own
 * `JSON.parse` in its own try/catch — two of them on a bare `localStorage`. Absent,
 * malformed, another shape and blocked storage all read as "never chose".
 *
 * There were four until 0.60 removed `applyPersistedPalette`. The palette's pre-paint is
 * now `createFixedPalette`'s `applyPalette`, which reads nothing: it paints the preset
 * whatever the old key held, and removes that key through the kit's storage guard.
 */
const KEY = "persisted-reads-test";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("style");
  document.documentElement.classList.remove("dark");
});

const blockStorage = () =>
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });

describe("the persisted appearance reads", () => {
  it("read the frozen formats", () => {
    localStorage.setItem(KEY, '{"state":{"contrast":"more"},"version":1}');
    expect(readPersistedContrast(KEY)).toBe("more");
    localStorage.setItem(KEY, '{"state":{"size":"large"},"version":1}');
    expect(readPersistedTextSize(KEY)).toBe("large");
    localStorage.setItem(KEY, '{"state":{"preference":"dark"},"version":1}');
    expect(applyPersistedTheme(KEY)).toBe("dark");
    // The legacy concrete `mode` still carries over as the preference.
    localStorage.setItem(KEY, '{"state":{"mode":"dark"}}');
    expect(applyPersistedTheme(KEY)).toBe("dark");
  });

  it("read absent, malformed and another shape as never chosen", () => {
    for (const stored of [null, "{not json", "null", "7", '{"state":5}', '{"state":{"contrast":"loud","size":9}}']) {
      if (stored === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, stored);
      expect(readPersistedContrast(KEY), String(stored)).toBeNull();
      expect(readPersistedTextSize(KEY), String(stored)).toBeNull();
      // "system", which resolves to light where nothing prefers dark (jsdom).
      expect(applyPersistedTheme(KEY), String(stored)).toBe("light");
    }
  });

  it("read blocked storage as never chosen, and never throw", () => {
    blockStorage();
    expect(readPersistedContrast(KEY)).toBeNull();
    expect(readPersistedTextSize(KEY)).toBeNull();
    expect(applyPersistedTheme(KEY)).toBe("light");
  });
});

describe("createFixedPalette's applyPalette, the palette's pre-paint", () => {
  const brand = () => document.documentElement.style.getPropertyValue("--brand");
  // `applyPalette` is handed the mode and reads no store; the theme store is only its binding.
  const fixedPalette = () => createFixedPalette(createThemeStore(`${KEY}-theme`).useTheme, { legacyStorageKey: KEY });

  it("paints the preset, and removes the old key whatever it held", () => {
    const other = presetById("moss");
    expect(other.dark.brand).not.toBe(DEFAULT_PRESET.dark.brand);
    const { applyPalette } = fixedPalette();
    // Another preset's id, as the old store kept it, and every shape it never wrote.
    const held = [JSON.stringify({ state: { id: other.id }, version: 1 }), "{not json", '{"state":{"id":""}}'];
    for (const stored of [null, ...held, '{"state":{"id":3}}', '{"state":{"id":"gone"}}']) {
      if (stored === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, stored);
      document.documentElement.removeAttribute("style");
      applyPalette("dark");
      expect(brand(), String(stored)).toBe(DEFAULT_PRESET.dark.brand);
      expect(localStorage.getItem(KEY), String(stored)).toBeNull();
    }
  });

  it("paints where storage is blocked, and never throws", () => {
    const { applyPalette } = fixedPalette();
    blockStorage();
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => applyPalette("light")).not.toThrow();
    expect(brand()).toBe(DEFAULT_PRESET.light.brand);
  });
});
