import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmountInput } from "../amount-input";
import { FieldHint } from "../ui";
import { roundToCurrency } from "../../lib/format";

/** keksdose P8: AmountInput's `hint`, NumberInput's rule. */
describe("AmountInput hint", () => {
  it("text is a caption under the field, described after the caller's own", () => {
    render(
      <AmountInput label="Rent" currency="EUR" value="1" onChange={vi.fn()} hint="Cold rent" aria-describedby="err" />,
    );
    const caption = screen.getByText("Cold rent");
    const input = screen.getByLabelText("Rent");
    expect(input.getAttribute("aria-describedby")).toBe(`err ${caption.id}`);
  });

  it("a FieldHint rides the label line, not a caption", () => {
    const { container } = render(
      <AmountInput label="Deposit" currency="EUR" value="1" onChange={vi.fn()} hint={<FieldHint label="Held back" />} />,
    );
    expect(container.querySelector("p")).toBeNull();
    const label = container.querySelector("label")!;
    expect(label.parentElement!.querySelector("button")).not.toBeNull();
    expect(screen.getByLabelText("Deposit")).not.toHaveAttribute("aria-describedby");
  });
});

describe("roundToCurrency fallbackDigits", () => {
  it("leaves an unresolvable currency unchanged by default", () => {
    expect(roundToCurrency(0.1 + 0.2, "")).toBe(0.30000000000000004);
    expect(roundToCurrency(1.23456, "EURO")).toBe(1.23456);
  });

  it("rounds an unresolvable currency to fallbackDigits", () => {
    expect(roundToCurrency(0.1 + 0.2, null, { fallbackDigits: 2 })).toBe(0.3);
    expect(roundToCurrency(1.23456, "EURO", { fallbackDigits: 2 })).toBe(1.23);
  });

  it("never lets the fallback override a known currency or explicit digits", () => {
    expect(roundToCurrency(1.005, "EUR", { fallbackDigits: 0 })).toBe(1.01);
    expect(roundToCurrency(5.5, "JPY", { fallbackDigits: 2 })).toBe(6);
    expect(roundToCurrency(1.23456, "", { digits: 3, fallbackDigits: 1 })).toBe(1.235);
    expect(roundToCurrency(1.23456, "EUR", 3)).toBe(1.235);
  });
});
