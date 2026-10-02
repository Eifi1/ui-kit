/**
 * Bound fields: one line per field of a react-hook-form form. `@eifi1/ui-kit/rhf`.
 *
 * ```tsx
 * <Form {...form}>
 *   <RhfTextField name="name" label="Name" hint="As on the lease" required
 *     rules={{ required: "Enter a name" }} />
 *   <RhfMoneyField name="rent" label="Net rent" currency="CHF" />
 *   <RhfDateField name="start" label="Start" />
 *   <RhfSelect name="type" label="Type" options={TYPES} />
 *   <RhfCombobox name="tenantId" label="Tenant" options={tenants} clearable />
 *   <RhfCheckbox name="isDefault" label="Default account" />
 *   <RhfTimeInput name="meetingTime" label="Time" />
 *   <RhfDateRangePicker fromName="periodFrom" toName="periodTo" label="Period" />
 *   <RhfToggleGroup name="interval" label="Interval" options={INTERVALS} />
 *   <RhfCountrySelect name="country" label="Country" preferred={["CH", "DE"]} />
 *   <RhfMonthPicker name="fiscalYear" label="Fiscal year" mode="year" valueAsNumber />
 * </Form>
 * ```
 *
 * Each folds the `FormField → FormItem → FormLabel → FormControl → field →
 * FormDescription → FormMessage` scaffold (see ./form) into one element, the way
 * kastlan's shared/components/form/fields.tsx does for its forms — with what that file
 * left out:
 *
 *  - **The red border.** Every field gets `invalid` from the field state, so an errored
 *    field PAINTS as well as announces. kastlan's number, money, date and entity fields
 *    passed only `aria-invalid` through `FormControl`, or nothing, and `Input`, `Select`
 *    and `Textarea` paint only from the prop (see the note in ./form).
 *  - **Focus on error.** `field.ref` reaches the focusable element — the element itself
 *    where the kit field forwards a ref, a focus handle on it where it does not (the
 *    number field, the pickers) — so `handleSubmit` and `trigger(…, { shouldFocus })`
 *    land the caret on the first field in error.
 *  - **`control` is optional**: under `<Form {...form}>` the fields find the form
 *    through react-hook-form's context. Pass it for the field's value types
 *    (`control={form.control}` checks `name` against the form's values).
 *
 * The common props: `name`, `control`, `label` (a {@link FormLabel} above the field;
 * omitted, none — then give the field an `aria-label`), `hint` (standing advice under
 * the field, attached to it with `aria-describedby`), `required` (the label's mark,
 * and `aria-required` where the control takes it — validation is `rules`' or the
 * resolver's), `rules`, `disabled` (the control only — the value is still submitted;
 * `excludeWhenDisabled` for react-hook-form's drop-the-value semantics), and
 * `className` for the item's box.
 *
 * {@link RhfField} is the shell they are all built on, for a control the kit does not
 * ship (an address autocomplete): it takes a `render` and wires the rest.
 */
import { useLayoutEffect, useRef, useState, type FocusEvent, type ReactElement, type ReactNode } from "react";
import {
  useController,
  type ControllerFieldState,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from "./form";
import { Input, Select, Textarea, type InputProps, type SelectProps, type TextareaProps } from "../components/ui";
import { NumberField, type NumberFieldProps } from "../components/number-field";
import { AmountInput } from "../components/amount-input";
import {
  DatePicker,
  DateRangePicker,
  type DatePickerProps,
  type DateRangePickerProps,
} from "../components/date-picker";
import { TimeInput, type TimeInputProps } from "../components/time-input";
import { IbanInput, type IbanInputProps } from "../components/iban-input";
import { PhoneInput, type PhoneInputProps } from "../components/phone-input";
import { CountrySelect, type CountrySelectProps } from "../components/country-select";
import { MonthPicker, type MonthPickerProps } from "../components/month-picker";
import {
  ToggleGroup,
  type ToggleGroupBaseProps,
  type ToggleGroupClearableProps,
  type ToggleGroupRequiredProps,
} from "../components/toggle-group";
import { Checkbox, type CheckboxProps } from "../components/checkbox";
import { EntityCombobox, type EntityComboboxProps } from "../components/entity-combobox";
import { Combobox, type ComboboxProps } from "../components/combobox";
import type { ComboClearValue } from "../components/combobox-core";
import { cn } from "../lib/cn";

// ── the shell ────────────────────────────────────────────────────────────────

/** What every bound field takes. */
export interface RhfFieldBaseProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> {
  name: TName;
  /** `form.control`. Optional under `<Form {...form}>`; pass it to type-check `name`. */
  control?: ControllerProps<TFieldValues, TName, TTransformed>["control"];
  /** react-hook-form's `rules` (`required`, `min`, `validate` …). */
  rules?: ControllerProps<TFieldValues, TName, TTransformed>["rules"];
  /** A {@link FormLabel} above the field. Omitted: no label — name the control with
   *  an `aria-label` instead. */
  label?: ReactNode;
  /** Standing advice under the field ("As printed on the card"), attached to the
   *  control with `aria-describedby`. */
  hint?: ReactNode;
  /** Draws the label's required mark and sets `aria-required` where the control
   *  takes it. Whether the field IS required is `rules`' or the resolver's to say. */
  required?: boolean;
  /** Disables the control and KEEPS the value: a field locked to a preset (a lease's
   *  preselected unit, a fixed period) still submits it, and `rules` still run.
   *  react-hook-form's own Controller `disabled` drops the value from `handleSubmit`'s
   *  data instead, which a locked preset must never do (kastlan, 0.12). To get that,
   *  add `excludeWhenDisabled`. A form-wide `useForm({ disabled })` still disables
   *  every field the RHF way. */
  disabled?: boolean;
  /** With `disabled`: disable through react-hook-form, so the value is left out of
   *  the submitted data and validation skips it, like a disabled native input in a
   *  plain form post. Default `false`. */
  excludeWhenDisabled?: boolean;
  /** Classes for the item's box (a `grid gap-1`). */
  className?: string;
}

/** What {@link RhfField}'s `render` receives. */
export interface RhfFieldRenderContext<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ControllerFieldState;
  /** The field has an error: pass it to the control's `invalid` so it paints. */
  invalid: boolean;
  /** The error's message, if any. */
  error: string | undefined;
  /** The control's id, which the label points at. `FormControl` sets it on the
   *  rendered element already; this is for a control that routes it elsewhere. */
  id: string;
  /** The label's id, for a control that is named with `aria-labelledby`. */
  labelId: string;
  /** The ids of the rendered hint and message, if any. */
  describedBy: string | undefined;
}

