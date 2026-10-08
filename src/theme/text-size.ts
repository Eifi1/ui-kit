import { useEffect, useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "../lib/logger";
import { readStored } from "../lib/safe-storage";

/**
 * The text size (docs/text-size-harmonization.md §2.1, §3.1, §10.3, §10.6).
 *
 * ONE scale on `<html>`: `data-text-size="normal|large|xlarge"`, and `tokens.css` turns
 * it into `font-size: 100% / 125% / 150%` — percent, never px, so "Normal" keeps
 * whatever size the person set in the browser. Tailwind's spacing and type are rem, so
 * about 90 % of every screen grows with that one declaration; the breakpoints follow too
 * (tokens.css redefines `sm:` … `3xl:` per size, {@link useBreakpoint} answers the same
 * in JS).
 *
 * The names below are the mechanism's public vocabulary and are FROZEN: an app's
 * storage, its `/auth/me` column (server-kit's `TEXT_SIZES`) and the inline boot snippet
 * all spell them this way.
 */

/** The three steps, in order (§2.1, §10.6): server-kit's `TEXT_SIZES`, value for value. */
export const TEXT_SIZES = ["normal", "large", "xlarge"] as const;

export type TextSize = (typeof TEXT_SIZES)[number];

/** The root font size each step sets, as a factor of the browser's own (tokens.css). For
 *  what CSS cannot reach: a canvas or SVG chart's px constants, a windowed list's row
 *  estimate, a popover width in px (§3.2). */
export const TEXT_SCALE: Readonly<Record<TextSize, number>> = { normal: 1, large: 1.25, xlarge: 1.5 };

/** The attribute on `<html>` that carries the size. */
const TEXT_SIZE_ATTRIBUTE = "data-text-size";

export function isTextSize(value: unknown): value is TextSize {
  return value === "normal" || value === "large" || value === "xlarge";
}

/**
 * The size in force: **this device's own choice → the account's → Normal** (§2.2, §2.6).
 * Each is taken only when it is one of {@link TEXT_SIZES}; anything else (a stale value,
 * `null` = never chosen) falls through to the next. The one order the pre-paint call, the
 * apply hook and `useAccountAppearance` all use, so the three can never disagree.
 */
export function resolveTextSize(device: unknown, account?: unknown): TextSize {
  if (isTextSize(device)) return device;
  if (isTextSize(account)) return account;
  return "normal";
}

/* ── <html data-text-size> and the subscribers that read it ─────────────── */

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Also catches writers that are not this module — the inline boot snippet, an app
  // setting the attribute by hand, a test.
  if (!observer && typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    observer = new MutationObserver(notify);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [TEXT_SIZE_ATTRIBUTE] });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

/** The size `<html>` carries now; Normal without one (or outside a browser). */
export function readTextSize(): TextSize {
  if (typeof document === "undefined") return "normal";
  const value = document.documentElement.getAttribute(TEXT_SIZE_ATTRIBUTE);
  return isTextSize(value) ? value : "normal";
}

/** Put `size` on `<html>`. Every {@link useTextSize} re-renders with it. */
export function applyTextSize(size: TextSize): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.getAttribute(TEXT_SIZE_ATTRIBUTE) === size) return;
  root.setAttribute(TEXT_SIZE_ATTRIBUTE, size);
  notify();
}

export interface TextSizeInfo {
  size: TextSize;
  /** {@link TEXT_SCALE} for `size`: 1, 1.25 or 1.5. */
  scale: number;
}

/**
 * The size in force on this page, and its scale (§3.1) — read from `<html>`, so it needs
 * no store and works in every kit component: whoever applied the size (the app's store,
 * the pre-paint call, the inline snippet), this follows it.
 *
 * Only for what CSS cannot do. A class that should differ at Large is a `large:`
 * variant; a layout switch is a breakpoint, which already scales.
 */
export function useTextSize(): TextSizeInfo {
  const size = useSyncExternalStore(subscribe, readTextSize, () => "normal" as const);
  return useMemo(() => ({ size, scale: TEXT_SCALE[size] }), [size]);
}

/* ── Storage: the frozen format, the pre-paint call ─────────────────────── */

/**
 * What a text-size store persists under its key — zustand's persist envelope, and FROZEN
 * (§10.3) because an app's inline `<head>` snippet reads it before any module loads:
 *
 *     {"state":{"size":"large"},"version":1}
 *
 * `size` is one of {@link TEXT_SIZES}, or `null` / absent when this device never chose.
 * A future change adds a key; it never renames `state.size` or changes its values.
 */
export interface PersistedTextSize {
  state?: { size?: TextSize | null };
  version?: number;
}

/** This device's own choice under `storageKey`, or `null` when it never chose (or the
 *  storage is blocked, malformed, or holds a value that is not a size). */
export function readPersistedTextSize(storageKey: string): TextSize | null {
  try {
    const blob = JSON.parse(readStored(storageKey) ?? "null") as PersistedTextSize | null;
    const size = blob?.state?.size;
    return isTextSize(size) ? size : null;
  } catch {
    return null;
  }
}

