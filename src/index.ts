// @eifi1/ui-kit — shared design-system barrel.
//
// Domain-free UI + theme surface shared across apps (lead app: Keksdose). Consumers import
// components/theme from "@eifi1/ui-kit" and the token stylesheet from "@eifi1/ui-kit/tokens.css".

// ── lib ────────────────────────────────────────────────────────────────────
export * from "./lib/calc";
export { cn } from "./lib/cn";
export { logger, setStoreLog } from "./lib/logger";
// Intl number / money / percent / date / relative-time formatting, and `useKitFormat()`
// for the same bound to the provider's locale (kastlan's formatters.ts, English "5m ago").
export * from "./lib/format";
// localStorage that never throws (Safari private mode, blocked site data).
export { readStored, writeStored } from "./lib/safe-storage";
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
// One search param as state, the active tab in `?tab=`, and a dialog's open state in the
// URL (Modal's `urlParam`) — kastlan's and keksdose's use-search-param-state, in the kit.
export { useSearchParamState, useTabParam, useDialogParam } from "./hooks/use-search-param-state";
export type { SearchParamStateOptions, DialogParam } from "./hooks/use-search-param-state";
// Copy that reports whether it worked — keksdose's copy buttons said "Copied" when it had not.
export { useCopyToClipboard, copyToClipboard } from "./hooks/use-copy-to-clipboard";
export type { CopyState, UseCopyToClipboardOptions, UseCopyToClipboardReturn } from "./hooks/use-copy-to-clipboard";
// Keyboard shortcuts ("Mod+K", "Ctrl+Shift+F") that leave typing in fields alone.
export { useHotkey, parseHotkey, matchesHotkey } from "./hooks/use-hotkey";
export type { Hotkey, ParsedHotkey, UseHotkeyOptions } from "./hooks/use-hotkey";
// A protected file as an object URL, fetched with the app's own auth (kastlan's AuthedImage).
export { useAuthedSrc } from "./hooks/use-authed-src";
export type { AuthedFetcher, AuthedSrcStatus, UseAuthedSrcOptions, UseAuthedSrcResult } from "./hooks/use-authed-src";

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
// The label-ABOVE field group (label, hint, error, required), inside wizards or out.
export * from "./components/field";
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
export * from "./components/money-field";
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
// Named, not `*`: danger-confirm also holds the password field and pending hook that
// ReauthDialog shares with it, which are kit-internal.
export { DangerConfirm, DEFAULT_DANGER_CONFIRM_LABELS, typedMatches } from "./components/danger-confirm";
export type { DangerConfirmLabels, DangerConfirmProps, TypedMatch } from "./components/danger-confirm";
// 0.18: re-authentication before a sensitive action (Kurvenschmiede 4).
export { ReauthDialog, DEFAULT_REAUTH_DIALOG_LABELS } from "./components/reauth-dialog";
export type { ReauthDialogProps, ReauthDialogLabels } from "./components/reauth-dialog";
// `useConfirm()` — the promise-based replacement for `window.confirm`, one host per app.
export * from "./components/confirm-dialog";
// A non-modal corner panel and its round trigger (keksdose's assistant launcher).
export * from "./components/floating-panel";
// The count / clear / actions bar a selection brings up (keksdose's three copies).
export * from "./components/bulk-action-bar";
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
export * from "./components/pie-chart";
export * from "./components/pie-chart-labels";
export * from "./components/account-settings";
// 0.12.0: the fourth account section, and the QR code TwoFactorSetting draws its
// otpauth URI with (encoder in lib/qr-encode.ts — no dependency, see there).
export * from "./components/passkeys-setting";
export * from "./components/qr-code";
export { encodeQr } from "./lib/qr-encode";
export type { QrEncodeOptions, QrErrorCorrection, QrMatrix } from "./lib/qr-encode";
export * from "./components/alert-banner";
export * from "./components/toggle-group";
// A wrapping set of links/buttons marked `aria-current` — Tabs-like looks, not tabs.
export * from "./components/nav-pills";
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
export * from "./components/calendar-heatmap";
export * from "./components/date-picker";
export * from "./components/tree-view";
export * from "./components/chart";
// 0.8.0 layout and feedback primitives the apps hand-rolled or took from shadcn/Radix.
export * from "./components/description-list";
// The Save / Cancel row forms and dialogs end in, and the editable line-item repeater
// (journal lines, lease components, invoice positions). 0.12.0.
export * from "./components/form-actions";
// 0.18: lock every opted-in commit under one provider, the reason in its tooltip
// (Kurvenschmiede 2). `useCommitReason` stays internal.
export { WriteLockProvider, useWriteLock, DEFAULT_WRITE_LOCK_LABELS } from "./components/write-lock";
export type { WriteLock, WriteLockLabels, WriteLockProviderProps } from "./components/write-lock";
// 0.18: the parts both apps' admin rosters repeat (Kurvenschmiede 6).
export { RoleChip, AccountStateChip, DateMark, dateColumn, DEFAULT_ACCOUNT_STATE_LABELS, ACCOUNT_STATE_TONES } from "./components/account-chips";
export type { RoleChipProps, RoleDefinition, RoleVocabulary, AccountState, AccountStateLabels, AccountStateChipProps, DateMarkProps, DateColumnOptions } from "./components/account-chips";
// 0.18: the cold-start notice keksdose built (#199), for every app: a framework-free
// watchdog over the app's requests and the corner notice that explains the wait.
export { createServerWake, serverWake, watchReadsAnd, attachServerWake, wrapFetch } from "./lib/server-wake";
export type { ServerWakeStage, ServerWakeFilter, ServerWakeOptions, ServerWakeRequest, ServerWakeWatcher, ServerWakeAxiosConfig, AxiosLikeInstance } from "./lib/server-wake";
export { ServerWakeNotice, useServerWakeStage, DEFAULT_SERVER_WAKE_LABELS } from "./components/server-wake";
export type { ServerWakeLabels, ServerWakeNoticeProps } from "./components/server-wake";
// 0.18: sharing — grantees, roles, pending grants, candidates (Kurvenschmiede 1).
export { ShareCard, ShareDialog, SharePanel, DEFAULT_SHARE_CARD_LABELS } from "./components/share-card";
export type { ShareCardProps, ShareDialogProps, SharePanelProps, ShareCardLabels, ShareRole, ShareGrantee, SharePendingGrant, ShareCandidate, ShareAddRequest } from "./components/share-card";
export * from "./components/line-items";
export * from "./components/progress-bar";
// Named: skeleton.tsx also holds SKELETON_CLASS, the look StatTile shares — internal.
export { Skeleton } from "./components/skeleton";
export type { SkeletonProps, SkeletonShape } from "./components/skeleton";
// 0.12.0: a centred spinner with words, signed figures and deltas, a render-error fallback.
export * from "./components/loading-state";
export * from "./components/signed-amount";
export * from "./components/error-boundary";
export * from "./components/copy-button";
export { AuthedImage, DEFAULT_AUTHED_IMAGE_LABELS } from "./components/authed-image";
export type { AuthedImageProps, AuthedImageLabels } from "./components/authed-image";
export * from "./components/image-grid";
export * from "./components/lightbox";
export * from "./components/button-group";
export * from "./components/table";
export * from "./components/separator";
// Named: scroll-area.tsx also holds the overflow hook and scrollbar class Table shares.
export { ScrollArea } from "./components/scroll-area";
export type { ScrollAreaProps } from "./components/scroll-area";
// 0.10.0 rows, menu rows, text primitives and page chrome the apps drew by hand.
export * from "./components/list";
export * from "./components/menu-item";
export * from "./components/text";
export * from "./components/status-dot";
export * from "./components/page-header";
export * from "./components/breadcrumbs";
// The one inline link (kastlan's EntityLink / CellLink / legal and source links), through
// `<UiKitProvider linkComponent>`. Named: the file also holds the kit's internal link picker.
export { TextLink } from "./components/text-link";
export type {
  TextLinkProps,
  TextLinkRenderProps,
  TextLinkTone,
  TextLinkUnderline,
  TextLinkCurrent,
} from "./components/text-link";
// The toast layer over sonner (an OPTIONAL peer, loaded lazily): `toast` mirrors sonner's
// API so apps migrate by swapping the import; `<Toaster>` carries the placement, theme,
// tones and z-index both apps had wired by hand.
export { toast, Toaster, DEFAULT_TOAST_LABELS, TOAST_ACTION_DURATION } from "./components/toast";
export type {
  ToastId,
  ToastAction,
  ToastOptions,
  ToastPromiseOptions,
  ToastUndoOptions,
  ToastRedoOptions,
  ToastLabels,
  ToastPosition,
  ToastSwipeDirection,
  ToasterOffset,
  ToasterProps,
} from "./components/toast";

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
  DataTableCellProps,
  DataTableHeadProps,
  DataTableProps,
  ServerPagination,
  FilterState,
  MobileSwipeActions,
  DataTableDensity,
  DataTableChrome,
  DataTableRowAction,
} from "./components/data-table";
// 0.12.0: the yes/no cell, and a server table's state held by its owner, URL-synced.
export * from "./components/data-table-cells";
export { useTableUrlState, readTableUrlState } from "./components/use-table-state";
export type {
  TableUrlState,
  TableUrlSync,
  TableUrlStateProps,
  UseTableUrlStateOptions,
  UseTableUrlStateReturn,
} from "./components/use-table-state";

