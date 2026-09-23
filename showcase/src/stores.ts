import { useCallback, useState } from "react";
import { createThemeStore, createPaletteStore } from "@eifi1/ui-kit";

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
