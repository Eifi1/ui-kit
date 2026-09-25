# Adopting `@eifi1/ui-kit` 0.8 — per repository

Each app proposed these after adopting 0.7; this is what replaces what. Hand each section
to that repository's session as it is. `CHANGELOG.md` → `0.8.0` has the release notes, and
the showcase has every component live.

## Everyone

1. Bump to `^0.8.0` by hand; a caret below 1.0 locks the minor version. 0.8 only adds:
   no existing prop, default or DOM changes. The one exception is `Modal`'s `role`, which is
   now typed `"dialog" | "alertdialog"`: any other role was already overridden at runtime,
   and now it also fails type-checking.
2. **Confirm dialogs.** Mount `<ConfirmProvider>` once, inside `UiKitProvider`, and replace
   `window.confirm` like this:
   ```tsx
   const confirm = useConfirm();
   if (!(await confirm({ title: t("delete_q"), body, tone: "danger" }))) return;
   ```
   Focus starts on Cancel for `danger`. Escape, the backdrop and Cancel all resolve `false`.
   A second call waits in a queue. Labels come from the `confirmDialog` namespace.
3. **New label keys** (only if you type a complete `UiKitLabels`; `tsc` lists them):
   `common.dismiss`, `datePicker.apply` / `cancel` / `presets`, and `filePicker.dropzone`
   / `browse` / `empty` / `emptyMultiple` / `hint` / `busy`. New namespaces:
   `confirmDialog`, `floatingPanel` and `copyButton`. Every `@eifi1/ui-kit/i18n/<code>`
   catalogue has all of them.
4. **Density naming:** the new `Table`, `DescriptionList` and `DataTable` all use
   `density="comfortable" | "compact"`.

---

## keksdose

| Replace / adopt | With | Notes |
|---|---|---|
| hand-kept informal German `UiKitLabels` (366 lines) | `@eifi1/ui-kit/i18n/de-informal` → `UI_KIT_LABELS_DE_INFORMAL` | every sentence that addresses the user is in du form; the rest is shared with the formal German |
| 20+ `window.confirm` (rules-page, transactions-page, scan-review-actions, …) | `useConfirm()` | `transaction-swipe-plan.ts` stays synchronous and takes a `confirm` argument; its thunk becomes `void confirm({title, tone: "danger"}).then((ok) => ok && run())`. See the note in `confirm-dialog.tsx`. |
| privacy-sweep SweepBar, ynab summary indeterminate bar | `ProgressBar` (`value` omitted = indeterminate) | share bars (food-group, cut-card, drilldown, landing): `variant="meter"` |
| budget-summary, privacy, jobs, users, overview, tax `<dl>` grids | `DescriptionList` + `DescriptionItem` | `layout="rows"` or `"cards"`, `numeric` for figures |
| api-tokens-card / recovery-code-pane clipboard | `CopyButton text={…}` or `useCopyToClipboard()` | reports failure, announces the result |
| six text-link buttons | `<Button variant="link">` | |
| admin-page / settings-page sidebars | `<Tabs orientation="vertical">` | becomes the horizontal strip on phones; stack your two-column layout at `md` |
| collapse/expand all; map zoom ± | `ButtonGroup` | |
| assistant-launcher, feedback-page corner panel | `FloatingPanel` (+ `FloatingActionButton`) | not modal; `offset` keeps the launcher above the transactions action group; the panel unmounts when closed, so keep drafts in state |
| local Skeleton | `Skeleton` | `lines={n}`, `shape` |
| query-state offline/error cards, error-boundary | `EmptyState icon action` | `action` takes a fragment of buttons |
| preview-banner, beta-perf-banner, budget-summary row | `AlertBanner tone="info" \| "neutral"`, `onDismiss`, `onClick`/`href` row | |
| DEV badge, count pills, square and tag badges | `Chip variant="outline" \| "solid"`, `shape="square"`, `caps` | admin pill: `renderLink={({href, ...p}) => <Link to={href} {...p}/>}`; thread pills: `removeDisabled` |
| bulk-bar `size-11` IconButtons, amber and image-overlay buttons | `IconButton size="lg"`, `tone="warning"`, `variant="overlay"` | |
| account-menu language sub-list | `Disclosure variant="bare" chevronPosition="end"` | |
| RangeSheet Apply footer | `FullBleedDialog footer={…}` | a caller's `onMouseDown` stopPropagation (dev#477) now survives |
| transaction-search overlay | `CommandPalette query onQueryChange` | bind to the URL `q` |
| report-range-field preset identity | `DateRangePicker` preset `id` + `onChange(from, to, presetId)`, `preset`, `commit="apply"` | |
| invoice-upload hand-rolled zone | `FileDropzone disabled busy renderBody` | body strings come from the provider |
| admin MetricTile | `StatTile truncateLabel` | |
| category-treemap (recency fills) | `Treemap` nodes with `labelColor` | for `color-mix()` / `var()` fills |
| grouped-bar, stacked-area, income-expense-bar, budget-performance, cash-buffer, paper-price, price-history, networth, investments | `SeriesChart` with `type: "bar" \| "area"`, `stack`, `x.type: "category" \| "time"`, `references`, `markers`, `tickValues`, `dot`, `x.tickAngle`, `tooltip.boundary`, `activeDot` | per-chart sketches below |

