# Changelog

All notable changes to `@eifi1/ui-kit`.

This package is pre-1.0 and three applications depend on it. The contract until 1.0:

- **minor** (`0.x.0`) may remove or rename an export, change a prop's type, change an
  emitted class name, or change a token's value. Each one is a breaking commit
  (`feat!:` / `fix!:`, or a `BREAKING CHANGE:` footer) and is listed under
  **⚠ BREAKING CHANGES**; the per-app migration is in `docs/adopt-0.x.md`.
- **patch** (`0.x.y`) fixes behaviour without changing the public surface. The surface is
  pinned by `src/__tests__/public-surface.test.ts`, so a name cannot leave it unnoticed.
- Consumers pin `^0.x`, which npm treats as minor-locked below 1.0 — so a minor does not
  reach an app until it asks for it.

An export is **deprecated for one minor before removal**: marked `@deprecated` in TSDoc
with the replacement named, listed in the release's `docs/adopt-0.x.md` and in its commit
body as `Deprecated: …` (this file has no section for it), then removed in the next minor.

From 0.7.0 on, this file is generated from the Conventional Commits by `npm run release`
(commit-and-tag-version); write the entry in the commit, not here.


## [0.51.0](https://github.com/Eifi1/ui-kit/compare/v0.50.1...v0.51.0) (2026-10-26)

### ⚠ BREAKING CHANGES

* `variant="primary"` / `"brand"` (Button, buttonClasses,
  IconButton), `variant="primary"` (FloatingActionButton, FloatingAction),
  `IMPRINT_PRESET`, `AppShellProps.mobileBarMax` and `DEFAULT_MOBILE_BAR_MAX`
  are removed. Use `default` / `accent`, `DEFAULT_PRESET`, `mobileMaxItems`
  (cells, "More" included) and `DEFAULT_MOBILE_MAX_ITEMS`.
* **shell:** DevSwitchers is a DevMenu with no sections, so it draws
  ONE flask where it drew two, named "Dev tools · Role: … · Plan: …"
  instead of "Switch role · Role: …" and "Switch plan · Plan: …". Props,
  rows and "Back to" are unchanged. A test that finds a trigger by
  "Switch role" or "Switch plan" (keksdose top-bar.test.tsx, Kurvenschmiede
  top-bar.test.tsx:192) looks up /^Dev tools/ instead; docs/adopt-0.51.md.

### Added

