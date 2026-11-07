import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "../form";
import { RhfQuantityField } from "../fields";

/**
 * RhfQuantityField (0.57, keksdose SL-10): a `Quantity` — the object — bound to one field,
 * as RhfNumberField binds a number. A real `useForm` throughout.
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

describe("RhfQuantityField", () => {
  it("stores the typed amount with its unit on blur, and a picked unit at once, both touched", async () => {
    const user = userEvent.setup();
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ qty: { amount: 500, unit: "g" } }} formRef={formRef}>
        <RhfQuantityField name="qty" label="Flour" family="mass" />
      </Harness>,
    );
    const amount = screen.getByRole("textbox", { name: "Flour" });
    expect(amount).toHaveValue("500");
    await user.clear(amount);
    await user.type(amount, "750");
    await user.tab();
    expect(formRef.current!.getValues("qty")).toEqual({ amount: 750, unit: "g" });
    expect(formRef.current!.getFieldState("qty").isTouched).toBe(true);
    await user.selectOptions(screen.getByRole("combobox", { name: "Unit for “Flour”" }), "kg");
    expect(formRef.current!.getValues("qty")).toEqual({ amount: 750, unit: "kg" });
  });

  it("shows a value that is no quantity as no amount in `defaultUnit`, else the first unit offered", () => {
    render(
      <Harness defaults={{ a: null, b: undefined }}>
        <RhfQuantityField name="a" label="Milk" family="volume" defaultUnit="l" />
        <RhfQuantityField name="b" label="Rice" family="mass" />
      </Harness>,
    );
    expect(screen.getByRole("textbox", { name: "Milk" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Unit for “Milk”" })).toHaveValue("l");
    expect(screen.getByRole("combobox", { name: "Unit for “Rice”" })).toHaveValue("g");
  });

  it("stores an emptied amount as no amount, the unit kept (nullable by default, as RhfNumberField)", async () => {
    const user = userEvent.setup();
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ qty: { amount: 2, unit: "l" } }} formRef={formRef}>
        <RhfQuantityField name="qty" label="Milk" family="volume" />
      </Harness>,
    );
    await user.clear(screen.getByRole("textbox", { name: "Milk" }));
    await user.tab();
    expect(formRef.current!.getValues("qty")).toEqual({ amount: null, unit: "l" });
  });

  it("focuses the amount on a failed submit, paints both halves and describes them by the message", async () => {
    render(
      <Harness defaults={{ qty: null }}>
        <RhfQuantityField
          name="qty"
          label="Flour"
          family="mass"
          hint="As on the pack"
          rules={{ validate: (q) => (q as { amount?: unknown } | null)?.amount != null || "Enter an amount" }}
        />
      </Harness>,
    );
    await submit();
    const amount = screen.getByRole("textbox", { name: "Flour" });
    expect(amount).toHaveFocus();
    const unit = screen.getByRole("combobox", { name: "Unit for “Flour”" });
    for (const control of [amount, unit]) {
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(control).toHaveAccessibleDescription("As on the pack Enter an amount");
    }
  });

  it("takes the suggestion into the form", async () => {
    const user = userEvent.setup();
    const formRef: FormRef = { current: null };
    render(
      <Harness defaults={{ qty: null }} formRef={formRef}>
        <RhfQuantityField
          name="qty"
          label="Eggs"
          family="count"
          suggestion={{ amount: 6, unit: "pcs" }}
          suggestionFrom="Usual pack"
        />
      </Harness>,
    );
    await user.click(screen.getByRole("button", { name: "Use 6\u202Fpcs" }));
    expect(formRef.current!.getValues("qty")).toEqual({ amount: 6, unit: "pcs" });
    expect(screen.getByRole("textbox", { name: "Eggs" })).toHaveValue("6");
  });
});
