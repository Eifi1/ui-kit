# Adopting `@eifi1/ui-kit` 0.52

ui-kit 0.52 builds Waves 1–7 of the kit's refactor audit of 2026-10-30 (focus that never
falls to `<body>`, screen-reader semantics, the app flows, consolidation, the public surface,
tooling and docs) and removes `DevSwitchers`, which 0.51 deprecated. This guide lists, per
app, what has to change, then what each area changes, with the places found in keksdose,
kastlan and Kurvenschmiede (KS) on 2026-10-31 (`frontend/src`).

**Legal wording:** none. LegalPage's "Last updated" date now follows an app's date
preference (its words are unchanged).

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

## Removed: `DevSwitchers` (breaking)

| Removed | Use |
|---|---|
| `DevSwitchers`, `DevSwitchersProps` | `DevMenu`, `DevMenuProps` (the same props) |
| label key `topBarParts.dev.switchPlan` (`DevSwitchersLabels.switchPlan`) | `topBarParts.dev.menu` names the one flask |

**All three apps: nothing to do.** None renders `DevSwitchers` or passes `switchPlan`.

## Types that changed (check:api)

**Must change:** `SeriesSource` and `UseTableUrlStateOptions` hold `readonly` arrays now
(`SeriesSource.x` and `.channels`, `UseTableUrlStateOptions.columns`; refactor audit API-7).
Passing a mutable array still compiles; only code that reads one of them back from the kit
and hands it on where a mutable `number[]` / `DataTableColumn[]` is expected must copy it.
No site in the three apps does: kastlan passes `columns` to `useTableUrlState`
(use-server-table.ts:73, users-panel.tsx:136) and Kurvenschmiede passes its sources to
`mergeSeries` (facing-pair.tsx:433); both compile unchanged.

## Must change

- **keksdose**
  - `logOut`: `await releaseThisDevicePush(api.unregisterDevice).catch(() => undefined)`
    before `clear()` (an explicit sign-out releases this device's push, notifications §10.6;
    an expiry does not).
  - Feedback: `useFeedbackStatusUndo(update.mutateAsync)` and `onUpdate={update.mutateAsync}`;
    `FeedbackPublicList` `onOpenChange` → `onOpenIdChange` (all-feedback-page.tsx:118).
  - `PlanSwitchConfirm`, `GrantWarningConfirm`: `onOpenChange` → `onClose`.
  - `AccountMenuTextSize` (account-menu.tsx:68) and `AccountMenuLanguage` (:142): `onPick` →
    `onChange`.
  - report-range-field.tsx:128: `commit="apply"` → `apply`.
  - Tour tests that start a tour and read its card at once: `await screen.findByRole("dialog")`
    (the overlay is its own chunk now): budget-page, transactions-page (:565), tours,
    app-tour-provider, tour-url-sync.
  - app.css: the `@source` pair below.
  (The old forms above keep working until 0.53.)
- **kastlan**
  - Feedback: `.mutateAsync` (pages/feedback-page.tsx:134).
  - `CancelSubscriptionConfirm`, `PlanSwitchConfirm`: `onClose`.
  - `commit="apply"` → `apply`: account-ledger-page.tsx:92, income-statement-page.tsx:53,
    charts-tab.tsx:146.
  - top-bar.tsx:225: `onPick` → `onChange`.
  - Done already on feat/kit-0.51: the `@source` pair (00080ee), the every-tab sign-out
    (154b4d8) that the cross-tab sync engine relies on.
- **Kurvenschmiede**
  - Feedback: `.mutateAsync` (feedback-page.tsx:151); `onOpenIdChange` (all-feedback-page.tsx:125).
  - `PlanSwitchConfirm`: `onClose`. chrome-controls.tsx:26: `onPick` → `onChange`.
  - app.css:15: the `@source` pair.

