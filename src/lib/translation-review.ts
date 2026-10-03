/**
 * The pure half of an app's translation review (H1 in docs/i18n-harmonization.md): from
 * the strings the app ships and the verdicts its server stores to one row per (locale,
 * key) with a status — keksdose's `features/translations/translation-catalogue.ts` and
 * kastlan's copy of it, which had grown apart by a fifth status and a second kind of key.
 *
 * WHY THE STRINGS ARE THE CATALOGUE. Nothing on the server lists which strings exist: a
 * verdict only says what somebody thought of one. So the rows are built from what the app
 * ships — its locale bundles, kastlan's document texts, the kit's own words
 * (`kitLabelStrings`) — and the review can never offer a string users do not see. A
 * verdict is stored WITH the wording it was given on, and a string that changed since is
 * noticed by comparing the two: `changed`, read it again, whatever the verdict was.
 *
 * WHAT STAYS IN THE APP. Which locale is read against which (keksdose: everything against
 * English, English against de-CH; kastlan: against German, German against English), where
 * the strings come from, who may review what (the locales and areas its server answers
 * with), and every request. The kit takes those as input and never derives them.
 *
 * camelCase, like the rest of the kit. The contract's wire shape is snake_case
 * (`reference_text`, `reviewer_name`, `reviewed_at`); {@link fromApiReview} and
 * {@link toApiWrite} are the two lines each app would otherwise write — both apps speak
 * the same contract, so the mapping is written once, here.
 */

// ── Shapes ──────────────────────────────────────────────────────────────────────

export type TranslationVerdict = "APPROVED" | "NEEDS_CHANGE";

/** One stored verdict: what a reviewer said about one string in one locale. */
export interface TranslationReview {
  locale: string;
  key: string;
  /** The wording that was judged — compared with today's to notice a change. Empty for
   *  a string the locale lacked (a suggested translation for a `missing` row). */
  text: string;
  /** The reference wording at the time. `null` from a server that did not store it. */
  referenceText: string | null;
  verdict: TranslationVerdict;
  note: string | null;
  /** The reviewer's wording — or, for a missing string, the translation to add. */
  suggestion: string | null;
  /** `null` once the reviewer's account has been erased. */
  reviewerName: string | null;
  /** ISO timestamp. */
  reviewedAt: string;
}

/** What a save sends: the verdict plus the wording it is given on. */
export interface TranslationReviewWrite {
  locale: string;
  key: string;
  text: string;
  referenceText: string | null;
  verdict: TranslationVerdict;
  note: string | null;
  suggestion: string | null;
}

/** What a reset sends: back to "unreviewed". */
export interface TranslationReviewKey {
  locale: string;
  key: string;
}

/**
 * Where a string stands, in the order a reviewer works through them: what is not there
 * at all, what nobody has read, what changed after it was read, what was sent back, and
 * what is done. `missing` never occurs for an app whose locales have every key
 * (keksdose); kastlan's French lacks 172 screen texts.
 */
export type ReviewStatus = "missing" | "unreviewed" | "changed" | "needs_change" | "approved";

export const REVIEW_STATUSES: readonly ReviewStatus[] = [
  "missing",
  "unreviewed",
  "changed",
  "needs_change",
  "approved",
];

export interface TranslationRow {
  /** `${locale}|${key}` — unique across every locale on a page. A bar, not a colon:
   *  kastlan's keys contain colons (`common:actions.save`). */
  id: string;
  key: string;
  /** The key's group: `budget` for `budget.rta`, `common` for `common:actions.save`,
   *  `kit` for the kit's own words. See {@link keyNamespace}. */
  namespace: string;
  /** Where the string comes from, in the app's own words — kastlan's `screen` and
   *  `documents`, keksdose's one source. `""` when the app does not say. */
  source: string;
  locale: string;
  /** The wording users see today; empty when the locale lacks the string. */
  text: string;
  /** The same key in the reference locale. */
  reference: string;
  status: ReviewStatus;
  review: TranslationReview | null;
  /** The interpolations and tags differ from the reference's — `{{count}}` dropped, a
   *  `<1>` link lost, a `{date}` renamed. A machine can check that much, so it does,
   *  before a person reads. Never set on a missing string: it has nothing to lose. */
  placeholderMismatch: boolean;
}

