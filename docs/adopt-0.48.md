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

## keksdose dev #605: period groups and load more

Opt-in, nothing changes on a plain bump. keksdose docs/transactions-by-period.md §6 (Marcel
accepted it, 2026-10-21).

- **`groupBy`** (new type `DataTableGroupBy<T>`: `key`, `label?`, `end?`) takes one level or a
  pair, `[period, day]`. Each group opens its own `<tbody>` headed by a band row: one
  `<th scope="rowgroup">` spanning the visible columns (selection column included; hidden and
  `fitPriority`-hidden columns not), the label at the start and the `end` slot at the visible
  end (pinned to the scroller's width like the expansion panel). Grouping runs over the rows on
  screen, consecutive runs of equal keys, so the rows must arrive in that order (the date sort).
  `end(key, rows)` gets the group's loaded rows; a total over a period not fully loaded is the
  app's own figure, looked up by `key`. The `leadingRow` keeps its place above the first group.
- **Sticky, stacked:** the period band sticks under the header (and under a sticky
  `leadingRow`), `z-[4]`; the day band under the period, `z-[3]`; offsets measured and followed
  (Large text, a wrapping end slot). A new period scrolling up covers the day still pinned above
  it. Works wherever the body is the scroller: `fillHeight` or `maxBodyHeight`.
- **Keyboard and screen reader:** the bands are row headers, announced as the reader enters a
  group; they are not tab stops. The rows' Arrow/Home/End roving now runs across every `<tbody>`.
- **`mobileGroupBy`** also takes a level: `mobileGroupBy={period}` gives the phone's sections the
  same label and end slot. One level only on the phone (its sticky section header).
- **`loadMore`** (new type `DataTableLoadMore`: `hasMore`, `onLoadMore`, `loading?`, `label?`,
  `endLabel?`, `auto?`): the table renders every row it is given and draws a footer in place of
  the pager, in the scroller after the last row (on a phone, the card list's last item). As it
  nears the view (an IntersectionObserver, 200px ahead) it calls `onLoadMore` once per row count,
  never while `loading`, and asks again only when a fresh observation finds it still in view
  after the rows arrived (a short slice). The button stays for the keyboard, named by the app
  (default `dataTable.loadMore`, "Load more"); while `loading` it says "Loading…", stays
  focusable and ignores presses; at the end `endLabel` (default `dataTable.allLoaded`, "All rows
  loaded"; `null` for nothing), which takes the focus if the button had it. With
  `serverPagination` it replaces that pager too. Pass `paginated={false}` beside it on a client
  table, to say so. New keys `dataTable.loadMore` / `dataTable.allLoaded`, seven catalogues.
  **From 0.48.1 `loadMore` implies `serverRows`:** the rows are rendered in the order given and
  never filtered or sorted on the client; `serverRows={false}` keeps a client table's own filter
  and sort (see "ui-kit 0.48.1" below). In 0.48.0 a table without `serverPagination` filtered and
  sorted the loaded rows itself, which dropped server rows (keksdose K-052-1).

Checked in headless Chromium (showcase build, `vite preview`, Data table → "Period groups and
load more", 218 rows over three months, `fillHeight`, sticky leading row on), at 1280 and 1545
with the sidebar: header 36px, leading row to 64, the period band stuck at `top: 64px`, the day
bands at `100px` (period over day at y 75, day at y 100 by hit test); a new month's band slid
over the pinned day band (screenshot); every end slot's right edge equal (1155 / 1420, the
scroller's 1182 / 1447 less its padding and gutter); scrolled to the end the footer said
"Loading…" and loaded August once (1 load, 147 rows; the first build loaded twice — the stale
"in view" — fixed and pinned by a test); Tab reached "Load July 2026", Enter loaded it (218 rows)
and focus moved to "No older transactions"; no sideways scroll on the page or the scroller.

| App | Change |
| --- | --- |
| keksdose | frontend/src/features/transactions/transactions-page.tsx, the register's `<DataTable<Transaction> fillHeight … serverPagination={…}>` (symbols, not lines): under the date sort pass `groupBy={[period, day]}` (period: `key: tx => tx.booking_date.slice(0, 7)` or the week key of §3.3, `label` the month name, `end` the §5 period figures "count · in · out" by key; day: `key: tx => tx.booking_date`, `label` the phone list's `formatGroupLabel`, `end` "2 transactions") and `loadMore={{ hasMore: !!next_cursor, loading: txns.isFetching, onLoadMore, label: t("…load", { period }) /* "Load August 2026" / "Load more of September 2026" from next_booking_date */ }}`; under any other sort pass neither and keep `serverPagination`'s pager (§3.1). `leadingRowSticky` (dev #603) stacks above the bands. The interim "bands as `rowAttributes`-styled rows" (§6) is not needed. Phone: mobile-transaction-list.tsx keeps its own cards, day bands (`SectionLabel variant="band"`, sticky) and sentinel (:119-133, :251-257) — the kit's `mobileGroupBy` is one level and keksdose's phone list is not a DataTable; its new period band (§3.2) stays app code, the sentinel can move to the cursor as is. accounts-page.tsx:803 (`mobileGroupBy={(a) => a.type}`) and feedback-page.tsx:335 keep their function form |
| kastlan | Nothing, unless a list wants groups or load more |
| kurvenschmiede | Nothing, unless a list wants groups or load more |

## ui-kit 0.48.1: `DataTable`'s `serverRows`; `loadMore` implies it (keksdose K-052-1)

A patch, nothing breaking for an app that pages on the server or on the client.

- **`serverRows?: boolean`** says "these rows are already filtered and sorted by the server:
  render them as given". No client filter, no client sort, no client paging (every row shows, as
  with `paginated={false}`; no pager). The filter and sort UI work as under `serverPagination`:
  hidden unless the owner passes `onFiltersChange` / `onSortsChange`, and then a header click or a
  filter only reports the next state to that callback; the rows keep their order until the owner
  re-queries and passes new ones. `serverPagination` implies it (unchanged, and
  `serverRows={false}` does not undo it).
- **`loadMore` implies `serverRows`** unless the app passes `serverRows={false}` — a client table
  that loads more chunks but filters and sorts what it holds itself. In 0.48.0 a `loadMore` table
  without `serverPagination` filtered and sorted the loaded rows on the client, which dropped or
  reordered server rows (keksdose's transfer-merge test lost the other leg of each transfer).
- The one behaviour change to check: a `loadMore` table whose columns have `sortBy` / filters but
  no `onSortsChange` / `onFiltersChange` loses those controls (nobody would act on them). Pass the
  callbacks, or `serverRows={false}` to keep client-side sorting. None of the three apps has one
  (kastlan and kurvenschmiede use no `loadMore`; the showcase's ledger has no sortable columns).

| App | Change |
| --- | --- |
| keksdose | frontend/src/features/transactions/transactions-page.tsx, the register's `<DataTable<Transaction> … serverPagination={…}>` (symbols, not lines; :1113-1135 at f8b4f0f2): drop the dummy `serverPagination` under the date sort (the `desktopGroups.loadMore ? { page: 0, pageSize: Math.max(1, rows.length), total: rows.length, onPageChange: () => {}, onPageSizeChange: () => {} }` branch) — pass `serverPagination={desktopGroups.loadMore ? undefined : { page: txnPage, … }}` and delete the comment above it. `loadMore` alone now renders the rows as given; `filters`/`onFiltersChange` and `sorts`/`onSortsChange` keep reporting to the app as before. The transfer-merge test stays as the pin |
| kastlan | Nothing |
| kurvenschmiede | Nothing |

## ui-kit 0.48.2: `DataTable`'s `virtualize` (keksdose dev #632)

Opt-in, nothing changes on a plain bump. Marcel (dev #632): "The table is extremely slow. Is it
virtualised or is everytime the whole table rendered?" — 0.48.2 answers both halves: a tick
re-renders only the rows it touches (the memoised rows), and `virtualize` renders only the rows
near the view.

- **`virtualize?: boolean | DataTableVirtualize`** (new type: `overscan?` rows beyond each edge,
  default 12; `estimateRowHeight?` px before a row is measured, default 37, compact 29). The
  desktop table renders the rows in the visible part of its scroller plus the overscan; spacer
  rows (`aria-hidden`) stand in for the rest inside each group's own `<tbody>`, so the sticky,
  stacked group bands behave as on a full table (a run of groups with nothing in view is one
  spacer `<tbody>`; the period the view starts in keeps its band). The scroller is the bounded
  body (`fillHeight`, `maxBodyHeight`) **or the page** (`maxBodyHeight="none"`): the window is
  what both show.
- **Always rendered:** the header, `leadingRow`, the bands of every group with a rendered row,
  every OPEN row (`isExpanded` — an inline editor in `expandedRow` keeps its state while the rows
  scroll), the roving tab stop and a row holding the focus. The `loadMore` footer follows the
  last spacer and loads once per row count, as before.
- **Heights:** each rendered row is measured (in the next animation frame, where the browser lays
  the table out anyway) and remembered by its key; an unseen row counts as the measured average.
  The scroll height settles as rows are seen; the browser's scroll anchoring holds the rows in
  view meanwhile (Safari has none: a first-pass jump of the estimate's error is possible there).
- **Columns hold still:** the header widths are measured once and locked (a `<colgroup>` and the
  header cells' `min-width`); a wider cell scrolling in widens its column once, a narrower one
  leaving narrows nothing. Re-measured when the rows, the columns, a stored width, the text size
  or the scroller's width change. A `grow` column and a resized one are not locked.
- **Keyboard, selection, screen reader:** Arrow/Home/End move over every row — the target row is
  rendered, then focused, and its focus scrolls it into view (End reaches the last row);
  Shift+click ranges and select-all work on the data, not the DOM. `aria-rowcount` on the table
  and `aria-rowindex` on every rendered row (header 1, the leading row, bands, open rows' detail
  rows and the totals row counted).
- **Trade-offs:** the browser's find-in-page sees only the rendered rows, and so does print. An
  `id` from `rowAttributes` (an anchor, an `aria-controls` target, a `scrollIntoView` lookup)
  exists only while its row is rendered. Desktop only: the phone card list renders every row it
  holds (`loadMore`, `paginated={false}`) or reveals them in chunks (client paging).
- **Memoise `columns` (and `mobileCard`):** the rows compare their columns by identity
  (`perf(data-table)` 1d10446): with an inline array every row re-renders on every render — and
  under `virtualize` every rendered row on every scrolled step.
- **`useColumnFit`** (the `fitPriority` columns) now measures only when the rows on screen, the
  columns, the stored widths, the density or the text size changed — a ticked box no longer
  forces a layout of the whole table.

Checked in headless Chromium (showcase build, Data table → "Period groups and load more", the
new "1000 rows" / "3000 rows" and "Virtualize rows" toggles; two-level groups, `fillHeight`, sticky
leading row and bands, selection; 1400×1000):

| | 1000 off | 1000 on | 3000 off | 3000 on |
| --- | --- | --- | --- | --- |
| DOM nodes (page / table) | 14 263 / 10 410 | 4 329 / 476 | 35 029 / 31 176 | 4 329 / 476 |
| forced relayout of the table | 155 ms | 6 ms | 567 ms | 12 ms |
| checkbox click, event duration (INP) | 136 ms | 32 ms | 416 ms | 40 ms |
| checkbox click, processing | 9 ms | 2 ms | 29 ms | 3 ms |
| scroll top → bottom (70 % steps), wall time | 36 s | 29 s | 227 s | 76 s |

Scrolled top to bottom in 138 / 415 steps: the period and day bands matched the first row under
them at every step, no spacer was in view after a step settled, no row under the reading line
moved (0 px), and the header widths never changed. End on a focused row focused row 999 / 2999
(`aria-rowindex` = `aria-rowcount`, 1344 / 4028) in view. The three-month ledger with
`virtualize` loaded twice (once per month) to 218 rows. axe: no violations (top, mid-scroll with
an open row kept, the end). Page scroll (`maxBodyHeight="none"`, 2000 rows): no spacer in view
over 118 window-scroll steps.

| App | Change |
| --- | --- |
| keksdose | frontend/src/features/transactions/transactions-page.tsx, the register's `<DataTable<Transaction> fillHeight …>` (symbols, not lines): add `virtualize` (no options needed; `density="compact"` picks the 29px estimate). Keep `columns={desktopColumns}` memoised — its `useMemo` deps (`columns` from `useTransactionColumns`, `t`, `txSwipePrefs`, `todayIso`, `swipeMutations`, `confirm`, `anySwipePending`, `density`) must keep their identity between renders, or every row re-renders on each tick and each scrolled step. The `leadingRow`'s `Disclosure controls` lists `txn-row-s…` ids of the upcoming rows, which exist only while those rows are rendered (they sit at the top, under the toggle — rendered whenever the toggle is in view). The created-row reveal (`focusRowId`, `.txn-row-flash`): the new row is the newest, at the top of the date sort — scroll the table's body to the top before looking it up by class, as a row not rendered has no element. Phone: unchanged (mobile-transaction-list.tsx is not a DataTable) |
| kastlan | Nothing, unless a long list wants it |
| kurvenschmiede | Nothing, unless a long list wants it |

**AppShell, every page with a `fillHeight` table (nothing to change in the apps):** `<main>`'s `md:has-[[data-fill-height]]:*:shrink-0` is now `md:[&&>*]:shrink-0` — the `:has(…) > *` rule restyled ~4,300 elements on every DOM insertion under it (a virtualised table's scrolled step: style recalc mean 11.2 → 1.1 ms, p90 27 → 2.9 ms, max 41–76 → 3.8 ms; showcase, 3000 rows, 1280×800); the layout is the same (children's `flex-shrink`, the FillHeight's and the banner's boxes, a short window scrolling `<main>` — compared in Chromium), and the doubled class still outranks FillHeight's `flex-1`.

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
