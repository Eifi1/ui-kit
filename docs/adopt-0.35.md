# Adopting `@eifi1/ui-kit` 0.35

Round 0.35 removes what 0.34 deprecated and finishes the refactor plan's open ends
(`docs/refactor-plan-2026-10.md`). It also carries the fixes from the three apps' 0.34
adoptions, which were built as a 0.34.1 patch and ship here instead (Marcel, 2026-10-13:
"Continue with 0.35 right away instead of 0.34.1 as interim step").

**`eifi1-server-kit` stays at 0.8.0.** Nothing in it changes this round.

**0.35 removes what 0.34 deprecated (§2), and no app has a call site left:** the three 0.34
adoptions moved every one (counted in each app's `frontend/src` on its 0.34 branch). TypeScript
names any that comes back. The rest is additive: the ESLint rule is opt-in, the refs and the
Escape rule need nothing.

## 1. What's new

### From the 0.34 adoptions (the planned 0.34.1)

- **`@eifi1/ui-kit/currencies`** (keksdose): a pure-data entry — no React, no CSS, no other kit
  module — exporting `CURRENCIES` and `CURRENCY_COUNTRIES` (`Record<string, string>`, currency
  code → lowercase ISO country code, flag-icons' file names). A build plugin imports it in Node
  instead of parsing a dist file, which moved in 0.34.
- **`setViewportWidth(width)`** in `@eifi1/ui-kit/testing` (keksdose): changes an active
  `stubViewportWidth` stub and fires `change` on each media query whose answer flips, as a
  browser does, so a test can simulate a live resize (wrap it in `act()`).
- **Escape inside a dialog** (Kurvenschmiede): a dialog's own `onKeyDown` sees Escape only while
  the dialog is the topmost layer; with a tooltip, menu or list open inside, the first press
  closes that, the next reaches the dialog's handler (KS's gear wizard asks to discard on the
  second press).
- **TranslationReviewPanel under `groupBy`** (Kurvenschmiede) remembers the sort and page size
  under the same `storageKey` as the ungrouped table (in DataTable's stored format, so switching
  grouping keeps the view); the page size is now one for all groups. For that, DataTable takes a
  controlled `pageSize` / `onPageSizeChange` pair, like `sorts` (additive; a new value returns to
  page 1).
- **The wake notice's French and Italian words** follow keksdose's reviewed ones.
- **Corrections to `docs/adopt-0.34.md`**, made in place: the `commit` counts (controls that save
  on their own: keksdose one, kastlan five), keksdose's money classes (no `[var()]` left; the
  unlayered statics' precedence) and its missed brand test, the `wrongPassword` key (only an app
  with its own catalogue), and §2's test notes (the "No results" status row, currency row names,
  the always-present wake region, MultiSelect's portalled panel).

### Round 0.35

- **The overlays' own `onKeyDown` follows the dialogs' Escape rule** (R2): Popover, HoverMenu,
  DropdownPanel and DropdownSearchHeader hand a caller's `onKeyDown` an Escape only while that
  overlay is the top layer; a tooltip or a nested menu open inside takes the first press. Other
  keys, and a child's `claimEscape`, as before. No app passes an `onKeyDown` to one of them.
  An un-anchored DropdownPanel without a `panelRef` has no layer to compare and hears every key.
- **Refs on the rest** (R4), React 19 ref-as-prop like the others since 0.34:
  - Modal and DialogFrame: the `role="dialog"` panel (`null` while closed). A fix too: the
    panel's focus trap overwrote a caller's `ref`;
  - Tooltip: the trigger wrapper `<span>` (the bubble exists only while shown);
  - CopyButton: its `<button>`;
  - StatTile, DemoBanner, BillingBanner, PlanLimitNotice: their root (the Card, the banner's
    frame);
  - FieldStrip: its root;
  - ThemeSetting, TextSizeSetting, ContrastSetting: the radiogroup (the `<select>` for the
    select variant and LanguageSetting), documented and tested now.
- **`useKitLabelOverrides(ns)` returns a deep partial** (R3), as the `labels` props take since
  0.34: a nested section's keys are optional, so give them a fallback. No app calls it.
- **DataTable's labels skip a key set to `undefined`**, as every other component's do: before,
  `labels={{ autoSize: undefined }}` blanked the provider's word, and the English one.
