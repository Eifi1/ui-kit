// All user-facing strings for the DataTable system — the `dataTable` namespace of
// `<UiKitProvider labels>`, and per table the `labels` prop over that. The package
// ships no translations; the English defaults below make the table usable with no
// wiring.

export interface DataTableLabels {
  // Table chrome
  columns: string;
  selectAllRows: string;
  sortHint: string;
  filter: string;
  close: string;
  selectRow: string;
  autoSize: string;
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
}

export const DEFAULT_DATA_TABLE_LABELS: DataTableLabels = {
  columns: "Columns",
  selectAllRows: "Select all rows",
  sortHint: "Click to sort · Shift-click to add a sort",
  filter: "Filter",
  close: "Close",
  selectRow: "Select row",
  autoSize: "Auto-size columns",
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
};

/**
 * Merge caller overrides onto the English defaults (presets merged too).
 *
 * The parameter is `Partial` on purpose — a table with no labels at all still
 * renders — but that is also how a translated app ends up half English and never
 * hears about it: lenkbank ships nineteen of these keys in English in a German UI
 * today, because every one of them is backfilled silently. The kit will not start
 * throwing over it (three apps depend on the lenient merge), so
 * {@link missingDataTableLabels} is the other half: it answers which keys fell back,
 * and an app asserts on that in its OWN test, where the answer is actionable.
 */
export function resolveDataTableLabels(partial?: Partial<DataTableLabels>): DataTableLabels {
  if (!partial) return DEFAULT_DATA_TABLE_LABELS;
  const merged: DataTableLabels = {
    ...DEFAULT_DATA_TABLE_LABELS,
    ...partial,
    presets: { ...DEFAULT_DATA_TABLE_LABELS.presets, ...(partial.presets ?? {}) },
  };
  // `columnsCount` was split out of `columns` + a template literal. Consumers have
  // been translating `columns` since 0.1, and backfilling the English default over
  // that would hand them "Columns (4/9)" back for having translated the key that
  // existed at the time — the same silent-English failure the audit records against
  // this file. So the count is derived from the RESOLVED `columns` unless the caller
  // states the whole sentence, which is the escape hatch for a language where the
  // parenthetical does not fit.
  if (partial.columns !== undefined && partial.columnsCount === undefined) {
    merged.columnsCount = (visible, total) => `${merged.columns} (${visible}/${total})`;
  }
  return merged;
}

/**
 * The label keys `labels` does not supply, and which therefore come back English
 * from {@link resolveDataTableLabels}.
 *
 * For a consumer's own test:
 *
 * ```ts
 * expect(missingDataTableLabels(de.dataTable)).toEqual([]);
 * ```
 *
 * which fails the day the kit adds a key — which is the point. Adding a label is
 * additive here and a silent regression in a translated app, and nothing else in
 * either repository can tell the two apart.
 *
 * Preset labels are reported one at a time (`presets.yesterday`), because `presets`
 * is a `Record` merged key by key: answering `"presets"` would say nothing about
 * which of the eleven are still English.
 */
export function missingDataTableLabels(labels?: Partial<DataTableLabels>): string[] {
  const missing: string[] = [];
  for (const key of Object.keys(DEFAULT_DATA_TABLE_LABELS) as Array<keyof DataTableLabels>) {
    if (key === "presets") continue;
    if (labels?.[key] !== undefined) continue;
    // `columnsCount` is DERIVED from a translated `columns` by the resolver above,
    // so a caller who set that one is not leaking English here. Reporting it would
    // send them to translate a key they have already covered, and an `toEqual([])`
    // assertion built on this would never go green.
    if (key === "columnsCount" && labels?.columns !== undefined) continue;
    missing.push(key);
  }
  for (const preset of Object.keys(DEFAULT_DATA_TABLE_LABELS.presets)) {
    if (labels?.presets?.[preset] === undefined) missing.push(`presets.${preset}`);
  }
  return missing;
}
