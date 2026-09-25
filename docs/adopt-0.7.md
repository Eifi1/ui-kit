# Adopting `@eifi1/ui-kit` 0.7 — per repository

Each section below can be handed to that repository's session as it is.
`CHANGELOG.md` → `0.7.0` has the release notes, including **⚠ BREAKING CHANGES**. The
showcase shows every component live, and its pages were reorganised: Inputs, then Pickers &
entry, Data display, Overlays. Old links redirect to the new pages.

## Everyone

1. Bump `@eifi1/ui-kit` to `^0.7.0`. A caret below 1.0 only allows patch releases, so this
   has to be done by hand.
2. **Translations: import them instead of copying them.**
   `import { UI_KIT_LABELS_DE } from "@eifi1/ui-kit/i18n/de"` gives
   `<UiKitProvider labels={UI_KIT_LABELS_DE}>`. You can then delete the copied `kit` block
   and its local `n()` / `plural()` helpers. To change a few words, spread over the import:
   `{ ...UI_KIT_LABELS_DE, dataTable: { ...UI_KIT_LABELS_DE.dataTable, … } }`. Counts are
   formatted with the language's default number locale. `uiKitLabelsDe("de-CH")` keeps the
   words and switches to Swiss digits.
   If you keep your own complete `UiKitLabels`, add the new keys; `tsc` names them:
   `filePicker.rejectedTypeOnly`, plus the `measuredGrid` and `feedbackAttachment` namespaces.
3. **Tests that change without a code change:**
   - `HoverMenu` items (in TopBarActionMenu, LanguageMenu and similar) are
     `role="menuitem"` and the menu's name is on `role="menu"`. Query
     `getByRole("menu")` / `getByRole("menuitem", { name })`.
   - `FileDropzone` is a `role="group"`. Click its Browse button instead of the zone.
   - A type refusal with `accept` set now reads "Only .pdf files", unless you translated
     only `rejectedType`.
   - Chart tooltips show "—" for a series with no value at the cursor.
   - `ToggleGroup` radios have a single tab stop. Tabbing through each one no longer works;
     use the arrow keys.
4. **`className` overrides with physical sides.** The kit now emits logical classes
   (`pe-9`, `end-2.5`, `text-start`), so an override such as `pr-12` now ADDS a padding
   instead of replacing one. Search your code for `pr-`/`pl-`/`right-`/`left-` inside
   className props passed to kit fields and switch them to `pe-`/`ps-`/`end-`/`start-`.
5. **Chip:** `href` together with `onClick` is now a type error. It used to drop `onClick`
   silently.

---

## keksdose

| Replace / adopt | With | Notes |
|---|---|---|
| hand-kept German `kit` labels | `@eifi1/ui-kit/i18n/de` | see "Everyone" 2 |
| `reports/address-search.tsx` controlled-closed workaround | `Autocomplete open onOpenChange` | plus `size="sm"` for the compact header field; disabled options with `disabled: true` on the option |
| DangerConfirm placeholder / untrimmed phrase / label shape | `labels.phrasePlaceholder`, `phraseMatch="exact"`, `labels.phrase` as a finished string | `lockedReason` now also shows as a tooltip on the arm button, so drop any tooltip you added yourself |
| DialogFrame header padding overrides | `headerClassName`, `headerDivider={false}`; body-less frames can omit `children` | |
| folding rows whose header must stay a row button | `Disclosure controls` (trigger-only) + `trailing` | |
| `ToggleGroup allowEmpty` casts | none needed: the `null` in `onChange` is inferred | |
| swatch and icon tile size overrides | `tileClassName` | |
| invoice upload "refuse the whole pick" logic | `onPick={(accepted, rejected) => rejected.length === 0}` | one `filePicker.rejectedPick` sentence per refused pick |
| direction toggle (#417) | unchanged | `Chip onClick` without `selected` is an action button, and 0.7.0 keeps it that way |

## lenkbank

| Replace / adopt | With | Notes |
|---|---|---|
| `measured-grid.tsx` (the app's grid) | `MeasuredGrid` + `useMeasuredRows` | `<MeasuredGrid label columns cells onCells views? rowHeight? />`. `useMeasuredRows(initial, { digits })` keeps the parsed numbers and the cell strings in step. Windowing is built in (`useWindowedRows`) for long series. Invalid cells get `FIELD_INVALID` + `aria-invalid`. |
| sheet tabs deletable only when active | `Tabs removeOn="active"` | |
| `ScopeFields` label workaround | none needed | the Combobox floating label is now a real `<label htmlFor>` |
| gear/control charts | nothing to do | ticks are now round (1/2/5 × 10ⁿ) and missing points show "—" in the tooltip |

## kastlan

| Replace / adopt | With | Notes |
|---|---|---|
| copied de/fr/it `kit` blocks | `@eifi1/ui-kit/i18n/de-CH`, `/fr`, `/it` | `UI_KIT_LABELS_DE_CH` is German with Swiss spelling (ss) and Swiss digits (1’234) |
| "Open in full page" moved into the actions row | `DialogFrame headerActions={<a href=…>…</a>}` | also accepts `(close) => …` |
| lost "Language" heading on the auth-page switcher | `LanguageMenu heading={t("language")}` | |
| `.csv` / `.xml` dropzones with `isValid` + `invalidMessage` | remove both | the default refusal is now "Only .csv files"; keep `isValid` only for checks on the file's content |
| RHF `ComboField` `clearedValue` option | `clearValue=""` on `EntityCombobox` / `InlineEntityCombobox` | `onChange` is typed `V \| ""`; the null contract is documented at `@eifi1/ui-kit/rhf` |
| entry chunk 874 kB | investigate in kastlan | measured tree-shaken: `Button` alone is 37 kB minified, of which 27 kB is tailwind-merge (which you already ship); Button + Input + Select + DatePicker + DialogFrame + provider is 64 kB. The kit is not what makes the entry chunk large. Look at eagerly imported routes and recharts. |
