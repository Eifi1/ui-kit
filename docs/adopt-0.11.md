# Adopting `@eifi1/ui-kit` 0.11 — per repository

The rest of the three apps' 0.9 audits (items 19–25), plus the feedback from adopting
0.10. Everything is additive. The one visible change: `TopBarActionMenu` rows are now
`MenuItem`s, so their labels truncate instead of wrapping. `CHANGELOG.md` → `0.11.0` has
the release notes, and the showcase (⌘K) has every prop live.

## Everyone

1. Bump to `^0.11.0` by hand; a caret below 1.0 locks the minor version.
2. **New label keys** (only if you type a complete `UiKitLabels`): `floatingPanel.badge`
   and the namespace `calendarHeatmap`. Every `@eifi1/ui-kit/i18n/<code>` catalogue has
   them.
3. **Tooltips inside DataTable / Table portal the same way in tests as in the browser.**
   The table's scroller now carries `data-clips` (`CLIPS_ATTRIBUTE`), so an in-place
   bubble there is only in the DOM after hover or focus. A test that found it without
   hovering needs a hover or focus first, and cell names no longer double
   ("CheckingChecking"). Mark your own scroll containers with `data-clips` too, and drop
   the explicit `portal` props you kept only for tests.
4. **New:**
   - `Field` (label above, hint, error and required, with the ids wired up)
   - `ActionCard` and `NavPills`
   - `FloatingActionGroup` / `FloatingAction`, `ButtonGroupLink`
   - `CalendarHeatmap`
   - in `/rhf`: `useRhfWizardStep`

---

## kastlan

| Replace | With | Notes |
|---|---|---|
| account menu hand-built in HoverMenu (app/top-bar.tsx:147–205) | `TopBarActionMenu trigger={() => <UserAvatar … />} header={{ title, subtitle }} entries={[…, { tone: "danger", … }]} footer={…} footerLabel` | arrow keys skip the header and footer; Tab reaches the footer links |
| offline indicator (shared/offline/offline-indicator.tsx:39) | `FloatingActionButton extended live variant="surface"` | keep it mounted and pass `hidden` when there is nothing to report, so the live region announces changes |
| calendar page month grid (calendar-page.tsx:304–335) | `MiniCalendar size="lg" renderDay={(day, s) => …} month={m} onMonthChange={setM} hideNavigation` | day content stays non-interactive; open a day panel via `onSelect` for clickable events |
| shared/components/wizard/wizard-field.tsx | `Field label hint error required` with `{(ids) => <Input {...ids} />}` | |
| lease-unit-step.tsx:35 raw-class unit-status dots | `StatusDot tone="blue" \| "indigo" \| …` | StatusDot now takes Chip's hues, so a dot matches its Chip |
| use-rhf-wizard-step.ts | `useRhfWizardStep(form, { fields })` from `@eifi1/ui-kit/rhf` | your `(form, onValid)` call shape still works |

## keksdose

| Replace | With | Notes |
|---|---|---|
| feedback-page:854, transactions-page:644 corner toggles | `FloatingActionGroup` with `FloatingAction pressed badge` | badge count joins the name; tooltip is the kit Tooltip (dev#523) |
| FAB native title | `FloatingActionButton tooltip` / `FloatingPanel fabTooltip` | |
| scan-file-preview +/− discs, over-content toolbars | `ButtonGroup variant="gapped" elevated` | |
| account-menu trigger dot | `UserAvatar badge={{ label, tone }}` | the badge's label becomes part of the trigger's name |
| category-editor / charts calendar-heatmap.tsx | `CalendarHeatmap` (`layout="month"` on phones, `maxDays`, `sensitive` default on) | |
| cut-card:133 stacked meter | `ProgressBar segments={…} legend` | |
| transaction-fields:162 field-height delete, sync-status-indicator:142 | `IconButton stretch`, `tone="custom" toneColor={…}`, `shape="round"`, `size="xl"` | |
| privacy-enroll-dialog:345 CustodyOption | `ActionCard icon title description meta metaTone` | |
| swipe-settings-card:152 | `NavPills items current onSelect` | wraps; `aria-current`, not tabs |

## lenkbank

| Replace | With | Notes |
|---|---|---|
| ToggleField's per-option caption (gear/common.tsx) | `ToggleGroup label caption={(v) => …}` | announced when the choice changes; the ToggleField wrapper can go |
| segment list (setpoint/segment-list.tsx:165), whole row as drag source | `ListItem targetProps={handleProps}` | the whole 44px row stays the drag target; keep the fixed height for `useWindowedRows` via `className` (`subtitleLines` defaults to 1) |
| profile strip rows with a className border | `ListItem bordered` | |
