import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "../amount-input";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * kastlan 40: the field showed a "." whatever the locale, so a fr-CH user typing
 * "1,5" watched it become "1.5". The DISPLAY now uses the locale's mark; the value
 * reported through `onChange` stays dot-decimal (RhfMoneyField's `parseAmount` and
 * every app's `Number(value)` read it).
 */
function Harness(props: { locale: string; initial?: string; currency?: string; negative?: boolean }) {
  const { locale, initial = "", negative: negativeInit, currency } = props;
  const [value, setValue] = useState(initial);
  const [negative, setNegative] = useState(negativeInit ?? false);
  return (
    <UiKitProvider locale={locale}>
      <AmountInput
        ariaLabel="Amount"
        value={value}
        onChange={setValue}
        currency={currency}
        {...(negativeInit === undefined ? {} : { negative, onNegativeChange: setNegative })}
      />
      <output data-testid="state">{`${negative ? "-" : ""}${value}`}</output>
    </UiKitProvider>
  );
}

const input = () => screen.getByRole("textbox", { name: "Amount" });
const state = () => screen.getByTestId("state").textContent;

describe("AmountInput decimal mark (kastlan 40)", () => {
  it("shows a comma in fr-CH and reports a dot", () => {
    render(<Harness locale="fr-CH" />);
    fireEvent.change(input(), { target: { value: "1,5" } });
    expect(input()).toHaveValue("1,5");
    expect(state()).toBe("1.5");
  });

  it("renders an incoming dot value with the locale's mark", () => {
    render(<Harness locale="de-DE" initial="12.50" />);
    expect(input()).toHaveValue("12,50");
  });

  it("keeps the dot where Intl says so (de-CH, en-US)", () => {
    const { unmount } = render(<Harness locale="de-CH" initial="12.5" />);
    expect(input()).toHaveValue("12.5");
    unmount();
    render(<Harness locale="en-US" />);
    fireEvent.change(input(), { target: { value: "1,5" } });
    expect(input()).toHaveValue("1.5");
    expect(state()).toBe("1.5");
  });

  it("accepts a typed dot in a comma locale", () => {
    render(<Harness locale="fr-CH" />);
    fireEvent.change(input(), { target: { value: "2.25" } });
    expect(input()).toHaveValue("2,25");
    expect(state()).toBe("2.25");
  });

  it("evaluates a comma expression on blur and settles it", () => {
    render(<Harness locale="fr-CH" currency="CHF" />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: "1,5+2,255" } });
    expect(input()).toHaveValue("1,5+2,255");
    fireEvent.blur(input());
    expect(state()).toBe("3.76");
    expect(input()).toHaveValue("3,76");
  });

  it("keeps the caller-owned sign in front of the localised figure", () => {
    render(<Harness locale="fr-CH" negative />);
    fireEvent.change(input(), { target: { value: "-4,5" } });
    expect(state()).toBe("-4.5");
    expect(input()).toHaveValue("-4,5");
    // A resolved sum still sets the direction from its result.
    fireEvent.change(input(), { target: { value: "-4,5+10" } });
    fireEvent.blur(input());
    expect(state()).toBe("5.5");
    expect(input()).toHaveValue("5,5");
  });
});
