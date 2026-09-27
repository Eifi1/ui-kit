import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumberPadSheet } from "../numpad-sheet";

/**
 * keksdose G1: with a "," mark the pad hands its host the typist's own text, comma
 * included, so AmountInput can tell a grouping "." from the decimal one. "=" is a
 * result, dot-decimal, and goes to `onResult`.
 */
describe("NumberPadSheet with a comma mark", () => {
  const decimalKey = () => screen.getAllByRole("button").find((b) => b.textContent === ",")!;

  it("inserts the comma it shows, unsanitized", () => {
    const onChange = vi.fn();
    render(<NumberPadSheet value="1.234" onChange={onChange} onDone={() => {}} decimalMark="," />);
    fireEvent.click(decimalKey());
    expect(onChange).toHaveBeenCalledWith("1.234,");
  });

  it("sends the evaluated result to onResult", () => {
    const onChange = vi.fn();
    const onResult = vi.fn();
    render(
      <NumberPadSheet value="1+0,234" onChange={onChange} onResult={onResult} onDone={() => {}} decimalMark="," />,
    );
    fireEvent.click(screen.getByRole("button", { name: /equals|=/i }));
    expect(onResult).toHaveBeenCalledWith("1.234");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps sanitizing with the default dot mark", () => {
    const onChange = vi.fn();
    render(<NumberPadSheet value="1," onChange={onChange} onDone={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "7" }));
    expect(onChange).toHaveBeenCalledWith("1.7");
  });
});
