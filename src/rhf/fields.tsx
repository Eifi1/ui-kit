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
import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import type {
  ControllerFieldState,
  ControllerProps,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from "./form";
import { Input, Select, Textarea, type InputProps, type SelectProps, type TextareaProps } from "../components/ui";
import { NumberField, type NumberFieldProps } from "../components/number-field";
import { AmountInput } from "../components/amount-input";
import { DatePicker, type DatePickerProps } from "../components/date-picker";
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
  "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "ref" | "label" | "error" | "invalid" | "className" | "disabled" | "required"
>;

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
   *  the currency's minor unit (CHF 2, JPY 0). See {@link AmountInput}'s `digits`. */
  digits?: number;
  /** Clamp the settled amount (a release capped at the deposit's balance). Validate
   *  with `rules` as well if a clamp needs explaining. */
  min?: number;
  max?: number;
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
  Omit<DatePickerProps, "value" | "onChange" | "label" | "invalid" | "disabled" | "className" | "id"> & {
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
