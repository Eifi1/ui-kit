import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPersistedTheme, createThemeStore } from "../theme-store";

/**
 * The theme store: the module every app runs first (refactor audit 2026-10, TST-12).
 *
 * `applyPersistedTheme` is the no-flash bootstrap all three apps call in `main.tsx`
 * before React mounts, and nothing executed it; nor the migration that carries a pre-v2
 * blob's `mode` over as the user's preference, nor the listener that follows the OS
 * while the preference is "system". A regression in any of them shows in every app as
 * a theme flash, the wrong theme on load, or a user's stored choice silently dropped.
 */

const root = () => document.documentElement;
const isDark = () => root().classList.contains("dark");

let n = 0;
/** A fresh storage key per test: each `createThemeStore` hydrates from its own key. */
const freshKey = () => `test-theme-${++n}`;

/** zustand persist's envelope, as an app's localStorage holds it. */
const store = (key: string, state: unknown, version: number) =>
  localStorage.setItem(key, JSON.stringify({ state, version }));
const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null") as unknown;

/** A `matchMedia` whose `(prefers-color-scheme: dark)` answer the test flips. */
function stubSystemTheme(initial: "light" | "dark") {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initial === "dark",
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal("matchMedia", () => mql);
  return {
    listeners,
    set(theme: "light" | "dark") {
      mql.matches = theme === "dark";
      for (const fn of listeners) fn();
    },
  };
}

