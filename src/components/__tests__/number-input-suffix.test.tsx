import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NumberInput } from "../number-input";

/**
 * The unit read-out — the half of {@link AmountInput}'s currency chip that does not
 * open a picker.
 *
 * Keksdose had a percentage spelled three ways on three screens (`step="0.01"` for a
 * loan rate, `step="0.1"` for a tax rate, `inputMode="decimal"` for a VAT rate) and
 * none of the three put a "%" anywhere near the box, so what the digits meant was a
 * question the label alone had to answer. A unit belongs to the field, not to the
 * text: typing it would make it part of the value, and parsing it back out again is
 * the bug that invites.
 */
describe("NumberInput suffix", () => {
  it("shows the unit without putting it in the value", () => {
    const onChange = vi.fn();
    render(<NumberInput label="Rate" value="3.49" suffix="%" onChange={onChange} />);
    expect(screen.getByLabelText("Rate")).toHaveValue("3.49");
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the unit out of the accessible name", () => {
    // `aria-hidden`, like the currency read-out: the label already says what the
    // number is, and announcing the unit after every value reads as part of it.
    render(<NumberInput label="Rate" value="3.49" suffix="%" onChange={vi.fn()} />);
    expect(screen.getByText("%")).toHaveAttribute("aria-hidden");
  });

  it("reserves room for the unit AND the calculator together", () => {
    // Both trailing controls can be on at once. A field that reserved only whichever
    // happened to render would let the digits run under the other one.
    const { container, rerender } = render(
      <NumberInput label="Rate" value="1" suffix="%" onChange={vi.fn()} />,
    );
    const field = () => container.querySelector("input")!;
    expect(field().className).toContain("pr-16");

    rerender(<NumberInput label="Rate" value="1" suffix="%" calculator={false} onChange={vi.fn()} />);
    expect(field().className).toContain("pr-8");

    rerender(<NumberInput label="Rate" value="1" onChange={vi.fn()} />);
    expect(field().className).toContain("pr-9");
  });

  it("changes nothing for a field that passes no unit", () => {
    // The overwhelming majority of callers. The trailing track must not appear, or
    // every existing NumberInput gains a flex wrapper it does not need.
    const { container } = render(<NumberInput label="Amount" value="1" onChange={vi.fn()} />);
    expect(container.querySelectorAll("span[aria-hidden]")).toHaveLength(0);
  });

  it("still evaluates a typed calculation with a unit attached", () => {
    // The suffix is decoration; the field is the same field. "19+0.5" on a VAT rate
    // has to resolve on blur exactly as it does anywhere else.
    const onChange = vi.fn();
    render(<NumberInput label="Rate" value="19+0.5" suffix="%" onChange={onChange} />);
    fireEvent.blur(screen.getByLabelText("Rate"));
    expect(onChange).toHaveBeenCalledWith("19.5");
  });
});
