import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, type ReactElement, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "../form";
import {
  RhfCheckbox,
  RhfCombobox,
  RhfCountrySelect,
  RhfDateField,
  RhfDateRangePicker,
  RhfIbanInput,
  RhfIntegerField,
  RhfMoneyField,
  RhfMonthPicker,
  RhfNumberField,
  RhfPhoneInput,
  RhfSelect,
  RhfTextarea,
  RhfTextCombobox,
  RhfTextField,
  RhfTimeInput,
  RhfToggleGroup,
} from "../fields";

/**
 * 0.23 — kastlan: `RhfCountrySelect` and `RhfMonthPicker` (its address form and budget
 * wizard wired both through RhfField's render, and a failed submit could focus
 * neither), and a sweep that every bound field hands react-hook-form something it can
 * focus. A real `useForm` throughout; synthetic values only.
 */

type Values = Record<string, unknown>;
type FormRef = { current: UseFormReturn<Values> | null };

function Harness({
  children,
  defaults,
  formRef,
  onSubmit = () => {},
}: {
  children: ReactNode;
  defaults: Values;
  formRef?: FormRef;
  onSubmit?: (values: Values) => void;
}) {
  const form = useForm<Values>({ defaultValues: defaults });
  useEffect(() => {
    if (formRef) formRef.current = form;
  });
  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {children}
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

async function submit() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  });
}

const REQUIRED = { required: "Required" };

// ── RhfCountrySelect ─────────────────────────────────────────────────────────

describe("RhfCountrySelect (kastlan)", () => {
  it("stores the picked code and names the trigger by the form's label and the country", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ country: "ch" }} formRef={formRef}>
        <RhfCountrySelect name="country" label="Country" preferred={["CH", "DE"]} />
      </Harness>,
    );
    const trigger = screen.getByRole("combobox", { name: "Country Switzerland" });
    fireEvent.click(trigger);
    fireEvent.mouseDown(within(screen.getByRole("listbox")).getByRole("option", { name: "Germany" }));
    expect(formRef.current!.getValues("country")).toBe("DE");
    expect(screen.getByRole("combobox", { name: "Country Germany" })).toHaveFocus();
  });

  it("focuses the trigger on a failed submit, paints it and describes it with hint and message", async () => {
    render(
      <Harness defaults={{ country: null }}>
        <RhfCountrySelect name="country" label="Country" hint="Where the tenant lives" required rules={REQUIRED} />
      </Harness>,
    );
    await submit();
    const trigger = screen.getByRole("combobox", { name: "Country" });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAttribute("aria-required", "true");
    expect(trigger.className).toMatch(/danger/);
    expect(trigger).toHaveAccessibleDescription("Where the tenant lives Required");
    // The shell's message alone — the picker is handed neither the hint nor the error.
    expect(screen.getAllByText("Required")).toHaveLength(1);
    expect(screen.getAllByText("Where the tenant lives")).toHaveLength(1);
    // A labelled field's empty trigger says nothing: the label above already does.
    expect(trigger).toHaveTextContent(/^$/);
  });

  it("clearable: a clear stores null, or the clearValue the schema spells it with", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ a: "AT", b: "AT" }} formRef={formRef}>
        <RhfCountrySelect name="a" label="First" clearable />
        <RhfCountrySelect name="b" label="Second" clearable clearValue="" />
      </Harness>,
    );
    const [first, second] = screen.getAllByRole("button", { name: "Clear" });
    fireEvent.click(first);
    fireEvent.click(second);
    expect(formRef.current!.getValues("a")).toBeNull();
    expect(formRef.current!.getValues("b")).toBe("");
    // Both read back as empty: no "×" left to press.
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("passes the write lock through: focusable, aria-disabled, the list stays shut", () => {
    render(
      <Harness defaults={{ country: "CH" }}>
        <RhfCountrySelect name="country" label="Country" disabledReason="Only the owner can change this" />
      </Harness>,
    );
    const trigger = screen.getByRole("combobox", { name: "Country Switzerland" });
    expect(trigger).toHaveAttribute("aria-disabled", "true");
    expect(trigger).not.toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("is touched when focus leaves it", () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ country: null }} formRef={formRef}>
        <RhfCountrySelect name="country" label="Country" />
      </Harness>,
    );
    const trigger = screen.getByRole("combobox", { name: "Country" });
    act(() => {
      trigger.focus();
      trigger.blur();
    });
    expect(formRef.current!.getFieldState("country").isTouched).toBe(true);
  });
});

// ── RhfMonthPicker ───────────────────────────────────────────────────────────

