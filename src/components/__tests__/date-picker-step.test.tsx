import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DatePicker } from "../date-picker";

/**
 * Where DatePicker's ‹ › day steps land (keksdose feedback #131; lifted from keksdose's
 * own suite, FS-7 of its 2026-11-22 audit). The neighbouring files pin the rest of the
 * row: steppers-keep-focus-at-limits (a press onto `min` / `max` / today is refused and
 * keeps the focus), date-picker-today-out-of-bounds (Today outside the bounds is off, a
 * value already today refuses), date-picker.test (RTL mirroring, the focus frame, a
 * today-only row's className).
 */

const prev = () => screen.getByRole("button", { name: "Previous day" });
const next = () => screen.getByRole("button", { name: "Next day" });

function setup(props: Partial<ComponentProps<typeof DatePicker>> = {}) {
  const onChange = vi.fn();
  render(
    <DatePicker locale="en-GB" aria-label="Booking date" value="2026-03-15" onChange={onChange} step {...props} />,
  );
  return onChange;
}

describe("DatePicker's day steps", () => {
  it("move one day back and one forward", () => {
    const onChange = setup();
    fireEvent.click(next());
    expect(onChange).toHaveBeenLastCalledWith("2026-03-16");
    fireEvent.click(prev());
    expect(onChange).toHaveBeenLastCalledWith("2026-03-14");
  });

  it("cross a month boundary", () => {
    const onChange = setup({ value: "2026-03-31" });
    fireEvent.click(next());
    expect(onChange).toHaveBeenLastCalledWith("2026-04-01");
  });

  it("cross a month boundary backwards, into a shorter month", () => {
    const onChange = setup({ value: "2026-03-01" });
    fireEvent.click(prev());
    expect(onChange).toHaveBeenLastCalledWith("2026-02-28");
  });

  it("land on a leap day", () => {
    const onChange = setup({ value: "2028-02-28" });
    fireEvent.click(next());
    expect(onChange).toHaveBeenLastCalledWith("2028-02-29");
  });

  it("step past the end of February in a leap year too", () => {
    const onChange = setup({ value: "2028-02-29" });
    fireEvent.click(next());
    expect(onChange).toHaveBeenLastCalledWith("2028-03-01");
  });

  it("are both off, natively, while there is no date to step from", () => {
    // `off`, not refused: no press of these buttons empties the field, so the focus is
    // never on one as it turns (INP-4's two kinds, date-picker.tsx StepButton).
    const onChange = setup({ value: "" });
    expect(prev()).toBeDisabled();
    expect(next()).toBeDisabled();
    expect(prev()).not.toHaveAttribute("aria-disabled");
    fireEvent.click(next());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("refuse only the side a mounted value already sits on the bound of", () => {
    const onChange = setup({ value: "2026-03-15", min: "2026-03-15", max: "2026-03-16" });
    // Refused, focusable: aria-disabled and a click that does nothing.
    expect(prev()).toHaveAttribute("aria-disabled", "true");
    expect(prev()).toBeEnabled();
    fireEvent.click(prev());
    expect(onChange).not.toHaveBeenCalled();
    // The other side is a day inside the bounds.
    expect(next()).not.toHaveAttribute("aria-disabled");
    fireEvent.click(next());
    expect(onChange).toHaveBeenLastCalledWith("2026-03-16");
  });

  it("are not there without `step`", () => {
    setup({ step: undefined });
    expect(screen.queryByRole("button", { name: "Previous day" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next day" })).toBeNull();
  });

  it("leave a today-only row with Today and no steps", () => {
    setup({ step: undefined, today: "2026-03-20" });
    expect(screen.getByRole("button", { name: "Today" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Next day" })).toBeNull();
  });
});
