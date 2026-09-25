import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { hu } from "./hu";
import { it } from "./it";
import { zh } from "./zh";
import type { Dictionary } from "./types";

/**
 * The runtime behind the top bar's language menu.
 *
 * There is no i18n library here and there is not going to be one: the kit's contract is
 * that a consuming app owns its strings and hands them in as props, so the showcase has
 * to demonstrate exactly that — a dictionary in context, a hook to read it, and label
 * bundles threaded into the components. That is the whole runtime. Anything larger would
 * be demonstrating the library instead of the contract.
 *
 * Written as `.ts`, not `.tsx`, so the provider is built with `createElement` rather than
 * JSX. One element is not worth a second file extension in this folder.
 */

/* ── Registry ──────────────────────────────────────────────────────────────── */

/**
 * Every dictionary the showcase ships, in menu order.
 *
 * ADD A LOCALE HERE AND NOWHERE ELSE: import it and append it. The menu, the persisted
 * preference and the `<html lang>` effect all read this array, so a dictionary that is
 * not in it does not exist, and one that is in it needs no other wiring.
 */
export const LOCALES: Dictionary[] = [en, de, fr, it, es, hu, zh];

/**
 * The seven locales the showcase plans for. This is the address space, not the inventory
 * — a code is only selectable once its dictionary is in `LOCALES` above, which is what
 * keeps a half-finished translation off the menu instead of on it with English holes.
 *
 * They are the seven languages the consuming apps are shipped in or planned for. English
 * comes first because it is the reference every other dictionary is written against
 * (en.ts is a transcription of the kit's own defaults); the rest follow in the order the
 * apps take them on. German is the one the apps actually ship today, and the longest of
 * the seven, so it is the locale that breaks a layout first.
 */
export const LOCALE_CODES = ["en", "de", "fr", "it", "es", "hu", "zh"] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

export const DEFAULT_LOCALE_CODE: LocaleCode = "en";

/** Namespaced like the theme and palette keys in stores.ts — several apps share one
 *  localStorage origin in development, and an un-namespaced "locale" collides. */
export const LOCALE_STORAGE_KEY = "uikit-showcase-locale";

function isLocaleCode(value: string): value is LocaleCode {
  return (LOCALE_CODES as readonly string[]).includes(value);
}

/** The code a dictionary is addressed by: the primary subtag of its BCP-47 `tag`.
 *  `tag` stays full ("en-GB", "zh-CN") because `Intl` and `<html lang>` want the
 *  region; the menu, the URL and the stored preference want the short code. */
export function localeCode(dict: Dictionary): LocaleCode {
  const primary = dict.tag.split("-")[0].toLowerCase();
  return isLocaleCode(primary) ? primary : DEFAULT_LOCALE_CODE;
}

/** The dictionary for `code`, or English. Deliberately total: a stale value in
 *  localStorage, a locale removed from `LOCALES`, or a full tag where a code was
 *  expected all resolve to English rather than to `undefined` three renders later. */
export function dictionaryFor(code: string): Dictionary {
  const wanted = code.split("-")[0].toLowerCase();
  return LOCALES.find((dict) => localeCode(dict) === wanted) ?? en;
}

/** Ready to hand to the kit's `LanguageMenu`, which takes `{ code, label, country }`
 *  and keys its flag off the ISO-3166 country — deliberately not the language code. */
export const LOCALE_OPTIONS: Array<{ code: LocaleCode; label: string; country: string }> =
  LOCALES.map((dict) => ({ code: localeCode(dict), label: dict.name, country: dict.country }));

/* ── Persistence ───────────────────────────────────────────────────────────── */

/**
 * `localStorage`, guarded — the same guard as the kit's `src/lib/safe-storage.ts`,
 * repeated here because that module is internal to the package and the showcase imports
 * `@eifi1/ui-kit` exactly as a consumer does.
 *
 * Reading `window.localStorage` THROWS rather than returning null where site data is
 * blocked: Safari private browsing, a partitioned webview, Chrome with third-party site
 * data off. An unguarded read in this provider is not a lost language preference, it is
 * a blank page — the provider wraps the entire app, so the throw happens during the
 * first render of everything. A preference that cannot be read is indistinguishable
 * from one that was never set, and the right answer for both is the default.
 */
function readStoredCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    // blocked, partitioned, or disabled — fall back to the default locale
    return null;
  }
}

function writeStoredCode(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    // ignore (private mode, quota, partitioned storage)
  }
}

/* ── Context ───────────────────────────────────────────────────────────────── */