// ── The wire contract ───────────────────────────────────────────────────────────

/** A verdict as `GET /translations/reviews` returns it (H1's shared contract). Typed
 *  structurally, so an app's generated OpenAPI type fits without a cast. */
export interface ApiTranslationReview {
  locale: string;
  key: string;
  text: string;
  reference_text: string | null;
  verdict: TranslationVerdict;
  note: string | null;
  suggestion: string | null;
  reviewer_name: string | null;
  reviewed_at: string;
}

/** One item of `PUT /translations/reviews`. */
export interface ApiTranslationReviewWrite {
  locale: string;
  key: string;
  text: string;
  reference_text: string | null;
  verdict: TranslationVerdict;
  note: string | null;
  suggestion: string | null;
}

/** A verdict from the server, in the kit's spelling. */
export function fromApiReview(review: ApiTranslationReview): TranslationReview {
  return {
    locale: review.locale,
    key: review.key,
    text: review.text,
    referenceText: review.reference_text,
    verdict: review.verdict,
    note: review.note,
    suggestion: review.suggestion,
    reviewerName: review.reviewer_name,
    reviewedAt: review.reviewed_at,
  };
}

/** A save, in the server's spelling. `TranslationReviewKey` needs no mapping — it is
 *  `{ locale, key }` on both sides. */
export function toApiWrite(write: TranslationReviewWrite): ApiTranslationReviewWrite {
  return {
    locale: write.locale,
    key: write.key,
    text: write.text,
    reference_text: write.referenceText,
    verdict: write.verdict,
    note: write.note,
    suggestion: write.suggestion,
  };
}

// ── Strings ─────────────────────────────────────────────────────────────────────

/**
 * A nested bundle as `key → string`, in the bundle's own order. Non-string leaves are
 * skipped rather than stringified into something nobody wrote.
 *
 * `prefix` is put in front of every key AS IS, so it names the separator too:
 * `flattenStrings(bundle)` is keksdose's `budget.rta`, `flattenStrings(tree, "common:")`
 * kastlan's `common:actions.save`, and `flattenStrings(kitLabelStrings(labels), "kit.")`
 * the kit's own words as `kit.combobox.resultCount(3)` — already flat, so only the prefix
 * is added.
 */
export function flattenStrings(tree: Readonly<Record<string, unknown>>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = `${prefix}${key}`;
    if (typeof value === "string") out[path] = value;
    else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flattenStrings(value as Record<string, unknown>, `${path}.`));
    }
  }
  return out;
}

/**
 * The key's group, for the namespace filter: the part before a colon when there is one
 * (kastlan's `common:actions.save` → `common`, `doc_text.invoice:due` →
 * `doc_text.invoice`), else the first dotted segment (keksdose's `budget.rta` →
 * `budget`, the kit's `kit.combobox.resultCount(3)` → `kit`). Only the part before a
 * sample's `(` is looked at, so a colon inside one cannot move the split.
 */
export function keyNamespace(key: string): string {
  const head = key.split("(", 1)[0];
  const colon = head.indexOf(":");
  return colon >= 0 ? head.slice(0, colon) : head.split(".", 1)[0];
}

// i18next `{{x}}` (formatting options ignored: `{{x, number}}` is `{{x}}`); a Python
// format field `{x}` / `{0}` / `{amount:.2f}` (kastlan's document texts), but not a
// LaTeX argument (`\textbf{x}` — a letter or backslash right before the brace); a
// numbered or named tag (`<1>`, `<strong>`), not prose in angle brackets ("<deleted
// user>"); and a nested `$t(key)`. `{{x}}` is tried first at its position and consumed
// whole, so it is never counted a second time as `{x}`.
const PLACEHOLDER_RE =
  /\{\{\s*([^}\s,]+)[^}]*\}\}|(?<![\\A-Za-z])\{([a-z_][a-z0-9_]*|\d+)(?:[!:][^{}]*)?\}|<\/?(\d+|[a-z][a-z0-9]*)\s*\/?>|\$t\(([^)]+)\)/g;

/** The placeholders in a string, as a sorted multiset: `{{count}}`, `{date}`, `<1>`,
 *  `$t(common.save)`. */
