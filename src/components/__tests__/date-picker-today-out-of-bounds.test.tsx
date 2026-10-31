import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatePicker } from "../date-picker";
import { MonthPicker } from "../month-picker";

/**
 * Today outside `min` / `max` is a Today no press can reach, so it is natively disabled —
 * StepButton's `off` kind, and what MonthPicker's stepper does with its own Today (0.52
 * code review, date-picker.tsx). 0.52's INP-4 made the buttons that a press takes to
 * their limit refuse instead (`aria-disabled`, focusable, so the focus stays on them);
 * DatePicker filed this case with those, so its Today was a tab stop that could never do
 * anything, and the two pickers disagreed.
 */

describe("Today outside the bounds", () => {
  it("DatePicker: natively disabled, out of the tab order", () => {
    render(<DatePicker value="2026-01-10" onChange={() => {}} today="2026-10-31" max="2026-06-30" aria-label="Date" />);
    const today = screen.getByRole("button", { name: "Today" });
    expect(today).toBeDisabled();
    expect(today).not.toHaveAttribute("aria-disabled");
  });

  it("is the kind MonthPicker's stepper Today already is", () => {
    render(
      <MonthPicker
        variant="stepper"
        value="2026-01"
        onChange={() => {}}
        currentMonth="2026-10"
        max="2026-06"
        aria-label="Month"
      />,
    );
    const today = screen.getByRole("button", { name: /today|this month/i });
    expect(today).toBeDisabled();
    expect(today).not.toHaveAttribute("aria-disabled");
  });

  it("DatePicker: a value already today still refuses focusably (INP-4)", () => {
    render(<DatePicker value="2026-10-31" onChange={() => {}} today="2026-10-31" aria-label="Date" />);
    const today = screen.getByRole("button", { name: "Today" });
    expect(today).not.toBeDisabled();
    expect(today).toHaveAttribute("aria-disabled", "true");
  });
});
