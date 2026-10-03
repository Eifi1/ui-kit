import { DEFAULT_UI_KIT_LABELS, KIT_LANGUAGES, flattenStrings, kitLabelStrings, translationRows } from "@eifi1/ui-kit";
import type { KitLanguageCode, TranslationReview, TranslationRow, UiKitLabels } from "@eifi1/ui-kit";
import { uiKitLabelsDeCh } from "@eifi1/ui-kit/i18n/de-CH";
import { uiKitLabelsEs } from "@eifi1/ui-kit/i18n/es";
import { uiKitLabelsFr } from "@eifi1/ui-kit/i18n/fr";
import { uiKitLabelsHu } from "@eifi1/ui-kit/i18n/hu";
import { uiKitLabelsIt } from "@eifi1/ui-kit/i18n/it";
import { uiKitLabelsZh } from "@eifi1/ui-kit/i18n/zh";

/**
 * The kit's words as review rows, built EXACTLY as keksdose's /translations builds its
 * `kit.` rows (frontend `features/translations/translations-page.tsx`), so a verdict
 * given here is the same database row as one given there — same key, and the same text,
 * so neither page sees the other's verdict as `changed`.
 *
 * What is mirrored, line for line:
 *  - `KIT_PREFIX = "kit."` and `flattenStrings(kitLabelStrings(labels), KIT_PREFIX)`;
 *  - the catalogue per locale — keksdose's `kitLabelsFor(code) ?? DEFAULT_UI_KIT_LABELS`
 *    (`shared/i18n/kit-labels.tsx`), see {@link kitLabelsFor};
 *  - `referenceLocaleFor`: everything is read against English, English against de-CH;
 *  - `sourceOf` (`"kit"` for every row here) and `namespaceOf`, which makes a kit key's
 *    area its kit namespace (`kit.dataTable`) rather than lumping every component into
 *    one `kit` group;
 *  - `translationRows({ locale, strings, reference, reviews, namespaceOf, sourceOf, areas })`.
 *
 * What is NOT mirrored: keksdose's app bundles. This page reviews the kit's words only.
 */

/** keksdose: `const KIT_PREFIX = "kit."`. */
export const KIT_PREFIX = "kit.";

/** keksdose: `(code) => (code === "en" ? "de-CH" : "en")`. */
export const referenceLocaleFor = (code: string) => (code === "en" ? "de-CH" : "en");

/** keksdose: `(key) => (key.startsWith(KIT_PREFIX) ? "kit" : "app")`. */
export const sourceOf = (key: string) => (key.startsWith(KIT_PREFIX) ? "kit" : "app");

/** keksdose: a kit key's area is its kit namespace (`kit.dataTable`); an app key's its
 *  first segment. */
export const namespaceOf = (key: string) =>
  key.startsWith(KIT_PREFIX) ? key.split(".", 2).join(".") : key.split(".", 1)[0];

/**
 * The catalogue factories, by the registry's codes — English has none here (see below).
 *
 * Imported from the subpaths, as keksdose imports them, and NOT through
 * `loadUiKitLabels`: that loader lives in the barrel, so using it anywhere makes its seven
 * `import("./locales/…")` live in the showcase's ENTRY chunk — and the build then drew
 * half of the entry into the `i18n` chunk group (vite.config.ts), 305 kB → 815 kB, past
 * Vite's 500 kB warning. The showcase's dictionaries import these subpaths already, so
 * here they cost nothing.
 */
const FACTORIES: Record<Exclude<KitLanguageCode, "en">, (numberLocale: string) => UiKitLabels> = {
  "de-CH": uiKitLabelsDeCh,
  es: uiKitLabelsEs,
  fr: uiKitLabelsFr,
  hu: uiKitLabelsHu,
  it: uiKitLabelsIt,
  zh: uiKitLabelsZh,
};

/**
 * The catalogue keksdose reviews for a locale code.
 *
 * keksdose's `kitLabelsFor(code) ?? DEFAULT_UI_KIT_LABELS`, called with the bare code its
 * server answers (`de-CH`, `en`, `fr`, `it`):
 *  - German → `UI_KIT_LABELS_DE_CH`, i.e. `uiKitLabelsDeCh("de-CH")`;
 *  - French, Italian → `uiKitLabelsFr(code)`, `uiKitLabelsIt(code)` — the CODE as the
 *    number locale, not the registry's `fr-FR` / `it-IT`;
 *  - English → `DEFAULT_UI_KIT_LABELS`, the bare defaults — NOT the `en` catalogue, whose
 *    `en-GB` digits ("1,240 rows" against "1240 rows") would make every English count
 *    row read `changed` on the other page.
 * The kit's three other catalogues (es, hu, zh) are built the same way as French;
 * keksdose's server does not offer those locales today, so no token reaches them. A code
 * that is none of the kit's languages gets the English defaults, as in keksdose.
 */
export function kitLabelsFor(code: string): UiKitLabels {
  const language = code.split("-")[0].toLowerCase();
  if (language === "de") return uiKitLabelsDeCh("de-CH");
  const known = KIT_LANGUAGES.find((entry) => entry.code !== "en" && entry.code.split("-")[0] === language);
  return known ? FACTORIES[known.code as Exclude<KitLanguageCode, "en">](code) : DEFAULT_UI_KIT_LABELS;
}

/** One locale's kit strings, `kit.…` → text — keksdose's `loadStrings` without the app bundle. */
export function kitStrings(code: string): Record<string, string> {
  return flattenStrings(kitLabelStrings(kitLabelsFor(code)), KIT_PREFIX);
}

/** Every locale the rows need: the reviewed ones and the ones they are read against. */
export const neededLocales = (locales: readonly string[]) =>
  [...new Set([...locales, ...locales.map(referenceLocaleFor)])].sort();

/** The strings of every needed locale, by code. */
export function kitCatalogues(locales: readonly string[]): Record<string, Record<string, string>> {
  return Object.fromEntries(neededLocales(locales).map((code) => [code, kitStrings(code)] as const));
}

/** keksdose's `rowsByLocale`: one list of rows per reviewed locale. */
export function buildKitRows(
  locales: readonly string[],
  strings: Readonly<Record<string, Readonly<Record<string, string>>>>,
  reviews: readonly TranslationReview[],
  areas: readonly string[] | null,
): Map<string, TranslationRow[]> {
  const out = new Map<string, TranslationRow[]>();
  for (const code of locales) {
    out.set(
      code,
      translationRows({
        locale: code,
        strings: strings[code] ?? {},
        reference: strings[referenceLocaleFor(code)] ?? {},
        reviews: reviews.filter((r) => r.locale === code),
        namespaceOf,
        sourceOf,
        areas,
      }),
    );
  }
  return out;
}
