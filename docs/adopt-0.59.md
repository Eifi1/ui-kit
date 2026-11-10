# Adopting `@eifi1/ui-kit` 0.59

ui-kit 0.59 closes the items keksdose's runs 95 and the legal scan left open: one fixed chart
palette for all three apps (none offers a choice any more), the dialog footers' FormActions,
a full-size box before a list row, the focus when a row leaves its list, groups that draw
with no rows, a notice's `?ids=` as the feedback inbox's # filter, an inline zoomable picture,
and the privacy policy's "no cookies" lead. It ships with **server-kit 0.23**.

**From 0.58, nothing else first.** An app still on 0.57 takes 0.58's notes first.

**Legal wording:** the **Privacy Policy** (all apps: the browser-storage section's lead says
the app sets no cookies, where it said "No cookies."). Each app moves the `updated` date of its
/privacy page (`LegalPage updated=…`) to the day it ships this bump. The new commercial variant
changes no page until an app turns billing on; that release moves the /privacy date again.

**Restart the Vite dev server after the bump** (`vite --force` if a change still does not show).

**Must change:** nothing in the three apps. `FeedbackColumnsOptions` changed shape: its
`labels` is the whole `FeedbackPageLabels`, which gained `focusIds`. The kit's catalogues and
`useKitLabels` carry it; only an app that calls `feedbackColumns` with a labels object it
wrote out itself would add it (none of the three does: searched their frontend sources).

**Deprecated (removed in 0.60):**

- `createPaletteStore` → `createFixedPalette(useTheme, { legacyStorageKey })`
- `applyPersistedPalette` → `createFixedPalette`'s `applyPalette(mode)`
- `PaletteStore` → `FixedPalette`
- `PaletteMenu` → none: no app offers a palette choice (`OptionSwitcherMenu` for any other value)
- `TopBarLabels.palette` → none: PaletteMenu's name, which goes with it

## Legal: keksdose's scan for absolute claims (legal decision 10)

- **Privacy Policy, browser storage:** the lead "No cookies. The app keeps the following in
  your browser's storage:" now reads "The app sets no cookies and stores the following in your
  browser's storage:" (de-CH «Die App setzt keine Cookies und legt Folgendes im Speicher Ihres
  Browsers ab:»): the claim is about the app, not about a pay host's checkout script. Nothing
  to change in code; check that the app's `entries` still read as items of that list.
- **New: `<LegalKitSection section="browser" variant="commercial">`**, keyed as the
  disclaimer's and the changes clause's (`LegalDisclaimerVariant`): the same lead and list, then
  the tail with one sentence after it: "The payment runs in a Paddle window on Paddle's own
  domain; what that window stores there (such as a security cookie and settings) is governed by
  Paddle's privacy policy." No app passes it today. An app that turns billing on passes it in
  that release, with the disclaimer's and the changes clause's `variant="commercial"`
  (decision 7). It names no entry: the full Paddle sandbox check (a real checkout) still runs
  before billing goes on.
- **Translation review:** a new row per language, `kit.legal.sections.privacy.browser.commercial`;
  `kit.legal.sections.privacy.browser.lead` changed in all seven, so its verdicts reopen. The
  es, fr, hu, it and zh texts need native review.

## One palette, no choice: `createFixedPalette`

None of the apps offers a chart palette any more (Marcel, 2026-11-10).
`createFixedPalette(useTheme, { legacyStorageKey })` paints `DEFAULT_PRESET` (Imprint) for the
theme's mode, before mount and on every mode change. It stores nothing and joins no device
reset; the old `*-palette` key is removed when the palette is created and again by
`applyPalette`. It returns the names the old store used: `applyPalette(mode)`,
`useApplyPalette`, `useActiveTokenSet`, `useChartHex`, `useHeatStops`.

- **keksdose:** `shared/state/palette-store.ts` becomes
  `export const { applyPalette: applyAppPalette, useApplyPalette, useChartHex, useHeatStops } = createFixedPalette(useTheme, { legacyStorageKey: "keksdose-palette" });`
  (drops `RETIRED_CHOICE_KEY` and the hand-written functions); `main.tsx`, the chart imports and
  `palette-store.test.tsx` stay as they are.
