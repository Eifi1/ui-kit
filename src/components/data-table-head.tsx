import type { Dispatch, SetStateAction } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { cn } from "../lib/cn";
import { defaultFilterState, isFilterActive, resolveFilter } from "./data-table-filters";
import type { FilterValue } from "./data-table-filters";
import type { SortState } from "./data-table-sort";
import { FilterPopover } from "./data-table-filter-popover";
import { Popover } from "./popover";
import { Tooltip } from "./tooltip";
import type { DataTableLabels } from "./data-table-labels";
import { isTableOwnColumn } from "./data-table-row-actions";
import { columnLabel, logicalAlign, splitCellProps } from "./data-table-shared";
import { GROW_HEAD_CLASS } from "./data-table-fit";
import type { DataTableColumn, DataTableProps, FilterState } from "./data-table";

// DataTable's `<thead>` on a wide screen: the select-all box, and per column the sort
// button, the filter popover and the resize handle. Moved out of data-table.tsx whole
// (refactor audit 2026-10, MOD-3 step 5); the state it shows and changes stays the
// table's.

/** Whether a column is end-aligned — the header then puts its filter button first. */
const END_ALIGN = /(^|\s)text-end(?=\s|$)/;

/** The wide-screen table's header row. */
export function DataTableHead<T>({
  visibleColumns,
  selection,
  compact,
  labels,
  locale,
  isServer,
  hasSortCallback,
  hasFilterCallback,
  sorts,
  filters,
  selectOptionsByKey,
  multiSort,
  resizable,
  widths,
  setWidths,
  headRefs,
  toggleSort,
  setFilterValue,
  clearFilter,
  startResize,
  moveResize,
  finishResize,
  ariaRowIndex,
  lockedWidths,
  selectionLockKey,
}: {
  visibleColumns: DataTableColumn<T>[];
  selection: DataTableProps<T>["selection"];
  compact: boolean;
  labels: DataTableLabels;
  locale?: string;
  isServer: boolean;
  /** The caller owns the sort (`onSortsChange`), so a server table can offer it. */
  hasSortCallback: boolean;
  /** The caller owns the filters (`onFiltersChange`), likewise. */
  hasFilterCallback: boolean;
  sorts: SortState[];
  filters: FilterState;
  selectOptionsByKey: Record<string, { value: string; label: string }[]>;
  multiSort: boolean;
  resizable: boolean;
  widths: Record<string, number>;
  setWidths: Dispatch<SetStateAction<Record<string, number>>>;
  /** Filled here, one `<th>` per column — what a resize and "Auto-size" measure. */
  headRefs: Map<string, HTMLTableCellElement>;
  toggleSort: (key: string, shiftKey: boolean) => void;
  setFilterValue: (key: string, value: FilterValue) => void;
  clearFilter: (key: string) => void;
  startResize: (e: React.PointerEvent<HTMLElement>, key: string) => void;
  moveResize: (e: React.PointerEvent<HTMLElement>) => void;
  finishResize: (e: React.PointerEvent<HTMLElement>, commit: boolean) => void;
  /** Under `virtualize` (0.48.2): 1. */
  ariaRowIndex?: number;
  /** Under `virtualize` (0.48.2): each column's locked width, as the header cell's
   *  `min-width` — a `<col>` width alone gave way to a `grow` column's 100%. */
  lockedWidths?: Record<string, number> | null;
  /** The selection column's key in `lockedWidths`. */
  selectionLockKey?: string;
}) {
  return (
    <thead className="bg-surface-2 text-secondary">
      <tr className="text-start" aria-rowindex={ariaRowIndex}>
        {selection && (
          <th
            scope="col"
            style={
              selectionLockKey && lockedWidths?.[selectionLockKey] !== undefined
                ? { minWidth: lockedWidths[selectionLockKey] }
                : undefined
            }
            className={cn(
              "sticky top-0 z-10 bg-surface-2 align-middle backdrop-blur-sm",
              compact ? "w-8 px-2 py-1" : "w-10 px-3 py-2",
            )}
          >
            <input
              type="checkbox"
              className={cn("align-middle accent-indigo-600", compact ? "size-3.5" : "size-4")}
              checked={selection.allSelected}
              ref={(el) => {
                if (el) el.indeterminate = selection.someSelected && !selection.allSelected;
              }}
              onChange={(e) => selection.onToggleAll(e.target.checked)}
              aria-label={labels.selectAllRows}
            />
          </th>
        )}
        {visibleColumns.map((col) => {
          // In server mode the utilities stay hidden unless the caller
          // takes them over and feeds them back into the server query.
          const sortable = (!isServer || hasSortCallback) && !!col.sortBy;
          const filter = !isServer || hasFilterCallback ? resolveFilter(col) : null;
          const filterState = filters[col.key] ?? (filter ? defaultFilterState(filter) : undefined);
          const sortIdx = sorts.findIndex((s) => s.key === col.key);
          const active = sortIdx !== -1;
          const Icon = active ? (sorts[sortIdx].dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
          const filterActive = filterState && isFilterActive(filterState);
          // Logical, and a legacy `text-right` still counts — see `logicalAlign`.
          const headClass = logicalAlign(col.headClassName);
          const isEndAligned = !!headClass && END_ALIGN.test(headClass);
          const width = widths[col.key];
          const ownHead = splitCellProps(col.headProps);
          const growFloor = col.grow && col.growMin != null ? `${col.growMin}rem` : undefined;
          const pinnedHead = width ? { width, minWidth: width, maxWidth: width } : undefined;
          return (
            <th
              {...ownHead.attrs}
              key={col.key}
              ref={(el) => {
                if (el) headRefs.set(col.key, el);
                else headRefs.delete(col.key);
              }}
              scope="col"
              // Only a header the user can actually sort says anything: an
              // `aria-sort` on a plain column is a control that is not there,
              // and a persisted or URL sort can name a column with no `sortBy`
              // (the sort chain drops it silently) — which would otherwise
              // claim a sort the table is not applying.
              //
              // "none" on the rest is the half that was missing. Without it a
              // sortable header is indistinguishable from a plain one until the
              // user presses it. Secondary criteria read "none" too: ARIA allows
              // exactly one sorted column, and the priority is carried by the
              // badge and by what the header button announces on press.
              aria-sort={
                sortable
                  ? sortIdx === 0
                    ? sorts[0].dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined
              }
              style={
                ownHead.style || pinnedHead || lockedWidths?.[col.key] !== undefined || growFloor
                  ? {
                      // A `grow` column's own floor (0.51.4), over the class's 10rem; a
                      // locked width below wins, as it does over the class.
                      ...(growFloor ? { minWidth: growFloor } : null),
                      ...ownHead.style,
                      ...(lockedWidths?.[col.key] !== undefined ? { minWidth: lockedWidths[col.key] } : null),
                      ...pinnedHead,
                    }
                  : undefined
              }
              className={cn(
                "relative font-medium align-middle whitespace-nowrap",
                compact ? "px-2 py-1" : "px-3 py-2",
                // Keep the header visible while the user scrolls the page.
                // Each <th> carries its own bg so the row doesn't render
                // transparent over the data rows underneath.
                "sticky top-0 z-10 bg-surface-2 backdrop-blur-sm",
                col.grow && GROW_HEAD_CLASS,
                logicalAlign(ownHead.className),
                headClass,
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1",
                  isEndAligned && "flex-row-reverse",
                )}
              >
                <Tooltip label={sortable && multiSort ? labels.sortHint : undefined} portal>
                  <button
                    type="button"
                    onClick={(e) => sortable && toggleSort(col.key, e.shiftKey)}
                    disabled={!sortable}
                    className={cn(
                      "flex items-center gap-1 text-start",
                      sortable && "hover:text-primary",
                    )}
                  >
                    <span>{col.header}</span>
                    {sortable && (
                      <Icon className={cn("size-3", active ? "opacity-100" : "opacity-40")} />
                    )}
                    {/* Priority badge, only meaningful with 2+ sort keys */}
                    {active && sorts.length > 1 && (
                      <span className="text-micro font-semibold leading-none text-brand">
                        {sortIdx + 1}
                      </span>
                    )}
                  </button>
                </Tooltip>
                {filter && (
                  <Popover
                    // 420 px at Normal, in rem so the calendar grows with its
                    // text (§3.2); Popover caps it at the viewport.
                    width={filter.type === "date" ? "26.25rem" : undefined}
                    // The panel is THIS column's filter, and says so. Unnamed it was
                    // announced as the kit-wide fallback, "Popover"; then as "Filter"
                    // in every column alike (round 0.34 Wave 2, BUG-7c).
                    labels={{ panel: labels.filterColumn(columnLabel(col, labels), false) }}
                    trigger={({ open, toggle, ref }) => (
                      <button
                        type="button"
                        ref={ref}
                        onClick={toggle}
                        // Named for its column, and for being filtered: the tint
                        // alone said that to nobody who cannot see it (BUG-7c).
                        aria-label={labels.filterColumn(columnLabel(col, labels), Boolean(filterActive))}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        className={cn(
                          "rounded p-1 transition-colors",
                          filterActive
                            ? "bg-brand-soft text-brand-muted"
                            : "text-placeholder hover:text-secondary hover:bg-hover",
                        )}
                      >
                        <Filter className="size-3" />
                      </button>
                    )}
                  >
                    {() => (
                      <FilterPopover
                        column={col}
                        state={filterState ?? defaultFilterState(filter)}
                        onChange={(next) => setFilterValue(col.key, next)}
                        onClear={() => clearFilter(col.key)}
                        selectOptions={selectOptionsByKey[col.key] ?? []}
                        labels={labels}
                        locale={locale}
                      />
                    )}
                  </Popover>
                )}
              </div>
              {/* A `grow` column takes the rest: no width of its own to drag (0.48, KS N2). */}
              {resizable && !isTableOwnColumn(col.key) && !col.grow && (
              /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a
                 pointer-only drag handle for a visual preference (column width); it is
                 deliberately not a tab stop, and no content or action depends on it. */
              <span
                role="separator"
                aria-orientation="vertical"
                onPointerDown={(e) => startResize(e, col.key)}
                onPointerMove={moveResize}
                onPointerUp={(e) => finishResize(e, true)}
                onPointerCancel={(e) => finishResize(e, false)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  setWidths((w) => {
                    const next = { ...w };
                    delete next[col.key];
                    return next;
                  });
                }}
                // `touch-none`: without it the browser claims a finger drag for
                // scrolling before the first `pointermove` ever arrives.
                // `end-0` and a translate that flips with it: the handle sits on the column's
                // trailing edge, which is its left one in a right-to-left table.
                className="absolute end-0 top-0 z-10 h-full w-1.5 -translate-x-1/2 rtl:translate-x-1/2 cursor-col-resize select-none touch-none hover:bg-brand-soft-hover"
              />
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
