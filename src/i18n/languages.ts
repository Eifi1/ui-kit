import type { UiKitLabels } from "./kit-labels";
import type { LanguageOption } from "../shell/topbar-controls";

/**
 * "Which language is this reader in, and what does the kit say in it?" — the one
 * answer the three apps each wrote for themselves (docs/i18n-harmonization.md, H2).
 *
 * kastlan, keksdose and Kurvenschmiede all ship a subset of the same seven languages,
 * and every one of them hand-rolled the same three things: a list of languages with
 * their names and flags, a rule for turning what a browser asks for (`de-AT`, `zh-TW`,
 * `en-AU`) into a code the app ships, and a bridge from that code to the kit's label
 * catalogue. The three disagreed where nobody was looking: a reader asking for `zh-TW`
 * got German in kastlan and Chinese in Kurvenschmiede; keksdose's English got the raw
 * defaults, so its counts read "12345" where the other two wrote "12,345"; kastlan
 * formatted French as `fr-CH` and Kurvenschmiede as `fr-FR`. None of it was a decision.
 * This module makes it one, in one place, tested once.
 *
 * WHAT IT IS NOT: an i18n library. It resolves no app strings, carries no detector and
 * depends on nothing — the app keeps i18next (or whatever it uses) for its own words and
 * asks this module only the questions the kit can answer for all three apps alike:
 *   - {@link KIT_LANGUAGES}: the seven codes, each with its own name, its English name,
 *     the flag it flies and the locale it formats in;
 *   - {@link resolveLanguage}: which of the codes an app offers answers a reader;
 *   - {@link formatLocaleOf}: the `Intl` tag for a code (the provider's `locale`,
 *     `<html lang>`, every `toLocaleString` in the app);
 *   - {@link loadUiKitLabels}: the kit's catalogue for a code, fetched on demand;
 *   - {@link languageOptions}: the rows `LanguageMenu` and `LanguageSetting` take.
 *
 * THE CODE AND THE FORMATTING LOCALE ARE TWO THINGS (Kurvenschmiede's insight, made
 * the rule). The code names a catalogue — what the account stores, what i18next
 * resolves, what a mail is chosen by — and a bare `en` says nothing about how a date is
 * written. Each language formats like its home (Marcel, 2026-10-02, H6): `de-CH`,
 * `en-GB` (British, like the spelling), `es-ES`, `fr-FR`, `it-IT`, `hu-HU`, `zh-CN`. An
 * app that must format otherwise — kastlan's QR bill follows the SIX spec, not the
 * reader — passes its own locale where it needs it; the registry is the default.
 *
 * THERE IS ONE GERMAN, `de-CH`: Swiss Standard German, formal (0.18). Every other
 * German a browser or an old localStorage can hand over — `de`, `de-DE`, `de-AT`,
 * `de-LI`, the briefly offered `de-informal` / `de-CH-informal` — is read as it.
 * Its name is plain "Deutsch": it is the only German, so there is nothing to tell it
 * apart from, and the Swiss flag beside it is what says where the spelling comes from.
 *
 * AND ONE CHINESE, `zh`, WHICH IS SIMPLIFIED. `zh-TW`, `zh-HK` and `zh-Hant` resolve to
 * it: there is no Traditional catalogue, and a reader of Traditional characters reads
 * Simplified far more readily than whichever second language a fallback would guess
 * at (Kurvenschmiede's reasoning, now everyone's). Its name says "简体中文" so that
 * reader sees what they are getting before they pick it.
 */

/** The seven languages the kit ships a catalogue for. An app offers a subset. */
export type KitLanguageCode = "de-CH" | "en" | "es" | "fr" | "it" | "hu" | "zh";

/** One language the kit ships: what it is called, which flag it flies and which
 *  BCP 47 tag it formats in. */