export function placeholderTokens(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(PLACEHOLDER_RE)) {
    if (m[1]) found.push(`{{${m[1]}}}`);
    else if (m[2]) found.push(`{${m[2]}}`);
    else if (m[3]) found.push(`<${m[3]}>`);
    else if (m[4]) found.push(`$t(${m[4]})`);
  }
  return found.sort();
}

/** Whether `text` has other placeholders than `reference` — dropped, renamed or added.
 *  Moving one is fine: a translation reorders a sentence. */
export function placeholderMismatch(text: string, reference: string): boolean {
  const a = placeholderTokens(text);
  const b = placeholderTokens(reference);
  return a.length !== b.length || a.some((p, i) => p !== b[i]);
}

// ── Status ──────────────────────────────────────────────────────────────────────

/**
 * A verdict counts only for the wording it was given on. If the string or its reference
 * changed since, it is `changed` — read it again — whatever the verdict was. A string the
 * locale lacks is `missing` until somebody suggests its translation (stored as
 * NEEDS_CHANGE on the empty text, so it reads `needs_change`, and `changed` once a
 * developer adds the string).
 */
export function reviewStatus(
  review: TranslationReview | null | undefined,
  text: string,
  reference: string,
): ReviewStatus {
  if (!review) return text === "" && reference !== "" ? "missing" : "unreviewed";
  if (review.text !== text) return "changed";
  if (review.referenceText != null && review.referenceText !== reference) return "changed";
  return review.verdict === "APPROVED" ? "approved" : "needs_change";
}

/** Whether `key` lies in `area`: the key IS the area, or sits under it — `legal.terms`
 *  and kastlan's `legal:terms` are in `legal`, `legalese.title` is not. */
export function keyInArea(key: string, area: string): boolean {
  return key === area || key.startsWith(`${area}.`) || key.startsWith(`${area}:`);
}

/**
 * Whether `key` lies in one of `areas` — the scope a reviewer may be limited to
 * (keksdose: `["legal"]`, a lawyer who judges the Imprint, the Privacy Policy and the
 * Terms and sees nothing else). `null`/`undefined` is every area. The server applies the
 * same rule and refuses verdicts outside; this decides only what is listed.
 */
export function keyInAreas(
  key: string,
  areas: readonly string[] | null | undefined,
  inArea: (key: string, area: string) => boolean = keyInArea,
): boolean {
  return !areas || areas.some((area) => inArea(key, area));
}

export interface TranslationRowsInput {
  locale: string;
  /** The locale's strings, `key → text` ({@link flattenStrings}). */
  strings: Readonly<Record<string, string>>;
  /** The reference locale's strings — whichever locale THIS app reads `locale` against. */
  reference: Readonly<Record<string, string>>;
  /** The verdicts: this locale's by key, or the whole list as the server sent it (other
   *  locales' verdicts are skipped). */
  reviews?: ReadonlyMap<string, TranslationReview> | readonly TranslationReview[];
  /** Default {@link keyNamespace}. */
  namespaceOf?: (key: string) => string;
  /** The row's source, an app-defined word (kastlan: `doc_text.` keys are `documents`,
   *  the rest `screen`). Default: none (`""`). */
  sourceOf?: (key: string) => string;
  /** Keep only keys inside these areas ({@link keyInAreas}); `null` keeps every key. */
  areas?: readonly string[] | null;
  /** Default {@link keyInArea}. */
  inArea?: (key: string, area: string) => boolean;
}

/**
 * Every key of one locale, with its status: the reference's keys first, in its order, so
 * rows read the way the app's authors wrote them; a key only this locale has is appended
 * rather than dropped (a parity test should forbid it, but the page should not lie if one
 * slips through).
 */
