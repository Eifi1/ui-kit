import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { contrast } from "../color";
import {
  CONTRAST_MODES,
  applyContrast,
  applyPersistedContrast,
  contrastLevel,
  createContrastStore,
  readPersistedContrast,
  resolveContrastMode,
} from "../contrast";
import { DEFAULT_PRESET, PALETTES, applyTokenSet, presetById, type TokenSet } from "../palette-presets";
import { createPaletteStore } from "../palette-store";
import { createThemeStore } from "../theme-store";

/**
 * More contrast (docs/text-size-harmonization.md §5, §10.5, §10.6): the token step
 * `applyTokenSet` makes inline, the cooperation with the palette layer, the stored
 * vocabulary and pre-paint, and "System" following `prefers-contrast: more` live.
 */

const KEY = "test-contrast";
const root = () => document.documentElement;
const inline = (name: string) => root().style.getPropertyValue(name);
const worst = (color: string, t: TokenSet) =>
  Math.min(contrast(color, t.bgPage), contrast(color, t.bgSurface), contrast(color, t.bgSurface2));

afterEach(() => {
  localStorage.clear();
  root().removeAttribute("data-contrast");
  root().removeAttribute("style");
  root().classList.remove("dark");
  vi.unstubAllGlobals();
});

/** A `matchMedia` whose `(prefers-contrast: more)` answer the test flips. */
function stubPrefersMore(initial: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initial,
    media: "(prefers-contrast: more)",
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal("matchMedia", (query: string) =>
    query.includes("prefers-contrast") ? mql : { matches: false, addEventListener() {}, removeEventListener() {} },
  );
  return (matches: boolean) => {
    mql.matches = matches;
    for (const fn of listeners) fn();
  };
}

describe("the vocabulary", () => {
  it("is server-kit's CONTRAST_MODES, with system as a stored value", () => {
    expect(CONTRAST_MODES).toEqual(["system", "standard", "more"]);
    expect(resolveContrastMode("more", "standard")).toBe("more");
    expect(resolveContrastMode(null, "standard")).toBe("standard");
    expect(resolveContrastMode(null, null)).toBe("system");
    expect(resolveContrastMode("loud", undefined)).toBe("system");
  });

  it("resolves system against the device", () => {
    expect(contrastLevel("system", true)).toBe("more");
    expect(contrastLevel("system", false)).toBe("standard");
    expect(contrastLevel("standard", true)).toBe("standard");
    expect(contrastLevel("more", false)).toBe("more");
  });
});

describe("applyTokenSet's contrast flag — the step (§5)", () => {
  for (const preset of PALETTES) {
    for (const mode of ["light", "dark"] as const) {
      it(`steps ${preset.id} ${mode} to stronger text and lines`, () => {
        const t = preset[mode];
        const el = document.createElement("div");
        applyTokenSet(el, t, true);
        const value = (name: string) => el.style.getPropertyValue(name);

        // muted becomes secondary; secondary moves toward primary.
        expect(value("--text-muted")).toBe(t.textSecondary);
        expect(worst(value("--text-secondary"), t)).toBeGreaterThan(worst(t.textSecondary, t));
        // The placeholder — derived in CSS otherwise — is written inline, and clears AA.
        expect(worst(value("--text-placeholder"), t)).toBeGreaterThanOrEqual(4.5);
        // Borders clear WCAG 1.4.11's 3:1 on every surface.
        expect(worst(value("--border"), t)).toBeGreaterThanOrEqual(3);
        expect(worst(value("--border"), t)).toBeGreaterThan(worst(t.border, t));
        // Nothing else moves.
        expect(value("--text-primary")).toBe(t.textPrimary);
        expect(value("--bg-surface")).toBe(t.bgSurface);
        expect(value("--brand")).toBe(t.brand);
      });
    }
  }

  it("writes the plain set and drops the inline placeholder without it", () => {
    const t = DEFAULT_PRESET.light;
    const el = document.createElement("div");
    applyTokenSet(el, t, true);
    applyTokenSet(el, t, false);
    expect(el.style.getPropertyValue("--text-muted")).toBe(t.textMuted);
    expect(el.style.getPropertyValue("--border")).toBe(t.border);
    expect(el.style.getPropertyValue("--text-placeholder")).toBe("");
  });

  it("defaults the flag to the element's own data-contrast", () => {
    const t = DEFAULT_PRESET.dark;
    const el = document.createElement("div");
    el.setAttribute("data-contrast", "more");
    applyTokenSet(el, t);
    expect(el.style.getPropertyValue("--text-muted")).toBe(t.textSecondary);
    el.setAttribute("data-contrast", "standard");
    applyTokenSet(el, t);
    expect(el.style.getPropertyValue("--text-muted")).toBe(t.textMuted);
  });
});

