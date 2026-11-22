# Adopting `@eifi1/ui-kit` 0.53

ui-kit 0.53 removes what 0.52 deprecated, and takes keksdose's notes from adopting 0.52: a
SeriesChart that hands back the caller's own row type, a Treemap name without the share for a
formatter that prints it, and a Treemap redaction that leaves public group names alone. This
guide lists what has to change per app, then what each area changes, with the places found in
keksdose, kastlan and Kurvenschmiede (KS) on 2026-11-01 (`frontend/src`, each app's 0.52
branch).

**Adopt 0.52 first.** 0.53 removes the old forms 0.52 kept working; an app's 0.52 must-change
list is what takes it off them.

**Legal wording:** none.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

## Removed: what 0.52 deprecated (breaking)

| Removed | Use |
|---|---|
| `DateRangeCommit` (`DateRangePicker commit="apply" \| "immediate"`) | `apply` |
| `FeedbackStatusMutate`, `FeedbackDetailUpdate` (the `.mutate` callback form) | `mutateAsync` (`FeedbackStatusMutateAsync`, `FeedbackDetailUpdateAsync`) |
| `FeedbackComposerProps` / `Handle` / `Labels` / `SlotContext` | `ChatComposer*` |
| `CancelSubscriptionConfirm` / `PlanSwitchConfirm` / `GrantWarningConfirm` `onOpenChange` | `onClose` |
| `FeedbackPublicList` `onOpenChange` | `onOpenIdChange` |
| `AccountMenuLanguage` / `AccountMenuTextSize` `onPick` | `onChange` |
| `RoleSwitcher`, `SectionNav`, the FieldSync family, `SignChip`, `lib/isin`; label namespaces `fieldSync`, `signChip`, key `topBar.switchRole` | none: no app uses them |
| 55 runtime names no app, test or showcase page read (tuning constants, single-component helpers), from the entry points | the component that uses them |
| label keys `feedbackDetail.outcomeAdd` / `outcomeUpdate` / `outcomePlaceholder` | none (dead since 0.38) |
| `feedbackPageHref`, `feedbackPagePath` | `FeedbackRowDetail` and the table's URL cell |

**Every changed name** (check:api against 0.52.0), by family:

- The whole modules: `RoleSwitcher`, `RoleSwitcherProps`, `SectionNav`, `SectionNavProps`,
  `useFieldSync`, `UseFieldSyncOptions`, `UseFieldSyncReturn`, `FieldSyncIndicator`,
  `FieldSyncIndicatorProps`, `FieldSyncRow`, `FieldSyncRowProps`, `FieldSyncState`,
  `FieldSyncLabels`, `DEFAULT_FIELD_SYNC_LABELS`, `FIELD_SYNC_FRAME`, `FIELD_SYNC_SAVED_MS`,
  `SignChip`, `SignChipProps`, `SignChipLabels`, `DEFAULT_SIGN_CHIP_LABELS`, `formatIsin`,
  `isValidIsin`, `isinCheckDigit`.
- Props that lost their old form (the replacement is required now): `DateRangeCommit`,
  `DateRangePickerProps`, `CancelSubscriptionConfirmProps`, `PlanSwitchConfirmProps`,
  `GrantWarningConfirmProps`, `AccountMenuLanguageProps`, `AccountMenuTextSizeProps`.
- Feedback's `.mutate` form and old composer names: `FeedbackStatusMutate`,
  `FeedbackDetailUpdate`, `useFeedbackStatusUndo`, `FeedbackRowDetailProps`,
  `FeedbackReworkSectionProps`, `FeedbackComposerProps`, `FeedbackComposerHandle`,
  `FeedbackComposerLabels`, `FeedbackComposerSlotContext`; the page links `feedbackPageHref`,
  `feedbackPagePath`, `feedbackPageUrl`.
