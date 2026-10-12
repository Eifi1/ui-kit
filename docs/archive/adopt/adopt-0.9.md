# Adopting `@eifi1/ui-kit` 0.9 — per repository

keksdose found these gaps while adopting 0.8.0. Everything is additive; the one visible
default change is marked below. `CHANGELOG.md` → `0.9.0` has the release notes.

## Everyone

1. Bump to `^0.9.0` by hand; a caret below 1.0 locks the minor version.
2. **CommandPalette is full screen on phones by default.** Below the phone breakpoint it
   fills the screen and gets a Close button. `fullScreenOnPhone={false}` keeps the old card.
3. **New label keys** (only if you type a complete `UiKitLabels`): `commandPalette.clear`,
   `commandPalette.submit` and `commandPalette.close`, all optional. Every
   `@eifi1/ui-kit/i18n/<code>` catalogue has them.
4. **Button** has no default `type`, like a native `<button>`, so inside a form it submits.
   Pass `type="button"` for every other action in a form. This is the same behaviour as
   before; it is now documented.
5. **`GlobalSearch`** (new, `@eifi1/ui-kit` and `/search`): the ⌘K search every app
   built by hand on `CommandPalette`. It takes static `entries`, async `sources` (each with
   its own group, `minChars`, `limit`, abort and error handling), `suggestions` for the empty
   query, `groupOrder`, redaction, and its own trigger (kit Tooltip, controlled `open`). It
   matches through `createSearchIndex`, which ignores accents and word order, tolerates
   typos, ranks the results and searches keywords. The showcase's own ⌘K search runs on it.
6. **Navigating from an open overlay works now.** A palette or dialog row that called
   `navigate()` used to land on the new page and bounce straight back: the overlay's history
   cleanup mistook the new page's entry for its own. The page now stays, and one Back returns
   to where the overlay was opened. Drop any `setTimeout` / "navigate after close" workaround.
7. **Dev tooling:** esbuild is forced to `^0.28.2` in this repo (npm audit,
   GHSA-g7r4-m6w7-qqqr). Nothing changes for consumers.

---

## keksdose

| Gap | Use | Notes |
|---|---|---|
| 3 YNAB recurring step hides Done while converting | `StepperNav doneDisabled={converting}` | keep `onDone` set |
| 4 FAB native `title` (dev#523), corner toggle groups | `FloatingActionButton nativeTitle={false}`, `pressed`; `FloatingPanel fabNativeTitle={false}` | `nativeTitle` is a flag rather than `title=""`, so your source scan stays quiet |
| 5 error boundary lost its `<h2>` | `EmptyState headingAs="h2"` | `title` / `hint` take ReactNode |
| 6 account-menu language sub-list (four overrides) | `Disclosure variant="menu"` | the classes match `TOPBAR_MENU_ITEM_CLASS`; the chevron sits at the end |
| 8 bulk bars paint rose by hand | `IconButton tone="danger" quiet={false}` | `quiet` works on warning and info too |
| 9 admin pill `onClick={close}` inside renderLink | `<Chip href onClick={close} renderLink={({href, ...p}) => <Link to={href} {...p}/>}>` | `onClick` reaches renderLink's props |
| 10 `data-private` on an inner span | column `cellProps: (row) => ({ "data-private": "" })`, `headProps` | on phone cards only `data-*` attributes are applied |
| 7 report-range-field's own picker | `DateRangePicker renderTrigger={({ triggerProps, valueProps, preset, text }) => …}`, `sheetBackCloses={false}` | phones get a bottom sheet with Apply / Cancel pinned in `commit="apply"` mode |
| 11 transaction-search overlay | `CommandPalette query={draft} onQueryChange={setDraft}` (live shortcuts), the clear ×, `redactLabels`, full screen on phones | `searchOn="submit"` is for owners who bind `query` straight to the URL `q`; in that mode the rows only refresh on commit |
| 12 landing share bars | `ProgressBar variant="meter" tone="income" \| "expense" size="slim"` | |
| **⌘K search** (`features/search/global-search.tsx`) | `GlobalSearch` | see "Global search" below |
| 1 / 2 Treemap `labelColor`, FullBleedDialog Escape | fixed in **0.8.1** | a header SearchField's `preventDefault` no longer keeps the dialog open; you can drop your own `close()` call |

### keksdose — global search onto `GlobalSearch`

| Today | Becomes | Notes |
|---|---|---|
| `APP_NAV` + `EXTRA_SEARCH_NAV` pages, the two hardcoded actions | `entries` with `href` | **filter out `hideInPrivacyMode` pages first**: the Payees page shows in ⌘K today although the sidebar hides it (`app/layout.tsx:45`) |
| accounts / payees / categories (local-first `useQuery`) | `entries` (categories: `localizedName` + the category symbol as `icon`) | changed entries re-run the search on their own: drop `EMPTY` and `revision={search}` |
| `localizeSettingsEntries(t)` + `matchSettingsEntries` | `entries` with `keywords` (per language), `hint` = group title, `href` = `/settings?focus=…#group` | `matchSettingsEntries` leaves ⌘K; the settings page's own filter can move to the kit matcher later (then port `settings-index.test.ts`) |
| `transactionsApi.search(q, {limit: 8})` inside the one `search` callback | a `sources` entry: `{ id: "tx", group, minChars: 2, limit: 8, redact: true, search: (q, signal) => … }` with `formatCurrency` hints | static groups no longer wait on it |
| unredacted payee names and amounts | `redactLabels={privacyMode}` + `redact` on the transactions source | **privacy fix**: ⌘K rows are not redacted today |
| hand-written trigger, `go()` helper | the built-in trigger; entries with `href` (middle-click opens a new tab) | |
| tests | keep `global-search-i18n` ("Gehalt" vs "Salary") and `category-symbol-reach`; `command-palette-links` now lives in the kit | |
| `transaction-search.tsx` | unchanged | a list-filter builder, not a navigation search |

## kastlan — global search onto `GlobalSearch`

| Today | Becomes | Notes |
|---|---|---|
| `shared/components/command-palette.tsx` + separate mount in `app/app-layout.tsx:167` | one `<GlobalSearch>` in the top bar | |
| top-bar button firing a synthetic ⌘K keydown (`top-bar.tsx:56-58`) | the built-in trigger (`hideTriggerOnPhone` keeps it hidden below `sm`), or controlled `open` | the kit Tooltip replaces `title` |
| `navGroups` pages filtered by `user.roles` | `entries` with `href`, role-filtered on the app side (a plain `.filter`) | quick actions are not role-filtered today; consider it |
| 9 `quickActions` | `entries` in an actions group; also `suggestions` | |
| `globalSearch(q)` (≥ 2 chars, errors swallowed, no client cap) | a `sources` entry: `{ id: "entities", group by entity type, minChars: 2, search: (q, signal) => globalSearch(q, {signal}).then(map) }` mapping `r.url` → `href`, the entity icon, `sublabel` → `hint` | per-source error handling; pass `signal` to the fetch |
| substring matching | the kit matcher: accents (ß/ss), typos, ranking, keywords | give pages `keywords` for synonyms |
| no tests | add: role filter, source merge, navigation | |
