import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { AmountInput } from "../amount-input";
import { CurrencySelect } from "../currency-select";
import { MoneyField } from "../money-field";
import { NumberField } from "../number-field";
import { NumberInput } from "../number-input";
import { SignChip } from "../sign-chip";
import { FieldHint } from "../ui";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * The 0.22 number round: NumberInput reads and shows the locale's marks (keksdose K5),
 * a dev-only money guard on it (kastlan 5, Kurvenschmiede), `calculator={false}` on the
 * money fields (keksdose K6), and `error` / `hint` where the field anatomy was missing
 * them (keksdose K4).
 */

const field = (name = "Value") => screen.getByRole("textbox", { name }) as HTMLInputElement;

/** A NumberInput holding its own state, with the value it reports on screen. */
function Harness({ locale, initial = "", fieldLocale }: { locale?: string; initial?: string; fieldLocale?: string }) {
  const [value, setValue] = useState(initial);
  const [committed, setCommitted] = useState<string | null>(null);
  return (
    <UiKitProvider locale={locale}>
      <NumberInput ariaLabel="Value" value={value} onChange={setValue} onCommit={setCommitted} locale={fieldLocale} />
      <output data-testid="value">{value}</output>
      <output data-testid="committed">{committed ?? ""}</output>
    </UiKitProvider>
  );
}
const reported = () => screen.getByTestId("value").textContent;
const committed = () => screen.getByTestId("committed").textContent;

describe("NumberInput shows the locale's decimal mark (keksdose K5)", () => {
  it("shows a comma to a French, Italian or German reader and a dot where Intl says so", () => {
    for (const [locale, shown] of [
      ["fr-CH", "3,5"],
      ["it-IT", "3,5"],
      ["de-DE", "3,5"],
      ["de-CH", "3.5"],
      ["en-US", "3.5"],
    ]) {
      const view = render(<Harness locale={locale} initial="3.5" />);
      expect(field()).toHaveValue(shown);
      // Display only: the value is still the dot-decimal text it was.
      expect(reported()).toBe("3.5");
      view.unmount();
    }
  });

  it("reports a typed comma as a dot and keeps showing the comma", () => {
    render(<Harness locale="fr-CH" />);
    fireEvent.change(field(), { target: { value: "1,5" } });
    expect(reported()).toBe("1.5");
    expect(field()).toHaveValue("1,5");
  });

  it("takes its own `locale` over the provider's", () => {
    render(<Harness locale="en-US" fieldLocale="de-DE" initial="2.25" />);
    expect(field()).toHaveValue("2,25");
  });

  it("keeps the dot for an invalid locale tag instead of throwing", () => {
    render(<Harness fieldLocale="not a locale!" initial="2.25" />);
    expect(field()).toHaveValue("2.25");
  });
});

