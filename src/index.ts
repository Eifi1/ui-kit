// @eifi1/ui-kit — shared design-system barrel.
//
// Domain-free UI + theme surface shared across apps (lead app: Keksdose). Consumers import
// components/theme from "@eifi1/ui-kit" and the token stylesheet from "@eifi1/ui-kit/tokens.css".

// ── lib ────────────────────────────────────────────────────────────────────
export * from "./lib/calc";
export { cn } from "./lib/cn";
export { logger, setStoreLog } from "./lib/logger";
// Date helpers are also available via the "@eifi1/ui-kit/dates" subpath.

// ── hooks ────────────────────────────────────────────────────────────────────
export { useMediaQuery } from "./hooks/use-media-query";
export { useBodyScrollLock } from "./hooks/use-body-scroll-lock";
export { useAnchoredRect } from "./hooks/use-anchored-rect";
export type { AnchorRect } from "./hooks/use-anchored-rect";
export { useAnchoredPanel, anchoredPanelPlacement, useVisualViewport } from "./hooks/use-anchored-panel";
export type {
  AnchoredPanel,
  AnchoredPanelOptions,
  ViewportBox,
} from "./hooks/use-anchored-panel";
export { useEscapeKey, useOutsideClick } from "./hooks/use-dismiss";
// Focus containment for an overlay, and a live region for a change that moves no focus.
// Both were extracted from the two components that already did them correctly (Modal and
// CommandPalette) so the rest of the kit stops being the exception.
export { useFocusTrap } from "./hooks/use-focus-trap";
export type { FocusTrapOptions } from "./hooks/use-focus-trap";
export { useAnnounce } from "./hooks/use-announce";
export type { UseAnnounceReturn, UseAnnounceOptions, AnnounceRegionProps } from "./hooks/use-announce";
export { useOverlayHistory } from "./hooks/use-overlay-history";
export { useCloseTransition, OVERLAY_EXIT_MS } from "./hooks/use-close-transition";
export { useRowSwipe } from "./hooks/use-row-swipe";
export type { SwipeStage, RowSwipeOptions, RowSwipeReturn } from "./hooks/use-row-swipe";
// Any element as a file drop target, screened like FileButton (kastlan).
export { useFileDrop, dragHasFiles } from "./hooks/use-file-drop";
export type { UseFileDropOptions, UseFileDropReturn, FileDropProps } from "./hooks/use-file-drop";
// kastlan's search boxes each carried a hand-rolled copy, two without the cleanup.
export { useDebounce, useDebouncedCallback } from "./hooks/use-debounce";
export type { DebouncedCallbackOptions, DebouncedFunction } from "./hooks/use-debounce";
// Copy that reports whether it worked — keksdose's copy buttons said "Copied" when it had not.
export { useCopyToClipboard, copyToClipboard } from "./hooks/use-copy-to-clipboard";
export type { CopyState, UseCopyToClipboardOptions, UseCopyToClipboardReturn } from "./hooks/use-copy-to-clipboard";

// ── theme / palettes ─────────────────────────────────────────────────────────
export * from "./theme/chart-palette";
// Colour maths (sRGB ↔ OKLCH, WCAG contrast, CVD simulation) and the palette deriver
// that builds a whole, contrast-solved palette from one brand colour plus any colours
// pinned by hand. `auditPalette` / `auditChartRamp` measure a palette rather than
// trusting a comment about it.
export * from "./theme/color";
export * from "./theme/palette-derive";
export * from "./theme/palette-presets";
export * from "./theme/theme-store";
export * from "./theme/palette-store";

