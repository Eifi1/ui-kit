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
5. **Dev tooling:** esbuild is forced to `^0.28.2` in this repo (npm audit,
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
| 1 / 2 Treemap `labelColor`, FullBleedDialog Escape | fixed in **0.8.1** | a header SearchField's `preventDefault` no longer keeps the dialog open; you can drop your own `close()` call |
