import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "../form";
import { RhfMoneyField, RhfNumberField, RhfTextField } from "../fields";
import { WriteLockProvider } from "../../components/write-lock";

/**
 * Round 0.34 C2: the bound twins of the lockable fields take the lock too —
 * `RhfMoneyField` (AmountInput's `commit` / `disabledReason`), `RhfTextField` (Input's,
 * through its props), and `RhfNumberField`, whose prop list did not pick NumberField's
 * lock in 0.33.1 although the notes said the Rhf twins pass it on.
 */

const REASON = "Shared with you to read";

interface Values {
  name: string;
  rent: number | null;
  count: number | null;
}

function Harness({ children, formRef }: { children: ReactNode; formRef: { current: UseFormReturn<Values> | null } }) {
  const form = useForm<Values>({ defaultValues: { name: "Ramp up", rent: 1200, count: 3 } });
  useEffect(() => {
    formRef.current = form;
  });
  return (
    <WriteLockProvider locked reason={REASON}>
      <Form {...form}>
        <form noValidate>{children}</form>
      </Form>
    </WriteLockProvider>
  );
}

describe("the Rhf twins under a write lock (round 0.34 C2)", () => {
  it("RhfMoneyField, RhfTextField and RhfNumberField lock with `commit`, and nothing reaches the form", async () => {
    const user = userEvent.setup();
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef}>
        <RhfMoneyField name="rent" label="Rent" currency="CHF" commit />
        <RhfTextField name="name" label="Name" commit />
        <RhfNumberField name="count" label="Rooms" commit />
      </Harness>,
    );
    for (const name of ["Rent", "Name", "Rooms"]) {
      const input = screen.getByRole("textbox", { name });
      expect(input).toHaveAttribute("readonly");
      expect(input).toHaveAttribute("aria-disabled", "true");
      expect(input).not.toBeDisabled();
      expect(input.getAttribute("aria-describedby") ?? "").not.toBe("");
      await user.click(input);
      await user.type(input, "9");
      fireEvent.keyDown(input, { key: "Enter" });
      await user.tab();
    }
    expect(formRef.current?.getValues()).toEqual({ name: "Ramp up", rent: 1200, count: 3 });
    expect(formRef.current?.formState.dirtyFields).toEqual({});
  });

  it("RhfMoneyField takes a `disabledReason` of its own, over `disabled`", () => {
    const formRef = { current: null as UseFormReturn<Values> | null };
    render(
      <Harness formRef={formRef}>
        <RhfMoneyField name="rent" label="Rent" currency="CHF" disabled disabledReason="Set by the lease." />
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Rent" });
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveAccessibleDescription("Set by the lease.");
  });
});
