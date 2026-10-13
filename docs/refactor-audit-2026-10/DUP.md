# DUP — duplication and logic that should be shared (refactor audit 2026-10, auditor 2 of 6)

Summary: 11 findings. By severity: sev 3: 3, sev 2: 7, sev 1: 1. Three PROVEN by a scratch test that runs the kit's own source (`scratchpad/dupt/dup.test.tsx`, nothing in the repo touched).
Top 3: **DUP-1**: Escape in an open picker list inside a Modal or FullBleedDialog closes the whole dialog. "Who owns Escape" is decided five ways, and the pickers listen on the document, which the dialog's own handler never lets the key reach (PROVEN for Combobox, EntityCombobox, MultiSelect). **DUP-2**: the "FieldHint becomes the caption on touch/Large" rule is restated by hand in 7 fields, and 7 places miss it: CountrySelect, CurrencySelect, OneTimeCodeInput, Slider, SwatchPicker, IconPicker and every Rhf twin (PROVEN for Slider and CountrySelect; live in Kurvenschmiede's controller panel, 6 sites). **DUP-6**: DataTable's phone filter sheet is the last hand-rolled modal: `aria-modal`, but no focus move, no Escape and no name (all three apps). Close behind them, **DUP-3**: the lock-reason frame exists in three copies, so every field that 0.34's C2 gives `commit` shows its reason only as a tap-bubble on a phone, never as §4's line (PROVEN for Input, Select and AmountInput).
Not re-reported: C1–C15, T1, Q1–Q6 and adopt-notes "Open" lines. Earlier audits: 2026-09-22's "only Modal manages focus" still holds for DataTable's phone filter sheet (DUP-6). Its "useDropdown has no Escape" was fixed with a document listener that can't work under a dialog (DUP-1). 2026-08-24's U-14 lesson (one rule spelt two ways) applies again in DUP-9.
Target: /home/marcel/ui-kit-034 (feat/0.34.0, d6212d6). Paths below are relative to it unless an app is named.

---

