import { useCallback, useEffect, useState } from "react";
import { createThemeStore, createPaletteStore } from "@eifi1/ui-kit";
// 0.32: from the source until the barrel names them (the coordinator wires src/index.ts).
import { applyTextSize, createTextSizeStore, isTextSize, resolveTextSize, type TextSize } from "../../src/theme/text-size";
import { createContrastStore } from "../../src/theme/contrast";

/**
 * The showcase's own theme + palette stores.
 *
 * Their own module, rather than inline in `main.tsx`, for the reason every consumer
 * ends up with the same file: the pre-hydration bootstrap and the React components
 * must agree on the literal storage key, and a key typed twice is a key that
 * eventually differs — which shows up as a theme flash on load and nowhere else.
 *
 * The factories are the kit's answer to several apps sharing one localStorage
 * origin in development: each app namespaces its own keys.
 */
export const THEME_KEY = "uikit-showcase-theme";
export const PALETTE_KEY = "uikit-showcase-palette";

export const { useTheme, useApplyTheme } = createThemeStore(THEME_KEY);
export const { usePalette, useApplyPalette, useActiveTokenSet, useChartHex, useHeatStops } =
  createPaletteStore(PALETTE_KEY, useTheme);

/** The text size and the contrast (0.32, docs/text-size-harmonization.md §6) — device
 *  choices only: the showcase has no account, so the sizes in force are the device's
 *  choice or the defaults (Normal, System). Pre-painted in `main.tsx` like the theme. */
export const TEXT_SIZE_KEY = "uikit-showcase-text-size";
export const CONTRAST_KEY = "uikit-showcase-contrast";

const textSizeStore = createTextSizeStore(TEXT_SIZE_KEY);
export const { useTextSizeStore } = textSizeStore;

/**
 * A size the URL asks for — `?text-size=large` before the hash — or null. The screen-size
 * preview's frames load the page this way, each at its own size (lib/device-preview.tsx),
 * and so does `scripts/screenshot-sizes.mjs`: the frames share the page's localStorage,
 * so a stored choice would put every frame at the same size, and writing one would move
 * the page behind them. Applied on top of the stored size and never stored itself.
 */
export const URL_TEXT_SIZE: TextSize | null = (() => {
  try {
    const value = new URLSearchParams(window.location.search).get("text-size");
    return isTextSize(value) ? value : null;
  } catch {
    return null;
  }
})();

/** The store's apply hook, with {@link URL_TEXT_SIZE} first: the size in force. */
export function useApplyTextSize(): TextSize {
  const device = useTextSizeStore((s) => s.size);
  const size = URL_TEXT_SIZE ?? resolveTextSize(device);
  useEffect(() => {
    applyTextSize(size);
  }, [size]);
  return size;
}
export const { useContrastStore, useApplyContrast } = createContrastStore(CONTRAST_KEY);

export const SIDEBAR_STYLE_KEY = "uikit-showcase-sidebar-style";

export type SidebarStyle = "flyout" | "inline";

function readSidebarStyle(): SidebarStyle {
  try {
    return window.localStorage.getItem(SIDEBAR_STYLE_KEY) === "inline" ? "inline" : "flyout";
  } catch {
    // blocked storage (private mode, partitioned webview) — the default it is
    return "flyout";
  }
}

/**
 * How the sidebar shows a group's pages — AppShell's `subNav`. A showcase setting
 * rather than a fixed choice because the two are the demonstration: the same `nav`
 * array rendered both ways, switchable on the frame you are reading it in.
 */
export function useSidebarStyle(): [SidebarStyle, (next: SidebarStyle) => void] {
  const [style, setStyle] = useState<SidebarStyle>(readSidebarStyle);
  const set = useCallback((next: SidebarStyle) => {
    setStyle(next);
    try {
      window.localStorage.setItem(SIDEBAR_STYLE_KEY, next);
    } catch {
      // ignore — the choice still holds for this visit
    }
  }, []);
  return [style, set];
}

export const CONTENTS_POSITION_KEY = "uikit-showcase-contents-position";

export type ContentsPosition = "start" | "end";

/** Which side of the page the contents rail sits on — `PageContentsLayout`'s
 *  `position`. Start (the left here) by default: next to the sidebar, so both
 *  navigations are in one place. */
export function useContentsPosition(): [ContentsPosition, (next: ContentsPosition) => void] {
  const [position, setPosition] = useState<ContentsPosition>(() => {
    try {
      return window.localStorage.getItem(CONTENTS_POSITION_KEY) === "end" ? "end" : "start";
    } catch {
      return "start";
    }
  });
  const set = useCallback((next: ContentsPosition) => {
    setPosition(next);
    try {
      window.localStorage.setItem(CONTENTS_POSITION_KEY, next);
    } catch {
      // ignore — the choice still holds for this visit
    }
  }, []);
  return [position, set];
}
