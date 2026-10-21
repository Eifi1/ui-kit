// All user-facing strings for the DataTable system — the `dataTable` namespace of
// `<UiKitProvider labels>`, and per table the `labels` prop over that. The kit's seven
// catalogues carry the translations; the English defaults below make the table usable
// with no wiring.

// A type-only import: erased at build time, so this module stays free of the table
// itself (and of react-router), which `i18n/defaults` relies on.
import type { DataTableSortLabels } from "./data-table";

/** The phone sort control's four keys (`sortBy`, `sortDefault`, `sortAscending`,
 *  `sortDescending`, 0.22.0) are {@link DataTableSortLabels}', declared beside the
 *  control and part of this namespace like every other key. */
export interface DataTableLabels extends DataTableSortLabels {
  // Table chrome
  columns: string;
  selectAllRows: string;
  sortHint: string;
  filter: string;
  close: string;
  selectRow: string;
  /** The phone card list's way into selection mode for a keyboard and a screen reader
   *  (0.40, #421) — a button, visually hidden until focused; a long press is the touch way in. */
  selectRows: string;
  /** Leaves the phone card list's selection mode, clearing the selection (0.40, #421). */
  cancelSelection: string;
  /**
   * The name of an opening row's disclosure button on desktop — visually hidden, in the
   * row's first cell, carrying `aria-expanded` and `aria-controls` (round 0.34, the
   * showcase's axe check: ARIA allows `aria-expanded` on a row only in a treegrid, and
   * the `<tr>` wore it). The same words whether the row is open or shut: the state is
   * the button's to say.
   */
  rowDetails: string;
  autoSize: string;
  /** Beside a column in the Columns panel that the table's width leaves out
   *  (`fitPriority`, 0.48): "hidden for width". */
  hiddenForWidth: string;
  loading: string;
  filters: string;
  clearAll: string;
  done: string;
  // Pagination
  pageSize: string;
  pageSizeAll: string;
  prevPage: string;
  nextPage: string;
  // Filter popover
  clearFilter: string;
  filterPlaceholder: string;
  selectFilter: string;
  selectAll: string;
  selectNone: string;
  dateFrom: string;
  dateTo: string;
  numberMin: string;
  numberMax: string;
  numberAbs: string;
  // Date-range preset labels, keyed by preset key (see dateRangePresets()).
  presets: Record<string, string>;

  /**
   * The table's own accessible name. Deliberately a label rather than a second,
   * parallel `tableLabel` prop: the audit already records "three different prop
   * names for the accessible name" as a finding, and a table that is not "Data
   * table" says so with `labels={{ table: "Transactions" }}` at the call site.
   */
  table: string;

  // ---- Announcements ----
  // Spoken through the live region, never rendered. Each takes its numbers as
  // ARGUMENTS: a count glued into an English template literal is untranslatable,
  // and the grammar around it moves with the number in most languages.

  /** After a filter changes: "12 of 137 rows". */
  filterResults: (shown: number, total: number) => string;
  /** After a header is activated: "Sorted by Name, ascending". */
  sortedAscending: (column: string) => string;
  sortedDescending: (column: string) => string;
  /** The third click, which removes the column from the sort entirely. */
  sortCleared: (column: string) => string;
  /** After paging: "Page 3 of 14". `page` is 1-BASED, as spoken. */
  pageChanged: (page: number, totalPages: number) => string;

  // ---- Counted chrome ----
  // Visible text that interpolates numbers. These were template literals until the
  // audit flagged them: a consumer could translate every key in this file and still
  // be left with English (and with ASCII digit grouping) in the footer.

  /** The pagination range summary: "1–25 / 137". */
  pageRange: (from: number, to: number, total: number) => string;
  /** The same summary when the page size is "all" — just the row count. */
  rowCount: (total: number) => string;
  /** The column-settings rail and its heading: "Columns (4/9)". */
  columnsCount: (visible: number, total: number) => string;
  /**
   * A column's filter button and panel: "Filter Amount", and "Filter Amount (active)"
   * while the column is filtered (round 0.34 Wave 2, BUG-7c). Every column's used to be
   * "Filter" alike, and "filtered" was a colour. An app that translated only `filter`
   * gets `"<filter>: <column>"` from it: DataTable derives the one from the other.
   */
  filterColumn: (column: string, active: boolean) => string;