### DUP-1 · sev 3 · bug · M · PROVEN · touches: `src/hooks/use-dismiss.ts`, `src/components/modal.tsx`, `src/components/full-bleed-dialog.tsx`, `src/components/picker-sheet.tsx`, `src/components/popover.tsx`, `src/components/dropdown.tsx`, `src/components/combobox-core.tsx`, `src/components/combobox.tsx`, `src/components/grouped-picker.tsx`, `src/search/command-palette.tsx`
- What: "Who owns Escape" is decided in five different ways. The anchored pickers listen on the document (`useEscapeKey`), but a dialog's panel `onKeyDown` sits earlier on the same path and stops the event. So pressing Escape in an open list inside a Modal or FullBleedDialog closes the dialog and throws away its edit. This is keksdose live #309 again (that was Back; here it is the key). The two dialogs also disagree about when a child has "claimed" Escape.
- Evidence:
  - The rules:
    - Modal: any descendant's `preventDefault` claims the key, then the Modal stops it (`modal.tsx:354-361`).
    - FullBleedDialog: only the caller's own `onKeyDown` counts; a descendant's `preventDefault` deliberately does not (`full-bleed-dialog.tsx:165-183`).
    - PickerSheet: always closes and stops the key (`picker-sheet.tsx:142-152`).
    - Popover: closes and stops the key, ignoring even its caller's `preventDefault` (`popover.tsx:170-183`).
    - CommandPalette: closes without stopping the key (`command-palette.tsx:393-398`).
    - Everything else uses a document listener (`use-dismiss.ts:11-28`): `useDropdown` (`dropdown.tsx:100`: MultiSelect, CurrencySelect, GroupedPicker, AmountInput's currency chip), `useComboboxCore` (`combobox-core.tsx:369`: EntityCombobox, MultiEntityCombobox, CountrySelect), HoverMenu `:173`, Tooltip `:568`, NumpadSheet `:192`, the AppShell flyout `:1198`.
    - Combobox closes its list in its own `onKeyDown` without stopping the key (`combobox.tsx:587-589`, `:1267-1269`).
    - GroupedPicker adds a second document listener by hand (`grouped-picker.tsx:50-57`) on top of `useDropdownSearch`'s.
  - The kit already knows the limit: `numpad-sheet.tsx:187-191` ("inside a Modal the dialog's own Escape handler … stops the event before a document listener sees it, so there the press closes the dialog").
  - Some places got it right on their own: Autocomplete (`autocomplete.tsx:393-399`), InlineEditField (`inline-edit-field.tsx:386-393`), DatePicker's month grid (`date-picker.tsx:799-804`).
  - PROVEN (scratch vitest against the source; Popover and Modal+ChipInput as passing controls):
    - Modal + Combobox, Escape on the open list → the Modal's `onClose` is called.
    - Modal + EntityCombobox, Escape in the panel's search → `onClose` called.
    - Modal + MultiSelect → `onClose` called.
    - FullBleedDialog + EntityCombobox → `onClose` called.
    - ChipInput with a draft: Escape keeps a Modal open but closes a FullBleedDialog (the draft rule differs).
  - Apps:
    - keksdose `features/reports/product-merge-modal.tsx:354` (DialogFrame) with two EntityComboboxes at `:537,:550`.
    - kastlan `features/finance/pages/invoice-list-page.tsx:204-212` and `features/communication/pages/communication-page.tsx:420,529,656`.
    - The phone row editor is a FullBleedDialog (`data-table.tsx:2242`).
- Fix: one Escape stack in `hooks/use-dismiss.ts`, the same last-in-first-out idea `use-overlay-history.ts` already uses for Back.
  - `useDismissLayer(open, onEscape)` pushes a layer. One capture-phase document listener hands Escape to the topmost layer only.
  - One claim rule: the caller's own handler, or an explicit `claimEscape(e)` that ChipInput, InlineEditField and the month grid call. Not "any `preventDefault`".
  - Modal, FullBleedDialog, PickerSheet, Popover, useDropdown, useComboboxCore, Combobox, Autocomplete, CommandPalette, NumpadSheet, HoverMenu, Tooltip and the flyout all register. GroupedPicker's own listener goes.
  - No public API change. Behaviour changes only where it is wrong today. Add a sweep test: every kit picker inside Modal and FullBleedDialog, Escape closes only the list.
- Order: none. Do it before DUP-4, which moves pickers between cores.

### DUP-2 · sev 3 · bug · S · PROVEN · touches: `src/components/field-parts.tsx`, `src/components/slider.tsx`, `src/components/country-select.tsx`, `src/components/currency-select.tsx`, `src/components/one-time-code-input.tsx`, `src/components/swatch-picker.tsx`, `src/components/icon-picker.tsx`, `src/rhf/fields.tsx`, `src/components/__tests__/help-popover-034.test.tsx`
- What: The §4/§10.23 rule says a FieldHint becomes the field's caption at Large and on touch. It lives in `useFieldHint`/`useFieldMessages`, but seven fields restate the text-hint split by hand, and the ones that don't call `useInlineHint` first leave the fact behind a 14 px "?" on a phone. The 0.34 notes already record one round of this drift ("Select and AmountInput … 0.32 had missed them").
- Evidence:
  - Shared: `useInlineHint` `field-parts.tsx:185`, `isTextHint` `:204`, `useFieldHint` `:229`, `useFieldMessages` `:485`.
  - The inline `textHint` expression is copied verbatim at `ui.tsx:2635` (Select), `number-input.tsx:336`, `amount-input.tsx:366`, `currency-select.tsx:213`, `country-select.tsx:361`, `one-time-code-input.tsx:150` and `phone-input.tsx:47-48`.
  - No `useInlineHint` at all (FloatingField and LabelStrip draw `hint` raw, `ui.tsx:1816`, `field-parts.tsx:644`):
    - CountrySelect `:511-514`
    - CurrencySelect `:214`
    - OneTimeCodeInput `:249-253`
    - Slider `:272`
    - SwatchPicker `:261` and IconPicker `:227` (through LabelStrip)
    - every Rhf twin: `RhfField` puts any `hint` in `FormDescription` (`rhf/fields.tsx:251`), so a FieldHint is a lone "?" under the field.
  - The sweep test says "Each kit field that takes a `hint`" but lists 5 (`help-popover-034.test.tsx:130-154`).
  - PROVEN: on a coarse pointer, Input drops the "?" (the control); Slider and CountrySelect still render `button[name=<fact>]`.
  - Live: Kurvenschmiede `shared/ui/slider-field.tsx:59` wraps every hint in `<FieldHint>` for the kit Slider, used 6× in `features/control/controller-panel.tsx:34-92` (Kp/Ki/Kd hints are facts).
- Fix: every field resolves `hint` through `useFieldHint` (text fields) or `useFieldMessages` (pickers and groups). Slider, CountrySelect, CurrencySelect, OneTimeCodeInput and LabelStrip's callers move. `RhfField` calls `useInlineHint` before `FormDescription`. Turn the 034 test into a real sweep over every component whose props declare `hint`. Not breaking.
- Order: independent. DUP-11 removes two of the copies.

### DUP-3 · sev 2 · consistency · S · PROVEN · touches: `src/components/field-parts.tsx`, `src/components/ui.tsx`, `src/components/chip.tsx`, `src/components/number-input.tsx`, `src/components/amount-input.tsx`, `src/components/combobox.tsx`, `src/components/entity-combobox.tsx`, `src/components/multi-entity-combobox.tsx`, `src/components/autocomplete.tsx`, `src/components/list.tsx`, `src/components/country-select.tsx`
- What: The kit draws "a locked control and its reason" in three copies of one component. Only the two that ask `useDisabledReasonLine` follow §4 ("`disabledReason` shows as a line under the control, not only as a tooltip", text-size §4 line 139). Every field locked through `commit` uses the third copy without its `line` flag, so on a touch screen or at Large the reason sits only in a tooltip. A tap does open it (Tooltip treats an `aria-disabled` control as one that activates nothing, `tooltip.tsx:463-468`), but nothing is in the layout, unlike the same lock on the form's Save button. 0.34's C2 is rolling `commit` out on fields now (keksdose 25 sites, kastlan 21 files, adopt-notes).
- Evidence:
  - The copies:
    - `ReasonFrame` `ui.tsx:603-641` (asks `useDisabledReasonLine`)
    - `ChipReasonFrame` `chip.tsx:1045-1075` (asks)
    - `LockedReason` `field-parts.tsx:337-365` (takes `line` from its caller).
  - `line` is passed only by Checkbox `:280` and Switch `:208`.
  - Tooltip only: Input `ui.tsx:2366-2372`, Select `:2695`, NumberInput `:568`, AmountInput `:785`, Combobox `:464,:1163`, EntityCombobox `:259`, MultiEntityCombobox `:223`, Autocomplete `:296`, List `:690`.
  - Hand-rolled Tooltips with a reason: CountrySelect, SwatchPicker, FileButton, InlineEditField, DangerConfirm.
  - What a lock *suppresses* is restated per field too:
    - Input drops the caller's `onBlur` and swallows Enter (`ui.tsx:2275-2284`, `2353-2361`).
    - Combobox keeps the caller's `onBlur` (`combobox.tsx:531`).
    - Autocomplete keeps `onBlur` and every key but Enter (`autocomplete.tsx:383-389`).
    - Textarea has no `commit` at all.
  - The "is there a reason" predicate is restated as `hasContent`/`hasReason`/`given` (see DUP-10).
  - PROVEN: on a coarse pointer under a locked `WriteLockProvider`, Button `commit` shows the reason as visible text (the control), while Input, Select and AmountInput `commit` show it only in a hidden span.
- Fix:
  - One frame: `LockedReason` takes `display?: DisabledReasonDisplay` and calls `useDisabledReasonLine` itself (ReasonFrame's shape). `ReasonFrame` and `ChipReasonFrame` are deleted.
  - Every field forwards a `disabledReasonDisplay` prop as Button does.
  - One `lockedInputProps(lock, { onKeyDown, onBlur })` in field-parts decides what a lock swallows, for Input, NumberInput, AmountInput, Combobox and Autocomplete. Give Textarea `commit` while there.
  - Additive props. The visible change (a line under locked fields on phones and at Large) is what §4 asks for, so put it in the 0.34 adoption doc beside C2.
- Order: before the apps adopt C2 widely, so they see one behaviour.

### DUP-4 · sev 2 · duplication · M · CONFIRMED · touches: `src/components/currency-select.tsx`, `src/components/amount-input.tsx`, `src/components/multi-select.tsx`, `src/components/grouped-picker.tsx`, `src/components/dropdown.tsx`, `src/components/autocomplete.tsx`, `src/components/combobox-core.tsx`
- What: The picker family stands on three foundations, and each fix lands on one of them only. `useComboboxCore` + `ComboboxPanel` has the phone sheet (live #200), portal anchoring (dev#548), the live result count and disabled rows. `useDropdownSearch` + an absolute `DropdownPanel` has none of them. Combobox and Autocomplete are standalone. Two copies have already drifted.
- Evidence:
  - The `useDropdownSearch` pickers have no `usePhoneLayout`/PickerSheet, and no `anchorRef`, so they are clipped by an `overflow` ancestor (the dev#548 bug): CurrencySelect `:295`, MultiSelect `:248-255`, GroupedPicker (its own absolute div `:98`).
  - `combobox.tsx:91-93` claims "Every other panel in this package already learned this — DropdownPanel's anchorRef form".
  - AmountInput's currency chip is a hand copy of CurrencySelect: filter `amount-input.tsx:527-539` = `currency-select.tsx:196-205`; panel `:696-736` vs `:293-334`. It has drifted:
    - The name keeps plain `truncate` (`amount-input.tsx:731`); T1 gave CurrencySelect `truncate-until-large` (`:329`).
    - No `options` subset, no check mark, no listbox id.
    - No #308 panel width (`currency-select.tsx:300`).
  - Autocomplete hand-rolls its rows (`autocomplete.tsx:531-560`, plain `truncate` at `:548,:554`), although `combobox-core.tsx:466-478` exports `SUGGESTION_LIST_CLASS`/`suggestionRowClass` as "one look for Combobox, InlineEntityCombobox and Autocomplete" (T1 put `truncate-until-large` there).
  - Usage: keksdose CurrencySelect ×6, MultiSelect ×2, GroupedPicker ×2 (`shared/components/category-select.tsx:109`); Kurvenschmiede MultiSelect ×3; kastlan and keksdose Autocomplete ×3.
- Fix:
  - Extract `CurrencyOptionList` (filter + rows) from currency-select.tsx; AmountInput's chip renders it.
  - Autocomplete rows use `suggestionRowClass`.
  - Move CurrencySelect, MultiSelect and GroupedPicker's search panels onto `ComboboxPanel` (phone sheet, anchoring, announcements), or at least give `DropdownPanel` the anchored form plus the phone sheet by default.
  - Internal only, no API change. Visible: phone sheet and Large wrapping in those pickers.
- Order: after DUP-1 (one Escape path); DUP-5's matcher drops in at the same time.

### DUP-5 · sev 2 · consistency · S · CONFIRMED · touches: `src/search/search-index.ts`, `src/components/combobox-core.tsx`, `src/components/combobox.tsx`, `src/components/multi-select.tsx`, `src/components/country-select.tsx`, `src/components/icon-picker.tsx`, `src/components/grouped-picker.tsx`, `src/components/currency-select.tsx`, `src/components/amount-input.tsx`, `src/components/data-table-filters.ts`
- What: Typing into a kit list is matched by six different rules. "zurich" finds Zürich in CountrySelect and the command palette, but not in an EntityCombobox, a Combobox, a MultiSelect or a DataTable text filter. "İ" folds by locale in GroupedPicker but not in the combobox family.
- Evidence:
  - Accents off: `normalizeSearchText` (exported; NFD, marks off, lower, ß→ss) `search-index.ts:112-120`; CountrySelect `fold` `country-select.tsx:167-170`; IconPicker `fold` (and locale) `icon-picker.tsx:98-100`.
  - Locale case only, accents kept: GroupedPicker `grouped-picker.tsx:60-74`; currency filter ×2 `currency-select.tsx:197-204`, `amount-input.tsx:529-537`; DataTable text filter `data-table-filters.ts:57-61`.
  - Plain `toLowerCase`: combobox-core `:273-276` (EntityCombobox, MultiEntityCombobox), Combobox `:396-398` and `:1040-1046` (starts-with ranked first; core doesn't rank), MultiSelect `:117-123`, share-card `:366-369`, translation-review `lib/translation-review.ts:415-425`.
  - Users: keksdose (Swiss-German payees and categories), kastlan (EntityCombobox ×18).
- Fix: `lib/text-match.ts` with `foldForSearch(text, locale)` (the `normalizeSearchText` rule plus `toLocaleLowerCase(locale)`) and `rankMatch(label, query)` (code/exact → starts → contains, CountrySelect's `rank`). Every site above moves. Not breaking: the folding only widens matches.
- Order: with DUP-4.

### DUP-6 · sev 3 · bug · S · CONFIRMED · touches: `src/components/data-table.tsx`
- What: DataTable's phone filter sheet is the last hand-rolled modal in the kit. It says `role="dialog" aria-modal="true"`, but focus stays on the page behind it, there is no Escape, no accessible name, no focus return and no exit motion. The row dialog in the same file uses FullBleedDialog, and `Modal` is a bottom sheet on phones.
- Evidence:
  - `MobileFilters` `data-table.tsx:2889-3051`: `useBackdropClose` + `useBodyScrollLock` + `useOverlayHistory` copied in (`:2918-2923`), the overlay at `:2968-2975`, no `useFocusTrap`, no `onKeyDown`, no `aria-label`/`labelledby`.
  - Compare the row dialog `<FullBleedDialog>` `:2242`, and Modal's phone shape `modal.tsx:383` (`items-end … md:items-center`).
  - The 2026-09-22 audit's "Only Modal manages focus; every other dialog strands it" (`docs/module-audit-2026-09-22.md`, Accessibility table) was fixed everywhere else.
  - Reach: every DataTable with a filterable column in the phone card layout, in all three apps.
- Fix: render the sheet as `<Modal open onClose aria-label={labels.filters}>` with a `DialogFrame` (title, body, Clear-all/Done footer). Delete the copied hooks. Internal; visible as focus moving into the sheet and Escape/Back closing it.
- Order: independent. Picks up DUP-1 for free once done.

### DUP-7 · sev 2 · bug · S · CONFIRMED · touches: `src/hooks/use-anchored-panel.ts`, `src/components/popover.tsx`, `src/components/dropdown.tsx`, `src/components/hover-menu.tsx`, `src/components/combobox-core.tsx`, `src/components/tooltip.tsx`, `src/shell/app-shell.tsx`
- What: The vertical half of anchored placement is shared (`useAnchoredPanel`); the horizontal half is written five times against three different viewport widths. Tooltip learned in keksdose live #381 that `window.innerWidth` is the wrong width on a phone (the layout viewport grows with any overflow) and moved to `clientWidth`. The other copies still clamp against `innerWidth`.
- Evidence:
  - Tooltip `viewportSize` uses `clientWidth || innerWidth` `tooltip.tsx:808-823` (with the reason at `:284-300`).
  - Popover `popover.tsx:137-149`, Dropdown `dropdown.tsx:327-336` ("Clamped exactly as Popover clamps"), HoverMenu measure-and-shift `hover-menu.tsx:247-267` (innerWidth − 8).
  - combobox-core `:883-888` (`clientWidth`, RTL only, with no clamp at all in LTR).
  - AppShell flyout `app-shell.tsx:1160-1168` (`innerWidth` for an RTL `right`, so it is off by the scrollbar on a desktop).
  - The flyout (`SidebarFlyout` `:1153-1290`) also re-implements HoverMenu's hover timers (140 ms vs `hover-menu.tsx` 120 ms), Escape, portal and `role="menu"`, without HoverMenu's arrow keys or viewport clamp. Low reach: only kastlan has sub-items, and it has overview pages.
- Fix: `anchoredInline(rect, panelWidth, { dir, align, edge })` beside `anchoredPanelPlacement` in `use-anchored-panel.ts`, reading `viewportSize()` moved there from Tooltip. Popover, DropdownPanel, ComboboxPanel, HoverMenu and the flyout call it. Optionally build SidebarFlyout on HoverMenu. Internal.
- Order: independent.

### DUP-8 · sev 2 · bug · S · CONFIRMED · touches: `src/components/ui.tsx`, `src/components/field-parts.tsx`, `src/components/combobox-core.tsx`, `src/components/choice-parts.ts`, `src/components/autocomplete.tsx`, `src/components/multi-select.tsx`, `src/components/chip.tsx`, `src/components/file-dropzone.tsx`
- What: A field's error, `invalid` and `aria-describedby` wiring exists as four hooks and about ten inline copies. `useFieldError` is module-private to ui.tsx, so `useComboboxFieldError` says it "restates it", and the copies have drifted.
  - Autocomplete announces a form library's `aria-invalid` but doesn't paint it: the defect `useFieldError`'s 4th parameter was added to fix.
  - MultiSelect leaves a `Field` spread's `id`, `aria-invalid` and `aria-required` on its wrapper `<div>`, where its four siblings move them to the trigger.
  - Two fields print their error in a different type.
- Evidence:
  - The hooks: `useFieldError` `ui.tsx:1942-1965` (private); `useComboboxFieldError` `combobox-core.tsx:448-460` (ignores `aria-invalid`; callers OR it in by hand: `combobox.tsx:330-333`, `entity-combobox.tsx:203-205`, `multi-entity-combobox.tsx:166-168`, `country-select.tsx:362-364`); `useFieldMessages` `field-parts.tsx:485-523` (own join); `choice-parts.ts:7-27`.
  - `FIELD_ERROR_CLASS` literal ×14 (e.g. `amount-input.tsx:309`, `number-input.tsx:212`, `combobox-core.tsx:440`, `phone-input.tsx:45`, `checkbox.tsx:69`).
  - Autocomplete: `useComboboxFieldError(error, invalid, …)` `:220`; `aria-invalid={field.isInvalid || rest["aria-invalid"]}` `:362`; border from `field.isInvalid` alone `:432`.
  - MultiSelect: destructures no `id`/`aria-invalid`/`aria-required` (`:71-91`), spreads `rest` on the wrapper `:175`, trigger `aria-invalid={field.isInvalid}` `:216`. Compare `combobox.tsx:321-327` ("Off rest and onto the <input> … on the wrapper div the hint and required state described nothing").
  - Type drift: ChipInput `chip.tsx:1420,1425` and FileDropzone `file-dropzone.tsx:510` use `text-xs text-danger`, against `mt-1 text-caption leading-tight text-danger` elsewhere.
- Fix: export `useFieldError(error, invalid, describedBy, ariaInvalid)` and `FIELD_ERROR_CLASS` from field-parts. Delete `useComboboxFieldError` and the inline copies. MultiSelect takes the `Field` spread like Combobox. Not breaking.
- Order: with DUP-2 (the same files); DUP-11 removes two copies.

### DUP-9 · sev 2 · bug · S · CONFIRMED · touches: `src/rhf/fields.tsx`, `src/components/money-field.tsx`
- What: The Rhf twins pass props through two ways. `Omit<FieldProps, …>` passes every new prop; `Pick<FieldProps, …>` allow-lists drop new ones without a word. 0.34 already fixed one such miss (RhfNumberField and `commit`); RhfSelect and RhfCheckbox still drop the lock that Select and Checkbox take. RhfMoneyField re-declares AmountInput's props by hand and re-implements MoneyField's draft-and-settle with different rules.
- Evidence:
  - `fields.tsx:415-416` ("the 0.33.1 notes said the Rhf twins pass it on, and this list did not pick it").
  - RhfSelect `Pick<SelectProps, "size" | "autoFocus" | "aria-label">` `:1485` (Select has `commit`/`disabledReason`, `ui.tsx:2606-2616`).
  - RhfCheckbox `Pick<CheckboxProps, "inputClassName" | "autoFocus" | "aria-label">` `:1560` (Checkbox locks, `checkbox.tsx:175`).
  - RhfMoneyField's hand list `:555-599` has no `calculator` (keksdose K6), `labels`, `currencyNames` or `variant`.
  - `MoneyControl` `:611-683` keeps its own draft with `parseAmount` (regex `^-?\d*[.,]?\d*$`, `:603-609`). MoneyField uses `parseSettled` + snap-back to the stored amount on "-" (`money-field.tsx:22-28,67-96`); the twin leaves "-" on screen while the form keeps the old number.
  - `toNumber` uses a single `.replace(",", ".")` (`:392`), the U-14 pattern.
  - Usage: kastlan RhfMoneyField ×18; RhfSelect/RhfCheckbox ×43 across the apps.
- Fix:
  - Build every twin's props as `Omit<FieldProps, BoundKeys>`.
  - Share `useMoneyDraft(value, valueAs)` between MoneyField and MoneyControl.
  - Add a type test: for each twin, `commit`/`disabledReason` are assignable whenever the field has them.
  - Additive; kastlan can then lock its money rows the way C2 describes.
- Order: after C2 lands (same props).

### DUP-10 · sev 2 · structure · M · CONFIRMED · touches: `src/components/number-input.tsx`, `src/components/amount-input.tsx`, `src/lib/decimal-marks.ts`
- What: NumberInput and AmountInput are two copies of one numeric-field engine: lock, hint and caption, error, `describedBy` order, draft/derived/display, calculator, numpad sheet and end padding. Each fix has had to be made twice, and some reached only one.
- Evidence:
  - Side by side: `number-input.tsx:326-400` vs `amount-input.tsx:357-480` (lock, hint, `describedBy`, `invalid`, `showCalc`/`showNumpad`/`focused`, mark, draft, display); the caption/error tails `number-input.tsx:574-592` vs `amount-input.tsx:742-753`.
  - Drift:
    - NumberInput measures its end controls (keksdose live #367, `:352-375`); AmountInput keeps a `pe-*` ladder (`:398-402`).
    - NumberInput takes a `locale` prop (`:383`); AmountInput reads only the provider (`:434`).
    - The 0.32 FieldHint-caption fix reached NumberInput and missed AmountInput until 0.34 (text-size §10.23 note).
- Fix: `useNumericField(props, { settle, display })` in `components/numeric-field.ts` returning lock, hint, error, `describedBy`, draft, display and calculator/numpad state. Both components keep their own settle (money minor-unit vs plain) and trailing controls. Give AmountInput `locale`. Internal.
- Order: after DUP-2, DUP-3 and DUP-8, which shrink what moves.

### DUP-11 · sev 1 · duplication · S · CONFIRMED · touches: `src/components/field-parts.tsx`, `src/components/choice-parts.ts`, `src/admin/admin-parts.ts`, `src/lib/safe-storage.ts`, `src/auth/auth-errors.ts`, `src/lib/session-refresh.ts`, `src/components/measured-grid.tsx`, `src/lib/dates.ts`
- What: Small helpers restated where an exported one exists. Mostly identical copies, plus two with opposite fallbacks.
- Evidence:
  - "Is there content": `hasContent`/`hasMessage`/`hasReason`/`present`/`given` ×14, identical. Exported at `field-parts.tsx:464`, `choice-parts.ts:25`, `admin-parts.ts:38`; private copies at `ui.tsx:379`, `danger-confirm.tsx:76`, `inline-edit-field.tsx:144`, `line-items.tsx:220`, `chip.tsx:1078`, `file-dropzone.tsx:551`, `file-button.tsx:432`, `feedback-attachment.tsx:1062`, `rhf/fields.tsx:168`, `role-select.tsx:79`, `write-lock.tsx:105`. A drifted one: FeedbackComposer `disabledReason != null && !== false` (`feedback-thread.tsx:757`) takes `""` as a reason.
  - Ref merging: `assignRef` (`choice-parts.ts:30`) vs hand copies at `amount-input.tsx:404-411`, `form-actions.tsx`, `scroll-area.tsx`, `search-field.tsx`.
  - HTTP status probing: `statusOf` + the axios/ofetch/Node probe in both `auth-errors.ts:274,300-305` and `session-refresh.ts:224-233`.
  - Storage: no `removeStored` in `safe-storage.ts`, so `landing/routing.tsx:143-150` and `billing/checkout-processing.ts:136-145` guard it by hand; `demo/demo-banner.tsx:21-40` re-guards `sessionStorage`.
  - Reduced motion: `prefersReducedMotion` exists twice with opposite answers when there is no `matchMedia` (`settings/use-settings-focus.ts:22` false, `hooks/use-close-transition.ts:14` true).
  - `decimalMark` copied verbatim into `measured-grid.tsx:98-106` from `lib/decimal-marks.ts:24-32`.
  - DatePicker re-wraps `formatIsoDate` only because that function demands a `string` locale (`date-picker.tsx:131-136` vs `dates.ts:127-137`).
  - `sameRect` ×2 (`tour.tsx:253`, `use-anchored-rect.ts:14`).
  - The `describeError` → 429 → code → `failed` ladder is restated in about 15 components (sign-in, email-change, delete-account, data-export, sessions, admin panels).
- Fix: one `lib/presence.ts` (`hasContent`). Move `mergeDescribedBy`/`assignRef` to field-parts. Add `removeStored` (+ a `sessionStorage` pair). Export `httpStatusOf` from auth-errors for session-refresh. One `prefersReducedMotion`. Measured-grid imports `decimalMark`. Widen `formatIsoDate`'s locale to `string | undefined`. Optionally a `presentFailure(error, { describeError, labels })` for the ladder. Internal, XS each.
- Order: whenever. Best inside the PR that touches each file for DUP-2/3/8.
