import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumberInput } from "../number-input";

/**
 * NumberInput's Enter commits the typed sum's RESULT, as blur does. Lifted from keksdose's
 * own suite (FS-7 of its 2026-11-22 audit). Blur's evaluation and commit are pinned in
 * number-input.locale-marks ("evaluates it on blur"), a step's commit on Enter in
 * number-steps-live, AmountInput's typed sum on Enter in number-input.locale-marks.
 */

function Harness({ onCommit }: { onCommit: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <NumberInput aria-label="Quantity" value={value} onChange={setValue} onCommit={onCommit} />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe("NumberInput on Enter", () => {
  it("evaluates a typed sum, shows and reports the result, and commits it", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    fireEvent.change(input, { target: { value: "200+50" } });
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("250");
    expect(input).toHaveValue("250");
    expect(screen.getByTestId("value")).toHaveTextContent("250");
  });

  it("commits a plain figure as it stands", () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const input = screen.getByRole("textbox", { name: "Quantity" });
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("42");
  });
});