  // ---- Empty state, row actions, boolean cells (0.12.0) ----

  /** The body of a table with no rows and no `empty` prop of its own. A sentence, not
   *  "—": a dash in the only row of a table reads as one row with a missing value. */
  empty: string;
  /** The accessible name of the `rowActions` column (its header is visually empty). */
  actions: string;
  /** The `kind: "edit"` row action's name — its tooltip and its swipe label. */
  edit: string;
  /** The `kind: "delete"` row action's name. */
  delete: string;
  /** What {@link BooleanMark} says to a screen reader for `true` / `false` / nothing. */
  booleanTrue: string;
  booleanFalse: string;
  booleanUnset: string;

  // ---- Load more (0.48, keksdose dev #605) ----

  /** The `loadMore` footer's button when the app names nothing ("Load August 2026"). */
  loadMore: string;
  /** The `loadMore` footer once nothing is left, unless the app says `endLabel`. */
  allLoaded: string;
}

export const DEFAULT_DATA_TABLE_LABELS: DataTableLabels = {
  columns: "Columns",
  selectAllRows: "Select all rows",
  sortHint: "Click to sort · Shift-click to add a sort",
  filter: "Filter",
  close: "Close",
  selectRow: "Select row",
  selectRows: "Select rows",
  cancelSelection: "Cancel",
  rowDetails: "Details",
  autoSize: "Auto-size columns",
  hiddenForWidth: "hidden for width",
  loading: "Loading…",
  filters: "Filters",
  clearAll: "Clear all",
  done: "Done",
  pageSize: "Rows per page",
  pageSizeAll: "All",
  prevPage: "Previous page",
  nextPage: "Next page",
  clearFilter: "Clear filter",
  filterPlaceholder: "Filter…",
  selectFilter: "Select",
  selectAll: "All",
  selectNone: "None",
  dateFrom: "From",
  dateTo: "To",
  numberMin: "Min",
  numberMax: "Max",
  numberAbs: "Absolute value",
  presets: {
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This week",
    last_week: "Last week",
    last_7_days: "Last 7 days",
    last_30_days: "Last 30 days",
    this_month: "This month",
    last_month: "Last month",
    last_3_months: "Last 3 months",
    ytd: "Year to date",
    last_year: "Last year",
  },
  table: "Data table",
  filterResults: (shown, total) => `${shown} of ${total} rows`,
  sortedAscending: (column) => `Sorted by ${column}, ascending`,
  sortedDescending: (column) => `Sorted by ${column}, descending`,
  sortCleared: (column) => `Sort cleared on ${column}`,
  pageChanged: (page, totalPages) => `Page ${page} of ${totalPages}`,
  // The separators are the ones that shipped, so adding the seam changes no screen.
  pageRange: (from, to, total) => `${from}–${to} / ${total}`,
  rowCount: (total) => `${total}`,
  columnsCount: (visible, total) => `Columns (${visible}/${total})`,
  filterColumn: (column, active) => (active ? `Filter ${column} (active)` : `Filter ${column}`),
  empty: "No entries",
  actions: "Actions",
  edit: "Edit",
  delete: "Delete",
  booleanTrue: "Yes",
  booleanFalse: "No",
  booleanUnset: "Not set",
  loadMore: "Load more",
  allLoaded: "All rows loaded",
  // The phone sort control (0.22.0). The same words as `DEFAULT_DATA_TABLE_SORT_LABELS`
  // in data-table.tsx, written out rather than spread in: importing that VALUE here
  // would make data-table.tsx and this module import each other (data-table.tsx reads
  // these defaults from here), and would pull the whole table into `i18n/defaults`.
  sortBy: "Sort by",
  sortDefault: "Default order",
  sortAscending: "Ascending",
  sortDescending: "Descending",
};
