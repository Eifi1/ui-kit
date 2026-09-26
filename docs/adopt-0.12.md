# Adopting `@eifi1/ui-kit` 0.12 — per repository

Built from kastlan's final audit ("keep nothing local the kit could cover") and
keksdose's notes on adopting 0.11. Almost everything is additive. The three visible changes
(DescriptionItem, DataTable empty text, SearchField clear button) are marked. `CHANGELOG.md` → `0.12.0` has the release notes, and the showcase (⌘K) has
every prop live.

## Everyone

1. Bump to `^0.12.0` by hand; a caret below 1.0 locks the minor version.
2. **Set your router link once:**
   `<UiKitProvider linkComponent={({ href, ...p }) => <Link to={href} {...p} />}>`.
   Then drop `renderLink` from ListItem, Breadcrumbs, StatTile, Chip, MenuItem, NavPills,
   ButtonGroupLink, FloatingAction and ActionCard, and use `TextLink` / `Button href`. A
   component's own `renderLink` still wins. The rule is the same in every kit link: `/x`, `x`
   and the hash-router form `#/x` go through your router link; `https:`, `mailto:`, `//host`
   and an in-page `#anchor` stay plain `<a>`.
3. **Visible changes:**
   - **DescriptionItem** shows "—" for an empty value; `placeholder={null}` restores the old empty cell.
   - **DataTable's default empty text** is now "No entries" (`dataTable.empty`), no longer "—".
4. **New label keys** (only if you type a complete `UiKitLabels`; `tsc` lists them):
   - new namespaces: `form`, `descriptionList`, `lineItems`, `signedAmount`, `errorBoundary`, `progressBar`, `pieChart`, `authedImage`, `imageGrid`, `lightbox`, `accountSettings`, `feedbackDialog`, `feedbackThread` and `feedbackComposer`
   - new keys in existing namespaces: `dataTable`, `monthPicker` and `common.opensInNewTab`

   Every `@eifi1/ui-kit/i18n/<code>` catalogue has them.
5. **SearchField draws its clear button by default** (labelled `common.clear`).
   `clearable={false}` removes it. You can drop the `clearLabel` you only passed to get the
   button.
6. **Fixed:** CopyButton no longer pins `tooltipPortal={false}`, so inside a DataTable its bubble portals like any Tooltip.

---

## kastlan