export function translationRows({
  locale,
  strings,
  reference,
  reviews,
  namespaceOf: groupOf = keyNamespace,
  sourceOf,
  areas,
  inArea,
}: TranslationRowsInput): TranslationRow[] {
  const byKey = new Map<string, TranslationReview>();
  if (reviews instanceof Map) {
    for (const [key, review] of reviews) byKey.set(key, review);
  } else if (reviews) {
    for (const review of reviews as readonly TranslationReview[]) {
      if (review.locale === locale) byKey.set(review.key, review);
    }
  }
  const keys = Object.keys(reference);
  for (const key of Object.keys(strings)) if (!(key in reference)) keys.push(key);
  return keys
    .filter((key) => keyInAreas(key, areas, inArea))
    .map((key) => {
      const text = strings[key] ?? "";
      const ref = reference[key] ?? "";
      const review = byKey.get(key) ?? null;
      return {
        id: `${locale}|${key}`,
        key,
        namespace: groupOf(key),
        source: sourceOf?.(key) ?? "",
        locale,
        text,
        reference: ref,
        status: reviewStatus(review, text, ref),
        review,
        placeholderMismatch: text !== "" && placeholderMismatch(text, ref),
      };
    });
}

/** How many rows stand where, and how many there are. */
export type TranslationSummary = Record<ReviewStatus, number> & { total: number };

export function summariseRows(rows: readonly TranslationRow[]): TranslationSummary {
  const summary: TranslationSummary = {
    missing: 0,
    unreviewed: 0,
    changed: 0,
    needs_change: 0,
    approved: 0,
    total: rows.length,
  };
  for (const row of rows) summary[row.status] += 1;
  return summary;
}

// ── Filtering ───────────────────────────────────────────────────────────────────

/** The panel's filters. `"all"` switches one off. */
export interface TranslationReviewFilter {
  status: ReviewStatus | "all";
  source: string;
  namespace: string;
  /** Searched in the key, the text and the reference, case-insensitively. */
  query: string;
  placeholdersOnly: boolean;
}

export const DEFAULT_TRANSLATION_REVIEW_FILTER: TranslationReviewFilter = {
  status: "all",
  source: "all",
  namespace: "all",
  query: "",
  placeholdersOnly: false,
};

export function filterTranslationRows(
  rows: readonly TranslationRow[],
  filter: Partial<TranslationReviewFilter>,
): TranslationRow[] {
  const f = { ...DEFAULT_TRANSLATION_REVIEW_FILTER, ...filter };
  const q = f.query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (f.status === "all" || row.status === f.status) &&
      (f.source === "all" || row.source === f.source) &&
      (f.namespace === "all" || row.namespace === f.namespace) &&
      (!f.placeholdersOnly || row.placeholderMismatch) &&
      (!q ||
        row.key.toLowerCase().includes(q) ||
        row.text.toLowerCase().includes(q) ||
        row.reference.toLowerCase().includes(q)),
  );
}

// ── Grouping ────────────────────────────────────────────────────────────────────

/** One group of rows — an area, a source — and how they stand. */
export interface TranslationRowGroup {
  key: string;
  rows: TranslationRow[];
  summary: TranslationSummary;
}

/**
 * Rows in groups, each group where its first row is — the reference's order, so the areas
 * read the way the app's authors wrote the bundle — and each group's rows in their own
 * order. keksdose live #377: a reviewer on a phone works area by area ("the budget
 * strings, then the legal ones"), and a flat list of 3859 rows is not a way to see
 * where an area stands.
 *
 * `groupOf` names a row's group: `(row) => row.namespace` for the areas,
 * `(row) => row.source` for kastlan's screen texts and documents.
 */
export function groupTranslationRows(
  rows: readonly TranslationRow[],
  groupOf: (row: TranslationRow) => string,
): TranslationRowGroup[] {
  const byKey = new Map<string, TranslationRow[]>();
  for (const row of rows) {
    const key = groupOf(row);
    const list = byKey.get(key);
    if (list) list.push(row);
    else byKey.set(key, [row]);
  }
  return [...byKey].map(([key, list]) => ({ key, rows: list, summary: summariseRows(list) }));
}

/**
 * The rows a group's "Approve the unreviewed" takes: the ones nobody has given a verdict
 * and that have a text. Not `changed` — a string that moved since it was judged asks to
 * be READ again, which a bulk action is the opposite of — and not `missing`, which has
 * nothing to approve.
 */
export function unreviewedRows(rows: readonly TranslationRow[]): TranslationRow[] {
  return rows.filter((row) => row.status === "unreviewed" && row.text !== "");
}

// ── Writing ─────────────────────────────────────────────────────────────────────

