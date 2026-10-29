import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Form } from "../form";
import {
  RhfCheckbox,
  RhfCombobox,
  RhfMoneyField,
  RhfNumberField,
  RhfSelect,
  RhfTextCombobox,
  RhfToggleGroup,
  type RhfCheckboxProps,
  type RhfComboboxProps,
  type RhfCountrySelectProps,
  type RhfDateFieldProps,
  type RhfIbanInputProps,
  type RhfInlineEntityComboboxProps,
  type RhfIntegerFieldProps,
  type RhfMoneyFieldProps,
  type RhfMonthPickerProps,
  type RhfNumberFieldProps,
  type RhfPhoneInputProps,
  type RhfSelectProps,
  type RhfTextareaProps,
  type RhfTextComboboxProps,
  type RhfTextFieldProps,
  type RhfTimeInputProps,
  type RhfToggleGroupProps,
} from "../fields";
import type { InputProps } from "../../components/input";
import type { SelectProps } from "../../components/select";
import type { TextareaProps } from "../../components/textarea";
import type { NumberFieldProps } from "../../components/number-field";
import type { MoneyFieldProps } from "../../components/money-field";
import type { CheckboxProps } from "../../components/checkbox";
import type { ToggleGroupBaseProps } from "../../components/toggle-group";
import type { ComboboxProps, InlineEntityComboboxProps } from "../../components/combobox";
import type { EntityComboboxProps } from "../../components/entity-combobox";
import type { CountrySelectProps } from "../../components/country-select";
import type { DatePickerProps } from "../../components/date-picker";
import type { IbanInputProps } from "../../components/iban-input";
import type { PhoneInputProps } from "../../components/phone-input";
import type { TimeInputProps } from "../../components/time-input";
import type { MonthPickerProps } from "../../components/month-picker";
import { WriteLockProvider } from "../../components/write-lock";

/**
 * DUP-9 (refactor audit 2026-10): the Rhf twins pass their field's props through as
 * `Omit<FieldProps, Bound>`, so a prop the field gains reaches the twin without a word
 * — a `Pick` allow-list dropped it silently (RhfSelect and RhfCheckbox lost the lock
 * Select and Checkbox take; RhfMoneyField's hand list had no `calculator`, `labels`,
 * `currencyNames` or `variant`). And RhfMoneyField settles the way MoneyField does.
 */

/** The lock's props a field has and its twin lacks — `never` when the twin passes them. */
type LockMissing<Twin, Field> = Exclude<
  Extract<keyof Field, "commit" | "disabledReason" | "disabledReasonDisplay">,
  keyof Twin
>;

describe("every twin passes its field's lock (type test)", () => {
  it("commit / disabledReason / disabledReasonDisplay are on each twin whenever its field has them", () => {
    expectTypeOf<LockMissing<RhfTextFieldProps, InputProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfTextareaProps, TextareaProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfSelectProps, SelectProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfCheckboxProps, CheckboxProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfNumberFieldProps, NumberFieldProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfIntegerFieldProps, NumberFieldProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfMoneyFieldProps, MoneyFieldProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfToggleGroupProps, ToggleGroupBaseProps<string>>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfComboboxProps, EntityComboboxProps<string | number>>>().toEqualTypeOf<never>();
    expectTypeOf<
      LockMissing<RhfInlineEntityComboboxProps, InlineEntityComboboxProps<string | number>>
    >().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfTextComboboxProps, ComboboxProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfCountrySelectProps, CountrySelectProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfDateFieldProps, DatePickerProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfIbanInputProps, IbanInputProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfPhoneInputProps, PhoneInputProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfTimeInputProps, TimeInputProps>>().toEqualTypeOf<never>();
    expectTypeOf<LockMissing<RhfMonthPickerProps, MonthPickerProps>>().toEqualTypeOf<never>();
    // And RhfMoneyField has AmountInput's props it listed by hand without (kastlan, keksdose K6).
    expectTypeOf<RhfMoneyFieldProps>().toHaveProperty("calculator");
    expectTypeOf<RhfMoneyFieldProps>().toHaveProperty("labels");
    expectTypeOf<RhfMoneyFieldProps>().toHaveProperty("currencyNames");
    expectTypeOf<RhfMoneyFieldProps>().toHaveProperty("variant");
  });
});

interface Values {
  rent: number | null;
  count: number | null;
  kind: string;
  agreed: boolean;
}

function Harness({
  children,
  formRef,
  defaults = { rent: 1200, count: 3, kind: "a", agreed: false },
  locked = false,
}: {
  children: ReactNode;
  formRef?: { current: UseFormReturn<Values> | null };
  defaults?: Partial<Record<keyof Values, unknown>>;
  locked?: boolean;
}) {
  const form = useForm<Values>({ defaultValues: defaults as Values });
  useEffect(() => {
    if (formRef) formRef.current = form;
  });
  return (
    <WriteLockProvider locked={locked} reason="Shared with you to read">
      <Form {...form}>
        <form noValidate>{children}</form>
      </Form>
    </WriteLockProvider>
  );
}

describe("the twins take what their field takes", () => {
  it("RhfSelect and RhfCheckbox lock with `commit` (Select's and Checkbox's lock)", () => {
    render(
      <Harness locked>
        <RhfSelect<Values> name="kind" label="Kind" options={[{ value: "a", label: "A" }]} commit />
        <RhfCheckbox<Values> name="agreed" label="Agreed" commit />
      </Harness>,
    );
    expect(screen.getByRole("combobox", { name: "Kind" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("checkbox", { name: "Agreed" })).toHaveAttribute("aria-disabled", "true");
  });

  it("RhfMoneyField takes `calculator={false}` (keksdose K6)", () => {
    render(
      <Harness>
        <RhfMoneyField<Values> name="rent" label="Rent" currency="CHF" calculator={false} />
      </Harness>,
    );
    expect(screen.getByRole("textbox", { name: "Rent" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /calculator/i })).toBeNull();
  });

  it("RhfToggleGroup, RhfCombobox and RhfTextCombobox still bind their value", () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef}>
        <RhfToggleGroup<Values>
          name="kind"
          label="Kind"
          options={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ]}
        />
        <RhfCombobox<Values> name="kind" label="Pick" options={[{ value: "a", label: "Alpha" }]} />
        <RhfTextCombobox<Values> name="kind" label="Text" options={["a", "b"]} />
      </Harness>,
    );
    expect(screen.getByRole("radio", { name: "A" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: /^Pick/ })).toHaveTextContent("Alpha");
    expect(screen.getByRole("combobox", { name: "Text" })).toHaveValue("a");
  });
});

describe("RhfMoneyField settles as MoneyField does (useMoneyDraft)", () => {
  it("snaps a lone '-' back to the stored amount on blur, where the form kept it", async () => {
    const user = userEvent.setup();
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef}>
        <RhfMoneyField<Values> name="rent" label="Rent" />
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Rent" });
    await user.tripleClick(input);
    await user.keyboard("-");
    expect(formRef.current!.getValues("rent")).toBe(1200);
    await user.tab();
    // Not "-" on screen while the form holds 1200.
    expect(input).toHaveValue("1200");
    expect(formRef.current!.getValues("rent")).toBe(1200);
  });
});

describe("RhfNumberField reads a stored text the way the field reads typing (DUP-9)", () => {
  it("a grouped default is the number it says, not NaN", () => {
    render(
      <Harness defaults={{ count: "1,234.5" }}>
        <RhfNumberField<Values> name="count" label="Count" locale="en-GB" />
      </Harness>,
    );
    expect(screen.getByRole("textbox", { name: "Count" })).toHaveValue("1234.5");
  });
});
