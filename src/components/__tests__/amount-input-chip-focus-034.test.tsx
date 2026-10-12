import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "../amount-input";

/**
 * Round 0.34 BUG-1, the currency chip's half: Escape on its list hands focus back to
 * the chip. The dropdown hands it to its `triggerRef`, else to whatever held focus as
 * the list opened — and Safari does not focus a clicked button, so there that was the
 * page, and focus fell to <body>. The chip is the `triggerRef` now. `fireEvent.click`
 * opens the list without focusing the chip, as Safari's click does.
 */
describe("AmountInput's currency chip gets focus back on Escape", () => {
  it("even when the click that opened the list did not focus it", () => {
    render(<AmountInput label="Amount" value="" onChange={() => {}} currency="EUR" onCurrencyChange={() => {}} />);
    const chip = screen.getByRole("button", { name: /^Currency/ });
    fireEvent.click(chip);
    const search = screen.getByPlaceholderText(/Search/);
    fireEvent.keyDown(search, { key: "Escape" });
    expect(screen.queryByPlaceholderText(/Search/)).toBeNull();
    expect(chip).toHaveFocus();
  });
});