/** What gets stored for a verdict: the wording it was given on, so a later change of the
 *  string (or of its reference) shows up as `changed`. */
export function reviewWrite(
  row: TranslationRow,
  verdict: TranslationVerdict,
  note: string | null = null,
  suggestion: string | null = null,
): TranslationReviewWrite {
  return {
    locale: row.locale,
    key: row.key,
    text: row.text,
    referenceText: row.reference,
    verdict,
    note,
    suggestion,
  };
}

/** What takes a set of verdicts back: see {@link reviewUndo}. */
export interface TranslationReviewUndo {
  /** The verdicts the rows had before, to store again — each on the wording it was
   *  given on, so a row that was `changed` reads `changed` again. */
  writes: TranslationReviewWrite[];
  /** The rows that had no verdict before: back to unreviewed. */
  clears: TranslationReviewKey[];
}

/**
 * How to take back what was just said about `rows` — the rows AS THEY WERE before the
 * write, with the verdicts they carried then. The panel's Undo toast (0.25, keksdose live
 * #377) runs it: a swipe on a phone approves in one movement, and a movement can be a
 * mistake.
 *
 * A row that had a verdict gets it stored again (its note, its suggestion, the wording it
 * was judged on); one that had none is cleared. The server stamps the restored verdict
 * with the person undoing and the time, as it stamps every write — the contract has no
 * way to write a verdict in somebody else's name, and should not.
 */
export function reviewUndo(rows: readonly TranslationRow[]): TranslationReviewUndo {
  const writes: TranslationReviewWrite[] = [];
  const clears: TranslationReviewKey[] = [];
  for (const row of rows) {
    const before = row.review;
    if (!before) {
      clears.push({ locale: row.locale, key: row.key });
      continue;
    }
    writes.push({
      locale: row.locale,
      key: row.key,
      text: before.text,
      referenceText: before.referenceText,
      verdict: before.verdict,
      note: before.note,
      suggestion: before.suggestion,
    });
  }
  return { writes, clears };
}

/** The app's cached verdict list with `written` in place of what was said before — a
 *  save answers with the rows it wrote, so a page patches its copy instead of
 *  downloading every verdict again after each click. Any spelling with `locale` and
 *  `key` (the API's or the kit's). */
export function mergeReviews<T extends TranslationReviewKey>(prev: readonly T[], written: readonly T[]): T[] {
  const id = (r: TranslationReviewKey) => `${r.locale}|${r.key}`;
  const replaced = new Set(written.map(id));
  return [...prev.filter((r) => !replaced.has(id(r))), ...written];
}

/** The cached list without the verdicts on `cleared`. */
export function dropReviews<T extends TranslationReviewKey>(
  prev: readonly T[],
  cleared: readonly TranslationReviewKey[],
): T[] {
  const gone = new Set(cleared.map((r) => `${r.locale}|${r.key}`));
  return prev.filter((r) => !gone.has(`${r.locale}|${r.key}`));
}

// ── Export ──────────────────────────────────────────────────────────────────────

/**
 * One entry of the "Export corrections" file — enough for a developer to apply the change
 * to the bundle without opening the page. snake_case `reviewed_at` on purpose: this is a
 * FILE, the one keksdose and kastlan already write, beside an API spelled that way.
 */
export interface TranslationCorrection {
  locale: string;
  key: string;
  status: ReviewStatus;
  current: string;
  reference: string;
  suggestion: string | null;
  note: string | null;
  reviewer: string | null;
  reviewed_at: string | null;
}

/** The rows sent back (verdict NEEDS_CHANGE — a suggested translation for a missing
 *  string included), as the export file lists them. */
export function translationCorrections(rows: readonly TranslationRow[]): TranslationCorrection[] {
  return rows
    .filter((row) => row.review?.verdict === "NEEDS_CHANGE")
    .map((row) => ({
      locale: row.locale,
      key: row.key,
      status: row.status,
      current: row.text,
      reference: row.reference,
      suggestion: row.review?.suggestion ?? null,
      note: row.review?.note ?? null,
      reviewer: row.review?.reviewerName ?? null,
      reviewed_at: row.review?.reviewedAt ?? null,
    }));
}