export interface RhfFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> extends RhfFieldBaseProps<TFieldValues, TName, TTransformed> {
  /** The control. Wrapped in {@link FormControl} (its `id`, `aria-describedby` and
   *  `aria-invalid`) unless `asControl` is false. */
  render: (ctx: RhfFieldRenderContext<TFieldValues, TName>) => ReactElement;
  /** `false`: render the control as is, for one that wires its own ids from the
   *  context. Default `true`. */
  asControl?: boolean;
  /** `false`: no {@link FormMessage}, for a control that renders its own error (its
   *  `error` prop). Default `true`. */
  message?: boolean;
  /** `false`: no {@link FormLabel}, for a control that carries its label itself (a
   *  checkbox). Default `true`. */
  showLabel?: boolean;
}

function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

/** The label, with an id the control can be named by. Inside the item, so it can read
 *  the item's id. */
function RhfLabel({ required, children }: { required?: boolean; children: ReactNode }) {
  const { id } = useFormField();
  return (
    <FormLabel id={`${id}-label`} required={required}>
      {children}
    </FormLabel>
  );
}

function ControlSlot<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  field,
  fieldState,
  render,
  asControl,
}: {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ControllerFieldState;
  render: RhfFieldProps<TFieldValues, TName>["render"];
  asControl: boolean;
}) {
  const { id, formItemId, describedBy } = useFormField();
  const element = render({
    field,
    fieldState,
    invalid: fieldState.invalid,
    error: fieldState.error?.message,
    id: formItemId,
    labelId: `${id}-label`,
    describedBy,
  });
  return asControl ? <FormControl>{element}</FormControl> : element;
}

/**
 * The shell every bound field is built on: label, control, hint and message around
 * a `render` of your own.
 *
 * ```tsx
 * <RhfField name="address" label="Address" render={({ field, invalid }) => (
 *   <AddressAutocomplete value={field.value ?? ""} onChange={field.onChange} invalid={invalid} />
 * )} />
 * ```
 */
export function RhfField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  render,
  asControl = true,
  message = true,
  showLabel = true,
}: RhfFieldProps<TFieldValues, TName, TTransformed>) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      disabled={excludeWhenDisabled ? disabled : undefined}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {showLabel && hasContent(label) && <RhfLabel required={required}>{label}</RhfLabel>}
          <ControlSlot
            field={disabled && !field.disabled ? { ...field, disabled: true } : field}
            fieldState={fieldState}
            render={render}
            asControl={asControl}
          />
          {hasContent(hint) && <FormDescription>{hint}</FormDescription>}
          {message && <FormMessage />}
        </FormItem>
      )}
    />
  );
}

/**
 * Hands react-hook-form a focus handle for a control that forwards no ref: its
 * `shouldFocusError` calls `focus()` on whatever `field.ref` was given. `find` runs at
 * focus time, so it sees the element as it is then.
 */
function useFocusHandle(ref: ControllerRenderProps["ref"], find: () => HTMLElement | null | undefined) {
  const findRef = useRef(find);
  useLayoutEffect(() => {
    findRef.current = find;
  });
  useLayoutEffect(() => {
    ref({ focus: () => findRef.current()?.focus() });
  }, [ref]);
}

// ── text ─────────────────────────────────────────────────────────────────────

type OwnInputProps = Omit<
  InputProps,
  "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref" | "label" | "error" | "invalid" | "className" | "disabled" | "required" | "inputClassName"
> & {
  /**
   * Classes for the `<input>` — `className` is the item's box (kastlan 42: a
   * `font-mono` IBAN, a `tabular-nums` reference number). {@link RhfTextarea} and
   * {@link RhfNumberField} had it; this one only reached `Input`'s prop of the same
   * name by accident of the rest-spread, undocumented and one refactor from being
   * dropped. Declared, it is part of the contract the three share.
   */
  inputClassName?: string;
};

export type RhfTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> & OwnInputProps;

/** A text {@link Input} — `type` for email, tel, password, url. Stores the string. */
export function RhfTextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  ...inputProps
}: RhfTextFieldProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid }) => (
        <Input
          aria-required={required || undefined}
          {...inputProps}
          name={field.name}
          ref={field.ref}
          value={(field.value ?? "") as string}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={field.disabled}
          invalid={invalid}
        />
      )}
    />
  );
}

type OwnTextareaProps = Omit<
  TextareaProps,
  "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref" | "label" | "error" | "invalid" | "className" | "disabled" | "required"
> & {
  /** Classes for the `<textarea>`. */
  inputClassName?: string;
};

export type RhfTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> & OwnTextareaProps;

/** A multi-line {@link Textarea}; takes `rows`. Stores the string. */
export function RhfTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  inputClassName,
  ...areaProps
}: RhfTextareaProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid }) => (
        <Textarea
          aria-required={required || undefined}
          {...areaProps}
          className={inputClassName}
          name={field.name}
          ref={field.ref}
          value={(field.value ?? "") as string}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={field.disabled}
          invalid={invalid}
        />
      )}
    />
  );
}

// ── numbers ──────────────────────────────────────────────────────────────────

/** A form value → the number field's `number | null`. Defaults hold `""`, `null`, a
 *  number, or a numeric string. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export type RhfNumberFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  Pick<
    NumberFieldProps,
    | "digits"
    | "min"
    | "max"
    | "step"
    | "calculator"
    | "unit"
    | "unitPlacement"
    | "placeholder"
    | "inputClassName"
    | "locale"
    | "ariaLabel"
    | "autoFocus"
  > & {
    /** What an emptied field stores. Default `null`; `""` for a schema written
     *  against a native number input (`z.coerce.number()` over `""`). */
    emptyValue?: null | "";
    /** `false`: an emptied field snaps back to its last number instead of storing
     *  `emptyValue`. Default `true`. */
    nullable?: boolean;
  };

/**
 * The kit's {@link NumberField}: a parsed, rounded (`digits`) and clamped (`min` /
 * `max`) number, committed on blur or Enter in the locale's decimal mark. Stores a
 * number, or `emptyValue` when emptied.
 */
export function RhfNumberField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  emptyValue = null,
  nullable = true,
  ...numberProps
}: RhfNumberFieldProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid, id }) => (
        // FormControl clones this element with `id` / `aria-describedby` /
        // `aria-invalid`, which NumberControl hands on to the field.
        <NumberControl
          field={field as unknown as ControllerRenderProps}
          invalid={invalid}
          required={required}
          id={id}
          emptyValue={emptyValue}
          nullable={nullable}
          numberProps={numberProps}
        />
      )}
    />
  );
}

