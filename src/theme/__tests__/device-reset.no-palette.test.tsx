import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetDeviceSettings } from "../../lib/device-settings";
import { createThemeStore } from "../theme-store";
import { createPaletteStore } from "../palette-store";
import { createContrastStore } from "../contrast";
import { contrastStep, rememberedTokenSet } from "../contrast-tokens";
import { DEFAULT_PRESET } from "../palette-presets";

/**
 * The palette's reset is STATE ONLY (docs/settings-harmonization.md §11.4, KS 3.3), shown
 * in an app WITHOUT a palette layer — Kurvenschmiede: it creates a palette store but never
 * mounts `useApplyPalette`, its base tokens come from tokens.css. An imperative
 * `applyTokenSet` in the reset would remember a token set on <html>; the contrast store
 * would then take its palette branch, and a theme switch afterwards would no longer
 * re-write the stepped tokens for the new theme.
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
    const { usePalette } = createPaletteStore("test-np-palette", useTheme);
    const { useContrastStore, useApplyContrast } = createContrastStore("test-np-contrast");
    act(() => {
      useTheme.getState().setPreference("light");
      usePalette.getState().setId("ink");
      useContrastStore.getState().setContrast("standard");
    });
    // The account asks for More contrast, so More stays on after the device's choice goes.
    renderHook(() => {
      useApplyTheme();
      useApplyContrast({ account: "more" });
    });
    expect(root().getAttribute("data-contrast")).toBe("standard");

    act(() => void resetDeviceSettings());
    expect(usePalette.getState().id).toBe(DEFAULT_PRESET.id);
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
    expect(rememberedTokenSet(root())).toBeUndefined();
    expect(inline("--text-muted")).toBe(contrastStep(DEFAULT_PRESET.dark).textMuted);
    expect(inline("--brand")).toBe("");
  });
});
