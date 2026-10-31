import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatePicker, DateRangePicker } from "../date-picker";

/**
 * The date field's clear "×" hands the focus to the trigger (refactor audit 2026-10-30,
 * INP-10). The × is a tabbable button that exists only while there is a value, so a
 * keyboard clear unmounted the button under the focus, and the focus fell to <body>.
 * SearchField puts it back after its clear; this does the same. kastlan's three
 * `clearable` date fields (the lease components, a meter row, the lease wizard) reach it.
 */
describe("the date field's clear", () => {
  it("moves the focus to the trigger once DatePicker's value is gone", () => {
    function Field() {
      const [value, setValue] = useState("2026-10-31");
      return <DatePicker value={value} onChange={setValue} locale="en-GB" label="Moved in" clearable />;
    }
    render(<Field />);
    const clear = screen.getByRole("button", { name: "Clear" });
    clear.focus();
    fireEvent.click(clear);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    expect(screen.getByRole("combobox", { name: /^Moved in/ })).toHaveFocus();
  });

  it("does the same for DateRangePicker, and in the step row", () => {
    function Fields() {
      const [range, setRange] = useState({ from: "2026-07-01", to: "2027-06-30" });
      const [day, setDay] = useState("2026-10-31");
      return (
        <>
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={(from, to) => setRange({ from, to })}
            locale="en-GB"
            label="Period"
            clearable
          />
          <DatePicker value={day} onChange={setDay} locale="en-GB" label="Booked" clearable step today="2026-10-31" />
        </>
      );
    }
    render(<Fields />);
    const [periodClear, dayClear] = screen.getAllByRole("button", { name: "Clear" });
    periodClear.focus();
    fireEvent.click(periodClear);
    expect(screen.getByRole("combobox", { name: /^Period/ })).toHaveFocus();
    dayClear.focus();
    fireEvent.click(dayClear);
    expect(screen.getByRole("combobox", { name: /^Booked/ })).toHaveFocus();
  });
});