export interface KitLanguage {
  /** The catalogue code — what an app stores, sends and hands i18next. */
  readonly code: KitLanguageCode;
  /** The language's name in itself, for a switcher: the reader looking for theirs may
   *  not read the language the page is currently in. */
  readonly nativeName: string;
  /** The name in English, for places that list languages to a team rather than to a
   *  reader (a translation review's locale column, an admin's reviewer grant). */
  readonly englishName: string;
  /** The BCP 47 tag the language formats numbers and dates in, and declares itself in
   *  on `<html lang>`. See {@link formatLocaleOf}. */
  readonly formatLocale: string;
  /** ISO 3166-1 alpha-2 country (lowercase) for flag-icons' `fi fi-<flag>` class —
   *  NOT the language code: English flies the UK flag, German the Swiss one, Chinese
   *  the PRC's (the catalogue is Simplified). The kit renders the class name only; the
   *  app supplies the flag stylesheet (README, "What you install alongside it"). */
  readonly flag: string;
}

/**
 * Every language the kit ships, in the order a switcher lists them: alphabetical by
 * native name (Deutsch, English, Español … 简体中文), which is what a reader scanning for
 * their own language's name expects.
 *
 * An app offering four of them passes those four codes to {@link resolveLanguage} and
 * {@link languageOptions}; it does not copy this list. A language added here is one the
 * kit has a catalogue for (the loader map below is typed by {@link KitLanguageCode}, so
 * a code without one does not compile).
 */
export const KIT_LANGUAGES: readonly KitLanguage[] = [
  { code: "de-CH", nativeName: "Deutsch", englishName: "German", formatLocale: "de-CH", flag: "ch" },
  { code: "en", nativeName: "English", englishName: "English", formatLocale: "en-GB", flag: "gb" },
  { code: "es", nativeName: "Español", englishName: "Spanish", formatLocale: "es-ES", flag: "es" },
  { code: "fr", nativeName: "Français", englishName: "French", formatLocale: "fr-FR", flag: "fr" },
  { code: "it", nativeName: "Italiano", englishName: "Italian", formatLocale: "it-IT", flag: "it" },
  { code: "hu", nativeName: "Magyar", englishName: "Hungarian", formatLocale: "hu-HU", flag: "hu" },
  { code: "zh", nativeName: "简体中文", englishName: "Chinese (Simplified)", formatLocale: "zh-CN", flag: "cn" },
];

const ALL_CODES: readonly KitLanguageCode[] = KIT_LANGUAGES.map((language) => language.code);

/** The kit's home language: what a reader nothing else matches gets, when it is offered. */
const HOME: KitLanguageCode = "de-CH";

/** The language part of a tag, lower-cased: `de-CH-informal` → `de`, `zh_Hant` → `zh`. */
const languagePart = (tag: string) => tag.split("-")[0].toLowerCase();

/**
 * The offered code that answers ONE requested tag, or `undefined`.
 *
 * Exact first, ignoring case (`DE-ch` → `de-CH`), then by language part: since the kit
 * has exactly one code per language, "the offered code whose language is the tag's
 * language" is the whole of the rule, and it is what takes every German to `de-CH`
 * (`de-AT`, `de-informal`), every Chinese to `zh` (`zh-TW`, `zh-Hant-HK`) and every
 * regional form to its base (`fr-CA` → `fr`, `en-AU` → `en`). A language the app does
 * not offer answers nothing, so the caller moves on to the reader's next preference
 * rather than landing on a guess. Underscores are read as hyphens (`de_CH`), the way a
 * Java or Python backend may have stored the account's locale.
 */
function answer(
  candidate: unknown,
  offered: readonly KitLanguageCode[],
): KitLanguageCode | undefined {
  if (typeof candidate !== "string") return undefined;
  const tag = candidate.trim().replace(/_/g, "-");
  if (!tag) return undefined;
  const lower = tag.toLowerCase();
  const exact = offered.find((code) => code.toLowerCase() === lower);
  if (exact) return exact;
  const language = languagePart(tag);
  return offered.find((code) => languagePart(code) === language);
}

