import { afterEach, describe, expect, it, vi } from "vitest";
import { readPersistedContrast } from "../contrast";
import { readPersistedTextSize } from "../text-size";
import { applyPersistedTheme } from "../theme-store";
import { applyPersistedPalette } from "../palette-store";
import { DEFAULT_PRESET, presetById } from "../palette-presets";

/**
 * The four pre-paint reads, one rule since 0.52 (DUP-8, refactor audit 2026-10-30): each
 * goes through `readStoredJson` with its own shape check, where each had its own
 * `JSON.parse` in its own try/catch — two of them on a bare `localStorage`. Absent,
 * malformed, another shape and blocked storage all read as "never chose".
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
    expect(() => applyPersistedPalette(KEY, "light")).not.toThrow();
  });
});

describe("applyPersistedPalette", () => {
  const brand = () => document.documentElement.style.getPropertyValue("--brand");
  const other = presetById("moss");

  it("applies the stored preset", () => {
    expect(other.light.brand).not.toBe(DEFAULT_PRESET.light.brand);
    localStorage.setItem(KEY, JSON.stringify({ state: { id: other.id }, version: 1 }));
    applyPersistedPalette(KEY, "light");
    expect(brand()).toBe(other.light.brand);
  });

  it("applies the default for an absent, malformed, empty or unknown id", () => {
    for (const stored of [null, "{not json", '{"state":{"id":""}}', '{"state":{"id":3}}', '{"state":{"id":"gone"}}']) {
      if (stored === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, stored);
      document.documentElement.removeAttribute("style");
      applyPersistedPalette(KEY, "dark");
      expect(brand(), String(stored)).toBe(DEFAULT_PRESET.dark.brand);
    }
  });
});
