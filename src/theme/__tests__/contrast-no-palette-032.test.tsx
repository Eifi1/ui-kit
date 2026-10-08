import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyContrast, createContrastStore } from "../contrast";
import { DEFAULT_PRESET } from "../palette-presets";

/**
 * An app WITHOUT the palette layer (Kurvenschmiede: its base tokens come from tokens.css,
 * nothing calls `applyTokenSet`). More contrast must still reach it (§10.5): the four
 * stepped tokens are written over the stylesheet for the default preset, cleared again
 * on Standard, and re-written when the light/dark class flips, since they differ per
 * theme.
 *
 * Its own file on purpose: the kit remembers the set `applyTokenSet` last wrote to an
 * element, and in this file nothing ever writes one to <html>.
 */

const root = () => document.documentElement;
const inline = (name: string) => root().style.getPropertyValue(name);

afterEach(() => {
  root().removeAttribute("data-contrast");
  root().removeAttribute("style");
  root().classList.remove("dark");
  vi.unstubAllGlobals();
});

describe("More contrast without a palette layer", () => {
  it("writes only the stepped tokens, and clears them on Standard", () => {
    act(() => applyContrast("more"));
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET.light.textSecondary);
    expect(inline("--text-placeholder")).toBe(DEFAULT_PRESET.light.textMuted);
    expect(inline("--border")).not.toBe("");
    // The base tokens stay the stylesheet's.
    expect(inline("--bg-surface")).toBe("");
    expect(inline("--text-primary")).toBe("");

    act(() => applyContrast("standard"));
    expect(root().getAttribute("style") ?? "").toBe("");
  });

  it("follows the theme class while More is on", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { useContrastStore, useApplyContrast } = createContrastStore("test-contrast-np");
    act(() => useContrastStore.getState().setContrast("more"));
    renderHook(() => useApplyContrast());
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET.light.textSecondary);

    await act(async () => {
      root().classList.add("dark");
      await Promise.resolve();
    });
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET.dark.textSecondary);
  });
});
