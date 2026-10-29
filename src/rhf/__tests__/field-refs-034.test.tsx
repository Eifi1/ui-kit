import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactElement, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "../form";
import {
  RhfDateField,
  RhfDateRangePicker,
  RhfIntegerField,
  RhfMonthPicker,
  RhfNumberField,
  RhfToggleGroup,
} from "../fields";

/**
 * API-3 (refactor audit 2026-10, round 0.34 Wave 3): the six /rhf adapters whose control
 * forwarded no ref handed react-hook-form a stand-in found by id (`useFocusHandle`) — an
 * object with a `focus()` and nothing else. The controls take a `ref` now, and `field.ref`
 * goes to it: the element itself, so `setFocus` lands where it did and its
 * `shouldSelect` selects the figure, which the stand-in had no `select()` for (kastlan's
 * 49 number and date fields). Focus on a failed submit is fields-023's sweep.
 */

type Values = Record<string, unknown>;
type FormRef = { current: UseFormReturn<Values> | null };

function Harness({ children, defaults, formRef }: { children: ReactNode; defaults: Values; formRef: FormRef }) {
  const form = useForm<Values>({ defaultValues: defaults });
  useEffect(() => {
    formRef.current = form;
  });
  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(() => {})}>
        {children}
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

const REQUIRED = { required: "Required" };
const OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

const BINDINGS: Array<[string, Values, ReactElement, string, () => HTMLElement]> = [
  [
    "RhfNumberField",
    { f: 12.5 },
    <RhfNumberField name="f" label="Field" />,
    "f",
    () => screen.getByRole("textbox", { name: "Field" }),
  ],
  [
    "RhfIntegerField",
    { f: 3 },
    <RhfIntegerField name="f" label="Field" />,
    "f",
    () => screen.getByRole("textbox", { name: "Field" }),
  ],
  [
    "RhfDateField",
    { f: "" },
    <RhfDateField name="f" label="Field" />,
    "f",
    () => screen.getByRole("combobox", { name: /Field/ }),
  ],
  [
    "RhfDateRangePicker, from",
    { from: "", to: "" },
    <RhfDateRangePicker fromName="from" toName="to" label="Field" />,
    "from",
    () => screen.getByRole("combobox", { name: /Field/ }),
  ],
  [
    "RhfDateRangePicker, to",
    { from: "", to: "" },
    <RhfDateRangePicker fromName="from" toName="to" label="Field" />,
    "to",
    () => screen.getByRole("combobox", { name: /Field/ }),
  ],
  [
    "RhfMonthPicker",
    { f: "" },
    <RhfMonthPicker name="f" label="Field" />,
    "f",
    () => screen.getByRole("combobox", { name: /Field/ }),
  ],
  [
    "RhfToggleGroup",
    { f: "b" },
    <RhfToggleGroup name="f" label="Field" options={OPTIONS} />,
    "f",
    () => screen.getByRole("radio", { name: "B" }),
  ],
];

describe.each(BINDINGS)("%s: field.ref is the control (API-3)", (_name, defaults, field, name, control) => {
  it("setFocus lands on the control", async () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={defaults} formRef={formRef}>
        {field}
      </Harness>,
    );
    act(() => formRef.current!.setFocus(name));
    // react-hook-form focuses on the next task (a `setTimeout` in `setFocus`).
    await waitFor(() => expect(control()).toHaveFocus());
  });
});

describe("the number twins: setFocus's shouldSelect selects the figure", () => {
  it.each([
    ["RhfNumberField", <RhfNumberField name="f" label="Field" />],
    ["RhfIntegerField", <RhfIntegerField name="f" label="Field" />],
  ])("%s", async (_name, field) => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ f: 1234 }} formRef={formRef}>
        {field}
      </Harness>,
    );
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Field" });
    act(() => formRef.current!.setFocus("f", { shouldSelect: true }));
    await waitFor(() => expect(input).toHaveFocus());
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
    expect(input.value.length).toBeGreaterThan(0);
  });
});

describe("RhfDateRangePicker: an error on the END date alone still lands on the trigger", () => {
  it("focuses the one trigger both fields share", async () => {
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ from: "2026-10-01", to: "" }} formRef={formRef}>
        <RhfDateRangePicker fromName="from" toName="to" label="Field" toRules={REQUIRED} />
      </Harness>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    expect(screen.getByRole("combobox", { name: /Field/ })).toHaveFocus();
  });
});
