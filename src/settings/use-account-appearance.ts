import { useCallback, useMemo } from "react";
import { isTextSize, resolveTextSize } from "../theme/text-size";
import type { TextSize } from "../theme/text-size";
import { isContrastMode, resolveContrastMode } from "../theme/contrast";
import type { ContrastMode } from "../theme/contrast";

/**
 * The text size and contrast follow the account like the language does
 * (docs/text-size-harmonization.md §2.2, §2.6, §6; settings contract §6.2) — the same
 * rule as {@link useAccountLanguage}, for two values at once.
 */

/** Where a value in force came from, in the order they are asked. */
export type AppearanceSource = "device" | "account" | "default";

/** The two fields of an `/auth/me` answer this reads — server-kit 0.6's `UserResponse`,
 *  both nullable (null = never chosen). */
export interface AccountAppearanceFields {
  text_size?: string | null;
  contrast?: string | null;
}

/** This device's own choices — the text-size and contrast stores' values, `null` where
 *  this device never chose. */
export interface DeviceAppearance {
  textSize?: string | null;
  contrast?: string | null;
}

/** The body of `PATCH /auth/me` for a pick: one field, as server-kit's `ProfileUpdate`
 *  spells it. */
export type AccountAppearancePatch = { text_size: TextSize } | { contrast: ContrastMode };

export interface ResolvedAccountAppearance {
  textSize: TextSize;
  /** The stored MODE — "system" included — not whether more contrast is on now. */
  contrast: ContrastMode;
  sources: { textSize: AppearanceSource; contrast: AppearanceSource };
}

function source(device: boolean, account: boolean): AppearanceSource {
  return device ? "device" : account ? "account" : "default";
}

/**
 * The values on a device (§2.6): **its own choice → the account's → the default**
 * (Normal; "system" for contrast), each taken only when it is a known value. Pure.
 */
export function resolveAccountAppearance(
  device: DeviceAppearance,
  account: AccountAppearanceFields | null | undefined,
): ResolvedAccountAppearance {
  return {
    textSize: resolveTextSize(device.textSize, account?.text_size),
    contrast: resolveContrastMode(device.contrast, account?.contrast),
    sources: {
      textSize: source(isTextSize(device.textSize), isTextSize(account?.text_size)),
      contrast: source(isContrastMode(device.contrast), isContrastMode(account?.contrast)),
    },
  };
}

export interface UseAccountAppearanceOptions {
  /** The signed-in account (`/auth/me`), or `null` / `undefined` while signed out or not
   *  loaded yet — then nothing is saved to it. */
  account: AccountAppearanceFields | null | undefined;
  /** This device's own choices: `useTextSizeStore((s) => s.size)` and
   *  `useContrastStore((s) => s.contrast)`. */
  device: DeviceAppearance;
  /** Store a device choice: `(patch) => { if (patch.textSize) setSize(patch.textSize);
   *  if (patch.contrast) setContrast(patch.contrast); }`. */
  setDevice: (patch: { textSize?: TextSize; contrast?: ContrastMode }) => void;
  /** Write the account: `PATCH /auth/me` with the patch as its body. Return its promise. */
  save: (patch: AccountAppearancePatch) => unknown;
  /** A demo session: a pick stays on the device, the account is never written (§6). */
  isDemo?: boolean;
}

export interface AccountAppearance extends ResolvedAccountAppearance {
  /** The user picked a size: it becomes the device's choice and — signed in, and not a
   *  demo — the account's. The promise is `save`'s; the device keeps the pick if it
   *  fails, and the app says so. */
  pickTextSize: (size: TextSize) => Promise<unknown>;
  /** As {@link pickTextSize}, for the contrast mode. */
  pickContrast: (mode: ContrastMode) => Promise<unknown>;
}

/**
 * The account's text size and contrast on this device (§6): the order of
 * {@link resolveAccountAppearance}, and the writes.
 *
 * - **Nothing writes the account on its own.** Rendering, signing in and adopting the
 *   account's values call neither `save` nor `setDevice`, so a new device adopts the
 *   account instead of overwriting it.
 * - **A pick** writes the device's choice, then `save` — except in a demo session or
 *   signed out.
 *
 * The hook only answers. The values are put in force by the stores' apply hooks, which
 * resolve the same order from the same inputs:
 *
 * ```tsx
 * useApplyTextSize({ account: me?.text_size });
 * useApplyContrast({ account: me?.contrast });
 * ```
 */
export function useAccountAppearance(options: UseAccountAppearanceOptions): AccountAppearance {
  const { account, device, setDevice, save, isDemo = false } = options;
  const deviceTextSize = device.textSize;
  const deviceContrast = device.contrast;
  const accountTextSize = account?.text_size;
  const accountContrast = account?.contrast;
  const signedIn = account !== null && account !== undefined;
  // By value, so a fresh `/auth/me` object with the same two fields changes nothing.
  const resolved = useMemo(
    () =>
      resolveAccountAppearance(
        { textSize: deviceTextSize, contrast: deviceContrast },
        signedIn ? { text_size: accountTextSize, contrast: accountContrast } : undefined,
      ),
    [deviceTextSize, deviceContrast, signedIn, accountTextSize, accountContrast],
  );
  const write = useCallback(
    (patch: AccountAppearancePatch) => {
      if (isDemo || !signedIn) return Promise.resolve();
      try {
        return Promise.resolve(save(patch));
      } catch (error) {
        return Promise.reject(error);
      }
    },
    [save, isDemo, signedIn],
  );
  const pickTextSize = useCallback(
    (size: TextSize) => {
      setDevice({ textSize: size });
      return write({ text_size: size });
    },
    [setDevice, write],
  );
  const pickContrast = useCallback(
    (mode: ContrastMode) => {
      setDevice({ contrast: mode });
      return write({ contrast: mode });
    },
    [setDevice, write],
  );
  return { ...resolved, pickTextSize, pickContrast };
}
