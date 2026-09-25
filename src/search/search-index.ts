import type { ReactNode } from "react";

/**
 * The matcher behind {@link GlobalSearch} — pure, React-free, testable on its own.
 *
 * WHY IT EXISTS. `CommandPalette` is deliberately domain-free: it shows whatever a
 * `search(query)` provider returns. So every app wrote that provider, and every app wrote
 * the same one — `label.toLowerCase().includes(q)` over its pages and actions (kastlan's
 * command palette, keksdose's global search) plus a second copy with keywords for the
 * settings catalogue (keksdose's `matchSettingsEntries`). A substring test answers "does
 * this string contain that one", which is not what a search box is asked:
 *
 *  - "range date" finds nothing, because the words are in the other order;
 *  - "Uberweisung" misses "Überweisung", and "Tooltp" misses "Tooltip";
 *  - "del" matches "model" as happily as "delete", and every hit ranks the same, so the
 *    exact page name can sit under six unrelated rows.
 *
 * What it does instead, per entry:
 *
 *  - NORMALISES both sides: lower case, accents stripped (NFD minus combining marks),
 *    `ß` → `ss`, punctuation as a word break, and camelCase split so `DateRangePicker`
 *    is also the words date, range, picker.
 *  - Requires EVERY query word to match SOMEWHERE in the entry — title, keywords or
 *    description, in any order.
 *  - A word matches a word of the entry exactly, as its prefix, inside it (four letters or
 *    more, for compounds: "bereich" in "Datumsbereich"), or — for words of five letters
 *    or more — at edit distance one, transpositions included ("tooltp", "calender").
 *  - RANKS in tiers: exact title > title prefix > all words in the title > some word only
 *    in the keywords > some word only in the description. Within a tier, better word
 *    matches (exact over prefix over infix over typo) score higher, and `weight` is added
 *    last. The tiers are {@link SEARCH_TIER_POINTS} points apart, so a weight below that reorders within
 *    a tier and never across one.
 *  - Caps each group (`groupLimit`, default 8) after ranking, so one broad group cannot
 *    push every other group off the list.
 */

/** One searchable thing: a page, an action, a record, a settings row. */
export interface SearchEntry {
  /** Unique across the entries handed to one index. */
  id: string;
  /** What the row says, and what ranks highest. */
  title: string;
  /** Other words or phrases that should find it — synonyms, a translated name, tags.
   *  Matched like the title, ranked below it. */
  keywords?: readonly string[];
  /** Longer text, matched last and ranked lowest. Not shown in the row. */
  description?: string;
  /** Heading the row is grouped under in the palette. */
  group?: string;
  /** Secondary text on the row's trailing side (the page it lives on, an amount). */
  hint?: string;
  /** Leading icon. */
  icon?: ReactNode;
  /** Where it leads — the app's own path, handed to `GlobalSearch`'s `navigate`. */
  href?: string;
  /** Run instead of navigating. Wins over `href` for a plain click and ↵; `href` still
   *  makes the row a real link for a middle-/⌘-click. */
  onSelect?: () => void;
  /** Added to the score. Below {@link SEARCH_TIER_POINTS} it reorders within a tier. */
  weight?: number;
  /** Masks the row for session replay (see `CommandItem.redact`). */
  redact?: boolean;
}

export type SearchMatchField = "title" | "keywords" | "description";

export interface SearchHit<E extends SearchEntry = SearchEntry> {
  entry: E;
  score: number;
  /** The weakest field any query word had to be found in. */
  field: SearchMatchField;
}

export interface SearchIndexOptions {
  /** Hits kept per `group` after ranking. Default 8; `Infinity` for no cap. */
  groupLimit?: number;
  /** Hits kept in total. Default: no cap beyond `groupLimit`. */
  limit?: number;
  /** Shortest query word allowed an edit-distance-1 match. Default 5 — below that a
   *  single typo is a different word ("cat" / "car"). */
  typoMinLength?: number;
  /** Shortest query word matched INSIDE an entry word. Default 4. */
  infixMinLength?: number;
}

export interface SearchIndex<E extends SearchEntry = SearchEntry> {
  /** Ranked hits for `query`; an empty query returns none. */
  search: (query: string) => SearchHit<E>[];
  readonly entries: readonly E[];
}

/** Points between two ranking tiers. */
export const SEARCH_TIER_POINTS = 1000;

const TIERS = {
  exact: 5,
  prefix: 4,
  title: 3,
  keywords: 2,
  description: 1,
} as const;

/** How well one query word matched one entry word — higher is better. */
const WORD_SCORE = { exact: 40, prefix: 30, infix: 15, typo: 10 } as const;
/** How much the field a word matched in is worth, multiplied with the above. */
const FIELD_FACTOR: Record<SearchMatchField, number> = { title: 3, keywords: 2, description: 1 };

/**
 * Lower case, accents off, punctuation to spaces — the form both sides are compared in.
 * Exported so an app can normalise its own keys the same way.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** The words of a text, camelCase split too: "DateRangePicker" → daterangepicker, date,
 *  range, picker. The joined word stays so "daterange" still prefixes it. */
function words(text: string): string[] {
  const out = new Set<string>();
  // Split camelCase BEFORE lower-casing, or the boundaries are gone.
  const spaced = text.replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1 $2").replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2");
  for (const w of normalizeSearchText(text).split(" ")) if (w) out.add(w);
  for (const w of normalizeSearchText(spaced).split(" ")) if (w) out.add(w);
  return [...out];
}

