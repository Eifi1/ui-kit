import { useCallback, useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyTextSize,
  applyTokenSet,
  createContrastStore,
  createTextSizeStore,
  createThemeStore,
  DEFAULT_PRESET,
  isTextSize,
  presetById,
  readStored,
  readStoredJson,
  registerDeviceSetting,
  resolveTextSize,
  writeStored,
  type HeatStops,
  type TextSize,
  type ThemeMode,
  type TokenSet,
} from "@eifi1/ui-kit";

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

/**
 * The top bar's preset switcher: the kit's own showcase only. No app offers a palette
 * choice; an app paints its one palette with `createFixedPalette` (the Tokens page). The
 * showcase keeps a choice so every page can be read under each of `PALETTES`, built here
 * from the public parts (`presetById`, `applyTokenSet`, the device registry) rather than
 * on the deprecated `createPaletteStore`.
 */
interface PresetChoice {
  id: string;
  setId: (id: string) => void;
}

export const usePalette = create<PresetChoice>()(
  persist((set) => ({ id: DEFAULT_PRESET.id, setId: (id) => set({ id }) }), { name: PALETTE_KEY, version: 1 }),
);
// The Settings page's device reset puts the Default back; `useApplyPalette` re-paints.
registerDeviceSetting({
  key: PALETTE_KEY,
  kind: "appearance",
  reset: () => usePalette.getState().setId(DEFAULT_PRESET.id),
});

const holdsPresetId = (blob: unknown): blob is { state: { id: string } } =>
  typeof (blob as { state?: { id?: unknown } } | null)?.state?.id === "string";

/** Before `createRoot` (main.tsx): the stored preset's set for `mode`, so the first paint
 *  is already the chosen preset. */
export function applyShowcasePalette(mode: ThemeMode): void {
  const id = readStoredJson(PALETTE_KEY, holdsPresetId)?.state.id ?? DEFAULT_PRESET.id;
  applyTokenSet(document.documentElement, presetById(id)[mode]);
}

/** The chosen preset's token set for the current theme. */
export function useActiveTokenSet(): TokenSet {
  const id = usePalette((s) => s.id);
  const mode = useTheme((s) => s.mode);
  return presetById(id)[mode];
}

/** Paints the chosen preset onto <html>, and again on every change of it or of the theme. */
export function useApplyPalette(): void {
  const tokens = useActiveTokenSet();
  useEffect(() => {
    applyTokenSet(document.documentElement, tokens);
  }, [tokens]);
}

export function useChartHex(): string[] {
  return useActiveTokenSet().chart;
}

export function useHeatStops(): HeatStops {
  return useActiveTokenSet().heat;
}

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

// Blocked storage (private mode, a partitioned webview) reads as the default and keeps
// the choice for this visit only: the kit's guard, as an app uses it (DUP-8).
const readSidebarStyle = (): SidebarStyle => (readStored(SIDEBAR_STYLE_KEY) === "inline" ? "inline" : "flyout");

/**
 * How the sidebar shows a group's pages — AppShell's `subNav`. A showcase setting
 * rather than a fixed choice because the two are the demonstration: the same `nav`
 * array rendered both ways, switchable on the frame you are reading it in.
 */
export function useSidebarStyle(): [SidebarStyle, (next: SidebarStyle) => void] {
  const [style, setStyle] = useState<SidebarStyle>(readSidebarStyle);
  const set = useCallback((next: SidebarStyle) => {
    setStyle(next);
    writeStored(SIDEBAR_STYLE_KEY, next);
  }, []);
  return [style, set];
}

export const CONTENTS_POSITION_KEY = "uikit-showcase-contents-position";

export type ContentsPosition = "start" | "end";

/** Which side of the page the contents rail sits on — `PageContentsLayout`'s
 *  `position`. Start (the left here) by default: next to the sidebar, so both
 *  navigations are in one place. */
export function useContentsPosition(): [ContentsPosition, (next: ContentsPosition) => void] {
  const [position, setPosition] = useState<ContentsPosition>(() =>
    readStored(CONTENTS_POSITION_KEY) === "end" ? "end" : "start",
  );
  const set = useCallback((next: ContentsPosition) => {
    setPosition(next);
    writeStored(CONTENTS_POSITION_KEY, next);
  }, []);
  return [position, set];
}