**The Tailwind `@source` pair** (README §2): the kit's `.d.ts` JSDoc and the source maps'
`sourcesContent` turned comment words into utility rules in every app's stylesheet
(−181 rules, −11 KB raw with the pair; kastlan measured −10.5 KB and 116 unused classes):

```css
@source "../../node_modules/@eifi1/ui-kit/dist";
@source not "../../node_modules/@eifi1/ui-kit/dist/**/*.{map,d.ts}";
```

A `dist/**/*.js` glob alone does not narrow it.

## Deprecated in 0.52, removed in 0.53

| Deprecated | Use |
|---|---|
| `DateRangeCommit` (`DateRangePicker commit="apply" \| "immediate"`) | `apply` |
| `FeedbackStatusMutate`, `FeedbackDetailUpdate` (the `.mutate` callback form) | `mutateAsync` (`FeedbackStatusMutateAsync`, `FeedbackDetailUpdateAsync`) |
| `FeedbackComposerProps` / `Handle` / `Labels` / `SlotContext` | `ChatComposer*` |
| `CancelSubscriptionConfirm` / `PlanSwitchConfirm` / `GrantWarningConfirm` `onOpenChange` | `onClose` |
| `FeedbackPublicList` `onOpenChange` | `onOpenIdChange` |
| `AccountMenuLanguage` / `AccountMenuTextSize` `onPick` | `onChange` |
| `RoleSwitcher`, `SectionNav`, the FieldSync family, `SignChip`, `lib/isin` | none: no app uses them |
| 55 runtime names no app, test or showcase page reads (tuning constants, single-component helpers) | the component that uses them; each tag names it |
| label keys `feedbackDetail.outcomeAdd` / `outcomeUpdate` / `outcomePlaceholder` | none (dead since 0.38) |

All have 0 sites in the three apps except the rows that "Must change" names above.
`deprecations.test.ts` prints the full list.

## What each area changes

**Focus never falls to `<body>`.** Answering a row's danger confirm returns focus to "⋯";
a deleted, filtered-out or approved row hands focus to the row that took its place;
clearing the bulk bar returns it to where it came from; a dismissed banner moves it to the
next control; the pager, the date steppers, Today, MonthPicker's arrows, Lightbox's arrows
and MultiSelect's Select all / Clear stay focusable at their limits (`aria-disabled`); a
phone picker sheet closed without choosing returns focus to its trigger; the Columns
drawer opens with focus inside and closes on Escape. **App tests** that assert
`toBeDisabled()` on those controls switch to `toHaveAttribute("aria-disabled", "true")`.

**Screen readers.** SeriesChart and Treemap are named figures (pass `aria-label`, optionally
`description`); a chart without `onPointClick` has read-only stops; Treemap tiles read
"Groceries: €412.30 (12%)" and a clickable map is one tab stop with arrows. Picker groups are
named `role="group"`s; the typed comboboxes announce their count and "No results". **App
tests** that query `role="application"` in a chart, count tab stops, or look up a tile by its
name alone (`/^Groceries/`) may shift; one that walks a picker's `li`s sees a wrapper per group.

**Look.** Desktop selection boxes are the kit's Checkbox in `--brand` (they were always
indigo); text fields' focus line thickens under More contrast; IconButton's info / success
rings use the tone's colour; switched-off legend labels stay at full ink; SeriesChart's bars
and areas get no per-hue ink edge at Standard contrast (as Treemap since 0.51.6).

**Dates.** Every date a kit component prints follows the provider's `formatDate` (the date
preference) and `timeZone`: legal "Last updated", the billing confirms, admin sentences, the
tour and translation cards, passkeys, push devices, the inbox. keksdose can delete its six
hand-passed date props (passkeys-card.tsx:127, notification-settings-cards.tsx:267,
notification-inbox.tsx:81, tours-page.tsx:88, translations-page.tsx:320, feedback-page.tsx:243)
and its resolver copy (`formatDateTimeFor` → `formatDateTimeWithPreference`). The three date
pickers take the write lock (`commit`, `disabledReason`). Spanish and Hungarian month captions
are right; MonthPicker's rows are 44 px.

