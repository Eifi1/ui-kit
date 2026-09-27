import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AmountInput } from "../amount-input";
import { MoneyField } from "../money-field";
import { IntegerField } from "../number-field";
import { UiKitProvider } from "../../i18n/kit-labels";

const input = () => screen.getByRole("textbox", { name: "Amount" });
const typeAndBlur = (text: string) => {
  fireEvent.focus(input());
  fireEvent.change(input(), { target: { value: text } });
  fireEvent.blur(input());
};

describe("AmountInput onCommit (kastlan 52)", () => {
  it("fires with the settled figure on blur and Enter, never per keystroke", () => {
    const onCommit = vi.fn();
    function Harness() {
      const [value, setValue] = useState("");
      return <AmountInput ariaLabel="Amount" currency="CHF" value={value} onChange={setValue} onCommit={onCommit} />;
    }
    render(<Harness />);
    fireEvent.change(input(), { target: { value: "1200+" } });
    fireEvent.change(input(), { target: { value: "1200+80.555" } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onCommit).toHaveBeenLastCalledWith("1280.56");
  });
});

describe("MoneyField (kastlan 52)", () => {
  function Row({ onCommit, initial = 100 }: { onCommit: (v: number | null) => void; initial?: number | null }) {
    const [amount, setAmount] = useState<number | null>(initial);
    return (
      <>
        <MoneyField
          ariaLabel="Amount"
          currency="CHF"
          value={amount}
          max={5000}
          onCommit={(v) => {
            onCommit(v);
            setAmount(v);
          }}
        />
        <output data-testid="amount">{String(amount)}</output>
      </>
    );
  }

  it("takes a number, and hands back only settled numbers", () => {
    const onCommit = vi.fn();
    render(<Row onCommit={onCommit} />);
    expect(input()).toHaveValue("100");
    fireEvent.change(input(), { target: { value: "1200+" } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.change(input(), { target: { value: "1200+80.555" } });
    fireEvent.blur(input());
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenLastCalledWith(1280.56);
    expect(screen.getByTestId("amount")).toHaveTextContent("1280.56");
  });

  it("clamps, empties to null, and does not re-commit an unchanged amount", () => {
    const onCommit = vi.fn();
    render(<Row onCommit={onCommit} />);
    typeAndBlur("9000");
    expect(onCommit).toHaveBeenLastCalledWith(5000);
    typeAndBlur("");
    expect(onCommit).toHaveBeenLastCalledWith(null);
    onCommit.mockClear();
    fireEvent.focus(input());
    fireEvent.blur(input());
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("goes back to the stored amount when the text is no number", () => {
    const onCommit = vi.fn();
    render(<Row onCommit={onCommit} />);
    typeAndBlur("-");
    expect(onCommit).not.toHaveBeenCalled();
    expect(input()).toHaveValue("100");
  });

  it("reads the locale's marks like AmountInput", () => {
    const onCommit = vi.fn();
    render(
      <UiKitProvider locale="de-DE">
        <Row onCommit={onCommit} initial={null} />
      </UiKitProvider>,
    );
    typeAndBlur("1.234,5");
    expect(onCommit).toHaveBeenLastCalledWith(1234.5);
    expect(input()).toHaveValue("1234,5");
  });

  it("follows a value set from outside", () => {
    function Outside() {
      const [amount, setAmount] = useState<number | null>(1);
      return (
        <>
          <MoneyField ariaLabel="Amount" value={amount} onCommit={setAmount} />
          <button type="button" onClick={() => setAmount(42)}>
            Reset
          </button>
        </>
      );
    }
    render(<Outside />);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(input()).toHaveValue("42");
  });
});

describe("IntegerField (kastlan 51)", () => {
  it("rounds to whole numbers and shows no calculator by default", () => {
    const onCommit = vi.fn();
    render(<IntegerField label="Year" value={null} nullable onCommit={onCommit} />);
    const field = screen.getByRole("textbox", { name: /Year/ });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "1987.6" } });
    fireEvent.blur(field);
    expect(onCommit).toHaveBeenLastCalledWith(1988);
    expect(screen.queryByRole("button", { name: /calculator/i })).toBeNull();
  });

  it("keeps each preset overridable", () => {
    render(<IntegerField label="Share" value={null} nullable onCommit={() => {}} calculator />);
    expect(screen.getByRole("button", { name: /calculator/i })).toBeInTheDocument();
  });
});
