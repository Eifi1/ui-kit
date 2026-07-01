import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "../lib/logger";

export type ThemeMode = "light" | "dark";

export interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

function systemPreference(): ThemeMode {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/**
 * Build a light/dark theme store bound to a consumer-supplied localStorage key,
 * so each app persists its own preference under its own namespace. Returns the
 * `useTheme` hook plus a `useApplyTheme` effect hook that toggles the `.dark`
 * class on <html>.
 */
export function createThemeStore(storageKey: string) {
  const useTheme = create<ThemeState>()(
    logger(
      persist(
        (set, get) => ({
          mode: systemPreference(),
          setMode: (mode) => set({ mode }),
          toggle: () => set({ mode: get().mode === "dark" ? "light" : "dark" }),
        }),
        {
          name: storageKey,
          version: 1,
          migrate: (persistedState, version) => {
            const s = persistedState as { mode?: string } | null;
            if (version < 1 && s?.mode === "system") {
              return { mode: systemPreference() } as ThemeState;
            }
            return persistedState as ThemeState;
          },
        },
      ),
      "theme",
    ),
  );

  function apply(mode: ThemeMode): void {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }

  function useApplyTheme(): void {
    const mode = useTheme((s) => s.mode);
    useEffect(() => {
      apply(mode);
    }, [mode]);
  }

  return { useTheme, useApplyTheme };
}

export type ThemeStore = ReturnType<typeof createThemeStore>;