- Label types that lost keys: `UiKitLabels` (`fieldSync`, `signChip`, `topBar.switchRole`,
  `feedbackDetail.outcome*`), `TopBarLabels` (`switchRole`), `FeedbackDetailLabels`
  (`outcomeAdd`, `outcomeUpdate`, `outcomePlaceholder`). An app's own catalogue that still
  writes one of these keys is refused by the type (an object literal's extra key).
- The names no app read, gone from the entry points (the kit keeps some for its own use):
  `asciiMinusInNumbers`, `heatmapLevel`, `OFFLINE_LOCK`, `splitFileName`,
  `TOAST_ACTION_DURATION`, `TOASTER_OFFSET_TOP`, `TOASTER_OFFSET_BOTTOM`,
  `ROW_ACTIONS_HEAD_CLASS`, `userRosterColumns`, `adminUserStates`,
  `DEFAULT_ADMIN_ATTENTION_HREFS`, `maskMailAddress`, `planColumn`, `planRelation`,
  `checkoutLanded`, `PAY_PAGE_LANG_PARAM`, `resolveAccountAppearance`, `describeUserAgent`,
  `demoCountdown`, `DEMO_WARNING_MINUTES`, `DEMO_MINUTES_ONLY`, `EDGE_MIN_CONTRAST`,
  `CHART_INK_HEX`, `resolveTooltipPlacement`, `STROKE_PATTERNS`, `swipePlanRowActions`,
  `readTableUrlState`, `pickMobileBar`, `splitMobileBar`, `SETTINGS_SEARCH_THRESHOLD`,
  `resolveSettingsLocation`, `SETTINGS_FROM_LIST_STATE`, `SETTINGS_FOCUS_RING`,
  `SETTINGS_FOCUS_MS`, `TOP_BAR_ACTION_ORDER`, `syncState`, `DEV_ORIGINAL_ROLE_KEY`,
  `feedbackAttachmentLine`, `FEEDBACK_UNDO_DURATION`, `FEEDBACK_SWIPE_ACTIONS`,
  `feedbackColumns`, `feedbackSubmitter`, `feedbackSubmitterEmail`, `feedbackEnvironment`,
  `feedbackAttachmentUrls`, `feedbackRowAccess`, `useFeedbackDetailLabels`,
  `feedbackPublicSwitchAllowed`, `SEARCH_TIER_POINTS`, `matchEntries`, `normalizeSearchText`;
  from `@eifi1/ui-kit/sync`, `SYNC_DB_STORES` and `DEFAULT_SYNC_BACKOFF_MS`.

The `--status-synced` / `-pending` / `-edited` / `-error` tokens stay: they are public CSS,
though no kit component reads them since FieldSync left.

**All three apps: nothing to do** once their 0.52 lists are in. A search of each app's 0.52
branch for every removed name, prop and label key found comments only (keksdose main.tsx:148,
admin-page.tsx:1094, cash-buffer-chart.tsx:15, report-range-field.tsx:31; KS's chart comments
on `STROKE_PATTERNS`), and kastlan's and KS's own local `planColumn` variables, which are not
the kit's.

## Types that changed (check:api)

Every root check:api prints is a removal above, under "Every changed name". Two type changes of
this round are not removals and are not printed: Treemap's `redactNames` widened to
`boolean | "tiles"`, and SeriesChart's row type (both under "What each area changes").

## What each area changes

**Treemap** (keksdose #642).

- `shareInValue`: for a `valueFormatter` whose text already says the share ("CHF 412.30 ·
  12%"). A tile's and a group's accessible name then leave their own " (12%)" out, in each
  catalogue's own words and typography. keksdose can drop `reports.treemap_group` (4 locales)
  and its tile override, and pass `shareInValue`. An app's own `labels.tile` / `labels.group`
  is handed the share as `""` there.
- `redactNames="tiles"`: tags the tiles as `true` does and leaves group frames, bands and a
  group's tooltip bubble untagged, for public group names over private tiles (keksdose's
  chains over the shops a user paid). A group's accessible name says its total, so that is
  untagged too; the bubble's value cell stays tagged. `true` is unchanged.
  **Type:** `redactNames` is `boolean | "tiles"` on `TreemapProps` and `TreemapCellProps`.
  Code that reads it into a `boolean` widens its type or compares `=== true`. No app does.

**SeriesChart: the caller's row type.** `SeriesChart` and `StaticSeriesChart` infer the row
type from `rows`, and `onPointClick`'s `hit.row` and a series' `dot`'s `point.row` are that type.
A drilldown reads `hit.row.rawPeriod` without a cast. Without a type argument everything is as
in 0.52:
- `SeriesChartProps` takes any object rows;
- `SeriesChartHit` and `SeriesChartPoint` hand back a `SeriesChartRow`;
- `ComponentProps<typeof SeriesChart>` equals `SeriesChartProps`. KS's wrapper is unchanged.

A wrapper that forwards `SeriesChartProps` gives its callers typed rows only once it is generic
itself (`function LegendedSeriesChart<TRow extends object>(props: SeriesChartProps<TRow> & …)`).
keksdose's `LegendedSeriesChart` is that case; until it changes, its callers see 0.52's types.
Where `rows` has a type that declares keys, four shapes stop compiling:
- reading a key the type lacks;
- passing an interface row to a `SeriesChartRow` parameter;
- casting a row to an unrelated type;
- a handler typed `(hit: { row: SeriesChartRow; … })`.

`<SeriesChart<object> …>` restores 0.52's types. No direct call in the three apps has any of
these shapes.

**Tests.** keksdose's eight `useLongPress` cases, deleted with its copy of the hook, are in the
kit's suite now, the latch reset of keksdose live #153 among them.

## Corrections to adopt-0.52 (fixed in that file)

- feedback-page.tsx:243 (keksdose) is not a date prop to delete: FeedbackRowDetail's
  "Resolved:" date asks for no weekday, and keksdose shows one there. Its `renderDate` stays.
- `compareSortValues` is exported from the root too, not only from `@eifi1/ui-kit/data-table`.
- In PasskeysSetting and PushDevicesSetting the confirm replaces the row's `<li>`: a test
  holding the row from before the press re-queries it after.
- "Name BroadcastChannel keys and database names per test file" is for Vitest's `threads` and
  `vmThreads` pools only. All three apps run `forks` and have nothing to do.
