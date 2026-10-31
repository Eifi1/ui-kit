import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { MoneyField } from "../money-field";
import { NumberField } from "../number-field";
import { Form } from "../../rhf/form";
import { RhfMoneyField } from "../../rhf/fields";

/**
 * The stored number a field is handed, read the way the field reads its own output
 * (refactor audit 2026-10-30, INP-11 and INP-12).
 *
 * INP-11: a `value` of NaN looped NumberField, MoneyField and RhfMoneyField. Each one
 * re-reads its draft during render when `value` differs from the one it last saw, and
 * compared the two with `!==` — NaN !== NaN, so every render "saw" a new value and set
 * state again, and React threw "Too many re-renders". keksdose hands its threshold field
 * `Number(serverThreshold)`, which a non-numeric server string makes NaN.
 *
 * INP-12: `useMoneyDraft` wrote the stored number with `String(value)`, which switches to
 * exponent form below 1e-6 and from 1e21. The commit's digits-only cleanup strips the
 * "e", so one click into the field and away committed a different number: a float
 * leftover (100 − 99.99 − 0.01) as 5.12, 1e-7 as 17, 1e21 as 121. BUG-11's class, in the
 * one module that did not get `formatResult`.
 */

describe("a stored number that is not finite reads as empty", () => {
  it.each([NaN, Infinity])("NumberField, %s", (value) => {
    render(<NumberField label="Share" value={value} onCommit={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Share" })).toHaveValue("");
  });

  it("MoneyField, NaN", () => {
    render(<MoneyField label="Threshold" currency="CHF" value={NaN} onCommit={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Threshold" })).toHaveValue("");
  });

  it("RhfMoneyField, NaN", () => {
    function Harness() {
      const form = useForm<{ rent: number | null }>({ defaultValues: { rent: NaN } });
      return (
        <Form {...form}>
          <form noValidate>
            <RhfMoneyField name="rent" label="Rent" currency="CHF" />
          </form>
        </Form>
      );
    }
    render(<Harness />);
    expect(screen.getByRole("textbox", { name: "Rent" })).toHaveValue("");
  });
});

describe("MoneyField commits a stored number as that number", () => {
  async function clickThrough(value: number, digits?: number) {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<MoneyField label="Amount" currency="CHF" digits={digits} value={value} onCommit={onCommit} />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    await user.click(input);
    const shown = (input as HTMLInputElement).value;
    await user.tab();
    return { onCommit, shown };
  }

  it("a float leftover settles to 0, not 5.12", async () => {
    const { onCommit, shown } = await clickThrough(100 - 99.99 - 0.01);
    expect(shown).toBe("0");
    expect(onCommit.mock.calls).toEqual([[0]]);
  });

  it("1e-7 at eight decimals is left alone, not committed as 17", async () => {
    const { onCommit, shown } = await clickThrough(1e-7, 8);
    expect(shown).toBe("0.0000001");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("1e21 is left alone, not committed as 121", async () => {
    const { onCommit, shown } = await clickThrough(1e21);
    expect(shown).toBe("1000000000000000000000");
    expect(onCommit).not.toHaveBeenCalled();
  });
});