function NumberControl({
  field,
  invalid,
  required,
  id,
  emptyValue,
  nullable,
  numberProps,
  ...aria
}: {
  field: ControllerRenderProps;
  invalid: boolean;
  required?: boolean;
  id: string;
  emptyValue: null | "";
  nullable: boolean;
  numberProps: Omit<RhfNumberFieldProps, keyof RhfFieldBaseProps | "emptyValue" | "nullable">;
  "aria-describedby"?: string;
  "aria-invalid"?: NumberFieldProps["aria-invalid"];
}) {
  // NumberField forwards no ref; it routes `id` to its <input>, where the handle
  // finds it.
  useFocusHandle(field.ref, () => document.getElementById(id));
  return (
    <NumberField
      {...numberProps}
      aria-describedby={aria["aria-describedby"]}
      aria-invalid={aria["aria-invalid"]}
      aria-required={required || undefined}
      id={id}
      value={toNumber(field.value)}
      onCommit={(n) => {
        field.onChange(n ?? emptyValue);
        field.onBlur();
      }}
      nullable={nullable}
      disabled={field.disabled}
      invalid={invalid}
    />
  );
}

export type RhfIntegerFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfNumberFieldProps<TFieldValues, TName, TTransformed>;

/**
 * {@link RhfNumberField} for a whole number — a floor, a room count, a year, a
 * notice period in months. Every such call site in kastlan (item 41) spelled out the
 * same three props, `digits={0} calculator={false} emptyValue=""`, and a preset
 * written thirty times is one that is eventually written wrong once:
 *
 *  - `digits={0}`: rounds on commit, so "2.5" rooms settles to 3 instead of reaching
 *    an `Integer` column and failing server-side;
 *  - `calculator={false}`: a count is typed, not worked out — the trigger is noise
 *    beside a two-digit field;
 *  - `emptyValue=""`: kastlan's integer schemas are `z.coerce.number()` over `""`,
 *    written against the native number inputs these fields replaced.
 *
 * Each is only a default: pass the prop to override it (`emptyValue={null}` for a
 * nullable column). Everything else is {@link RhfNumberField}'s.
 */
export function RhfIntegerField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>(props: RhfIntegerFieldProps<TFieldValues, TName, TTransformed>) {
  // `??` / `=== undefined` rather than a spread over the defaults, so a caller
  // forwarding its own optional prop (`digits={props.digits}`) still gets the preset,
  // while an explicit `emptyValue={null}` keeps its null.
  return (
    <RhfNumberField
      {...props}
      digits={props.digits ?? 0}
      calculator={props.calculator ?? false}
      emptyValue={props.emptyValue === undefined ? "" : props.emptyValue}
    />
  );
}

// ── money ────────────────────────────────────────────────────────────────────

export type RhfMoneyFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> & {
  placeholder?: string;
  /** The currency chip's code ("CHF"). */
  currency?: string;
  /** Makes the chip a currency picker. Bind it to another field with
   *  `useController`, or to state. */
  onCurrencyChange?: (code: string) => void;
  /** Colours the figure for the direction of money. */
  tone?: "neutral" | "outflow" | "inflow";
  align?: "start" | "center";
  ariaLabel?: string;
  autoFocus?: boolean;
  /**
   * What the form stores: `"number"` (default) — `12.5`, or `emptyValue` while the
   * field is empty — or `"string"`, the field's own text ("12.50") for a schema that
   * parses it itself. A half-typed sum ("12+") leaves the stored number as it was
   * until it resolves.
   */
  valueAs?: "number" | "string";
  /** What an emptied field stores when `valueAs` is `"number"`. Default `null`. */
  emptyValue?: null | "";
  /** Decimals the amount settles to on blur, Enter or a calculator result. Default:
   *  the currency's minor unit (CHF 2, JPY 0). ⚠️ A unit price or a rate needs its
   *  column's scale here (`digits={4}` for 1.789 €/l), or it is stored rounded to
   *  cents without a word (keksdose G2). See {@link AmountInput}'s `digits`. */
  digits?: number;
  /** Clamp the settled amount (a release capped at the deposit's balance). Validate
   *  with `rules` as well if a clamp needs explaining. */
  min?: number;
  max?: number;
  /** Classes for the `<input>` — `className` is the item's box. {@link RhfTextField},
   *  {@link RhfTextarea} and {@link RhfNumberField} take it; since 0.23 AmountInput
   *  does too (keksdose G7: `text-end` for a money column). */
  inputClassName?: string;
};

/** The amount a text reads as, or `undefined` for a draft that is not one yet. */
function parseAmount(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^-?\d*[.,]?\d*$/.test(trimmed)) return undefined;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function MoneyControl({
  field,
  invalid,
  required,
  id,
  describedBy,
  props,
}: {
  field: ControllerRenderProps;
  invalid: boolean;
  required?: boolean;
  id: string;
  describedBy: string | undefined;
  props: Omit<RhfMoneyFieldProps, keyof RhfFieldBaseProps>;
}) {
  const { valueAs = "number", emptyValue = null, ariaLabel, ...amountProps } = props;
  const value: unknown = field.value;
  const external = value === null || value === undefined ? "" : String(value);
  // The text being typed. A stored NUMBER cannot hold "12." or "12+5", so the draft
  // lives here and is re-read from the form only when the form's value moves away
  // from what the draft already says (a reset, a setValue).
  const [draft, setDraft] = useState(external);
  const [seen, setSeen] = useState<unknown>(value);
  if (seen !== value) {
    setSeen(value);
    const current = valueAs === "string" ? draft : parseAmount(draft);
    const same = valueAs === "string" ? current === external : current === toNumber(value);
    if (!same) setDraft(external);
  }
  const input = useRef<HTMLInputElement | null>(null);
  // AmountInput reports no blur, and react-hook-form needs one to mark the field
  // touched: listen on its <input>.
  const onBlur = field.onBlur;
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.addEventListener("blur", onBlur);
    return () => el.removeEventListener("blur", onBlur);
  }, [onBlur]);
  return (
    <div>
      <AmountInput
        {...amountProps}
        ariaLabel={ariaLabel}
        id={id}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        ref={(el) => {
          input.current = el;
          field.ref(el);
        }}
        value={draft}
        disabled={field.disabled}
        invalid={invalid}
        onChange={(text) => {
          setDraft(text);
          if (valueAs === "string") {
            field.onChange(text);
            return;
          }
          const parsed = parseAmount(text);
          if (parsed === undefined) return;
          field.onChange(parsed ?? emptyValue);
        }}
      />
    </div>
  );
}

/**
 * The kit's {@link AmountInput}: a money figure with its currency chip and the
 * calculator ("1200+80" resolves on blur or Enter). Stores a number by default — see
 * `valueAs`.
 */
export function RhfMoneyField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  ...amountProps
}: RhfMoneyFieldProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      asControl={false}
      render={({ field, invalid, id, describedBy }) => (
        <MoneyControl
          field={field as unknown as ControllerRenderProps}
          invalid={invalid}
          required={required}
          id={id}
          describedBy={describedBy}
          props={amountProps}
        />
      )}
    />
  );
}