afterEach(() => {
  localStorage.clear();
  root().classList.remove("dark");
  root().style.removeProperty("color-scheme");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("applyPersistedTheme (before React mounts)", () => {
  it("applies a v2 preference: dark sets the class and says so", () => {
    const key = freshKey();
    store(key, { preference: "dark" }, 2);
    expect(applyPersistedTheme(key)).toBe("dark");
    expect(isDark()).toBe(true);
  });

  it("applies a v2 light preference over a dark OS, and takes a stale class off", () => {
    stubSystemTheme("dark");
    root().classList.add("dark");
    const key = freshKey();
    store(key, { preference: "light" }, 2);
    expect(applyPersistedTheme(key)).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("resolves a v2 system preference against the OS", () => {
    stubSystemTheme("dark");
    const key = freshKey();
    store(key, { preference: "system" }, 2);
    expect(applyPersistedTheme(key)).toBe("dark");
    expect(isDark()).toBe(true);
  });

  it("carries a pre-v2 blob's concrete mode over as the preference", () => {
    stubSystemTheme("light");
    const key = freshKey();
    store(key, { mode: "dark" }, 0);
    expect(applyPersistedTheme(key)).toBe("dark");
    expect(isDark()).toBe(true);
  });

  it("lets the preference win over a leftover mode in the same blob", () => {
    const key = freshKey();
    store(key, { preference: "light", mode: "dark" }, 2);
    expect(applyPersistedTheme(key)).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("falls back to the OS when nothing is stored, or the stored values are not ones it knows", () => {
    stubSystemTheme("dark");
    expect(applyPersistedTheme(freshKey())).toBe("dark");
    const key = freshKey();
    store(key, { preference: "sepia", mode: "blue" }, 2);
    expect(applyPersistedTheme(key)).toBe("dark");
    expect(isDark()).toBe(true);
  });

  it("survives malformed JSON and a null blob, and follows the OS", () => {
    stubSystemTheme("dark");
    const key = freshKey();
    localStorage.setItem(key, "{not json");
    expect(applyPersistedTheme(key)).toBe("dark");
    localStorage.setItem(key, "null");
    expect(applyPersistedTheme(key)).toBe("dark");
    expect(isDark()).toBe(true);
  });

  it("survives a localStorage that throws (Safari private mode, blocked site data)", () => {
    stubSystemTheme("light");
    root().classList.add("dark");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });
    expect(applyPersistedTheme(freshKey())).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("answers light where there is no matchMedia at all", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(applyPersistedTheme(freshKey())).toBe("light");
    expect(isDark()).toBe(false);
  });
});

describe("color-scheme on <html> (0.47, keksdose dev #600)", () => {
  // The browser draws a native select's open list, a date input's popup, scrollbars and
  // autofill itself, and only `color-scheme` tells it which theme to draw them in.
  const scheme = () => root().style.colorScheme;

  it("is set with the class by the pre-paint bootstrap", () => {
    const key = freshKey();
    store(key, { preference: "dark" }, 2);
    applyPersistedTheme(key);
    expect(scheme()).toBe("dark");
    store(key, { preference: "light" }, 2);
    applyPersistedTheme(key);
    expect(scheme()).toBe("light");
  });

  it("follows the store: light, dark, and the OS while on system", () => {
    const os = stubSystemTheme("light");
    const { useTheme, useApplyTheme } = createThemeStore(freshKey());
    renderHook(() => useApplyTheme());
    expect(scheme()).toBe("light");
    act(() => useTheme.getState().setMode("dark"));
    expect(scheme()).toBe("dark");
    act(() => useTheme.getState().setPreference("system"));
    expect(scheme()).toBe("light");
    act(() => os.set("dark"));
    expect(scheme()).toBe("dark");
  });
});

describe("createThemeStore", () => {
  it("starts on system, resolved against the OS, when nothing is stored", () => {
    stubSystemTheme("dark");
    const { useTheme } = createThemeStore(freshKey());
    expect(useTheme.getState()).toMatchObject({ preference: "system", mode: "dark" });
  });

  it("migrates a pre-v2 blob: the stored mode becomes the preference, and the blob is rewritten as v2", () => {
    stubSystemTheme("light");
    const key = freshKey();
    store(key, { mode: "dark" }, 1);
    const { useTheme } = createThemeStore(key);
    expect(useTheme.getState()).toMatchObject({ preference: "dark", mode: "dark" });
    expect(stored(key)).toEqual({ state: { preference: "dark" }, version: 2 });
  });

  it("migrates an unreadable old blob to system", () => {
    stubSystemTheme("dark");
    const key = freshKey();
    store(key, null, 0);
    const { useTheme } = createThemeStore(key);
    expect(useTheme.getState()).toMatchObject({ preference: "system", mode: "dark" });
  });

  it("resolves the concrete mode from the stored preference on load, not from the OS", () => {
    stubSystemTheme("dark");
    const light = freshKey();
    store(light, { preference: "light" }, 2);
    expect(createThemeStore(light).useTheme.getState().mode).toBe("light");
    const system = freshKey();
    store(system, { preference: "system" }, 2);
    expect(createThemeStore(system).useTheme.getState().mode).toBe("dark");
  });

  it("persists the preference only — mode is derived on load", () => {
    stubSystemTheme("light");
    const key = freshKey();
    const { useTheme } = createThemeStore(key);
    act(() => useTheme.getState().toggle());
    expect(useTheme.getState()).toMatchObject({ preference: "dark", mode: "dark" });
    expect(stored(key)).toEqual({ state: { preference: "dark" }, version: 2 });
    act(() => useTheme.getState().setMode("light"));
    expect(useTheme.getState()).toMatchObject({ preference: "light", mode: "light" });
    act(() => useTheme.getState().setPreference("system"));
    expect(useTheme.getState()).toMatchObject({ preference: "system", mode: "light" });
    expect(stored(key)).toEqual({ state: { preference: "system" }, version: 2 });
  });
});

describe("useApplyTheme", () => {
  it("puts the class on <html> for the resolved mode, and moves it with the store", () => {
    stubSystemTheme("light");
    const { useTheme, useApplyTheme } = createThemeStore(freshKey());
    renderHook(() => useApplyTheme());
    expect(isDark()).toBe(false);
    act(() => useTheme.getState().setMode("dark"));
    expect(isDark()).toBe(true);
    act(() => useTheme.getState().toggle());
    expect(isDark()).toBe(false);
  });

  it("follows the OS live while the preference is system", () => {
    const os = stubSystemTheme("light");
    const { useTheme, useApplyTheme } = createThemeStore(freshKey());
    renderHook(() => useApplyTheme());
    act(() => os.set("dark"));
    expect(useTheme.getState().mode).toBe("dark");
    expect(isDark()).toBe(true);
    act(() => os.set("light"));
    expect(useTheme.getState().mode).toBe("light");
    expect(isDark()).toBe(false);
  });

  it("renders light, and does not throw, where there is no matchMedia to follow", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { useTheme, useApplyTheme } = createThemeStore(freshKey());
    expect(() => renderHook(() => useApplyTheme())).not.toThrow();
    expect(useTheme.getState()).toMatchObject({ preference: "system", mode: "light" });
    expect(isDark()).toBe(false);
  });

  it("stops following the OS once the user picks a theme, and when it unmounts", () => {
    const os = stubSystemTheme("light");
    const { useTheme, useApplyTheme } = createThemeStore(freshKey());
    const { unmount } = renderHook(() => useApplyTheme());
    expect(os.listeners.size).toBe(1);
    act(() => useTheme.getState().setPreference("light"));
    expect(os.listeners.size).toBe(0);
    act(() => os.set("dark"));
    expect(useTheme.getState().mode).toBe("light");
    expect(isDark()).toBe(false);
    act(() => useTheme.getState().setPreference("system"));
    expect(os.listeners.size).toBe(1);
    expect(isDark()).toBe(true);
    unmount();
    expect(os.listeners.size).toBe(0);
  });
});