describe("NumberInput reads grouping marks (keksdose K5, AmountInput's G1)", () => {
  it("reads the German '1.234,56' as 1234.56, not 1.23456", () => {
    render(<Harness locale="de-DE" />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "1.234,56" } });
    expect(reported()).toBe("1234.56");
    // The typist's text while typing, re-spelt without grouping when it commits.
    expect(field()).toHaveValue("1.234,56");
    fireEvent.blur(field());
    expect(committed()).toBe("1234.56");
    expect(field()).toHaveValue("1234,56");
  });

  it("keeps the grouping on screen key by key, so the caret never jumps", () => {
    render(<Harness locale="de-DE" />);
    fireEvent.focus(field());
    for (const text of ["1", "1.", "1.2", "1.23", "1.234", "1.234,", "1.234,5", "1.234,56"]) {
      fireEvent.change(field(), { target: { value: text } });
      expect(field()).toHaveValue(text);
    }
    expect(reported()).toBe("1234.56");
  });

  it("reads English grouping in a dot locale and keeps a lone comma a decimal there", () => {
    const first = render(<Harness locale="en-US" />);
    fireEvent.change(field(), { target: { value: "1,234.56" } });
    expect(reported()).toBe("1234.56");
    first.unmount();
    // de-CH is a dot locale whose typists write "1,5" (kastlan 40).
    render(<Harness locale="de-CH" />);
    fireEvent.change(field(), { target: { value: "1,789" } });
    expect(reported()).toBe("1.789");
  });

  it("reads each operand of a calculation on its own and evaluates it on blur", () => {
    render(<Harness locale="de-DE" />);
    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "1.000,5+2,5" } });
    expect(reported()).toBe("1000.5+2.5");
    fireEvent.blur(field());
    expect(committed()).toBe("1003");
    expect(field()).toHaveValue("1003");
  });

  it("keeps the caret where the typist put it when a grouping mark goes in mid-figure", async () => {
    const user = userEvent.setup();
    render(<Harness locale="de-DE" initial="1234.5" />);
    const input = field();
    expect(input).toHaveValue("1234,5");
    await user.click(input);
    input.setSelectionRange(1, 1);
    await user.keyboard(".");
    expect(input).toHaveValue("1.234,5");
    expect(input.selectionStart).toBe(2);
    expect(reported()).toBe("1234.5");
  });

  it("does not leave a dropped character on screen", () => {
    render(<Harness locale="en-US" />);
    fireEvent.change(field(), { target: { value: "1a5" } });
    expect(reported()).toBe("15");
    expect(field()).toHaveValue("15");
    // A second decimal point in one operand is a no-op keystroke, and shows as one.
    fireEvent.change(field(), { target: { value: "1.2.3" } });
    expect(reported()).toBe("1.23");
    expect(field()).toHaveValue("1.23");
  });

  it("shows a value set from outside in its own spelling, not the stale draft", () => {
    function Outside() {
      const [value, setValue] = useState("");
      return (
        <UiKitProvider locale="de-DE">
          <NumberInput ariaLabel="Value" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue("7.5")}>
            Set
          </button>
        </UiKitProvider>
      );
    }
    render(<Outside />);
    fireEvent.change(field(), { target: { value: "1.234" } });
    fireEvent.click(screen.getByRole("button", { name: "Set" }));
    expect(field()).toHaveValue("7,5");
  });

  describe("on a phone", () => {
    function asPhone() {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;
    }
    afterEach(() => {
      // @ts-expect-error jsdom leaves it undefined by default; restore that.
      delete window.matchMedia;
    });

    it("types the locale's mark from the numpad and never reads a result as grouping", () => {
      asPhone();
      render(<Harness locale="de-DE" />);
      fireEvent.focus(field());
      for (const key of ["1", "Decimal point", "5"]) fireEvent.click(screen.getByRole("button", { name: key }));
      expect(field()).toHaveValue("1,5");
      expect(reported()).toBe("1.5");
      // "1,5 × 0,8227" = 1.23405 — a dot-decimal RESULT, not "123405" in thousands shape.
      for (const key of ["Times", "0", "Decimal point", "8", "2", "2", "7"]) {
        fireEvent.click(screen.getByRole("button", { name: key }));
      }
      fireEvent.click(screen.getByRole("button", { name: "Equals" }));
      expect(reported()).toBe("1.23405");
      expect(field()).toHaveValue("1,23405");
    });
  });
});

