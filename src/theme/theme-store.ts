import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "../lib/logger";

export type ThemeMode = "light" | "dark";
/** What the user chose; "system" tracks the OS `prefers-color-scheme`. */
export type ThemePreference = "light" | "dark" | "system";

export interface ThemeState {
  /** The user's choice (persisted). */
  preference: ThemePreference;
  /** The RESOLVED light/dark actually in effect (system → OS). Read this for
   *  anything that needs the concrete theme (e.g. token selection, toasts). */
  mode: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
  /** Set an explicit light/dark choice (preference follows). */
  setMode: (mode: ThemeMode) => void;
  /** Flip the effective theme to the opposite explicit choice. */
  toggle: () => void;
}

function systemPreference(): ThemeMode {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function resolve(preference: ThemePreference): ThemeMode {
  return preference === "system" ? systemPreference() : preference;
}

/** Normalize a persisted theme-state blob to a valid preference. Older blobs
 *  persisted the concrete `mode` (light/dark); carry that over as an explicit
 *  preference so the choice survives. Shared by the store's `migrate` and the
 *  pre-hydration {@link applyPersistedTheme}. */
function preferenceFromState(
  s: { mode?: string; preference?: string } | null | undefined,
): ThemePreference {
  if (s?.preference === "light" || s?.preference === "dark" || s?.preference === "system") {
    return s.preference;
  }
  if (s?.mode === "light" || s?.mode === "dark") return s.mode;
  return "system";
}

/** Toggle the `.dark` class on <html> for a resolved light/dark mode. */
function applyThemeClass(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

/**
 * Pre-hydration: read the theme PREFERENCE persisted under `storageKey` straight
 * from localStorage, resolve it to a concrete light/dark mode, and toggle the
 * `.dark` class on <html> — BEFORE React and the store mount, so the first paint
 * already has the right theme (no flash). Returns the resolved mode so the caller
 * can chain {@link applyPersistedPalette}. Encapsulates the zustand-persist
 * envelope + the legacy `mode`→`preference` fallback so apps never re-type the
 * storage shape in their entrypoint.
 */
export function applyPersistedTheme(storageKey: string): ThemeMode {
  let preference: ThemePreference = "system";
  try {
    const blob = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as {
      state?: { mode?: string; preference?: string };
    };
    preference = preferenceFromState(blob.state);
  } catch {
    /* malformed storage → system */
  }
  const mode = resolve(preference);
  applyThemeClass(mode);
  return mode;
}

/**
 * Build a theme store bound to a consumer-supplied localStorage key. Tracks a
 * light/dark/system PREFERENCE (feedback #330) and exposes the resolved `mode`.
 * Returns the `useTheme` hook plus a `useApplyTheme` effect that toggles the
 * `.dark` class on <html> and, while on "system", follows OS theme changes live.
 */
export function createThemeStore(storageKey: string) {
  const useTheme = create<ThemeState>()(
    logger(
      persist(
        (set, get) => ({
          preference: "system" as ThemePreference,
          mode: systemPreference(),
          setPreference: (preference) => set({ preference, mode: resolve(preference) }),
          setMode: (mode) => set({ preference: mode, mode }),
          toggle: () => {
            const next: ThemeMode = get().mode === "dark" ? "light" : "dark";
            set({ preference: next, mode: next });
          },
        }),
        {
          name: storageKey,
          version: 2,
          // Only the preference is persisted; `mode` is derived on load.
          partialize: (s) => ({ preference: s.preference }),
          migrate: (persistedState): { preference: ThemePreference } => ({
            preference: preferenceFromState(
              persistedState as { mode?: string; preference?: string } | null,
            ),
          }),
          onRehydrateStorage: () => (state) => {
            // The persisted preference decides the concrete mode at load.
            if (state) state.mode = resolve(state.preference);
          },
        },
      ),
      "theme",
    ),
  );

  function useApplyTheme(): void {
    const mode = useTheme((s) => s.mode);
    const preference = useTheme((s) => s.preference);
    useEffect(() => {
      applyThemeClass(mode);
    }, [mode]);
    // While tracking the system, follow OS theme changes live.
    useEffect(() => {
      if (preference !== "system") return;
      let mq: MediaQueryList;
      try {
        mq = window.matchMedia("(prefers-color-scheme: dark)");
      } catch {
        return;
      }
      const onChange = () => useTheme.setState({ mode: mq.matches ? "dark" : "light" });
      onChange();
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    }, [preference]);
  }

  return { useTheme, useApplyTheme };
}

export type ThemeStore = ReturnType<typeof createThemeStore>;
