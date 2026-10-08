import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "../lib/logger";
import { readStored } from "../lib/safe-storage";
import { useMediaQuery } from "../hooks/use-media-query";
import { CONTRAST_STEPPED_VARS, contrastStep, rememberedTokenSet } from "./contrast-tokens";
import { applyTokenSet, DEFAULT_PRESET } from "./palette-presets";
import type { PersistedAppearanceOptions } from "./text-size";

/**
 * "More contrast" (docs/text-size-harmonization.md §2.4, §5, §10.5, §10.6): a switch
 * beside the text size, on by choice or — on "System" — when the device asks for more
 * contrast (`prefers-contrast: more`). Any text size.
 *
 * In force it is `<html data-contrast="more">` (else `"standard"`), which does two things:
 * - the inline colour tokens are re-written one step stronger (`applyTokenSet`'s
 *   contrast flag — see contrast-tokens.ts for what moves and why it is JS);
 * - tokens.css raises `--focus-ring-width` from 2 to 3 px and turns on the `contrast:`
 *   variant for anything else a component wants to change.
 *
 * The names below are frozen like the text size's: server-kit's `CONTRAST_MODES`, the
 * stored format, the attribute.
 */

/** The stored choices (§10.6): server-kit's `CONTRAST_MODES`. "system" IS a stored value
 *  — the PATCH rule refuses an explicit null, so null means only "never chosen". */
export const CONTRAST_MODES = ["system", "standard", "more"] as const;

export type ContrastMode = (typeof CONTRAST_MODES)[number];

/** What is in force on `<html data-contrast>`: a mode with "system" resolved. */
export type ContrastLevel = "standard" | "more";

const CONTRAST_ATTRIBUTE = "data-contrast";
const PREFERS_MORE_QUERY = "(prefers-contrast: more)";

export function isContrastMode(value: unknown): value is ContrastMode {
  return value === "system" || value === "standard" || value === "more";
}

/** The mode in force: **this device's own choice → the account's → "system"** (§2.6).
 *  The one order the pre-paint call, the apply hook and `useAccountAppearance` share. */
export function resolveContrastMode(device: unknown, account?: unknown): ContrastMode {
  if (isContrastMode(device)) return device;
  if (isContrastMode(account)) return account;
  return "system";
}

/** Whether the device asks for more contrast now. False without `matchMedia`. */
export function prefersMoreContrast(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(PREFERS_MORE_QUERY).matches
      : false;
  } catch {
    return false;
  }
}

/** A mode to the level it puts on `<html>`; "system" asks the device (or takes
 *  `prefersMore`, when the caller already knows). */
export function contrastLevel(mode: ContrastMode, prefersMore: boolean = prefersMoreContrast()): ContrastLevel {
  return mode === "more" || (mode === "system" && prefersMore) ? "more" : "standard";
}

/** The level `<html>` carries now; "standard" without one. */
export function readContrastLevel(): ContrastLevel {
  if (typeof document === "undefined") return "standard";
  return document.documentElement.getAttribute(CONTRAST_ATTRIBUTE) === "more" ? "more" : "standard";
}

/**
 * Re-write the contrast-dependent tokens on `el` for its current `data-contrast`.
 *
 * With a palette layer (`applyTokenSet` has written a set here), that set is applied
 * again and steps itself. Without one — an app whose base tokens come from tokens.css,
 * like Kurvenschmiede's — the four stepped tokens are written over the stylesheet for
 * the default preset in the current light/dark, or removed again.
 */
function reapplyContrastTokens(el: HTMLElement): void {
  const written = rememberedTokenSet(el);
  if (written) {
    applyTokenSet(el, written);
    return;
  }
  for (const name of CONTRAST_STEPPED_VARS) el.style.removeProperty(name);
  if (el.getAttribute(CONTRAST_ATTRIBUTE) !== "more") return;
  const step = contrastStep(DEFAULT_PRESET[el.classList.contains("dark") ? "dark" : "light"]);
  el.style.setProperty("--text-secondary", step.textSecondary);
  el.style.setProperty("--text-muted", step.textMuted);
  el.style.setProperty("--text-placeholder", step.textPlaceholder);
  el.style.setProperty("--border", step.border);
}

/** Put `level` on `<html>` and re-write the colour tokens for it. */
export function applyContrast(level: ContrastLevel): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute(CONTRAST_ATTRIBUTE, level);
  reapplyContrastTokens(root);
}

