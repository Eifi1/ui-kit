import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ListChecks, PencilLine, RotateCcw } from "lucide-react";

import { useBreakpoint } from "../hooks/use-breakpoint";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import {
  DEFAULT_TRANSLATION_REVIEW_FILTER,
  DEFAULT_TRANSLATION_REVIEW_SWIPE,
  REVIEW_STATUSES,
  filterTranslationRows,
  groupTranslationRows,
  keyInAreas,
  reviewUndo,
  reviewWrite,
  summariseRows,
  translationReviewSwipePlan,
  unreviewedRows,
} from "../lib/translation-review";
import type {
  ReviewStatus,
  TranslationReviewFilter,
  TranslationReviewKey,
  TranslationReviewSwipeAction,
  TranslationReviewSwipeBinding,
  TranslationReviewWrite,
  TranslationRow,
  TranslationRowGroup,
} from "../lib/translation-review";
import { AlertBanner } from "./alert-banner";
import { BulkActionBar } from "./bulk-action-bar";
import { Checkbox } from "./checkbox";
import { Chip } from "./chip";
import { DataTable } from "./data-table";
import type { DataTableColumn, DataTableProps, MobileSwipeActions, SortState } from "./data-table";
import { Disclosure } from "./disclosure";
import { SearchField } from "./search-field";
import { toast } from "./toast";
import type { SwipeAction } from "./swipeable-row";
import { ToggleGroup } from "./toggle-group";
import { TranslationReviewEditor } from "./translation-review-editor";
import { DEFAULT_TRANSLATION_REVIEW_LABELS, reviewStatusLabel } from "./translation-review-labels";
import type { TranslationReviewLabels } from "./translation-review-labels";
import { ReviewStatusChip, TranslationProgress } from "./translation-review-parts";
import { Button, IconButton, Select } from "./ui";
import { useWriteLock } from "./write-lock";

export {
  REVIEW_STATUS_TONES,
  ReviewStatusChip,
  TranslationExportButton,
  TranslationLocaleTabs,
  TranslationProgress,
} from "./translation-review-parts";
export type {
  ReviewStatusChipProps,
  TranslationExportButtonProps,
  TranslationLocaleTab,
  TranslationLocaleTabsProps,
  TranslationProgressProps,
} from "./translation-review-parts";
export { TranslationReviewEditor } from "./translation-review-editor";
export type { TranslationReviewEditorProps } from "./translation-review-editor";
export { DEFAULT_TRANSLATION_REVIEW_LABELS } from "./translation-review-labels";
export type { TranslationReviewLabels } from "./translation-review-labels";

/**
 * An app's translation review page, as kit parts (H1, docs/i18n-harmonization.md):
 * keksdose's /translations, which kastlan was about to build a second time. The app keeps
 * what is its own — where the strings come from, which locale is read against which, who
 * may review what, every request — and hands the kit rows (`translationRows`) and two
 * callbacks. Everything a reviewer touches is here.
 *
 * Presentational — no request, no route — and one LOCALE at a time. Its table is the
 * kit's DataTable, so like every DataTable it renders under the app's Router. The page
 * around it puts
 * {@link TranslationLocaleTabs} above it and {@link TranslationExportButton} in its header,
 * because both span every locale while this panel is the one open.
 *
 * Callbacks may return promises, and the panel waits for them: an editor stays open with
 * its text and the error when a save is refused (a 403 for a key outside the reviewer's
 * areas, a network failure), a bulk action keeps its selection. Chunking a long bulk
 * write to the server's batch limit is the app's; the panel sends one call per action.
 */

type MaybePromise = void | Promise<unknown>;

/** What asked for a write — see {@link TranslationReviewSaveInfo}. */
export type TranslationReviewOrigin = "editor" | "row" | "swipe" | "group" | "selection" | "undo";

/**
 * The second argument of `onSave` and `onClear` (0.25): where the write came from, and
 * whether the panel answers it with a toast of its own.
 *
 * WHY THE APP IS TOLD. keksdose and kastlan toast "Saved" from their mutation on every
 * save. With {@link TranslationReviewPanelProps.undo} on, an approval is answered by the
 * kit's Undo toast instead — and a reviewer swiping through a list then read two toasts
 * per card. The app skips its own where `toasted` is true:
 *
 *     onSave={(writes, { toasted }) => save.mutateAsync({ items: writes.map(toApiWrite), quiet: toasted })}
 *
 * An app that ignores the argument keeps working; it only says "Saved" twice.
 */
export interface TranslationReviewSaveInfo {
  /** The open editor, a row's approve button, a swipe on a phone card, a group's
   *  "Approve unreviewed", the selection's bulk bar, or an Undo pressed on the toast. */
  origin: TranslationReviewOrigin;
  /** The panel shows its own toast for this write (an approval's Undo toast, or a
   *  swiped `clear`'s). */
  toasted: boolean;
}

/** How {@link TranslationReviewPanelProps.groupBy} names a row's group. */
export type TranslationReviewGroupBy = "namespace" | "source" | ((row: TranslationRow) => string);

