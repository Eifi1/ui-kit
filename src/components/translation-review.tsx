import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, ListChecks, RotateCcw } from "lucide-react";

import { useKitLabels, useKitLocale } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import {
  DEFAULT_TRANSLATION_REVIEW_FILTER,
  REVIEW_STATUSES,
  filterTranslationRows,
  keyInAreas,
  reviewWrite,
  summariseRows,
} from "../lib/translation-review";
import type {
  ReviewStatus,
  TranslationReviewFilter,
  TranslationReviewKey,
  TranslationReviewWrite,
  TranslationRow,
} from "../lib/translation-review";
import { AlertBanner } from "./alert-banner";
import { BulkActionBar } from "./bulk-action-bar";
import { Checkbox } from "./checkbox";
import { Chip } from "./chip";
import { DataTable } from "./data-table";
import type { DataTableColumn } from "./data-table";
import { SearchField } from "./search-field";
import { ToggleGroup } from "./toggle-group";
import { TranslationReviewEditor } from "./translation-review-editor";
import { DEFAULT_TRANSLATION_REVIEW_LABELS, reviewStatusLabel } from "./translation-review-labels";
import type { TranslationReviewLabels } from "./translation-review-labels";
import { ReviewStatusChip, TranslationProgress } from "./translation-review-parts";
import { Button, IconButton, Select } from "./ui";

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

export interface TranslationReviewPanelProps {
  /** One locale's rows, from `translationRows`. */
  rows: readonly TranslationRow[];
  /** The reviewed language's own name — the text column's header ("Français"). */
  localeLabel: string;
  /** The reference language's own name — the reference column's header. */
  referenceLabel: string;
  /** Store verdicts: one for an editor or a row's approve button, many for a bulk
   *  approve. Left out (or `readOnly`): nothing can be changed. */
  onSave?: (writes: TranslationReviewWrite[]) => MaybePromise;
  /** Clear verdicts — back to unreviewed. Left out: no reset. */
  onClear?: (keys: TranslationReviewKey[]) => MaybePromise;
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
   * `?area=`, `?q=`). Whatever is left out is the panel's own. Pair with `onFilterChange`.
   */
  filter?: Partial<TranslationReviewFilter>;
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
  className?: string;
  labels?: Partial<TranslationReviewLabels>;
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
 * show — filter to `Unreviewed` in one area, read, select, approve.
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
  className,
  labels: labelsProp,
}: TranslationReviewPanelProps) {
  const labels = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS, labelsProp);
  const locale = useKitLocale();
  const editable = !readOnly && onSave !== undefined;

  const [ownFilter, setOwnFilter] = useState<TranslationReviewFilter>(DEFAULT_TRANSLATION_REVIEW_FILTER);
  // The app's fields over the panel's own; a field the app leaves `undefined` is the
  // panel's, not a blank.
  const filter: TranslationReviewFilter = { ...ownFilter };
  for (const [name, value] of Object.entries(filterProp ?? {})) {
    if (value !== undefined) Object.assign(filter, { [name]: value });
  }
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  // One bulk or row action at a time: two writes in flight on one locale's verdicts can
  // answer out of order. The editor keeps its own, for its own buttons.
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<ReactNode>(null);

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

  const setFilter = (patch: Partial<TranslationReviewFilter>) => {
    const next = { ...filter, ...patch };
    setOwnFilter(next);
    onFilterChange?.(next);
    // A selection the new filter hides would be acted on unseen.
    setSelected(new Set());
  };

  const run = async (key: string, action: () => MaybePromise): Promise<boolean> => {
    setBusy(key);
    setFailure(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setFailure(formatError ? formatError(caught) : labels.failed);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const visibleIds = new Set(visible.map((r) => r.id));
  const selectedRows = visible.filter((r) => selected.has(r.id));
  const allSelected = visible.length > 0 && selectedRows.length === visible.length;
  const toApprove = selectedRows.filter((r) => r.text !== "" && r.status !== "approved");
  const toReset = selectedRows.filter((r) => r.review !== null);

  const approveSelected = async () => {
    if (!onSave || toApprove.length === 0) return;
    if (await run("bulk-approve", () => onSave(toApprove.map((r) => reviewWrite(r, "APPROVED"))))) {
      setSelected(new Set());
    }
  };
  const resetSelected = async () => {
    if (!onClear || toReset.length === 0) return;
    if (await run("bulk-reset", () => onClear(toReset.map((r) => ({ locale: r.locale, key: r.key }))))) {
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
  if (editable && onSave) {
    const save = onSave;
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
            pending={busy === `row:${r.id}`}
            disabled={busy !== null}
            onClick={(event) => {
              // The row's own click opens the editor; this one only approves.
              event.stopPropagation();
              void run(`row:${r.id}`, () => save([reviewWrite(r, "APPROVED")]));
            }}
          >
            <Check />
          </IconButton>
        ),
    });
  }

  return (
    <div className={cn("min-w-0 space-y-4", className)}>
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

      {editable && visible.length > 0 && (
        // The phone's table has no checkboxes; this is its way into the bulk actions.
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          disabled={allSelected}
          onClick={() => setSelected(new Set(visible.map((r) => r.id)))}
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
            pending={busy === "bulk-approve"}
            disabled={busy !== null || toApprove.length === 0}
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
              pending={busy === "bulk-reset"}
              disabled={busy !== null || toReset.length === 0}
              onClick={() => void resetSelected()}
            >
              <RotateCcw className="size-4" aria-hidden />
              {labels.resetSelected}
            </Button>
          )}
        </BulkActionBar>
      )}

      <DataTable<TranslationRow>
        rows={visible}
        rowKey={(r) => r.id}
        columns={columns}
        empty={labels.empty}
        defaultPageSize={pageSize}
        storageKey={storageKey}
        isExpanded={(r) => r.id === openId}
        onRowClick={(r) => setOpenId((open) => (open === r.id ? null : r.id))}
        expandedRow={(r) => (
          <TranslationReviewEditor
            key={r.id}
            row={r}
            referenceLabel={referenceLabel}
            localeLabel={localeLabel}
            readOnly={!editable}
            onSave={onSave ? (write) => onSave([write]) : undefined}
            onClear={onClear ? (key) => onClear([key]) : undefined}
            onClose={() => setOpenId(null)}
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
        selection={
          editable
            ? {
                isSelected: (r) => selected.has(r.id),
                onToggle: (r, checked) =>
                  setSelected((prev) => {
                    const next = new Set([...prev].filter((id) => visibleIds.has(id)));
                    if (checked) next.add(r.id);
                    else next.delete(r.id);
                    return next;
                  }),
                onToggleMany: (many, checked) =>
                  setSelected((prev) => {
                    const next = new Set([...prev].filter((id) => visibleIds.has(id)));
                    for (const r of many) {
                      if (checked) next.add(r.id);
                      else next.delete(r.id);
                    }
                    return next;
                  }),
                allSelected,
                someSelected: selectedRows.length > 0 && !allSelected,
                onToggleAll: (checked) => setSelected(checked ? new Set(visible.map((r) => r.id)) : new Set()),
              }
            : undefined
        }
      />
    </div>
  );
}