// ── date ─────────────────────────────────────────────────────────────────────

export type RhfDateFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  // `error`: the form's message is shown by the binding (FormMessage); the picker's own
  // `error` (0.22) would show it a second time.
  Omit<DatePickerProps, "value" | "onChange" | "label" | "invalid" | "disabled" | "className" | "id" | "error"> & {
    /** Classes for the picker. Default `w-full`. */
    inputClassName?: string;
    /** What a cleared date stores. Default `""`, the empty ISO string; `null` for a
     *  nullable schema. */
    emptyValue?: "" | null;
  };

function DateControl({
  field,
  invalid,
  required,
  id,
  emptyValue,
  inputClassName,
  pickerProps,
  ...aria
}: {
  field: ControllerRenderProps;
  invalid: boolean;
  required?: boolean;
  id: string;
  emptyValue: "" | null;
  inputClassName?: string;
  pickerProps: Omit<DatePickerProps, "value" | "onChange" | "label" | "invalid" | "disabled" | "className" | "id">;
  "aria-describedby"?: string;
  "aria-invalid"?: DatePickerProps["aria-invalid"];
}) {
  useFocusHandle(field.ref, () => document.getElementById(id));
  const value: unknown = field.value;
  return (
    <DatePicker
      {...pickerProps}
      {...aria}
      aria-required={required || undefined}
      id={id}
      value={typeof value === "string" ? value : ""}
      onChange={(iso) => {
        field.onChange(iso === "" ? emptyValue : iso);
        field.onBlur();
      }}
      disabled={field.disabled}
      invalid={invalid}
      className={inputClassName ?? "w-full"}
    />
  );
}

/** The kit's {@link DatePicker}, holding an ISO `"YYYY-MM-DD"` string. */
export function RhfDateField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  inputClassName,
  emptyValue = "",
  ...pickerProps
}: RhfDateFieldProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid, id }) => (
        // FormControl clones this element with `aria-describedby` / `aria-invalid`,
        // which DateControl hands on to the picker's trigger.
        <DateControl
          field={field as unknown as ControllerRenderProps}
          invalid={invalid}
          required={required}
          id={id}
          emptyValue={emptyValue}
          inputClassName={inputClassName}
          pickerProps={pickerProps}
          required={required}
        />
      )}
    />
  );
}

// ── date range ───────────────────────────────────────────────────────────────

type OwnDateRangeProps = Omit<
  DateRangePickerProps,
  "from" | "to" | "onChange" | "label" | "invalid" | "disabled" | "className" | "id" | "error"
>;

export type RhfDateRangePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TFromName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TToName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = Omit<RhfFieldBaseProps<TFieldValues, TFromName, TTransformed>, "name" | "rules"> &
  OwnDateRangeProps & {
    /** The form field holding the range's first day, an ISO `"YYYY-MM-DD"`. */
    fromName: TFromName;
    /** The form field holding the range's last day. */
    toName: TToName;
    /** react-hook-form's `rules` for the start (`required`, a `validate` …). */
    fromRules?: ControllerProps<TFieldValues, TFromName, TTransformed>["rules"];
    /** react-hook-form's `rules` for the end — the place for "not before the start",
     *  which can read the start with `getValues`: the start is always written first. */
    toRules?: ControllerProps<TFieldValues, TToName, TTransformed>["rules"];
    /** Classes for the picker. Default `w-full`. */
    inputClassName?: string;
    /** What an empty end stores — a clear, or the half-made range between the first
     *  and second click. Default `""`, the empty ISO string; `null` for a nullable
     *  schema. */
    emptyValue?: "" | null;
  };

/**
 * The kit's {@link DateRangePicker} over TWO form fields — `fromName` and `toName` —
 * the way a period is stored: as two columns, each its own schema key, not one
 * `{ from, to }` object (kastlan 4).
 *
 * ```tsx
 * <RhfDateRangePicker fromName="periodFrom" toName="periodTo" label="Billing period"
 *   presets={presets} clearable />
 * ```
 *
 * Why it is not {@link RhfField}: a `Controller` binds one name, and the range is
 * two. Built by hand — an `RhfField` on the start and a second `useController` for
 * the end, which is what kastlan's period fields needed — it works until the END is
 * the one in error: the shell's label, message and `aria-invalid` all read the
 * start's state alone, so "End before start" (a `refine` with `path: ["periodTo"]`,
 * where such a rule goes) never shows. Here both states are read:
 *
 *  - **Either field's error is shown and paints.** The label turns, the trigger is
 *    `aria-invalid` and wears the danger border when EITHER field has an error, and
 *    both messages are listed under the field (once, if the two say the same thing),
 *    each pointed at by the trigger's `aria-describedby`.
 *  - **One change writes both.** The picker reports the range whole, so the start and
 *    then the end are written on every change — the end too when only the start
 *    moved, so a cross-field rule on the end re-runs and an "End before start" clears
 *    the moment the start is fixed. A clear (`clearable`'s ×) empties both.
 *  - **Focus on error** lands on the trigger whichever of the two is in error.
 *  - **Touched** once a range is complete or cleared — not on the first click of a
 *    pick, which would mark (and, with `mode: "onTouched"`, validate) an end the user
 *    is still choosing.
 *
 * In `commit="immediate"` mode (the picker's default) the first calendar click is
 * reported on its own, so the form holds `(from, emptyValue)` until the second; with
 * `commit="apply"` nothing reaches the form until Apply.
 *
 * The common props (`label`, `hint`, `required`, `disabled`, `excludeWhenDisabled`,
 * `control`, `className`) apply to the pair; `rules` are per field.
 */
export function RhfDateRangePicker<
  TFieldValues extends FieldValues = FieldValues,
  TFromName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TToName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  fromName,
  toName,
  control,
  fromRules,
  toRules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  inputClassName,
  emptyValue = "",
  ...pickerProps
}: RhfDateRangePickerProps<TFieldValues, TFromName, TToName, TTransformed>) {
  const rhfDisabled = excludeWhenDisabled ? disabled : undefined;
  // The end, read here; the start is the FormField below, which gives the label, hint
  // and ids their context. This component re-renders on the end's state, and with it
  // the FormField's render.
  const to = useController<TFieldValues, TToName, TTransformed>({
    name: toName,
    control,
    rules: toRules,
    disabled: rhfDisabled,
  });
  return (
    <FormField
      control={control}
      name={fromName}
      rules={fromRules}
      disabled={rhfDisabled}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          <RangeBody
            from={field as unknown as ControllerRenderProps}
            fromState={fieldState}
            to={to.field as unknown as ControllerRenderProps}
            toState={to.fieldState}
            label={label}
            hint={hint}
            required={required}
            disabled={Boolean(disabled)}
            emptyValue={emptyValue}
            inputClassName={inputClassName}
            pickerProps={pickerProps}
          />
        </FormItem>
      )}
    />
  );
}