export interface PersistedAppearanceOptions {
  /**
   * The account's last known value, for a device without a choice of its own (§10.3):
   * what the app persisted with its user (keksdose keeps `/auth/me` in localStorage), so
   * a cold boot paints the account's size instead of Normal and then jumping — offline
   * too. Called once, guarded: a throw counts as "no account value".
   */
  account?: () => string | null | undefined;
}

function readAccount(account: PersistedAppearanceOptions["account"]): unknown {
  if (!account) return undefined;
  try {
    return account();
  } catch {
    return undefined;
  }
}

/**
 * Pre-paint (§3.1, §10.3): read this device's choice under `storageKey` — else the
 * account's last known value — and put it on `<html>` BEFORE `createRoot`, next to
 * `applyPersistedTheme`, so the first paint already has the right size. Returns the size
 * applied.
 *
 * ```ts
 * applyPersistedTextSize("keksdose-text-size", {
 *   account: () => readPersistedUser()?.text_size,
 * });
 * ```
 */
export function applyPersistedTextSize(storageKey: string, options: PersistedAppearanceOptions = {}): TextSize {
  const size = resolveTextSize(readPersistedTextSize(storageKey), readAccount(options.account));
  applyTextSize(size);
  return size;
}

/**
 * The same pre-paint as {@link applyPersistedTextSize}, as an inline `<head>` script for
 * a boot splash painted from `index.html` before any module runs (§10.3). A function
 * EXPRESSION: call it with the storage key and, optionally, a function returning the
 * account's last known value.
 *
 * ```html
 * <script>
 *   (function(k,a){…})("keksdose-text-size", function () {
 *     return JSON.parse(localStorage.getItem("keksdose-auth")).state.user.text_size;
 *   });
 * </script>
 * ```
 *
 * Paste the constant's value in place of `(function(k,a){…})`. It reads the frozen
 * {@link PersistedTextSize} format, never throws, and sets only `data-text-size`; the
 * splash itself sizes in rem so the attribute reaches it (tokens.css, or the splash's own
 * `html[data-text-size=large]{font-size:125%}` if it paints before the stylesheet).
 */
export const TEXT_SIZE_INLINE_SCRIPT =
  "(function(k,a){function ok(v){return v==='normal'||v==='large'||v==='xlarge'}" +
  "var v=null;try{var s=JSON.parse(localStorage.getItem(k)||'null');v=s&&s.state&&s.state.size}catch(e){}" +
  "if(!ok(v)){v=null;try{v=a?a():null}catch(e){}}" +
  "try{document.documentElement.setAttribute('data-text-size',ok(v)?v:'normal')}catch(e){}})";

/* ── The store ──────────────────────────────────────────────────────────── */

export interface TextSizeState {
  /** This device's own choice (persisted), or `null` when it never chose — then the
   *  account's value applies (§2.2). */
  size: TextSize | null;
  /** Store this device's choice; `null` forgets it, so the account's applies again. */
  setSize: (size: TextSize | null) => void;
}

export interface ApplyTextSizeOptions {
  /** The account's value (`/auth/me`'s `text_size`): it applies while this device has no
   *  choice of its own. Leave it out where there is no account. */
  account?: string | null;
}

/**
 * Build a text-size store bound to a consumer-supplied localStorage key, shaped like
 * `createThemeStore` (§6). It holds the DEVICE's choice only; the account's value comes
 * in through `useApplyTextSize({ account })` and `useAccountAppearance`, and the size in
 * force is always {@link resolveTextSize} of the two.
 *
 * - `useTextSizeStore` — the zustand hook: `size` (device choice or null) and `setSize`.
 * - `useApplyTextSize({ account })` — the effect that puts the size in force on `<html>`.
 *   Mount it once near the root, beside `useApplyTheme`.
 *
 * The persisted format is {@link PersistedTextSize}, and frozen.
 */
export function createTextSizeStore(storageKey: string) {
  const useTextSizeStore = create<TextSizeState>()(
    logger(
      persist(
        (set) => ({
          size: null,
          setSize: (size) => set({ size: isTextSize(size) ? size : null }),
        }),
        {
          name: storageKey,
          version: 1,
          partialize: (s) => ({ size: s.size }),
          // A hand-edited or future value must not reach <html> as an unknown size.
          merge: (persisted, current) => ({
            ...current,
            size: isTextSize((persisted as { size?: unknown } | null)?.size)
              ? ((persisted as { size: TextSize }).size)
              : null,
          }),
        },
      ),
      "text-size",
    ),
  );

  function useApplyTextSize({ account }: ApplyTextSizeOptions = {}): TextSize {
    const device = useTextSizeStore((s) => s.size);
    const size = resolveTextSize(device, account);
    useEffect(() => {
      applyTextSize(size);
    }, [size]);
    return size;
  }

  return { useTextSizeStore, useApplyTextSize };
}

export type TextSizeStore = ReturnType<typeof createTextSizeStore>;