**Treemap groups** (keksdose dev #642). A `TreemapNode` with `children` is a group, drawn
as a labelled frame round its tiles; a group's `fill` is its tiles' default, a node's
`shade` mixes the hue into the surface as a measured hex (label ink stays automatic),
`onGroupClick` makes the frames buttons, and `onNodeClick` gets the ancestor group ids as
an optional third argument. The keyboard walks frames and tiles depth-first; a tile reads
"Bakery: 40 (2%), in Groceries". keksdose:
- the matching tab's map can be one group per chain (`fill` = the chain's hue, `children`
  = its shops, `shade` per shop by recency, an "other chains" group in
  `CHART_ROLES.other`), and then delete `lerpHex`, the `bgSurface` lookup, the hex regex
  test and the rank sort with its "no nesting yet" comment; the StaticLegend's chain
  entries become optional;
- CategoryTreemap must pass `children` and `shade` through (its `Node` mapping drops them);
- the all-categories map (dev#533) can nest categories under their groups.
Under `redactNames` whole tiles and the frames' names now blur in demo mode (they carry
names in their accessible labels).

**Search.** Combobox, CountrySelect, the DataTable text filter, TourCatalogue, translation
review and ShareCard match every word of a query in any order. DataTable exports
`compareSortValues(a, b, locale?)`, its own sort order: keksdose's transaction-order.ts can
import it instead of its copy.

**Flows.** Each status change keeps its own Undo; `/join`, `/register?invite=` and the other
one-shot pages in a feedback row show as text with Copy, matched as the router matches them
(decoded, in any case: `/Join`, `/j%6Fin`), `pageLinkExclude` adds routes; an inbox row's url opens only as a
same-origin path; QuietHoursSetting saves on blur or Enter; passkeys are locked under the
demo's write lock. Modal `busy` (0.51.7) is joined by `InlineConfirm` inside the kit.

**Sync (kastlan).** Tabs on one database take turns per round (Web Locks, https or
localhost); `syncNow()` may resolve `paused` while another tab syncs; `forget()` in one tab
stops the others' engines on that copy, and the query copy's `clear()` reaches every tab.
Tests: name BroadcastChannel keys and database names per test file.

**Tour and shell.** The tour overlay loads on the first start (−5.5 KB gzip from every first
load); if that chunk fails to load (a tab left open across a deploy, offline), the tour
ends and logs to the console, and the app stays up; a field step docks below 800 px at Large text; ⌘K is Cmd on a Mac and Ctrl elsewhere,
once per press; the feedback dialog drags from 960 px at Large text.

**New exports.** `releaseThisDevicePush`, `formatDateTimeWithPreference`, `compareSortValues`,
`removeStored`, `readSessionStored`, `writeSessionStored`, `readStoredJson`,
`writeStoredJson`, `prefersReducedMotion`, `useLongPress`, `AMOUNT_TONE_CLASS`,
`DEFAULT_TREEMAP_LABELS`. keksdose can drop its use-long-press copy and import
`AMOUNT_TONE_CLASS` in invoice-line-helpers.test.ts:356-361 instead of reading dist; all three
can drop their storage wrappers, and the unguarded token reads (keksdose api/client.ts:120,
137, 146 and auth-store.ts:102-115; KS shared/api/client.ts:69) become `readStored`.

**Types.** The wizard takes an interface: kastlan drops `extends Record<string, unknown>` from
its 13 wizard data interfaces and the three wrapper constraints (`extends object`). SeriesChart
rows are `readonly object[]` (KS's cast at ackermann-chart.tsx:138 goes). Input array props
are `readonly` (a `[...LIST]` copy can go).

**Docs.** The README inventory names every standalone entry (`/sync`, `/offline`, `/rhf`,
`/dates`, `/testing`, `/table-text`, `/eslint`, the catalogues). adopt-0.32…0.50 moved to
docs/archive/adopt/.
