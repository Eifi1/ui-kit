import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NumberField } from "../number-field";
import { NumberInput, stepNumber } from "../number-input";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * Kastlan's two asks on the number fields: a live calculator that does not have to
 * choose between NumberField (limits, but a number only on blur) and NumberInput
 * (per keystroke, but a string), and step keys for a reference rate (0.25) and a room
 * count (0.5).
 */

describe("stepNumber", () => {
  it("is decimal-exact where summing floats is not", () => {
    expect(stepNumber(0.2, 1, 0.1)).toBe(0.3);
    expect(stepNumber(0.1, 2, 0.1)).toBe(0.3);
    expect(stepNumber(1.15, -1, 0.05)).toBe(1.1);
  });

  it("moves an off-grid value to the next grid point, never more than one step", () => {
    expect(stepNumber(3.1, 1, 0.25)).toBe(3.25);
    expect(stepNumber(3.1, -1, 0.25)).toBe(3);
    expect(stepNumber(3.1, 10, 0.25)).toBe(5.5);
  });

  it("puts the grid on `min`", () => {
    expect(stepNumber(1, 1, 2, 1)).toBe(3);
    expect(stepNumber(2, 1, 2, 1)).toBe(3);
  });

  it("clamps into [min, max], and starts an empty field at the bound nearest zero", () => {
    expect(stepNumber(9.75, 10, 0.25, 0, 10)).toBe(10);
    expect(stepNumber(0.5, -10, 0.5, 0.5)).toBe(0.5);
    expect(stepNumber(null, 1, 0.5, 1)).toBe(1);
    expect(stepNumber(null, -1, 0.25)).toBe(0);
  });
});

describe("NumberInput step keys", () => {
  function Controlled(props: { initial: string; step?: number; min?: number; max?: number; onCommit?: (v: string) => void }) {
    const [value, setValue] = useState(props.initial);
    return (
      <NumberInput
        label="Rate"
        value={value}
        onChange={setValue}
        onCommit={props.onCommit}
        step={props.step}
        min={props.min}
        max={props.max}
        calculator={false}
      />
    );
  }

  it("steps with the arrows and ten steps with PageUp/PageDown", () => {
    render(<Controlled initial="2.5" step={0.25} />);
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveValue("2.75");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveValue("2.25");
    fireEvent.keyDown(input, { key: "PageUp" });
    expect(input).toHaveValue("4.75");
    fireEvent.keyDown(input, { key: "PageDown" });
    expect(input).toHaveValue("2.25");
  });

  it("stays inside [min, max]", () => {
    render(<Controlled initial="4.5" step={0.5} min={1} max={5} />);
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "PageUp" });
    expect(input).toHaveValue("5");
    fireEvent.keyDown(input, { key: "PageDown" });
    fireEvent.keyDown(input, { key: "PageDown" });
    expect(input).toHaveValue("1");
  });

  it("steps from a typed calculation's result", () => {
    render(<Controlled initial="0.1+0.1" step={0.1} />);
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveValue("0.3");
  });

  it("changes the text but leaves the commit to blur/Enter", () => {
    const onCommit = vi.fn();
    render(<Controlled initial="1" step={1} onCommit={onCommit} />);
    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith("2");
  });

  it("leaves the arrows to the caret without a step", () => {
    render(<Controlled initial="7" />);
    const input = screen.getByRole("textbox");
    const event = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(input).toHaveValue("7");
  });
});

describe("NumberField live mode", () => {
  it("reports the parsed number per keystroke, unclamped, and commits once on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <NumberField label="Rooms" value={3} min={1} max={10} onCommit={onCommit} onValueChange={onValueChange} />,
    );
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "15");
    // "" → null, "1" → 1, "15" → 15: not clamped while typing.
    expect(onValueChange.mock.calls).toEqual([[null], [1], [15]]);
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(10);
    // …and once more with the clamped number, so live and committed agree.
    expect(onValueChange).toHaveBeenLastCalledWith(10);
    expect(input).toHaveValue("10");
  });

  it("evaluates a calculation live and fires nothing for a draft that is no number yet", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField label="Total" value={null} nullable onCommit={() => {}} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "-");
    expect(onValueChange).not.toHaveBeenCalled();
    await user.type(input, "2+");
    expect(onValueChange.mock.calls).toEqual([[-2]]);
    await user.type(input, "5");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  it("reports the snapped-back value when the draft is abandoned", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberField label="Rooms" value={3} onCommit={() => {}} onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox");
    await user.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    await user.tab();
    expect(input).toHaveValue("3");
    expect(onValueChange).toHaveBeenLastCalledWith(3);
  });

  it("keeps the typist's text when the live value is fed back into `value`", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    function Calculator() {
      const [rate, setRate] = useState<number | null>(2);
      return (
        <>
          <NumberField label="Rate" value={rate} digits={2} onValueChange={setRate} onCommit={onCommit} />
          <output>{String(rate)}</output>
        </>
      );
    }
    render(
      <UiKitProvider locale="de">
        <Calculator />
      </UiKitProvider>,
    );
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "1,");
    expect(input).toHaveValue("1,");
    await user.type(input, "256");
    expect(input).toHaveValue("1,256");
    expect(document.querySelector("output")).toHaveTextContent("1.256");
    await user.tab();
    // The commit still fires — the echoed live value did not count as committed.
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(1.26);
    expect(input).toHaveValue("1,26");
    expect(document.querySelector("output")).toHaveTextContent("1.26");
  });

  it("steps live, in the locale's mark, and commits the step on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <UiKitProvider locale="de">
        <NumberField label="Rate" value={2.5} digits={2} step={0.25} min={0} onCommit={onCommit} onValueChange={onValueChange} />
      </UiKitProvider>,
    );
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("2,75");
    expect(onValueChange).toHaveBeenLastCalledWith(2.75);
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(2.75);
  });
});
