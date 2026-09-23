import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TimeInput, isTimeInRange, normalizeTime } from "../time-input";

/**
 * TimeInput — `<Input type="time">` with a normalised string contract. Replaces
 * keksdose's quiet-hours pair (a local TIME_INPUT_CLASS on two `<Input type="time">`)
 * and kastlan's meeting-time TextField.
 */
describe("TimeInput", () => {
  it("renders a native time input with its value", () => {
    const { container } = render(<TimeInput value="14:30" onValueChange={vi.fn()} />);
    const input = container.querySelector("input")!;
    expect(input).toHaveAttribute("type", "time");
    expect(input).toHaveValue("14:30");
  });

  it("reports the normalised value, and the raw event to onChange", () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <TimeInput value="" onValueChange={onValueChange} onChange={onChange} />,
    );
    const input = container.querySelector("input")!;
    fireEvent.change(input, { target: { value: "08:05:00" } });
    expect(onValueChange).toHaveBeenLastCalledWith("08:05");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reports a cleared field as an empty string", () => {
    const onValueChange = vi.fn();
    const { container } = render(<TimeInput value="08:05" onValueChange={onValueChange} />);
    fireEvent.change(container.querySelector("input")!, { target: { value: "" } });
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("carries seconds when step asks for them", () => {
    const onValueChange = vi.fn();
    const { container } = render(<TimeInput value="10:00" step={1} onValueChange={onValueChange} />);
    const input = container.querySelector("input")!;
    // The value going in is normalised too.
    expect(input).toHaveValue("10:00:00");
    expect(input).toHaveAttribute("step", "1");
    fireEvent.change(input, { target: { value: "10:00:07" } });
    expect(onValueChange).toHaveBeenLastCalledWith("10:00:07");
  });

  it("drops seconds from a stored value in a minutes-only field", () => {
    const { container } = render(<TimeInput value="10:15:42" onValueChange={vi.fn()} />);
    expect(container.querySelector("input")).toHaveValue("10:15");
  });

  it("floats a label and wires `error` to the input", () => {
    render(<TimeInput label="Meeting time" value="09:00" error="Too early" onValueChange={vi.fn()} />);
    const input = screen.getByLabelText("Meeting time");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Too early");
  });

  it("paints an out-of-range value as invalid, and passes min/max on", () => {
    const { container, rerender } = render(
      <TimeInput value="07:00" min="08:00" max="18:00" onValueChange={vi.fn()} />,
    );
    const input = container.querySelector("input")!;
    expect(input).toHaveAttribute("min", "08:00");
    expect(input).toHaveAttribute("max", "18:00");
    expect(input).toHaveAttribute("aria-invalid", "true");
    rerender(<TimeInput value="12:00" min="08:00" max="18:00" onValueChange={vi.fn()} />);
    expect(input).not.toHaveAttribute("aria-invalid");
    rerender(<TimeInput value="" min="08:00" max="18:00" onValueChange={vi.fn()} />);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("opens the picker on a click anywhere in the field", () => {
    const { container } = render(<TimeInput value="" onValueChange={vi.fn()} />);
    const input = container.querySelector("input")! as HTMLInputElement & { showPicker: () => void };
    input.showPicker = vi.fn();
    fireEvent.click(input);
    expect(input.showPicker).toHaveBeenCalled();
  });

  it("forwards the ref and passes other props through", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <TimeInput
        ref={ref}
        value="12:00"
        onValueChange={vi.fn()}
        aria-label="Quiet from"
        disabled
        className="w-auto px-2 py-1"
        data-testid="quiet-start"
      />,
    );
    const input = screen.getByTestId("quiet-start");
    expect(ref.current).toBe(input);
    expect(input).toHaveAccessibleName("Quiet from");
    expect(input).toBeDisabled();
    expect(input).toHaveClass("w-auto", "px-2", "py-1", "tabular-nums");
  });
});

describe("normalizeTime", () => {
  it("shapes any valid time string to the step's precision", () => {
    expect(normalizeTime("09:30", false)).toBe("09:30");
    expect(normalizeTime("09:30:15.250", false)).toBe("09:30");
    expect(normalizeTime("09:30", true)).toBe("09:30:00");
    expect(normalizeTime("09:30:15.250", true)).toBe("09:30:15");
    expect(normalizeTime("", true)).toBe("");
  });
});

describe("isTimeInRange", () => {
  it("compares inclusively, ignoring a seconds mismatch", () => {
    expect(isTimeInRange("08:00", "08:00", "18:00")).toBe(true);
    expect(isTimeInRange("18:00:00", "08:00", "18:00")).toBe(true);
    expect(isTimeInRange("18:01", "08:00", "18:00")).toBe(false);
    expect(isTimeInRange("07:59", "08:00")).toBe(false);
    expect(isTimeInRange("23:59", undefined, "18:00")).toBe(false);
  });

  it("reads a reversed window as wrapping midnight", () => {
    expect(isTimeInRange("23:00", "22:00", "06:00")).toBe(true);
    expect(isTimeInRange("05:00", "22:00", "06:00")).toBe(true);
    expect(isTimeInRange("12:00", "22:00", "06:00")).toBe(false);
  });
});
