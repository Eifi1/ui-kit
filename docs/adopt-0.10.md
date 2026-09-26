# Adopting `@eifi1/ui-kit` 0.10 — per repository

Built from the three apps' 0.9 audits. Everything here is additive: no existing prop,
default or DOM changes. `CHANGELOG.md` → `0.10.0` has the release notes, and the showcase
(⌘K) finds every component by name or by what you need. **0.9.1** went out just before it:
the CommandPalette `scrollIntoView` crash in jsdom, no native `title` in WizardSummary or
the contents rail, and the dev tooling upgrade (vite 8, vitest 5, eslint 10), which does not
affect consumers.

## Everyone

1. Bump to `^0.10.0` by hand; a caret below 1.0 locks the minor version.
2. **IconButton `label`**: one prop sets the accessible name and shows the kit Tooltip. It
   replaces every `aria-label` + `title` pair and every hand-built IconButton + Tooltip
   wrapper. `tooltip={false}` keeps the name without the bubble.
3. **Tooltip** now opens as a portal on its own inside a clipping or scrolling container. You
   can drop `portal` from call sites that only set it for that reason.
4. **New label keys** (only if you type a complete `UiKitLabels`; `tsc` lists them): `list`,
   `breadcrumbs`, `bulkActionBar`, and `seriesChart.points`. Every
   `@eifi1/ui-kit/i18n/<code>` catalogue has them.
5. **New components:**
   - `List` / `ListItem` and `MenuItem`
   - `SectionLabel`, `Caption` and `StatusDot`
   - `PageHeader` and `Breadcrumbs`
   - `BulkActionBar`
   - `TableEmpty`

---

## kastlan

| Replace | With | Notes |
|---|---|---|
| `shared/components/display/page-header.tsx` | `PageHeader` | `as`, `eyebrow`, and a `breadcrumbs` slot |
| `shared/components/layout/breadcrumbs.tsx` | `Breadcrumbs` (`renderLink` for the router) | adds `aria-current="page"`, which the local one lacked; collapses on phones |
| clickable rows (building-detail 402, group-overview 160, activity-feed 53, platform-company-detail 140, passkeys-card 75) | `List` + `ListItem` (`href` + `renderLink`, or `onClick`) | `actions` sit beside the row, not inside it |
| hand-made `colSpan` "no rows" TableRows (5 files) | `<TableBody empty={t("none")}>` | the column count is measured automatically |
| DetailField / DetailGrid, 4 preview dialogs | `DescriptionList layout="stacked" columns={n}` with an item `span` | |
| error-state, error-boundary, defects-step "all clear" | `EmptyState tone="danger" \| "success"` | |
| trial-banner, past-due-banner, tour-banner | `AlertBanner variant="strip" action={…}` | |
| StatusBadge raw colour classes | `Chip tone="blue" \| "indigo" \| "purple" \| "teal" \| "orange"` (plus the semantic tones) | the 9 hues map to 4 semantic tones and 5 hues; token colours in light and dark mode |
| dashboard-tab raw status dots | `StatusDot tone=…` | same tone names as ProgressBar and Chip |
| disabled Finalize button with `title=` | `Button disabledReason={…}` | the button stays focusable, and the reason shows in a Tooltip and is read out |
| RowAction (IconButton + Tooltip + aria-label) | `IconButton label={…}` | |
| FormModal `if (!open) return null` | `DialogFrame open={open}` | the exit animation plays |

Still local until a later release: TopBarActionMenu with an avatar trigger (it can build on
`MenuItem` now), extended FAB, MiniCalendar `renderDay`, and the wizard field group /
react-hook-form wizard-step bridge.

## keksdose

| Replace | With | Notes |
|---|---|---|
| quiet text actions (tours-page 321, transaction-fields 176/215, transaction-editor 401, invoice-lines-table 376, invoice-review 464) | `Button variant="link" tone="muted"` (or `"danger"` for "Remove split") | |
| mobile-bulk-bar, invoice-lines-bulk-bar, payees-selection-bar | `BulkActionBar variant="floating"` on phones, `"sticky"` on desktop | keep it mounted; it shows only while `count > 0` |
| account-menu rows, budget-switcher:51 | `MenuItem` (`checked`, `tone="danger"`, `href` + `current`) | inside HoverMenu; arrow keys work |
| notification-inbox 215, settings search results 323, support-attachments 91 | `ListItem` with `unread`, `href` / `external`, `loading` | middle-click works on links |
| cramped empty/loading boxes (notification-inbox 140, support-thread 144, assistant-page 321, support-panel 265, funding-dialog 89, …) | `EmptyState variant="inline"` | |
| 12px hint lines, import results, server-wake notice | `AlertBanner size="sm"`, `tone="success"`, `elevated` | |
| goal markers, budget cells, add-group-card, status dots | `Chip size="xs"`, `checkbox`, `variant="dot"`; `StatusDot` | |
| metrics-panel tight list, category-editor two columns | `DescriptionList density="tight"`; cards `columns={2}` | |
| vat-summary zero padding, per-state layout | `Table density="none" layout={editing ? "fixed" : "auto"}` | |
| metrics-panel wholeTicks, cash-buffer wholeDayTicks | automatic whole-number y ticks; force with `integerTicks: true` on an axis | |
| spending-tab weekday bar buttons | `SeriesChart onPointClick` | bars become keyboard stops (arrows, Enter); names like "Mon — Spent: €12" |
| report-range-field "Custom · from – to" | `DateRangePicker commit="apply" renderDraftSummary={…}` | the last blocker for the kit picker |
| GlobalSearch groups in suggestions, `[&_svg]:size-5`, "Search (⌘K)" as the name (C25) | `suggestionsKeepGroups`, `triggerIconSize={20}`, `triggerName="withShortcut"` | `aria-keyshortcuts` stays either way |
| transaction-search | `CommandPalette density="comfortable"` | no "Searching…" for a synchronous provider, by detection |
| budget-table phone editor on DialogFrame fullBleed | `FullBleedDialog title={…} headingAs="h2"` | the dialog is named by its heading |
| rule-editor `optionClassName="px-2 py-1 text-xs"` | `ToggleGroup size="sm"` | |
| transactions-page "Upcoming" fold | `Disclosure controls={showFuture ? ids.join(" ") : ""}` | trigger-only mode; the JSDoc shows it |

Still local until a later release: FAB pill group, floating raised ButtonGroup, stacked
ProgressBar, CalendarHeatmap, act-immediately ChoiceCard, wrapping nav selector,
IconButton 48 px / stretch / success tone.

## lenkbank

| Replace | With | Notes |
|---|---|---|
| 9 icon buttons with `aria-label` + `title` | `IconButton label={…}` | the tooltip now also shows on keyboard focus |
| 11 "text-xs font-semibold uppercase tracking-wide" headings, `shared/ui/caption.ts` | `SectionLabel as="h3"`, `Caption` | the same classes LegendGroup and StatTile use |
| gear/common.tsx:97 ToggleField | `ToggleGroup label hint error` | lines up with Input/Select in a row; the caption that changes per option stays yours for now |
| steering results rows (whole-row button with a figure) | `Disclosure trailingInTrigger chevronPosition="after-title" trailing={figure}` | the figure is part of the button's name |
| "all speeds" text toggle | `Button variant="link" pressed={…}` | |
| profile-bar, projects list, segment list | `List` + `ListItem` (`selected`, `actions`, `subtitle`) | segment-list's drag handle and windowing stay yours: pass the handle as `leading` |
| prose card lists (`detailClassName="font-normal …"`) | `DescriptionList layout="cards" prose` | |