describe("RhfMonthPicker (kastlan)", () => {
  it("stores a month key and focuses the trigger on a failed submit", async () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ month: "" }} formRef={formRef}>
        <RhfMonthPicker name="month" label="Month" hint="The billing month" locale="en-GB" currentMonth="2026-09" rules={REQUIRED} />
      </Harness>,
    );
    await submit();
    const trigger = screen.getByRole("combobox", { name: /Month/ });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger.className).toMatch(/danger/);
    expect(trigger).toHaveAccessibleDescription("The billing month Required");
    expect(screen.getAllByText("Required")).toHaveLength(1);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("gridcell", { name: "March 2026" }));
    expect(formRef.current!.getValues("month")).toBe("2026-03");
    expect(formRef.current!.getFieldState("month").isTouched).toBe(true);
    expect(screen.getByRole("combobox", { name: /Month/ })).toHaveTextContent("March 2026");
  });

  it('mode="year" stores "YYYY", or a number with valueAsNumber — and reads a number back', () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ year: "", fiscal: 2025 }} formRef={formRef}>
        <RhfMonthPicker name="year" label="Tax year" mode="year" min="2022" max="2026" locale="en-GB" required />
        <RhfMonthPicker name="fiscal" label="Fiscal year" mode="year" valueAsNumber min="2022" max="2026" locale="en-GB" />
      </Harness>,
    );
    const fiscal = screen.getByRole("combobox", { name: "Fiscal year 2025" });
    // `required` reaches the trigger (0.23.0 routes aria-required past the wrapper).
    expect(screen.getByRole("combobox", { name: /Tax year/ })).toHaveAttribute("aria-required", "true");
    expect(fiscal).not.toHaveAttribute("aria-required");
    fireEvent.click(screen.getByRole("combobox", { name: /Tax year/ }));
    fireEvent.click(screen.getByRole("gridcell", { name: "2024" }));
    expect(formRef.current!.getValues("year")).toBe("2024");

    fireEvent.click(fiscal);
    fireEvent.click(screen.getByRole("gridcell", { name: "2026" }));
    expect(formRef.current!.getValues("fiscal")).toBe(2026);
    expect(screen.getByRole("combobox", { name: "Fiscal year 2026" })).toBeInTheDocument();
  });
});

// ── aria-required on the date triggers ───────────────────────────────────────

describe("RhfDateField / RhfDateRangePicker: required reaches the trigger", () => {
  it("marks the date trigger and both range triggers aria-required", () => {
    render(
      <Harness defaults={{ due: "", from: "", to: "" }}>
        <RhfDateField name="due" label="Due" locale="en-GB" required />
        <RhfDateRangePicker fromName="from" toName="to" label="Period" locale="en-GB" required />
      </Harness>,
    );
    const triggers = screen.getAllByRole("combobox");
    expect(triggers.length).toBeGreaterThanOrEqual(2);
    for (const trigger of triggers) expect(trigger).toHaveAttribute("aria-required", "true");
  });
});

// ── focus on error, every binding ────────────────────────────────────────────

/** A field per binding, each required and empty, and the element focus-on-error must
 *  reach: the one a keyboard user would type or choose in. */
const BINDINGS: Array<[string, Values, ReactElement, () => HTMLElement]> = [
  ["RhfTextField", { f: "" }, <RhfTextField name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("textbox", { name: "Field" })],
  ["RhfTextarea", { f: "" }, <RhfTextarea name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("textbox", { name: "Field" })],
  ["RhfNumberField", { f: null }, <RhfNumberField name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("textbox", { name: "Field" })],
  ["RhfIntegerField", { f: "" }, <RhfIntegerField name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("textbox", { name: "Field" })],
  ["RhfMoneyField", { f: null }, <RhfMoneyField name="f" label="Field" currency="CHF" rules={REQUIRED} />, () => screen.getByRole("textbox", { name: "Field" })],
  ["RhfDateField", { f: "" }, <RhfDateField name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("combobox", { name: /Field/ })],
  [
    "RhfDateRangePicker",
    { from: "", to: "" },
    <RhfDateRangePicker fromName="from" toName="to" label="Field" fromRules={REQUIRED} />,
    () => screen.getByRole("combobox", { name: /Field/ }),
  ],
  ["RhfTimeInput", { f: "" }, <RhfTimeInput name="f" label="Field" rules={REQUIRED} />, () => screen.getByLabelText("Field")],
  ["RhfIbanInput", { f: "" }, <RhfIbanInput name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("textbox", { name: /Field/ })],
  ["RhfPhoneInput", { f: "" }, <RhfPhoneInput name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("textbox", { name: /Field/ })],
  [
    "RhfSelect",
    { f: "" },
    <RhfSelect name="f" label="Field" placeholder="Choose" options={[{ value: "a", label: "A" }]} rules={REQUIRED} />,
    () => screen.getByRole("combobox", { name: "Field" }),
  ],
  ["RhfCheckbox", { f: false }, <RhfCheckbox name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("checkbox", { name: "Field" })],
  [
    "RhfToggleGroup",
    { f: "" },
    <RhfToggleGroup name="f" label="Field" options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} rules={REQUIRED} />,
    () => screen.getByRole("radio", { name: "A" }),
  ],
  [
    "RhfCombobox",
    { f: null },
    <RhfCombobox name="f" label="Field" options={[{ value: 1, label: "Example Ltd" }]} rules={REQUIRED} />,
    () => screen.getByRole("combobox", { name: "Field" }),
  ],
  [
    "RhfTextCombobox",
    { f: "" },
    <RhfTextCombobox name="f" label="Field" options={["Example"]} rules={REQUIRED} />,
    () => screen.getByRole("combobox", { name: "Field" }),
  ],
  ["RhfCountrySelect", { f: null }, <RhfCountrySelect name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("combobox", { name: "Field" })],
  ["RhfMonthPicker", { f: "" }, <RhfMonthPicker name="f" label="Field" rules={REQUIRED} />, () => screen.getByRole("combobox", { name: /Field/ })],
  [
    "RhfMonthPicker year",
    { f: null },
    <RhfMonthPicker name="f" label="Field" mode="year" valueAsNumber rules={REQUIRED} />,
    () => screen.getByRole("combobox", { name: /Field/ }),
  ],
];

describe.each(BINDINGS)("%s: focus on error", (_name, defaults, field, control) => {
  it("lands on the control a failed submit is about", async () => {
    render(<Harness defaults={defaults}>{field}</Harness>);
    await submit();
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    expect(control()).toHaveFocus();
  });
});