export interface TranslationReviewPanelProps {
  /** One locale's rows, from `translationRows`. */
  rows: readonly TranslationRow[];
  /** The reviewed language's own name — the text column's header ("Français"). */
  localeLabel: string;
  /** The reference language's own name — the reference column's header. */
  referenceLabel: string;
  /** Store verdicts: one for an editor or a row's approve button, many for a bulk
   *  approve. Left out (or `readOnly`): nothing can be changed. The second argument
   *  says where the write came from ({@link TranslationReviewSaveInfo}). */
  onSave?: (writes: TranslationReviewWrite[], info: TranslationReviewSaveInfo) => MaybePromise;
  /** Clear verdicts — back to unreviewed. Left out: no reset, and an approval of a row
   *  that had no verdict cannot be undone. */
  onClear?: (keys: TranslationReviewKey[], info: TranslationReviewSaveInfo) => MaybePromise;
  /** A locale the viewer may read but not review: the rows and their verdicts, no
   *  actions, and a line saying so. */
  readOnly?: boolean;
  /**
   * The areas the reviewer is limited to (keksdose's lawyer: `["legal"]`), as the server
   * answers them; `null` is every area. Rows outside are not shown or counted — build the
   * rows with the same `areas` and they never exist — and a notice names the areas.
   */
  areas?: readonly string[] | null;
  /** An area's name for the notice ("the legal pages (Imprint, …)"). Default: the key. */
  areaLabels?: Readonly<Record<string, string>>;
  /** Default `keyInArea`: the key is the area or sits under it (`legal.…`, `legal:…`,
   *  and the kit's `kit.legal.…` since 0.28). */
  inArea?: (key: string, area: string) => boolean;
  /** A source's name for the source filter, which appears once the rows come from more
   *  than one (kastlan: `{ screen: "Screen", documents: "PDFs and emails" }`). Default:
   *  the source itself. */
  sourceLabels?: Readonly<Record<string, string>>;
  /**
   * Controlled filters — for an app that keeps them in the URL (keksdose's `?status=`,
   * `?ns=`, `?q=`). Whatever is left out is the panel's own. Pair with `onFilterChange`.
   *
   * A field passed here is the app's, and the control shows what the app says: one the app
   * passes but does not write back from `onFilterChange` is a control that does nothing.
   * A development build warns about that once per field (0.25.1, Kurvenschmiede); a field
   * left out entirely is fine — the panel keeps it.
   */
  filter?: Partial<TranslationReviewFilter>;
  /** Every filter, on every change — write them in ONE update: `useSearchParamsState`'s
   *  setter takes this object as it is (`filter={filter} onFilterChange={setFilter}`).
   *  Single `useSearchParamState` setters compose since 0.25; before, four in a row
   *  clobbered each other (keksdose live #378). */
  onFilterChange?: (filter: TranslationReviewFilter) => void;
  /** The progress bar over the filters. Default true. */
  progress?: boolean;
  /** Rows per page. Default 50. */
  pageSize?: number;
  /** Persists the table's sort and page size (DataTable's `storageKey`). */
  storageKey?: string;
  /** How a verdict's date reads in the editor. */
  formatDate?: (iso: string) => string;
  /** Turns a callback's rejection into words. Default {@link TranslationReviewLabels.failed}. */
  formatError?: (error: unknown) => ReactNode;
  /**
   * Swipe the phone cards (0.25, keksdose live #377 — Marcel reviewing on a phone): toward
   * the reading END to approve, toward the START for "Needs a change", which OPENS the
   * editor with the cursor in the wording rather than sending the string back blind — a
   * verdict without a note or a better wording tells whoever fixes it nothing. In a
   * right-to-left page the two sides mirror with the reading direction.
   *
   * DataTable's swipe sides (`mobileSwipeActions`) on {@link SwipeableRow}: the same
   * gesture, the same feedback, and the same keyboard path — every swipe is also a real
   * button, read out and reachable by Tab, so the gesture is a shortcut and never the only
   * way. A row has no swipe while the editor under it is open, while its own write is out,
   * under a {@link WriteLockProvider} lock, in a `readOnly` locale, and toward "Approve"
   * where there is nothing to approve (a missing string, an approved one). A reviewer
   * limited to `areas` never sees a row outside them, so never swipes one.
   *
   * Off by default, so no existing page gains a gesture on the bump. Phones only; the
   * desktop table keeps its approve button.
   *
   * A BINDING instead of `true` (keksdose — Marcel's live #377 rework, 2026-10-03: *"Add
   * the swipe options to be shown also to the settings /settings#interaction area where
   * the other swipe options are defined"*): keksdose lets the user bind every list's
   * swipes in Settings → Interaction, per side a primary action at the first threshold and
   * a secondary one at a longer drag, and a fixed mapping is one its settings cannot
   * reach. So each logical side takes an ordered ladder of
   * {@link TranslationReviewSwipeAction}s — index 0 at the first threshold, index 1 at the
   * longer drag, as {@link SwipeableRow} stages them:
   *
   *     swipe={{ end: ["approve", "clear"], start: ["edit"] }}
   *
   * `approve` (with Undo), `edit` (the editor, cursor in the wording — "Needs a change"),
   * `clear` (the verdict taken back, with Undo, which stores it again; only with
   * `onClear`). An action a row cannot offer drops out and the ladder closes up behind it
   * ({@link translationReviewSwipePlan}): `approve` on an approved or missing string,
   * `clear` on a row with no verdict. Every rule above still holds for every binding —
   * no side swipes in a `readOnly` locale, under a write lock, with the editor open or
   * the row's write out.
   *
   * `true` is {@link DEFAULT_TRANSLATION_REVIEW_SWIPE} — `{ end: ["approve"], start:
   * ["edit"] }`, 0.25's mapping exactly — and `false` or nothing is no swipe. A binding
   * turns the Undo toast on by default, as `true` does.
   */
  swipe?: boolean | TranslationReviewSwipeBinding;
  /**
   * Answer every approval with the kit's Undo toast (`toast.undo`): a row's button, a
   * swipe, the editor's Approve, a group's and the selection's bulk approve. Undo stores
   * again what the rows said before ({@link reviewUndo}) — or clears them, for rows that
   * had no verdict, which needs `onClear` (without it the toast reports and offers
   * nothing). A batch has ONE Undo.
   *
   * Default: on with `swipe` or `groupBy` — the two ways to approve in one movement or many
   * rows at once bring their way back — and off otherwise, so an existing page does not
   * gain a toast on the bump. Needs the app's `<Toaster>`. Tell the app's own "Saved"
   * toast apart with the `toasted` flag ({@link TranslationReviewSaveInfo}).
   */
  undo?: boolean;
  /**
   * Group the strings under a header per area (0.25, keksdose live #377: *"grouping to the
   * translation review entries for faster reviewing"*): `"namespace"` — the row's
   * `namespace`, which `translationRows` derives from the key (`budget`, `kit.dataTable`
   * with keksdose's `namespaceOf`) — `"source"`, or a function of the row.
   *
   * Each group is a section with a heading ({@link groupHeadingAs}): its name, "n
   * unreviewed / total", and "Approve unreviewed (n)", which approves the group's rows
   * nobody has given a verdict ({@link unreviewedRows}) under the same rules as one
   * approval — write lock, `readOnly`, one write at a time — with one Undo for the batch.
   * A batch larger than `pageSize` asks first, inside the opened group: more than a page
   * is more than the reviewer can have had on screen.
   *
   * WHAT IT MEANS FOR THE FILTERS, THE SORT AND THE PAGES. The filters narrow the rows
   * first, then the rows are grouped: a header counts what the filters show in it (so
   * "Approve unreviewed" never takes a row the reviewer filtered away), and an area with
   * nothing left is not shown. Groups stand in the order their first string has in the
   * reference; a column sort orders the rows INSIDE every group alike. Each group pages
   * on its own, `pageSize` rows at a time — a header then always stands over its own
   * rows, and paging one area does not move another — rather than one pager cutting
   * through the headers. `storageKey` keeps persisting the ungrouped table only.
   *
   * Groups fold (each on its own, remembered while the panel lives), and a folded group's
   * rows are not rendered at all — only its header. Which groups start open is
   * {@link defaultGroupsOpen}: by default, on a phone they start folded when there are
   * several — the headers are then the area list, and the reviewer opens the one to work
   * through — and on a wide screen they start open while that is cheap (see there).
   */
  groupBy?: TranslationReviewGroupBy;
  /**
   * Which groups start open under {@link groupBy} (0.25.1). A group the reviewer opens or
   * folds keeps that; this is what every other group follows.
   *
   * - `"auto"` (default): on a phone, open when there is one group and folded when there
   *   are several, as in 0.25.0. On a wide screen, open while opening every group renders
   *   at most 100 rows (each group shows up to `pageSize` of them; the budget is one page
   *   where `pageSize` is larger) — and folded above that, the headers then being the area
   *   list, as on a phone.
   * - `true`: every group starts open, on a phone too.
   * - `false`: every group starts folded, on a wide screen too.
   *
   * WHY A BUDGET OF ROWS (keksdose, measured on 0.25.0): a wide screen opened EVERY group.
   * keksdose's /translations has 122 areas and ~4700 strings — 122 tables and 2053 rows at
   * once, ~46 000 elements, 5.2 s before the panel appeared and 2.5 s for a filter click
   * to paint, against 50 rows and 0.34 s ungrouped; its page test went from 4 s to 146 s.
   * kastlan (~31 areas, ~1300 rows open) and Kurvenschmiede (28, ~700) had the same page.
   * What costs is the rows on screen, so the rule counts them rather than the groups:
   * 100 rows is two of the panel's default pages — any one or two areas still open as
   * before, however long, and so do a dozen small ones, or a search whose hits fall in
   * many areas — while a whole catalogue starts as its list of areas: keksdose's shape
   * in jsdom, 122 headers and ~2100 elements instead of ~44 000 (the ungrouped panel has
   * ~1200). The rule follows the filters: narrow them and the groups open.
   *
   * A boolean rather than a controlled open state: the panel already keeps each group's
   * own state, and an app that only wants "all open" or "all folded" should not have to
   * keep a record of 122 flags to say it.
   */
  defaultGroupsOpen?: boolean | "auto";
  /** A group's name. Default: `sourceLabels` for `groupBy="source"`, else the key. */
  groupLabel?: (group: string) => string;
  /** The level of the group headings. Default `h2`: the panel is a page's body, under
   *  the page's `h1`. */
  groupHeadingAs?: "h2" | "h3" | "h4";
  className?: string;
  labels?: Partial<TranslationReviewLabels>;
}


