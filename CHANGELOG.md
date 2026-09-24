# Changelog

All notable changes to `@eifi1/ui-kit`.

This package is pre-1.0 and three applications depend on it. The contract until 1.0:

- **minor** (`0.x.0`) may remove or rename an export, change a prop's type, change an
  emitted class name, or change a token's value. Each one is listed here under
  **Breaking**, with the migration.
- **patch** (`0.x.y`) fixes behaviour without changing the public surface. The surface is
  pinned by `src/__tests__/public-surface.test.ts`, so a name cannot leave it unnoticed.
- Consumers pin `^0.x`, which npm treats as minor-locked below 1.0 — so a minor does not
  reach an app until it asks for it.

An export is **deprecated for one minor before removal**: marked `@deprecated` in TSDoc
with the replacement named, listed here, then removed in the next minor.

## [Unreleased]

### Changed

- **A `Chip` with `onClick` reports a pressed state only when `selected` is passed.**
  Without `selected` it is an ACTION button (it switches between two named states, like
  keksdose's outflow ⇄ inflow) and announcing "not pressed" claimed a state it does not
  have — keksdose had to override `aria-pressed` by prop-spread order. Pass
  `selected={false}` explicitly for an on/off toggle that is off.
- `Chip`'s `selected` doc: the fixed-label rule is for on/off toggles; a control between
  two named states keeps a label that follows the state. `docs/adopt-0.6.md`'s
  direction-toggle row corrected to that pattern (Marcel's decision in keksdose, #417).

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
`docs/adopt-0.6.md`.

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
- `docs/adopt-0.5.md`: the notes the three apps found while adopting (Spinner, MultiSelect
  rows as options, toggle-chip labels, the translating wrappers, naming the pickers).

## [0.5.0] — 2026-09-23

The first release since 0.4.1, in two parts that were prepared separately and ship
together (a 0.5.0 was cut on 2026-09-22 and never published). Coming from 0.4.1, read
both.

1. **Everything the three apps were hand-rolling that a design system should own**, and
   one mechanism for translating all of it — the sections immediately below.
   Per-repository adoption steps: `docs/adopt-0.5.md`.
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
