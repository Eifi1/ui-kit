// `@eifi1/ui-kit/data-table` — the table suite.
//
// A re-slicing of the main barrel, not a new API. This entry point imports
// `react-router` (a peer dependency), but since 0.49 (KIT-3) a Router is needed only for
// a table with `urlSync`: without it DataTable keeps its view in local state alone.
export * from "./components/data-table-labels";
export * from "./components/data-table-sort";
export * from "./components/data-table-filters";
export * from "./components/data-table-pagination";
export { FilterPopover } from "./components/data-table-filter-popover";
// `SortState` comes from data-table-sort above; re-exporting the module wholesale
// would collide with it, which is why the main barrel names these explicitly too.
export { DataTable, DEFAULT_DATA_TABLE_SORT_LABELS } from "./components/data-table";
export type {
  DataTableSortLabels,
  DataTableColumn,
  // The barrel had these two and this entry did not (refactor audit 2026-10, MOD-5):
  // the types of a column's `cellProps` and `headProps`.
  DataTableCellProps,
  DataTableHeadProps,
  DataTableProps,
  ServerPagination,
  FilterState,
  MobileSwipeActions,
  DataTableDensity,
  DataTableChrome,
  DataTableRowAction,
  DataTableDesktopSwipeActions,
} from "./components/data-table";
// 0.46.1 (keksdose N3): a swipe plan as `RowActions`' actions — the desktop column's own
// derivation, for an app's hand-built actions column.
export { swipePlanRowActions } from "./components/data-table-row-actions";
// 0.48 (keksdose dev #605): a `groupBy` level (also `mobileGroupBy`'s) and the `loadMore` footer.
export type { DataTableGroupBy, DataTableLoadMore } from "./components/data-table-groups";
export * from "./components/data-table-cells";
export { useTableUrlState, readTableUrlState } from "./components/use-table-state";
export type {
  TableUrlState,
  TableUrlSync,
  TableUrlStateProps,
  UseTableUrlStateOptions,
  UseTableUrlStateReturn,
} from "./components/use-table-state";