function RangeBody({
  from,
  fromState,
  to,
  toState,
  label,
  hint,
  required,
  disabled,
  emptyValue,
  inputClassName,
  pickerProps,
}: {
  from: ControllerRenderProps;
  fromState: ControllerFieldState;
  to: ControllerRenderProps;
  toState: ControllerFieldState;
  label: ReactNode;
  hint: ReactNode;
  required?: boolean;
  disabled: boolean;
  emptyValue: "" | null;
  inputClassName?: string;
  pickerProps: OwnDateRangeProps;
}) {
  const { id, formItemId, formMessageId, describedBy } = useFormField();
  // The trigger forwards no ref; both fields focus it, so `shouldFocusError` lands
  // there whichever of the two is first in error.
  useFocusHandle(from.ref, () => document.getElementById(formItemId));
  useFocusHandle(to.ref, () => document.getElementById(formItemId));
  const invalid = fromState.invalid || toState.invalid;
  const messages = [fromState.error?.message, toState.error?.message].filter(
    (m, i, all): m is string => typeof m === "string" && m !== "" && all.indexOf(m) === i,
  );
  const messageIds = messages.map((_, i) => `${formMessageId}-${i}`);
  const fromValue: unknown = from.value;
  const toValue: unknown = to.value;
  return (
    <>
      {hasContent(label) && (
        // FormLabel colours from the START's error alone (its context is that field);
        // the pair's state says it here.
        <FormLabel id={`${id}-label`} required={required} data-error={invalid || undefined}>
          {label}
        </FormLabel>
      )}
      <DateRangePicker
        {...pickerProps}
        id={formItemId}
        // Merged, never replaced — a caller's own reference first, as FormControl does.
        aria-describedby={
          [pickerProps["aria-describedby"], describedBy, ...messageIds].filter(Boolean).join(" ") || undefined
        }
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        from={typeof fromValue === "string" ? fromValue : ""}
        to={typeof toValue === "string" ? toValue : ""}
        onChange={(f, t) => {
          from.onChange(f === "" ? emptyValue : f);
          to.onChange(t === "" ? emptyValue : t);
          if (t !== "" || f === "") {
            from.onBlur();
            to.onBlur();
          }
        }}
        disabled={disabled || from.disabled || to.disabled}
        invalid={invalid}
        className={inputClassName ?? "w-full"}
      />
      {hasContent(hint) && <FormDescription>{hint}</FormDescription>}
      {messages.map((message, i) => (
        // FormMessage's look and its rule: no `role="alert"` — read when focus reaches
        // the trigger, which names these in its description.
        <p
          key={message}
          id={messageIds[i]}
          data-slot="form-message"
          className="text-[11px] leading-tight text-[var(--danger)]"
        >
          {message}
        </p>
      ))}
    </>
  );
}

// ── time ─────────────────────────────────────────────────────────────────────

export type RhfTimeInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  Omit<
    TimeInputProps,
    | "name"
    | "value"
    | "defaultValue"
    | "onChange"
    | "onValueChange"
    | "onBlur"
    | "label"
    | "error"
    | "invalid"
    | "className"
    | "disabled"
    | "required"
  > & {
    /** What a cleared time stores. Default `""`; `null` for a nullable schema. */
    emptyValue?: "" | null;
  };

/**
 * The kit's {@link TimeInput}: a time of day as `"HH:mm"` (`"HH:mm:ss"` when `step`
 * asks for seconds), normalised before it reaches the form, so the stored value
 * compares and sorts as a string. kastlan 4: the owner meeting's time was an
 * {@link RhfField} with a hand-wired `TimeInput` in its render — `ref`, `name`, the
 * `?? ""`, `onValueChange`, `onBlur`, `invalid` — the seven lines every bound field
 * folds into one.
 *
 * `min` / `max` paint an out-of-window time (see TimeInput) but do not fail the form:
 * validation stays the schema's or `rules`'. `rules={{ validate: (v) =>
 * isTimeInRange(v, min, max) || "…" }}` says it with the same window.
 */
export function RhfTimeInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  emptyValue = "",
  ...timeProps
}: RhfTimeInputProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid }) => {
        const value: unknown = field.value;
        return (
          <TimeInput
            aria-required={required || undefined}
            {...timeProps}
            name={field.name}
            ref={field.ref}
            value={typeof value === "string" ? value : ""}
            onValueChange={(v) => field.onChange(v === "" ? emptyValue : v)}
            onBlur={field.onBlur}
            disabled={field.disabled}
            invalid={invalid}
          />
        );
      }}
    />
  );
}

// ── IBAN and phone (0.22) ────────────────────────────────────────────────────

type OwnTextishProps<P> = Omit<
  P,
  | "name"
  | "value"
  | "defaultValue"
  | "onChange"
  | "onValueChange"
  | "onBlur"
  | "label"
  | "error"
  | "invalid"
  | "className"
  | "disabled"
  | "required"
>;

export type RhfIbanInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> & OwnTextishProps<IbanInputProps>;

/**
 * {@link IbanInput} bound to one field, which stores the COMPACT upper-case IBAN (what
 * kastlan's server checks and its QR bill prints). The field's own checksum and
 * `kind` messages show while the form has nothing to say; a form error (the schema's
 * or `rules`') replaces them, as a caller's `error` does on the bare field. kastlan
 * asked for the field; it binds everything through react-hook-form.
 */
export function RhfIbanInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  ...ibanProps
}: RhfIbanInputProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid }) => {
        const value: unknown = field.value;
        return (
          <IbanInput
            aria-required={required || undefined}
            {...ibanProps}
            name={field.name}
            ref={field.ref}
            value={typeof value === "string" ? value : ""}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            disabled={field.disabled}
            invalid={invalid}
          />
        );
      }}
    />
  );
}

export type RhfPhoneInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> & OwnTextishProps<PhoneInputProps>;

/**
 * {@link PhoneInput} bound to one field, which stores E.164 when the number reads as
 * one and the typed text unchanged otherwise — kastlan's contacts keep their old free
 * text until someone edits it. Validation (required, a pattern for E.164 only) is the
 * schema's or `rules`'.
 */
export function RhfPhoneInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  ...phoneProps
}: RhfPhoneInputProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid }) => {
        const value: unknown = field.value;
        return (
          <PhoneInput
            aria-required={required || undefined}
            {...phoneProps}
            name={field.name}
            ref={field.ref}
            value={typeof value === "string" ? value : ""}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            disabled={field.disabled}
            invalid={invalid}
          />
        );
      }}
    />
  );
}

// ── country and month (0.23) ─────────────────────────────────────────────────