// ── components ───────────────────────────────────────────────────────────────
export * from "./components/ui";
export * from "./components/search-field";
export * from "./components/dropdown";
export * from "./components/popover";
export { SwipeableRow } from "./components/swipeable-row";
export type { SwipeAction, SwipeableRowProps } from "./components/swipeable-row";
export * from "./components/calculator";
export * from "./components/numpad-sheet";
export * from "./components/number-input";
export * from "./components/currency-select";
export * from "./components/amount-input";
export * from "./components/combobox";
export * from "./components/picker-sheet";
export * from "./components/entity-combobox";
export * from "./components/multi-entity-combobox";
export * from "./components/multi-select";
export * from "./components/tooltip";
export * from "./components/user-avatar";
export * from "./components/settings-fields";
// Sync state for a database-backed field: the engine (`useFieldSync`) and the
// affordance (`FieldSyncIndicator`), kept separate because the state is useful
// without the dot — a form can gate its submit on any field being `pending`.
export * from "./components/field-sync";
export * from "./components/month-picker";
export * from "./components/checkbox";
export * from "./components/switch";
export * from "./components/slider";
export * from "./components/time-input";
export * from "./components/number-field";
export * from "./components/sparkline";
export * from "./components/stat-tile";
export * from "./components/signature-pad";
export * from "./components/password-strength";
export * from "./components/page-contents";
export * from "./components/disclosure";
export * from "./components/dialog-frame";
export * from "./components/danger-confirm";
// `useConfirm()` — the promise-based replacement for `window.confirm`, one host per app.
export * from "./components/confirm-dialog";
// A non-modal corner panel and its round trigger (keksdose's assistant launcher).
export * from "./components/floating-panel";
export * from "./components/swatch-picker";
export * from "./components/icon-picker";
export * from "./components/choice-card";
export * from "./components/autocomplete";
export * from "./components/measured-grid";
export { useWindowedRows } from "./hooks/use-windowed-rows";
export type { WindowedRows } from "./hooks/use-windowed-rows";
// Named, not `export *`: file-button.tsx also holds the screening helpers the
// dropzone shares, which are internal.
export { FileButton, useFilePicker, matchesAccept, DEFAULT_FILE_PICKER_LABELS } from "./components/file-button";
export type {
  FileButtonProps,
  UseFilePickerOptions,
  UseFilePickerReturn,
  FilePickerLabels,
  FileRejection,
  FileRejectionReason,
  FileScreenOptions,
} from "./components/file-button";
export * from "./components/treemap";
export * from "./components/series-chart";
export * from "./components/chart-zoom";
export * from "./components/toggle-legend";
export * from "./components/facing-pair";
export * from "./components/series-chart-labels";
export * from "./components/account-settings";
export * from "./components/alert-banner";
export * from "./components/toggle-group";
// A pill carrying one VALUE — inert, a link, or a toggle, depending on which prop it is
// given — and the list field built from it. Distinct from Button on purpose: a row of
// buttons reads as "choose an action", a row of chips as "here are the things".
export * from "./components/chip";
export * from "./components/wizard-stepper";
export * from "./components/hover-menu";
export * from "./components/modal";
export * from "./components/full-bleed-dialog";
export * from "./components/grouped-picker";
export * from "./components/file-dropzone";
export * from "./components/mini-calendar";
export * from "./components/date-picker";
export * from "./components/tree-view";
export * from "./components/chart";
// 0.8.0 layout and feedback primitives the apps hand-rolled or took from shadcn/Radix.
export * from "./components/description-list";
export * from "./components/progress-bar";
// Named: skeleton.tsx also holds SKELETON_CLASS, the look StatTile shares — internal.
export { Skeleton } from "./components/skeleton";
export type { SkeletonProps, SkeletonShape } from "./components/skeleton";
export * from "./components/copy-button";
export * from "./components/button-group";
export * from "./components/table";
export * from "./components/separator";
// Named: scroll-area.tsx also holds the overflow hook and scrollbar class Table shares.
export { ScrollArea } from "./components/scroll-area";
export type { ScrollAreaProps } from "./components/scroll-area";

// ── data-table suite ─────────────────────────────────────────────────────────
export * from "./components/data-table-labels";
export * from "./components/data-table-sort";
export * from "./components/data-table-filters";
export * from "./components/data-table-pagination";
export { FilterPopover } from "./components/data-table-filter-popover";
// data-table re-exports SortState internally; export the rest explicitly to
// avoid a duplicate SortState star-export (it comes from data-table-sort).
export { DataTable } from "./components/data-table";
export type {
  DataTableColumn,
  DataTableProps,
  ServerPagination,
  FilterState,
  MobileSwipeActions,
  DataTableDensity,
} from "./components/data-table";

// ── shell (composable app chrome) ────────────────────────────────────────────
export * from "./shell/topbar-controls";
export * from "./shell/top-bar";
export * from "./shell/app-shell";
export * from "./shell/option-switcher-menu";
export * from "./shell/role-switcher";
export * from "./shell/topbar-action-menu";

// ── feedback ─────────────────────────────────────────────────────────────────
// The form somebody files a report with, and the parts an inbox is built from:
// the status vocabulary both apps share value for value, the policy about what a
// row may move to from where it stands, and the look of a status control, a
// category badge and an opened report. The app still wires its own API, columns
// and strings — see the note at the top of `feedback-inbox.tsx` for what is
// deliberately left to it.
export * from "./feedback/feedback-attachment";
export * from "./feedback/feedback-dialog";
export * from "./feedback/feedback-inbox";

// ── multi-step wizard ────────────────────────────────────────────────────────
// The engine (step machine, validators, collected data), the chrome around it
// (indicator + nav bar + cancel confirm) and the review step it ends on.
// `components/wizard-stepper` next door is a different, much smaller thing: a bare
// step indicator for a two-step import flow, with no engine.
//
// Two modules were removed here rather than kept as stock. `wizard-field` held a
// `WizardField`/`WizardSelectField` pair that had never been rendered in any app —
// a field group nothing was built from, which this comment used to advertise. And
// `use-rhf-wizard-step` was the only thing in the package that touched
// react-hook-form, for a hook neither consumer called: keeping it meant an optional
// peer, a dev dependency and a type import in every consumer's typecheck, bought
// for nobody. A design system may carry stock; untested stock nothing has ever
// rendered is not stock, it is a liability with an export.
export * from "./wizard/types";
export * from "./wizard/use-wizard";
export * from "./wizard/wizard-context";
export * from "./wizard/validation";
export * from "./wizard/wizard-step";
export * from "./wizard/wizard-summary";
export * from "./wizard/stepper-nav";

// ── guided tours ─────────────────────────────────────────────────────────────
export * from "./tour/tour";

// ── command palette / global search ──────────────────────────────────────────
export * from "./search/command-palette";

// ── i18n: one label tree, one optional provider ──────────────────────────────
// `UiKitLabels` names every string the kit renders; `<UiKitProvider labels locale>`
// hands a translation to every component below it. Precedence: a component's own
// prop > the provider > the English default. See src/i18n/kit-labels.tsx.
export * from "./i18n/kit-labels";
export * from "./i18n/defaults";