* **landing:** PublicPage, the frame of a public page beside the landing ([2d44970](https://github.com/Eifi1/ui-kit/commit/2d44970fe5cde708c2b093980919ea478fcdb0bc))
* remove the 0.49 deprecations (primary/brand, mobileBarMax, IMPRINT_PRESET) ([d26c576](https://github.com/Eifi1/ui-kit/commit/d26c576a10db6da9b43adca5b09487c336a889f8))
* **shell:** DevMenu, one dev flask with the app's own sections after role and plan ([542ce3e](https://github.com/Eifi1/ui-kit/commit/542ce3eaff0b4795470f62ea6f638920f79428ff))
* **stat-tile:** projection takes several rows (Committed and Projected) ([9f8cc7a](https://github.com/Eifi1/ui-kit/commit/9f8cc7aae794eed7555c346835315d7be767b782))

### Fixed

* **alert-banner:** a clamped strip keeps its action on the line on a phone ([bcbba8e](https://github.com/Eifi1/ui-kit/commit/bcbba8e838d20538aec4b6b3504bed36028f7b5f))
* **alert-banner:** the message's box is a div, so a banner can hold a list ([feb4301](https://github.com/Eifi1/ui-kit/commit/feb4301c5ea2df1e58ab06c8c28f900d34de7214))
* **data-table:** a column the fit brings back is drawn at the widths it measured ([c53c692](https://github.com/Eifi1/ui-kit/commit/c53c692698a9efd67fe97dae7c2f96fd6a9cc422))
* **server-wake:** time the stage from the oldest request still out ([f689855](https://github.com/Eifi1/ui-kit/commit/f6898558a88596023a909deb8852842c898ca795))
* **user-roster:** the role select keeps room for its longest role word ([22a0f31](https://github.com/Eifi1/ui-kit/commit/22a0f315bb6686e38d2e7a6368d960a44ed373ab))

## [0.50.1](https://github.com/Eifi1/ui-kit/compare/v0.50.0...v0.50.1) (2026-10-23)

### Added

* **testing:** tourStepContext(), a valid step context for a test ([0dbc7ce](https://github.com/Eifi1/ui-kit/commit/0dbc7ce002365f382cb69893e7fd5c86c3d01e03))
* **tour:** launch gets the whole engine as its fourth argument ([a652513](https://github.com/Eifi1/ui-kit/commit/a6525131b0fa99afdc3ce68c14e17b6586e5aea5))

### Fixed

* **tour:** the arrival's focus on a picker field leaves its list closed ([2d05d9e](https://github.com/Eifi1/ui-kit/commit/2d05d9e09509a5f2b2f6317ea66754308324672d))

## [0.50.0](https://github.com/Eifi1/ui-kit/compare/v0.49.0...v0.50.0) (2026-10-23)

### ⚠ BREAKING CHANGES

* **user-roster:** layout only — a roster becomes a fitting table on a
  bump; `{ ...c, grow: undefined, fitPriority: undefined }` restores 0.49.

### Added

* **auth:** EmailVerificationBanner passes actionPlacement through ([b346e4d](https://github.com/Eifi1/ui-kit/commit/b346e4d603eda9c44c5cca0de54819fe4911421b))
* **currency-select:** lock like Select — disabled, disabledReason, commit (keksdose) ([f7950ce](https://github.com/Eifi1/ui-kit/commit/f7950ce45133cf2cf9c2643097255fcff5ba8f14))
* **data-table:** a phone card with own-click cells keeps opening the row (kastlan K4) ([b92069c](https://github.com/Eifi1/ui-kit/commit/b92069c27c97c3f37396703f83b9d4809291f341))
* **format:** export formatWithMinus for an app's own Intl wrapper ([d1deef6](https://github.com/Eifi1/ui-kit/commit/d1deef6860458458d5734c94e128a1b1dc958d94))
* **testing:** rowMenuAction in @eifi1/ui-kit/testing/react ([1b9fbd5](https://github.com/Eifi1/ui-kit/commit/1b9fbd58aec410454393bc3ea2ba3b5bda87fdee))
* **tour:** awaitGate steps with useTourGateRelease's release and refuse ([96dee98](https://github.com/Eifi1/ui-kit/commit/96dee985323c36404ee3cd13d0ce570c33e3df71))
* **tour:** launch gets the provider's own start as a third argument ([b4837d9](https://github.com/Eifi1/ui-kit/commit/b4837d9ddf00f2ac5840210cb279b100fb88d1d4))
* **tour:** optional fields, conditional steps and the run's own counter ([3530a0c](https://github.com/Eifi1/ui-kit/commit/3530a0ca101d32c5b312601a51df4b29036fa826))
* **tour:** start inside an open form — `at`, start(id) and TourGuideButton ([12957e6](https://github.com/Eifi1/ui-kit/commit/12957e6f16b817383adf0e1c729fced54c9564a2))
* **tour:** the docked card on phones (placement "dock", the default for field steps) ([75dfb93](https://github.com/Eifi1/ui-kit/commit/75dfb938f808fd7af53052b78fd42b0ab69d9f09))
* **tour:** the guided form tours' words in seven languages ([dfb328d](https://github.com/Eifi1/ui-kit/commit/dfb328d6508c4d80e2568ba55077350111cbd8a8))
* **tour:** value gates — useTourGate and a step's locked Next ([0fef15e](https://github.com/Eifi1/ui-kit/commit/0fef15ece9e10b9aa93013a1f59bbf4d0d7f7b2a))
* **user-roster:** fit by default, Name grows, Created and Last login leave ([a8230a7](https://github.com/Eifi1/ui-kit/commit/a8230a7bee39bb3cd26bf3c3c6ff6e291ab992e1))
* **wizard:** StepperNav releases and refuses "wizard-next" and "wizard-finish" ([bf0156b](https://github.com/Eifi1/ui-kit/commit/bf0156b7fe379580df8482018cbefecce242edfa))

### Fixed

* **amount-input:** a disabled field's currency chip is a read-out too ([310fe07](https://github.com/Eifi1/ui-kit/commit/310fe077ec8b005b74adb72a74b6762eaba3070c))
* **fields:** AmountInput and NumberInput pass data-* to their root (keksdose) ([f05fc35](https://github.com/Eifi1/ui-kit/commit/f05fc35280c67c37b9b15968352f99bda44d704d))
* **tour:** a field step's card shows above the sheet holding the field (keksdose B1) ([239aaac](https://github.com/Eifi1/ui-kit/commit/239aaacdea98872e635baf3905bd02794fa98bc1))
* **tour:** a field step's ring frames the field's own lines ([aaf6ffd](https://github.com/Eifi1/ui-kit/commit/aaf6ffd72324188e582159d556cce2a5403483fb))
* **tour:** a number pad taller than half the phone still bounds the docked card ([329f56a](https://github.com/Eifi1/ui-kit/commit/329f56ac4ad66980767c9a54957cfbffe55e2344))
* **tour:** warn when a gate's publisher leaves under the step ([bfb68d7](https://github.com/Eifi1/ui-kit/commit/bfb68d70d35f0b39080bc9612b35235e33e1c967))

## [0.49.0](https://github.com/Eifi1/ui-kit/compare/v0.48.2...v0.49.0) (2026-10-22)

### ⚠ BREAKING CHANGES

* **data-table:** a DataTable without `mobileCard` shows at most three
  fields under the title on a phone (was every visible column not
  mobileHidden) and leaves out fields with an empty value. Mark the fields
  with `mobile: "secondary"` or keep the old card with `mobileCard`.
* **floating-panel:** a floating launcher is hidden while a kit overlay is
  open (pass `hideWhenOverlay={false}` to keep it), and from `md` up
  AppShell's <main> gains bottom padding while a launcher is mounted.
* **page-header:** a PageHeader rendered as the page's h1 with a string
  title now sets the window's title (the page alone unless the provider
  has `appName`), and a Breadcrumbs inside a PageHeader hides its current
  entry by default. Pass `documentTitle={false}` / `hideCurrent={false}`
  to keep the old behaviour.
* **row-actions:** a RowActions / DataTable rowActions action with
  tone "danger" moves into the row's "⋯" menu and asks for confirmation
  before `onSelect`; an app that already confirms there asks twice until
  it passes `confirm: false` (or `dangerPlacement="inline"` for the old
  layout). RowActionsLabels gains the required `confirmTitle` and
  `confirmBody`.
* **shell:** at Normal the phone bar no longer shows every entry: more
  than five entries become four and "More" (pass mobileMaxItems to keep more
  cells), and on the phone an entry with `items` opens a sheet of its pages
  instead of navigating to its `to`.
* **shell:** LanguageMenu's trigger is wider (flag and code, about
  60 px instead of 36) and is named "Choose language, current: <name>"
  unless the app passes `aria-label`; `trigger="flag"` keeps the 0.48
  look. TopBarLabels gains the required `languageCurrent`: an app that
  builds a whole TopBarLabels object by hand must add it.
* **format:** NaN and ±Infinity passed to formatNumber / formatMoney /
  formatPercent now log a dev-only console.warn (output unchanged: `empty`); pass
  null/undefined for a missing value. Numeric strings that used to print "—"
  now print the figure.
* **format:** the default output of formatNumber, formatMoney,
  formatPercent, StatTile, Sparkline, SeriesChart/Treemap/PieChart/
  CalendarHeatmap default formats, ProgressBar parts and ChartTooltipContent's
  bare value changes for negative numbers from "-" (U+002D) to "−" (U+2212).
  Tests pinning "-CHF 5.00" or "-12%" must expect "−"; code that parses
  formatted output must pass `minus: "ascii"` (or use the raw number).
* **chart:** the default palette and chart colours change on a bump; PALETTE_SIZE is 8 and
  paletteFor cycles 8 (was 9); IMPRINT_PRESET is a deprecated alias of DEFAULT_PRESET.

### Added

* **button:** KIT-5 variants default and accent; primary and brand become aliases ([335e5e7](https://github.com/Eifi1/ui-kit/commit/335e5e72c48199cbd7a558cc25b16d6bbcf0250d))
* **chart:** anyplot's palette — Imprint as the default, 8 hues, the same in dark ([1b123ea](https://github.com/Eifi1/ui-kit/commit/1b123ea210cfc30c337a2eab70f5495d23b85306))
* **data-table:** KIT-7 a dev build names a noRowLink column the phone card drops (KS S1) ([043edfb](https://github.com/Eifi1/ui-kit/commit/043edfbf3083ebb8357b9df308d2a3373171348c))
* **data-table:** KIT-7 default phone card — title, three fields, no empties, status chip ([99b8a02](https://github.com/Eifi1/ui-kit/commit/99b8a02134a387ad383a898f071024c24c9f509b))
* **floating-panel:** KIT-11 --kit-floating-inset and hideWhenOverlay ([6c79277](https://github.com/Eifi1/ui-kit/commit/6c79277f209d05fdd3e5911dd1809e20981927e3))
* **format:** KIT-1b: copying a negative puts "-" in the clipboard ([211bad0](https://github.com/Eifi1/ui-kit/commit/211bad03a48542e7b14f3b2e4c77ae18d2702d10))
* **format:** KIT-2 numeric strings format; invalid values warn once in dev ([3e0fd6d](https://github.com/Eifi1/ui-kit/commit/3e0fd6d68e37b32bbd17c90344a2480a40040e86))
* **page-header:** KIT-9 window titles from the page header; trails hide the current page ([7f28b9e](https://github.com/Eifi1/ui-kit/commit/7f28b9e143a6dd6af73cfc25d3eebaa39b05dfb7))
* **row-actions:** KIT-12 a danger action sits in the row menu and asks first ([28dbe65](https://github.com/Eifi1/ui-kit/commit/28dbe65051940e9dd662c82ebff3a46c009705ff))
* **shell:** KIT-10 the language trigger shows the flag and the code (DE, FR, IT) ([9332c4d](https://github.com/Eifi1/ui-kit/commit/9332c4de54b08a861058179cce98fe746f591255))
* **shell:** KIT-6 phone bar of five cells, group sheets, mobilePriority, SectionNav ([7628c74](https://github.com/Eifi1/ui-kit/commit/7628c74576388811c5ec61ba7a2d1ed37b2a7c60))
* **status:** KIT-8 statusTone(kind) and status= on Chip and StatusDot ([fff0f2f](https://github.com/Eifi1/ui-kit/commit/fff0f2f86205a11c31887d7d369a9f07546b1d3b))

### Fixed

* **breadcrumbs:** KIT-9 a hideCurrent trail of home entries alone is not drawn (kastlan S3) ([ef3c06e](https://github.com/Eifi1/ui-kit/commit/ef3c06e98a1d8183d1af6d353a03091176a188bd))
* **data-table:** a fit column whose return the next measure undoes stays out (keksdose B2) ([ecc6705](https://github.com/Eifi1/ui-kit/commit/ecc6705e82b009b5e42b63735adb6322d6b7b080))
* **data-table:** KIT-3 DataTable without urlSync needs no Router ([f766f71](https://github.com/Eifi1/ui-kit/commit/f766f717fa327054c1ea19d25e33171c33a7bf74))
* **data-table:** KIT-7 role: "actions" keeps a row's actions on the phone card (kastlan S1) ([3c833ab](https://github.com/Eifi1/ui-kit/commit/3c833abd193bde37d32a2a6a63589a5b74552bf6))
* **format:** KIT-1 one minus sign, U+2212, in every formatter and component ([6c29009](https://github.com/Eifi1/ui-kit/commit/6c290095bd0389965cc3eeff3858f4393a4a6c01))
* **invitations:** KIT-12 revoke sits in the row menu and asks nothing (level none) ([b4307c5](https://github.com/Eifi1/ui-kit/commit/b4307c59bd559caca7458f96e736fc3815af1644))
* **showcase:** KIT-8 the colour-roles blurb names the status tones in all seven dictionaries ([91071ff](https://github.com/Eifi1/ui-kit/commit/91071ff3508498ca3184685d16113b74c883534e))
* **user-roster:** KIT-7 the phone card keeps the actions; states sit beside the name ([d6fb804](https://github.com/Eifi1/ui-kit/commit/d6fb80443580613b46639ff26964973a0fe2a1e8))
* **user-roster:** KIT-7 the roster's actions are role: "actions", not a card field ([b99a6b7](https://github.com/Eifi1/ui-kit/commit/b99a6b7735b9963edf80853e693407dcad9fb253))

## [0.48.2](https://github.com/Eifi1/ui-kit/compare/v0.48.1...v0.48.2) (2026-10-22)

keksdose dev #632 (Marcel: "The table is extremely slow. Is it virtualised…?"): a DataTable tick re-renders only
the rows it touches (memoised rows; keep `columns`, `rowActions`, `mobileSwipeActions` and `mobileCard` stable),
an anchored panel no longer forces a layout while closed, `<main>`'s fill-height rule no longer
re-evaluates `:has` on every insertion, and opt-in `virtualize` renders only the rows near the view
(sticky bands kept). At 3000 rows: table DOM nodes 31,176 → 476, checkbox INP 416 → 40 ms. Nothing
changes for an app until it opts in (docs/adopt-0.48.md, 0.48.2).

### Added

* **data-table:** opt-in row windowing (virtualize) with sticky bands and measured heights ([ec083c0](https://github.com/Eifi1/ui-kit/commit/ec083c0f943bfd6be056442babf0392ca50a1d02))

### Changed

* **data-table:** a selection or expansion change renders only the rows it touches ([1d10446](https://github.com/Eifi1/ui-kit/commit/1d10446ca9f923295e17ef0cd170aea09a6d1912))
* **shell:** <main>'s children keep shrink-0 without a :has re-evaluated on every insertion ([49b906e](https://github.com/Eifi1/ui-kit/commit/49b906e56ace866cb2a32c203630f214ad47c8d8))

## [0.48.1](https://github.com/Eifi1/ui-kit/compare/v0.48.0...v0.48.1) (2026-10-22)

From keksdose's 0.48 adoption (K-052-1): a `loadMore` table no longer filters, sorts or pages
the server's rows on the client; `serverRows={false}` keeps the old behaviour. keksdose drops its
dummy `serverPagination`; kastlan and Kurvenschmiede need nothing (docs/adopt-0.48.md, 0.48.1).

### Fixed

* **data-table:** loadMore renders the server's rows as given (serverRows) ([aad63a0](https://github.com/Eifi1/ui-kit/commit/aad63a0beb5629e7fd332d3c6ba13eb438705296))

## [0.48.0](https://github.com/Eifi1/ui-kit/compare/v0.47.0...v0.48.0) (2026-10-21)

Round 0.48, keksdose run 83 (Marcel's live reports #451, #410, #450, #603) and the 0.47 build
reviews. It removes `TabsLabels.backToFirst`, deprecated in 0.47: **breaking** for a build that
still names it, which no app does. Six changes show on a plain bump:

- A list opened inside a `Popover` (a select, a combobox, a date picker) no longer closes it
  (keksdose dev #623).
- The top-bar menu triggers name themselves in the kit's Tooltip on hover and focus (dev #610).
- On a phone `AppShell` pads `<main>` past a floating launcher, so the last row stays reachable
  (keksdose dev #612; only an app with a launcher: keksdose).
- The `Tabs` cues are bare chevrons beside the strip (24px, a 48px hit area), each in a
  fixed gutter kept at both ends while the strip overflows, so scrolling never moves the labels.
- A `Disclosure` with no children (or an empty fragment) draws no body.
- The kit's feedback columns fit the table's width: Subject grows, URL, Email and Resolved
  leave first (and come back once they fit), and the Columns panel counts what is drawn.

Opt-in: a column's `grow` and `fitPriority`, `SettingsGroup.badge` with `adminSections`'
badges, and `DataTable`'s `leadingRowSticky`.

The server half ships as server-kit 0.19.0, which breaks only a test helper:
`check_comment_store` requires the app's `attachment_url`. Per-app steps: `docs/adopt-0.48.md`.

### ⚠ BREAKING CHANGES

* TabsLabels.backToFirst is removed (deprecated in 0.47; no app uses it).

### Added

* tables fit their width, bare tab cues, group badges, a sticky leading row ([b183b3a](https://github.com/Eifi1/ui-kit/commit/b183b3a2ad9d33e792b0cad773503c48e01667b3))
* **shell,floating-panel:** below `md` `AppShell` pads `<main>` past the floating launchers: every `FloatingActionButton`, `FloatingPanel` and `FloatingActionGroup` publishes its room above the nav as `--app-float-clearance` while mounted (the largest wins), and `FloatingPanel` takes `hidden` to step aside while keeping its room and open state (keksdose dev #612; shows on a plain bump for an app with a launcher) ([7332f66](https://github.com/Eifi1/ui-kit/commit/7332f665e8b8244b85cf6c3f5bd045874acdcffe))
* **tour:** the overlay's root carries `data-tour-overlay` on every step (keksdose dev #611) ([7332f66](https://github.com/Eifi1/ui-kit/commit/7332f665e8b8244b85cf6c3f5bd045874acdcffe))
* **alert-banner:** `clampMobile` keeps the message to one line below `md` with a More / Less toggle (`common.showMore` / `common.showLess`, seven catalogues) (keksdose dev #611) ([7332f66](https://github.com/Eifi1/ui-kit/commit/7332f665e8b8244b85cf6c3f5bd045874acdcffe))
* **shell:** `AppShellNavItem.shortLabelFrom` uses `shortLabel` on the phone bar only from that text size up (keksdose dev #613) ([7332f66](https://github.com/Eifi1/ui-kit/commit/7332f665e8b8244b85cf6c3f5bd045874acdcffe))
* **data-table:** a column's `defaultHidden` starts it hidden while the saved view has no entry for it; the user's choice in the Columns panel wins (keksdose dev #617) ([aa28ef2](https://github.com/Eifi1/ui-kit/commit/aa28ef2787d2b95830ef59a1bf99c239aa8cf730))
* **skeleton:** `TableSkeleton`, a table/list loading preset (rows × columns, groups, a tile row, a grid variant) with one "Loading…" status (keksdose dev #628) ([aa28ef2](https://github.com/Eifi1/ui-kit/commit/aa28ef2787d2b95830ef59a1bf99c239aa8cf730))
* **alert-banner:** `actionPlacement="flow"` keeps a box's action on the message's line on a phone while the message keeps 10rem, else at the end of the next line (keksdose dev #623) ([aa28ef2](https://github.com/Eifi1/ui-kit/commit/aa28ef2787d2b95830ef59a1bf99c239aa8cf730))
* **shell:** `TopBarActionMenu`'s trigger (the feedback, avatar and tours menus), `OptionSwitcherMenu` and `ThemeToggle` show their name in the kit's Tooltip on hover and focus, without describing the trigger by its own name (keksdose dev #610) ([aa28ef2](https://github.com/Eifi1/ui-kit/commit/aa28ef2787d2b95830ef59a1bf99c239aa8cf730))
* **hooks:** `useOutsideClick` returns an `onPointerDownCapture` that makes every press through that element's React tree, portals included, an inside press ([aa28ef2](https://github.com/Eifi1/ui-kit/commit/aa28ef2787d2b95830ef59a1bf99c239aa8cf730))
* **data-table:** `groupBy` groups the desktop rows under full-width bands in one or two levels (period → day): a row header (`<th scope="rowgroup">`) opening its own `<tbody>`, spanning the visible columns, with a label and an end slot; sticky and stacked under the header (and a sticky `leadingRow`), also under `fillHeight`; `mobileGroupBy` takes the same level object (keksdose dev #605) ([27e7463](https://github.com/Eifi1/ui-kit/commit/27e7463589bd888c7021d11fda8e99ece82815a9))
* **data-table:** `loadMore` replaces the pager (client or server) with a footer that loads the next slice as it scrolls into view, once per row count and never while `loading`, plus an app-named button for the keyboard ("Load August 2026") and an end line; `dataTable.loadMore` / `allLoaded` in seven catalogues (keksdose dev #605) ([27e7463](https://github.com/Eifi1/ui-kit/commit/27e7463589bd888c7021d11fda8e99ece82815a9))

### Fixed

* **data-table,tabs,disclosure:** the 0.48 build reviews ([ea85513](https://github.com/Eifi1/ui-kit/commit/ea85513b0729ddfa23dbbce08158bc6f406401be))
* **data-table:** beside a `grow` column the other cells keep one line at Normal, the `grow` column keeps 10rem once nothing is left to leave out, and the feedback columns leave out Votes and Category last ([7332f66](https://github.com/Eifi1/ui-kit/commit/7332f665e8b8244b85cf6c3f5bd045874acdcffe))
* **user-roster:** the state and role chip rows wrap again beside a `grow` column (held to one line they scrolled kastlan's admin roster 21px at 1280px) ([4874f65](https://github.com/Eifi1/ui-kit/commit/4874f65c2b5c501e2e59ecac59a2db7b0cb131d0))
* **feedback:** the User column is at most 12rem, one line with an ellipsis and the full value in its `title` ([4874f65](https://github.com/Eifi1/ui-kit/commit/4874f65c2b5c501e2e59ecac59a2db7b0cb131d0))
* **tabs:** the `overflowCue` gutters are 24px at every text size (1.5rem left a 360px phone's strip 154 of 226px at Extra large) ([4874f65](https://github.com/Eifi1/ui-kit/commit/4874f65c2b5c501e2e59ecac59a2db7b0cb131d0))
* **verify-email:** `EmailVerificationBanner` takes `clampMobile`, with the resend's outcome after "Send again", outside the clamp ([4874f65](https://github.com/Eifi1/ui-kit/commit/4874f65c2b5c501e2e59ecac59a2db7b0cb131d0))
* **popover,hover-menu,dropdown,combobox:** a press on a portalled panel opened from inside — a `CurrencySelect`'s list in a `Popover`, at any depth — no longer closes the owner as an outside press, so the choice lands (keksdose dev #623) ([aa28ef2](https://github.com/Eifi1/ui-kit/commit/aa28ef2787d2b95830ef59a1bf99c239aa8cf730))

## [0.47.0](https://github.com/Eifi1/ui-kit/compare/v0.46.1...v0.47.0) (2026-10-21)

Round 0.47, the three 0.46 build reviews plus keksdose live #447 (feedback §12), #410 and dev
#600. It removes what 0.46 deprecated for 0.47 (`TimeZoneSelect`, `timeZoneOptions`,
`QuietHoursSetting`'s `timezone`, `NotificationSettingsPatch.timezone`, the unused zone labels,
`feedbackDetail.openPage`): **breaking** for a build that still names one, which no app does
(checked 2026-10-20). Otherwise:

- `RowActionsHead`, `ROW_ACTIONS_CELL_CLASS` and `ROW_ACTIONS_HEAD_CLASS` give a hand-built
  table the actions column `rowActionsColumn` gives a `DataTable` (keksdose N17).
- An expanded `DataTable` row is as wide as the table's visible scroller, not the whole table,
  so an inline editor's Save stays on screen (keksdose S4). Shows on a plain bump.
- A file on an admin reply (opt-in: `replyAttachments`, so a plain bump shows no new field) and
  on a public comment; every entry's and comment's picture is drawn inline.
- `Tabs`' `overflowCue` is a › while tabs lie past the end and a ‹ while tabs lie before the
  start, neither ever flipping; `tabs.previous` is new, `tabs.backToFirst` deprecated (ignored,
  removed in 0.48).
- The theme sets `color-scheme` on `<html>`, so native controls and scrollbars follow it.
- Build: vite 8.3.4 (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm).

The server half ships as server-kit 0.18.0, which breaks a stale sender: a `timezone` sent to
the notification settings, the push settings shim or `PATCH /auth/me` is a 422, as announced;
an app with public comments adds a nullable `attachment_url` column. Per-app steps:
`docs/adopt-0.47.md`.

### ⚠ BREAKING CHANGES

* TimeZoneSelect, timeZoneOptions and the other names deprecated in 0.46 are removed.

### Added

* **feedback,tabs,theme:** reply and comment attachments, edge cues that never flip, color-scheme ([ee5630e](https://github.com/Eifi1/ui-kit/commit/ee5630ecd443c5bda22d386cdae2377410381eba))
* remove what 0.46 deprecated; RowActionsHead; an expansion as wide as the visible table ([d623ced](https://github.com/Eifi1/ui-kit/commit/d623cedcd0812c124cfb6970227e8bcc4998be20))

### Fixed

* **feedback:** the reply attachment is opt-in (replyAttachments), so a bump drops no file ([8e5d41a](https://github.com/Eifi1/ui-kit/commit/8e5d41a3c49b61350de0b56950e424299d937497))

## [0.46.1](https://github.com/Eifi1/ui-kit/compare/v0.46.0...v0.46.1) (2026-10-20)

The three apps' 0.46 adoption findings (round 048: keksdose, kastlan, Kurvenschmiede). No export
is removed and no prop changes its type; one thing shows on a plain bump:

- Every actions column has a visible "Actions" heading (Marcel, keksdose dev#598 rework):
  `DataTable rowActions`, the desktop column from `mobileSwipeActions`, `rowActionsColumn`,
  `TranslationReviewPanel` and the user roster. `rowActionsHeader={false}`,
  `desktopSwipeActions={{ header: false }}`, `header: false` or `actionsHeader: false` keeps
  the 0.46.0 heading (hidden, for a screen reader only).

The rest is additive: the apps' adoption fixes in `/sync` and the notifications (each replacing
an app's workaround), and `swipePlanRowActions` is public. The server half ships as server-kit
0.17.0, a minor only because it adds names (nothing breaking): the validation 422s no longer
echo what was sent, push bodies are parsed without echoing secrets, and `PATCH /auth/me` drops
an unknown device zone (200, was 422); a stale `timezone` is still ignored, refused from 0.18.
Per-app steps: `docs/adopt-0.46.md`, its 0.46.1 sections.

### Fixed

* **data-table:** a visible Actions heading on every actions column ([2ca1728](https://github.com/Eifi1/ui-kit/commit/2ca1728b926d8ec68637b8c28969ff1fe515b78d))
* **sync,notifications:** the apps' 0.46 adoption findings for 0.46.1 ([4dbfa90](https://github.com/Eifi1/ui-kit/commit/4dbfa90bf005f88372fd213f7d4e21c1565618fc))

## [0.46.0](https://github.com/Eifi1/ui-kit/compare/v0.45.0...v0.46.0) (2026-10-19)

Round 0.46, the three 0.45 adoptions' notes plus local-first §2, notifications §10 and feedback
§11 (all settled 2026-10-19, the zone amended 2026-10-20), reviewed against all three apps before
release. No export is removed and no prop changes its type; five things show on a plain bump:

- A table with phone swipe actions now also gets a desktop actions column with the same actions
  (on by default, except beside `rowActions`; an app's own `DataTable` wrapper must forward
  `desktopSwipeActions`).
- `FeedbackNotificationTypeId` gains `"feedback_received"` (admins' alerts for new feedback and
  reworks), so each app's own notification-type id union adds it, and
  `useFeedbackNotificationTypes()` returns it as a third entry.
- `NotificationSwitches` gains an optional `push`: the notification settings card draws a
  column per channel (in the app, push, e-mail); a server that sends `push: null` gets none.
- `QuietHoursSetting` given the deprecated `timezone` (keksdose's quiet-hours card) loses its
  zone picker and "Use it": the zone is shown read-only, and the first time entered no longer
  sends a zone. Pass `zone` (`/auth/me`'s `device_timezone`) instead.
- `FeedbackRowDetail` has no "Open page" button: the URL section's link above it is the one
  link to the page (keksdose live #449; `feedbackDetail.openPage` deprecated, removed in 0.47).

New: `@eifi1/ui-kit/sync` (a new subpath: the device copy, the sync engine and its hooks; `dexie`
is an optional peer of `/sync` only) and `@eifi1/ui-kit/push-worker` (worker-safe push handling
for an app's service worker); `NotificationInbox` and the optional `NotificationBell`, muted types
per device, `useDeviceZoneReport`; `DateFormatSetting`; `handlePushSubscriptionChange`. The time
zone is automatic only (the device last used, else Zurich): `TimeZoneSetting` was removed before
release, and `QuietHoursSetting`'s `timezone`, `NotificationSettingsPatch.timezone`,
`TimeZoneSelect`, `timeZoneOptions` and the labels `deviceZone` / `useDeviceZone` are deprecated,
removed in 0.47. The rest replaces the apps' 0.45 workarounds (`MailTestCard` without
`mailBackend`, the kit's words for the feedback tiles). The server half ships as server-kit
0.16.0, which breaks (the sync clock-skew correction, the notifications inbox, queue and channels,
feedback alerts, a company rename's names logged). Per-app steps: docs/adopt-0.46.md.

### Added

* DateFormatSetting, push rotation, the shared pre-push check; notifications + alerts drafts ([c3e090c](https://github.com/Eifi1/ui-kit/commit/c3e090cb329dd480f57c277080b0dd238f15fbd2))
* desktop actions from phone swipe actions, the 0.45 adoption fixes ([57775f0](https://github.com/Eifi1/ui-kit/commit/57775f09d3aaafcbf3fbc19f9793ed5d9721b724))
* **notifications:** inbox, bell, channels, TimeZoneSetting, the push-worker subpath ([59c6748](https://github.com/Eifi1/ui-kit/commit/59c6748c579cf00ceb300046f4206a439a82d0ac))
* **shell:** `AccountMenuTextSize`, A− / A+ for the text size beside the account menu's language (keksdose live #426) ([8366552](https://github.com/Eifi1/ui-kit/commit/83665527b7e017fd32f7475b6b8b7fccfb05c623))
* **tour:** `TourStep.interactive` keeps the layers a spotlit control opens (number pad, menus, popovers) above the scrim, and `awaitInput` advances once a value was entered (keksdose live #436) ([8366552](https://github.com/Eifi1/ui-kit/commit/83665527b7e017fd32f7475b6b8b7fccfb05c623))
* **sync:** @eifi1/ui-kit/sync — the device copy, the sync engine and its hooks ([343a959](https://github.com/Eifi1/ui-kit/commit/343a95960d3a021a75b4228ee1542f92d82640a2))

### Fixed

* **showcase,notifications:** deprecations name their removal, a family demo file, 15 needs ([6843850](https://github.com/Eifi1/ui-kit/commit/6843850b706b3eb57c7bd63dd1f45f251881df57))
* **sync,notifications:** the build review 2 fixes; the zone automatic only ([c29a158](https://github.com/Eifi1/ui-kit/commit/c29a158b5aa08481747cb0f5b70372bc35b7b59d))
* **sync,notifications:** a stopped engine never runs a round it waited for; zone report per account ([e0c9253](https://github.com/Eifi1/ui-kit/commit/e0c92539138f3f86ce2f07bfa21dad6cfc9be864))
* **feedback:** FeedbackRowDetail drops the "Open page" button that repeated the URL link (keksdose live #449) ([8366552](https://github.com/Eifi1/ui-kit/commit/83665527b7e017fd32f7475b6b8b7fccfb05c623))
* **tabs:** the `overflowCue` caret shows at every width while the strip overflows, not below `md` only (keksdose live #410) ([8366552](https://github.com/Eifi1/ui-kit/commit/83665527b7e017fd32f7475b6b8b7fccfb05c623))
* **translation-review:** an open row's top line swipes, keeping the editor's draft; no swipe while the editor's own write is out (keksdose live #416) ([8c27e76](https://github.com/Eifi1/ui-kit/commit/8c27e76f70542fc1edb36470f0bb39d56c80e89a))
* **translation-review,admin:** the row action's own name; the kit's hint only with its label ([be4c6a5](https://github.com/Eifi1/ui-kit/commit/be4c6a5b03c063153de9cee1b4229ef63ae1d4c9))

## [0.45.0](https://github.com/Eifi1/ui-kit/compare/v0.44.0...v0.45.0) (2026-10-19)

Round 0.45, settled by Marcel on 2026-10-19 and reviewed against all three apps before release:
tour progress on the account (tours §10: `useTourProgress` takes an `account`, the device record
becomes its cache), the admin follow-ups (admin §9: `MailTestCard`, `AdminWaitingBadge`, a
company's rename and switch in the log), and local-first phase 1 as the new
`@eifi1/ui-kit/offline` subpath (local-first §1.6). The server halves ship as server-kit 0.15.0.
Per-app steps: docs/adopt-0.45.md.

### Added

* tour progress on the account, MailTestCard, AdminWaitingBadge, the /offline subpath ([583f684](https://github.com/Eifi1/ui-kit/commit/583f6840d8203786695d089d9ceea411d885e630))

### Fixed

* **data-table:** a tap on a control inside a phone card no longer opens the row ([7b949ce](https://github.com/Eifi1/ui-kit/commit/7b949ce5dff1052670171ae5316e262091093498))
* **format:** a bare ISO day formats on its own day whatever timeZone is given ([9474cfa](https://github.com/Eifi1/ui-kit/commit/9474cfa6f3f448a4ca5913a0374492c6db6a02dc))
* **offline,tour:** the 0.45 build reviews — a cache per key, a session-long shared flag ([5b45bf5](https://github.com/Eifi1/ui-kit/commit/5b45bf57a7115946f3ca1c1d1b71f78ba74dd2b8))
* **showcase:** the Offline page moves to API, the index lists 0.45's parts ([2a6b0c6](https://github.com/Eifi1/ui-kit/commit/2a6b0c6d5cce9ea8253be949592241aecf6e2f4f))

## [0.44.0](https://github.com/Eifi1/ui-kit/compare/v0.43.0...v0.44.0) (2026-10-17)

The three 0.43 adoptions' notes, settled by Marcel on 2026-10-17 ("0.44 with everything") and
reviewed against all three apps before release (docs/tours-harmonization.md §9): the tour engine
reports a completion once (`TourProvider` `progress` + `onComplete(tour, {awarded})`, the tour
carried by `start`), `completeTour` for tests and seeds, keksdose's reviewed tour words as the
defaults, and no silent loss of an app's stored progress. Per-app steps: docs/adopt-0.44.md.

### Added

* **tour:** onComplete on the provider, completeTour, keksdose's reviewed words (tours §9) ([d128774](https://github.com/Eifi1/ui-kit/commit/d128774440be1f47309aad094c5bf88e30dfda42))

### Fixed

* **tour:** no silent loss of tour progress — a migrate per key, completeTour's guard ([97117ac](https://github.com/Eifi1/ui-kit/commit/97117acb1332a225ff4574238d4393652de7b18d))

## [0.43.0](https://github.com/Eifi1/ui-kit/compare/v0.42.0...v0.43.0) (2026-10-17)

Settled by Marcel on 2026-10-17 and reviewed against all three apps before release: keksdose's
tours page as the kit's catalogue (docs/tours-harmonization.md: groups, filters, the card, points
everywhere, progress that carries over, and a reset with its reason when a tour is updated), the
provider's portal in a new tab (billing §17; the checkout stays), and the findings from the three
0.42 adoptions. Nothing is removed; the per-app steps are in docs/adopt-0.43.md.

### Added

* the tours catalogue, the portal in a new tab, and the 0.42 adoption fixes ([71d51eb](https://github.com/Eifi1/ui-kit/commit/71d51ebde359ff6861689df6e554b36488652553))

### Fixed

* **showcase:** the admin overview renders outside a SettingsSection (it has no entry) ([2c6b54b](https://github.com/Eifi1/ui-kit/commit/2c6b54bff15518c5db50904c50fb5c0e4af1dbdd))
* the 0.43 build reviews — tour progress without a loop, useCancelRequest, the reset by instant ([7ca3faa](https://github.com/Eifi1/ui-kit/commit/7ca3faa2d225599b5cf8e7fc141b9060a7e9f388))

## [0.42.0](https://github.com/Eifi1/ui-kit/compare/v0.41.0...v0.42.0) (2026-10-17)

Three contracts settled by Marcel on 2026-10-17 after the three app reviews and a
pre-release build review, released with server-kit 0.14 so each app adopts once: billing
§16 (the provider's portal for the buyer only, an in-app cancel and its undo, a warning
before paying under a free grant without an end), the admin area
(docs/admin-harmonization.md: one way in, one shell, one section order, an Overview of what
waits on the admin) and the top bar (docs/top-bar-harmonization.md: one order, the
language in the account menu, keksdose's tours menu and sync indicator, server-backed dev
switchers). Nothing is removed; the per-app steps are in docs/adopt-0.42.md.

### Added

* buyer-only billing actions, the permanent-grant warning and the admin-area parts ([7749327](https://github.com/Eifi1/ui-kit/commit/77493275498bf51cbebb5aaf3e34ed0875abd1c3))
* **shell:** the top bar's shared parts — TopBarActions, TourMenu, sync, dev switchers ([29a903f](https://github.com/Eifi1/ui-kit/commit/29a903fe8cf2a38eb69f43f55acd8f32c94c16f5))

### Fixed

* the pre-release build reviews — online-only sync, menu leading rows, GrantWarningConfirm ([13379b5](https://github.com/Eifi1/ui-kit/commit/13379b57e12dd72ac109f782cb0bbdf6520421d0))

## [0.41.0](https://github.com/Eifi1/ui-kit/compare/v0.40.1...v0.41.0) (2026-10-17)

Round 0.41: the names deprecated in 0.40 are removed. No app used any of them, so the migration is a
bump (`docs/adopt-0.41.md`); server-kit stays 0.13.1.

### ⚠ BREAKING CHANGES

* `Tabs` no longer accepts `wrap`, and `FeedbackMenuLabels` no longer has
  `viewFeedback` or `allFeedback`.

### Added

* remove the names deprecated in 0.40 — Tabs `wrap`, two FeedbackMenu labels ([4a1d673](https://github.com/Eifi1/ui-kit/commit/4a1d673e4694cfd38b5a8f880331a75d71057f42))

## [0.40.1](https://github.com/Eifi1/ui-kit/compare/v0.40.0...v0.40.1) (2026-10-16)

The apps' 0.40 adoption findings, released as one batch once all three had reported (server-kit
0.13.1 beside it): `docs/adopt-0.40.md` §5. Also Dependabot's npm half moves into the pre-push
hook, as keksdose's. Nothing is removed.

### Fixed

* **feedback:** FeedbackPublicList fills the window; the apps' 0.40 notes; no Dependabot rebases ([131bdb3](https://github.com/Eifi1/ui-kit/commit/131bdb3f3d8f8fe6b47a5b051c4f85f0c4d6819f))

## [0.40.0](https://github.com/Eifi1/ui-kit/compare/v0.39.1...v0.40.0) (2026-10-16)

Round 0.40: every open point — feedback §10 (a rework is the author's entry with its own status;
the menu by role) and page layout §1 (the list page fills the window, the same in every app), both
settled after the three apps' reviews; keksdose's phone-table and picker findings; the Paddle
sandbox run's results (server-kit 0.13.0 ships beside it). The migration per app is
`docs/adopt-0.40.md`. Nothing is removed; Tabs `wrap` and two FeedbackMenu labels are deprecated.

### Added

* **billing:** `BillingOverview.switching`; the pay page's CSP allows Paddle's overlay styles ([3577e59](https://github.com/Eifi1/ui-kit/commit/3577e594226687934684fe41b3492d481d8bfc7c))
* **data-table:** phone cards — long-press selection, swipe on an open card, fill in the flow ([38536e1](https://github.com/Eifi1/ui-kit/commit/38536e1766d21e0ad3ac12d00ee61c5bb24f0786))
* **feedback:** rework as the author's entry, a REWORK status, the menu by role (§10) ([31cc59b](https://github.com/Eifi1/ui-kit/commit/31cc59b728cbc0d7eefc75ccd17e26b0dc518075))
* **page-layout:** the list page fills the window, the same in every app (§1) ([9420723](https://github.com/Eifi1/ui-kit/commit/9420723e19534520c08ff3020c68097be07f868d))

### Fixed

* **overlays:** closing a picker keeps the URL replaces made while open; sticky Done; Tabs cue ([a21140c](https://github.com/Eifi1/ui-kit/commit/a21140c12b32cc324a78f973d4a9142f452d3b32))
* the deprecations name their schedule; FillHeight is on the data-table page ([7f0cac6](https://github.com/Eifi1/ui-kit/commit/7f0cac6fe1e304688b97a9c218f32658a3960689))

## [0.39.1](https://github.com/Eifi1/ui-kit/compare/v0.39.0...v0.39.1) (2026-10-15)

keksdose's and kastlan's 0.39 adoption findings, released on Marcel's word (2026-10-15) before
Kurvenschmiede's report; `docs/adopt-0.39.md` §5. Nothing is removed.

### Fixed

* **billing:** PlanSwitchPreview's next-charge fields are optional, as server-kit makes them ([e5cedf8](https://github.com/Eifi1/ui-kit/commit/e5cedf8070598d91b03633e57d6882f7713963f5))
* **billing:** the pay page names Kastlan as the product does; adopt-0.39 §5 for 0.39.1 ([9762f3c](https://github.com/Eifi1/ui-kit/commit/9762f3ca074363979f1d79a0a1f70f6ccdb7db41))

## [0.39.0](https://github.com/Eifi1/ui-kit/compare/v0.38.1...v0.39.0) (2026-10-15)

Round 0.39: the Paddle billing amendment (billing §15) — every app's pay page serves any app's
checkout, the payer's plan switch, one Paddle customer per e-mail address (server-kit 0.12.0
ships beside it) — plus `ApiTranslationReviewsResponse`. Billing stays off until the sandbox
run. The migration per app is `docs/adopt-0.39.md`; the pay page's old flags and
`paySuccessUrl` are gone (below).

### ⚠ BREAKING CHANGES

* **billing:** `eifi1-pay-page` takes `--app <tag> [--app-url] [--apps <file>]` and refuses
  `--return-url`, `--app-name`, `--terms-url` and `--privacy-url` (exit 2, naming the new
  flags); `paySuccessUrl` is removed; `BillingOverview.paid` is required in typed fixtures.

### Added

* **billing:** every pay page serves any app's transaction; the payer's plan switch ([dc8fa69](https://github.com/Eifi1/ui-kit/commit/dc8fa6939d4b19a69e4913eaf79de97b450433f6))
* **i18n:** `ApiTranslationReviewsResponse`, the GET answer's type, and the reviewer name's parts ([0bb8c85](https://github.com/Eifi1/ui-kit/commit/0bb8c85e1eefc3c02656a0859635bb7b01825d3b))

### Fixed

* **showcase:** the Subscription page keeps its translated blurb ([d7ba1e9](https://github.com/Eifi1/ui-kit/commit/d7ba1e90eac0105bd44357efd5c89516d06e65af))

## [0.38.1](https://github.com/Eifi1/ui-kit/compare/v0.38.0...v0.38.1) (2026-10-14)

The apps' 0.38 adoption findings, released as one batch once all three had reported (server-kit
0.11.1 beside it). The steps per app are `docs/adopt-0.38.md` §5. Nothing is removed.

### Fixed

* **feedback:** FeedbackRecord's public fields take a server's `null` ([8e24cfa](https://github.com/Eifi1/ui-kit/commit/8e24cfa12e204e67b5f7571beddef64d51c8a9ad))
* **feedback:** Kurvenschmiede's 0.38 findings — Hide's catch, a pager, openRow, toast words ([8ab58d0](https://github.com/Eifi1/ui-kit/commit/8ab58d0ff452c0df87916dcf759013c92ac9d626))

## [0.38.0](https://github.com/Eifi1/ui-kit/compare/v0.37.0...v0.38.0) (2026-10-14)

Round 0.38: Marcel's public feedback, settled as feedback §9 after the three apps' reviews —
the public list and detail, upvotes, comments by others as rows, and the admin's answers as
a timeline of replies (server-kit 0.11.0 ships beside it). `FeedbackRowDetail`'s Outcome
editor gives way to the reply composer; bump server-kit 0.11 with it, which refuses a PATCH
naming `outcome`. The migration per app is `docs/adopt-0.38.md`. Nothing is removed.

### Added

* **feedback:** public feedback — votes, comments, replies as a timeline, the public pages ([44878a0](https://github.com/Eifi1/ui-kit/commit/44878a00adb4dbfee39a01447031bd7964e079a9))

## [0.37.0](https://github.com/Eifi1/ui-kit/compare/v0.36.0...v0.37.0) (2026-10-14)

Round 0.37: two contract sections settled after the three apps' reviews — the translation review
as server-kit layer 2 (server services §6; server-kit 0.10.0 ships beside it) and notifications
§9 (Kurvenschmiede's `work_transferred`, a job's mail owed until it went) — plus what the apps'
0.36 adoptions found. The migration per app is `docs/adopt-0.37.md`. Nothing is removed.

### Fixed

* **i18n:** English names a field's help "?" with its label quoted — About “Kind of drive” ([a77e75e](https://github.com/Eifi1/ui-kit/commit/a77e75ea0de79e4da7fc596d9e893c75265db180))

### Changed

* the styling inventory reads `@theme inline` through the ESLint rule's parser ([f6b1ee0](https://github.com/Eifi1/ui-kit/commit/f6b1ee0b418f0a66496ba60836b6dfecb05e64c8))

## [0.36.0](https://github.com/Eifi1/ui-kit/compare/v0.35.0...v0.36.0) (2026-10-13)

Round 0.36: Kurvenschmiede's Select hints and every queued round, four contracts settled after
the three apps' reviews — notifications (new), server-kit layer 2 (new; server-kit 0.9.0 ships
beside it), reset this device's settings (settings §11) and the More-contrast light well
(colour-roles §13) — plus a field's `help` beside its `hint` (text-size §4). The migration per
app is `docs/adopt-0.36.md`. Nothing is removed.

**What app tests may notice:** under More contrast in light, the well is darker and money,
status and hue text on it deeper (colour decision 15 reversed); a link Button's and TextLink's
brand read `--brand-muted` under More contrast; `UiKitProvider` joins the device-settings
registry a microtask after mounting; an app that writes a whole `UiKitLabels` object needs
`common.aboutField`, `common.help` and the `notifications` and `deviceReset` namespaces.

### Added

* a field's `help` beside its `hint` — the fact stays a caption, the help goes behind one "?" ([b45ae4e](https://github.com/Eifi1/ui-kit/commit/b45ae4e6e1f862be9719dafd49835e555aa6a2cd))
* reset this device's settings, and More contrast steps the light well ([b267c48](https://github.com/Eifi1/ui-kit/commit/b267c48a04ddcc5c95bb27275a1ab38ee0afee99))
* round 0.36's words in seven languages, its exports, and the showcase on server-kit 0.9 ([42e0f45](https://github.com/Eifi1/ui-kit/commit/42e0f45a65dbfd5bf9a18da238dd8ffb9bec3104))
* the notification cards — types and switches, quiet hours, the zone, push devices, unsubscribe ([8aedef1](https://github.com/Eifi1/ui-kit/commit/8aedef1772411a068e55cee437e944b4a2d13096))

## [0.35.0](https://github.com/Eifi1/ui-kit/compare/v0.34.0...v0.35.0) (2026-10-13)

Removes what 0.34 deprecated and finishes the refactor plan's open ends; carries the fixes
from the three apps' 0.34 adoptions, built as 0.34.1 and shipped here instead. The migration
per app is `docs/adopt-0.35.md`; no app has a call site of a removed name left. server-kit
stays 0.8.0.

### ⚠ BREAKING CHANGES

Hand-collected, like 0.34.0's list (each was deprecated in 0.34, SwipeAction's in 0.33):

* **`ariaLabel`** → `aria-label` on NumberInput, AmountInput, MoneyField, NumberField,
  IntegerField, the Rhf number / integer / money fields, CalculatorButton, WizardStepper,
  ThemeToggle, PaletteMenu, LanguageMenu, RoleSwitcher, OptionSwitcherMenu and
  TopBarActionMenu (required on the last two).
* **Props:** MultiSelect `values`, `allLabel`, `searchLabel`, `selectAllLabel`, `clearLabel`
  (→ `value`, `labels.*`); FieldStrip `pad` and the `FieldStripPad` type; ServerWakeNotice
  `navOffset`; SwipeAction `className` / `armedClassName` (→ `tone` or `paint`); `align`
  `"left"` / `"right"` on HoverMenu, DropdownPanel, TopBarActionMenu and FeedbackMenu
  (→ `"start"` / `"end"`).
* **Exports:** the chart-zoom maths (`DEFAULT_Y_AXIS`, `ZOOM_SQUARE_ENOUGH`, `ZOOM_MIN_DRAG`,
  `zoomAxesFor`, `selectionFromDrag`, `axisExtent`, `fitYToX`, `fitXToY`, `NO_ZOOM`,
  `zoomAfter`, `zoomDomains`, `defaultZoomAxes`) and `withChartZoom`; `ALTERNATIVE_PRESETS`;
  `FeedbackComposer` (→ `ChatComposer`); `resolveChipInputLabels`, `resolveFieldSyncLabels`,
  `resolvePasswordRevealLabels`, `resolveWizardLabels`, `resolveDataTableLabels`,
  `missingDataTableLabels` (→ `labels` props, `useKitLabels`, `missingKitLabels`); from
  `/rhf` the scaffold `FormField`, `useFormField`, `FormItem`, `FormLabel`, `FormControl`,
  `FormDescription`, `FormMessage` and their five `*Props` types (→ the bound `Rhf*` fields,
  `RhfField`).
* **Types:** `useKitLabelOverrides` returns a deep partial (`LabelOverride`).
* **Behaviour app tests may notice:** a caller's `onKeyDown` on Popover, HoverMenu,
  DropdownPanel or DropdownSearchHeader hears Escape only while that overlay is the top layer,
  as on Modal and FullBleedDialog (none of the apps passes one).

### Added

* @eifi1/ui-kit/currencies (pure data), setViewportWidth for tests, keksdose's wake words ([94246da](https://github.com/Eifi1/ui-kit/commit/94246dac6485bf773ec32d37884b665b9293eadd))
* @eifi1/ui-kit/eslint, the role-utilities rule for an app's own markup ([d53ad71](https://github.com/Eifi1/ui-kit/commit/d53ad71aec43c1c198a5a62a85212079071e26ee))
* remove what 0.34 deprecated; overlays' own onKeyDown hears Escape only as the top layer ([74bb8e2](https://github.com/Eifi1/ui-kit/commit/74bb8e25a848a104f8bfca43f08119b1b1a5a933))
* Tooltip, Modal, DialogFrame, CopyButton, StatTile and the banners take a ref ([8ff80f6](https://github.com/Eifi1/ui-kit/commit/8ff80f6eaccbee9a23986d3d52e030f36aa19990))

### Fixed

* DataTable's labels skip an undefined key, as useKitLabels does; 0.35's loose ends ([c77fff6](https://github.com/Eifi1/ui-kit/commit/c77fff6780888dac156194d9510faa8e147e1439))
* Escape reaches a dialog's own handler only as the top layer; grouped review panels keep a view ([b477f4a](https://github.com/Eifi1/ui-kit/commit/b477f4ae9c94581dfc01c9ddc067b5ecf6ed459c))

## [0.34.0](https://github.com/Eifi1/ui-kit/compare/v0.33.1...v0.34.0) (2026-10-13)

Round 0.34 (the apps' 0.33 reports, keksdose's feedback runs 77–78, Kurvenschmiede's asks;
two contracts settled after the apps' reviews: session refresh, groups in the audit) and the
whole 2026-10 refactor plan (`docs/refactor-plan-2026-10.md`, 69 findings in six waves). The
migration per app is `docs/adopt-0.34.md`; server-kit 0.8.0 ships beside it.

### ⚠ BREAKING CHANGES

Hand-collected from the round, like 0.33.0's list; the entries generated from commit footers
follow it.

* **Peers:** `react` and `react-dom` `>=19.2` (`useEffectEvent`).
* **Removed** (deprecated in 0.32 or earlier): `ariaLabel` on ToggleGroup, ChipInput,
  GroupedPicker, HoverMenu and the accessible-name `label` on Tabs and SearchField
  (→ `aria-label`; SearchField requires it), `PHONE_QUERY`, `feedbackDialog.attachments`.
* **Types:** `AdminActionKind` gains five members and `AdminActionLogEntry.target` widens to a
  group or other target; `AdminActionConfirmProps` is a type alias; `AuthErrorCode` gains
  `session_ended`; `ThemeSettingProps` is the union (the Select half is
  `ThemeSettingSelectProps`); `LanguageSettingProps` drops `multiple`; 25 components are
  function components taking `ref` as a prop, not `ForwardRefExoticComponent` (JSX,
  `ComponentProps` and `ComponentRef` work as before; `X.displayName` is gone).
* **Declarations** are one `.d.ts` per module (tsc), not hashed roll-up chunks; every entry
  exports the same names and kinds.
* **Kit class names** move to the role and new theme utilities (`text-muted`, `bg-surface`,
  `ring-focus`, `ring-offset-surface`, `ring-brand-contrast`, `text-money-*`, …; same
  colours); `FIELD_BASE`, `FIELD_DISPLAY`, `FOCUS_RING`, `FOCUS_RING_WIDTH`,
  `SETTINGS_FOCUS_RING` and `toneTextClass()` change value; `.text-money-net` and
  `.bg-money-neutral` are layered theme utilities now.
* **Roles and timing app tests may notice:** Escape closes only the topmost layer, and a
  field's bare `preventDefault` no longer holds a Modal open; picker rows (CurrencySelect, the
  AmountInput chip, GroupedPicker, MultiSelect) are `role="option"` and pick on mousedown;
  GroupedPicker's trigger is a combobox; DataTable's filter buttons are named per column, its
  number bounds are textboxes, an expandable row's state is on a "Details" button, not the
  `<tr>`; Tabs' "Remove" button sits after the tablist; the feedback dialog and the search
  palette appear a render after opening.
* **Colour presets** (Ink, Moss, Plum, Contrast) move about one hex step, so every derived pair
  meets its contrast on the shipped hex.

### Deprecated (removed in 0.35)

`ariaLabel` on AmountInput, MoneyField, NumberInput, NumberField, IntegerField,
CalculatorButton, the Rhf number twins, WizardStepper, ThemeToggle, PaletteMenu, LanguageMenu,
OptionSwitcherMenu, RoleSwitcher, TopBarActionMenu (→ `aria-label`); MultiSelect `values`,
`allLabel`, `searchLabel`, `selectAllLabel`, `clearLabel`; `resolveChipInputLabels`,
`resolveFieldSyncLabels`, `resolveWizardLabels`, `resolvePasswordRevealLabels`,
`resolveDataTableLabels`, `missingDataTableLabels`; the 13 chart-zoom maths exports;
`ALTERNATIVE_PRESETS`; `FeedbackComposer` (→ `ChatComposer`); `align: "left" | "right"` on
DropdownPanel, HoverMenu, TopBarActionMenu, FeedbackMenu; /rhf's `FormField`, `FormItem`,
`FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `useFormField`; ServerWakeNotice
`navOffset`; FieldStrip `pad`; and, from 0.33, SwipeAction `className` / `armedClassName`.

* **admin:** AdminActionKind gains five members and AdminActionLogEntry.target widens to a
  group or other target (an exhaustive switch or a person-only read needs a case);
  AdminActionConfirmProps is a type alias, so an interface can no longer extend it.
* pass `aria-label` where ToggleGroup, ChipInput, GroupedPicker and HoverMenu took
  `ariaLabel`, and where Tabs and SearchField took `label` (SearchField now requires it);
  PHONE_QUERY → usePhoneLayout(), or breakpointQuery("max-md", scale) for the query string;
  feedbackDialog.attachments → attachmentList / feedbackAttachment.attachmentList.

### Added

* **admin:** groups in the audit log — five words, group targets, the app's noun in seven languages ([f6b8521](https://github.com/Eifi1/ui-kit/commit/f6b8521b37b598c449f3be7b056777758f9cbc1a))
* **admin:** PlanChangeConfirm's usage takes planColumn's shape, so its plural can't disagree ([f7f37ea](https://github.com/Eifi1/ui-kit/commit/f7f37ea07c30e4d7e952910211ec45bfbcc87f08))
* **auth:** attachSessionRefresh — one refresh per tab, a definitive end once, a transient one kept ([7ee9fb5](https://github.com/Eifi1/ui-kit/commit/7ee9fb524a044895ddb7137698b1d7d82fd56712))
* HelpPopover for long help, write locks on text and money fields, PasswordSetting's own errors ([b636b92](https://github.com/Eifi1/ui-kit/commit/b636b929a61d59da0f12275cd35b6393cba334fe))
* Modal 2xl, one table storage prefix, saveBlob, settings window titles, the wake notice on top ([56eb4f2](https://github.com/Eifi1/ui-kit/commit/56eb4f2790fa0ae983a698c2aeb6da34aae8b81a))
* SeriesChart maxRows, the truncation sweep gates releases, wrap-at-Large across the pickers ([0bf08ee](https://github.com/Eifi1/ui-kit/commit/0bf08eebfb666bfe168b61b5245b45ba64f759fb))
* the English catalogue in one chunk; aliases deprecated in 0.32 and earlier removed ([843762d](https://github.com/Eifi1/ui-kit/commit/843762d6366323d04b7485309c3f8d691ddb5cf4))

### Fixed

* a reopened photo shows no revoked URL; React >=19.2; the release's sweep runs in CI ([82db9b3](https://github.com/Eifi1/ui-kit/commit/82db9b352c5a3ed9f1a56ca3eb8de8e082e06ad0))
* a strip's label clears its group's border; the stepper's focus line survives 125 % ([a200e06](https://github.com/Eifi1/ui-kit/commit/a200e066be5fb74d992df302b006ce5441a851f8))
* **a11y:** the five kit findings of the showcase's axe check ([48f72da](https://github.com/Eifi1/ui-kit/commit/48f72dac37c8a916bd3139f210dcca8dba3ce7bb))
* counts formatted alike in all seven catalogues; the colour deriver meets contrast on the hex ([fb925ac](https://github.com/Eifi1/ui-kit/commit/fb925ac9969262931590364c7b60e645b0425d0d))
* Escape closes only a picker's list in a dialog; tabbable traps; the phone filter sheet ([4a096a8](https://github.com/Eifi1/ui-kit/commit/4a096a891235a8fbbc13be3015050a7a6904957c))
* one lock-reason frame with its line on phones; aria-label on 16 more; "0.500" and rounding ([2d37551](https://github.com/Eifi1/ui-kit/commit/2d3755145e8eb80818f8b743f857673857e6f4cd))
* **showcase:** the series-chart and user-admin page blurbs in all seven dictionaries ([4426662](https://github.com/Eifi1/ui-kit/commit/4426662e8fe74e8676e983e26abb6f527f4e753e))
* the last five texts the truncation sweep cut at Large ([435992a](https://github.com/Eifi1/ui-kit/commit/435992ae583ba88a071e4d8698b22d3e3961b49e))

### Changed

* one Escape stack; shared field hint, error and lock plumbing; one numeric-field engine ([c7b9764](https://github.com/Eifi1/ui-kit/commit/c7b97644caed9d14cac5c03e83732368a430f3b7))
* one picker foundation, one search fold; MultiSelect generic; the number filter reads marks ([a0ab857](https://github.com/Eifi1/ui-kit/commit/a0ab8572e749b1949fb359a2cba4ef51f3b63c8a))
* React 19 ref-as-prop across the kit; every root and field takes a ref ([764386e](https://github.com/Eifi1/ui-kit/commit/764386eb4f26573a358b159e02265332abd1faff))
* the barrel by folder, no ui.tsx; lazy feedback dialog and palette; API deprecations, types ([3ca096f](https://github.com/Eifi1/ui-kit/commit/3ca096f4212fca9b96e50368c69d5ec29e1407f8))
* the kit's own markup on the role utilities; the role-class budget is 0 ([0b34633](https://github.com/Eifi1/ui-kit/commit/0b346330999a980cee94c73215cfc85df9fd1248))
* ui.tsx, DataTable and four large files split along their seams; modules in their layer ([4cc112e](https://github.com/Eifi1/ui-kit/commit/4cc112ebe385e9b862b14366a532088ef6a79f6f))
* utilities for the focus width, ring offsets, the ring on brand, and money ([e01cb42](https://github.com/Eifi1/ui-kit/commit/e01cb42d115c91027d7bc1ddfa0e2520ce40aa4a))

## [0.33.1](https://github.com/Eifi1/ui-kit/compare/v0.33.0...v0.33.1) (2026-10-12)

### Fixed

* **anchored-panel:** a flipped panel hangs from its bottom edge, at any content height ([434c3ca](https://github.com/Eifi1/ui-kit/commit/434c3ca0b643e4ffeb876c0c52eefdabefbb6606)), live #401
* **focus-trap:** leave focus on an autofocused child; give it back to the opener on close ([b0ce972](https://github.com/Eifi1/ui-kit/commit/b0ce9720f35f08ed4355f2912b36fbe8a1bc4294)), live #402
* lockable composers and number fields, a ref on Skeleton, figures that wrap at spaces ([63e12aa](https://github.com/Eifi1/ui-kit/commit/63e12aa43ee24b18a5d5e92e64cfa9d369582e8a))

## [0.33.0](https://github.com/Eifi1/ui-kit/compare/v0.32.2...v0.33.0) (2026-10-09)

### ⚠ BREAKING CHANGES

Changed token values, emitted classes and types that apps see on the bump; the migration
is `docs/adopt-0.33.md` (§2 "Breaking and must-change, every app").

* **Light `--bg-surface-2` is the page colour**, so a well on a card reads (1.02 → 1.09);
  a well painted straight on the page no longer stands out.
* **Light status colours are deeper** where they failed AA: `--warning`, `--success`,
  `--hue-orange`, `--hue-teal` as text, a louder `--danger-border-strong`, a darker
  `--status-edited`; `--brand-muted` is 62 % brand (was 70 %); Plum dark's brand moves one
  step. `--bg-hover` is a 5.5 % ink (was 7 %).
* **Hovers:** Button secondary/ghost and IconButton muted hover with a translucent ink;
  a row on surface-2 hovers to the card; Button primary, calculator and numpad keys hover
  on `--bg-active`.
* **Fills use their `-contrast` foreground:** Chip `solid`, the FloatingAction badge,
  toast actions and the kit's swipe panels (wash when idle, solid when armed).
* **At Large a floating-label field's label stands above it**; the kit's wrap-at-Large
  copies are one `truncate-until-large` utility.
* **`commit?: boolean` is `commit?: CommitScope`** on every kit commit prop, and
  `WriteLock` gains `kind` and `holds`. Under a billing lock the kit's remove, revoke,
  lower-a-role, sessions, deletion, email, profile and verdict controls stay live.
* **Exhaustive switches:** `BillingErrorCode` gains four members, `RowActionTone` three.
* **The collapsed RowActions "⋯"** sits in a `data-slot="row-actions"` box that carries
  `className` and the tour anchor.

### Added

* **billing:** the checkout's way back, at_provider, plan parts and the Paddle pay page ([f127b93](https://github.com/Eifi1/ui-kit/commit/f127b935c0e61c267da2e7b49291d639626b745b))
* **colour-roles:** every fill names its foreground; light wells read on a card ([5c2b64f](https://github.com/Eifi1/ui-kit/commit/5c2b64f75d86ced198ab074b5f2170efd7003e1e))
* **write-lock:** a lock says its source; row actions carry state; labels stand above at Large ([c1faeca](https://github.com/Eifi1/ui-kit/commit/c1faecaa4d1a82d852a4fb30335f049c2de25fbb))

### Fixed

* **colour-roles:** a pressed brand glyph hovers to brand-muted ([5534f3d](https://github.com/Eifi1/ui-kit/commit/5534f3df62742c979880b09fdf916ca1ef9efac5))
* **colour-roles:** brand-muted clears 4.5 on the brand chip's hover ([faa9526](https://github.com/Eifi1/ui-kit/commit/faa95264999ef120c8a1bf6c0e80b14136e9a627))
* the 0.33 follow-ups — strong warning cards, brand-muted text, revoke under billing ([874833f](https://github.com/Eifi1/ui-kit/commit/874833f4e279880b54bf7c977b1a92cfbfa55a0f))

## [0.32.2](https://github.com/Eifi1/ui-kit/compare/v0.32.1...v0.32.2) (2026-10-09)

### Fixed

* **row-actions:** the "⋯" menu stops clicks on its panel itself ([06e7e07](https://github.com/Eifi1/ui-kit/commit/06e7e07dd881a3b1adee62e1399d70555b9e7f32))
* **text-size:** button icons keep their size; header actions and the sub-nav at Large ([cbe0eba](https://github.com/Eifi1/ui-kit/commit/cbe0ebae3c9181fe4095bc92fba2c8337f109772))

## [0.32.1](https://github.com/Eifi1/ui-kit/compare/v0.32.0...v0.32.1) (2026-10-09)

### Added

* **billing:** words for billing_not_configured and billing_disabled ([8cf9a4f](https://github.com/Eifi1/ui-kit/commit/8cf9a4f461e3358c1553f36ad1b5145e2399d364))
* **row-actions:** an action that navigates is a link; a row name may be null ([57980bf](https://github.com/Eifi1/ui-kit/commit/57980bffd133df82aac166716ce332afb125d1e3))
* the plan action in the admin log, appearance.saveFailed, chart and rem exports ([50b33c1](https://github.com/Eifi1/ui-kit/commit/50b33c1bd67fff09d2fe4f34af97ec13782fd6cd))

### Fixed

* a toggle group's text hint is a caption; the row-actions menu keeps its clicks ([460081a](https://github.com/Eifi1/ui-kit/commit/460081a9631407863eced36cb8fa00092d81bc1b))
* **showcase:** demos hold to a 360 px phone at Extra large ([f640130](https://github.com/Eifi1/ui-kit/commit/f640130f1cca04543745e4b7e8c8b1e88bfef0d1))
* **text-size:** banner actions wrap on a line of their own; showcase code breaks ([139c294](https://github.com/Eifi1/ui-kit/commit/139c29439448b4cda67aaf37d2161daff91a8026))
* **text-size:** max-* queries complement min-*; labels wrap at Large; quieter hidden buttons ([9c1c382](https://github.com/Eifi1/ui-kit/commit/9c1c38202da54a14efcdddc79c6fbc3f95b3c053))
* **text-size:** nothing runs past a 360 px phone at Extra large ([f867485](https://github.com/Eifi1/ui-kit/commit/f867485906d9a74ca44df731de97da3dbe3c3138))
* **text-size:** toggle groups wrap at Large, landing and card grids hold one column ([f54f3d5](https://github.com/Eifi1/ui-kit/commit/f54f3d5d3653234b5eb298d0f1a42f924393b013))

## [0.32.0](https://github.com/Eifi1/ui-kit/compare/v0.31.1...v0.32.0) (2026-10-08)

### ⚠ BREAKING CHANGES

Changed emitted classes and behaviour that apps can see without picking a text size;
the migration is `docs/adopt-0.32.md` ("Everyone, on the bump").

* **The kit's 10 and 11 px text** is `text-micro` / `text-caption` (rem) instead of
  `text-[10px]` / `text-[11px]`; the sizes are unchanged at Normal. `cn()` knows the two
  new sizes.
* **Focus frames:** Button and IconButton show a frame on keyboard focus only
  (`focus-visible`); every frame takes its width from `--focus-ring-width` (`FOCUS_RING`).
* **Fields are at least 16 px on touch** (`pointer: coarse`).
* **On touch, facts leave the tooltip:**
  - `disabledReason` shows as a line under the control (`disabledReasonDisplay`
    overrides);
  - a kit field's hint becomes its caption;
  - `DateMark` shows the exact date beside the relative one.
* **A chart with an axis on each side** drops its right axis when the plot would fall
  below `MIN_PLOT_WIDTH` (also at Normal, under about 288 px).
* **`PHONE_QUERY` is deprecated:** use `usePhoneLayout()`, which follows the text size.
* **InvitationsPanel's** resend and revoke are `RowActions`.

### Added

* **billing:** plans, standing, banners and the limit notice (0.32) ([8f86da5](https://github.com/Eifi1/ui-kit/commit/8f86da56d12bb46b8d714d147611d3020f37acdf))
* **i18n:** billing, text size and contrast, and the commercial disclaimer in seven languages ([afd590a](https://github.com/Eifi1/ui-kit/commit/afd590a2cc313a21ccce6ccbfa1cffbbff66b35a))
* **showcase:** Text size & contrast, Subscription and the server kit's Billing ([eb7d74b](https://github.com/Eifi1/ui-kit/commit/eb7d74bc6f0248d7f7687e95f4db640b98c9562e))
* **text-size:** one root scale, scaled breakpoints and the contrast step (0.32) ([83c142b](https://github.com/Eifi1/ui-kit/commit/83c142bf1c191c4e83005326ef233d1bd0806acd))
* **text-size:** the components at Large, and no fixed px for text ([7287493](https://github.com/Eifi1/ui-kit/commit/72874935c8085f7306dd74842019cb84d136873d))
* **text-size:** the remaining kit spots at Large ([e3fb23f](https://github.com/Eifi1/ui-kit/commit/e3fb23f7ac16abd77c41c5cacdf8001b30e7b2ee))

### Fixed

* **build:** the declaration build gets a 6 GB heap; a test follows DateMark ([64ee9f7](https://github.com/Eifi1/ui-kit/commit/64ee9f730c81b7ec862aeb0ead1008148c9dd363))

## [0.31.1](https://github.com/Eifi1/ui-kit/compare/v0.31.0...v0.31.1) (2026-10-08)

### Added

* **landing:** demoHref={null} leaves "Try the demo" out ([165d5de](https://github.com/Eifi1/ui-kit/commit/165d5de2571db50a1ceb3d98eec5b5d52f136059))
* **settings:** useSettingsLabels, and a security help line without factors ([181ba40](https://github.com/Eifi1/ui-kit/commit/181ba4004a223acef5b5ad0492583c8f9c140de0))
* **showcase:** the Server kit group shows server-kit 0.5.1 ([a95aa74](https://github.com/Eifi1/ui-kit/commit/a95aa74c73485f7273d01bef3379a4c8c9a55b75))
* useConfirm({commit}) takes the write lock; RootEntry waits for a session ([e1e369e](https://github.com/Eifi1/ui-kit/commit/e1e369e1c8e37d0e366a662215619fc83f8e7965))

### Fixed

* server-kit's names in the admin parts, and two auth gaps ([c1355f6](https://github.com/Eifi1/ui-kit/commit/c1355f6544082a3d8ef44bc54dd18e9c66de8316))

## [0.31.0](https://github.com/Eifi1/ui-kit/compare/v0.30.0...v0.31.0) (2026-10-07)

### ⚠ BREAKING CHANGES

* **feedback:** `FeedbackStatus` gains `"READY"` ("Ready to implement", feedback contract
  §8.2), so an app's own `Record<FeedbackStatus, …>` fails to compile until it has the
  entry, and a database status enum needs the value. `FEEDBACK_AWAITING_STATUSES` now
  holds `OPEN` too. See `docs/archive/adopt/adopt-0.31.md`.
* **account settings:** `TwoFactorSetting` shows a title with an On/Off chip in place of
  its "Two-factor authentication: Off" line.

### Added

* **feedback:** READY "Ready to implement", and the subject in the row ([7430df7](https://github.com/Eifi1/ui-kit/commit/7430df75fd1bc855577c5a98f6076a1da6e706b7))
* **i18n:** the settings shell, the landing page and the demo in all seven languages ([8baab02](https://github.com/Eifi1/ui-kit/commit/8baab0288fb611e9f979a127cc64afa9b1976762))
* **showcase:** one Settings page, the shell and its rows ([13df74e](https://github.com/Eifi1/ui-kit/commit/13df74ec60a426ecac6b060d50612a84d7823a2a))
* **showcase:** the 0.31 pages and the Server kit group in all seven languages ([e4a7555](https://github.com/Eifi1/ui-kit/commit/e4a7555f4bb99e32a2515eec942f872a7a690e32))
* **showcase:** the Server kit group, and the settings and landing pages ([c5a042a](https://github.com/Eifi1/ui-kit/commit/c5a042af8484f359b59d28a3e442624d8fcc3cfc))
* the settings shell, the public landing page and the demo (0.31) ([bfc25e1](https://github.com/Eifi1/ui-kit/commit/bfc25e14f09d07b945aa29e1258712baea6f4c50))

### Fixed

* **date-picker:** the step row raises the focused, pressed or invalid part, so a tapped ‹, › or date shows its frame on all four sides (keksdose live #394)
* **data-table:** the phone card's focus frame is drawn inside the card ([cdbcea7](https://github.com/Eifi1/ui-kit/commit/cdbcea737b0b4eecb9ab2bf8a3ab2fbca55dc3c8))
* **invitations:** revoke an expired invitation too, and listTitle={null} ([dd7d8ac](https://github.com/Eifi1/ui-kit/commit/dd7d8acc0a0022f232bcfe9e5c5e0854ed91b9fd))
* **showcase:** the sample settings page has a heading of its own ([63b5305](https://github.com/Eifi1/ui-kit/commit/63b5305ad333dbbe9c6d4cd6ba09d98b24282b63))

## [0.30.0](https://github.com/Eifi1/ui-kit/compare/v0.29.0...v0.30.0) (2026-10-07)

### Added

* **account:** the account's own settings — names, email change, sessions, deletion, export ([6c53419](https://github.com/Eifi1/ui-kit/commit/6c5341966c79fdc310444ad2c8f93108cd5da809))
* **admin:** user list, roles, reviewer scope, admin actions, log, invitations, transfer ([4da1467](https://github.com/Eifi1/ui-kit/commit/4da14671952a245aad0e61c075dd208449deacfc))
* **auth:** RegisterForm defaultEmail, describeError on the resend, token_expired ([3a2c1ea](https://github.com/Eifi1/ui-kit/commit/3a2c1ea983ab59b55d0dfca2a9a33bfe4f16c89c))
* **i18n:** user administration and the account's settings in all seven languages ([314f4ed](https://github.com/Eifi1/ui-kit/commit/314f4edfddf1eb8db86230636c997b1716cd5bcd))

### Fixed

* **anchored-panel:** a dropdown with too little room below opens above when there is room there ([248adcd](https://github.com/Eifi1/ui-kit/commit/248adcd1eef342a47a2e0b5194ececde296d98a1))
* **i18n:** the sign-in round's hu and es wording, from Kurvenschmiede's review ([a187d08](https://github.com/Eifi1/ui-kit/commit/a187d08eafef5998afe329387122df681475e617))

## [0.29.0](https://github.com/Eifi1/ui-kit/compare/v0.28.1...v0.29.0) (2026-10-06)

### Added

* **auth:** export the 0.29 parts and wire their nine label namespaces ([c4f4d71](https://github.com/Eifi1/ui-kit/commit/c4f4d718b06741c1eeba60f0727f773e32872395))
* **auth:** SignInForm, RegisterForm, CompleteNameDialog — callbacks only, keksdose's words ([7c8278d](https://github.com/Eifi1/ui-kit/commit/7c8278d1634b47c9533e57389c0ca846fcab630b))
* **auth:** the signed-out pages, names in each language's order, the company switcher ([cac971d](https://github.com/Eifi1/ui-kit/commit/cac971d1411c197497d1f56812578aba3c5aab8f))
* **i18n:** the sign-in and sign-up namespaces in all seven languages ([d684e5d](https://github.com/Eifi1/ui-kit/commit/d684e5d4911175bcfb9234293dbc6adefe2d17b8))

### Fixed

* **i18n:** the binding-language button in hu and the note in es read naturally ([1c1a762](https://github.com/Eifi1/ui-kit/commit/1c1a762ed18aaf470584e20face6d2237eaa37de))

## [0.28.1](https://github.com/Eifi1/ui-kit/compare/v0.28.0...v0.28.1) (2026-10-05)

### Added

* **legal:** German is the binding version — a translation note and the terms' language clause ([795bae6](https://github.com/Eifi1/ui-kit/commit/795bae68d4fbb62ea82624f51770050ec5ddc9f4))

### Fixed

* **legal:** the apps' adoption — footers in AuthLayout, menu clicks, exports, es/hu/it/zh wording ([bc105c6](https://github.com/Eifi1/ui-kit/commit/bc105c6d1ba133f9434d288e3c25d39428a50db0))

## [0.28.0](https://github.com/Eifi1/ui-kit/compare/v0.27.1...v0.28.0) (2026-10-05)

### Added

* **i18n:** the legal namespace in all seven languages ([fbcc1e7](https://github.com/Eifi1/ui-kit/commit/fbcc1e7d095c5f8036dbeca718d0de3f257e6ffc))
* **legal:** one legal page for three apps — frame, kit-owned sections, footer, terms checkbox ([e53454e](https://github.com/Eifi1/ui-kit/commit/e53454ec8f2ddc78880ff8c0fcf8d08cfa857555))

## [0.27.1](https://github.com/Eifi1/ui-kit/compare/v0.27.0...v0.27.1) (2026-10-05)

### Fixed

* **legal:** LegalLinks keeps its spaced row and className without the nav ([55c532f](https://github.com/Eifi1/ui-kit/commit/55c532f1187970eefd13a1ccf9617c9785c267c6))

## [0.27.0](https://github.com/Eifi1/ui-kit/compare/v0.26.0...v0.27.0) (2026-10-04)

### Added

* export the feedback harmonization's parts; showcase demos on the feedback pages ([0306f90](https://github.com/Eifi1/ui-kit/commit/0306f9096c7df3a1a7d8ea1f4a2603cf13814388))
* **feedback:** createCrashReporter — filed only when stored, buffered until a sign-in ([1ebaf19](https://github.com/Eifi1/ui-kit/commit/1ebaf19c0a56500d1fe04ca03ba9f1dee267e7f5))
* **feedback:** FeedbackMenu gives an admin only "View feedback", as keksdose does ([7e1aa70](https://github.com/Eifi1/ui-kit/commit/7e1aa70f901b17963691b212760fc9183eca1571))
* **feedback:** FeedbackMenu, useFeedbackSubmit, FeedbackContextBox, captureAppScreenshot ([d2a2b61](https://github.com/Eifi1/ui-kit/commit/d2a2b61fbc9c08743f739aab3e2188cbd25f6039))
* **feedback:** FeedbackRowDetail and FeedbackReworkSection — one detail for three apps ([bb74222](https://github.com/Eifi1/ui-kit/commit/bb742229cd54dd8aaac0e151523e69fe0f47d57b))
* **feedback:** the dialog's submit hint is keksdose's "Ctrl+Enter to send" — "⌘ Enter" on Apple ([07de676](https://github.com/Eifi1/ui-kit/commit/07de676c31c922564e78dfcea7dfa3773d867ce5))
* **feedback:** the empty table says keksdose's "None" on both pages, with no hint ([7dcdff8](https://github.com/Eifi1/ui-kit/commit/7dcdff8ecd4741265786bc1a9e5bfe3ac7d4fd76))
* **feedback:** the feedback table — columns, phone cards, the awaiting filter, empty states ([bf8081a](https://github.com/Eifi1/ui-kit/commit/bf8081aafecd0a23e36f3076952ebc1ca236bbe7))
* **feedback:** the row detail's body section is headed "Description", as keksdose's ([1987be7](https://github.com/Eifi1/ui-kit/commit/1987be7309f1136224bfd508e10dfa6480be9a63))
* **feedback:** the shared feedback record, labels, rework helpers, Undo and swipes ([876ccf9](https://github.com/Eifi1/ui-kit/commit/876ccf9209c40d9a90a39d3f89a7b26181e62c83))
* **i18n:** the feedback harmonization's words in every language ([3ac5aaf](https://github.com/Eifi1/ui-kit/commit/3ac5aafc14832f2dad1bfda01987578412ad0b10))

### Fixed

* **feedback:** clamp the crash payload's environment to 20, keksdose's CrashReportCreate cap ([3d66ea9](https://github.com/Eifi1/ui-kit/commit/3d66ea9e147f7a5307891e5dd7c40af319d0bbc2))
* **feedback:** feedbackPage.environment prints a non-string instead of throwing ([6db0376](https://github.com/Eifi1/ui-kit/commit/6db03767276c11a0d85237791b39102514a9e159))
* **feedback:** the context box's "User:" takes the language's colon from common.fieldValue ([5a436e2](https://github.com/Eifi1/ui-kit/commit/5a436e27b314ac2498107387143a390e48767639))

## [0.26.0](https://github.com/Eifi1/ui-kit/compare/v0.25.1...v0.26.0) (2026-10-03)

### Added

* export the review panel's swipe binding types and helpers ([f623fad](https://github.com/Eifi1/ui-kit/commit/f623fad8f351e4d31346cea3d2f6b58503fa2f0c))
* **i18n:** translationReview.clearedToast in every language ([dc8c7fa](https://github.com/Eifi1/ui-kit/commit/dc8c7faf85678301803ab999c17ed6125e3ae4de))
* **translation-review:** swipe takes a binding — approve, edit, clear per side and stage ([517b401](https://github.com/Eifi1/ui-kit/commit/517b40103e1e4b76c444399726d1ccc86296b274)), live #377

### Fixed

* **swipe:** swipe panels use their fill's contrast text colour, readable in dark mode ([7c8ac24](https://github.com/Eifi1/ui-kit/commit/7c8ac245c50a068a9185e1572be75cdb942e4797))

## [0.25.1](https://github.com/Eifi1/ui-kit/compare/v0.25.0...v0.25.1) (2026-10-03)

### Fixed

* **translation-review:** many groups start folded; warn on a filter not written back ([5c3530f](https://github.com/Eifi1/ui-kit/commit/5c3530fa5a4a9b1cc67b77392567a22c3878b46a))
* **url-state:** survive a react-router test mock; useSearchParamsState takes an interface ([610b8f8](https://github.com/Eifi1/ui-kit/commit/610b8f86d5e8355abc338243201dffe3e552ff5b))

## [0.25.0](https://github.com/Eifi1/ui-kit/compare/v0.24.1...v0.25.0) (2026-10-03)

### Added

* export useSearchParamsState and the review groups' helpers; route the 0.25 demos ([fcc6002](https://github.com/Eifi1/ui-kit/commit/fcc60021ee890897092370455ffe9facbee9f75e))
* **i18n:** the review groups' and approvals' words, and the short required mark, in every language ([096acdf](https://github.com/Eifi1/ui-kit/commit/096acdf051b2f710afb7189432a88fdf8f0736b9))
* **table:** edgeFade on Table and DataTable — a sideways-scrolling table fades at the cut edge ([e22239f](https://github.com/Eifi1/ui-kit/commit/e22239f393fc9f42c81510a059901b77038ca86d))
* **translation-review:** swipe on the phone cards; group by area with one approve each ([018f8fb](https://github.com/Eifi1/ui-kit/commit/018f8fb94c1da89da30e378d2232626a7ad91e84)), live #377

### Fixed

* **data-table:** the page-size select shows an off-step size; no snap-back under reduced motion ([68168a9](https://github.com/Eifi1/ui-kit/commit/68168a9d1a2712bdb3d6fbbaa4dfaa87b22f82f5))
* **field-hint:** the "?" toggles its bubble on a tap ([ff94531](https://github.com/Eifi1/ui-kit/commit/ff94531a0ad6361501699b12836ca4ca8c01ee77))
* **scroll-lock:** lock <html> too when the app clips it ([4bf0dc9](https://github.com/Eifi1/ui-kit/commit/4bf0dc9419d00e657ae7799720aae3f3b7947639))
* **textarea:** no half line under the label strip; ColumnMapper role names; attachment buttons ([2c62561](https://github.com/Eifi1/ui-kit/commit/2c62561c630a6e2e1be6498b1a7bdd80d8a328ac))
* **tooltip:** a tap leaves no bubble; the in-place bubble never widens the page ([ae82194](https://github.com/Eifi1/ui-kit/commit/ae82194f2078d5e288bdf9d7220252f18f22fb12)), live #379, #381
* **url-state:** useSearchParamState setters compose; useSearchParamsState for several keys ([5838ebc](https://github.com/Eifi1/ui-kit/commit/5838ebc1af85dd93dfc6fe2b28b3209c5f8c2a25)), live #378

### Changed

* **column-mapper:** ColumnRoleTable uses Table's own edgeFade ([be688fe](https://github.com/Eifi1/ui-kit/commit/be688fe40d819a83633c206aa84fe3540a07de30))

## [0.24.1](https://github.com/Eifi1/ui-kit/compare/v0.24.0...v0.24.1) (2026-10-03)

### Fixed

* **deps:** require tailwind-merge ^3.7.0, where px-2 replaces pe-3 ([6bd3028](https://github.com/Eifi1/ui-kit/commit/6bd30289ab2f3a88b4daa77b4d3224e7b643445f))

## [0.24.0](https://github.com/Eifi1/ui-kit/compare/v0.23.0...v0.24.0) (2026-10-03)

### Added

* /rhf exports RhfInlineEntityCombobox; showcase pages for the 0.24 demos ([1d2c3ec](https://github.com/Eifi1/ui-kit/commit/1d2c3ec7255e8d37cf7afbecaa73511358c9c00a))
* **column-mapper:** bodyProps / rowProps; no "(required)" when every role is; edge fade ([05f1d31](https://github.com/Eifi1/ui-kit/commit/05f1d31439440dcf7d2b8a709a75a3775d3a899f)), keksdose #336
* **danger-confirm:** confirmVariant, a caller's guard, fields inside the tile ([34b583f](https://github.com/Eifi1/ui-kit/commit/34b583f12de398822d56474dff4eb234736b2ba5))
* **feedback:** the composer hands its root to the attachment slot; button look ([d3bce1e](https://github.com/Eifi1/ui-kit/commit/d3bce1ed2f2fa91e10a647cca6eacace30dc3f51))
* **rhf:** RhfInlineEntityCombobox; ref on the Combobox family; AmountInput class order ([ce8d2f9](https://github.com/Eifi1/ui-kit/commit/ce8d2f9491a7f995a3db0926636292ecd7768dee))

### Fixed

* **form-actions:** focus returns to Save after a failed save ([1c881c8](https://github.com/Eifi1/ui-kit/commit/1c881c8ef3c9e098278f16885297eaadd8a998d5))
* **textarea:** scrolled text slides under the floated label, not through it ([01cca3f](https://github.com/Eifi1/ui-kit/commit/01cca3f23d0bea8009d94578b644dc2f0f574679))

## [0.23.0](https://github.com/Eifi1/ui-kit/compare/v0.22.0...v0.23.0) (2026-10-02)

### Added

* **combobox:** Autocomplete takes the write lock like the rest of the family ([e7e4f2a](https://github.com/Eifi1/ui-kit/commit/e7e4f2a211fe1dc608c68cc2528e2654817825a5))
* **combobox:** write lock across the family; a create row; StepperNav finish lock ([550e43e](https://github.com/Eifi1/ui-kit/commit/550e43e3fd4e893c5e9d84b99e0e0363c3f447d4))
* **date-picker:** monthJump — the panel caption opens a month grid for long ranges ([bb9b228](https://github.com/Eifi1/ui-kit/commit/bb9b228c873c09f4e38758b9163c3c9e38c0a1fb))
* export the 0.23 parts; showcase pages for every new demo ([9630c59](https://github.com/Eifi1/ui-kit/commit/9630c598fb8eade36c7d29847f33bb9a3eb67fbc))
* **feedback:** FeedbackDialog and FeedbackNoteEditor type onError's info argument ([df2e103](https://github.com/Eifi1/ui-kit/commit/df2e103fd2ce7233d8dc349c05d01845e2f42f96))
* **feedback:** onError names the refused file; disabled; composer maxLength and showCount ([39c0503](https://github.com/Eifi1/ui-kit/commit/39c0503eb37336b92455ed6effae3a72576c896c))
* **fields:** FieldStrip labels custom content; a lock reason per swatch, icon and tile ([a5c8fa5](https://github.com/Eifi1/ui-kit/commit/a5c8fa5c15b9cd7623874878abc61ed3eb5fd3d7))
* **fields:** RhfCountrySelect, RhfMonthPicker; CountrySelect ref and clearable ([490bd22](https://github.com/Eifi1/ui-kit/commit/490bd22ea00e01d9c617bd572f1464355fc91391))
* **forms:** FormActions cancelVariant and size; DangerConfirm names the open guard ([c37c30b](https://github.com/Eifi1/ui-kit/commit/c37c30b718e43f5eebe4fb9a1280ca181d43e1cc))
* **i18n:** columnMapper, the held-confirm reasons and the upload refusal in every language ([403d746](https://github.com/Eifi1/ui-kit/commit/403d746be3722a3c4ac8e4a249ce84770e8bb2b8))
* **shell:** TopBarActionMenu heading rows group a long menu by topic (keksdose) ([2266910](https://github.com/Eifi1/ui-kit/commit/22669104164265fc32d5f3a5f0a5ba665f30885f))
* **table-text:** ColumnMapper — paste or drop a table, give each column a role ([b94eeab](https://github.com/Eifi1/ui-kit/commit/b94eeab638184c1f5dddd337e531eb331e1e7515))

### Fixed

* **column-mapper:** English wording — "either …", "What does column … hold?", one row ([aa26235](https://github.com/Eifi1/ui-kit/commit/aa262358d5452e6cfd5357a61fca16cee585652a))
* **month-picker:** aria-required reaches the trigger; RhfMonthPicker announces required ([fc8dbd8](https://github.com/Eifi1/ui-kit/commit/fc8dbd8572690e4af648150e868b6ce60d704578))
* **rhf:** RhfDateField passes required once; date triggers' aria-required tested ([ad7b258](https://github.com/Eifi1/ui-kit/commit/ad7b258a4f28ba3375aa6e648f20b63065bfddf3))

### Changed

* **fields:** one field-parts module — field-anatomy merged in, FieldLabel with it ([f2e1117](https://github.com/Eifi1/ui-kit/commit/f2e1117c151a5eafe37ad5cefdf66c99498d518d))

## [0.22.0](https://github.com/Eifi1/ui-kit/compare/v0.21.0...v0.22.0) (2026-10-02)

### Added

* DataTable mobileSort, FormActions submitShortcut, attachment refs, ChatComposer, rowProps ([46ba97f](https://github.com/Eifi1/ui-kit/commit/46ba97fd80896388b3328cfa8d9e8a71e8a8df90))
* export the 0.22 parts; showcase demos, search index; 0.22 notes ([01b59ed](https://github.com/Eifi1/ui-kit/commit/01b59ed3a75e6d0619528086122992f817de76ab))
* **feedback:** FeedbackComposer size="sm" for a narrow panel (keksdose) ([ea6436c](https://github.com/Eifi1/ui-kit/commit/ea6436c8bf7ec78cb68b1ed163bf97a70102f92e))
* fields — hint and showCount, a kept placeholder, commit on self-saving controls, CheckboxGroup ([4d578f9](https://github.com/Eifi1/ui-kit/commit/4d578f9cbca0150dd8c14658a69c51afbd9662bf))
* **i18n:** the 0.22 labels in every catalogue ([40a9a9e](https://github.com/Eifi1/ui-kit/commit/40a9a9ed58aee3fb42065af5fd41b0b3c03b5005))
* InlineEditField, TypedConfirmField, DangerConfirm acknowledge and consequences, file locks ([c023bb0](https://github.com/Eifi1/ui-kit/commit/c023bb02d0cbf3901c720cef2963d3e3d60b882e))
* numbers — NumberInput reads the locale's marks (K5), SignChip, calculator off, money warning ([839f79a](https://github.com/Eifi1/ui-kit/commit/839f79a4d9a1d74ed232ddff586591cfed1abf58))
* OneTimeCodeInput, CountrySelect, IbanInput, PhoneInput, LanguageSelect ([4adb8e4](https://github.com/Eifi1/ui-kit/commit/4adb8e4983ce31d043becbbee4a83aedd342fb2c))
* pickers — ToggleGroup chrome fix (K1) and strip label, year mode, provider formatDate ([dc268c5](https://github.com/Eifi1/ui-kit/commit/dc268c57448b157c1cb0efe8c5f3e335fe4f5549))
* **rhf:** RhfTimeInput, RhfDateRangePicker, RhfToggleGroup, RhfIbanInput, RhfPhoneInput ([7bbed59](https://github.com/Eifi1/ui-kit/commit/7bbed59ecb7f9f033757033d9e375d87bbe49fed))

### Fixed

* **fields:** a hint coming and going no longer rebuilds the field (keksdose) ([92e0f29](https://github.com/Eifi1/ui-kit/commit/92e0f298e1f36e8ffd1e1de5e3d9d6203dc00028))
* **tour:** a step without a target never keeps the previous step's spotlight (keksdose) ([2ea9606](https://github.com/Eifi1/ui-kit/commit/2ea9606da374e931cca37af33e3721bdf80af042))

## [0.21.0](https://github.com/Eifi1/ui-kit/compare/v0.20.1...v0.21.0) (2026-10-02)

### Added

* **topbar:** TopBarActionMenu href — the trigger is also a link (keksdose dev #585) ([9b60254](https://github.com/Eifi1/ui-kit/commit/9b6025492316096194242dfd4ef31f7d7f9baf82))

## [0.20.1](https://github.com/Eifi1/ui-kit/compare/v0.20.0...v0.20.1) (2026-10-02)

### Fixed

* **i18n:** withAllPlurals returns the catalogue unchanged for a locale Intl cannot read (kastlan) ([b38cd99](https://github.com/Eifi1/ui-kit/commit/b38cd99b83a236db85dc9a2370a81f7159291710))

## [0.20.0](https://github.com/Eifi1/ui-kit/compare/v0.19.0...v0.20.0) (2026-10-02)

### Added

* **i18n:** useUiKitLabels, peekUiKitLabels, withAllPlurals (kastlan) ([0f2087e](https://github.com/Eifi1/ui-kit/commit/0f2087e06e4cec4a2cb28f68c0ed6150a908cc1d))

### Fixed

* **i18n:** formatLocaleOf keeps a tag of a language the kit does not ship (keksdose) ([d0182b0](https://github.com/Eifi1/ui-kit/commit/d0182b0160386875eb091889facca1de71f2ec4a))

## [0.19.0](https://github.com/Eifi1/ui-kit/compare/v0.18.0...v0.19.0) (2026-10-02)

### Added

* **i18n:** kitLabelStrings — the kit's words as rows for an app's translation review (keksdose) ([24fb9d6](https://github.com/Eifi1/ui-kit/commit/24fb9d645fa23c459cace17e02457896486c39c7))
* **i18n:** language registry — resolveLanguage, loadUiKitLabels, formatLocaleOf ([a8caaae](https://github.com/Eifi1/ui-kit/commit/a8caaae2d6ca745147947227e278fabb85da0ce1))
* LegalLayout, LegalSection, LegalLinks — the legal pages' shell for every app (H10) ([2e40e9e](https://github.com/Eifi1/ui-kit/commit/2e40e9ef8e79dbe4a508221a7b3b63f22ce10c89))
* translation review parts — one contract for kastlan's and keksdose's review pages ([1554dec](https://github.com/Eifi1/ui-kit/commit/1554decaaf7da152ca54593d74d124f8c97a3870))

### Fixed

* **i18n:** Spanish and Italian address the reader formally — usted, Lei (Kurvenschmiede) ([9de7d1a](https://github.com/Eifi1/ui-kit/commit/9de7d1aa945061493bc73ec4b891e4092649e299))
* **server-wake:** a download never arms the watchdog; the filter gets the request (kastlan) ([22f1945](https://github.com/Eifi1/ui-kit/commit/22f1945b2dcb93f76476ac19f37e12a1f21d5ddc))
* **server-wake:** the notice rises above a FloatingActionButton under it (kastlan) ([b289c77](https://github.com/Eifi1/ui-kit/commit/b289c770a6a708710f3bd7c4126e14de3eeb0e49))
* **translation-review:** the selected locale tab's count stays readable on the brand fill ([79554c2](https://github.com/Eifi1/ui-kit/commit/79554c2a9ac716e87a3a7339cf8c21a391583a07))

## [0.18.0](https://github.com/Eifi1/ui-kit/compare/v0.17.0...v0.18.0) (2026-10-02)

### ⚠ BREAKING CHANGES

* **i18n:** @eifi1/ui-kit/i18n/de, /i18n/de-informal and /i18n/de-CH-informal
  are gone. UI_KIT_LABELS_DE / uiKitLabelsDe(n) become UI_KIT_LABELS_DE_CH /
  uiKitLabelsDeCh(n); the informal catalogues become UI_KIT_LABELS_DE_CH (an app
  that said "du" moves its own text to "Sie"). See docs/archive/adopt/adopt-0.18.md.

### Added

* Chip snapEdges for fractional-DPR hairlines; Toaster dismissOnMiddleClick (keksdose R1, R2) ([3ff5225](https://github.com/Eifi1/ui-kit/commit/3ff52258cf4e8d4b96a02d616ec46203891c47b0))
* createServerWake and ServerWakeNotice — keksdose's cold-start notice for every app ([9ed3ee1](https://github.com/Eifi1/ui-kit/commit/9ed3ee1e0dae999342eec0be9f7161db3033989b))
* export the 0.18 components; showcase demos, search index, README inventory ([d63efed](https://github.com/Eifi1/ui-kit/commit/d63efedcd626335f2c85873f0af61fa583fb3e83))
* **i18n:** one German, de-CH — the de, de-informal and de-CH-informal catalogues are removed ([52e3301](https://github.com/Eifi1/ui-kit/commit/52e3301a0556f7618e4f2807023cec8f8b54f99a))
* **i18n:** the 0.18 labels through UiKitProvider, translated in every locale ([d466023](https://github.com/Eifi1/ui-kit/commit/d466023aa78899f00182942c5c77c721670b03c3))
* PasskeysSetting mode and beforeAdd; RoleChip, AccountStateChip, DateMark, dateColumn ([fb91e99](https://github.com/Eifi1/ui-kit/commit/fb91e999cd3f15e514a9ad3c052ca07fc33d6190))
* **progress-bar:** legendTone — the legend figures in a text tone (keksdose) ([217858e](https://github.com/Eifi1/ui-kit/commit/217858e79e3ad4edcb5f34e91f6e72079bf03f23))
* ShareCard, ShareDialog, SharePanel — sharing, presentational (Kurvenschmiede 1) ([10d6e10](https://github.com/Eifi1/ui-kit/commit/10d6e106dc990de5e348315ea75ebbd32bb8a4b6))
* typed confirmation in useConfirm (requireTyped); ReauthDialog (Kurvenschmiede 3, 4) ([1761dc0](https://github.com/Eifi1/ui-kit/commit/1761dc0a96b3a769685addf6a7073240fdc323b0))
* WriteLockProvider and commit on Button, IconButton, FormActions; CardTitle compact leading ([f828815](https://github.com/Eifi1/ui-kit/commit/f828815822d45b0bea4d5810595da4bc881ecdb3))

### Fixed

* **fields:** the control survives its error message coming and going — focus, caret, value ([3c7ff78](https://github.com/Eifi1/ui-kit/commit/3c7ff78f88d13f17071005f58259cfd342ea580d))
* **i18n:** missingKitLabels names the missing reference; the doc example passes it (keksdose) ([6fc97c7](https://github.com/Eifi1/ui-kit/commit/6fc97c77820ea0d98953b9928bba6d7b8a14cba8))
* **overlay-history:** an owner's URL rewrite that closes the overlay is not unwound (keksdose #584) ([c66c7c8](https://github.com/Eifi1/ui-kit/commit/c66c7c813860ffd133179940c682121403a17a82))
* **toggle-group:** a disabled group keeps the chosen segment's fill under the pointer ([abe857d](https://github.com/Eifi1/ui-kit/commit/abe857d1507028b778b04a42f4f6c9e4b1a90900))

## [0.17.0](https://github.com/Eifi1/ui-kit/compare/v0.16.1...v0.17.0) (2026-10-01)

### Added

* **card:** density="compact" and toneFill (keksdose Q3) ([d4bef60](https://github.com/Eifi1/ui-kit/commit/d4bef6070f927e048c29504863b06944c3cadbfb))
* **data-table:** a totals row — column footer, footerLabel; a summary card on phones (kastlan 54) ([10a9e96](https://github.com/Eifi1/ui-kit/commit/10a9e96206094564695001360d18d79ad1cf3c1b))
* Delta ratio, ProgressBar sensitive, FormActions per-breakpoint placement and bleed (Q4–Q8) ([1fbe113](https://github.com/Eifi1/ui-kit/commit/1fbe11325d5d6ef390919a20a91a903c5fc859fb))
* **global-search:** one source fills several typed groups from one request (kastlan 56) ([d31589d](https://github.com/Eifi1/ui-kit/commit/d31589de4192674157571aa83fd1533f2cbff8b7))
* **i18n:** @eifi1/ui-kit/i18n/en — uiKitLabelsEn(numberLocale), grouped counts (kastlan 58) ([94a5701](https://github.com/Eifi1/ui-kit/commit/94a57013b549587142d5388528464ee2e3d318de))
* **line-items:** summary status, money tones, link action, inline remove (kastlan 55, Q1, Q2) ([ec5b766](https://github.com/Eifi1/ui-kit/commit/ec5b766de5c204f5f5ce486d84102f3012b5203f))

## [0.16.1](https://github.com/Eifi1/ui-kit/compare/v0.16.0...v0.16.1) (2026-10-01)

### Fixed

* **file-button:** the picked names in the kit Tooltip, not a native title; guard the rule ([047e105](https://github.com/Eifi1/ui-kit/commit/047e10595159c9d239bfd0db00444d7ccbc3d4b0)), dev#523

## [0.16.0](https://github.com/Eifi1/ui-kit/compare/v0.15.5...v0.16.0) (2026-10-01)

### Added

* **forms:** FormActions start/submitProps/submitIcon/stickyWithin; LoadingState; small fields ([34cae07](https://github.com/Eifi1/ui-kit/commit/34cae071e3b71f710cfc79b73dfaa0cb2bee06e1))
* **line-items:** a toned summary with an action, floating labels, two fields a row on phones ([a93e685](https://github.com/Eifi1/ui-kit/commit/a93e685f4643d02779f60c42382d61d8a27d7239))
* **list:** ListItem content, overline, metaWrap, renderRow, trailingTone, expandable rows ([410bbfc](https://github.com/Eifi1/ui-kit/commit/410bbfc8612befbda4a0e68d0f971a1bbb4ea4e5))
* **signals:** Delta money palette and flat band; statusDotColor; signed legend values ([cb21a99](https://github.com/Eifi1/ui-kit/commit/cb21a99538a1ffa10d100181563d6c5607bf3274))

### Fixed

* **card,stat-tile,icon-button:** parts follow Card padding; StatTile variants; IconButton pending ([8823fa1](https://github.com/Eifi1/ui-kit/commit/8823fa1f291b00fc54211e6edc996ab16762ea53))
* **feedback,passkeys,table:** two adds in one tick; screenshot chip; refs on Table parts ([553602f](https://github.com/Eifi1/ui-kit/commit/553602f518cd700c84cb3b4b6556bc2d9607ac4f))

## [0.15.5](https://github.com/Eifi1/ui-kit/compare/v0.15.4...v0.15.5) (2026-10-01)

### Added

* **feedback:** several attachments — a multiple field and a multiple dialog ([becf6bd](https://github.com/Eifi1/ui-kit/commit/becf6bd24825bac7e938834341284c1fff95cff9))

### Fixed

* **amount-input:** draw `negative` without onNegativeChange ([d4ad7b6](https://github.com/Eifi1/ui-kit/commit/d4ad7b64140d2b6a9b35a6261e45c318a5b7d323))
* **tokens:** dark --danger-border joins its family; --danger-border-strong keeps the error line ([c23560d](https://github.com/Eifi1/ui-kit/commit/c23560dcac53ee0010384d9f2b1aa964ed5a8414))

## [0.15.4](https://github.com/Eifi1/ui-kit/compare/v0.15.3...v0.15.4) (2026-10-01)

### Added

* **series-chart:** tooltip.placement — a readout row above or below the plot on phones ([8f3d891](https://github.com/Eifi1/ui-kit/commit/8f3d8910513ee7451ebe45a958e86053cefb38d9)), live #359

### Fixed

* sticky FormActions on the phone nav; Chip rows; unit-sized padding; currency rounding ([013c17f](https://github.com/Eifi1/ui-kit/commit/013c17ff07b00b12f56ea1bc6fae757af18fb86b)), live #367, #361, #358, #356

## [0.15.3](https://github.com/Eifi1/ui-kit/compare/v0.15.2...v0.15.3) (2026-09-28)

### Fixed

* **chart:** the tooltip clamps itself into the viewport after recharts places it ([a35d3f9](https://github.com/Eifi1/ui-kit/commit/a35d3f9dc2f4d5e40354cccc3e591a5c9f49d72d))

## [0.15.2](https://github.com/Eifi1/ui-kit/compare/v0.15.1...v0.15.2) (2026-09-28)

### Added

* **table:** stack="phone" — a table of prose becomes labelled blocks on a phone ([16dcdfb](https://github.com/Eifi1/ui-kit/commit/16dcdfb8142a309e77bc95b8284ce2edae661871))

### Fixed

* **alert-banner:** a box with an action wraps it under the message on a phone ([d5e5b0e](https://github.com/Eifi1/ui-kit/commit/d5e5b0e79c9e7894cdfcf319058a172bacafef78))
* **chart:** no doubled unit on a label that has it; the tooltip fits a phone ([c59f2f8](https://github.com/Eifi1/ui-kit/commit/c59f2f847ad5f5454f4d9d06f79eb42042a04fd9))
* **tabs,toggle-group:** no tab outgrows its strip; ToggleGroup overflow="wrap" ([cf0b724](https://github.com/Eifi1/ui-kit/commit/cf0b724efce3fc0aad6b6544c745eeaf3c166625))

## [0.15.1](https://github.com/Eifi1/ui-kit/compare/v0.15.0...v0.15.1) (2026-09-27)

### Fixed

* **series-chart:** an axis budget — one axis a side when the plot would be crushed ([14f31ae](https://github.com/Eifi1/ui-kit/commit/14f31ae4bb6fd448fffa24fa80b6e5f935c6b105))
* **slider:** the header wraps, so a wide readout drops below the label, not over it ([69f6984](https://github.com/Eifi1/ui-kit/commit/69f6984475fc0404a0c7268d90e07fb4bab50d1f))

## [0.15.0](https://github.com/Eifi1/ui-kit/compare/v0.14.2...v0.15.0) (2026-09-27)

### Added

* AppShell mobileSubNavLayout="scroll"; Tabs' add button is a lone + on phones ([b84c021](https://github.com/Eifi1/ui-kit/commit/b84c021a6ac42e9f70678be26b04fa1c943678dd))

### Fixed

* **charts,media,wizard:** treemap ink, edge labels, strip wrap, heatmap weekdays, file names ([8f4385e](https://github.com/Eifi1/ui-kit/commit/8f4385e720b6fe9ca4602fbab13b07ef71086e7f))
* **data-table,bulk-action-bar:** fillHeight bounds phone cards; the bar wraps, not crushes ([17825d0](https://github.com/Eifi1/ui-kit/commit/17825d0bc0ec96be49442a40a5e8c3ef34bd51a3))
* **fields:** picker triggers keep their height; text hints are captions; tabs fade and follow ([6f554fb](https://github.com/Eifi1/ui-kit/commit/6f554fbbecf412329c1b5cd2eb22e3f06a81df65))
* filter date panel on phones, select rows, even ticks, image fallback, bidi isolation ([0441dd0](https://github.com/Eifi1/ui-kit/commit/0441dd072cc8d48c84b1b8f5b066168b0c4ac3db))

## [0.14.2](https://github.com/Eifi1/ui-kit/compare/v0.14.1...v0.14.2) (2026-09-27)

### Added

* IntegerField, MoneyField and AmountInput onCommit (kastlan 51, 52) ([054e159](https://github.com/Eifi1/ui-kit/commit/054e1590fcec5674105806768d5bd9da00a0205b))

### Fixed

* **feedback-dialog:** requireBody={false} for title-only reports; blank subjects never send ([661dc57](https://github.com/Eifi1/ui-kit/commit/661dc574d31168b4cb1bb5815fe51c3a8076b56c))
* **page-header:** secondaryActions share the actions' wrapped row on a phone ([7f72813](https://github.com/Eifi1/ui-kit/commit/7f72813df7199811ffccb82272c230931e569adc))

## [0.14.1](https://github.com/Eifi1/ui-kit/compare/v0.14.0...v0.14.1) (2026-09-27)

### Fixed

* **page-header:** keep the title's words in inline, align the whole row ([fba2c5b](https://github.com/Eifi1/ui-kit/commit/fba2c5bf667b423619fba6bbd991da09284509f4))

## [0.14.0](https://github.com/Eifi1/ui-kit/compare/v0.13.1...v0.14.0) (2026-09-27)

### Added

* **error-boundary:** placement — which boundary caught it, in the report and fingerprint ([36f5065](https://github.com/Eifi1/ui-kit/commit/36f5065a890152c5ecd7ca220a87e9fb9e22d0e0))
* **feedback:** event rows, day separators, clock times; sendOn, attachmentSlot, canSend ([eb93608](https://github.com/Eifi1/ui-kit/commit/eb936087f9c999cf371728b3d3beb4a034c278ba))
* **page-header:** truncateTitle, secondaryActions row, actionsAlign (keksdose G6, G8) ([2395783](https://github.com/Eifi1/ui-kit/commit/2395783fe8a1f5d50ff4a65dcc328a724dd2fd00))
* **tooltip:** clamp the in-place bubble to the viewport when it opens (keksdose G7) ([7ab6eb1](https://github.com/Eifi1/ui-kit/commit/7ab6eb130e15959c500009b28b29586546594bff))

## [0.13.1](https://github.com/Eifi1/ui-kit/compare/v0.13.0...v0.13.1) (2026-09-27)

### Fixed

* **amount-input:** read grouping marks by locale — 1.234,56 is 1234.56, not 1.23 ([8e18f1c](https://github.com/Eifi1/ui-kit/commit/8e18f1c2634e16fde22cf770deb7146b86157b23))
* **error-boundary:** quote a thrown plain object as JSON when it has no message ([38239f4](https://github.com/Eifi1/ui-kit/commit/38239f40e135d66e8edc2c9ed3f329139db9f19c))
* **format:** ±Infinity prints the missing placeholder, not ∞ (lenkbank) ([9a08ceb](https://github.com/Eifi1/ui-kit/commit/9a08ceb791b2b83ec451f99cc97e67cee44cbb69))
* **section-label:** no literal class names in a comment — Tailwind scanned them ([95afc55](https://github.com/Eifi1/ui-kit/commit/95afc559e752367510fbc2a02c8384f273b22093))

## [0.13.0](https://github.com/Eifi1/ui-kit/compare/v0.12.0...v0.13.0) (2026-09-27)

### Added

* **display:** ToggleGroup pressed semantics, zero deltas, end legend entry, bar links ([64fd784](https://github.com/Eifi1/ui-kit/commit/64fd7847513ac1cce1f5824a779fbdf2bc701a8b))
* **error-boundary:** one crash screen — message, copy report, onReport, chunk/offline ([2e27c3f](https://github.com/Eifi1/ui-kit/commit/2e27c3f671cb7b93d3455792b83ee248f71b9d8d))
* **forms:** locale decimal mark, RhfIntegerField, inputClassName, WizardStep actions, unit ([a47e2ac](https://github.com/Eifi1/ui-kit/commit/a47e2ac570573ca5aa1fbdb15d9ad7c5c829b743))
* **layout:** PageHeader compact + mobileLayout, SectionLabel band, ListItem titleLines ([8faef61](https://github.com/Eifi1/ui-kit/commit/8faef615e17de7af870c3448ed56aa6486f8846a))
* **links:** replace, reloadDocument, IconButton href, TextLink tones, toneColor pair ([813534b](https://github.com/Eifi1/ui-kit/commit/813534b365dfb7e3a3916c5a999167f52a109ed5))
* **shell,feedback:** header.extra(close), FeedbackComposer insertText and placeholder ([c3f4a6f](https://github.com/Eifi1/ui-kit/commit/c3f4a6ffaa3c2bd045c27f019e84be2d51fc7c38))
* **tooltip:** lazy — in place, but absent until hover or focus (keksdose F6) ([eee4705](https://github.com/Eifi1/ui-kit/commit/eee4705b06b06a79c7ff60bd2df774a41f471c70))

### Fixed

* **amount-input:** settle money to the currency's minor unit; digits, min, max ([b988420](https://github.com/Eifi1/ui-kit/commit/b9884207bbd3c2840d8a7389daf240804a196fa0))
* **feedback-thread:** full date in the kit Tooltip instead of a native title ([ffea4a0](https://github.com/Eifi1/ui-kit/commit/ffea4a005a2a74c4abfe844b0714d3ba78f70128)), dev#523
* **rhf:** disabled keeps the value; excludeWhenDisabled opts into RHF's drop ([d72b886](https://github.com/Eifi1/ui-kit/commit/d72b8867745312d82f81e165d5a4aec1ffe365ef))

### Changed

* clear every lint warning in feedback, search, shell, tour, wizard, showcase ([21a97ad](https://github.com/Eifi1/ui-kit/commit/21a97ad83ecc47e63c688c3acc575fb8cff261a3))
* clear every lint warning in src/components ([f139b22](https://github.com/Eifi1/ui-kit/commit/f139b2207b6d7aa4d6031e581d7ba71a03c6c469))
* **feedback-thread:** use the kit's formatRelativeTime ([7e37a39](https://github.com/Eifi1/ui-kit/commit/7e37a39b9749ce45309ec46266b1370476f34109))

## [0.12.0](https://github.com/Eifi1/ui-kit/compare/v0.11.0...v0.12.0) (2026-09-26)

### Added

* 0.12 — links, forms, tables, formatters, charts, media, auth shell, settings ([f1e9954](https://github.com/Eifi1/ui-kit/commit/f1e99546c56cf84798c935a62b14be69a45011e7))
* kastlan 32–39 — SearchField clear by default, Field label visibility, more ([b9bf925](https://github.com/Eifi1/ui-kit/commit/b9bf9250ce0ee127c12e7c5a7de1646e62c9ceb6))
* **provider:** linkComponent — the app's router link, set once for every kit link ([45987b7](https://github.com/Eifi1/ui-kit/commit/45987b78dd2c89c1d180f53425cae0073c98ac9e))

### Fixed

* **copy-button:** leave tooltipPortal unset so the Tooltip auto-portals in tables ([9305a79](https://github.com/Eifi1/ui-kit/commit/9305a799c2918ac1fcfa3763598773a7935b2c5c))
* Field's id/aria spread lands on the focusable control in every picker ([8672a5e](https://github.com/Eifi1/ui-kit/commit/8672a5e6fd0adc9958d1176f56d6e30a7f2c58e9))
* PieChart key warning, consistent link routing, ErrorBoundary resetKeys, deep label overrides ([2fc1522](https://github.com/Eifi1/ui-kit/commit/2fc1522d8f84942f94dc5edad0be108e55de3c3b))

## [0.11.0](https://github.com/Eifi1/ui-kit/compare/v0.10.0...v0.11.0) (2026-09-26)

### Added

* 0.11 — floating chrome, account menu, calendars, Field, rhf wizard steps ([6b46828](https://github.com/Eifi1/ui-kit/commit/6b46828becf92c51317540283f14e40fc68c03f2))
* keksdose's 0.10 feedback — bulk bar panel/open/responsive and more ([014cb83](https://github.com/Eifi1/ui-kit/commit/014cb83e4e2fc01bdbdf56b63b7711684a9627a6))
* **list:** ListItem targetProps (e.g. drag-and-drop on the row) and bordered ([24be17d](https://github.com/Eifi1/ui-kit/commit/24be17d8274d71ddc8c16564d95c59fe9d696c00))
* **status-dot:** Chip's categorical hues, so a dot matches its Chip ([b64ffdc](https://github.com/Eifi1/ui-kit/commit/b64ffdccad2aebfed3514fdf6a716d21d5c7b3d1))

### Fixed

* avatar trigger name docs, heatmap stays on latest weeks on resize, segment fallback colours ([922d4fe](https://github.com/Eifi1/ui-kit/commit/922d4fee1a81fc7eaecd93a13dbf6a1bd717f617))

## [0.10.0](https://github.com/Eifi1/ui-kit/compare/v0.9.0...v0.10.0) (2026-09-26)

### Added

* 0.10 props from the apps' audits across buttons, surfaces, dialogs and charts ([91c43db](https://github.com/Eifi1/ui-kit/commit/91c43db5d9efcb159a8328d1a5496b4fe53473e4))
* **copy-button:** size for the label variant, tone, stopPropagation ([4f6ad07](https://github.com/Eifi1/ui-kit/commit/4f6ad072d134e535169dba61fcbe2dce65307306))
* **global-search:** triggerName="withShortcut" puts the shortcut in the trigger's name ([a65f680](https://github.com/Eifi1/ui-kit/commit/a65f680c65301fa8c435e0f36deab2d5d1cc2b1d))
* List, MenuItem, text primitives, StatusDot, PageHeader, Breadcrumbs, BulkActionBar ([fcbff0b](https://github.com/Eifi1/ui-kit/commit/fcbff0b1a2b6b3d84e34c8072bddc1ddc3a09718))
* **toast:** kit Toaster and a sonner-shaped toast API ([f555554](https://github.com/Eifi1/ui-kit/commit/f5555549d3eee38dd00ff082265c8e76f394bf63))

### Fixed

* **alert-banner:** a strip wraps its action under the text on narrow screens ([c3291d5](https://github.com/Eifi1/ui-kit/commit/c3291d5d905d785755fce6bcb79a73a48ef49976))
* **command-palette:** optional-call scrollIntoView so jsdom test suites do not crash ([db3021d](https://github.com/Eifi1/ui-kit/commit/db3021d50545bd4f11621a62344dd46b8c304c67))
* no native title on WizardSummary's edit button or the contents rail ([7203ffc](https://github.com/Eifi1/ui-kit/commit/7203ffce6e143a99e1c6fe8c66cd2a4f7e37129a)), dev#523

## [0.9.0](https://github.com/Eifi1/ui-kit/compare/v0.8.1...v0.9.0) (2026-09-25)

### Added

* doneDisabled, FAB nativeTitle/pressed, EmptyState headingAs, quiet tones ([ee415d5](https://github.com/Eifi1/ui-kit/commit/ee415d5078cb41bd4f816d26327acaa3fba66152))
* **i18n:** commandPalette clear/submit/close in every shipped language ([33591c5](https://github.com/Eifi1/ui-kit/commit/33591c5e03dc2d76ab8a955ac178ec221ebd46ed))
* palette submit mode, DataTable cellProps, DateRangePicker sheet and trigger ([7eef176](https://github.com/Eifi1/ui-kit/commit/7eef1768a92871111bd12f21774d3aa9ac1cc742))
* **search:** GlobalSearch and createSearchIndex; the showcase's ⌘K search ([81cd71f](https://github.com/Eifi1/ui-kit/commit/81cd71f7029d8e97ce96c1218000009873cca490))

### Fixed

* **overlay-history:** navigating from an open overlay no longer bounces back ([3d63c87](https://github.com/Eifi1/ui-kit/commit/3d63c8799f0570438eb2d2d23491e7bae72749b0))

## [0.8.1](https://github.com/Eifi1/ui-kit/compare/v0.8.0...v0.8.1) (2026-09-25)

### Fixed

* **full-bleed-dialog:** only the caller's own preventDefault claims Escape ([c9cbb76](https://github.com/Eifi1/ui-kit/commit/c9cbb767c084877091855f434405c2c61ea2dd1f))
* **treemap:** pass labelColor through to the cells ([f057719](https://github.com/Eifi1/ui-kit/commit/f057719454e20d67d5150242a6628f8301bc84bc))

## [0.8.0](https://github.com/Eifi1/ui-kit/compare/v0.7.1...v0.8.0) (2026-09-25)

### Added

* 0.8.0 components and props from the apps' 0.7 audits ([007f234](https://github.com/Eifi1/ui-kit/commit/007f234dc4d89d3f05172ce3b1c234ceedb157f7))
* Button sm, IconButton pressed/info, Disclosure triggerProps, chart and tile fits ([bb84aee](https://github.com/Eifi1/ui-kit/commit/bb84aeed11abd522be1d03a84389f3cbd3b459ac))
* **chart:** angled x ticks, tooltip containment, per-series hover dot ([67dcb8b](https://github.com/Eifi1/ui-kit/commit/67dcb8bac00a79a384279041937265a0778d29a8))
* **chart:** legend entries draw a custom dash array as the series does ([cd7a63c](https://github.com/Eifi1/ui-kit/commit/cd7a63c779dbe2bd98e19ee0aa27e65c19f29665))
* **chart:** SeriesChart bars, areas, category/time axes, references, dots ([ec5d96d](https://github.com/Eifi1/ui-kit/commit/ec5d96d7850873f7f576318a6f411c1f127fccec))
* **data-table:** keyboard rows, sort cycle, minimal chrome, frameless mode ([9226ec8](https://github.com/Eifi1/ui-kit/commit/9226ec85c696ba7aac9b8e141b647894ae189c36))
* **i18n:** informal German (`du`) catalogues ([abae625](https://github.com/Eifi1/ui-kit/commit/abae6251a1ff6a7d505811e55cdc7ddf6a23537f))
* **wizard:** commit step with steps after it, optional URL sync and Cancel, custom Finish ([a1b014b](https://github.com/Eifi1/ui-kit/commit/a1b014bfa2e129f25f58736820e1ae2d711fe087))

### Fixed

* **full-bleed-dialog:** compose the caller's onKeyDown; header slot stretches ([5efad64](https://github.com/Eifi1/ui-kit/commit/5efad64cbba83cb43b50f77bece9257a7986c43b))

## [0.7.1](https://github.com/Eifi1/ui-kit/compare/v0.7.0...v0.7.1) (2026-09-25)

### Added

* **tooltip:** logical `start` / `end` sides that follow the reading direction ([fa60939](https://github.com/Eifi1/ui-kit/commit/fa609392a84670c6675e17a5d7e8b8e508d55b65))

## [0.7.0](https://github.com/Eifi1/ui-kit/compare/v0.6.1...v0.7.0) (2026-09-25)

### ⚠ BREAKING CHANGES

* **adopt:** 0.7.0 changes behaviour and types an app can depend on — migration per app in docs/archive/adopt/adopt-0.7.md.
  - New required label keys `filePicker.rejectedTypeOnly` and the namespaces `measuredGrid` and `feedbackAttachment` for apps typing a complete `UiKitLabels` (or import `@eifi1/ui-kit/i18n/<code>`).
  - With `accept` set, a refused type reads "Only .pdf files" instead of naming the file (a host that translated only `rejectedType` keeps its sentence).
  - `HoverMenu` is a real menu: items are `role="menuitem"`, its `aria-label` is on `role="menu"`, default `align` is `"end"`.
  - `FileDropzone` is a `role="group"`; the keyboard path is its Browse button.
  - `Chip`: `href` and `onClick` are mutually exclusive; `onClick` without `selected` reports no `aria-pressed`.
  - `ChartTooltip` defaults to `filterNull={false}`: a missing value shows "—".
  - `DataTable`: controlled `filters`/`sorts` reset the page to 1; standalone `Pagination` shows the page-size select only with `onPageSize`.
  - Field chrome, pickers, chips, table and shell emit logical classes (`pe-*`, `end-*`, `text-start`): a physical `pr-*`/`right-*` override now adds a side instead of replacing it.
  - `ToggleGroup` radio mode is one tab stop with arrow keys; `Tour` blocks clicks outside its card and target.

* **adopt:** per-app adoption notes for 0.7.0 ([a6f165e](https://github.com/Eifi1/ui-kit/commit/a6f165e80fa0df159da50f46b7b9bc8c387adc81))

### Added

* **0.7.0:** app follow-ups and the screen-size preview ([5b9632e](https://github.com/Eifi1/ui-kit/commit/5b9632e091a80f560adaec513cbbd1bc87e2cbd7))
* **0.7.0:** MeasuredGrid, useMeasuredRows, useWindowedRows ([762403b](https://github.com/Eifi1/ui-kit/commit/762403b897c68686203a7bd285fa0e6b8f8e9c62))
* **i18n:** ship the kit's translations as @eifi1/ui-kit/i18n/<code> ([bc8b615](https://github.com/Eifi1/ui-kit/commit/bc8b615362ba53c592869e83ac5ad3a3223c43f9))

### Fixed

* **0.7.0:** RTL across the kit, overlay/field/shell bug fixes, kastlan asks ([11bcf91](https://github.com/Eifi1/ui-kit/commit/11bcf9178be981c782716c76317143958ccbd960))
* **chart:** swatches match paint, missing values show, nice ticks, RTL ([0080acd](https://github.com/Eifi1/ui-kit/commit/0080acdf234f8fa105532b2b79b714c8ec85516d))
* **chip:** no aria-pressed unless `selected` is passed; action-button guidance ([22cf73a](https://github.com/Eifi1/ui-kit/commit/22cf73aa1b81370e7cee132fae4651a56a1aaee4))
* **data-table:** loading state, range select, urlSync under any router, RTL ([8093d76](https://github.com/Eifi1/ui-kit/commit/8093d76d6e1e65c0cc8aba3f8914f4feb889a973))
* **toggle-group:** radio mode is one tab stop with arrow keys (RTL-aware) ([6cf96ba](https://github.com/Eifi1/ui-kit/commit/6cf96ba2f353bdcb2d36ae229e57c3e40f1eeee7))

## [0.6.1] — 2026-09-24

### Added

- **`Checkbox required` and `Switch required`** — for a box that must be ticked (a
  consent, an acceptance before paying). The native `required` reaches the input, so a
  `<form>` refuses to submit it unticked and a screen reader announces "required"; the
  kit's `aria-hidden` star follows the label text, as `Label required` draws it. Write
  the label without a literal "*". No mark without a label.

### Fixed

- **Untyped files were refused (regression in 0.6.0).** `matchesAccept` read an EMPTY
  MIME type as a wrong one, so HEIC photos on Windows without the codec — which arrive
  with `type === ""` — were refused by `accept="image/*"` on Browse and camera picks.
  A missing type is now inferred from the extension where unambiguous (HEIC/HEIF,
  JPEG, PNG, WebP, AVIF, PDF, CSV, text), and a type that cannot be known is not
  refused on MIME grounds. Extension-only accept lists still judge by name (keksdose).
- **`Autocomplete`: an Escape that closes the open list reached the caller's
  `onKeyDown`.** A caller whose Escape closes its panel closed the whole panel when the
  user meant to dismiss the suggestions. That Escape is now consumed; with the list
  closed, Escape reaches the caller as documented (keksdose).

## [0.6.0] — 2026-09-24

The inputs keksdose, kastlan and lenkbank still hand-rolled after adopting 0.5 — proposed
by each app from its own code, merged into one API each. Per-repository adoption:
`docs/archive/adopt/adopt-0.6.md`.

### Added

- **Files:** `FileButton` and `useFilePicker` (accept, multiple, camera `capture`,
  `maxFiles`/`maxSize`, refusals through `onReject` and spoken — never a toast; the input
  resets after every pick). `FileDropzone`: resets after a pick, `multiple` + `files`,
  `onClear` / per-file remove, optional `isValid`, `rejectionFeedback`
  (`"toast"` default, `"inline"`, `"none"`).
- **`Autocomplete`:** an inline input with a suggestion list — free text that keeps what
  is typed (an address) or search-then-act (`onSelect`, `fillOnSelect={false}`);
  `loadOptions` with `debounceMs` / `minChars`, caller-ranked `options` with
  `filter={false}`, error and status lines, APG combobox semantics.
- **Combobox family:** `error` on all of them, `disabled` on `Combobox`; `filter`,
  `minChars`, `debounceMs`, `loadErrorLabel` on the entity comboboxes.
- **Field anatomy:** `Label` (above-the-field, `required` star); `Select size="sm"` and
  `selectClassName`; `IconButton size="xs"|"2xs"`, `tone="danger"|"muted"`,
  `stopPropagation`; `Tabs` with `onRemove`, `onAdd`, per-tab `icon` / `detail` / `empty`;
  `SearchField variant="inline"` and `inputClassName`.
- **Selection:** `SwatchPicker` and `IconPicker` (radio groups with roving focus, optional
  "none", a mixed state, search on the icon grid); `ChoiceCard` / `ChoiceCardGroup`;
  `Chip size="lg"` (44px) and `income` / `expense` tones; `ToggleGroup allowEmpty`.
- **Numbers:** `NumberField onValueChange` (live, every keystroke); `step` with
  ArrowUp/Down and PageUp/Down on `NumberField` and `NumberInput`, decimal-exact;
  `stepNumber`.
- **`DangerConfirm`:** arm, then confirm with a password and/or a typed phrase.
- **`SignatureView`:** a saved signature (PNG or typed name) read-only.
- **`Disclosure` / `Collapse`:** a folding section, the sidebar's animation as a component.
- **`DialogFrame`:** the title-body-actions frame around `Modal`, with the heading and
  description wired to the dialog.
- **`<UiKitProvider weekStartsOn>`** and `useKitWeekStart`.
- **`@eifi1/ui-kit/rhf`** — an optional react-hook-form adapter (`Form`, `FormField`,
  `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`,
  `useFormField`). `react-hook-form` is an optional peer; nothing else imports it.
- **`@eifi1/ui-kit/table-text`** — pure table parsing (`parseTable`, `parseRows`,
  `splitRow`, `cellNumber`, `isCellNumber`) with named decimal-comma rules.
- Label namespaces: `filePicker`, `dialogFrame`, `tabs`, `dangerConfirm`, `swatchPicker`,
  `iconPicker`; new keys in `combobox` and `signaturePad`. The showcase translates all.

### Fixed

- `Input`, `Select`, `Textarea` paint invalid from a caller's `aria-invalid`, as
  `NumberField` and the pickers did — so a form library's control slot is enough.
- Entity comboboxes: a failed `loadOptions` no longer leaves stale rows and an unhandled
  rejection; a disabled `InlineEntityCombobox`'s chevron no longer opens the list.
- The sidebar's open-group chevron pointed up under `dir="rtl"`.

### Changed — review before upgrading

- **New required keys in existing namespaces** (`combobox.loadError`,
  `combobox.resultCount`, `combobox.minChars`; `signaturePad.viewEmpty` / `viewDrawn` /
  `viewTyped`): an app that types a COMPLETE translation as `UiKitLabels` must add them.
  Partial overrides are unaffected.
- `ToggleGroupProps` is a union type now (for `allowEmpty`); `interface … extends
  ToggleGroupProps` no longer compiles. No app does this.
- Entity comboboxes render their loading / empty / error line in a status region after
  the listbox instead of inside it.
- `FileDropzone` returns a fragment (the zone plus two live regions); `file` and
  `onFileSelected` are optional.
- Public surface 303 -> 326 exports, plus the two new entries (8 and 5).

## [0.5.1] — 2026-09-24

Fixes found by the three apps while adopting 0.5.0 — two accessibility regressions of
0.5.0 among them. No breaking changes.

### Fixed

- **`Spinner` announced twice, and ran into button names.** 0.5.0 made it a status
  region with a hidden "Loading…" in every use. Beside visible text that read "Loading…
  Loading…" (lenkbank); inside a button it became part of the button's name,
  "Loadingconfirm" (keksdose). `label={null}` now makes it decorative — no role, no
  text, hidden — and the hidden text carries a separator for the case it is forgotten.
- **`CurrencySelect` had no accessible name** unless the caller passed `aria-label`: the
  floating label is a span, and a combobox takes no name from its content. It is now
  named "label: code" like `MultiSelect`, falling back to the `currency` word.
- **`DatePicker`, `DateRangePicker` and `MonthPicker` could not be named from outside.**
  `id` and `aria-label` / `-labelledby` / `-describedby` / `-invalid` landed on the
  wrapper; they now reach the `role="combobox"` trigger, so `<label htmlFor>` and a form
  library's control slot work. An external label is spoken before the value.
- **`Chip`'s types** rejected `aria-describedby`, `aria-expanded`, `aria-controls`, `id`
  and `title` (spread at runtime all along), and `onClick` received no event, so a chip
  in a clickable row could not stop propagation. Both fixed; the comment that called
  `data-*` the escape hatch for ARIA is gone.

### Changed

- `popover.panel`'s English default is "Pop-up" (was "Popover", a developer's word read
  to users). The showcase's German and Italian dictionaries translate it.
- `Chip`'s `selected` doc: a toggle's label must not change with its state.
- `docs/archive/adopt/adopt-0.5.md`: the notes the three apps found while adopting (Spinner, MultiSelect
  rows as options, toggle-chip labels, the translating wrappers, naming the pickers).

## [0.5.0] — 2026-09-23

The first release since 0.4.1, in two parts that were prepared separately and ship
together (a 0.5.0 was cut on 2026-09-22 and never published). Coming from 0.4.1, read
both.

1. **Everything the three apps were hand-rolling that a design system should own**, and
   one mechanism for translating all of it — the sections immediately below.
   Per-repository adoption steps: `docs/archive/adopt/adopt-0.5.md`.
2. **A full audit of the package *as a published module***
   (`docs/module-audit-2026-09-22.md`, 104 confirmed findings): every defect that reached
   consumers in 0.4.x, and the gate that should have caught it — from "Breaking" on.

### Added — components the apps hand-rolled, and one i18n mechanism

- **i18n: `UiKitProvider`, `UiKitLabels`, `DEFAULT_UI_KIT_LABELS`, `missingKitLabels`.**
  Every string the kit renders is a key in one typed tree; mount the provider once with
  `labels` and `locale` and every component below speaks that language — including
  components nested inside others, which no prop could reach before. Precedence: a
  component's own prop > provider > English default. The provider's `locale` reaches every
  `Intl` formatter (calendar names and digits, week start, counts, file sizes).
- **Inputs:** `Checkbox`, `Switch`, `Slider` (linear/log, marks), `TimeInput`,
  `NumberField` (value is a number: commit on blur/Enter, `digits`, `min`/`max` clamp,
  `nullable`, locale decimal mark), `MonthPicker` (`"YYYY-MM"`), `SignaturePad`,
  `PasswordStrengthMeter` (+ `scorePassword`, `passwordRules`, `passwordByteLength`).
- **Data display:** `StatTile` / `StatTileGrid`, `Sparkline` (SVG, no recharts).
- **Navigation:** `PageContents` ("On this page", as a sticky rail or a disclosure),
  `PageContentsLayout` (`position="start" | "end"`) and `useScrollSpy`.
- **Charts (`@eifi1/ui-kit/chart` and the barrel):** `Treemap` (keksdose's tile chart),
  `SeriesChart` / `StaticSeriesChart` with drag-to-zoom (`withChartZoom`, `SharedXZoom`,
  pure zoom maths), `ToggleLegend`, and the facing-pair axis geometry (lenkbank).
- **`AppShell subNav="inline"`:** a group's pages as an animated disclosure under the
  entry instead of a hover flyout. A group entry is now highlighted while ANY of its
  pages is current (it lost the highlight on every page but the one it linked to).
- **The phone's second nav row (`AppShell mobileSubNav`, default on):** below `md`, the
  current group's `items` appear as a scrollable row of pills above the bottom bar — the
  counterpart of the sidebar's second level; before, a group's pages were unreachable
  on a phone. The bar's group is marked on its sub-pages too. `--app-nav-h` measures
  both rows, and `<main>`'s bottom clearance now follows it instead of a fixed `pb-20`.
- **`FieldSyncRow` shows state as the field's frame colour and an icon at the field's
  end** — pencil (edited, amber), spinning circle (pending), a green check that fades
  after `FIELD_SYNC_SAVED_MS` (saved), an alert mark whose tooltip is the reason and
  whose click retries (error). The field never changes size. It saves on BLUR
  (`saveOnBlur`, default true).
- **`ChartLegendContent hiddenKeys`:** a toggle legend — each entry switches its own
  series, any number can be off, entries report `aria-pressed`. Pair with
  `toggleHidden`. `activeKey` (isolate one) still works.
- **The inline sidebar is an accordion:** one group open at a time; opening another
  closes the first, both folds animated. Sidebar labels wrap instead of truncating.
- `MiniCalendar weekStartsOn`, defaulting to the locale's own first day.

### Fixed — layout and hardcoded English

- **A second, empty scrollbar beside the app shell.** Any absolutely positioned child of
  `<main>` (every `sr-only` span) escaped to the document; `<main>` is now a containing
  block.
- The date range is drawn as one continuous band with round ends, and the calendar fills
  the panel beside the presets.
- Hardcoded English that no prop could replace: the "Popover" panel name inside the data
  table, date picker and calculator; the calendar inside the data-table date filter; the
  calculator's "C" and operator keys; "KB" file sizes; the wizard's error toasts; `": "`
  and `", "` compositions (now `common.fieldValue` / `Intl.ListFormat`).

### Changed — review before upgrading

- `peerDependencies.recharts` is now `>=3.8` (the zoom uses `useXAxisInverseScale`).
- `Treemap` takes `value` where keksdose's `CategoryTreemap` took `total`; `currency` is
  gone in favour of `valueFormatter`.
- `NumberPadSheet`'s default accessible name is "Calculator" (was "Number pad").
- File sizes use decimal units via `Intl` ("2 kB", was "2 KB").
- Phone picker sheets show "No results" by default when nothing matches.
- `MiniCalendar` follows the locale's week start: en-US grids now start on Sunday.
- `SeriesChart` shows "No data" when empty; pass `empty={null}` for the old blank.
- **`useFieldSync`'s `debounceMs` defaults to `0`** (was 600): no auto-save while typing.
  Saves happen on blur (FieldSyncRow does it) or `save()`. Pass a positive value to
  keep the old behaviour.
- `--status-edited` is amber (`#d97706` / `#fbbf24`), not orange-800/400; it is a
  graphic colour now, so `FieldSyncIndicator` prints its words in `--text-secondary`.
- The chart tooltip swatch prefers the data point's own `fill` over the series colour
  (treemap tiles and per-cell bars now show their real colour).
- `.animate-drill` fades instead of scaling under `prefers-reduced-motion`.
- The tarball no longer carries the test files under `src/` (`!src/**/__tests__`):
  438 files / 1.1 MB instead of 529 / 1.3 MB. `src` itself still ships, for the source
  maps and for a Tailwind `@source` pointed at it.
- Public surface 212 -> 303 exports (/chart 12 -> 50), all additive.


### Breaking

- **`recharts` and `react-router` are now REQUIRED peer dependencies.** They were declared
  optional, but both are top-level imports in modules the barrel re-exports, so
  `import { Button } from "@eifi1/ui-kit"` never resolved without them — reproduced as
  `ERR_MODULE_NOT_FOUND`, and as a failing `vite build`, because Rollup resolves the module
  graph before it shakes it. The declaration was simply false.

  *Migration:* nothing, if you already depend on both — kastlan, lenkbank and keksdose all
  do, which is why none of them ever hit this. A new consumer runs:

  ```bash
  npm install recharts react-router
  ```

  `sonner` remains genuinely optional: it is only ever reached through `await import()`.

### Added — a derived colour system

- **`derivePalette({ anchors, mode })`** builds a whole palette from one brand colour,
  with every contrast ratio **solved and then measured** rather than chosen and hoped
  for. Pin as many colours as you like — `brand` is required, and `accent`, `danger`,
  `warning`, `success`, `info` are optional hard points; whatever is left is placed away
  from what you pinned. It returns the tokens, the semantic set, a **contrast audit**, and
  **warnings in plain words** for every compromise it had to make. Nothing is silent.

  It exists because the shipped presets recorded their ratios in comments that nothing
  computed. `tokens.css` claimed "7.0:1 and 4.8:1"; `palette-presets.ts` claimed
  "2.67:1 … lifted they clear it at 3.30:1". A comment is not a test.

- **`src/theme/color.ts`** — sRGB ↔ OKLab ↔ OKLCH, WCAG contrast, gamut clipping by
  chroma reduction, dichromat simulation and OKLab ΔE. Dependency-free: a colour-space
  conversion is forty lines of arithmetic that will not change, and culori would have
  been the largest dependency in the kit.

  OKLCH rather than HSL because HSL's "lightness" is not lightness — `hsl(60 100% 50%)`
  and `hsl(240 100% 50%)` claim the same 50% and differ about twelvefold in apparent
  brightness, so any scheme that holds it constant produces a wildly uneven set.

- **Four new presets** — `ink`, `moss`, `plum`, `contrast` — derived rather than picked,
  each solved to AAA body text against the worst of its three surfaces. Committed rather
  than derived at import (eight token sets cost ~34ms, which is not worth charging every
  consumer at startup); a test re-runs the deriver and fails if they drift.

- **`auditPalette` / `auditChartRamp`** measure a palette instead of trusting it, and run
  in CI over everything the package ships.

### Fixed — `--money-expense` failed WCAG AA as text

`#b45309` (amber-700) reached only **3.88:1** against `--bg-page` in the light theme, and
4.22 / 4.13 against the other two surfaces — below the 4.5:1 AA needs for body text. It is
*rendered as text*: `.text-money-neg` paints every outflow amount with it. Now `#905902`,
which clears 4.56:1 on the worst surface. Outflow figures are slightly darker in the light
theme; the dark theme already passed at 7.66:1.

### Known — the categorical chart ramp trades contrast for separability

Measured, and worth writing down because it is not fixable by adjusting the colours. Four
of the nine light chart hues sit below the 3:1 WCAG 1.4.11 asks of a filled shape. They
cannot simply be darkened: a minimal repair that brings them all to 3:1 collapses the
worst pairwise separation from 0.059 to **0.002**, because Paul Tol's set distinguishes
similar hues by *lightness*, which is exactly what uniform contrast removes.

Searched exhaustively over starting hue and lightness, at a single lightness the most
series that can satisfy both constraints is **four**:

| series | best separation | both satisfiable? |
|---|---|---|
| 4 | 0.065 | yes |
| 5 | 0.041 | no |
| 9 | 0.015 | no |

Dichromacy collapses the red-green axis, so hue alone stops distinguishing colours past a
handful and lightness is the only channel left. **A chart with more than four series needs
a second channel** — a direct label, a pattern, or a legend adjacent to the mark. The
default ramp keeps Paul Tol's separability; `deriveChartRamp` offers a brand-led
alternative and reports what it gave up.

### Breaking — accessibility roles

**Picker triggers now announce as `combobox`, not `button`.** `CurrencySelect`,
`MultiSelect`, `EntityCombobox`, `MultiEntityCombobox`, `DatePicker` and
`DateRangePicker` render a `<button>` that opens a list or a calendar. It carried
`aria-invalid` and `aria-expanded`, neither of which the implicit `button` role supports
— so a field in an error state drew a red border and **announced nothing about being
invalid**, and nothing said there was a list behind it. The role that describes these
controls is the one that also supports those attributes.

*Migration — test queries only; nothing about the rendered markup or your props changes:*

```diff
- screen.getByRole("button", { name: /CHF/ })
+ screen.getByRole("combobox", { name: /CHF/ })
```

Known affected in this estate: `keksdose/frontend/src/shared/components/__tests__/currency-select.test.tsx`
and the date-field tests beside it. Days *inside* the calendar panel are still buttons.

One consequence worth knowing, because it bit us: `role="combobox"` excludes element
content from accessible-name computation, where `button` includes it. An unlabelled
trigger that used to announce its own text now needs an explicit name reference — the kit
does this for you (`aria-labelledby` always points at the value), but if you have built
your own trigger on `FIELD_TRIGGER`, check it still has a name.

### Added — accessibility

- **`useFocusTrap`** — extracted from `Modal`, which was the only component in ~20,000
  lines that trapped focus, and applied to `FullBleedDialog`, `PickerSheet`, `Popover` and
  the tour card. Every one of those declared `role="dialog" aria-modal="true"` and then
  left focus on the page behind it, which is the worst of both worlds: assistive tech
  hides the page while the user's focus is still in it.

  Beyond Modal's original: the tabbable list is recomputed per keystroke (a search box
  that appears once options load was previously unreachable), the restore target is
  checked with `isConnected` (restoring to a node removed while the overlay was open
  drops focus to `<body>`), and traps nest. Nesting is resolved by DOM containment, not a
  mount-order stack — React runs child effects *before* parent effects, so the obvious
  stack makes the OUTER trap think it is innermost and throw focus out of the picker.

- **`useAnnounce`** — a live region for changes that move no focus: sorting, filtering and
  paging a `DataTable` previously announced nothing at all, while the rows under the
  user's cursor silently became different rows. The region renders empty on mount (a
  region that mounts *with* its message is usually missed) and clears before re-setting so
  an identical message still speaks.

- **`.sr-only-fixed`** in tokens.css, and **`role="combobox"`/`listbox`/`option` +
  `aria-activedescendant`** wiring on the combobox family, copied from `CommandPalette`,
  which was the only component that had it.

- `MiniCalendar` is now a real date grid: roving tabindex, arrow/PageUp/Home navigation,
  and each day named with its full date rather than a bare number.

- Three `jsx-a11y` rules moved from the lint ratchet to `error` now that `src/` is clean
  under them: `role-has-required-aria-props`, `interactive-supports-focus`,
  `role-supports-aria-props`.

### Fixed — a phantom second scrollbar in every consuming app

Tailwind's `sr-only` is `position: absolute`, so an `sr-only` element with no positioned
ancestor resolves its containing block to the **initial** one and is laid out at its own
offset from the top of the document — dragging `documentElement.scrollHeight` down with
it. Nothing looks wrong (the element is 1×1 and clipped); what appears is a second,
whole-document scrollbar beside the app's own, which scrolls past the end of the content
into empty space. Measured on the showcase: `<body>` 900px, `<html>` **47,919px**.

`FileDropzone` and `FeedbackAttachmentField` now establish a containing block, and
anything the kit renders inside consumer markup uses `.sr-only-fixed`, which is out of the
document's scroll height entirely.

### Added

- **Field sync state** — `useFieldSync` (engine) and `FieldSyncIndicator` / `FieldSyncRow`
  (affordance) for a field backed by a database row: **synced** (green), **pending** (blue),
  **edited** (orange), **error** (red, with the failure's own message on hover and an optional
  Retry). Engine and affordance are separate exports because the state is useful without the
  dot — a form can gate its submit on any field being `pending`, a router can block navigation
  on any field being `edited`.

  Four behaviours it exists to get right, each with a test written against the way it breaks:
  an edit made *while a save is in flight* is neither dropped nor raced (the hook waits, then
  re-compares and sends the difference once); an external change to the server value is adopted
  only while the field is clean, never over a draft somebody is typing; nothing is set after
  unmount; and `onSave` is read through a ref so an inline arrow does not restart the debounce.

  `debounceMs` defaults to 600; `0` disables auto-save and leaves `save()` for blur/Enter.

- **Status tokens** — `--status-synced`, `--status-pending`, `--status-edited`, `--status-error`
  in `tokens.css`, light and dark. Deliberately **not** part of `TokenSet` and not per-preset:
  these are functional signals, and a field meaning "saved" must not change meaning because
  somebody picked a different appearance preset. All four clear WCAG AA (4.5:1) for normal text
  against the worst of the three surfaces in both themes.

  These are the first green/red pair in the package, which the palette otherwise refuses on
  colour-vision grounds — so `FieldSyncIndicator` gives every state its own **icon** as well,
  and the state text sits in a live region so it is announced, not merely shown.


- **Subpath exports** — `@eifi1/ui-kit/{chart,shell,data-table,wizard,tour,feedback,search}`,
  alongside the existing `/dates` and `/tokens.css`. A re-slicing of the main barrel, not a
  second API: a test asserts every subpath is a strict subset of it. The barrel still
  exports everything, so **no import needs to change**.

  These exist because there was no escape hatch from the barrel. `import("@eifi1/ui-kit")`
  to lazy-load the chart kit emits a 221KB chunk, since a dynamic import of a barrel cannot
  be tree-shaken to one member; `import("@eifi1/ui-kit/chart")` emits 31KB.

- **`LICENSE`** — MIT, plus the third-party notice for the shadcn/ui chart kit vendored in
  `src/components/chart.tsx`, whose only attribution was a source comment the build strips.
- **`engines`** (`node >=20.18`) and **`.nvmrc`** (`24.19.0`, what all consumers build with).
  The floor is real: below 20.18 the test suite dies before it runs, because jsdom 30 pulls
  an undici that calls `webidl.util.markAsUncloneable`.
- **`src/` now ships**, so the published sourcemaps resolve to real source.
- **`npm run verify:package`** — packs the tarball, installs it into a scratch project with
  only the declared required peers, and imports every entry point *by package name*. Runs
  in CI. This is the check that both 0.4.x defects escaped: everything else ran against
  `src/`, or against `dist/` by relative path, so the `exports` map was never exercised and
  the tarball was never installed.
- **A showcase** — `npm run dev:showcase` renders every component on one page with the theme
  and palette switchers live. `npm test` mounts it, `tsc` covers it, and CI builds it and
  asserts the emitted CSS really contains the kit's utility classes.
- **`src/__tests__/public-surface.test.ts`** — pins the exported names of every entry point.

### Changed — theming

- **813 of 815 hardcoded Tailwind palette colours in `src/` are now design tokens.** This
  was the reason a consumer could not re-skin the kit without forking it: `--text-muted`
  and `--text-secondary` were added specifically to replace `text-slate-500` and had
  **zero** component usages, while `text-slate-500` had 68. Every `dark:` colour variant
  went with them — a token already flips with the theme, so a `dark:` partner left behind
  *overrides* the token and reintroduces the hardcoded colour.

  The two survivors are deliberate and commented: `bg-white` behind a QR code (a camera
  needs maximum contrast regardless of theme) and `text-white` on a swipe action whose
  fill the caller supplies.

- **New tokens**, because their absence is what caused the drift — there was `--brand` but
  nothing for "brand, quietly", so components reached for `bg-indigo-100`:

  | | |
  |---|---|
  | Derived (`color-mix` from the palette, so they follow the active preset with no preset having to list them) | `--text-placeholder` `--bg-hover` `--bg-active` `--bg-inverse` `--text-inverse` `--border-strong` `--brand-bg` `--brand-bg-hover` `--brand-muted` |
  | Semantic (literals per theme) | `--danger*` `--warning*` `--info*` `--success*` |

  The semantic layer is deliberately **not** part of `TokenSet`: a destructive action is a
  fixed meaning and must not change because somebody picked a different appearance preset.
  Everything else follows the preset.

- **Selection stopped being an island.** The selected calendar day, the active filter chip
  and the resize handle hardcoded `sky-*`/`indigo-*`, so an app that changed `--brand` kept
  the old colour in exactly the places that signal "the current thing". They now use the
  brand family.

- `npm run check:tokens` is a ratchet that fails if the count goes back up.

### Added — tooling

- **`npm run check`** — typecheck → lint → token discipline → tests → build → verify the
  publish artefact → build the showcase. The same steps in the same order as CI.
- **`.vscode/tasks.json`**, matching the vocabulary of the consuming repos so the same two
  keystrokes do the same two things in every checkout: **Ctrl+Shift+B** starts the showcase,
  **Run Test Task** runs what CI runs. Install is lockfile-guarded (`npm ci` only when
  `package-lock.json` actually moved), copied from lenkbank.
- **Showcase ports harmonised** with the sibling apps: **4170** dev, **4171** preview,
  clear of keksdose (4173), lenkbank (4175) and kastlan (5173). `strictPort` is on, so a
  collision fails loudly instead of printing a URL that is not the documented one.
  `SHOWCASE_PORT` overrides it for a throwaway instance.
- **ESLint** — the package had none, and seven inert `eslint-disable` fossils in `src`.
  `react-hooks` and `jsx-a11y` with a documented ratchet: a rule is `warn` only while
  `src/` is not clean under it, and gets promoted to `error` in the commit that empties it.

### Fixed

- **The documented Tailwind `@source` path was wrong, and it renders the kit unstyled.**
  README and ADOPTING.md pointed at `node_modules/@eifi1/ui-kit/src`, which `files` did not
  publish. Tailwind does not warn about an `@source` matching nothing, so the failure is
  silent: the app builds, runs and is fully interactive, with the kit's classes simply
  never generated. Corrected to `dist` everywhere, with a verification command.

  **If you migrated from `@hb/ui`, check this line in your app now** — see below.

- **MIGRATING.md gained step 2b**, the `@source` repoint. Step 2's `sed` rewrites `@hb/ui`
  specifiers, but the `@source` line holds a *path* containing no such string, so it
  survived the migration untouched in every app that ran it.
- **README** advertised five wizard exports deleted in `864594c` (`useRhfWizardStep`,
  `WizardField`, `WizardSelectField`, and two types) and a `react-hook-form` peer that is in
  no peer list — shipped that way in 0.4.0 and 0.4.1, on the npm landing page.
- **README's no-flash bootstrap** documented an API that does not exist and pointed at a
  file in another repository; it now shows `applyPersistedTheme` → `applyPersistedPalette`.
- **`tokens.css`** shipped to npm with the old `@hb/ui` package name and the old `@source`
  path in its header.
- **ADOPTING.md** sent a new consumer to `../keksdose/packages/ui/README.md`, deleted by the
  npm migration.
- **`tsconfig.json`** still declared `@hb/ui` path aliases.
- **Showcase:** `FilterPopover`'s `autoFocus` is unconditional, so rendering it inline pulls
  focus on mount. Not yet fixed in the kit — tracked in the audit — but the showcase now
  mounts those bodies on demand and documents the constraint.

### Known — consuming apps need a one-line fix

`kastlan/frontend/src/app.css:12` and `keksdose/frontend/src/app.css:10` still read
`@source "../../packages/ui/src"`, the submodule path, dead since the npm migration. Both
apps are shipping today with the kit's utilities missing — measured against lenkbank (which
is correct), kastlan's production CSS is short **403 rules** and keksdose's **260**,
including `.sr-only`, `.pointer-events-auto` and every `z-[60|61|70]`.

```diff
- @source "../../packages/ui/src";
+ @source "../../node_modules/@eifi1/ui-kit/dist";
```

Verify with `npm run build && grep -c 'pointer-events-auto' dist/assets/*.css`.

## [0.4.1] and earlier

No changelog was kept. `git log` is the record.
