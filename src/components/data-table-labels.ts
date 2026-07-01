// All user-facing strings for the DataTable system, injected as props so the
// package stays i18n-free. Consumers pass translated overrides; the English
// defaults below make the table usable with no wiring.

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
};

/** Merge caller overrides onto the English defaults (presets merged too). */
export function resolveDataTableLabels(partial?: Partial<DataTableLabels>): DataTableLabels {
  if (!partial) return DEFAULT_DATA_TABLE_LABELS;
  return {
    ...DEFAULT_DATA_TABLE_LABELS,
    ...partial,
    presets: { ...DEFAULT_DATA_TABLE_LABELS.presets, ...(partial.presets ?? {}) },
  };
}
