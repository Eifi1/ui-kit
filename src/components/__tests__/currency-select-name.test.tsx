import { render, screen } from "@testing-library/react";
import { CurrencySelect } from "../currency-select";

/** keksdose's suite, 0.5.0: every CurrencySelect without an explicit `aria-label` was a
 *  combobox with NO accessible name — the label is a floating span, not a <label for>. */
describe("CurrencySelect's accessible name", () => {
  it("is 'label: code' from the visible label and the value", () => {
    render(<CurrencySelect label="Settlement currency" value="EUR" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Settlement currency: EUR" })).toBeInTheDocument();
  });

  it("is never empty: with no label it names the field by the currency word", () => {
    render(<CurrencySelect value="CHF" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Currency: CHF" })).toBeInTheDocument();
  });

  it("an explicit aria-label still wins", () => {
    render(<CurrencySelect aria-label="Pay in" value="EUR" onChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Pay in" })).toBeInTheDocument();
  });
});