interface LocaleContextValue {
  dict: Dictionary;
  code: LocaleCode;
  setCode: (code: string) => void;
}

/**
 * The default is English rather than `null`, so `useT()` never throws and never has to
 * be null-checked at 40 call sites. A section rendered on its own in a test gets English
 * and renders; it does not explode because a provider is missing from the fixture.
 */
const LocaleContext = createContext<LocaleContextValue>({
  dict: en,
  code: DEFAULT_LOCALE_CODE,
  setCode: () => {},
});

export interface LocaleProviderProps {
  children: ReactNode;
  /** Seeds the locale instead of the stored preference. For tests and for a future
   *  `?lang=` — it is the initial value only, not a controlled prop. */
  initialCode?: string;
}

export function LocaleProvider({ children, initialCode }: LocaleProviderProps) {
  // Lazy initialiser, so the storage read happens on mount rather than at module scope:
  // this module is imported by a jsdom test and by the pre-render bundle, and neither
  // has any business touching `window` when the file is merely evaluated.
  const [code, setResolvedCode] = useState<LocaleCode>(() =>
    localeCode(dictionaryFor(initialCode ?? readStoredCode() ?? DEFAULT_LOCALE_CODE)),
  );

  const dict = useMemo(() => dictionaryFor(code), [code]);

  const setCode = useCallback((next: string) => {
    // Resolve before storing: what goes in localStorage is always a code that resolves
    // to a dictionary, so the next visit cannot be poisoned by a typo'd query parameter.
    const resolved = localeCode(dictionaryFor(next));
    setResolvedCode(resolved);
    writeStoredCode(resolved);
  }, []);

  /**
   * The two attributes that make a language real to the browser rather than to the eye.
   *
   * `lang` is what a screen reader takes its pronunciation and its voice from, and what
   * `:lang()` and hyphenation read. `dir` is still applied although none of the current
   * seven locales is right-to-left: every logical property in the kit's CSS (`ms-*`,
   * `pe-*`, `text-start`) resolves against it, so a right-to-left dictionary added later
   * flips the whole frame with no other wiring.
   *
   * In an effect, not in render: this writes to a DOM node outside React's tree.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.lang = dict.tag;
    root.dir = dict.dir;
    // No cleanup: these attributes belong to the document for as long as the app is
    // mounted, and restoring them on unmount would only flash the page back to English
    // on the way out.
  }, [dict.tag, dict.dir]);

  const value = useMemo<LocaleContextValue>(() => ({ dict, code, setCode }), [dict, code, setCode]);

  return createElement(LocaleContext.Provider, { value }, children);
}

/* ── Hooks ─────────────────────────────────────────────────────────────────── */

/** The active dictionary. `const t = useT()` then `t.chrome.language`. */
export function useT(): Dictionary {
  return useContext(LocaleContext).dict;
}

export interface LocaleHandle {
  code: LocaleCode;
  setCode: (code: string) => void;
  dir: Dictionary["dir"];
  /** Full BCP-47 tag — pass it to every `Intl` formatter on the page. */
  tag: string;
}

/** The active locale and the way to change it, for the menu and for `Intl`. */
export function useLocale(): LocaleHandle {
  const { dict, code, setCode } = useContext(LocaleContext);
  return useMemo(
    () => ({ code, setCode, dir: dict.dir, tag: dict.tag }),
    [code, setCode, dict.dir, dict.tag],
  );
}

/**
 * A page's title and blurb, tolerant of a slug this dictionary has never heard of.
 *
 * `Dictionary` cannot omit a FIELD — that is what its non-optional keys buy. But `pages`
 * is keyed by route slug, and slugs are added and renamed far more often than the seven
 * dictionaries are revisited: a new page must appear in English everywhere rather than
 * appear as `undefined` in six languages. Falls through to English, then to the slug
 * itself, which is at least a string and at most a visible reminder to translate it.
 */
export function usePageText(slug: string): { title: string; blurb: string } {
  const dict = useT();
  return dict.pages[slug] ?? en.pages[slug] ?? { title: slug, blurb: "" };
}

/** A sidebar group's name, keyed by its English label — same tolerance, same reason:
 *  the key is data from `routes.tsx`, not a field of `Dictionary`. */
export function useGroupLabel(label: string): string {
  const dict = useT();
  return dict.groups[label] ?? en.groups[label] ?? label;
}

export type { Dictionary, PageSlug } from "./types";
export { en } from "./en";
export { de } from "./de";
export { fr } from "./fr";
export { it } from "./it";
export { es } from "./es";
export { hu } from "./hu";
export { zh } from "./zh";