/**
 * Which of the codes an app offers answers this reader.
 *
 * `candidates` are the reader's preferences **in precedence order**, and the first
 * one that matches wins — so the order is the policy. The one the harmonisation plan
 * gives every app (H5):
 *
 *     resolveLanguage(
 *       [localStorage.getItem("<app>-lang"), user?.locale, ...navigator.languages],
 *       OFFERED,
 *     );
 *
 * the choice stored on this device (the reader picked it, here) → the account's
 * language (read back on sign-in, so a new device starts in it) → the browser's list,
 * in its own order → the fallback. Missing sources are simply `null` / `undefined`;
 * they are skipped, as is an empty string.
 *
 * Each candidate is matched exactly (case-insensitively), then by language — every
 * German variant to `de-CH`, every Chinese to `zh` (Simplified), any other regional
 * form to its base language (`fr-CA` → `fr`, `en-AU` → `en`) — and only within
 * `offered`: a reader whose browser says `es-MX` first and `en` second, in an app that
 * offers no Spanish, gets English rather than the fallback. That is the difference
 * from a single-tag lookup, and why the browser's whole list is passed, not its first
 * entry.
 *
 * `fallback` is what a reader nothing matches gets: by default `de-CH` when the app
 * offers it — the kit's and the three apps' home language — else the app's first
 * offered code. It is returned as given, offered or not; the app chose it.
 *
 * Why not i18next's own matcher (`getBestMatchFromCodes`, which Kurvenschmiede calls):
 * it needs an i18next instance, it reduces `de-AT` to a `de` none of the apps ships
 * unless every caller remembers a converter first, and its answer to a list depends on
 * `supportedLngs` and `nonExplicitSupportedLngs` being set exactly so. This is a pure
 * function of its arguments, so the switcher, the account form, a server-rendered
 * guess and a test all get the same answer without one.
 */
export function resolveLanguage(
  candidates: readonly (string | null | undefined)[],
  offered: readonly KitLanguageCode[],
  fallback?: KitLanguageCode,
): KitLanguageCode {
  for (const candidate of candidates) {
    const found = answer(candidate, offered);
    if (found) return found;
  }
  return fallback ?? (offered.includes(HOME) ? HOME : (offered[0] ?? HOME));
}

/**
 * The BCP 47 tag a language formats in — `formatLocaleOf("en")` is `"en-GB"`.
 *
 * For `<UiKitProvider locale>`, for `<html lang>` (a screen reader pronounces by it,
 * and `en` alone does not say which English) and for the app's own `Intl` calls, so
 * the kit's counts and the app's amounts group their digits the same way.
 *
 * Takes any tag, not only a {@link KitLanguageCode}, and resolves it the way
 * {@link resolveLanguage} does against all seven: `de-AT` formats as `de-CH`, `en-AU`
 * as `en-GB` (the language's home, by decision — not the reader's region), and a
 * language the kit does not ship as the home language, `de-CH`. So an app can hand it
 * i18next's `resolvedLanguage` as it comes.
 */
export function formatLocaleOf(code: string): string {
  const resolved = resolveLanguage([code], ALL_CODES);
  return KIT_LANGUAGES.find((language) => language.code === resolved)!.formatLocale;
}

/**
 * One loader per catalogue, each a LITERAL relative `import()`.
 *
 * The literal is load-bearing twice. The library is built one file per module
 * (`bundle: false`, tsup.config.ts), so `./locales/fr` stays a module of its own in
 * dist/ and `scripts/fix-esm-extensions.mjs` gives the specifier its `.js`. And an
 * app's bundler can only split what it can read: a path assembled from a code is a
 * chunk rollup cannot make, and the failure is at runtime. With literals, each
 * language is a chunk of its own and a reader downloads exactly theirs — about 25 kB of
 * JavaScript a catalogue, so an entry chunk holding all of them would carry six that
 * the reader never uses.
 *
 * Relative, not `@eifi1/ui-kit/i18n/fr`: a package importing itself by name resolves
 * through the consumer's node_modules, which a linked checkout or a test of this repo
 * does not have.
 */