describe("the palette and the contrast cooperate", () => {
  it("re-applies the palette's set when the contrast changes, and keeps it across a palette change", () => {
    const ink = presetById("ink").light;
    applyTokenSet(root(), ink);
    act(() => applyContrast("more"));
    expect(root().getAttribute("data-contrast")).toBe("more");
    expect(inline("--text-muted")).toBe(ink.textSecondary);

    // A palette change while More is on keeps More.
    const moss = presetById("moss").light;
    applyTokenSet(root(), moss);
    expect(inline("--text-muted")).toBe(moss.textSecondary);

    act(() => applyContrast("standard"));
    expect(inline("--text-muted")).toBe(moss.textMuted);
    expect(inline("--text-placeholder")).toBe("");
  });

  it("through the stores: useApplyPalette and useApplyContrast in one tree", () => {
    const { useTheme } = createThemeStore("test-theme");
    const { usePalette, useApplyPalette } = createPaletteStore("test-palette", useTheme);
    const { useContrastStore, useApplyContrast } = createContrastStore(KEY);
    stubPrefersMore(false);
    renderHook(() => {
      useApplyPalette();
      return useApplyContrast();
    });
    const mode = useTheme.getState().mode;
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET[mode].textMuted);

    act(() => useContrastStore.getState().setContrast("more"));
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET[mode].textSecondary);

    act(() => usePalette.getState().setId("plum"));
    expect(inline("--text-muted")).toBe(presetById("plum")[mode].textSecondary);
  });
});

describe("storage and pre-paint", () => {
  function store(value: unknown) {
    localStorage.setItem(KEY, JSON.stringify({ state: { contrast: value }, version: 1 }));
  }

  it("reads the frozen {state:{contrast}} format", () => {
    store("more");
    expect(readPersistedContrast(KEY)).toBe("more");
    store("system");
    expect(readPersistedContrast(KEY)).toBe("system");
    store("loud");
    expect(readPersistedContrast(KEY)).toBeNull();
  });

  it("applies the device's choice, else the account's, else System", () => {
    stubPrefersMore(false);
    store("more");
    expect(applyPersistedContrast(KEY, { account: () => "standard" })).toBe("more");
    expect(root().getAttribute("data-contrast")).toBe("more");

    localStorage.clear();
    expect(applyPersistedContrast(KEY, { account: () => "more" })).toBe("more");
    expect(applyPersistedContrast(KEY)).toBe("standard");
    expect(root().getAttribute("data-contrast")).toBe("standard");
  });

  it("resolves System against prefers-contrast before first paint", () => {
    stubPrefersMore(true);
    expect(applyPersistedContrast(KEY)).toBe("more");
    store("standard");
    expect(applyPersistedContrast(KEY)).toBe("standard");
  });

  it("persists a choice in the frozen format", () => {
    const { useContrastStore } = createContrastStore(KEY);
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => useContrastStore.getState().setContrast("system"));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ state: { contrast: "system" }, version: 1 });
  });
});

describe("useApplyContrast", () => {
  it("on System, follows a prefers-contrast change live (§10.5)", () => {
    const flip = stubPrefersMore(false);
    applyTokenSet(root(), DEFAULT_PRESET.light);
    const { useApplyContrast } = createContrastStore(KEY);
    const { result } = renderHook(() => useApplyContrast());
    expect(result.current).toBe("standard");
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET.light.textMuted);

    act(() => flip(true));
    expect(result.current).toBe("more");
    expect(root().getAttribute("data-contrast")).toBe("more");
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET.light.textSecondary);

    act(() => flip(false));
    expect(root().getAttribute("data-contrast")).toBe("standard");
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET.light.textMuted);
  });

  it("ignores the device's preference once a mode is chosen", () => {
    const flip = stubPrefersMore(true);
    const { useContrastStore, useApplyContrast } = createContrastStore(KEY);
    act(() => useContrastStore.getState().setContrast("standard"));
    const { result } = renderHook(() => useApplyContrast());
    expect(result.current).toBe("standard");
    act(() => flip(false));
    act(() => flip(true));
    expect(result.current).toBe("standard");
  });

  it("takes the account's mode while the device has none", () => {
    stubPrefersMore(false);
    const { useContrastStore, useApplyContrast } = createContrastStore(KEY);
    const { result, rerender } = renderHook(({ account }: { account?: string | null }) => useApplyContrast({ account }), {
      initialProps: { account: "more" as string | null | undefined },
    });
    expect(result.current).toBe("more");
    act(() => useContrastStore.getState().setContrast("standard"));
    expect(result.current).toBe("standard");
    rerender({ account: null });
    expect(result.current).toBe("standard");
  });
});