**Chart sketches:**
- **grouped-bar:** `x: {type: "category", key: "period"}`, series `{key: seriesKey(id), type: "bar"}`, and `onPointClick: ({key, row}) => …`.
- **stacked-area:** series `{type: "area", stack: "1"}`.
- **income-expense-bar:** bars plus a net line, and a cumulative line on an `axis: "right"` axis.
- **budget-performance:** category x, `tickAngle: -45`, `tooltip: {boundary: scrollRef}`.
- **cash-buffer:** time x, the days series `{type: "area", fillOpacity: 0.2}`, the projection `{curve: "linear", dash: 1, activeDot: false}`, `references: [{value: 30, label}]` plus `markers`.
- **paper-price:** category x, trades as `markers`.
- **price-history:** time x with `tickValues` for the cent grid, and shops `{dot: true}`.
- **networth / investments:** category x, and dashed series with `strokeWidth`.

## kastlan

| Replace / adopt | With | Notes |
|---|---|---|
| InboxEmptyState (5 files) | `EmptyState icon action` | |
| 27 outline badges (mapped to neutral for now) | `Chip variant="outline"` | |
| billing plan cancel `confirm()` | `useConfirm()` | |
| shadcn Skeleton, inline `animate-pulse` | `Skeleton` | stops pulsing under reduced motion |
| shadcn Table (≈20 detail views) | `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `TableCaption`, `TableFoot` | `density="compact"`, `numeric`, `zebra`, `hover`; overflow handled |
| Radix Separator (9), ScrollArea (1) | `Separator`, `ScrollArea` | drops the last Radix packages |
| report/billing progress bars | `ProgressBar` | `tone`, `showValue`, `formatValue` |
| local useDebounce | `useDebounce` / `useDebouncedCallback` | `.cancel()` / `.flush()` |
| accounting account tree, gantt row labels | `TreeView` / `TreeRow` | full keyboard support, lazy `loadChildren`; `TreeRow onToggle` for the gantt rows |
| handover room card as drop target | `useFileDrop({ accept, onFiles, onReject })` | spread `dropProps` on the card and render `element` |
| whole-calendar-month report presets | `calendarMonthPresets({ months: [3, 6], years: [2] })` from `@eifi1/ui-kit/dates` | |
| themed Toaster | stays local | not in 0.8.0 |

## lenkbank

| Replace / adopt | With | Notes |
|---|---|---|
| 7 `window.confirm` (row, profile, segment, "clear all N", "replace corner") | `useConfirm()` | `tone: "danger"` for deletions, `"warning"` for replacements |
| comparison-panel label/value tables, bench `<dl>` cards | `DescriptionList` (`layout="rows"` with `numeric`, or `layout="cards"`) | |
| five text-xs tables (suggestions, STEP points, portfolio, PID, compare) | `DataTable density="compact" paginated={false}`, or the static `Table density="compact"` for the simple ones | |
| corner-motion toolbar warning and "solving…" status | `AlertBanner variant="inline"` (with `icon={<Spinner/>}` for the status) | `role="alert"` for danger, `status` otherwise |
| results-panel formula box, corner inset boxes | `Card variant="inset"` | |