type OwnCountrySelectProps = Omit<
  CountrySelectProps<boolean>,
  | "value"
  | "onChange"
  | "onBlur"
  | "label"
  | "hint"
  | "error"
  | "invalid"
  | "disabled"
  | "className"
  | "id"
  | "ref"
  | "clearable"
>;

export type RhfCountrySelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  OwnCountrySelectProps & {
    /** Offer the picker's clear "×" (and Delete on the trigger) while a country is
     *  chosen. A clear stores `clearValue`. */
    clearable?: boolean;
    /** What a clear stores. Default `null`; `""` for a schema that spells "no
     *  country" as an empty string (a zod `z.string().max(2)`, kastlan's). The picker
     *  reads either back as empty. */
    clearValue?: ComboClearValue;
    /** Classes for the picker — `className` is the item's box. */
    selectClassName?: string;
  };

/**
 * {@link CountrySelect} bound to one field, which stores the ISO 3166-1 alpha-2 code
 * ("CH", always upper-case), or `clearValue` once cleared (`clearable`). kastlan asked
 * for it (0.22 adoption): its address form wired a `CountrySelect` through
 * {@link RhfField}'s render, and with no ref on the picker react-hook-form's
 * focus-on-error had nothing to focus — the one field on the form a failed submit
 * could not take you to.
 *
 * Bound the way {@link RhfIbanInput} and {@link RhfPhoneInput} are: `field.ref` reaches
 * the trigger (the picker's `ref`, 0.23), the form's error paints the trigger and is
 * the shell's message under it, the hint is the shell's description — so neither is
 * ever handed to the picker, and its box never changes when one comes or goes. The
 * form's label names the trigger together with the chosen country, and is the phone
 * sheet's title. `commit` and `disabledReason` are the picker's own: a country that
 * saves itself stays focusable under a lock and says why.
 *
 * ```tsx
 * <RhfCountrySelect name="country" label="Country" required
 *   preferred={["CH", "LI", "DE", "AT", "FR", "IT"]} rules={{ required: "Choose a country" }} />
 * ```
 */
export function RhfCountrySelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  clearable,
  clearValue = null,
  selectClassName,
  labels,
  ...countryProps
}: RhfCountrySelectProps<TFieldValues, TName, TTransformed>) {
  const labelled = hasContent(label);
  // A string label is also what the field IS — the picker's `country` word, which
  // titles the phone sheet. A caller's own `labels.country` still wins.
  const ownLabels = typeof label === "string" ? { country: label, ...labels } : labels;
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid, labelId }) => {
        const value: unknown = field.value;
        return (
          // FormControl clones this element with `id` / `aria-describedby` /
          // `aria-invalid`, which the picker routes to its trigger.
          <CountrySelect<boolean>
            aria-required={required || undefined}
            // The form's label, then the country (see the picker's `aria-labelledby`).
            aria-labelledby={labelled ? labelId : undefined}
            {...countryProps}
            labels={ownLabels}
            className={selectClassName}
            ref={field.ref}
            value={typeof value === "string" ? value : null}
            clearable={clearable}
            onChange={(code) => field.onChange(code ?? clearValue)}
            // Focus leaving the picker (the wrapper's focusout) marks the field touched.
            onBlur={field.onBlur}
            disabled={field.disabled}
            invalid={invalid}
          />
        );
      }}
    />
  );
}

type OwnMonthPickerProps = Omit<
  MonthPickerProps,
  "value" | "onChange" | "onBlur" | "label" | "hint" | "error" | "invalid" | "disabled" | "className" | "id" | "mode"
>;

/** `mode` picks what the form stores, and `valueAsNumber` is only offered for a year. */
type RhfMonthPickerMode =
  | {
      /** A month, stored as `"YYYY-MM"` (the default). */
      mode?: "month";
      valueAsNumber?: undefined;
    }
  | {
      /** A year, stored as `"YYYY"` — or as a number with `valueAsNumber`. */
      mode: "year";
      /** Store the year as a number (`2026`) rather than `"2026"` — kastlan's budget
       *  `fiscal_year` is an integer column. A number in the form reads back as its
       *  year. */
      valueAsNumber?: boolean;
    };

export type RhfMonthPickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  OwnMonthPickerProps & {
    /** Classes for the picker — `className` is the item's box. As {@link RhfDateField}'s. */
    inputClassName?: string;
  } & RhfMonthPickerMode;

function MonthControl({
  field,
  invalid,
  id,
  valueAsNumber,
  mode,
  inputClassName,
  pickerProps,
  required,
  ...aria
}: {
  field: ControllerRenderProps;
  invalid: boolean;
  id: string;
  valueAsNumber?: boolean;
  mode?: "month" | "year";
  inputClassName?: string;
  pickerProps: OwnMonthPickerProps;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: MonthPickerProps["aria-invalid"];
}) {
  // MonthPicker forwards no ref; it routes `id` to its trigger, where the handle finds
  // it — RhfDateField's way.
  useFocusHandle(field.ref, () => document.getElementById(id));
  const value: unknown = field.value;
  return (
    <MonthPicker
      {...pickerProps}
      {...aria}
      // MonthPicker routes `aria-required` to its trigger since 0.23.0.
      aria-required={required || undefined}
      id={id}
      mode={mode}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(key) => {
        field.onChange(mode === "year" && valueAsNumber ? Number(key) : key);
        // A pick is the whole interaction — there is no text to leave — so it touches.
        field.onBlur();
      }}
      disabled={field.disabled}
      invalid={invalid}
      className={inputClassName}
    />
  );
}

/**
 * {@link MonthPicker} bound to one field: a month as `"YYYY-MM"`, or with `mode="year"` a
 * year as `"YYYY"` (`valueAsNumber` stores `2026`). kastlan asked for it with
 * {@link RhfCountrySelect}: its budget wizard's fiscal year was a `MonthPicker
 * mode="year"` inside {@link RhfField}'s render — the `String()` in, the `Number()`
 * out, `invalid` by hand — and a failed submit could not focus it, because the picker
 * forwards no ref.
 *
 * Bound as {@link RhfDateField} is: a focus handle finds the trigger by its id, so
 * focus-on-error lands there; the form's error paints the trigger and is the shell's
 * message; the hint is the shell's description; neither is handed to the picker, so
 * its box never changes. Picking marks the field touched.
 *
 * ```tsx
 * <RhfMonthPicker name="fiscalYear" label="Fiscal year" mode="year" valueAsNumber
 *   min="2020" max="2029" rules={{ required: "Choose a year" }} />
 * ```
 */