// ── shell (composable app chrome) ────────────────────────────────────────────
export * from "./shell/topbar-controls";
export * from "./shell/top-bar";
export * from "./shell/app-shell";
export * from "./shell/option-switcher-menu";
export * from "./shell/role-switcher";
export * from "./shell/topbar-action-menu";
export * from "./shell/top-bar-brand";
export * from "./shell/auth-layout";

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
export * from "./feedback/feedback-thread";

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
export * from "./search/search-index";
export * from "./search/global-search";

// ── i18n: one label tree, one optional provider ──────────────────────────────
// `UiKitLabels` names every string the kit renders; `<UiKitProvider labels locale>`
// hands a translation to every component below it. Precedence: a component's own
// prop > the provider > the English default. See src/i18n/kit-labels.tsx.
export * from "./i18n/kit-labels";
export * from "./i18n/defaults";
// The kit's words as `key → text` rows for an app's translation review (keksdose).
export { kitLabelStrings } from "./i18n/review";
// The seven languages, how an app resolves one, and the kit catalogue loader for it.
export * from "./i18n/languages";
// Translation review (0.19): one contract for kastlan's and keksdose's review pages —
// the pure rows/status/placeholder logic and the presentational page parts.
export {
  REVIEW_STATUSES,
  fromApiReview,
  toApiWrite,
  flattenStrings,
  keyNamespace,
  placeholderTokens,
  placeholderMismatch,
  reviewStatus,
  keyInArea,
  keyInAreas,
  translationRows,
  summariseRows,
  DEFAULT_TRANSLATION_REVIEW_FILTER,
  filterTranslationRows,
  reviewWrite,
  mergeReviews,
  dropReviews,
  translationCorrections,
} from "./lib/translation-review";
export type {
  TranslationVerdict,
  TranslationReview,
  TranslationReviewWrite,
  TranslationReviewKey,
  ReviewStatus,
  TranslationRow,
  ApiTranslationReview,
  ApiTranslationReviewWrite,
  TranslationRowsInput,
  TranslationSummary,
  TranslationReviewFilter,
  TranslationCorrection,
} from "./lib/translation-review";
export {
  TranslationReviewPanel,
  TranslationReviewEditor,
  ReviewStatusChip,
  TranslationProgress,
  TranslationLocaleTabs,
  TranslationExportButton,
  REVIEW_STATUS_TONES,
  DEFAULT_TRANSLATION_REVIEW_LABELS,
} from "./components/translation-review";
export type {
  TranslationReviewPanelProps,
  TranslationReviewEditorProps,
  ReviewStatusChipProps,
  TranslationProgressProps,
  TranslationLocaleTab,
  TranslationLocaleTabsProps,
  TranslationExportButtonProps,
  TranslationReviewLabels,
} from "./components/translation-review";
// The legal pages' shell (0.19, H10): Imprint, Privacy Policy, Terms in every app.
export { LegalLayout, LegalSection, LegalLinks, DEFAULT_LEGAL_LABELS } from "./components/legal";
export type { LegalLabels, LegalLink, LegalLinksProps, LegalSectionProps, LegalLayoutProps } from "./components/legal";
