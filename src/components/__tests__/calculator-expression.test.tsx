import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CalculatorButton } from "../calculator";

/**
 * CalculatorButton's `onChange(value, expression)`: the result, and the text it came out
 * of. A host that owns the sign of its figure separately (keksdose's amount field) needs
 * to know 3 was CALCULATED from "1+2", not typed; a cleared pad calculated nothing, so its
 * expression is `undefined`. And the two editing keys, ⌫ and C.
 *
 * Lifted from keksdose's own suite (FS-7 of its 2026-11-22 audit). The commit side of a
 * session is calculator-commit.test's.
 */

function open(value: string) {
  const onChange = vi.fn();
  render(<CalculatorButton value={value} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Open calculator" }));
  return { onChange, display: screen.getByRole("textbox", { name: "Calculation" }) };
}

const key = (name: string) => screen.getByRole("button", { name });

describe("CalculatorButton's onChange", () => {
  it("passes the expression beside the result, typed on the keys", () => {
    const { onChange } = open("");
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(key("Plus"));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    // Each resolving keystroke reports, with the text it resolved from…
    expect(onChange).toHaveBeenLastCalledWith("3", "1+2");
    fireEvent.click(key("Equals"));
    // …and "=" reports the result once more, still with that text.
    expect(onChange).toHaveBeenLastCalledWith("3", "1+2");
  });

  it("does not report a dangling operator", () => {
    const { onChange } = open("");
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    onChange.mockClear();
    fireEvent.click(key("Plus"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("CalculatorButton's editing keys", () => {
  it("opens on the field's value; ⌫ drops the last character and reports what is left", () => {
    const { onChange, display } = open("12");
    expect(display).toHaveValue("12");
    fireEvent.click(key("Backspace"));
    expect(display).toHaveValue("1");
    expect(onChange).toHaveBeenLastCalledWith("1", "1");
  });

  it("C empties the pad and reports an empty value with no expression", () => {
    const { onChange, display } = open("12");
    fireEvent.click(key("Clear"));
    expect(display).toHaveValue("");
    // Explicitly `undefined`: nothing was calculated.
    expect(onChange).toHaveBeenLastCalledWith("", undefined);
    expect(onChange.mock.lastCall).toHaveLength(2);
  });
});
