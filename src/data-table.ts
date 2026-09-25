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
export { DataTable } from "./components/data-table";
export type {
  DataTableColumn,
  DataTableProps,
  ServerPagination,
  FilterState,
  MobileSwipeActions,
  DataTableDensity,
} from "./components/data-table";
