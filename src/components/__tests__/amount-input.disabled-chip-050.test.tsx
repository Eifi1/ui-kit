import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "../amount-input";

/** 0.50: a disabled AmountInput's currency chip is a read-out, as a locked one's has been. */
describe("AmountInput currency chip, disabled", () => {
  const props = { "aria-label": "Amount", value: "5", onChange: () => {}, currency: "EUR", onCurrencyChange: () => {} };

  it("is a button while the field is live", () => {
    render(<AmountInput {...props} />);
    expect(screen.getByRole("button", { name: /EUR/ })).toBeInTheDocument();
  });

  it("is plain text, not a button, when the field is disabled", () => {
    render(<AmountInput {...props} disabled />);
    expect(screen.queryByRole("button", { name: /EUR/ })).toBeNull();
    expect(screen.getByText(/EUR|€/)).toBeInTheDocument();
  });
});
