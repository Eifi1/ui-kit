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
        aria-label="Amount"
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
    // The typist's own text while typing (keksdose G1); respelt when it settles.
    expect(input()).toHaveValue("1,5");
    expect(state()).toBe("1.5");
    fireEvent.blur(input());
    expect(input()).toHaveValue("1.5");
  });

  it("accepts a typed dot in a comma locale", () => {
    render(<Harness locale="fr-CH" />);
    fireEvent.change(input(), { target: { value: "2.25" } });
    expect(input()).toHaveValue("2.25");
    expect(state()).toBe("2.25");
    fireEvent.blur(input());
    expect(input()).toHaveValue("2,25");
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

/**
 * keksdose G1: every "," was folded into "." before anything looked at it, so the
 * German "1.234,56" read as 1.23456 and 0.13's settle made it 1.23 — money, final.
 */
describe("AmountInput reads grouping marks (keksdose G1)", () => {
  const typeAndBlur = (text: string) => {
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: text } });
    fireEvent.blur(input());
  };

  it("reads the German grouping dot when both marks are there", () => {
    render(<Harness locale="de-DE" currency="EUR" />);
    typeAndBlur("1.234,56");
    expect(state()).toBe("1234.56");
    expect(input()).toHaveValue("1234,56");
  });

  it("keeps the grouping while it is typed key by key", () => {
    render(<Harness locale="de-DE" currency="EUR" />);
    fireEvent.focus(input());
    for (const text of ["1", "1.", "1.2", "1.23", "1.234", "1.234,", "1.234,5", "1.234,56"]) {
      fireEvent.change(input(), { target: { value: text } });
      expect(input()).toHaveValue(text);
    }
    expect(state()).toBe("1234.56");
  });

  it("reads a lone dot in thousands shape as grouping, anything else as a decimal", () => {
    const { unmount } = render(<Harness locale="de-DE" currency="EUR" />);
    typeAndBlur("1.234");
    expect(state()).toBe("1234");
    unmount();
    const second = render(<Harness locale="de-DE" currency="EUR" />);
    typeAndBlur("1.234.567");
    expect(state()).toBe("1234567");
    second.unmount();
    render(<Harness locale="de-DE" currency="EUR" />);
    typeAndBlur("12.5");
    expect(state()).toBe("12.5");
  });

  it("reads English grouping in a dot locale, and keeps a lone comma a decimal there", () => {
    const { unmount } = render(<Harness locale="en-US" currency="USD" />);
    typeAndBlur("1,234.56");
    expect(state()).toBe("1234.56");
    unmount();
    const second = render(<Harness locale="en-US" currency="USD" />);
    typeAndBlur("1,234,567");
    expect(state()).toBe("1234567");
    second.unmount();
    // de-CH is a dot locale where "1,789" is typed as a decimal (kastlan 40).
    render(<Harness locale="de-CH" />);
    typeAndBlur("1,789");
    expect(state()).toBe("1.789");
  });

  it("reads each operand of a calculation on its own", () => {
    render(<Harness locale="de-DE" currency="EUR" />);
    typeAndBlur("1.000,50+2,5");
    expect(state()).toBe("1003");
  });

  it("keeps the caller-owned sign with a grouped figure", () => {
    render(<Harness locale="de-DE" currency="EUR" negative />);
    fireEvent.change(input(), { target: { value: "-1.234,5" } });
    expect(input()).toHaveValue("-1.234,5");
    fireEvent.blur(input());
    expect(state()).toBe("-1234.5");
  });

  it("falls back to the value's own spelling when it is set from outside", () => {
    function Outside() {
      const [value, setValue] = useState("");
      return (
        <UiKitProvider locale="de-DE">
          <AmountInput aria-label="Amount" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue("7.5")}>
            Set
          </button>
        </UiKitProvider>
      );
    }
    render(<Outside />);
    fireEvent.change(input(), { target: { value: "1.234" } });
    fireEvent.click(screen.getByRole("button", { name: "Set" }));
    expect(input()).toHaveValue("7,5");
  });
});

/**
 * BUG-6 (refactor audit 2026-10): in a "," locale "0.500" read as five hundred — the
 * thousands shape took a leading 0 for a group. keksdose's provider locale is German.
 */
describe("AmountInput reads a leading-zero dot as a decimal (BUG-6)", () => {
  it("reads '0.500' as a half in de-DE", () => {
    render(<Harness locale="de-DE" currency="EUR" />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: "0.500" } });
    fireEvent.blur(input());
    // The settle keeps the typist's own spelling of an unchanged figure.
    expect(Number(state())).toBe(0.5);
  });
});

/**
 * BUG-11 (refactor audit 2026-10): the settle rounded through `${n}e${d}`, and
 * `String(n)` is exponent form below 1e-6 and from 1e21 — NaN, so the field blanked a
 * typed "0.0000001" or a 22-digit figure on blur.
 */
describe("AmountInput settles a figure of any size (BUG-11)", () => {
  const typeAndBlur = (text: string) => {
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: text } });
    fireEvent.blur(input());
  };

  it("rounds a figure below a millionth to 0 rather than blanking it", () => {
    render(<Harness locale="en-US" currency="EUR" />);
    typeAndBlur("0.0000001");
    expect(state()).toBe("0");
  });

  it("keeps a 22-digit figure", () => {
    render(<Harness locale="en-US" currency="EUR" />);
    typeAndBlur("1000000000000000000000");
    expect(state()).toBe("1000000000000000000000");
  });
});

// DUP-10 (refactor audit 2026-10): NumberInput took a `locale` prop and AmountInput read
// only the provider's — one field engine now, and the prop is AmountInput's too.
describe("AmountInput's own `locale` (0.34)", () => {
  it("decides the mark over the provider's, and the value stays dot-decimal", () => {
    let reported = "";
    render(
      <UiKitProvider locale="en-US">
        <AmountInput
          aria-label="Amount"
          value="1.5"
          onChange={(v) => (reported = v)}
          locale="de-CH"
          calculator={false}
        />
        <AmountInput aria-label="Price" value="1.5" onChange={() => {}} locale="fr-CH" calculator={false} />
      </UiKitProvider>,
    );
    // de-CH writes "." (CLDR), fr-CH ",".
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("1.5");
    const price = screen.getByRole("textbox", { name: "Price" });
    expect(price).toHaveValue("1,5");
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), { target: { value: "2.25" } });
    expect(reported).toBe("2.25");
  });
});
