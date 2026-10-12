# Adopting `@eifi1/ui-kit` 0.23

The adoption round: the gaps kastlan, keksdose and Kurvenschmiede found while moving to
0.22, plus the kit's own later list, in one release (Marcel). Everything is opt-in except
the few changes under "Everyone". `CHANGELOG.md` → `0.23.0` has the release notes, and
the showcase (⌘K) has every new part live.

## Everyone

1. Bump to `^0.23.0` by hand; a caret below 1.0 locks the minor version.
2. **Changes you may see on the bump:**
   - **DangerConfirm's held confirm (keksdose G4a):** while a guard is still open (the
     phrase not typed, the box not ticked, no password) the confirm is `aria-disabled`
     and focusable instead of natively `disabled`, and its Tooltip names the open guard
     ("Tick the box to confirm"). A click or Enter still does nothing. A test that
     asserts `toBeDisabled()` on it now fails — assert `aria-disabled="true"` instead;
     note that `toBeEnabled()` passes on an `aria-disabled` button, so such an assertion
     silently stops testing anything. The button is remounted when its reason clears, so
     re-query it rather than holding a reference across the flip. A lock reason still
     wins over a guard; while busy the button stays natively `disabled`.
   - **`onConfirm` gets a second argument** `{ typed?, password?, acknowledged? }` (keys
     only for the guards asked for). A `toHaveBeenCalledWith("pw")` on it now fails.
   - **FeedbackAttachmentField `onError`** gets a trailing info argument (below); its
     chip remove buttons are the kit's `IconButton` (same 28px box and 16px glyph, the
     kit's hover tint and focus ring).
   - **Delete / Backspace on a closed, `clearable` EntityCombobox, MultiEntityCombobox
     or CountrySelect clears it** — the "×" is pointer-only and out of the tab order.
   - **An unlabelled Combobox-family field passed `hint`** always renders its end-hint
     row (one wrapper `<div>`, nothing visible) so a "?" coming and going no longer
     remounts the control — the 0.22 rule, now for every family member.
   - **CountrySelect:** a caller's `aria-labelledby` now names the trigger (it landed on
     the role-less wrapper). **MonthPicker:** `aria-required` reaches its trigger.
3. **New label namespace** `columnMapper`; new keys `dangerConfirm.needsPhrase`,
   `needsAcknowledge`, `needsPassword` and the optional
   `feedbackAttachment.attachmentUploadFailed` — in every catalogue. An app that spreads
   its own complete `dangerConfirm` object over the kit's must add the three keys.

## New, opt-in