- **kastlan:** `shared/theme/palette-store.ts` becomes
  `export const { applyPalette, useApplyPalette, useChartHex } = createFixedPalette(useTheme, { legacyStorageKey: APPEARANCE_KEYS.palette });`;
  in `main.tsx`, `applyPersistedPalette(APPEARANCE_KEYS.palette, mode)` becomes
  `applyPalette(mode)` from the palette store. `kastlan-palette` leaves the device and the reset
  registry.
- **Kurvenschmiede:** `shared/state/palette-store.ts` becomes
  `export const { useActiveTokenSet, useChartHex } = createFixedPalette(useTheme, { legacyStorageKey: STORAGE.palette });`
  (it never paints, so tokens.css stays the path); in `main.tsx`, remove
  `usePalette.setState({ id: DEFAULT_PRESET.id })`; in `storage-keys.ts`, `KIND_OF.palette` moves
  from `"appearance"` to `"never"`. `storage-keys.test.ts`'s `SITES` pattern does not match
  `createFixedPalette`; add it if the key should stay counted.
- The settings contract no longer lists the palette as an Appearance entry (§4.2, §6.3, §11).

## Dialog footers, the box before a row, the focus when a row leaves (keksdose #496, #497)

- **FormActions in dialog footers (#496):** DialogFrame's actions row (and FullBleedDialog's and
  PickerSheet's footers) size a FormActions placed directly in them: as a row it fills the
  footer, so `start` and `destructive` reach its start edge; stacked it takes a full line and
  each button spans the dialog. A footer item placed BEFORE a FormActions now sits at the row's
  start (none found in the three apps). keksdose drops `className="w-full"` in
  `features/shopping-lists/suggestion/suggestion-dialog.tsx` and on the reconcile dialog's
  second FormActions in `features/accounts/accounts-page.tsx`.
- **A full-size target in `leadingActions` (#497; Marcel: a tap opens, the box ticks):** every
  button or Checkbox in ListItem's `leadingActions` gets an invisible hit area centred on it,
  44 px (48 px from Large), layout and look unchanged; a tap on the area ticks the box. keksdose's
  shopping-list box needs no change; its `aria-label` can say "Done: {item}". DOM:
  `data-slot="list-item-leading"`, `data-slot="checkbox-box"`.
- **`useRowLeaves({ items, rowKey, fallback })`:** spread `{...leaves.row(item)}` on each
  ListItem (beside useReorder's props). When the focused row leaves `items` and the focus was
  lost, it goes to the same control in the next row, else the previous, else `fallback` (a ref,
  or a function of the item that left). Plus `focusIsLost`, `focusFirst`, `returnFocus` and
  `FocusReturn` exported. keksdose (846423e6) drops its private copies, or uses
  `useRowLeaves({ items: open, rowKey: (i) => i.id, fallback: doneHeader })` and
  `useRowLeaves({ items: done, rowKey: (i) => i.id, fallback: (item) => boxes.current.get(item.id) })`.

## Groups with no rows, and a notice's `?ids=` as the # column's filter (keksdose #504, #500, #678)

- **`DataTableGroupBy`** takes `keys` (the groups to draw even with no rows) and `empty(key)`
  (their line); the level's `action` works on an empty group, so its "+" adds the first one. An
  empty group is no row: not counted, paged, selected, swiped or reached by the arrow keys.
  Groups with rows but not in `keys` are drawn where their rows are. Empty groups are not drawn
  under an active filter or `keyFilter`, `serverPagination`, `loadMore` with more to come, or
  `virtualize`; only the first level reads `keys`.
- **`DataTable` `keyFilter`** (`DataTableKeyFilter`: `keys`, `column`, `label?`, `onClear`): a set
  of rows named from outside, shown as one column's filter. While it is on, the saved filters
  are neither applied nor overwritten, and they come back when it goes; sort, page size, widths
  and hidden columns stay the person's.
- **The feedback inbox (feedback §13.7):** `FeedbackInbox` / `useFeedbackInbox` read
  `?ids=1,2,3` as that set on the # column, with the indicator "Only these 3 reports" / "Only
  this report" in the column's popover and the phone's Filters sheet. Its Clear filter and the
  sheet's Clear all take `ids` out of the URL, keeping `row`; `ids` wins over a link's `f.id`.
  `inbox.focusIds` is the set. The desktop strip's "Clear selection" is refused at "0 selected"
  (`BulkActionBar` `clearDisabled`). Known limit: with the # column hidden on a desktop, no
  indicator shows (the rows are still narrowed; the phone's sheet lists it).
- **keksdose:** `accounts-page.tsx` deletes its placeholder rows (`emptySectionRow`,
  `isEmptySection`, the `emptySections` memo and its branches) and adds to the `mobileGroupBy`
  level `keys: EMPTY_SECTION_TYPES.filter((type) => !accounts.some((a) => a.type === type))` and
  `empty: () => t("accounts.type_empty")` (no `keys` for guests and under `?sort=`).
  `feedback-page.tsx` deletes its `?ids=` handling (`parseFeedbackIds`, `noticeFilterSearch`,
  the `notice=1` marker, `withoutNoticeView`, the Chip, `FOCUS_TABLE`, the single-id
  `<Navigate>` and the `key` remount) and passes `table={TABLE}` always.
- kastlan and Kurvenschmiede get the `?ids=` view and the refused Clear with the bump.

## ZoomableImage (keksdose #505)

A picture shown inline that zooms where it is: fitted to the box's width, a zoom widens it, so
the box's own scroll is the pan. The box grows with the picture up to `maxHeight` (default
`75svh`) and scrolls past it; while zoomed it keeps its fitted height. `naturalWidth` /
`naturalHeight` reserve the box before the file arrives, and `fetcher` loads through the app's
authenticated GET with AuthedImage's states. Touch: pinch about the fingers, two-finger pan,
one-finger pan once zoomed, double-tap between fit and 100 %; at fit a one-finger swipe scrolls.
Desktop: Ctrl/⌘ + wheel or a trackpad pinch zooms about the cursor (a plain wheel scrolls),
double-click toggles 100 %, a zoomed picture drags, + − 0 on the focused box; − / fit / +
buttons at the bottom end corner; the level is announced. Words: the new `zoomableImage`
namespace in all seven catalogues.

- **keksdose:** `shared/components/scan-file-preview.tsx` can replace its touch half
  (`PinchZoomImage` and the `useTallImage` / `isTallImage` switch) with
  `<ZoomableImage src={url} alt={filename} maxHeight="75vh" />`; its `common.zoom_in` /
  `zoom_out` / `map.zoom` keys become the kit's. The desktop hover lens stays the app's choice.
- **kastlan:** available for handover photos and document scans shown inline.

## server-kit 0.23

- **Chinese mails** take the full-width colon "：" before a link (the shared layout, for every
  mail laid out by `render_mail` / `render_message`, the legal-change mail included). An app test
  that asserts `"{cta}: {link}"` for a zh mail expects `"{cta}：{link}"`.
- **The app's host in the mail keys:** `MailMarker.idempotency_key(day, *, app_base_url=None)` and
  `QueueService(…, app_base_url=None)` put the host into Resend's `Idempotency-Key`, so two apps on
  one Resend team no longer collide (the queue's old key could lose a bundle after three 409s).
  Without the argument the key is unchanged. kastlan passes `app_base_url` in
  `domain/services/overdue_mail.py`; keksdose builds its `QueueService` with it; Kurvenschmiede
  uses neither.

## Toolchain and housekeeping

- jsdom 31 (the test environment) and playwright-core 1.65 (Chromium headless shell 1254 for the
  sweep). Nothing for the apps.
- The shell set's ceiling rises to 160,600 B (+485 B, +144 gzip): the leading slot's targets,
  the dialog footers' rule, `clearDisabled` and the new privacy words.

## In the browser

- **keksdose:** the shopping list's box takes a thumb-size tap and the row still opens the editor;
  ticking an item keeps the focus in the list; the suggestion dialog's buttons span the footer at
  Large text and on a phone; Accounts on a phone shows the empty types with their "+"; a notice's
  link opens the inbox narrowed, the # column says so, and Clear filter restores the list; a tall
  receipt zooms and pans inline.
- **All three:** /privacy with the new date and lead; the feedback inbox's "Clear selection" is
  greyed out at 0.
