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
 * Whether two names are one name as a picker's search reads them: folded
 * ({@link foldForSearch}) and trimmed — "cafe" is Café, " MIGROS " is Migros. For "does
 * the typed text name a record that exists" (a create row, InlineEntityCombobox's blur
 * commit), which compared with plain `toLowerCase` while the list beside it folded, so
 * "cafe" listed Café as a hit and offered "Create “cafe”" too — a duplicate payee or shop
 * chain one Enter away (refactor audit 2026-10-30, DUP-5). Internal: not in the barrel.
 */
export function sameName(a: string, b: string, locale?: string): boolean {
  return foldForSearch(a.trim(), locale) === foldForSearch(b.trim(), locale);
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
  return rankFolded(foldForSearch(label, locale), q, code === undefined ? undefined : foldForSearch(code, locale));
}

/** {@link rankMatch} on a text, a non-empty query and a code all folded already. */
function rankFolded(text: string, q: string, code: string | undefined): MatchRank {
  if (text === q || code === q) return 0;
  if (text.startsWith(q)) return 1;
  return text.includes(q) ? 2 : -1;
}

/** A row {@link searchRanked} kept, and how well it answers the WHOLE query:
 *  {@link rankMatch}'s rank, or `3` for a row that holds the query's words apart
 *  ("Zürich Migros" for "migros zürich"). */
export interface RankedHit<T> {
  row: T;
  rank: Exclude<MatchRank, -1> | 3;
}

/**
 * The rows that hold every word of `query`, each ranked for the WHOLE query — for the
 * lists that FILTER by words ({@link matchesSearch}) and RANK by the whole query
 * ({@link rankMatch}): Combobox, CountrySelect and InlineEntityCombobox (refactor audit
 * 2026-10-30, DUP-4). In the order given; sort by `rank` with a stable sort, and the rows
 * of one rank keep it. No words keep every row, at `0`.
 *
 * Each row's texts are folded ONCE, and the query once. The lists asked `matchesSearch`
 * and then `rankMatch` of each row they kept, which folded the row three times and the
 * query once per row, per keystroke — InlineEntityCombobox asked `rankMatch` twice of
 * most rows (0.52 code review, combobox.tsx).
 *
 * `texts(row)`: where a word may stand; the FIRST is the label the rank is for.
 * `code(row)`: a key that answers only WHOLE — a word that IS the code matches the row,
 * and the code as the whole query ranks `0` ("ch" is Switzerland before it is Chad) —
 * never a letter of it ("w" is not Aruba, AW: 0.52 code review, country-select.tsx).
 * Internal: not in the barrel.
 */
export function searchRanked<T>(
  rows: readonly T[],
  query: string,
  texts: (row: T) => readonly (string | undefined)[],
  { code, locale }: { code?: (row: T) => string; locale?: string } = {},
): RankedHit<T>[] {
  const q = foldForSearch(query.trim(), locale);
  const words = q.split(/\s+/).filter((word) => word !== "");
  if (words.length === 0) return rows.map((row) => ({ row, rank: 0 }));
  const hits: RankedHit<T>[] = [];
  for (const row of rows) {
    const folded = texts(row)
      .filter((t): t is string => t !== undefined)
      .map((t) => foldForSearch(t, locale));
    const key = code === undefined ? undefined : foldForSearch(code(row), locale);
    // One haystack, as `matchesSearch` has it: a word holds no whitespace, so it cannot
    // match across the newline between two texts.
    const hay = folded.join("\n");
    if (!words.every((word) => word === key || hay.includes(word))) continue;
    const rank = rankFolded(folded[0] ?? "", q, key);
    hits.push({ row, rank: rank === -1 ? 3 : rank });
  }
  return hits;
}