- **`@eifi1/ui-kit/eslint`** (R5, Kurvenschmiede's Q6): the kit's own `[var(--role)]` gate as an
  ESLint flat-config plugin. Its `role-utilities` rule reports a `[var(--role)]` class wherever
  that property has a utility for the role, names it, and `--fix` writes it (variants, opacity
  and `!` kept). It reads every string literal and template part, so `className`, `cn()` /
  `clsx()` arguments and class constants alike; tokens with no utility (the chart colours,
  `--status-*`, `bg-[var(--border)]` as a divider) are left alone. It runs on ESLint 9 and 10
  and imports nothing. Opt-in:

  ```js
  // eslint.config.js
  import uiKit from "@eifi1/ui-kit/eslint";

  export default defineConfig([ // or tseslint.config(…)
    // … the app's own entries …
    uiKit.configs.recommended, // the rule as an error, tests excluded
  ]);
  ```

  Turned on today it finds: keksdose 1 (autofixed), kastlan 0, Kurvenschmiede 0 (§3).

## 2. Breaking and must-change, every app

Each was deprecated in 0.34 with its replacement named (the two SwipeAction members in 0.33).
Call sites in the apps' `frontend/src` today: **keksdose 0, kastlan 0, Kurvenschmiede 0** for
every line below.

| Removed | Use |
|---|---|
| `ariaLabel` on NumberInput, AmountInput, MoneyField, NumberField, IntegerField, the Rhf number / integer / money fields, CalculatorButton, WizardStepper, ThemeToggle, PaletteMenu, LanguageMenu, RoleSwitcher, OptionSwitcherMenu, TopBarActionMenu | `aria-label` (required on OptionSwitcherMenu and TopBarActionMenu) |
| MultiSelect `values`, `allLabel`, `searchLabel`, `selectAllLabel`, `clearLabel` | `value`, `labels.all`, `labels.search`, `labels.selectAll`, `labels.clear` |
| FieldStrip `pad`, the `FieldStripPad` type | drop it (one 20px strip since 0.34) |
| ServerWakeNotice `navOffset` | drop it (the notice sits at the top since 0.34) |
| SwipeAction `className` / `armedClassName` | `tone`, or `paint: { fill, foreground }` for an exception |
| HoverMenu / DropdownPanel / TopBarActionMenu / FeedbackMenu `align="left"` / `"right"` | `"start"` / `"end"`; `end` is the default, so `"right"` can simply go |
| `DEFAULT_Y_AXIS`, `ZOOM_SQUARE_ENOUGH`, `ZOOM_MIN_DRAG`, `zoomAxesFor`, `selectionFromDrag`, `axisExtent`, `fitYToX`, `fitXToY`, `NO_ZOOM`, `zoomAfter`, `zoomDomains`, `defaultZoomAxes`, `withChartZoom` (barrel and `/chart`) | zoom through SeriesChart (`zoomAxes`) or `SharedXZoom`, which stays |
| `ALTERNATIVE_PRESETS` | `PALETTES` / `presetById`, or `derivePalette` for a palette of your own |
| `FeedbackComposer` | `ChatComposer` (same props and ref); the `FeedbackComposer*` types stay |
| `/rhf`: `FormField`, `useFormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `FormItemProps`, `FormLabelProps`, `FormControlProps`, `FormDescriptionProps`, `FormMessageProps` | a bound `Rhf*` field, or `RhfField` with `render` for a control of your own |
| `resolveChipInputLabels(l)`, `resolveFieldSyncLabels(l)`, `resolvePasswordRevealLabels(l)`, `resolveWizardLabels(l)` | the component's `labels` prop, or `useKitLabels(ns, DEFAULT_…_LABELS, l)` |
| `resolveDataTableLabels({…})` | DataTable's `labels` or the provider's `dataTable`; in a test, `{ ...DEFAULT_DATA_TABLE_LABELS, … }` |
| `missingDataTableLabels(l)` | `missingKitLabels({ dataTable: l }, DEFAULT_UI_KIT_LABELS)`, which also lists `columnsCount` and `filterColumn` when only `columns` or `filter` is translated |

Comments that still name a removed one (no code): keksdose
`features/assistant/assistant-composer.tsx:13` (`FeedbackComposer`), kastlan
`features/accounting/components/account-picker.tsx:16` (the /rhf scaffold).

## 3. Per app

### keksdose

1. `import { CURRENCY_COUNTRIES } from "@eifi1/ui-kit/currencies"` in the flag-subset Vite
   plugin; drop the parse of `dist/components/currency-option-list.js` (the 0.34 interim path).
2. `setViewportWidth` (from `/testing`) where a test wants a live resize (kk12).
3. Optional, the ESLint rule: 1 finding, `features/transactions/transaction-fields.tsx:902`
   `[&_input]:border-[var(--warning-border-strong)]` → `[&_input]:border-warning-strong`
   (`--fix`). `cleared-status-toggle.test.tsx:141/143/145` would be 3 more, but the recommended
   config skips tests.
4. The comment at `assistant-composer.tsx:13` can say `ChatComposer`.

### kastlan

1. Nothing required.
2. Optional, the ESLint rule: 0 findings (ESLint 9.39, which it runs on).
3. The comment at `account-picker.tsx:16` can say `RhfField`.

### Kurvenschmiede

1. Nothing required. Its two 0.34 findings are in (§1): the dialog's own handler hears Escape
   only on top (the gear wizard's "discard?"), and the grouped TranslationReviewPanel keeps one
   view.
2. Optional, the ESLint rule (its Q6): 0 findings (ESLint 9.39, which it runs on).

## 4. Versions

- **`@eifi1/ui-kit` `^0.35.0`.** Bump by hand: a caret below 1.0 locks the minor version.
- **`eifi1-server-kit` 0.8.0**, unchanged (`docs/adopt-0.34.md` §4 has the lines and the sha256).