export function RhfMonthPicker<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  inputClassName,
  mode,
  valueAsNumber,
  ...pickerProps
}: RhfMonthPickerProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid, id }) => (
        // FormControl clones this element with `aria-describedby` / `aria-invalid`,
        // which MonthControl hands on to the picker's trigger.
        <MonthControl
          field={field as unknown as ControllerRenderProps}
          invalid={invalid}
          id={id}
          mode={mode}
          valueAsNumber={valueAsNumber}
          inputClassName={inputClassName}
          pickerProps={pickerProps}
          required={required}
        />
      )}
    />
  );
}

// ── select ───────────────────────────────────────────────────────────────────

export interface RhfSelectOption {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
}

export type RhfSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  Pick<SelectProps, "size" | "autoFocus" | "aria-label"> & {
    /** The options, as data. Or pass `<option>` children. */
    options?: readonly RhfSelectOption[];
    children?: ReactNode;
    /** A first, empty option ("Choose…"), selected while the value is empty. */
    placeholder?: string;
    /** Store `Number(value)` rather than the option's string. An empty choice still
     *  stores `""`. */
    valueAsNumber?: boolean;
    /** Classes for the select. Default `w-full`. */
    selectClassName?: string;
  };

/** A native {@link Select}, from `options` or `<option>` children. */
export function RhfSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  options,
  children,
  placeholder,
  valueAsNumber,
  selectClassName,
  ...selectProps
}: RhfSelectProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      render={({ field, invalid }) => (
        <Select
          aria-required={required || undefined}
          {...selectProps}
          className={cn("w-full", selectClassName)}
          name={field.name}
          ref={field.ref}
          value={(field.value ?? "") as string | number}
          onChange={(e) => {
            const raw = e.target.value;
            field.onChange(valueAsNumber && raw !== "" ? Number(raw) : raw);
          }}
          onBlur={field.onBlur}
          disabled={field.disabled}
          invalid={invalid}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options
            ? options.map((o) => (
                <option key={String(o.value)} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))
            : children}
        </Select>
      )}
    />
  );
}

// ── checkbox ─────────────────────────────────────────────────────────────────

export type RhfCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  Pick<CheckboxProps, "inputClassName" | "autoFocus" | "aria-label">;

/**
 * The kit's {@link Checkbox}, label beside the box and `hint` under it (the
 * checkbox's own `description`). Stores a boolean. `required` is the native one here
 * — see Checkbox — so a `<form>` refuses to submit it unticked.
 */
export function RhfCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  ...boxProps
}: RhfCheckboxProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, required, disabled, excludeWhenDisabled, className }}
      showLabel={false}
      render={({ field, invalid }) => (
        <Checkbox
          {...boxProps}
          ref={field.ref}
          name={field.name}
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
          onBlur={field.onBlur}
          disabled={field.disabled}
          required={required}
          invalid={invalid}
          label={label}
          description={hint}
        />
      )}
    />
  );
}

// ── toggle group ─────────────────────────────────────────────────────────────

/** The two shapes a {@link ToggleGroup} comes in, carried over: `allowEmpty` picks
 *  whether a press on the chosen option clears it, and types the caption to match. */
type RhfToggleGroupMode<T extends string> =
  | {
      /** One option is always the answer (the default): a press on the chosen
       *  option re-sends it. */
      allowEmpty?: false;
      semantics?: ToggleGroupRequiredProps<T>["semantics"];
      caption?: ToggleGroupRequiredProps<T>["caption"];
      emptyValue?: undefined;
    }
  | {
      /** A press on the chosen option clears it, and the form stores `emptyValue`. */
      allowEmpty: true;
      semantics?: ToggleGroupClearableProps<T>["semantics"];
      caption?: ToggleGroupClearableProps<T>["caption"];
      /** What a cleared group stores. Default `null`; `""` for a schema that spells
       *  "no choice" as an empty string. */
      emptyValue?: null | "";
    };

export type RhfToggleGroupProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  T extends string = string,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  Pick<
    ToggleGroupBaseProps<T>,
    "options" | "optionClassName" | "overflow" | "size" | "aria-label" | "commit" | "disabledReason"
  > & {
    /** Classes for the group itself — `className` is the item's box. */
    groupClassName?: string;
  } & RhfToggleGroupMode<T>;

/**
 * The kit's {@link ToggleGroup} bound to one field: a choice between a few answers
 * ("Monthly / Quarterly / Yearly"), stored as the chosen option's `value`. kastlan 4
 * asked for it with {@link RhfTimeInput} and {@link RhfDateRangePicker}: the controls
 * its forms still had to wire by hand through {@link RhfField}'s render.
 *
 * The label is the form's {@link FormLabel} above the bare group, as on every other
 * bound field — the `labelPlacement="above"` shape, not the group's own field chrome —
 * and it names the group (`aria-labelledby`); the hint and the message describe it,
 * and an error paints the group's border. Focus on error goes to the option a
 * keyboard user would land on (the chosen one, else the first); touched is set when
 * focus leaves the group, not when it moves between options.
 *
 * Required by default, as the group is: a press on the chosen option keeps it. With
 * `allowEmpty`, a second press clears the choice and the form stores `emptyValue`
 * (`null` by default) — the options then become toggle buttons, see ToggleGroup. A
 * value that matches no option (an empty default) leaves nothing pressed; that the
 * field still needs answering is the schema's or `rules`' to say.
 */
export function RhfToggleGroup<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  T extends string = string,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  ...groupProps
}: RhfToggleGroupProps<TFieldValues, TName, T, TTransformed>) {
  const labelled = hasContent(label);
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      asControl={false}
      render={({ field, invalid, id, labelId, describedBy }) => (
        <ToggleControl<T>
          field={field as unknown as ControllerRenderProps}
          invalid={invalid}
          required={required}
          id={id}
          labelledBy={labelled ? labelId : undefined}
          describedBy={describedBy}
          groupProps={groupProps}
        />
      )}
    />
  );
}