/** Restricted Damerau–Levenshtein distance, early-exiting once it must exceed `max`. */
function withinDistance(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  if (a === b) return true;
  const n = a.length;
  const m = b.length;
  let prev2: number[] = [];
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev2 = prev;
    prev = cur;
  }
  return prev[m] <= max;
}

type WordKind = keyof typeof WORD_SCORE;

function matchWord(q: string, word: string, opts: Required<Pick<SearchIndexOptions, "typoMinLength" | "infixMinLength">>): WordKind | null {
  if (word === q) return "exact";
  if (word.startsWith(q)) return "prefix";
  if (q.length >= opts.infixMinLength && word.includes(q)) return "infix";
  if (q.length >= opts.typoMinLength) {
    // The whole word, or the word's start as long as the query (a typo in a prefix:
    // "calender" is one edit from "calendar", the start of "calendars").
    if (withinDistance(q, word, 1)) return "typo";
    if (word.length > q.length && withinDistance(q, word.slice(0, q.length), 1)) return "typo";
  }
  return null;
}

interface Prepared<E> {
  entry: E;
  title: string;
  titleCompact: string;
  fields: Array<[SearchMatchField, string[]]>;
}

/**
 * Build an index over `entries`. Normalisation happens once here, so `search` is a scan
 * over prepared words — a few thousand entries per keystroke is nothing.
 */
export function createSearchIndex<E extends SearchEntry>(
  entries: readonly E[],
  options: SearchIndexOptions = {},
): SearchIndex<E> {
  const { groupLimit = 8, limit = Infinity, typoMinLength = 5, infixMinLength = 4 } = options;
  const wordOpts = { typoMinLength, infixMinLength };
  const prepared: Prepared<E>[] = entries.map((entry) => {
    const title = normalizeSearchText(entry.title);
    return {
      entry,
      title,
      titleCompact: title.replace(/ /g, ""),
      fields: [
        ["title", words(entry.title)],
        ["keywords", (entry.keywords ?? []).flatMap(words)],
        ["description", entry.description ? words(entry.description) : []],
      ],
    };
  });

  const search = (query: string): SearchHit<E>[] => {
    const q = normalizeSearchText(query);
    if (!q) return [];
    const qWords = [...new Set(q.split(" "))];
    const qCompact = q.replace(/ /g, "");
    const hits: SearchHit<E>[] = [];

    for (const p of prepared) {
      let quality = 0;
      let weakest: SearchMatchField = "title";
      let ok = true;
      for (const qw of qWords) {
        let best = 0;
        let bestField: SearchMatchField | null = null;
        for (const [field, fieldWords] of p.fields) {
          for (const w of fieldWords) {
            const kind = matchWord(qw, w, wordOpts);
            if (!kind) continue;
            const s = WORD_SCORE[kind] * FIELD_FACTOR[field];
            if (s > best) {
              best = s;
              bestField = field;
            }
          }
        }
        if (!bestField) {
          ok = false;
          break;
        }
        quality += best;
        if (FIELD_FACTOR[bestField] < FIELD_FACTOR[weakest]) weakest = bestField;
      }
      if (!ok) continue;

      let tier: number = TIERS[weakest];
      if (p.title === q || p.titleCompact === qCompact) tier = TIERS.exact;
      else if (
        p.title.startsWith(q) ||
        p.titleCompact.startsWith(qCompact) ||
        // The whole title, mistyped once ("Tooltp") — as good as a prefix, not exact.
        (qCompact.length >= typoMinLength && withinDistance(qCompact, p.titleCompact, 1))
      ) {
        tier = TIERS.prefix;
      }
      // Within a tier: how well the words matched (≤ 120 each, averaged so a long query
      // cannot climb by word count), and how much of the title the query covers — so
      // "Tooltip" beats "Popovers, menus & tooltips" for the same one-word match.
      const coverage = Math.min(1, qCompact.length / Math.max(1, p.titleCompact.length)) * 40;
      const score =
        tier * SEARCH_TIER_POINTS +
        Math.min(quality / qWords.length + coverage, SEARCH_TIER_POINTS / 2 - 1) +
        (p.entry.weight ?? 0);
      hits.push({ entry: p.entry, score, field: weakest });
    }

    hits.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
    return capByGroup(hits, groupLimit, limit);
  };

  return { search, entries };
}

function capByGroup<E extends SearchEntry>(hits: SearchHit<E>[], groupLimit: number, limit: number): SearchHit<E>[] {
  const perGroup = new Map<string, number>();
  const out: SearchHit<E>[] = [];
  for (const hit of hits) {
    if (out.length >= limit) break;
    const g = hit.entry.group ?? "";
    const n = perGroup.get(g) ?? 0;
    if (n >= groupLimit) continue;
    perGroup.set(g, n + 1);
    out.push(hit);
  }
  return out;
}

/**
 * One-shot form of {@link createSearchIndex}: the matching entries, best first. For a
 * list that changes on every call (a server response, a store selector); build an index
 * once when the entries are stable.
 */
export function matchEntries<E extends SearchEntry>(
  entries: readonly E[],
  query: string,
  options?: SearchIndexOptions,
): E[] {
  return createSearchIndex(entries, options)
    .search(query)
    .map((hit) => hit.entry);
}
