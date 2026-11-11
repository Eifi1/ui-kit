# Adopting `@eifi1/ui-kit` 0.60

ui-kit 0.60 removes the palette names 0.59 deprecated, closes two findings of keksdose's legal
audit of 2026-11-11 (the feedback dialog's page address; with **server-kit 0.24**, an erased
crash report's diagnostics), takes kastlan's two UX findings (the shared-computer choice under
the password, the phone's page row at the top) and keksdose's three live reports (#513 the
swipe's advance through "Test when live", #515 a postpone swipe, #514 NavPills that look
pressable), stops a filter on a hidden column from hiding rows unseen, fixes two follow-ups to
0.59's ZoomableImage, and moves the kit's tests to jsdom 31.

**From 0.59, nothing else first.** An app still on 0.58 takes 0.59's notes first.

**Legal wording:** none. No change touches a kit legal text, so no page's `updated` date moves
for the kit. keksdose's own policy: its §11 (erasure) and its feedback paragraph (the page
address) match the code with this bump, so its interim sentence can go.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:** nothing in the three apps compiles differently: none of them uses a removed
palette name or `FeedbackSwipeAction`, which gained `postpone` (an exhaustive `switch` or a
`Record` over it needs the new id; searched their sources and tests). Changes of behaviour that
need a look:

- **The feedback dialog's page address stops at the pathname** unless the app passes
  `allowParams`. Each app passes its crash reporter's list (table below).
- **An app test** that expects `context.url` to equal `window.location.href` gets the reduced
  address.
- **The feedback swipes** (every app that takes `DEFAULT_FEEDBACK_SWIPE`): the short drag
  toward the start now postpones (won't do moved to the longer drag), and the advance from
  "In evaluation" goes to "Test when live", then to "Done". An app test of the default
  binding's panels changes with it.
- **NavPills** draw a 1px outline on every pill: 2px taller than before.

**What `check:api` prints:** `createPaletteStore`, `applyPersistedPalette`, `PaletteStore` and
`PaletteMenu` removed; `TopBarLabels` without `palette`, and through it `UiKitLabels` and
`kitLabelStrings`; `FeedbackSwipeAction` with `postpone`. The three new optional props (`SignInForm`'s `afterPasswordContent`,
`AppShell`'s `mobileSubNavPlacement`, `useFeedbackSubmit`'s `allowParams`) are additive and
not listed.

## Removed: the palette names 0.59 deprecated (breaking)

No app offers a palette choice since 2026-11-10, so the store that kept one per device and
the menu that switched it go. The fixed palette (`createFixedPalette`, 0.59) paints the one
preset and keeps nothing.

| Removed | Use |
|---|---|
| `createPaletteStore` | `createFixedPalette(useTheme, { legacyStorageKey })` |
| `applyPersistedPalette` | `createFixedPalette`'s `applyPalette(mode)` |
| `PaletteStore` (type) | `FixedPalette` |
| `PaletteMenu` | none: no app offers a palette choice (`OptionSwitcherMenu` for any other value) |
| label key `topBar.palette` (`TopBarLabels.palette`), in all seven catalogues | none: it was `PaletteMenu`'s name |

- **What `check:api` prints:** the four names above, and `TopBarLabels` without `palette` (with
  `UiKitLabels` and `kitLabelStrings` through it).
- **keksdose:** nothing to change.
- **kastlan:** nothing to change. A comment in `frontend/src/app.css` (line 23) still says
  "the PaletteMenu switches"; it may go with the bump. It is a comment, so nothing breaks.
- **Kurvenschmiede:** nothing to change.
- **Tests:** none of the three apps' tests uses a removed name.

## The feedback dialog names the page without what the person typed (G-10)

`useFeedbackSubmit` read `location.href` whole for the context box and sent it as
`context.url`. A query string carries what the person typed: keksdose's register keeps the
search in `?q=` and the column filters, which hold payee names, in `f.<col>`. A report filed by
hand put that text in a column every admin reads. In private mode too. The crash reporter has
reduced its page to an allow-list since 0.27. The dialog now does the same, through the same
function.

- **New option `allowParams`:** the query params the address may keep. The box shows, and
  `context.url` sends, `origin` + the pathname + those params. Every other param and the hash
  stay on the device. `context.route` is unchanged (the pathname).
- **⚠ Without it, no query at all:** the address stops at the pathname. An app that wants its
  paging or tab in a hand-filed report passes them.
- **Adopt:** pass the list the app already gives `createCrashReporter`, so both channels name a
  page alike. Share one constant:

  | App | `allowParams` today (crash reporter) | Where |
  |---|---|---|
  | keksdose | `CRASH_URL_PARAMS` (p, ps, sort, tab, g, granularity, month, preset, from, to, tstate, future, archived, uncleared) | `frontend/src/shared/lib/crash-report.ts` |
  | kastlan | p, ps, sort, tab, locale | `frontend/src/shared/feedback/crash-reporter.ts` |
  | Kurvenschmiede | tab, compare, open, ns, wheels, locale | `frontend/src/shared/lib/crash-reporter.ts` |

  ```ts
  useFeedbackSubmit({ upload, create, user, environment, version, allowParams: CRASH_URL_PARAMS });
  ```

- **Tests:** an app test that expects `context.url` to equal `window.location.href` now gets the
  reduced address. keksdose: drop the policy's interim sentence ("die vollständige Adresse der
  Seite samt Such- und Filterangaben") with the bump.

## The shared-computer choice goes under the password (kastlan #31)

`SignInForm` had one place for app content on the credentials step, `credentialsContent`, at
the top. Apps put `SharedComputerChoice` there, so the choice and its hint were the first thing
on the page, above the email field. kastlan's UX review asked for email, password, the choice,
"Sign in", then "Sign in with a passkey".

- **New prop `afterPasswordContent`:** rendered under the password field. A failed attempt's
  message comes after it, right above "Sign in". `credentialsContent` is unchanged.
- **Adopt:** kastlan, the only app that shows the choice, moves `<SharedComputerChoice
  storage="local" />` from `credentialsContent` to `afterPasswordContent`
  (`frontend/src/features/auth/pages/login-page.tsx:62`). keksdose and Kurvenschmiede: nothing.
- **The hint's length:** the kit's hint is two sentences. An app that wants one line passes its
  own words through `labels={{ hint: … }}`. The kit's text is unchanged.

## The phone's page row can sit at the top (kastlan prod feedback #22, KX-5)

Below `md`, AppShell draws the current group's pages as a row above the bottom bar. kastlan
runs it as one `scroll` row. Its UX review found that row and the bar stacked into one deep
block at the bottom of every page: about 43px of row and 56px of bar.

- **New prop `mobileSubNavPlacement`:** `"bottom"` (default) or `"top"`. Not passing it
  changes nothing.
- **With `"top"`:** the row sits directly under the shell's top bar. It is `sticky` like the
  kit's `TopBar`, so it stays in view while the page scrolls. It takes its own height in the
  page's flow, so the content starts below it, not under it.
- **`--app-nav-h` then measures the bar alone.** `<main>`'s bottom padding shrinks by the
  row's height. Anything docked at `bottom: var(--app-nav-h)` sits right on the bar.
- **Both layouts work at the top.** `wrap` and `scroll`, with the faded cut edge and the
  current page scrolled into view. `embedded`, `mobileSubNav={false}`, the More sheet and
  groups without `items` behave as before. No new labels.
- **Under the kit's top bar, not under the page title.** kastlan's review asked for "under the
  page title". The title is the page's own content, so the kit cannot put anything below it.
  The row sticks 3rem down, which is the `TopBar`'s `h-12`. A top bar of another height
  would leave a gap or an overlap.
- **Height:** about 43px at Normal text (worked out from the classes, not measured in a
  browser). That is within the review's 48px. It scales with the text size: about 53px at
  Large and 63px at Extra large.
- **Layer:** `z-[35]`, under the top bar's `z-40` (its menus open over the row) and over a
  page's own `z-30` sticky elements.

**Adopt:**

- **kastlan:** pass `mobileSubNavPlacement="top"` beside `mobileSubNavLayout="scroll"` in
  `frontend/src/app/app-layout.tsx`. It uses the kit's `TopBar` unchanged, so the 3rem fits.
  A grep found no page element sticking at the top and no `--app-nav-h` use. Check one
  grouped page on a phone: the row under the top bar, the bar alone at the bottom.
- **keksdose:** nothing. The row stays above the bar.
- **Kurvenschmiede:** nothing. The row stays above the bar.
- **Tests:** an app test that finds the row inside the bottom bar's box (`.fixed.bottom-0`)
  looks for it under the top bar once the app opts in. The row carries
  `data-slot="app-shell-subnav"` and `data-placement` in both places.

## The feedback swipes: the live test on the advance, and postpone (keksdose #513, #515)

- **The advance goes through "Test when live"** (#513, Marcel 2026-11-11). `nextFeedbackStatus`
  walks OPEN → READY → IN_PROGRESS → IN_EVALUATION → NEEDS_LIVE_TEST → DONE: an evaluated
  report goes out with the next deploy and is checked there. Before, the short swipe from
  "In evaluation" went straight to "Done", and a row waiting on the deploy had no advance.
  With the default binding, an "In evaluation" card now has two stages toward the end:
  "Test when live", then "Done" on the longer drag.
- **The pills are unchanged.** The table cell and the detail already offer "Test when live"
  from every chain status and "Done" from "In evaluation", so a fix that needs no deploy is
  closed there without the stop. The `done` swipe still goes to "Done" from anywhere.
- **New swipe action `postpone`** (#515): sets POSTPONED, drawn as that status is (the pause
  glyph, the neutral tone; it parks a row, it does not refuse it), labelled with the status's
  own name. It drops out on a postponed row. `FEEDBACK_SWIPE_ACTIONS` is `advance`, `done`,
  `postpone`, `wont_do`.
- **The default binding** (`DEFAULT_FEEDBACK_SWIPE`): toward the start `postpone`, then
  `wont_do` on the longer drag (before: `wont_do` alone); toward the end unchanged.
- **Adopt:**
  - **keksdose:** add `postpone` to `SWIPE_ACTIONS.feedback` and to the default in
    `shared/state/swipe-prefs-store.ts`, with the store migration for devices still on the
    shipped left side, and the picker's label (its four languages). The status name it shows
    is the kit's `POSTPONED`.
  - **kastlan, Kurvenschmiede:** nothing to change; both take the default, so their inbox
    cards get the new start side and the new advance with the bump. A test that lists the
    default binding's panels changes with it.
- **Words:** no new labels; the panel reads the status label `POSTPONED`.

## NavPills look pressable at rest (keksdose #514)

The pills that were not current were bare words; only the current one was a chip (keksdose's
Settings › Interaction › Swipe gestures: five pills, two rows at 406px, dark theme). Every pill
now rests in the outline of a secondary Button (`border-subtle`); the current one keeps the
inverse fill, its border transparent so every pill has the same box. Hover, focus, `disabled`,
`size="sm"` and both layouts are as before.

- **The size:** a 1px border all round makes each pill 2px taller and wider than in 0.59.
- **Adopt:** nothing to change. keksdose's swipe settings and Kurvenschmiede's three section
  layouts (dynamics, steering, experiments) get the outline with the bump; look at one of each
  in both themes. kastlan uses no NavPills.
- **An `itemClassName`** that sets its own border colour still wins over the kit's.

## A filter on a hidden column still says so (desktop)

- **What changed.** On a desktop, only a column's header said its filter was on, and the
  table filters over every column, drawn or not. So a filter on a column the desktop does
  not draw kept hiding rows with no word and no Clear. The column may be hidden by the
  person, left out for width, or missing from `columns`. A line above the table now says
  each such filter, with the same **Clear filter** as the column's popover:
  - **a column's own filter:** "Filter Status (active)", the name of the column's filter
    button. Live #500's saved layout (DONE only, Status hidden) showed 2 of 5 reports and
    never said why; it now says so above the table;
  - **a `keyFilter` set:** the set's own words (`label`, or the kit's "Only these 3 rows"),
    the line named "Filter # (active)" for screen readers. Its Clear calls `onClear` and
    clears the column's own filter with it. One line for the set, not a second for its
    column's filter.
- When a Clear removes a line, the focus goes to the table, not to the page's top. While the
  column is drawn, nothing changes. A hidden column with no filter on draws nothing. The
  phone is unchanged: its Filters sheet already listed a hidden column. Hiding a column
  still keeps its filter (as it keeps its width): the line is what says so.
- **Words.** No new labels: `dataTable.filterColumn`, `dataTable.clearFilter` and
  `dataTable.keyFilter` / `feedbackPage.focusIds`, which every catalogue already has.
- **keksdose, kastlan, Kurvenschmiede:** nothing to change; every DataTable gets the lines
  with the bump. In the browser: in any table with column settings, filter a column, then
  hide it in the Columns panel: "Filter <column> (active)" is above the table, and its Clear
  filter brings the rows back. The feedback inbox: hide the # column and open a notice's link
  (`?ids=…`): "Only these N reports" is above the table.
- **Tests:** an app test that counts the elements above a table, or finds the table's first
  child by position, meets the line where a hidden column has a filter on. The lines carry
  `data-hidden-filter="column"` or `"set"`.

## Safari's trackpad pinch; the Lightbox's zoom pans across (0.59 ZoomableImage follow-ups)

- **ZoomableImage: a trackpad pinch in desktop Safari zooms the picture.** 0.59 promised that a
  trackpad pinch zooms about the cursor. That held in Chrome, Edge and Firefox, which send the
  pinch as Ctrl + wheel. Safari on a Mac sends WebKit's own gesture events instead. Nothing
  handled them, so the pinch zoomed the whole page. The box now takes them: it zooms about the
  cursor, clamped and announced as the wheel is, and the page stays as it is. Before the
  picture's shape is known, the pinch is left to the page, as the wheel is.
- **iOS: one pinch, zoomed once.** iOS Safari sends a touch pinch as gesture events too, beside
  the touches the kit already follows. While a finger is down on the box, the gesture events are
  only prevented, so one pinch never zooms twice.
- **Lightbox: a zoomed picture pans to its far side.** Zoom shows the picture at its own size,
  and the viewer scrolls to pan it. Since 0.12 a box around the picture cut it off at the
  screen's edge, so you could scroll down but never across. A phone photo (4032 px wide) showed
  only its first screen-wide strip. Now the whole picture scrolls. Unzoomed, nothing changes.
  This reaches every ImageGrid, whose tiles open the Lightbox.
- **Must change:** nothing. No API change and no new labels.
- **Not tried in a browser.** The Safari fix was tested in jsdom with synthetic gesture events,
  not in a real Safari (macOS or iOS). The Lightbox clip was worked out from the CSS, not seen.

**In the browser:**

- **keksdose:** in the invoice review, open a scanned page from the grid, press Zoom, and scroll
  sideways to the page's right edge (on a phone, too). The receipt preview shows ZoomableImage
  only to a touch screen (`scan-file-preview.tsx`, `(pointer: fine)` gets the hover lens), so
  the Safari fix does not reach it on a Mac. On an iPhone, a pinch on a receipt zooms as before.
- **kastlan:** open a full-size handover photo from an ImageGrid (room inspector, the unit's
  rooms tab, the document gallery), press Zoom, and scroll sideways to its right edge.
- **Kurvenschmiede:** nothing. It uses neither ZoomableImage nor the Lightbox.

## server-kit 0.24

- **An erased crash report keeps only what describes the software (C-7).** `crash_body` writes
  the diagnostics into the body as text, and `anonymise_feedback` replaced only the person's
  name and email there: the account number (`User: … (#id)`), the browser string and the
  fingerprint stayed, although the context loses all three. Now, inside the
  `-- Diagnostics --` block, the `User:`, `User agent:` and `Fingerprint:` lines go and `URL:`
  keeps its path. Removing the whole `User:` line also takes the address of the day the crash
  was filed, which the erasure's identifiers (today's address only) did not find after an
  address change.
- **Adopt:** nothing to change; `anonymise_feedback` applies it. The new public
  `scrub_crash_diagnostics(body)` serves a one-off over rows erased before 0.24 (crash
  reports whose `user_id` is already NULL), should an app need one; a second pass changes
  nothing.

## Toolchain

- **jsdom 31** runs the kit's tests (0.59 went back to 30 for it). Its CSS parser writes an
  inline style back in its own spelling (`minmax(0px, 1fr)`, a folded `calc()`, a transition
  without its default `ease`), so ten assertions compared exact strings and broke. They now
  compare through `src/test/css.ts`'s `cssValue`, the expected value read back by the same
  parser. jsdom only runs the kit's own tests; nothing reaches an app. An app moving to jsdom 31
  itself may meet the same spellings in its own style assertions.
