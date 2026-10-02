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

describe("MoneyField inputClassName", () => {
  it("passes it through to the <input>", () => {
    render(<MoneyField ariaLabel="VAT" value={7.7} onCommit={noop} inputClassName="text-end tabular-nums" />);
    const input = screen.getByRole("textbox", { name: "VAT" });
    expect(input).toHaveClass("text-end");
    expect(input).toHaveClass("tabular-nums");
  });
});
