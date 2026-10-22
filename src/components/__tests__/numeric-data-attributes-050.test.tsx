import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "../amount-input";
import { NumberInput } from "../number-input";

/** 0.50 (keksdose): `data-*` props reach the field's root, as on Input, Select and the rest. */
describe("data-* on the numeric fields", () => {
  it("AmountInput puts them on its root", () => {
    const { container } = render(
      <AmountInput value="12" onChange={() => {}} aria-label="Amount" data-tour="amount" data-testid="amt" />,
    );
    const root = container.firstElementChild!;
    expect(root).toHaveAttribute("data-tour", "amount");
    expect(root).toHaveAttribute("data-testid", "amt");
    expect(root).toHaveClass("w-full");
  });

  it("NumberInput puts them on its root", () => {
    const { container } = render(<NumberInput value="3" onChange={() => {}} aria-label="Rate" data-tour="rate" />);
    expect(container.firstElementChild).toHaveAttribute("data-tour", "rate");
  });
});