/**
 * How many rows the groups may render at once on a wide screen before they start folded
 * ({@link TranslationReviewPanelProps.defaultGroupsOpen}): two of the default 50-row pages.
 * A row costs about twenty elements in either layout, so this is the cost of two pages of
 * the ungrouped table — not of 2053 rows in 122 tables.
 */
const GROUPS_OPEN_ROW_BUDGET = 100;

/**
 * Would opening every group stay within the budget? Each group renders up to `pageSize`
 * rows (it pages on its own); the budget is never less than one page, so a single group —
 * which renders at most one — always starts open, as on a phone.
 */
function groupsFitOpen(groups: readonly TranslationRowGroup[], pageSize: number): boolean {
  const budget = Math.max(GROUPS_OPEN_ROW_BUDGET, pageSize);
  let rendered = 0;
  for (const group of groups) {
    rendered += Math.min(group.rows.length, pageSize);
    if (rendered > budget) return false;
  }
  return true;
}

/**
 * The kit's dev switch, as NumberInput's money guard and `lib/logger.ts` read it: a
 * development build — the consumer's bundler makes `import.meta.env.DEV` false in a
 * production one, and the branch is dead code there — and never under vitest, where every
 * consumer suite would print it; a test opts in with `vi.stubEnv("VITEST", "")`. Read per
 * call, and optional-chained: `import.meta.env` is a Vite injection, absent under Node.
 */
function devWarnings(): boolean {
  return Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;
}

type FilterField = keyof TranslationReviewFilter;

/** How long after the last filter change the app's `filter` is looked at again: well past
 *  a router's transition, so a URL that is still being written is not mistaken for one
 *  that never will be. */
const FILTER_ECHO_MS = 1500;

