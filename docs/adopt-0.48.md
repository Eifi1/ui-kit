# Adopting `@eifi1/ui-kit` 0.48 and `eifi1-server-kit` 0.19

ui-kit 0.48 removes what 0.47 deprecated for removal in 0.48 (`TabsLabels.backToFirst`), so a
bump can break a build that still names it; none of the three apps does (checked 2026-10-21,
below). Six changes show on a plain bump (wave B adds two: a list opened inside a `Popover`
no longer closes it, dev #623, and the top-bar menu triggers name themselves in a Tooltip, dev
#610; the fourth is only for an app with a floating launcher: `AppShell` pads `<main>` past it,
dev #612 — keksdose): Tabs' `overflowCue` carets are bare glyphs in fixed
gutters beside the strip instead of framed buttons over it (keksdose live #410 r5–6); a `Disclosure` with no children
draws no body (keksdose dev #603); and the kit's feedback columns fit the table's width (keksdose
live #451): Subject grows and ellipsises, and URL, Email, Resolved leave the table in that order
when it is too narrow, with the Columns panel counting what is drawn ("7/9", "hidden for width").
kastlan's and Kurvenschmiede's feedback inboxes change with no code; keksdose deletes its
`@container/table` interim (the DataTable fit section). New and opt-in for other tables: a
column's `grow` and `fitPriority`; `SettingsGroup.badge` (with `adminSections`' `badges`) and
`DataTable`'s `leadingRowSticky`.

## Removed in 0.48 (deprecated in 0.47)

| Removed | Instead |
| --- | --- |
| `TabsLabels.backToFirst` (`tabs.backToFirst`) | Nothing: ignored since 0.47, when the caret that turned into "back to the first tab" became a ‹ of its own (`tabs.previous`). The key left the seven catalogues in 0.47; an override that still sets it is now a TypeScript error (an excess property in `LabelOverride<TabsLabels>`): delete the line |

| App | Uses of a removed name |
| --- | --- |
| keksdose | None (reports-page.tsx:393 passes `more` and `previous` only) |
| kastlan | None |
| kurvenschmiede | None |

## Tabs' `overflowCue`: bare glyphs in fixed gutters, centred on the labels (keksdose live #410 r5–6)

Marcel, 2026-10-21: "They are only overlayed buttons aren't they? They should be blend in […]
In the same line as the report labels and centered as well with the labels." The ‹ and › are
no longer framed IconButtons laid OVER the first and last visible tab: the ‹ sits before the
strip and the › after it, in flow, each with no border, fill or shadow — `text-muted`,
`text-primary` on hover — vertically centred on the labels above the 2px underline, and the
strip's rule carries on beneath them. Each is still there only while tabs lie past ITS edge,
steps three quarters of the width toward its own side, never turns round, and
follows the reading direction (‹ on the right in RTL). Still out of the tab order (`tabIndex
-1`) and named (`tabs.previous` / `tabs.more`): the keyboard walks the strip with the arrow
keys, which bring the focused tab into view, so a second stop per caret would only lengthen
Tab's path to the panel; a pointer or a screen reader's virtual cursor still reaches them.

Round 6 (Marcel, 2026-10-21: "Now they are not inline with the labels. It has problems with
moving to left and right especially when moving the scroll bar"): with each cue in the flow,
the strip gave up or regained 1.5rem whenever a cue came or went, so the labels jumped sideways
at every edge the scroll crossed and the scroll position shifted under the thumb. Now, while
the strip overflows at all, its box keeps a 24px gutter at BOTH ends (`px-[24px]`), and each cue
sits absolute in its own (`[data-tabs-cue-gutter]`, `start-0` / `end-0`), with the rule beneath
it and lifted onto the labels' centre by the underline's height (`border-b` + `pb-px` = the
tab's 2px `border-b-2` over the strip's 1px rule). A strip that fits has no gutters, so its
width changes only when it starts or stops overflowing, never while scrolling. Measured in
headless Chromium (showcase, Tabs — overflowCue, Large text): at 406px the tablist stays at
71–335 (264px) at start, middle and end, LTR and RTL; at 360px 71–289 (218px); padding 30px/30px
throughout; ‹ at 43.5–68.5, › at 337.5–362.5 (406px) / 291.5–316.5 (360px), mirrored in RTL;
glyph and label centres equal (0.0px apart); no glyph over a label; axe: nothing on the strip.

Same prop, no code change. › only at the start, ‹ › in the middle, ‹ only at the end; border 0,
background transparent, shadow none.
Each gutter and cue is 24 PIXELS wide at every text size, with the 48px touch target from
Large up as an invisible hit area over the strip's faded edge (`HIT_AREA_LARGE`, the `::after`),
not as row width (Kurvenschmiede N3). Not 1.5rem: the rem grows with the text size (24/30/36px),
and at Extra large on a 360px phone the two 36px gutters left Kurvenschmiede's sheet strip 154 of
226px, so a sheet tab wrapped to 7 lines (build review 2, KS N1). Measured in headless Chromium
(showcase, Tabs — overflowCue, 360px): gutters 24/24px at Normal, Large and Extra large; the
tablist at x 57 / 65 / 73, width 246 / 230 / 214px of a 294 / 278 / 262px box, the same at the
start, middle and end of the scroll (no jumps); glyph centre to label centre 0 / 0.5 / 0px; hit
area 48×48px from Large up.

| App | Change |
| --- | --- |
| keksdose | The interim goes (as of 62540c4c): frontend/src/features/reports/reports-page.tsx — delete `INLINE_CUES` (:84-102, its comment and the array) and `className={INLINE_CUES}` (:406); shorten the round-5 and round-6 paragraphs of the comment above the `Tabs` (:392-403) to "since ui-kit 0.48 the kit draws them so, in fixed gutters". Left in, its `-mt-px` would lift the kit's glyph 1px off the labels' centre (the kit already allows for the underline) |
| kastlan | Nothing: no `overflowCue` |
| kurvenschmiede | Nothing to change: gear/sheet-tabs.tsx:80 passes `overflowCue` and gets the bare glyphs on the bump; its comment (:76-79) still reads true |

## A badge on a settings or admin section's row (keksdose live #450)

`SettingsGroup.badge?: ReactNode` is drawn on the group's ROW: at the end of its desktop
sidebar row (the vertical Tabs' `badge`) and before the chevron of its phone drill-down row —
never on the heading over its cards. While the page is searched, the sidebar shows the hit
count in its place. It sits inside the row's link and is read with its name, so it has to say
what the number is: `AdminWaitingBadge` does ("3, 3 waiting") and draws nothing for 0. For a
shared admin section, `adminSections(labels, own, { badges: { overview: <AdminWaitingBadge
count={n} /> } })`; an app's own section carries `badge` itself (it passes through).

| App | Change |
| --- | --- |
| keksdose | frontend/src/features/admin/admin-page.tsx, the `groups` memo (`const groups = useMemo(…)`, with the #450 help-line code; lines drift): keep the help lines — they say what the number is, which the badge does not — AND add the counts to the rows: `overview` gets `badge: <AdminWaitingBadge count={verdict + feedback} />`, `messaging` gets `badge: <AdminWaitingBadge count={support} />`, so the rows add up to the account menu's badge (the sum of ADMIN_WAITING_COUNTS, use-admin-attention.ts:9). Drop "the kit's section row has no badge slot yet" from the comment above the memo. `AdminWaitingBadge` is in the barrel since 0.45 |
| kastlan | Optional: the Overview row takes `<AdminWaitingBadge>` with the `ADMIN_BADGE_COUNTS` sum (frontend/src/features/settings/admin-catalogue.tsx:48, passed from features/settings/pages/admin-page.tsx:29); nothing changes on a bump. Pass it in as an option rather than reading the attention query inside `useAdminCatalogue`, which also feeds the global search (app-global-search.tsx:29) |
| kurvenschmiede | Optional: `badges: { overview: <AdminWaitingBadge count={waiting} /> }` with the account menu's sum (`feedback_waiting` + `deletion_requests`, account-menu.tsx:142), passed into `useAdminSections` from frontend/src/features/admin/admin-page.tsx:52 rather than read inside the hook, which also feeds the top bar's search (top-bar-parts.tsx:45); nothing changes on a bump |

## `DataTable`'s `leadingRowSticky`; a `Disclosure` with no children draws no body (keksdose dev #603)

- **`leadingRowSticky`** pins the `leadingRow` under the sticky header while the rows scroll
  beneath both: the cell is `sticky`, opaque (`bg-surface`), `z-[5]` (under the header's
  `z-10`), and its `top` is the header's measured height, followed by a ResizeObserver (a
  header that wraps at Large text). Desktop only, as `leadingRow` is; it sticks within the
  table's own scroller, so the body must be bounded (`fillHeight` or `maxBodyHeight`). Its top
  line is the cell's own `::before`, which moves with it. Default off: the row scrolls with the
  rows as before. Checked in headless Chromium (showcase, DataTable — the whole surface, 1280px):
  the header 416–452, the leading cell 452–480.5 before and after scrolling the body 144px,
  `top: 36px`, and the leading row is what lies at its own middle (no row painted over it).
- **`Disclosure` with no children** (null, false, nothing, or an empty fragment such as
  `cond ? <X /> : <></>`) renders no body and no
  `aria-controls`: an open one was 8px taller than a shut one (the body's `pt-2`), and named a
  region with nothing in it. Trigger-only (`controls`) is unchanged and is still the way to say
  WHAT it folds.

| App | Change |
| --- | --- |
| keksdose | frontend/src/features/transactions/transactions-page.tsx, `TransactionsPage`'s register `<DataTable<Transaction> fillHeight … leadingRow={…}>` (symbols, not lines: the register moves daily): add `leadingRowSticky` beside `leadingRow`, so the desktop's upcoming toggle stays reachable as the phone's does in the pinned search bar since #603. The phone toggle (the trigger-only `Disclosure` in the pinned search bar) keeps `controls`; its comment's "without it the kit drew an empty body under the header while open, 8px taller than closed" is history now — a child-less Disclosure draws none. accounts-page.tsx's `DataTable` with `fillHeight` and `leadingRow` may take `leadingRowSticky` too |
| kastlan | Nothing: its `leadingRow` (features/meters/pages/meters-page.tsx:48, through resource-list-page.tsx:240) is the inline create editor, which should scroll with the rows — leave it unsticky. No `Disclosure` |
| kurvenschmiede | Nothing |

## `DataTable` fits its own width: `grow` and `fitPriority` (keksdose live #451)

Marcel, on keksdose's inbox at 1545px: "On expanded sidebar for desktop the table scrolls
horizontally. On collapsed sidebar it fits […] Compute the width selectively." Two new column
options, both opt-in — a table that sets neither is unchanged on a bump:

- **`grow: true`** — the column takes the width the others leave and its text ellipsises
  (`w-full max-w-0` on its `<th>`/`<td>`/footer cell, `truncate-until-large` on the cell: one
  line at Normal, a wrap from Large up). One long title can no longer widen the table. One per
  table. It has no resize handle, and a width stored for it is ignored: it always takes the
  rest (resize the others to change it). So an inbox whose Subject width was stored on 0.47
  (a drag or "Auto-size columns", e.g. Kurvenschmiede's `steering-table:feedback`) grows on
  the bump with nothing to clear; the stale entry leaves storage with the next resize.
  It keeps at least 10rem (`min-w-[10rem]` on its header): once no `fitPriority` column is left
  to leave out, the table scrolls sideways rather than crushing it. Every other cell of the
  table keeps one line at Normal text size (`not-large:whitespace-nowrap`), so "CHF 2'568.38", a name or a date with its time no longer breaks in two
  beside a `grow` column (kastlan S2), the fit measures the columns at that one-line width, and
  Large text wraps as before; a column whose prose should wrap passes
  `not-large:whitespace-normal` in its `className`, and an app's own `truncate-until-large`
  classes added for this can go (kastlan N1). A cell's own row of chips (the user roster's states
  and roles) still wraps: held to one line it widened the roster's Status until kastlan's
  583px admin pane scrolled 21px at 1280px (build review 2, kastlan S1). The kit's feedback User
  column is at most 12rem, one line and an ellipsis with the full value in its `title`, so an
  email standing in for a missing name no longer costs Votes and Category their room (keksdose N2).
- **`fitPriority: n`** — while the TABLE's scroller is narrower than the table needs (with a
  `grow` column: the others plus 10rem for it), the table leaves the column out; lowest `n`
  first, the later column first on a tie, and back in reverse as soon as the table as it is
  NOW has room for it (its need re-measured, plus the column's own width when it left), so
  narrower content (a filter, another page) brings a column back as a wider scroller does. Measured by a ResizeObserver on the table's own scroller and after
  every render, before paint — so the sidebar, the window, Large text and the open Columns
  drawer all count alike. Desktop only: the phone's card list is not narrowed.
- **The Columns panel counts what is drawn** ("Columns (8/10)"), and a column left out for width
  is unticked with "hidden for width" under its name (new key `dataTable.hiddenForWidth`, in
  the seven catalogues). **User choices:** ticking a column keeps it in whatever the width, for
  as long as the table is mounted (not persisted — the next visit fits again); the table then
  makes room by leaving out the next candidate, and scrolls sideways once none is left.
  Unticking hides it as any column (persisted as before) and drops the keep. A column the user
  hid is never "hidden for width".

**Not opt-in for the kit's feedback columns** (`feedbackColumns` / `useFeedbackColumns`): they
adopt it, so every app's inbox changes on the bump — Subject `grow`s, and a narrow table leaves
out URL (`fitPriority: 1`), then Email (2), then Resolved (3); the open report repeats all three.
Then Votes (4) and Category (5), before Subject would drop below its 10rem (Kurvenschmiede S1).
For the 0.47 layout: `columns.map((c) => ({ ...c, grow: undefined, fitPriority: undefined }))`.

Checked in headless Chromium (showcase, Feedback inbox — the 0.27 table, nine columns, a 146-char
crash subject, window 1545px): the table root at 1362px draws 8/9 (URL out), at 1178px 7/9 (URL
and Email out), at 900px 6/9 (Resolved too); at each, scroller `scrollWidth == clientWidth` (no
sideways scroll), the last column ends inside the scroller, the subject ellipsises (cell 303 /
275 / 118px), rows stay one line (45px). With the drawer open at 1178px: 6/9, and Email, URL and
Resolved unticked with "hidden for width". axe: nothing on the table or the drawer.
At Large and Extra large (build review 2, kastlan N2; showcase Feedback inbox, the first table,
sidebar open): Large 1440px fits (Subject 235px, Category out); Large 1280px 791px of room, Subject at its
200px floor, scrolls 125px; Extra large 1440 / 1280px 863 / 703px of room, Subject 240px (its
floor), scrolls 236 / 396px. Every candidate is out by then: the rest (#, Date, Subject, User,
Status, actions) grow with the text and the table scrolls sideways as designed; the page never does.

| App | Change |
| --- | --- |
| keksdose | The interim goes, in the same commit as the bump: frontend/src/features/feedback/feedback-page.tsx — delete `FIT_COLUMNS` and `fitFeedbackColumns` with their comment, use `kitColumns` as `columns` (drop that `useMemo`), drop `className="@container/table"` with its comment, and drop the two imports the interim added (`type DataTableColumn` from data-table, `cn` from ui — lint fails on them otherwise). Keep both and the CSS `hidden` would make the kit measure a URL column of 0px and leave out the next candidate for nothing |
| kastlan | Nothing to write: frontend/src/features/feedback/pages/feedback-page.tsx:139 takes `useFeedbackColumns`, so its inbox fits on the bump (no Votes column: 9 columns). The 8 `truncate-until-large(-words)` classes the `grow` adoption on `feat/kit-0.48` added (lease rent columns, phone, journal debit/credit, unit building, request reporter, estate name) can go: the kit keeps those cells one line at Normal (N1). The user roster (users-panel.tsx) needs nothing: its chips stack again |
| kurvenschmiede | Nothing to write: frontend/src/features/feedback/feedback-page.tsx:154 takes `useFeedbackColumns` (`votes: publicReader`), so its inbox fits on the bump |

## keksdose UX wave A (dev #611, #612, #613)

Four asks from keksdose's UX brief of 2026-10-21, each built there as an interim on
`feat/feedback-loop-81-410-449`. One shows on a plain bump; the rest are opt-in.

- **The shell pads `<main>` past the floating launchers (dev #612, shows on a plain bump for an
  app with one).** Below `md` the bottom room was the nav plus 1.5rem, so the last row of a page
  ended under a `FloatingPanel`'s button or a `FloatingActionGroup`. Every kit launcher
  (`FloatingActionButton`, so `FloatingPanel`'s too, and `FloatingActionGroup`) now publishes the
  room it takes above the nav while it is mounted, as `--app-float-clearance` on `<html>`:
  `offset` + 3rem + a 0.5rem gap (+2px for the group's frame); with several the largest wins
  (`max(…)`), and unmounting gives it back. `<main>` pads
  `calc(var(--app-nav-h) + max(1.5rem, var(--app-float-clearance, 0px)))`; from `md` up it is
  `pb-0` as before. A `hidden` launcher keeps its room, so the page does not change length as it
  hides and shows; `FloatingPanel` takes `hidden` (new) to step aside without unmounting: the FAB
  and the panel leave the screen, the open state and the room stay. An app that hand-placed a
  floating control with its own `fixed` classes is not counted; it can publish its room by
  setting the variable itself.
- **`data-tour-overlay` on the tour overlay's root (dev #611/#612).** On every step, interactive
  or not, so an app that hides something while a modal is open can except the tour:
  `[aria-modal="true"]:not([data-tour-overlay])`.
- **`AlertBanner clampMobile` (dev #611).** Below `md` (the text-size-aware one) the message
  keeps to one line, with a More / Less toggle after it (`aria-expanded`, `aria-controls` the
  message; `common.showMore` / `common.showLess`, new in the seven catalogues). It shows only
  while the line cuts the message off. From `md` up nothing changes. Ignored on a whole-row
  banner (`href` / `onClick`). `EmailVerificationBanner` takes `clampMobile` too (kastlan S2): it
  passes it through and moves the resend's outcome ("Sent", the error) out of the message to sit
  after "Send again", at every width, so it is never hidden behind "More".
  **Testing it:** the toggle shows unless the line is measured to hold the message, and jsdom
  lays nothing out (`clientHeight` is 0), so in a jsdom test "More" ALWAYS renders. Assert the
  toggle and the `max-md:line-clamp-1` on the message (`aria-controls`) there; "no More when it
  fits" needs a real browser (Playwright), or stub `clientHeight` / `scrollHeight` on the
  message's element.
- **`AppShellNavItem.shortLabelFrom` (dev #613).** `"large"` or `"xlarge"`: the phone bar uses
  `shortLabel` only from that text size up, and the full label below it. Default `"normal"`:
  the short label at every size, as before.

Checked in headless Chromium at 390px (showcase build, `vite preview`). R8, Floating actions with
the group shown: `--app-float-clearance` = `calc(1rem + 3.5rem + 2px)`, `<main>`'s bottom padding
169px against 119px with no launcher (nav 95px + 1.5rem), and scrolled to the end the page's last
content ends at y=634, above the group's top edge at y=683; unticked, the variable is gone and the
padding is 119px again. R10, Feedback's `clampMobile` strip: one 20px line with "More"
(`aria-expanded="false"`), 140px of text with "Less" once pressed, no sideways scroll; at 1280px
the toggle is not displayed and the text is unclamped. axe: nothing on the strip or the group.

| App | Change |
| --- | --- |
| keksdose | **R8:** delete the rule and its comment in frontend/src/app.css:167-178; in frontend/src/features/assistant/assistant-launcher.tsx delete the clearance effect (:150-163) and the docblock's last sentences about it (:103-107), and instead of `if (!shown \|\| covered) return null` (:189) render `if (!shown) return null` with `hidden={covered}` on the `FloatingPanel`, so the room stays while an editor or a dialog covers the corner (the reason :150-152 gives). **R9:** frontend/src/features/assistant/assistant-launcher.tsx:39 becomes `'[aria-modal="true"]:not([data-tour-overlay])'`, and :27-30 of the comment say so. **R10:** frontend/src/app/beta-perf-banner.tsx:87-104 become `<AlertBanner tone="neutral" variant="strip" icon={<Server />} onDismiss={dismiss} clampMobile>{t("beta.perf_notice")}</AlertBanner>`; drop the `expanded` state (:64) and `Button` from the import (:4), the comment's last sentence (:84), and `beta.perf_more` / `beta.perf_less` in the locale JSONs (:87-88 each); its test (frontend/src/app/__tests__/beta-perf-banner.test.tsx:59-67) names the toggle "More" / "Less" (the kit's words). **R11:** frontend/src/app/layout.tsx:59 becomes `shortLabel: item.shortLabelKey ? t(item.shortLabelKey) : undefined, shortLabelFrom: "large",`, and `useTextSize` (:43, and its import on :4) goes |
| kastlan | Nothing to write, and nothing changes: no `FloatingActionButton`, `FloatingPanel` or `FloatingActionGroup` in frontend/src (checked on `feat/kit-0.48`), so `--app-float-clearance` is never set and `<main>` keeps nav + 1.5rem. Optional (S2): `clampMobile` on the `EmailVerificationBanner` in frontend/src/features/auth/components/verify-email-banner.tsx:18-22 (`VerifyEmailBanner`), the ~110px banner on a 390px phone (prod feedback #22, KX-5); the resend's "Sent" / error then shows after "Send again" |
| kurvenschmiede | Nothing to write, and nothing changes: no floating launcher in frontend/src (checked on `feat/dynamics`). frontend/src/app/layout.tsx:45 passes `shortLabel` at every size, which stays the default. Optional: `clampMobile` on the deletion-requests strip (frontend/src/features/admin/deletion-requests.tsx:44-58, `DeletionRequestsBanner`'s `AlertBanner`); nothing changes on a bump |

## keksdose UX wave B (dev #610, #617, #623, #628)

Opt-in, nothing changes on a plain bump — except the last two items (R12, R13), which show on a
plain bump and need nothing written.

- **`DataTableColumn.defaultHidden` (dev #617).** The column starts hidden while the view saved
  under `storageKey` holds no entry for it: a first visit, a saved view from before the column or
  the flag, a column added later. The user's tick in the Columns panel wins and is remembered
  (`shown` in the saved view, written only when non-empty); unticking stores it as any hidden
  column. The default is never written into the saved view, so dropping the flag brings the
  column back wherever nobody chose. In the panel it is unticked, not "hidden for width"
  (that stays `fitPriority`'s). Ignored, like every hidden column, with `columnSettings={false}`.
- **`TableSkeleton` (dev #628, new export).** A table/list outline while data loads: `rows` ×
  `columns` (a name bar, the figures at the row's end; from three columns up they go under the
  name below `sm`), `variant="grid"` (a label column and one block per column, clipped: a
  heatmap), `groups` (header bars over `rows` rows each), `tiles` (stat-tile outlines above),
  `heading` (title + hint lines), `framed` (default `true`). ONE `role="status"` region with
  `common.loading` ("Loading…", seven catalogues already) or `label`; every bar `aria-hidden`; no
  pulse under reduced motion. Props and `ref` go to the region.
- **`AlertBanner actionPlacement="flow"` (dev #623).** Below `sm` a box's `action` stays on the
  message's line while glyph + message keep 10rem, else it goes to the END of the next line;
  default `"own-line"` (its own line under the message, as before). The × stays at the top end;
  `clampMobile` works alongside; works on whole-row (`onClick` / `href`) banners. The basis is in
  rem, so at Large the action drops a line sooner by itself. Ignored by `strip` and `inline`.
- **A list opened inside a popover is inside it (dev #623, fix, plain bump).** A press on a
  portalled panel opened from inside a `Popover` — a `CurrencySelect`'s or a combobox's list,
  a `DropdownPanel`, another popover, at any depth — no longer counts as outside: the popover
  stays open and the choice lands. Same for `HoverMenu`, `useDropdown` and the combobox core.
  The kit's panels pass every press on through the React tree, where a portal still sits inside
  its opener. `useOutsideClick` now returns an `onPointerDownCapture` for an app's own owner
  element (ignore it and nothing changes).
- **Top-bar triggers name themselves in the kit's Tooltip (dev #610, plain bump).**
  `TopBarActionMenu` (the feedback menu, the avatar menu, the tours menu, every icon trigger
  built on it), `OptionSwitcherMenu` and `ThemeToggle` show their `aria-label` on hover and
  focus. The bubble is visual only (in a fragment, as on `IconButton`): it is not the trigger's
  `aria-describedby`, so a screen reader hears the name once. `OptionSwitcherMenu`'s and
  `ThemeToggle`'s `title` default to the name; a different `title` still describes the trigger.

Checked in headless Chromium at 390px (showcase build, `vite preview`, Feedback page). The flow
banner: "Assign" on the message's line (centres within 12px), the banner 52px tall; narrowed to
230px the button drops to the next line and ends at the row's end (right 250 = row right 250).
`TableSkeleton`: three demos, three status regions each "Loading…"; four-column rows put the
figures under the name; `animation-name` `pulse`, and `none` under reduced motion; no sideways
scroll (scrollWidth 390). At 1280px the figures sit at the row's end. axe: nothing on either.
R12, Popovers page at 1280px with a real mouse click: the `CurrencySelect` list in the pencil
popover is portalled outside its panel; clicking USD keeps the popover open and names the field
"Currency: USD"; a click on the page then closes it. R13: every top-bar menu trigger shows its
bubble on hover and focus, with no `title` and no self-describing `aria-describedby`.

| App | Change |
| --- | --- |
| keksdose | **R14:** frontend/src/features/transactions/use-transaction-columns.tsx:410 the `flag` column gains `defaultHidden: true`; delete frontend/src/features/transactions/register-default-columns.ts and its test (\_\_tests\_\_/register-default-columns.test.ts), and in transactions-page.tsx the import (:61) and `useState(seedRegisterHiddenColumns)` (:96). The `#seeded-hidden` marker key can stay or be cleared; it is no longer read. A device where someone re-showed Flag after the seed hides it once more (the old view has no `shown`). **R15:** frontend/src/features/budget/budget-skeleton.tsx becomes `<TableSkeleton groups={2} rows={4} columns={4} label={label} aria-busy="true" data-testid="budget-skeleton" />` (or drop the file and use it at budget-page.tsx:420); frontend/src/features/reports/tab-parts.tsx:37-69 `TabSkeleton` becomes `<TableSkeleton heading rows={6} columns={2} />` for `list`, `tiles={3} heading` for `tiles` (the `chart` shape keeps a `Skeleton shape="block"`), and :95-118 `VarianceHeatmapSkeleton` becomes `<TableSkeleton variant="grid" heading rows={rows} columns={cols + 1} />` |
| keksdose | **R16:** frontend/src/features/budget/budget-summary-card.tsx:455-474 the banner takes `actionPlacement={large ? "own-line" : "flow"}` and its `className` keeps only `"sm:items-center"`: the `max-sm:[&>button]:…` / `[&>div]:…` overrides (:472-473) go, and the comment at :460-467 says the kit does it |
| keksdose | **R12:** frontend/src/features/budget/budget-summary-card.tsx:172-188 the interim native `Select` for "Show in" can go back to the `CurrencySelect` #308 asked for (`value`, `onChange={onChangeDisplayCurrency}`, `options={currencyOptions}`), and the comment at :172-176 goes. **R13:** nothing to write; the feedback, avatar and tours triggers show their names |
| kastlan | Nothing to write. R12 and R13 show on a plain bump (the top-bar menus gain their tooltip); the rest are opt-in |
| kurvenschmiede | Nothing to write. R12 and R13 show on a plain bump (the top-bar menus gain their tooltip); the rest are opt-in |

## server-kit 0.19

Install the wheel by URL, pinned by hash (the release fills in the line):

```
eifi1-server-kit @ https://github.com/Eifi1/server-kit/releases/download/v0.19.0/eifi1_server_kit-0.19.0-py3-none-any.whl
sha256: 77762c1877407bee4810ac9d526d1911d60133f34293c1d0b99fb87bf22e6259
```

- **`check_comment_store(…, attachment_url=)` is required, and must be one of `policy=`'s URLs (BREAKING for a
  caller that left it out; keksdose N3).** 0.18 defaulted it to a made-up `"{prefix}check….png"`, which tested no
  upload and was not even a key the app's routes accept under a SHA-12 policy. Now a call without it is a
  `TypeError`, and a URL outside `policy` (e.g. a forgotten `policy=`) fails with
  `attachment_url: one of policy's URLs`. `check_reply_store` is unchanged (its file stays optional).
- **What the check asserts after the erasure's `apply`** (KS note): only that the comment's `attachment_url` reads
  back `None`. A store may delete the file row there or keep it as an unattached upload; the app's test asserts
  which (documented in the docstring).
- **Dependencies:** no `pyproject.toml` floor changed. server-kit's lock took fastapi 0.157.0, pydantic 2.14.1
  (pydantic-core 2.50.1), pydantic-settings 2.16.1, ruff 0.17.1, starlette 1.9.0; the full check is green on them.

| App | Calls `check_comment_store` | What changes |
| --- | --- | --- |
| keksdose | `backend/tests/api/test_feedback_public.py:79-88`, with `policy=FEEDBACK_ATTACHMENTS` and `attachment_url="/api/v1/feedback/attachments/0123456789ab.png"` | Nothing. The URL fits `SHA12_KEY_PATTERN`, so the new policy assert passes. |
| Kurvenschmiede | `backend/tests/api/test_feedback_ports.py:143-151`, with `policy=ATTACHMENT_URLS` and the author's real upload | Nothing. Its assert that the file row is gone (`:152-154`) stays the app's own; the docstring now says so. |
| kastlan | No call (no public comments) | Nothing. |
