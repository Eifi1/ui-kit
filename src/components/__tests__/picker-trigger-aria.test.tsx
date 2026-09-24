import { render, screen } from "@testing-library/react";
import { DatePicker, DateRangePicker } from "../date-picker";
import { MonthPicker } from "../month-picker";

/**
 * kastlan, 0.5.0: the pickers could not be named by an external `<label htmlFor>` or
 * wired by a form library's control slot — `id` and `aria-*` landed on the wrapper
 * `<div>`, not on the `role="combobox"` trigger. These are the three things a form
 * library does to a control, asserted on the element a screen reader focuses.
 */
const pickers = [
  ["DatePicker", (p: object) => <DatePicker value="2026-09-23" onChange={() => {}} locale="en-GB" {...p} />],
  [
    "DatePicker with step buttons",
    (p: object) => (
      <DatePicker value="2026-09-23" onChange={() => {}} locale="en-GB" step today="2026-09-23" {...p} />
    ),
  ],
  ["DateRangePicker", (p: object) => <DateRangePicker from="2026-09-01" to="2026-09-23" onChange={() => {}} locale="en-GB" {...p} />],
  ["MonthPicker", (p: object) => <MonthPicker value="2026-09" onChange={() => {}} locale="en-GB" {...p} />],
] as const;

describe.each(pickers)("%s — naming from outside", (_, picker) => {
  it("an external <label htmlFor> names the trigger, followed by its value", () => {
    render(
      <>
        <label htmlFor="due">Due date</label>
        {picker({ id: "due" })}
      </>,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("id", "due");
    expect(trigger).toHaveAccessibleName(/^Due date\b/);
  });

  it("aria-describedby and aria-invalid reach the trigger, not the wrapper", () => {
    render(
      <>
        <p id="err">Pick a day in the lease period</p>
        {picker({ "aria-describedby": "err", "aria-invalid": true })}
      </>,
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAccessibleDescription("Pick a day in the lease period");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });

  it("a form library's aria-labelledby is spoken before the value", () => {
    render(
      <>
        <span id="lbl">Handover</span>
        {picker({ "aria-labelledby": "lbl" })}
      </>,
    );
    expect(screen.getByRole("combobox")).toHaveAccessibleName(/^Handover\b/);
  });
});