/**
 * The development warning for a controlled filter that does not follow (Kurvenschmiede,
 * 0.25.1). A field the app passes in `filter` is the app's: the panel shows the app's
 * value, whatever the reviewer picked. An app that passes a field but does not write the
 * reported value back — its `onFilterChange` hands on only some fields, `filter` is built
 * as `{ ...DEFAULT_TRANSLATION_REVIEW_FILTER, ...fromTheUrl }`, a URL parser rejects what
 * its serialiser wrote, or there is no `onFilterChange` at all — has a control that
 * silently does nothing: the box unticks itself, the select jumps back.
 *
 * So, after the panel reports a change of a field the app controls, it looks at the
 * app's `filter` again once the change has had time to land ({@link FILTER_ECHO_MS}, read
 * from the last COMMITTED props, so a router transition still rendering does not count),
 * and warns — once per field — when that field still holds the value it had before.
 *
 * Quiet by construction for an app that passes no `filter`, and for a field the app LEAVES
 * OUT: that field is the panel's own and works (keksdose keeps the placeholder switch so,
 * on purpose). Quiet too when the app moved the field somewhere else itself. Development
 * builds only (see {@link devWarnings}): in production and under vitest nothing is
 * recorded and no timer is set.
 */
function useFilterEchoCheck(filterProp: Partial<TranslationReviewFilter> | undefined) {
  const committed = useRef(filterProp);
  useEffect(() => {
    committed.current = filterProp;
  });
  // Per field: what the app's filter said when the reviewer first changed it, and what
  // the panel reported last.
  const pending = useRef(new Map<FilterField, { from: unknown; to: unknown }>());
  const warned = useRef(new Set<FilterField>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (next: TranslationReviewFilter) => {
    if (filterProp === undefined || !devWarnings()) return;
    for (const field of Object.keys(next) as FilterField[]) {
      const from = filterProp[field];
      if (from === undefined || warned.current.has(field)) continue;
      const seen = pending.current.get(field);
      if (seen) seen.to = next[field];
      else if (next[field] !== from) pending.current.set(field, { from, to: next[field] });
    }
    if (pending.current.size === 0) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const now = committed.current;
      for (const [field, { from, to }] of pending.current) {
        if (to === from || now?.[field] !== from || warned.current.has(field)) continue;
        warned.current.add(field);
        console.warn(
          `[ui-kit] TranslationReviewPanel: the "${field}" filter was changed to ${JSON.stringify(to)}, but the ` +
            `\`filter\` prop still says ${JSON.stringify(from)}, so the control does nothing. A field passed in ` +
            `\`filter\` is the app's: write back every field \`onFilterChange\` reports, in one update ` +
            `(useSearchParamsState's setter takes the object as it is), or leave the field out of \`filter\` and ` +
            `the panel keeps it. (Development builds only; once per field.)`,
        );
      }
      pending.current.clear();
    }, FILTER_ECHO_MS);
  };
}

/** The row's text — or, for a missing string, the line that says so. */
function TextCell({ row, labels, clamp }: { row: TranslationRow; labels: TranslationReviewLabels; clamp?: boolean }) {
  return row.text === "" ? (
    <span className="italic text-[var(--text-muted)]">{labels.missingText}</span>
  ) : (
    <span lang={row.locale} className={cn("whitespace-pre-line break-words", clamp && "line-clamp-3")}>
      {row.text}
    </span>
  );
}

/**
 * The page body for one locale: progress, filters (status, source, namespace, search,
 * placeholder problems), the strings with an editor that unfolds under each, and the
 * bulk actions over a selection.
 *
 * The status filter is the work queue in order — what is not there, what nobody has
 * read, what changed after it was read, what was sent back, what is done — with each
 * count on it. "Missing" is offered only where something is.
 *
 * Bulk approve takes the selected rows that are not approved yet and have a text:
 * approving an absent string says nothing, and re-approving one says it again. On a
 * phone the table has no checkboxes, so "Select all shown" selects what the filters
 * show — filter to `Unreviewed` in one area, read, select, approve. With `groupBy`, a
 * group's own "Approve unreviewed" is the shorter way, and with `swipe` a card is approved
 * by a swipe.
 *
 * The panel's writes go out ONE AT A TIME, in the order they were asked for: two writes on
 * one locale's verdicts can answer out of order, and an Undo must not overtake the
 * approval it takes back. A swipe on the next card while one is out is queued rather than
 * refused — a reviewer swiping down a list is faster than the server.
 */