function ToggleControl<T extends string>({
  field,
  invalid,
  required,
  id,
  labelledBy,
  describedBy,
  groupProps,
}: {
  field: ControllerRenderProps;
  invalid: boolean;
  required?: boolean;
  id: string;
  labelledBy: string | undefined;
  describedBy: string | undefined;
  groupProps: Omit<RhfToggleGroupProps<FieldValues, string, T>, keyof RhfFieldBaseProps>;
}) {
  const { groupClassName, emptyValue, allowEmpty, semantics, caption, ...rest } = groupProps;
  // ToggleGroup forwards no ref. Its options are buttons: the radio shape's one tab
  // stop (`tabindex="0"`), or in the pressed shape the pressed one — else the first.
  useFocusHandle(field.ref, () => {
    const group = document.getElementById(id);
    return (
      group?.querySelector<HTMLElement>('button[tabindex="0"], button[aria-pressed="true"]') ??
      group?.querySelector<HTMLElement>("button")
    );
  });
  // React's onBlur is focusout: it fires on every move between options as well, and
  // only leaving the group is a blur of the FIELD.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) field.onBlur();
  };
  const raw: unknown = field.value;
  const value = raw === null || raw === undefined || raw === "" ? null : (String(raw) as T);
  const common = {
    ...rest,
    id,
    className: groupClassName,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    disabled: field.disabled,
    onBlur,
  };
  // The props' union pairs `allowEmpty` with its caption's type; taken apart above it no
  // longer narrows, so each branch says which half it is.
  if (allowEmpty) {
    return (
      <ToggleGroup<T>
        {...common}
        allowEmpty
        caption={caption as ToggleGroupClearableProps<T>["caption"]}
        value={value}
        onChange={(v) => field.onChange(v ?? emptyValue ?? null)}
      />
    );
  }
  return (
    <ToggleGroup<T>
      {...common}
      allowEmpty={false}
      semantics={semantics}
      caption={caption as ToggleGroupRequiredProps<T>["caption"]}
      // A radiogroup takes `aria-required`; a group of toggle buttons does not.
      aria-required={required && semantics !== "pressed" ? true : undefined}
      // An empty default matches no option: nothing pressed, the first option the tab
      // stop.
      value={(value ?? "") as T}
      onChange={(v) => field.onChange(v)}
    />
  );
}

// ── comboboxes ───────────────────────────────────────────────────────────────

export type RhfComboboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  V extends string | number = string | number,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  Pick<
    EntityComboboxProps<V>,
    | "options"
    | "loadOptions"
    | "loading"
    | "placeholder"
    | "searchPlaceholder"
    | "emptyLabel"
    | "clearable"
    | "clearLabel"
    | "onCreate"
    | "createLabel"
    | "filter"
    | "minChars"
    | "debounceMs"
  > & {
    /** What a clear stores — the picker's `clearValue`. Default `null`; `""` for a
     *  schema that spells "no choice" as an empty string. */
    clearValue?: ComboClearValue;
    /** Classes for the picker. */
    comboClassName?: string;
  };

function EntityControl<V extends string | number>({
  field,
  invalid,
  required,
  error,
  id,
  describedBy,
  clearValue,
  comboClassName,
  comboProps,
}: {
  field: ControllerRenderProps;
  invalid: boolean;
  required?: boolean;
  error: string | undefined;
  id: string;
  describedBy: string | undefined;
  clearValue: ComboClearValue;
  comboClassName?: string;
  comboProps: Omit<RhfComboboxProps<FieldValues, string, V>, keyof RhfFieldBaseProps | "clearValue" | "comboClassName">;
}) {
  const box = useRef<HTMLDivElement>(null);
  // EntityCombobox puts `id` and the ARIA below on its trigger, so the label's
  // `htmlFor` names it, the hint describes it and the focus handle finds it by id.
  useFocusHandle(field.ref, () => document.getElementById(id));
  // EntityCombobox reports no blur: focus leaving the picker marks the field touched.
  const onBlur = field.onBlur;
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.addEventListener("focusout", onBlur);
    return () => el.removeEventListener("focusout", onBlur);
  }, [onBlur]);
  const value: unknown = field.value;
  return (
    <div ref={box}>
      <EntityCombobox<V, ComboClearValue>
        {...comboProps}
        className={comboClassName}
        id={id}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        value={(value ?? null) as V | ComboClearValue | null}
        clearValue={clearValue}
        onChange={(v) => field.onChange(v)}
        disabled={field.disabled}
        invalid={invalid}
        // Its own message, which it merges into the trigger's aria-describedby after
        // the hint.
        error={error}
      />
    </div>
  );
}

/**
 * The kit's {@link EntityCombobox}: an id-keyed pick from `options` or `loadOptions`.
 * Stores the option's `value`, or `clearValue` on a clear (only offered with
 * `clearable`).
 */
export function RhfCombobox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  V extends string | number = string | number,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  clearValue = null,
  comboClassName,
  ...comboProps
}: RhfComboboxProps<TFieldValues, TName, V, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      asControl={false}
      message={false}
      render={({ field, invalid, error, id, describedBy }) => (
        <EntityControl<V>
          field={field as unknown as ControllerRenderProps}
          invalid={invalid}
          required={required}
          error={error}
          id={id}
          describedBy={describedBy}
          clearValue={clearValue}
          comboClassName={comboClassName}
          comboProps={comboProps}
        />
      )}
    />
  );
}

export type RhfTextComboboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
> = RhfFieldBaseProps<TFieldValues, TName, TTransformed> &
  Pick<
    ComboboxProps,
    | "options"
    | "placeholder"
    | "groupBy"
    | "maxSuggestions"
    | "searchPlaceholder"
    | "createLabel"
    | "optionAdornment"
    | "autoFocus"
    | "aria-label"
  > & {
    /** Classes for the combobox. */
    comboClassName?: string;
  };

/**
 * The kit's free-text {@link Combobox}: type anything, or pick one of `options`.
 * Stores the string.
 */
export function RhfTextCombobox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  label,
  hint,
  required,
  disabled,
  excludeWhenDisabled,
  className,
  comboClassName,
  ...comboProps
}: RhfTextComboboxProps<TFieldValues, TName, TTransformed>) {
  return (
    <RhfField
      {...{ name, control, rules, label, hint, required, disabled, excludeWhenDisabled, className }}
      asControl={false}
      message={false}
      render={({ field, invalid, error, id, describedBy }) => (
        <TextComboControl
          field={field as unknown as ControllerRenderProps}
          invalid={invalid}
          required={required}
          error={error}
          id={id}
          describedBy={describedBy}
          className={comboClassName}
          comboProps={comboProps}
        />
      )}
    />
  );
}

function TextComboControl({
  field,
  invalid,
  required,
  error,
  id,
  describedBy,
  className,
  comboProps,
}: {
  field: ControllerRenderProps;
  invalid: boolean;
  required?: boolean;
  error: string | undefined;
  id: string;
  describedBy: string | undefined;
  className?: string;
  comboProps: Omit<RhfTextComboboxProps, keyof RhfFieldBaseProps | "comboClassName">;
}) {
  // The combobox routes `id` and its ARIA to its <input>, so the label's `htmlFor`
  // names it, the hint describes it and the focus handle finds it; the error is its
  // own `error` prop, which it merges in after the hint.
  useFocusHandle(field.ref, () => document.getElementById(id));
  const value: unknown = field.value;
  return (
    <Combobox
      {...comboProps}
      id={id}
      aria-describedby={describedBy}
      aria-required={required || undefined}
      className={className}
      value={typeof value === "string" ? value : value == null ? "" : String(value)}
      onChange={field.onChange}
      onBlur={field.onBlur}
      disabled={field.disabled}
      invalid={invalid}
      error={error}
    />
  );
}