| Area | API |
|---|---|
| Write lock (keksdose G1, G2) | `commit` / `disabledReason` on Combobox, EntityCombobox, InlineEntityCombobox, MultiEntityCombobox and Autocomplete (focusable, `aria-disabled`, the reason in the Tooltip; no list opens, nothing reaches `onChange` / `onCreate` / `onSubmit`); StepperNav `finishCommit` / `finishDisabledReason` (named after `finishVariant` — a bare `commit` would not say which of its buttons it locks) |
| Create row (keksdose G9) | InlineEntityCombobox `onCreate(query)` + `createLabel`: a last "Create “…”" row when the query names no option. On all three entity pickers `createEmptyLabel` shows the row with an empty query too (`onCreate={(n) => mint(n \|\| defaultName)}`), and `createCommit` locks only the creating — the row stays, dimmed, with the reason |
| FormActions (keksdose G3) | `cancelVariant` (default `"secondary"`; `"ghost"` for quiet rows) and `size` (`"sm"` for dense rows) for every button it renders |
| DangerConfirm (keksdose G4) | the held confirm's reason (above); `onConfirm(password, { typed })` — keksdose: `onConfirm={(_pw, { typed }) => send({ confirm_email: typed ?? null })}`; type `DangerConfirmValues` |
| Feedback (keksdose G5, G6) | FeedbackAttachmentField `onError(kind, info)` — in `refs` mode `onError(kind, error, info)` — with `info: { file, files, message, maxBytes, accept, max?, error? }` (`message` is the kit's sentence, e.g. "“huge.png” is larger than 10 MB"); `disabled` in every mode, `commit` / `disabledReason` in `refs` mode (it uploads on pick); FeedbackComposer / ChatComposer `maxLength`, `showCount`, `countLabels` (the Textarea's counter; a draft over the limit blocks Send). FeedbackDialog's `onAttachmentError` and FeedbackNoteEditor's `attachment.onError` carry `info` too |
| Fields | AmountInput / MoneyField / RhfMoneyField `inputClassName` (keksdose G7, as NumberInput's); CountrySelect `ref` (the trigger — react-hook-form's focus-on-error) and `clearable` (`null`); `FieldStrip` — the 11px strip label, hint and error over any content, `role="group"` named by the label, `pad="clear"` (20px, default) or `"field"` (16px), render-prop ids (keksdose G8); `disabledReason` per option on SwatchPicker, IconPicker and TileRadioGroup |
| Dates (kastlan) | DatePicker / DateRangePicker `monthJump`: the panel caption opens a month grid (‹ › a year) — a July–June period in 8 clicks instead of ~17. Opt-in because it adds a tab stop to the panel |
| `@eifi1/ui-kit/rhf` (kastlan) | `RhfCountrySelect` (`clearable`, `clearValue`), `RhfMonthPicker` (`mode="year"`, `valueAsNumber`) — every binding is tested to focus its control on a failed submit |
| Menus (keksdose) | TopBarActionMenu `{ kind: "heading", key, label }` entries: a heading starts a group (to the next heading or divider), takes no focus, an empty group is not drawn |
| Column mapper (Kurvenschmiede, keksdose) | `ColumnMapper` — paste, drop or choose a file → `parseTextTable` (separator, decimal convention, header row, unread lines) → a preview with a role select per column → `onChange(result \| null)`; `ColumnRoleTable` (the preview and role selects alone, for rows you already have); helpers `guessMapping`, `missingRoles`, `assignColumnRole`, `roleOfColumn`, `readMappedTable`, `readTextFile` (UTF-8, Windows-1252 fallback); `/table-text` adds `parseTextTable`, `tableNumber` |

## kastlan

- The service-charge wizard (`new-service-charges-wizard-page.tsx`): its two
  `RhfDateField`s → `<RhfDateRangePicker fromName="period_start" toName="period_end"
  monthJump required />`; the refine on `period_end` still shows.
- `RhfCountrySelect` for the address form (focus-on-error now lands on it),
  `RhfMonthPicker` for the budget month and fiscal year (`mode="year"`).

## keksdose

- StepperNav: `finishCommit` instead of cloning `commit` in through `renderFinish`.
- The statement's account picker: `commit` on InlineEntityCombobox instead of the hand
  Tooltip; "Create cash account" → `onCreate` + `createEmptyLabel` (+ `createCommit`
  for the read-only demo, dev#496).
- FormActions `cancelVariant="ghost"` / `size="sm"` for the rows that lost theirs.
- UserActionConfirm / UserPlanEditor → `DangerConfirm` (`phrase` or
  `requireAcknowledge`, the typed address from `onConfirm`'s second argument).
  `danger-card-frame.test.tsx:135` asserts `toBeDisabled()` — see "Everyone".
- The support AttachmentPicker → `FeedbackAttachmentField refs … disabled={sending}
  onError={(k, e, i) => toast.error(k === "upload" ? apiMessage(e) : i.message)}`; the
  reply box `maxLength={MAX_SUPPORT_BODY} showCount`. Still app-side: a paste into the
  composer's textarea reaches the field only through `pasteFrom`, and the kit's picker
  is a secondary button (yours is ghost/sm).
- The VAT cell: `inputClassName="text-end"` instead of `[&_input]:text-end`.
- The location cell → `<FieldStrip label={…}>…</FieldStrip>` (and `ClearedStatusLocked`).
- The tour menu: a `{ kind: "heading" }` before each block; drop the menu-wide
  `heading`, which stacked above the group headings reads as a second caps line.
- The bank import's map step: `ColumnRoleTable` for the table, the per-column selects,
  `assignColumn` / `roleOfColumn` and the missing-roles banner (amount / debit / credit
  as `required: "money"`; `CsvMapping` passes through as the mapping). The server sniff,
  the upload step and the format controls stay yours.

## Kurvenschmiede

- `columns-input.tsx` and `csv.ts` → `ColumnMapper` with roles `{ value, label,
  required: true, numeric: true }`; convert with `tableNumber(row[mapping[r]],
  result.decimalComma)` once `result.complete`. "Still needed: …" replaces the
  too-few-columns warning.
