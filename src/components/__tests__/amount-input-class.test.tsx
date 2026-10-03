import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmountInput } from "../amount-input";
import { MoneyField } from "../money-field";
import { FIELD_INVALID } from "../ui";

/**
 * keksdose G7 (0.23): a VAT cell right-aligns its figure. `className` is the wrapper's,
 * so the cell reached the `<input>` through `[&_input]:text-end`; `inputClassName` is
 * the element's own, as on NumberInput and Input.
 */
const noop = vi.fn();

describe("AmountInput inputClassName", () => {
  it("lands on the <input>, and className stays on the wrapper", () => {
    const { container } = render(
      <AmountInput ariaLabel="Gross" value="12.50" onChange={noop} className="max-w-40" inputClassName="text-end" calculator={false} />,
    );
    const input = screen.getByRole("textbox", { name: "Gross" });
    expect(input).toHaveClass("text-end");
    expect(input).not.toHaveClass("max-w-40");
    expect(container.firstElementChild).toHaveClass("max-w-40");
    expect(container.firstElementChild).not.toHaveClass("text-end");
  });

  it("restyles the base, but cannot take the trailing controls' room or the invalid border", () => {
    render(
      <AmountInput
        ariaLabel="Gross"
        value="1"
        onChange={noop}
        currency="CHF"
        invalid
        inputClassName="px-2 py-1 border-transparent"
      />,
    );
    const input = screen.getByRole("textbox", { name: "Gross" });
    // The base's own padding gives way to the caller's…
    expect(input).toHaveClass("py-1");
    // …but the end padding the calculator and the chip reserve is applied after it.
    expect(input.className).toMatch(/\bpe-16\b/);
    // And the invalid border still wins over a caller's border colour.
    for (const token of FIELD_INVALID.split(/\s+/).filter(Boolean)) expect(input.className).toContain(token);
  });

  it("applies in a labelled field too", () => {
    render(<AmountInput label="Net" value="1" onChange={noop} inputClassName="font-medium" />);
    expect(screen.getByRole("textbox", { name: "Net" })).toHaveClass("font-medium");
  });
});

/**
 * keksdose (0.24): the caller's classes come after everything the field sets for LOOKS
 * — the plain end padding and the tone colour included — and before only what it needs
 * to work: the room its trailing controls reserve, and the invalid border.
 */
describe("AmountInput inputClassName wins over the field's own looks (0.24)", () => {
  it("a symmetric px-2 when nothing trails — the budget's assigned cell", () => {
    render(<AmountInput ariaLabel="Assigned" value="1" onChange={noop} calculator={false} inputClassName="px-2 py-1 text-end" />);
    const input = screen.getByRole("textbox", { name: "Assigned" });
    expect(input).toHaveClass("px-2", "py-1", "text-end");
    // Not `px-2 pe-3`, which left the end edge wider than the start.
    expect(input.className).not.toMatch(/\bpe-\d/);
    expect(input.className).not.toMatch(/\bpx-3\b/);
  });

  it.each(["outflow", "inflow"] as const)("text-transparent over the %s tone — a price being re-fetched", (tone) => {
    render(
      <AmountInput
        ariaLabel="Price"
        value="12.5"
        onChange={noop}
        currency="CHF"
        tone={tone}
        inputClassName="text-transparent caret-transparent"
      />,
    );
    const input = screen.getByRole("textbox", { name: "Price" });
    expect(input).toHaveClass("text-transparent", "caret-transparent");
    expect(input.className).not.toMatch(/text-money-(neg|pos)/);
  });

  it("the tone still paints when the caller sets no colour", () => {
    render(<AmountInput ariaLabel="Spent" value="12.5" onChange={noop} tone="outflow" inputClassName="text-end" />);
    expect(screen.getByRole("textbox", { name: "Spent" })).toHaveClass("text-money-neg", "text-end");
  });

  it("the calculator's room is still applied after a caller's px-2, with no currency too", () => {
    render(<AmountInput ariaLabel="Gross" value="1" onChange={noop} inputClassName="px-2" />);
    const input = screen.getByRole("textbox", { name: "Gross" });
    expect(input).toHaveClass("px-2");
    expect(input.className).toMatch(/\bpe-10\b/);
  });
});

describe("MoneyField inputClassName", () => {
  it("passes it through to the <input>", () => {
    render(<MoneyField ariaLabel="VAT" value={7.7} onCommit={noop} inputClassName="text-end tabular-nums" />);
    const input = screen.getByRole("textbox", { name: "VAT" });
    expect(input).toHaveClass("text-end");
    expect(input).toHaveClass("tabular-nums");
  });
});