| Replace | With | Notes |
|---|---|---|
| entity-link, cell-link, feedback-page 275/479, legal-layout 19–40, calculators, app-layout 92–141 | `TextLink` (`external`, `tone`, `stopPropagation`) | lease-unit-step:125's raw `<a>` becomes `TextLink`, with no more full reload |
| `buttonClasses` on router Links (6), `onClick={() => navigate(…)}` Buttons (26) | `<Button href>` | `disabled` renders an inert link |
| group-overview section tiles | `ActionCard href` | |
| shared/components/form/fields.tsx (600 lines) | `RhfTextField`, `RhfNumberField`, `RhfMoneyField`, `RhfDateField`, `RhfTextarea`, `RhfSelect`, `RhfCheckbox`, `RhfCombobox`, `RhfTextCombobox`, `RhfField` (custom) from `@eifi1/ui-kit/rhf` | errored fields get the red border; focus goes to the first error |
| form-actions.tsx | `FormActions` (`pending`, `destructive`, `placement`) | |
| use-rhf-wizard-step's two hooks, 16 hand-written step `<h3>` | `useWizardStepValidate`, `useWizardNextGate`, `WizardStep title description` | |
| journal-entry-lines, floor-card, floors-units, invoice-line-items, lease-components, new-budget | `LineItems` / `RhfLineItems` | |
| DetailField em dash | `DescriptionList` (the placeholder is now the default) | |
| resource-list-page row actions and toolbar | `DataTable rowActions={[{ kind: "edit", … }, { kind: "delete", confirm: useConfirm(), … }]} toolbar={…}` | the same actions become mobile swipes |
| use-server-table, build-list-url, column-filters | `useTableUrlState`, `filterHref`, `selectFilter(record)` / `textFilter` / `dateFilter` / `numberFilter` | two URL-synced tables on one page: `urlSync={{ prefix: "units." }}` / `urlPrefix` |
| bool-cell | `BooleanMark` / `booleanColumn` | |
| hand-framed tables (6), balance sheet / income statement / journal totals | `Table framed`, `TableRow variant="group" \| "subtotal" \| "total"` | |
| use-search-param-state, use-tab-param, use-dialog-param | `useSearchParamState`, `useTabParam`, `useDialogParam` / `Modal urlParam` | |
| feedback-page expandedRow stopPropagation div | drop it | expansion clicks never reached the row; clicks from portals no longer do either |
| utils/formatters, tenancy/utils/format | `formatNumber`, `formatMoney`, `formatPercent`, `formatDate`, `formatRelativeTime`, `useKitFormat` | date-fns patterns ("dd.MM.yyyy") become a style such as `"medium"` |
| signed amounts, deltas, tone text (7 sites) | `SignedAmount`, `Delta`, `Tone` | |
| dashboard / charts-tab pie | `PieChart` | |
| gantt legend | `StaticLegend` | |
| room-inspector, unit-rooms, unit-floor-plan, authed-image | `ImageGrid`, `Lightbox`, `AuthedImage` / `useAuthedSrc({ fetcher })` | PDFs show a file card |
| calendar page out-of-month days and month header | `MiniCalendar showOutsideDays`, `MonthPicker variant="stepper"` | |
| loading-state, activity-feed skeleton | `LoadingState`, `Skeleton label` | |
| invoice-detail warning card | `Card tone="warning"` | |
| usage-progress-bar | `ProgressBar max={null}`, `hint`, `overage` | |
| error-boundary | `ErrorBoundary` | |
| login / register / verify / two-factor / legal layouts | `AuthLayout` (`width="wide" card={false}` for legal) | `landmark={false} headingAs="h2"` when it is embedded in another page |
| app-layout sidebar footer, top-bar brand | `AppShell sidebarFooterItems`, `TopBarBrand` | |
| profile-page labels, qrcode.react, passkeys-card | settings labels from the provider (`accountSettings`), `TwoFactorSetting setup={{ otpauthUri }}` (built-in QR), `PasskeysSetting` | |
| feedback-button labels, feedback-page thread | `feedbackDialog` labels, `FeedbackThread`, `FeedbackComposer` | |
| feedback-button Ctrl+Shift+F | `useHotkey("Mod+Shift+F", …)` | |
| 32 SearchField `clearLabel` repeated (4 sites) | drop it | the clear button is on by default |
| 33 journal-entry-lines per-field labels on phones | `Field labelVisibility="below-md"` | the label stays the control's name at every width |
| 34 MultiEntityCombobox To/Cc/Bcc in Field | `{(ids) => <MultiEntityCombobox {...ids} … />}` | ids now land on the trigger; the same for EntityCombobox, Combobox, AmountInput, DatePicker, NumberInput |
| 35 DE cap button pair in Field | `ToggleGroup labelPlacement="above"`, or bare with `aria-labelledby={labelId}` (Field's 2nd render arg) | |
| 36 "Remove all" `text-destructive` | `Button variant="secondary" tone="danger"` | |
| 37 room-inspector / handover-detail / defects-step inset cards | `ListItem` with a body (`children`) | the body sits beside the row's target, named by its title |
| 38 breakdown-row, meter-add-row sub-boxes | `Card variant="outline" padding="sm"` | |
| 39 NumberField aria from Field | typed now | |
| tours/utils/completions storage | `readStored` / `writeStored` | |

## keksdose

| Gap | Use | Notes |
|---|---|---|
| E0 users-panel pinned `tooltipPortal` | drop it | fixed |
| E1 sync-status-indicator, camera shutter | `IconButton size="2xs" glyphSize={20} shape="round" badge={…} disabledStyle="keep"`; `size="2xl" variant="shutter"` | the shutter uses theme-independent media tokens: white ring on dark |
| E2 feedback trigger unread dot | `TopBarActionMenu iconBadge={{ label, tone }}` | |
| E3 cut-card | `ProgressBar legendValue={(seg) => …}`, segments with `legendOnly` | |
| E4 heatmap palette ramp, future days | `CalendarHeatmap colorFrom colorTo emptyColor` (or `fill`), `anchor="latest"` | |
| E5 custody icon | `ActionCard iconTone="brand"` | |
| E6 vat-summary dividers | `Table rowDividers={false}`, `TableHead bordered={false}`, `TableRow bordered` | raw `<thead>` cells are now read as head cells |
| E7 "Upcoming" toggle | `FloatingAction pressedStyle="plain"` | |
| E8 category-name-combobox pinned `portal` | drop it | combobox and picker-sheet lists carry `data-clips` |