describe("NumberInput error (keksdose K4/K5)", () => {
  it("paints, announces and describes, after the caller's ids and the caption", () => {
    render(
      <NumberInput
        label="Target"
        value="5"
        onChange={vi.fn()}
        hint="Per month"
        error="Must be above zero"
        aria-describedby="outer"
      />,
    );
    const input = field("Target");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const ids = input.getAttribute("aria-describedby")!.split(" ");
    expect(ids[0]).toBe("outer");
    expect(document.getElementById(ids[1]!)).toHaveTextContent("Per month");
    expect(document.getElementById(ids[2]!)).toHaveTextContent("Must be above zero");
  });

  it("keeps one steady box while the message comes and goes, so the input survives", () => {
    const { rerender } = render(<NumberInput label="Target" value="5" onChange={vi.fn()} error={undefined} />);
    const before = field("Target");
    expect(before).not.toHaveAttribute("aria-invalid");
    expect(before).not.toHaveAttribute("aria-describedby");
    rerender(<NumberInput label="Target" value="5" onChange={vi.fn()} error="Too low" />);
    expect(field("Target")).toBe(before);
    expect(before).toHaveAccessibleDescription("Too low");
    rerender(<NumberInput label="Target" value="5" onChange={vi.fn()} error={false} />);
    expect(field("Target")).toBe(before);
    expect(screen.queryByText("Too low")).not.toBeInTheDocument();
  });

  it("renders no wrapper for a field that never passes `error`", () => {
    const { container } = render(<NumberInput label="Target" value="5" onChange={vi.fn()} />);
    expect(container.firstElementChild).toHaveClass("relative");
  });
});

describe("NumberField reads grouping marks (keksdose K5)", () => {
  it("commits 1234.56 for a German '1.234,56'", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <UiKitProvider locale="de-DE">
        <NumberField label="Quantity" value={null} nullable onCommit={onCommit} />
      </UiKitProvider>,
    );
    const input = field("Quantity");
    await user.type(input, "1.234,56");
    expect(input).toHaveValue("1.234,56");
    await user.tab();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(1234.56);
    expect(input).toHaveValue("1234,56");
  });

  it("commits 1234.5 for an English '1,234.5', and its own `locale` decides", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <UiKitProvider locale="de-DE">
        <NumberField label="Quantity" value={null} nullable locale="en-US" onCommit={onCommit} />
      </UiKitProvider>,
    );
    const input = field("Quantity");
    await user.type(input, "1,234.5");
    await user.tab();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(1234.5);
    expect(input).toHaveValue("1234.5");
  });

  it("orders the caption before the error", () => {
    render(<NumberField label="Rate" value={1} hint="Yearly" error="Too high" onCommit={vi.fn()} />);
    const ids = field("Rate").getAttribute("aria-describedby")!.split(" ");
    expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(["Yearly", "Too high"]);
  });
});

