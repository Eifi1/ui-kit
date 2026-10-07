import { useCallback, useMemo } from "react";

/**
 * Where the language on screen came from (docs/settings-harmonization.md §6.2), in the
 * order they are asked.
 */
export type AccountLanguageSource = "device" | "account" | "browser" | "default";

/** `de_ch`, `DE-ch` → `de-CH`: the case and separator a BCP 47 tag is written in. */
function canonicalTag(tag: string): string {
  const parts = tag.trim().replace(/_/g, "-").split("-").filter(Boolean);
  return parts
    .map((part, i) => {
      if (i === 0) return part.toLowerCase();
      if (part.length === 2) return part.toUpperCase();
      if (part.length === 4) return part[0].toUpperCase() + part.slice(1).toLowerCase();
      return part.toLowerCase();
    })
    .join("-");
}

/**
 * The offered language a tag means, or `null` — the client's half of server-kit's
 * `canonical_locale(tag, offered)` (§6.2): case and `_` normalised; an offered tag matches
 * exactly; otherwise the first offered tag of the same language (`de`, `de-DE` → `de-CH`
 * where `de-CH` is what the app offers); anything else is no match.
 */
export function matchOfferedLanguage(tag: string | null | undefined, offered: readonly string[]): string | null {
  if (!tag || !tag.trim()) return null;
  const wanted = canonicalTag(tag);
  const exact = offered.find((code) => canonicalTag(code) === wanted);
  if (exact !== undefined) return exact;
  const language = wanted.split("-")[0];
  return offered.find((code) => canonicalTag(code).split("-")[0] === language) ?? null;
}

export interface ResolveAccountLanguageInput {
  /** This device's own choice — made on this device, stored only when the user picks. */
  device: string | null | undefined;
  /** The signed-in account's `locale`; `undefined` while signed out. */
  account: string | null | undefined;
  /** The browser's languages, most wanted first (`navigator.languages`). */
  browser?: readonly string[];
  /** The languages the app offers. */
  offered: readonly string[];
  /** The app's default, when nothing else matches. */
  fallback: string;
}

export interface ResolvedAccountLanguage {
  language: string;
  source: AccountLanguageSource;
}

/**
 * The language on a device (§6.2): **its own choice → the account's locale → the
 * browser's language → the app's default**, each taken only when it names a language the
 * app offers. Pure: the order, without the storage.
 *
 * "At sign-in the account applies unless the device has its own choice" is this order and
 * nothing more: once the account's locale arrives it outranks the browser, never the
 * device's pick.
 */
export function resolveAccountLanguage(input: ResolveAccountLanguageInput): ResolvedAccountLanguage {
  const { device, account, browser = [], offered, fallback } = input;
  const fromDevice = matchOfferedLanguage(device, offered);
  if (fromDevice) return { language: fromDevice, source: "device" };
  const fromAccount = matchOfferedLanguage(account, offered);
  if (fromAccount) return { language: fromAccount, source: "account" };
  for (const tag of browser) {
    const fromBrowser = matchOfferedLanguage(tag, offered);
    if (fromBrowser) return { language: fromBrowser, source: "browser" };
  }
  return { language: fallback, source: "default" };
}

export interface UseAccountLanguageOptions {
  /** The signed-in account's `locale` (`/auth/me`). `undefined` while signed out or not
   *  loaded yet; `null` for an account with no language set. */
  account: string | null | undefined;
  /** This device's own choice — `<app>-lang` — or `null` when it was never picked here.
   *  Detection must not fill it (i18next's detector with `caches: []`, §6.2). */
  device: string | null | undefined;
  /** Store the device's own choice (`<app>-lang`). */
  setDevice: (code: string) => void;
  /** Write the account's locale: `PATCH /auth/me {locale}`. Return its promise. */
  save: (code: string) => unknown;
  /** A demo session: a pick stays on the device, the account is never written (§6.2). */
  isDemo?: boolean;
  /** The languages the app offers, as it writes them. */
  offered: readonly string[];
  /** The app's default language. */
  fallback: string;
  /** The browser's languages. Default: `navigator.languages`. */
  browser?: readonly string[];
}

export interface AccountLanguage extends ResolvedAccountLanguage {
  /**
   * The user picked `code` (the language card, the top bar's quick switch): it becomes the
   * device's own choice and — signed in, and not a demo — the account's locale. The
   * promise is `save`'s; the device keeps the pick if it fails, and the app says so.
   */
  pick: (code: string) => Promise<unknown>;
}

function navigatorLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
}

/**
 * The account's language on this device (§6.2, §10.8): the order of
 * {@link resolveAccountLanguage}, and the writes — so the three apps' copies go.
 *
 * - **Nothing writes the account on its own.** Rendering, signing in and adopting the
 *   account's locale call neither `save` nor `setDevice`; keksdose's
 *   `useSyncLanguageToAccount` (a PATCH on every session start) overwrote the account
 *   from a new device before that device could adopt it.
 * - **A pick** writes the device's choice, then `save` — except in a demo session, whose
 *   throwaway account needs no language (and model R refuses the write).
 *
 * The hook only answers; the app applies `language` (`i18n.changeLanguage`) where it
 * applies languages today.
 */
export function useAccountLanguage(options: UseAccountLanguageOptions): AccountLanguage {
  const { account, device, setDevice, save, isDemo = false, offered, fallback, browser } = options;
  const resolved = useMemo(
    () => resolveAccountLanguage({ device, account, browser: browser ?? navigatorLanguages(), offered, fallback }),
    [device, account, browser, offered, fallback],
  );
  const signedIn = account !== undefined;
  const pick = useCallback(
    (code: string) => {
      setDevice(code);
      if (isDemo || !signedIn) return Promise.resolve();
      try {
        return Promise.resolve(save(code));
      } catch (error) {
        return Promise.reject(error);
      }
    },
    [setDevice, save, isDemo, signedIn],
  );
  return { ...resolved, pick };
}
