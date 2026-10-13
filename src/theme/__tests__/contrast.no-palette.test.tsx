import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyContrast, createContrastStore } from "../contrast";
import { CONTRAST_STEPPED_VARS, contrastStep, rememberedTokenSet } from "../contrast-tokens";
import { DEFAULT_PRESET } from "../palette-presets";

/**
 * An app WITHOUT the palette layer (0.32; Kurvenschmiede: its base tokens come from tokens.css,
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

describe("the light well without a palette layer (0.36, colour-roles §13.3 decision 10)", () => {
  /** The five a light set steps beside the four text and line tokens. */
  const WELL_VARS = ["--bg-surface-2", "--money-income", "--money-expense", "--money-net", "--money-neutral"];
  const wellOf = (w: NonNullable<ReturnType<typeof contrastStep>["well"]>) => [
    w.bgSurface2,
    w.moneyIncome,
    w.moneyExpense,
    w.moneyNet,
    w.moneyNeutral,
  ];
  /** Never flipped into the palette branch: nothing remembered, no base token inline. */
  const stillNoPalette = () => {
    expect(rememberedTokenSet(document.documentElement)).toBeUndefined();
    expect(inline("--bg-page")).toBe("");
    expect(inline("--bg-surface")).toBe("");
  };

  it("light, More: writes all nine, the five as contrastStep's well", () => {
    act(() => applyContrast("more"));
    for (const name of CONTRAST_STEPPED_VARS) expect(inline(name), name).not.toBe("");
    expect(WELL_VARS.map(inline)).toEqual(wellOf(contrastStep(DEFAULT_PRESET.light).well!));
    expect(inline("--bg-surface-2")).toBe("#e3d9c7");
    stillNoPalette();
  });

  it("dark, More: writes the four and none of the five, so the stylesheet's dark well paints", () => {
    root().classList.add("dark");
    act(() => applyContrast("more"));
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET.dark.textSecondary);
    expect(inline("--border")).toBe(contrastStep(DEFAULT_PRESET.dark).border);
    for (const name of WELL_VARS) expect(inline(name), name).toBe("");
    stillNoPalette();
  });

  it("standard: none of the nine", () => {
    act(() => applyContrast("more"));
    act(() => applyContrast("standard"));
    for (const name of CONTRAST_STEPPED_VARS) expect(inline(name), name).toBe("");
    stillNoPalette();
  });

  it("drops the five on a light → dark switch under More, and writes them again on the way back", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const { useContrastStore, useApplyContrast } = createContrastStore("test-contrast-np-well");
    act(() => useContrastStore.getState().setContrast("more"));
    renderHook(() => useApplyContrast());
    expect(inline("--bg-surface-2")).toBe("#e3d9c7");

    await act(async () => {
      root().classList.add("dark");
      await Promise.resolve();
    });
    for (const name of WELL_VARS) expect(inline(name), name).toBe("");
    expect(inline("--text-muted")).toBe(DEFAULT_PRESET.dark.textSecondary);
    stillNoPalette();

    await act(async () => {
      root().classList.remove("dark");
      await Promise.resolve();
    });
    expect(WELL_VARS.map(inline)).toEqual(wellOf(contrastStep(DEFAULT_PRESET.light).well!));
    stillNoPalette();
  });
});