describe("NumberInput money guard (kastlan 5, Kurvenschmiede)", () => {
  /** The guard is off under vitest, as the kit's logger is; this turns the dev build on. */
  function devBuild() {
    vi.stubEnv("VITEST", "");
    return vi.spyOn(console, "warn").mockImplementation(() => {});
  }
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("warns once per field for a currency in the label and no unit", () => {
    const warn = devBuild();
    const { rerender } = render(<NumberInput label="Estimated cost (CHF)" value="" onChange={vi.fn()} />);
    rerender(<NumberInput label="Estimated cost (CHF)" value="12.345" onChange={vi.fn()} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/Estimated cost \(CHF\).*AmountInput.*MoneyField/);
  });

  it("warns for a currency as the unit, a symbol in an aria-label, and a NumberField's currency unit", () => {
    const warn = devBuild();
    render(
      <>
        <NumberInput label="Amount" suffix="EUR" value="" onChange={vi.fn()} />
        <NumberInput ariaLabel="Betrag in €" value="" onChange={vi.fn()} />
        <NumberField label="Rent" unit="CHF" value={null} nullable onCommit={vi.fn()} />
      </>,
    );
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it("stays quiet about engineering fields at any number of decimals", () => {
    const warn = devBuild();
    render(
      <>
        <NumberField label="Wheelbase (mm)" digits={2} value={2700.25} onCommit={vi.fn()} />
        <NumberField label="Torque" unit="N·m" digits={3} value={1.125} onCommit={vi.fn()} />
        <NumberInput label="Frequency (Hz)" value="50.125" onChange={vi.fn()} />
        <NumberInput label="Interest rate" suffix="%" value="3.125" onChange={vi.fn()} />
        {/* A unit price is a rate: its decimals are the column's business. */}
        <NumberInput label="Fuel (CHF/l)" value="1.789" onChange={vi.fn()} />
        {/* A unit beats a currency in the label. */}
        <NumberInput label="Price (CHF)" suffix="kg" value="" onChange={vi.fn()} />
        {/* No whole-word code: "EURO" and "chf" are not ISO codes. */}
        <NumberInput label="EUROPA cell chf" value="" onChange={vi.fn()} />
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("is silent outside a development build", () => {
    const warn = devBuild();
    vi.stubEnv("DEV", false);
    render(<NumberInput label="Amount (CHF)" value="" onChange={vi.fn()} />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("is silent under vitest, so consumer suites stay readable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<NumberInput label="Amount (CHF)" value="" onChange={vi.fn()} />);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("AmountInput and MoneyField calculator={false} (keksdose K6)", () => {
  it("drops the desktop calculator trigger and still evaluates a typed sum", () => {
    const onCommit = vi.fn();
    function Cell() {
      const [value, setValue] = useState("");
      return (
        <AmountInput ariaLabel="Assigned" currency="EUR" calculator={false} value={value} onChange={setValue} onCommit={onCommit} />
      );
    }
    render(<Cell />);
    expect(screen.queryByRole("button", { name: "Open calculator" })).not.toBeInTheDocument();
    const input = field("Assigned");
    expect(input).toHaveClass("pe-14");
    fireEvent.change(input, { target: { value: "200+50" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenLastCalledWith("250");
  });

  it("keeps the trigger by default", () => {
    render(<AmountInput ariaLabel="Assigned" value="" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Open calculator" })).toBeInTheDocument();
  });

  it("passes through MoneyField", () => {
    render(<MoneyField ariaLabel="VAT" currency="CHF" calculator={false} value={1} onCommit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Open calculator" })).not.toBeInTheDocument();
  });
});

describe("AmountInput and MoneyField error (keksdose K4)", () => {
  it("paints, announces and describes, after the caller's ids and the caption", () => {
    render(
      <AmountInput
        label="Payment"
        currency="CHF"
        value="900"
        onChange={vi.fn()}
        hint="Outstanding: 800.00"
        error="Exceeds the outstanding balance"
        aria-describedby="outer"
      />,
    );
    const input = field("Payment");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const ids = input.getAttribute("aria-describedby")!.split(" ");
    expect(ids[0]).toBe("outer");
    expect(ids.slice(1).map((id) => document.getElementById(id)?.textContent)).toEqual([
      "Outstanding: 800.00",
      "Exceeds the outstanding balance",
    ]);
  });

  it("is no message when falsy, and keeps the input as it comes and goes", () => {
    const { rerender } = render(<AmountInput ariaLabel="Payment" value="1" onChange={vi.fn()} error={false} />);
    const before = field("Payment");
    expect(before).not.toHaveAttribute("aria-invalid");
    expect(before).not.toHaveAttribute("aria-describedby");
    rerender(<AmountInput ariaLabel="Payment" value="1" onChange={vi.fn()} error="Required" />);
    expect(field("Payment")).toBe(before);
    expect(before).toHaveAccessibleDescription("Required");
  });

  it("passes through MoneyField", () => {
    render(<MoneyField ariaLabel="Amount" currency="CHF" value={null} onCommit={vi.fn()} error="Required" />);
    expect(field("Amount")).toHaveAttribute("aria-invalid", "true");
    expect(field("Amount")).toHaveAccessibleDescription("Required");
  });

  it("no longer shows a dropped letter while typing", () => {
    function Amount() {
      const [value, setValue] = useState("");
      return <AmountInput ariaLabel="Amount" value={value} onChange={setValue} />;
    }
    render(<Amount />);
    fireEvent.change(field("Amount"), { target: { value: "1a5" } });
    expect(field("Amount")).toHaveValue("15");
  });
});

describe("CurrencySelect error and hint (keksdose K4)", () => {
  const trigger = () => screen.getByRole("combobox");

  it("puts a text hint and the error under the field and on the trigger's description", () => {
    render(
      <CurrencySelect
        label="Currency"
        value="EUR"
        onChange={vi.fn()}
        hint="The account's currency"
        error="Not the account's currency"
        aria-describedby="outer"
      />,
    );
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    const ids = trigger().getAttribute("aria-describedby")!.split(" ");
    expect(ids[0]).toBe("outer");
    expect(ids.slice(1).map((id) => document.getElementById(id)?.textContent)).toEqual([
      "The account's currency",
      "Not the account's currency",
    ]);
  });

  it("opens its list under the trigger, not under the messages", async () => {
    const user = userEvent.setup();
    render(<CurrencySelect label="Currency" value="EUR" onChange={vi.fn()} hint="Caption" error="Wrong" />);
    await user.click(trigger());
    const list = document.getElementById(trigger().getAttribute("aria-controls")!)!;
    expect(list).toBeInTheDocument();
    const caption = screen.getByText("Caption");
    // The panel precedes the caption in the flow, so its static position is the trigger's.
    expect(list.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts a FieldHint on the label line, and at the end edge without a label", () => {
    const { unmount } = render(
      <CurrencySelect label="Currency" value="EUR" onChange={vi.fn()} hint={<FieldHint label="Why this one" />} />,
    );
    expect(screen.getByRole("button", { name: "Why this one" })).toBeInTheDocument();
    expect(screen.getByText("Currency").parentElement).toContainElement(
      screen.getByRole("button", { name: "Why this one" }),
    );
    unmount();
    render(<CurrencySelect aria-label="Currency" value="EUR" onChange={vi.fn()} hint={<FieldHint label="Why" />} />);
    expect(screen.getByRole("button", { name: "Why" })).toBeInTheDocument();
    expect(trigger()).not.toHaveAttribute("aria-describedby");
  });

  it("is unchanged without either prop", () => {
    const { container } = render(<CurrencySelect label="Currency" value="EUR" onChange={vi.fn()} />);
    expect(trigger()).not.toHaveAttribute("aria-invalid");
    expect(trigger()).not.toHaveAttribute("aria-describedby");
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("SignChip (keksdose K15)", () => {
  function Signed() {
    const [negative, setNegative] = useState(true);
    return (
      <>
        <AmountInput ariaLabel="Amount" value="42.5" onChange={vi.fn()} negative={negative} onNegativeChange={setNegative} />
        <SignChip negative={negative} onNegativeChange={setNegative} />
      </>
    );
  }

  it("shows the state it is in, names the flip, and is no pressed toggle", async () => {
    const user = userEvent.setup();
    render(<Signed />);
    const chip = screen.getByRole("button", { name: "Direction: Outflow — switch to Inflow" });
    expect(chip).toHaveTextContent("Outflow");
    expect(chip).not.toHaveAttribute("aria-pressed");
    expect(field("Amount")).toHaveValue("-42.5");
    await user.click(chip);
    expect(screen.getByRole("button", { name: "Direction: Inflow — switch to Outflow" })).toHaveTextContent("Inflow");
    expect(field("Amount")).toHaveValue("42.5");
  });

  it("takes its words from `labels`", () => {
    render(
      <SignChip
        negative={false}
        onNegativeChange={vi.fn()}
        labels={{ outflow: "Ausgang", inflow: "Eingang", direction: (c, n) => `Richtung: ${c} — wechseln zu ${n}` }}
      />,
    );
    expect(screen.getByRole("button", { name: "Richtung: Eingang — wechseln zu Ausgang" })).toBeInTheDocument();
  });
});
