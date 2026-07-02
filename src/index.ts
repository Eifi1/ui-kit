// @hb/ui — shared design-system barrel.
//
// Domain-free UI + theme surface extracted from household-books. Consumers import
// components/theme from "@hb/ui" and the token stylesheet from "@hb/ui/tokens.css".

// ── lib ────────────────────────────────────────────────────────────────────
export * from "./lib/calc";
export { cn } from "./lib/cn";
export { logger } from "./lib/logger";
// Date helpers are also available via the "@hb/ui/dates" subpath.

// ── hooks ────────────────────────────────────────────────────────────────────
export { useMediaQuery } from "./hooks/use-media-query";
export { useBodyScrollLock } from "./hooks/use-body-scroll-lock";
export { useAnchoredRect } from "./hooks/use-anchored-rect";
export type { AnchorRect } from "./hooks/use-anchored-rect";
export { useEscapeKey, useOutsideClick } from "./hooks/use-dismiss";

// ── theme / palettes ─────────────────────────────────────────────────────────
export * from "./theme/chart-palette";
export * from "./theme/palette-presets";
export * from "./theme/theme-store";
export * from "./theme/palette-store";

// ── components ───────────────────────────────────────────────────────────────
export * from "./components/ui";
export * from "./components/dropdown";
export * from "./components/popover";
export * from "./components/calculator";
export * from "./components/math-keys";
export * from "./components/number-input";
export * from "./components/currency-select";
export * from "./components/amount-input";
export * from "./components/combobox";
export * from "./components/entity-combobox";
export * from "./components/multi-entity-combobox";
export * from "./components/multi-select";
export * from "./components/tooltip";
export * from "./components/user-avatar";
export * from "./components/settings-fields";
export * from "./components/account-settings";
export * from "./components/alert-banner";
export * from "./components/toggle-group";
export * from "./components/wizard-stepper";
export * from "./components/hover-menu";
export * from "./components/modal";
export * from "./components/grouped-picker";
export * from "./components/file-dropzone";
export * from "./components/mini-calendar";
export * from "./components/date-picker";
export * from "./components/chart";

// ── data-table suite ─────────────────────────────────────────────────────────
export * from "./components/data-table-labels";
export * from "./components/data-table-sort";
export * from "./components/data-table-filters";
export * from "./components/data-table-pagination";
export { FilterPopover } from "./components/data-table-filter-popover";
// data-table re-exports SortState internally; export the rest explicitly to
// avoid a duplicate SortState star-export (it comes from data-table-sort).
export { DataTable } from "./components/data-table";
export type { DataTableColumn, DataTableProps, ServerPagination, FilterState } from "./components/data-table";

// ── shell (composable app chrome) ────────────────────────────────────────────
export * from "./shell/topbar-controls";
export * from "./shell/top-bar";
export * from "./shell/app-shell";
export * from "./shell/option-switcher-menu";
export * from "./shell/role-switcher";
export * from "./shell/topbar-action-menu";

// ── feedback (generic form shell; app wires its own API/inbox) ───────────────
export * from "./feedback/feedback-dialog";

// ── guided tours ─────────────────────────────────────────────────────────────
export * from "./tour/tour";

// ── command palette / global search ──────────────────────────────────────────
export * from "./search/command-palette";
