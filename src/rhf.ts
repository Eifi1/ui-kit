// `@eifi1/ui-kit/rhf` — the react-hook-form adapter: Form and the bound Rhf* fields (and
// RhfField as the escape hatch). The shadcn scaffold they are built from (FormField,
// FormItem, FormLabel, FormControl, FormDescription, FormMessage, useFormField) left the
// surface in 0.35 (refactor audit 2026-10, API-6f; deprecated in 0.34).
//
// The only entry point in the package that requires `react-hook-form`, and an optional
// peer for that reason: an app without a form library installs nothing for it. NOT
// re-exported from the main barrel, which would make the peer everyone's — the reason
// the barrel dropped its last react-hook-form import (see the wizard section of
// src/index.ts). The packaging contract test holds that line.
export * from "./rhf/form";
// The react-hook-form bridge to the wizard's Next gate (useWizard lives in /wizard).
export * from "./rhf/use-rhf-wizard-step";
// Bound fields — one line per field (RhfTextField, RhfNumberField, RhfIntegerField, RhfMoneyField,
// RhfDateField, RhfTextarea, RhfSelect, RhfCheckbox, RhfCombobox, RhfTextCombobox; 0.22: RhfTimeInput,
// RhfDateRangePicker, RhfToggleGroup, RhfIbanInput, RhfPhoneInput; 0.23: RhfCountrySelect,
// RhfMonthPicker; 0.24: RhfInlineEntityCombobox)
// and RhfField, the shell they are built on.
export * from "./rhf/fields";
// LineItems over useFieldArray.
export * from "./rhf/line-items";
