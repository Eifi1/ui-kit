import { useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Check, ListChecks, PencilLine, RotateCcw } from "lucide-react";

import { useMediaQuery } from "../hooks/use-media-query";
import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import {
  DEFAULT_TRANSLATION_REVIEW_FILTER,
  REVIEW_STATUSES,
  filterTranslationRows,
  groupTranslationRows,
  keyInAreas,
  reviewUndo,
  reviewWrite,
  summariseRows,
  unreviewedRows,
} from "../lib/translation-review";
import type {
  ReviewStatus,
  TranslationReviewFilter,
  TranslationReviewKey,
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
  /** The panel shows its own toast for this write (an approval's Undo toast). */
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
  /** Default `keyInArea`: the key is the area or sits under it (`legal.…`, `legal:…`). */
  inArea?: (key: string, area: string) => boolean;
  /** A source's name for the source filter, which appears once the rows come from more
   *  than one (kastlan: `{ screen: "Screen", documents: "PDFs and emails" }`). Default:
   *  the source itself. */
  sourceLabels?: Readonly<Record<string, string>>;
  /**
   * Controlled filters — for an app that keeps them in the URL (keksdose's `?status=`,
   * `?ns=`, `?q=`). Whatever is left out is the panel's own. Pair with `onFilterChange`.
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
   */
  swipe?: boolean;
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
   * Groups fold (each on its own, remembered while the panel lives). On a phone they
   * start folded when there are several — the headers are then the area list, and the
   * reviewer opens the one to work through; on a wide screen they start open.
   */
  groupBy?: TranslationReviewGroupBy;
  /** A group's name. Default: `sourceLabels` for `groupBy="source"`, else the key. */
  groupLabel?: (group: string) => string;
  /** The level of the group headings. Default `h2`: the panel is a page's body, under
   *  the page's `h1`. */
  groupHeadingAs?: "h2" | "h3" | "h4";
  className?: string;
  labels?: Partial<TranslationReviewLabels>;
}

/** The wide screen's query — the same one DataTable switches its layout on, so "a phone"
 *  means the same here as in the table. */
const MD_UP = "(min-width: 768px)";

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
  className,
  labels: labelsProp,
}: TranslationReviewPanelProps) {
  const labels = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS, labelsProp);
  const locale = useKitLocale();
  const lock = useWriteLock();
  const phone = !useMediaQuery(MD_UP, true);
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const editable = !readOnly && onSave !== undefined;
  const undoOn = undoProp ?? (swipe || groupBy !== undefined);

  const [ownFilter, setOwnFilter] = useState<TranslationReviewFilter>(DEFAULT_TRANSLATION_REVIEW_FILTER);
  // The app's fields over the panel's own; a field the app leaves `undefined` is the
  // panel's, not a blank.
  const filter: TranslationReviewFilter = { ...ownFilter };
  for (const [name, value] of Object.entries(filterProp ?? {})) {
    if (value !== undefined) Object.assign(filter, { [name]: value });
  }
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
  // Only what the reviewer chose; a group nobody has touched follows the default.
  const [groupOpen, setGroupOpen] = useState<Readonly<Record<string, boolean>>>({});
  const groupOpenByDefault = !(phone && (groups?.length ?? 0) > 1);
  const isGroupOpen = (key: string) => groupOpen[key] ?? groupOpenByDefault;
  const setGroupOpenFor = (key: string, open: boolean) => setGroupOpen((prev) => ({ ...prev, [key]: open }));
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
   *  approved. Undo goes through the same queue as every write. */
  const sayApproved = (targets: readonly TranslationRow[], description?: ReactNode) => {
    const back = reviewUndo(targets);
    const message = labels.approvedToast(targets.length);
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
    if (ok && undoOn) sayApproved(targets, description);
    return ok;
  };

  /** The editor's own save: it waits, closes and shows its errors itself, so it does
   *  not go through the queue — but an approval there is answered like any other. */
  const saveFromEditor = async (row: TranslationRow, write: TranslationReviewWrite) => {
    const toasted = undoOn && write.verdict === "APPROVED";
    await onSave?.([write], { origin: "editor", toasted });
    if (toasted) sayApproved([row], row.key);
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

  /**
   * A phone card's swipes: Approve toward the end, "Needs a change" toward the start.
   * None where the row must not be acted on — the same conditions under which its
   * buttons are locked or absent.
   */
  const swipeActions = (r: TranslationRow): MobileSwipeActions | null => {
    if (!editable || lock.locked || isQueued(`row:${r.id}`)) return null;
    const missing = r.text === "";
    return {
      end:
        missing || r.status === "approved"
          ? []
          : [
              {
                label: labels.approve,
                icon: <Check className="size-4" aria-hidden />,
                onCommit: () => void approve(`row:${r.id}`, [r], "swipe", r.key),
                className: "bg-[var(--success)]",
                armedClassName: "bg-[var(--success)]",
              },
            ],
      start: [
        {
          label: missing ? labels.suggest : labels.flag,
          icon: <PencilLine className="size-4" aria-hidden />,
          // Opens the editor rather than sending the string back: "needs a change"
          // with neither a note nor a better wording tells nobody anything.
          onCommit: () => {
            setOpenId(r.id);
            setFocusId(r.id);
          },
          className: missing ? "bg-[var(--brand)]" : "bg-[var(--danger)]",
          armedClassName: missing ? "bg-[var(--brand-hover)]" : "bg-[var(--danger-hover)]",
        },
      ],
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

  const table = (list: TranslationRow[], group?: { name: string }) => (
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
      mobileSwipeActions={swipe ? swipeActions : undefined}
      selection={selectionFor(list)}
    />
  );

  const groupSection = (g: TranslationRowGroup, index: number) => {
    const name = groupName(g.key);
    const titleId = `${baseId}-group-${index}`;
    const questionId = `${baseId}-confirm-${index}`;
    const targets = editable ? unreviewedRows(g.rows) : [];
    const key = `group:${g.key}`;
    return (
      <Disclosure
        key={g.key}
        data-review-group={g.key}
        headingAs={groupHeadingAs}
        title={<span id={titleId}>{name}</span>}
        hint={labels.groupCount(g.summary.unreviewed, g.summary.total)}
        open={isGroupOpen(g.key)}
        onOpenChange={(open) => {
          setGroupOpenFor(g.key, open);
          if (!open) setConfirming((c) => (c === g.key ? null : c));
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
        {confirming === g.key && targets.length > 0 && (
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
        {table(g.rows, { name })}
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