const LOADERS: Record<KitLanguageCode, (formatLocale: string) => Promise<UiKitLabels>> = {
  "de-CH": async (locale) => (await import("./locales/de-CH")).uiKitLabelsDeCh(locale),
  en: async (locale) => (await import("./locales/en")).uiKitLabelsEn(locale),
  es: async (locale) => (await import("./locales/es")).uiKitLabelsEs(locale),
  fr: async (locale) => (await import("./locales/fr")).uiKitLabelsFr(locale),
  it: async (locale) => (await import("./locales/it")).uiKitLabelsIt(locale),
  hu: async (locale) => (await import("./locales/hu")).uiKitLabelsHu(locale),
  zh: async (locale) => (await import("./locales/zh")).uiKitLabelsZh(locale),
};

/** One promise per (language, format locale), so asking twice is one fetch and one
 *  object: the provider's context value keeps its identity, and every kit component
 *  reading it is spared a re-render on a switch back. */
const loaded = new Map<string, Promise<UiKitLabels>>();

/**
 * The kit's catalogue for a language, fetched on demand and formatted in
 * `formatLocale` — for `<UiKitProvider labels={…}>`.
 *
 * Every language goes through its catalogue's factory, English included:
 * `uiKitLabelsEn("en-GB")` writes "12,345 rows" where the bare
 * `DEFAULT_UI_KIT_LABELS` print "12345" (and keksdose's English did, by passing no
 * labels at all). `formatLocale` defaults to the language's own
 * ({@link formatLocaleOf}); pass another only for a reason, as the factories' own
 * docs describe (`"de-DE"` keeps the Swiss words and writes German digits).
 *
 * `code` may be any tag and is resolved like {@link formatLocaleOf}'s, so `de` loads
 * the one German and a language the kit does not ship loads `de-CH` — the same answer
 * the app's own fallback gives, rather than English beside the app's German.
 *
 * Asynchronous on purpose, and there is no synchronous twin: one would have to import
 * all seven catalogues statically, which puts every language in every app's entry
 * chunk — exactly what one subpath per language exists to prevent. Await it before the
 * first render, beside the app's own catalogue (the apps already await i18next's init
 * for the same reason: no frame in the wrong language), and keep the result in state.
 * To change a few words, spread over what it returns rather than copying a catalogue:
 * a copy misses every key a later release adds.
 *
 * A rejected fetch (a deploy replaced the chunk, the device went offline) is not
 * remembered, so the next call tries again.
 */
export function loadUiKitLabels(
  code: string,
  formatLocale: string = formatLocaleOf(code),
): Promise<UiKitLabels> {
  const language = resolveLanguage([code], ALL_CODES);
  const key = `${language}\u0000${formatLocale}`;
  let labels = loaded.get(key);
  if (!labels) {
    labels = LOADERS[language](formatLocale);
    loaded.set(key, labels);
    labels.catch(() => loaded.delete(key));
  }
  return labels;
}

/**
 * The rows `LanguageMenu` and `LanguageSetting` take, for the codes an app offers, in
 * the order given: `{ code, label: nativeName, country: flag }`.
 *
 * `LanguageMenu` draws `country` as a flag-icons class (`fi fi-ch`) and nothing more —
 * the kit ships no flag artwork and no flag CSS, the app loads the stylesheet (or just
 * the rules for its flags, as Kurvenschmiede and keksdose do). `LanguageSetting` is a
 * native `<select>`, whose options can hold text only, so it shows the names and
 * ignores `country`; the same array serves both.
 *
 * A label of the app's own (keksdose's "Deutsch (Schweiz)") is a `.map` over the
 * result.
 */
export function languageOptions(codes: readonly KitLanguageCode[] = ALL_CODES): LanguageOption[] {
  return codes.flatMap((code) => {
    const language = KIT_LANGUAGES.find((entry) => entry.code === code);
    if (!language) return [];
    return [{ code: language.code, label: language.nativeName, country: language.flag }];
  });
}
