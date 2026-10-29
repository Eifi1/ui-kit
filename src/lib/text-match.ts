/**
 * How typing into a kit list matches its rows — one rule for every list (DUP-5, refactor
 * audit 2026-10).
 *
 * There were six. "zurich" found Zürich in CountrySelect and the command palette and in no
 * EntityCombobox, Combobox, MultiSelect or DataTable text filter, where keksdose's
 * Swiss-German payees and categories and kastlan's eighteen entity pickers live; "İ"
 * folded by the locale in GroupedPicker and nowhere in the combobox family. The folding
 * only ever widens a match, so moving every list onto it took nothing away.
 */

/**
 * A text as search compares it: the locale's lower case, accents off, ß spelt "ss" —
 * "Zürich" and "ZURICH" both read "zurich", "Straße" reads "strasse". Punctuation and
 * symbols stay: a currency is found by its "€", and "c++" is not the empty query.
 *
 * Lower-cased by the locale FIRST, then decomposed: the Turkish "İ" lower-cases to "i"
 * and the dotted capital's mark is then dropped like any other, so "istanbul" finds
 * "İSTANBUL" in every locale, while "I" folds to the dotless "ı" in Turkish alone.
 * `locale` left out is the runtime's default; a malformed tag folds as if left out.
 */
export function foldForSearch(text: string, locale?: string): string {
  let lower: string;
  try {
    lower = text.toLocaleLowerCase(locale);
  } catch {
    lower = text.toLocaleLowerCase();
  }
  return lower
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ß/g, "ss");
}

/**
 * A picker's query as its words, each folded (0.51.4, keksdose's /prices shop picker):
 * "Migros  Zürich" → `["migros", "zurich"]`. An empty or blank query has no words.
 */
export function searchWords(query: string, locale?: string): string[] {
  return foldForSearch(query, locale)
    .split(/\s+/)
    .filter((word) => word !== "");
}

/**
 * Whether a row matches a picker's query: EVERY word appears in at least one of the row's
 * texts — "migros 8004" finds a row named "Migros · 8004 Zürich", and a row whose chain is
 * its group and whose place is its label (pass both). Until 0.51.4 the whole query had to
 * be ONE substring of one text, so two words found nothing unless they stood side by side
 * in that order. One word matches exactly as before, and so does the old query when it
 * was a substring. No words match everything.
 *
 * `words` from {@link searchWords}; `texts` as they are (folded here), `undefined` skipped.
 *
 * Exported since 0.51.5 for an app's own async source: a picker shows `loadOptions`'
 * rows as they come, so a source that narrows on the client filters with this, the same
 * rule the kit applies to `options` (keksdose's shop picker past its first hundred shops).
 */
export function matchesSearch(
  words: readonly string[],
  texts: readonly (string | undefined)[],
  locale?: string,
): boolean {
  if (words.length === 0) return true;
  // One haystack per row; a word holds no whitespace, so it cannot match across the
  // newline between two texts.
  const hay = texts
    .filter((t): t is string => t !== undefined)
    .map((t) => foldForSearch(t, locale))
    .join("\n");
  return words.every((word) => hay.includes(word));
}

/** {@link rankMatch}'s answer: lower is better, `-1` is no match. */
export type MatchRank = -1 | 0 | 1 | 2;

/**
 * How well `label` answers `query` — CountrySelect's ranking, for every list that orders
 * its hits:
 *
 * - `0`: the query IS the row — its `code` ("ch" means Switzerland before it means Chad)
 *   or the whole label;
 * - `1`: the label starts with it;
 * - `2`: the label contains it;
 * - `-1`: no match.
 *
 * Both sides are folded here ({@link foldForSearch}, by `locale`), so pass them as typed
 * and as shown. An empty query matches every row alike (`0`). Sort by the rank with a
 * stable sort, and rows of one rank keep the order they came in.
 */
export function rankMatch(
  label: string,
  query: string,
  { code, locale }: { code?: string; locale?: string } = {},
): MatchRank {
  const q = foldForSearch(query.trim(), locale);
  if (!q) return 0;
  const text = foldForSearch(label, locale);
  if (text === q || (code !== undefined && foldForSearch(code, locale) === q)) return 0;
  if (text.startsWith(q)) return 1;
  return text.includes(q) ? 2 : -1;
}
