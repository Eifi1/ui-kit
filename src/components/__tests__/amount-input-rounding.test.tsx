import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "../amount-input";

/**
 * kastlan 0.12: the committed amount reached a Numeric(10,2) column unrounded
 * ("12.345", a calculator's "33.3333333333") and the save failed with a 422. The field
 * now settles to the currency's minor unit on blur and Enter.
 */
function Harness(props: {
  initial?: string;
  currency?: string;
  digits?: number;
  min?: number;
  max?: number;
  negative?: boolean;
}) {
  const { initial = "", negative: negativeInit, ...rest } = props;
  const [value, setValue] = useState(initial);
  const [negative, setNegative] = useState(negativeInit ?? false);
  return (
    <>
      <AmountInput
        ariaLabel="Amount"
        value={value}
        onChange={setValue}
        {...(negativeInit === undefined ? {} : { negative, onNegativeChange: setNegative })}
        {...rest}
      />
      <output data-testid="state">{`${negative ? "-" : ""}${value}`}</output>
    </>
  );
}

function typeAndBlur(text: string) {
  const input = screen.getByRole("textbox", { name: "Amount" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.blur(input);
  return input;
}

describe("AmountInput settles to the currency's minor unit", () => {
  it("rounds CHF to 2 decimals, half away from zero", () => {
    render(<Harness currency="CHF" />);
    expect(typeAndBlur("12.345")).toHaveValue("12.35");
  });

  it("rounds 1.005 up despite binary floats", () => {
    render(<Harness currency="EUR" />);
    expect(typeAndBlur("1.005")).toHaveValue("1.01");
  });

  it("rounds a calculation on commit", () => {
    render(<Harness currency="CHF" />);
    expect(typeAndBlur("100/3")).toHaveValue("33.33");
  });

  it("rounds JPY to whole yen", () => {
    render(<Harness currency="JPY" />);
    expect(typeAndBlur("1234.5")).toHaveValue("1235");
  });

  it("rounds on Enter too", () => {
    render(<Harness currency="CHF" />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    fireEvent.change(input, { target: { value: "0.125" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("0.13");
  });

  it("leaves keystrokes alone and keeps a figure's own spelling", () => {
    render(<Harness currency="CHF" />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    fireEvent.change(input, { target: { value: "12.345" } });
    expect(input).toHaveValue("12.345");
    fireEvent.change(input, { target: { value: "12.50" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("12.50");
  });

  it("does not round without a currency, unless digits is set", () => {
    const { unmount } = render(<Harness />);
    expect(typeAndBlur("12.345")).toHaveValue("12.345");
    unmount();
    render(<Harness digits={1} />);
    expect(typeAndBlur("12.345")).toHaveValue("12.3");
  });

  it("digits overrides the currency", () => {
    render(<Harness currency="CHF" digits={0} />);
    expect(typeAndBlur("12.5")).toHaveValue("13");
  });

  it("clamps to min and max", () => {
    const { unmount } = render(<Harness currency="CHF" max={500} />);
    expect(typeAndBlur("750")).toHaveValue("500");
    unmount();
    render(<Harness currency="CHF" min={10} />);
    expect(typeAndBlur("2")).toHaveValue("10");
  });

  it("rounds the magnitude of a caller-owned negative figure", () => {
    render(<Harness currency="CHF" negative />);
    typeAndBlur("-12.345");
    expect(screen.getByTestId("state")).toHaveTextContent("-12.35");
  });
});
