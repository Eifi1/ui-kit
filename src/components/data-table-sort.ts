/** Multi-column sort state for DataTable: ordered by priority (index 0 is the
 *  primary sort). Encoded as `sort=date.desc,amount` in URLs and the server's
 *  transactions `sort` param — the pre-multi-sort single-value format
 *  (`sort=date.desc`) decodes as a one-element list. */

export type SortDir = "asc" | "desc";
export interface SortState {
  key: string;
  dir: SortDir;
}

/** Coerce any persisted/URL-derived shape into a `SortState[]`. The
 *  pre-multi-sort localStorage format stored one `{key, dir}` object (or
 *  null); arrays pass through with junk entries dropped. */
export function normalizeSorts(raw: unknown): SortState[] {
  const one = (v: unknown): SortState | null => {
    if (!v || typeof v !== "object") return null;
    const { key, dir } = v as { key?: unknown; dir?: unknown };
    if (typeof key !== "string" || !key) return null;
    return { key, dir: dir === "desc" ? "desc" : "asc" };
  };
  if (Array.isArray(raw)) {
    const out: SortState[] = [];
    for (const entry of raw) {
      const s = one(entry);
      if (s && !out.some((e) => e.key === s.key)) out.push(s);
    }
    return out;
  }
  const single = one(raw);
  return single ? [single] : [];
}

export function encodeSorts(sorts: readonly SortState[]): string | null {
  if (!sorts.length) return null;
  return sorts.map((s) => (s.dir === "desc" ? `${s.key}.desc` : s.key)).join(",");
}

/** Decode a `sort` URL param, dropping unknown and duplicated keys. */
export function decodeSorts(raw: string | null, validKeys: ReadonlySet<string>): SortState[] {
  if (!raw) return [];
  const out: SortState[] = [];
  for (const part of raw.split(",")) {
    const desc = part.endsWith(".desc");
    const asc = part.endsWith(".asc");
    const key = desc ? part.slice(0, -".desc".length) : asc ? part.slice(0, -".asc".length) : part;
    if (!validKeys.has(key) || out.some((s) => s.key === key)) continue;
    out.push({ key, dir: desc ? "desc" : "asc" });
  }
  return out;
}

/**
 * How a header click steps through the directions (see {@link nextSorts}).
 *
 * * `"tri"` — first direction → the other → unsorted. The default, and the only cycle
 *   before 0.8.0.
 * * `"toggle"` — first direction ⇄ the other, never unsorted: a report table that is
 *   ALWAYS ranked by something (keksdose's aggregated tables) must not have a third
 *   click that silently drops the ranking. Clicking another column still replaces
 *   the sort, so the table can always be re-ranked; a shift-click criterion flips in
 *   place and stays for the same reason.
 */
export type SortCycle = "tri" | "toggle";

/** Per-click options for {@link nextSorts}; every field is optional and the
 *  defaults reproduce the pre-0.8.0 cycle exactly. */
export interface SortStepOptions {
  /** The direction a column starts in on its first click. `"desc"` for money and
   *  count columns, where the interesting rows are the large ones. Default `"asc"`. */
  firstDir?: SortDir;
  /** Default `"tri"`. */
  cycle?: SortCycle;
}

const flip = (d: SortDir): SortDir => (d === "asc" ? "desc" : "asc");

// ---------- The client sort's order ----------

/** One collator per locale, built once: `localeCompare` with a locale sets one up on
 *  every call, n·log n times a sort. */
const collators = new Map<string, Intl.Collator>();

function sortCollator(locale: string | undefined): Intl.Collator {
  const key = locale ?? "";
  let collator = collators.get(key);
  if (!collator) {
    const options: Intl.CollatorOptions = { numeric: true, sensitivity: "base" };
    try {
      collator = new Intl.Collator(locale, options);
    } catch {
      // An unknown tag (a typo in a provider's `locale`) throws a RangeError, and a sort
      // is no reason for a table to stop rendering: the runtime's own collation then, as
      // CountrySelect falls back.
      collator = new Intl.Collator(undefined, options);
    }
    collators.set(key, collator);
  }
  return collator;
}

/**
 * Two `sortBy` values in the order DataTable's client sort puts them, ascending — the
 * table's own comparator, exported (0.52) for a list an app sorts beside or into a
 * kit-sorted table: keksdose weaves its scheduled rows into the register and had to copy
 * the rule, a copy that drifts the day the table's changes. Negative when `a` comes first.
 *
 * - Strings collate in `locale` (audit 2026-10-30 DSP-3, 0.51.7; `<` compared UTF-16 code
 *   units — every lower-case initial after every capital, Ä/Ö/Ü after Z): digits as
 *   numbers ("Item 2" before "Item 10"), case and accents left out, so two values that
 *   differ only by them compare equal and the next sort key decides. One collator per
 *   locale, cached; an unknown tag falls back to the runtime's collation, not a throw.
 * - Numbers compare as numbers, and a number comes before a string.
 * - `null` and `undefined` come last, and equal each other. The table puts them last in
 *   either direction; turn only the two present values round for a descending order.
 * - Any other pair (a `Date` an untyped caller returns) keeps `<` / `>`.
 *
 *     rows.sort((a, b) => compareSortValues(a.payee, b.payee, locale));
 */
export function compareSortValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  locale?: string,
): number {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
  const aText = typeof a === "string";
  const bText = typeof b === "string";
  if (aText && bText) return sortCollator(locale).compare(a, b);
  if (aText !== bText) return aText ? 1 : -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Header-click semantics. Plain click: make `key` the only sort — cycling
 *  first → other → none (`"tri"`) or first ⇄ other (`"toggle"`) when it already is
 *  the sole criterion. Shift-click (`additive`): append `key` as the next-priority
 *  sort, or step an existing entry in place (first → other → removed under `"tri"`,
 *  a plain flip under `"toggle"`). `firstDir` defaults to `"asc"`, `cycle` to
 *  `"tri"` — the cycle every table had before the options existed. */
export function nextSorts(
  prev: readonly SortState[],
  key: string,
  additive: boolean,
  options: SortStepOptions = {},
): SortState[] {
  const first = options.firstDir ?? "asc";
  const toggle = options.cycle === "toggle";
  const idx = prev.findIndex((s) => s.key === key);
  // One step from `dir`: the second direction after the first, then either back to
  // the first (toggle) or off (null). Judged against THIS column's first direction,
  // so a desc-first column goes desc → asc → none rather than skipping a step.
  const step = (dir: SortDir): SortDir | null => (dir === first ? flip(first) : toggle ? first : null);
  if (!additive) {
    if (prev.length === 1 && idx === 0) {
      const dir = step(prev[0].dir);
      return dir ? [{ key, dir }] : [];
    }
    return [{ key, dir: first }];
  }
  if (idx === -1) return [...prev, { key, dir: first }];
  const dir = step(prev[idx].dir);
  if (dir) return prev.map((s, i) => (i === idx ? { key, dir } : s));
  return prev.filter((_, i) => i !== idx);
}