export function TranslationReviewPanel({
  rows: rowsProp,
  localeLabel,
  referenceLabel,
  onSave,
  onClear,
  readOnly = false,
  areas,
  areaLabels,
  inArea,
  sourceLabels,
  filter: filterProp,
  onFilterChange,
  progress = true,
  pageSize = 50,
  storageKey,
  formatDate,
  formatError,
  swipe = false,
  undo: undoProp,
  groupBy,
  groupLabel,
  groupHeadingAs = "h2",
  defaultGroupsOpen = "auto",
  className,
  labels: labelsProp,
}: TranslationReviewPanelProps) {
  const labels = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS, labelsProp);
  const locale = useKitLocale();
  const lock = useWriteLock();
  // The wide screen's breakpoint — the one DataTable switches its layout on, so "a phone"
  // means the same here as in the table, at every text size.
  const phone = !useBreakpoint("md", true);
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const editable = !readOnly && onSave !== undefined;
  const binding: TranslationReviewSwipeBinding | null =
    swipe === true ? DEFAULT_TRANSLATION_REVIEW_SWIPE : swipe || null;
  const undoOn = undoProp ?? (binding !== null || groupBy !== undefined);

  const [ownFilter, setOwnFilter] = useState<TranslationReviewFilter>(DEFAULT_TRANSLATION_REVIEW_FILTER);
  // The app's fields over the panel's own; a field the app leaves `undefined` is the
  // panel's, not a blank.
  const filter: TranslationReviewFilter = { ...ownFilter };
  for (const [name, value] of Object.entries(filterProp ?? {})) {
    if (value !== undefined) Object.assign(filter, { [name]: value });
  }
  const echoFilter = useFilterEchoCheck(filterProp);
  const [openId, setOpenId] = useState<string | null>(null);
  // The row whose editor a swipe opened, to be written in: its wording field takes focus.
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  // The writes asked for and not yet answered, in order: the first is the one out. The
  // editor keeps its own, for its own buttons.
  const [queued, setQueued] = useState<readonly string[]>([]);
  const claimed = useRef(new Set<string>());
  const tail = useRef<Promise<unknown>>(Promise.resolve());
  const undoCount = useRef(0);
  const [failure, setFailure] = useState<ReactNode>(null);
  const busy = queued.length > 0;
  const isQueued = (key: string) => queued.includes(key);

  const rows = useMemo(
    () => (areas ? rowsProp.filter((row) => keyInAreas(row.key, areas, inArea)) : [...rowsProp]),
    [rowsProp, areas, inArea],
  );
  const summary = useMemo(() => summariseRows(rows), [rows]);
  const sources = useMemo(() => [...new Set(rows.map((r) => r.source))], [rows]);
  const source = sources.includes(filter.source) ? filter.source : "all";
  const namespaces = useMemo(
    () => [...new Set(rows.filter((r) => source === "all" || r.source === source).map((r) => r.namespace))],
    [rows, source],
  );
  const namespace = namespaces.includes(filter.namespace) ? filter.namespace : "all";
  const mismatches = useMemo(() => rows.filter((r) => r.placeholderMismatch).length, [rows]);
  // `filter` is rebuilt every render; its fields are what the list depends on.
  const { status, query, placeholdersOnly } = filter;
  const visible = useMemo(
    () => filterTranslationRows(rows, { status, source, namespace, query, placeholdersOnly }),
    [rows, status, source, namespace, query, placeholdersOnly],
  );

  // ── Groups ──
  const groups = useMemo(() => {
    if (groupBy === undefined) return null;
    const of =
      groupBy === "namespace"
        ? (r: TranslationRow) => r.namespace
        : groupBy === "source"
          ? (r: TranslationRow) => r.source
          : groupBy;
    return groupTranslationRows(visible, of);
  }, [visible, groupBy]);
  const groupName = (key: string) =>
    groupLabel?.(key) ?? (groupBy === "source" ? sourceLabels?.[key] : undefined) ?? (key || "—");
  // Only what the reviewer chose; a group nobody has touched follows the default, which
  // follows the filters (see `defaultGroupsOpen`).
  const [groupOpen, setGroupOpen] = useState<Readonly<Record<string, boolean>>>({});
  const groupOpenByDefault =
    defaultGroupsOpen !== "auto"
      ? defaultGroupsOpen
      : groups !== null && (phone ? groups.length <= 1 : groupsFitOpen(groups, pageSize));
  const isGroupOpen = (key: string) => groupOpen[key] ?? groupOpenByDefault;
  const setGroupOpenFor = (key: string, open: boolean) => setGroupOpen((prev) => ({ ...prev, [key]: open }));
  /** A group the reviewer works in — an editor opened in it — stays open when the default
   *  turns (a search cleared, the rows grown past the budget): folding it would drop the
   *  editor and whatever was typed in it. */
  const keepGroupOpen = (key: string | undefined) => {
    if (key !== undefined) setGroupOpen((prev) => (key in prev ? prev : { ...prev, [key]: true }));
  };
  // The group whose large batch is waiting for a yes — and, until its confirm button
  // has mounted and taken focus, the group that asked.
  const [confirming, setConfirming] = useState<string | null>(null);
  const confirmFocus = useRef<string | null>(null);
  // One sort for every group's table, so a header click orders all of them alike.
  const [groupSorts, setGroupSorts] = useState<SortState[]>([]);

  const setFilter = (patch: Partial<TranslationReviewFilter>) => {
    const next = { ...filter, ...patch };
    setOwnFilter(next);
    onFilterChange?.(next);
    echoFilter(next);
    // A selection the new filter hides would be acted on unseen.
    setSelected(new Set());
  };

  /** Queue a write under `key` (one per key at a time); resolves whether it worked. */
  const run = (key: string, action: () => MaybePromise): Promise<boolean> => {
    if (claimed.current.has(key)) return Promise.resolve(false);
    claimed.current.add(key);
    setQueued((q) => [...q, key]);
    const step = tail.current.then(async () => {
      setFailure(null);
      try {
        await action();
        return true;
      } catch (caught) {
        setFailure(formatError ? formatError(caught) : labels.failed);
        return false;
      } finally {
        claimed.current.delete(key);
        setQueued((q) => q.filter((k) => k !== key));
      }
    });
    tail.current = step;
    return step;
  };

  /** "String approved — Undo", once `targets` (as they were BEFORE the write) are
   *  approved — or, after a swiped `clear`, "String marked unreviewed — Undo". Either way
   *  Undo puts back what the rows said before ({@link reviewUndo}), through the same queue
   *  as every write. */
  const sayDone = (targets: readonly TranslationRow[], description?: ReactNode, cleared = false) => {
    const back = reviewUndo(targets);
    const message = (cleared ? labels.clearedToast : labels.approvedToast)(targets.length);
    const save = onSave;
    const clear = onClear;
    // Taking back the approval of a row that had no verdict is a clear: without
    // `onClear` there is no way to say it, so the toast reports and offers nothing.
    if (!save || (back.clears.length > 0 && !clear)) {
      toast.success(message, { description });
      return;
    }
    const key = `undo:${++undoCount.current}`;
    toast.undo(message, {
      description,
      onUndo: () =>
        void run(key, async () => {
          if (back.writes.length > 0) await save(back.writes, { origin: "undo", toasted: false });
          if (back.clears.length > 0) await clear?.(back.clears, { origin: "undo", toasted: false });
        }),
    });
  };

  const approve = async (
    key: string,
    targets: readonly TranslationRow[],
    origin: TranslationReviewOrigin,
    description?: ReactNode,
  ): Promise<boolean> => {
    if (!onSave || targets.length === 0) return false;
    const save = onSave;
    const ok = await run(key, () => save(targets.map((r) => reviewWrite(r, "APPROVED")), { origin, toasted: undoOn }));
    if (ok && undoOn) sayDone(targets, description);
    return ok;
  };

  /** A swipe bound to `clear`: the row's verdict taken back, answered like an approval —
   *  the Undo toast stores the verdict again. Under the row's own key, so it queues behind
   *  (and never overlaps) an approval of the same row. */
  const clearRow = async (row: TranslationRow) => {
    if (!onClear || row.review === null) return;
    const clear = onClear;
    const keys = [{ locale: row.locale, key: row.key }];
    const ok = await run(`row:${row.id}`, () => clear(keys, { origin: "swipe", toasted: undoOn }));
    if (ok && undoOn) sayDone([row], row.key, true);
  };

  /** The editor's own save: it waits, closes and shows its errors itself, so it does
   *  not go through the queue — but an approval there is answered like any other. */
  const saveFromEditor = async (row: TranslationRow, write: TranslationReviewWrite) => {
    const toasted = undoOn && write.verdict === "APPROVED";
    await onSave?.([write], { origin: "editor", toasted });
    if (toasted) sayDone([row], row.key);
  };

  /**
   * Focus back into the panel once a group's batch has settled, if it fell out: the
   * button that was pressed goes with the rows it approved (and under the `Unreviewed`
   * filter the whole group can go). Two frames, so the app's new rows have been drawn.
   */
  const keepFocusAt = (groupKey: string) => {
    const check = () => {
      const root = rootRef.current;
      const active = document.activeElement;
      if (!root || (active && active !== document.body && active.isConnected)) return;
      const sections = [...root.querySelectorAll<HTMLElement>("[data-review-group]")];
      const section = sections.find((el) => el.dataset.reviewGroup === groupKey) ?? sections[0];
      section?.querySelector<HTMLElement>("[data-disclosure-trigger]")?.focus();
    };
    requestAnimationFrame(() => requestAnimationFrame(check));
  };

  const approveGroup = async (group: TranslationRowGroup, confirmed: boolean) => {
    const targets = unreviewedRows(group.rows);
    if (targets.length === 0) return;
    if (!confirmed && targets.length > pageSize) {
      // Asked inside the opened group, over the rows it is about.
      setGroupOpenFor(group.key, true);
      setConfirming(group.key);
      confirmFocus.current = group.key;
      return;
    }
    const ok = await approve(`group:${group.key}`, targets, "group", groupName(group.key));
    if (ok) setConfirming((key) => (key === group.key ? null : key));
    keepFocusAt(group.key);
  };

  const visibleIds = new Set(visible.map((r) => r.id));
  const selectedRows = visible.filter((r) => selected.has(r.id));
  // What "Select all shown" takes: grouped, the rows of the open groups — a folded
  // group's rows are not shown.
  const shownRows = groups ? groups.filter((g) => isGroupOpen(g.key)).flatMap((g) => g.rows) : visible;
  const allShownSelected = shownRows.length > 0 && shownRows.every((r) => selected.has(r.id));
  const toApprove = selectedRows.filter((r) => r.text !== "" && r.status !== "approved");
  const toReset = selectedRows.filter((r) => r.review !== null);

  const approveSelected = async () => {
    if (await approve("bulk-approve", toApprove, "selection")) setSelected(new Set());
  };
  const resetSelected = async () => {
    if (!onClear || toReset.length === 0) return;
    const clear = onClear;
    const keys = toReset.map((r) => ({ locale: r.locale, key: r.key }));
    if (await run("bulk-reset", () => clear(keys, { origin: "selection", toasted: false }))) {
      setSelected(new Set());
    }
  };

  // The status options: "missing" only where something is (or it is the filter).
  const statuses = REVIEW_STATUSES.filter((s) => s !== "missing" || summary.missing > 0 || filter.status === s);
  const scopeNames = (areas ?? []).map((area) => areaLabels?.[area] ?? area);
  const scopeText =
    scopeNames.length > 0 ? new Intl.ListFormat(locale, { type: "conjunction", style: "long" }).format(scopeNames) : "";

  const columns: DataTableColumn<TranslationRow>[] = [
    {
      key: "key",
      header: labels.key,
      cell: (r) => <code className="break-all text-xs text-[var(--text-secondary)]">{r.key}</code>,
      sortBy: (r) => r.key,
      mobileHidden: true,
    },
    {
      key: "reference",
      header: referenceLabel,
      cell: (r) => (
        <span className="line-clamp-3 whitespace-pre-line break-words text-[var(--text-secondary)]">{r.reference}</span>
      ),
      mobileHidden: true,
    },
    {
      key: "text",
      header: localeLabel,
      cell: (r) => <TextCell row={r} labels={labels} clamp />,
      mobilePrimary: true,
    },
    {
      key: "status",
      header: labels.statusColumn,
      cell: (r) => (
        <span className="inline-flex flex-wrap gap-1">
          <ReviewStatusChip status={r.status} labels={labelsProp} />
          {r.placeholderMismatch && (
            <Chip size="sm" tone="danger" variant="outline">
              {labels.placeholderChip}
            </Chip>
          )}
        </span>
      ),
      sortBy: (r) => REVIEW_STATUSES.indexOf(r.status),
    },
  ];
  if (editable) {
    columns.push({
      key: "approve",
      header: <span className="sr-only">{labels.approve}</span>,
      cell: (r) =>
        r.status === "approved" || r.text === "" ? null : (
          <IconButton
            type="button"
            size="xs"
            tone="muted"
            commit
            label={labels.approve}
            // The icon alone at every text size (docs/text-size-harmonization.md §10.8):
            // the row's one action, in a hugging column of a dense table beside the
            // string under review, which "Approve" as text at Large would squeeze. A
            // single action stays inline in `RowActions` too, so the menu would not help;
            // the swipe and the editor say it in words.
            labelVisible={false}
            pending={isQueued(`row:${r.id}`)}
            disabled={busy}
            onClick={(event) => {
              // The row's own click opens the editor; this one only approves.
              event.stopPropagation();
              void approve(`row:${r.id}`, [r], "row", r.key);
            }}
          >
            <Check />
          </IconButton>
        ),
    });
  }

  /** One bound swipe action on one row, as {@link SwipeableRow} draws and commits it. */
  const swipeAction = (r: TranslationRow, id: TranslationReviewSwipeAction, groupKey?: string): SwipeAction => {
    const missing = r.text === "";
    switch (id) {
      case "approve":
        return {
          label: labels.approve,
          icon: <Check className="size-4" aria-hidden />,
          onCommit: () => void approve(`row:${r.id}`, [r], "swipe", r.key),
          // Text on the fill in its own contrast colour: the fills are pastels in dark
          // mode, where SwipeableRow's default white text was unreadable (0.26).
          className: "bg-[var(--success)] text-[var(--success-contrast)]",
          armedClassName: "bg-[var(--success)] text-[var(--success-contrast)]",
        };
      case "edit":
        return {
          label: missing ? labels.suggest : labels.flag,
          icon: <PencilLine className="size-4" aria-hidden />,
          // Opens the editor rather than sending the string back: "needs a change"
          // with neither a note nor a better wording tells nobody anything.
          onCommit: () => {
            keepGroupOpen(groupKey);
            setOpenId(r.id);
            setFocusId(r.id);
          },
          className: missing
            ? "bg-[var(--brand)] text-[var(--brand-contrast)]"
            : "bg-[var(--danger)] text-[var(--danger-contrast)]",
          armedClassName: missing
            ? "bg-[var(--brand-hover)] text-[var(--brand-contrast)]"
            : "bg-[var(--danger-hover)] text-[var(--danger-contrast)]",
        };
      case "clear":
        return {
          label: labels.reset,
          icon: <RotateCcw className="size-4" aria-hidden />,
          onCommit: () => void clearRow(r),
          // A step back, not a verdict: neither the approval's green nor the send-back's red.
          // The surface colour as text: white on the grey in light mode, the dark page on
          // the light grey in dark mode.
          className: "bg-[var(--text-muted)] text-[var(--bg-surface)]",
          armedClassName: "bg-[var(--text-secondary)] text-[var(--bg-surface)]",
        };
    }
  };

  /**
   * A phone card's swipes: the binding ({@link TranslationReviewPanelProps.swipe}) resolved
   * against the row, each side's ladder closed up over what the row cannot offer. None
   * where the row must not be acted on — the same conditions under which its buttons are
   * locked or absent.
   */
  const swipeActions = (r: TranslationRow, groupKey?: string): MobileSwipeActions | null => {
    if (!binding || !editable || lock.locked || isQueued(`row:${r.id}`)) return null;
    const plan = translationReviewSwipePlan(binding, r, { canClear: onClear !== undefined });
    if (plan.start.length === 0 && plan.end.length === 0) return null;
    return {
      start: plan.start.map((id) => swipeAction(r, id, groupKey)),
      end: plan.end.map((id) => swipeAction(r, id, groupKey)),
    };
  };

  const toggleIn = (prev: ReadonlySet<string>, many: readonly TranslationRow[], checked: boolean) => {
    const next = new Set([...prev].filter((id) => visibleIds.has(id)));
    for (const r of many) {
      if (checked) next.add(r.id);
      else next.delete(r.id);
    }
    return next;
  };
  /** The checkbox column of a table over `list` — the whole list, or one group. */
  const selectionFor = (list: readonly TranslationRow[]): DataTableProps<TranslationRow>["selection"] => {
    if (!editable) return undefined;
    const picked = list.filter((r) => selected.has(r.id)).length;
    return {
      isSelected: (r) => selected.has(r.id),
      onToggle: (r, checked) => setSelected((prev) => toggleIn(prev, [r], checked)),
      onToggleMany: (many, checked) => setSelected((prev) => toggleIn(prev, many, checked)),
      allSelected: list.length > 0 && picked === list.length,
      someSelected: picked > 0 && picked < list.length,
      onToggleAll: (checked) => setSelected((prev) => toggleIn(prev, list, checked)),
    };
  };

  const table = (list: TranslationRow[], group?: { key: string; name: string }) => (
    <DataTable<TranslationRow>
      rows={list}
      rowKey={(r) => r.id}
      columns={columns}
      empty={labels.empty}
      defaultPageSize={pageSize}
      {...(group
        ? {
            // Inside the group's own card: no frame in a frame, no column rail per group,
            // no scroller per group, and the group's name as the table's.
            frame: false,
            chrome: "minimal" as const,
            maxBodyHeight: "none",
            sorts: groupSorts,
            onSortsChange: setGroupSorts,
            labels: { table: group.name },
          }
        : { storageKey })}
      isExpanded={(r) => r.id === openId}
      onRowClick={(r) => {
        if (openId !== r.id) keepGroupOpen(group?.key);
        setFocusId(null);
        setOpenId((open) => (open === r.id ? null : r.id));
      }}
      expandedRow={(r) => (
        <TranslationReviewEditor
          key={r.id}
          row={r}
          referenceLabel={referenceLabel}
          localeLabel={localeLabel}
          readOnly={!editable}
          focusWording={focusId === r.id}
          onSave={onSave ? (write) => saveFromEditor(r, write) : undefined}
          onClear={onClear ? (key) => onClear([key], { origin: "editor", toasted: false }) : undefined}
          onClose={() => {
            setOpenId(null);
            setFocusId(null);
          }}
          formatDate={formatDate}
          formatError={formatError}
          labels={labelsProp}
        />
      )}
      mobileCard={(r) => (
        <div className="min-w-0 space-y-1">
          <code className="block break-all text-xs text-[var(--text-muted)]">{r.key}</code>
          <div className="text-sm text-[var(--text-primary)]">
            <TextCell row={r} labels={labels} clamp />
          </div>
          <div className="flex flex-wrap gap-1">
            <ReviewStatusChip status={r.status} labels={labelsProp} />
            {r.placeholderMismatch && (
              <Chip size="sm" tone="danger" variant="outline">
                {labels.placeholderChip}
              </Chip>
            )}
          </div>
        </div>
      )}
      mobileSwipeActions={binding ? (r) => swipeActions(r, group?.key) : undefined}
      selection={selectionFor(list)}
    />
  );

  const groupSection = (g: TranslationRowGroup, index: number) => {
    const name = groupName(g.key);
    const titleId = `${baseId}-group-${index}`;
    const questionId = `${baseId}-confirm-${index}`;
    const targets = editable ? unreviewedRows(g.rows) : [];
    const key = `group:${g.key}`;
    const open = isGroupOpen(g.key);
    // A folded group renders its header and nothing else. Its body is handed over only
    // while it is open, or when the REVIEWER folded it — so the fold animates over the
    // rows it hides. A group folded by the default gets none: when the default turns (a
    // search cleared over 122 areas), the groups that close would otherwise render their
    // grown tables for the length of the fold.
    const body = open || groupOpen[g.key] === false;
    return (
      <Disclosure
        key={g.key}
        data-review-group={g.key}
        headingAs={groupHeadingAs}
        title={<span id={titleId}>{name}</span>}
        hint={labels.groupCount(g.summary.unreviewed, g.summary.total)}
        open={open}
        onOpenChange={(next) => {
          setGroupOpenFor(g.key, next);
          if (!next) setConfirming((c) => (c === g.key ? null : c));
        }}
        trailing={
          targets.length > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              commit
              // The visible words say what; the group's name, read after them, says where.
              aria-describedby={titleId}
              pending={isQueued(key) && confirming !== g.key}
              disabled={busy}
              onClick={() => void approveGroup(g, false)}
            >
              <Check className="size-4" aria-hidden />
              {labels.approveGroup(targets.length)}
            </Button>
          ) : undefined
        }
        bodyClassName="space-y-0 px-0 pb-0 border-t border-[var(--border)]"
      >
        {body && confirming === g.key && targets.length > 0 && (
          <div className="border-b border-[var(--border)] p-3">
            <AlertBanner tone="warning" size="sm">
              <div className="min-w-0 space-y-2">
                <p id={questionId}>{labels.confirmGroup(targets.length, name)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    // Focus lands here when the question appears: the expected answer to a
                    // question the reviewer just asked for, and Undo stays behind it.
                    ref={(el) => {
                      if (el && confirmFocus.current === g.key) {
                        confirmFocus.current = null;
                        el.focus();
                      }
                    }}
                    variant="primary"
                    size="sm"
                    commit
                    aria-describedby={questionId}
                    pending={isQueued(key)}
                    disabled={busy}
                    onClick={() => void approveGroup(g, true)}
                  >
                    {labels.approveGroup(targets.length)}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isQueued(key)}
                    onClick={() => {
                      setConfirming(null);
                      keepFocusAt(g.key);
                    }}
                  >
                    {labels.cancel}
                  </Button>
                </div>
              </div>
            </AlertBanner>
          </div>
        )}
        {body && table(g.rows, { key: g.key, name })}
      </Disclosure>
    );
  };
  return (
    <div ref={rootRef} className={cn("min-w-0 space-y-4", className)}>
      {scopeText && (
        <AlertBanner tone="info" variant="inline" size="sm" block live={false}>
          {labels.scope(scopeText)}
        </AlertBanner>
      )}
      {readOnly && (
        <AlertBanner tone="info" variant="inline" size="sm" block live={false}>
          {labels.readOnly}
        </AlertBanner>
      )}

      {progress && <TranslationProgress summary={summary} labels={labelsProp} />}

      <ToggleGroup<ReviewStatus | "all">
        aria-label={labels.statusFilter}
        overflow="wrap"
        size="sm"
        value={filter.status}
        onChange={(next) => setFilter({ status: next })}
        options={[
          { value: "all", label: labels.filterCount(labels.all, summary.total) },
          ...statuses.map((s) => ({ value: s, label: labels.filterCount(reviewStatusLabel(labels, s), summary[s]) })),
        ]}
      />

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        {sources.length > 1 && (
          <div className="md:w-48">
            <Select label={labels.source} value={source} onChange={(e) => setFilter({ source: e.target.value })}>
              <option value="all">{labels.allSources}</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {sourceLabels?.[s] ?? s}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="md:w-56">
          <Select label={labels.namespace} value={namespace} onChange={(e) => setFilter({ namespace: e.target.value })}>
            <option value="all">{labels.allNamespaces}</option>
            {namespaces.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </Select>
        </div>
        <SearchField
          className="min-w-0 md:flex-1"
          label={labels.search}
          value={filter.query}
          onChange={(next) => setFilter({ query: next })}
        />
        <Checkbox
          label={labels.placeholdersOnly(mismatches)}
          checked={filter.placeholdersOnly}
          onCheckedChange={(next) => setFilter({ placeholdersOnly: next })}
        />
      </div>

      {editable && shownRows.length > 0 && (
        // The phone's table has no checkboxes; this is its way into the bulk actions.
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          disabled={allShownSelected}
          onClick={() => setSelected((prev) => toggleIn(prev, shownRows, true))}
        >
          <ListChecks className="size-4" aria-hidden />
          {labels.selectShown}
        </Button>
      )}

      {failure && (
        <AlertBanner tone="danger" size="sm" role="alert">
          {failure}
        </AlertBanner>
      )}

      {editable && (
        <BulkActionBar count={selectedRows.length} onClear={() => setSelected(new Set())}>
          <Button
            variant="primary"
            size="sm"
            commit
            pending={isQueued("bulk-approve")}
            disabled={busy || toApprove.length === 0}
            onClick={() => void approveSelected()}
          >
            <Check className="size-4" aria-hidden />
            {labels.approveSelected}
          </Button>
          {onClear && (
            <Button
              variant="ghost"
              size="sm"
              commit
              pending={isQueued("bulk-reset")}
              disabled={busy || toReset.length === 0}
              onClick={() => void resetSelected()}
            >
              <RotateCcw className="size-4" aria-hidden />
              {labels.resetSelected}
            </Button>
          )}
        </BulkActionBar>
      )}

      {groups && groups.length > 0 ? (
        <div className="space-y-3">{groups.map(groupSection)}</div>
      ) : (
        table(visible)
      )}
    </div>
  );
}
