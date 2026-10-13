# Adopting `@eifi1/ui-kit` 0.22

The inputs round: kastlan's input audit (1–8), keksdose's inputs audit (K1–K20) and tours
audit, and Kurvenschmiede's answers, in one release (Marcel). Almost everything is
opt-in; the fixes listed under "Everyone" apply on the bump. `CHANGELOG.md` → `0.22.0`
has the release notes, and the showcase (⌘K) has every new part live.

## Everyone

1. Bump to `^0.22.0` by hand; a caret below 1.0 locks the minor version.
2. **Fixes you will see:**
   - **Tour (keksdose):** a step without a target (or with a missing one) no longer keeps
     the previous step's spotlight; its card is centred. React 19 discarded the
     render-phase reset while the follow-the-target timer had an update queued; the
     spotlight is now stored with its step. An `awaitClick` step accepts the click when
     its target appears late.
   - **ToggleGroup field chrome (keksdose K1, #117 again):** the active fill no longer
     sits on the label — `pt-5`, an 18px md segment line, `size="sm"` honoured inside the
     chrome; the field stays 42px.
   - **NumberInput / NumberField (keksdose K5):** the decimal mark follows the provider
     locale ("3,5" in fr/it/de) and grouping is read ("1.234,56" → 1234.56). `value` and
     `onChange` stay dot-decimal. In a comma locale a typed "." stays until the value
     settles.
   - **A labelled Input / Textarea keeps a caller's `placeholder` (kastlan 8):** shown once
     the label has floated; it used to be replaced by `" "`.
   - **A hint coming and going no longer rebuilds the field (keksdose):** passed at all,
     even as `undefined`, `hint` (and `showCount`) keeps the field's box, as `error` does
     since 0.18 — Select lost focus when its caption appeared. Same in DatePicker,
     MonthPicker, NumberInput and OneTimeCodeInput; a test covers 15 fields. As with
     `error`, the field then sits in one plain `<div>` and `className` stays on the field
     itself: a field with `hint` and `className="flex-1"` in a flex row takes `flex-1` on
     a wrapper of yours. A field WRAPPER that forwards an optional hint as
     `hint={x ? <FieldHint … /> : undefined}` now boxes every field it wraps — forward it
     as `{...(x ? { hint } : {})}` so the prop is absent when there is no hint
     (Kurvenschmiede's NumberField wrapper sized its fields with `className` in flex rows).
   - **Write lock:** an armed `DangerConfirm` under a lock no longer confirms; a droppable
     `FileButton` under `commit` / `disabledReason` no longer takes drops.
   - **TwoFactorSetting:** its code fields are `OneTimeCodeInput`s — digits only, so a
     pasted "123 456" no longer reaches `onEnable` with the space.
   - **PasswordSetting `minLength`** counts characters as a person does (four emoji no
     longer pass a minimum of 8).
   - **AmountInput:** a typed letter or a second decimal mark no longer stays on screen.
   - **CurrencySelect:** a caller's `aria-describedby` / `aria-invalid` reach the trigger.
   - **Dev warning:** a `NumberInput` that looks like money (a currency in the suffix or
     label, no unit) warns once in development — use `AmountInput` / `MoneyField`. Never
     on decimals alone (engineering fields with mm, N·m, Hz stay quiet); silent in
     production and in your tests.
3. **New label namespaces** `characterCount`, `countrySelect`, `inlineEdit`, `ibanInput`,
   `phoneInput`, `signChip`; new keys in `dangerConfirm`, `monthPicker`, `dataTable`,
   `form`, `feedbackAttachment` — in every catalogue.

## New, opt-in

| Area | API |
|---|---|
| Field anatomy (keksdose K4, K11) | `hint` on Input, Textarea, TimeInput, DatePicker / DateRangePicker, CurrencySelect and the Combobox family; `error` on AmountInput, MoneyField, DatePicker, MonthPicker, CurrencySelect, NumberInput; `showCount` (with `maxLength`) on Input and Textarea |
| Write lock everywhere (keksdose K3) | `commit` / `disabledReason` on Select, Checkbox, Switch, ListItem (onClick rows), ToggleGroup, Chip (button), SwatchPicker, FileButton, FileDropzone, CountrySelect, CheckboxGroup; DangerConfirm follows the provider's lock |
| New fields | `OneTimeCodeInput` (one field, numeric, `autocomplete="one-time-code"`, paste cleaned, leading zeros kept, `onComplete`, opt-in `readOnlyUntilFocus`); `CountrySelect` (ISO alpha-2, names via `Intl.DisplayNames`, `countries` to restrict, `preferred` on top, optional flags, searchable); `IbanInput` (grouped, emits compact, mod-97 message, `kind="qr" \| "plain" \| "any"`) with `formatIban`, `isValidIban`, `isQrIban`, … and ISIN helpers; `PhoneInput` (country code + number, E.164 when it parses, else the text as typed; light rules for CH LI DE AT FR IT); `LanguageSelect` (a form field over `languageOptions`); `CheckboxGroup` (`string[]`); `InlineEditField` (Enter/blur commit, Escape cancel, write-lock aware, `redact`); `TypedConfirmField`; `CurrentPasswordInput`; `TileRadioGroup`; `SignChip` |
| Pickers | MonthPicker `mode="year"` (min/max years), `size="sm"`; ToggleGroup `labelPlacement="strip"`, `chromeClassName`; SwatchPicker / IconPicker `label` + `hint`; `UiKitProvider formatDate` (+ `useKitDateFormatter`) for every date trigger and DateMark |
| Money | AmountInput / MoneyField `calculator={false}`; `SignChip` |
| Guards (keksdose K7) | DangerConfirm `requireAcknowledge`, `consequences` |
| Forms | FormActions `submitShortcut="mod-enter"` (honours pending, disabled and the lock); LineItems `rowProps(item, index)` |
| DataTable (keksdose K10) | `mobileSort` — "Sort by" + direction on the phone cards; `column.headerText` |
| Feedback (K16, K17) | FeedbackAttachmentField `refs` mode (`onUpload` → `{ key, name }`, remove by key); FeedbackComposer takes `id` / `data-*` and `size="sm"` (a small Send button, the send hint hidden but kept as the box's description — keksdose's assistant panel); `ChatComposer` alias |
| `@eifi1/ui-kit/rhf` (kastlan 4) | `RhfTimeInput`, `RhfDateRangePicker` (two fields), `RhfToggleGroup`, `RhfIbanInput`, `RhfPhoneInput` |

## kastlan

- Export-only items you asked for: `TileRadioGroup` (icon / colour tiles — for the plan
  picker with price and features use `ChoiceCardGroup type="radio"`), `CurrentPasswordInput`
  for sign-in and re-auth.
- Sign-in 2FA: `OneTimeCodeInput`. Registration / invites keep the meter; the profile:
  `<PasswordSetting strength maxBytes={72} />`.
- Money on `NumberInput` → `AmountInput` / `MoneyField` (the dev warning finds the rest).
- `RhfIbanInput kind="qr"` for the estate's QR-IBAN, `kind="plain"` for payout accounts;
  `RhfPhoneInput` for contacts (old free text stays until edited); `CountrySelect
  preferred={["CH","LI","DE","AT","FR","IT"]}`; MonthPicker `mode="year"` for the fiscal
  year; `RhfTimeInput`, `RhfDateRangePicker`, `RhfToggleGroup` instead of `RhfField` render.

## keksdose

- The bug fixes above (tour, ToggleGroup chrome, NumberInput marks) are the visible part.
- Your four hand-built ToggleGroup chromes → the kit's (`chromeClassName` for the joined pair).
- SaveGuard (~15 sites) → `commit` on the controls listed above.
- `OneTimeCodeInput` on the login page; `CountrySelect countries={…}` for the bank picker
  (with flags); `IbanInput` for accounts and `formatIban` for the statement review;
  MonthPicker `mode="year"` for the tax tab; `InlineEditField` for the inline editors;
  `FormActions submitShortcut`; DataTable `mobileSort`; FeedbackAttachmentField `refs`;
  `ChatComposer` with `data-tour`; LineItems `rowProps`; provider `formatDate`.

## Kurvenschmiede

- `CheckboxGroup` for the per-locale reviewer grants; `LanguageSelect` for the invitation
  language. Your engineering `NumberField`s are untouched by the money warning.
