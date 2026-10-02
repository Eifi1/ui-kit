// `@eifi1/ui-kit/data-table` — the table suite.
//
// A re-slicing of the main barrel, not a new API. This entry point requires
// `react-router`: DataTable calls useSearchParams unconditionally, above any `urlSync`
// branch, so a Router is needed even with URL sync switched off.
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
  DataTableProps,
  ServerPagination,
  FilterState,
  MobileSwipeActions,
  DataTableDensity,
  DataTableChrome,
  DataTableRowAction,
} from "./components/data-table";
export * from "./components/data-table-cells";
export { useTableUrlState, readTableUrlState } from "./components/use-table-state";
export type {
  TableUrlState,
  TableUrlSync,
  TableUrlStateProps,
  UseTableUrlStateOptions,
  UseTableUrlStateReturn,
} from "./components/use-table-state";