/* ── Storage: the frozen format, the pre-paint call ─────────────────────── */

/**
 * What a contrast store persists under its key — FROZEN, like the text size's:
 *
 *     {"state":{"contrast":"more"},"version":1}
 *
 * `contrast` is one of {@link CONTRAST_MODES}, or `null` / absent when this device never
 * chose.
 */
export interface PersistedContrast {
  state?: { contrast?: ContrastMode | null };
  version?: number;
}

/** This device's own choice under `storageKey`, or `null` when it never chose. */
export function readPersistedContrast(storageKey: string): ContrastMode | null {
  try {
    const blob = JSON.parse(readStored(storageKey) ?? "null") as PersistedContrast | null;
    const mode = blob?.state?.contrast;
    return isContrastMode(mode) ? mode : null;
  } catch {
    return null;
  }
}

/**
 * Pre-paint (§10.3, §10.5): this device's choice under `storageKey` — else the account's
 * last known value, else "system" — resolved against `prefers-contrast` and applied
 * BEFORE `createRoot`. Call it next to `applyPersistedPalette`, in EITHER order — the
 * palette steps itself when `data-contrast` is already set, and this re-applies the
 * palette's set when it is not; no app has to put one first (0.32.1, keksdose's 0.32
 * report asked which). Returns the level applied.
 */
export function applyPersistedContrast(storageKey: string, options: PersistedAppearanceOptions = {}): ContrastLevel {
  let account: unknown;
  try {
    account = options.account?.();
  } catch {
    account = undefined;
  }
  const level = contrastLevel(resolveContrastMode(readPersistedContrast(storageKey), account));
  applyContrast(level);
  return level;
}

/* ── The store ──────────────────────────────────────────────────────────── */

export interface ContrastState {
  /** This device's own choice (persisted), or `null` when it never chose — then the
   *  account's value applies, else "system". */
  contrast: ContrastMode | null;
  /** Store this device's choice; `null` forgets it. */
  setContrast: (contrast: ContrastMode | null) => void;
}

export interface ApplyContrastOptions {
  /** The account's value (`/auth/me`'s `contrast`): it applies while this device has no
   *  choice of its own. */
  account?: string | null;
}

/**
 * Build a contrast store bound to a consumer-supplied localStorage key, shaped like
 * `createThemeStore` and {@link createTextSizeStore} (§6). It holds the DEVICE's choice;
 * the account's value comes in through `useApplyContrast({ account })`.
 *
 * `useApplyContrast` — mount it once near the root, beside `useApplyPalette`:
 * - puts the level on `<html>` and steps the tokens;
 * - on "System", follows `prefers-contrast: more` live (§10.5);
 * - without a palette layer, re-writes the stepped tokens when the light/dark class
 *   changes, since they differ per theme.
 *
 * The persisted format is {@link PersistedContrast}, and frozen.
 */
export function createContrastStore(storageKey: string) {
  const useContrastStore = create<ContrastState>()(
    logger(
      persist(
        (set) => ({
          contrast: null,
          setContrast: (contrast) => set({ contrast: isContrastMode(contrast) ? contrast : null }),
        }),
        {
          name: storageKey,
          version: 1,
          partialize: (s) => ({ contrast: s.contrast }),
          merge: (persisted, current) => {
            const value = (persisted as { contrast?: unknown } | null)?.contrast;
            return { ...current, contrast: isContrastMode(value) ? value : null };
          },
        },
      ),
      "contrast",
    ),
  );

  function useApplyContrast({ account }: ApplyContrastOptions = {}): ContrastLevel {
    const device = useContrastStore((s) => s.contrast);
    // Subscribed whatever the mode (hooks cannot be skipped); only "system" reads it.
    const prefersMore = useMediaQuery(PREFERS_MORE_QUERY, false);
    const level = contrastLevel(resolveContrastMode(device, account), prefersMore);
    useEffect(() => {
      applyContrast(level);
    }, [level]);
    // Without a palette layer the stepped tokens are per theme: follow `.dark`.
    useEffect(() => {
      if (typeof MutationObserver === "undefined") return;
      const root = document.documentElement;
      const observer = new MutationObserver(() => {
        if (!rememberedTokenSet(root)) reapplyContrastTokens(root);
      });
      observer.observe(root, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }, []);
    return level;
  }

  return { useContrastStore, useApplyContrast };
}

export type ContrastStore = ReturnType<typeof createContrastStore>;
