import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_MONTH_PICKER_LABELS, MonthPicker, type MonthPickerProps } from "../month-picker";
import { FIELD_INVALID } from "../ui";

/**
 * The month picker that replaces keksdose's budget-header popover and kastlan's
 * calendar-header month/year lists. Pinned at a fixed "current month" so nothing here
 * depends on the day the suite runs.
 */
function renderPicker(props: Partial<MonthPickerProps> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <MonthPicker value="2026-08" onChange={onChange} locale="en-GB" currentMonth="2026-09" {...props} />,
  );
  return { ...utils, onChange };
}

const trigger = () => screen.getByRole("combobox");
const open = () => fireEvent.click(trigger());
const cell = (name: string) => screen.getByRole("gridcell", { name });
const focusedMonth = () => (document.activeElement as HTMLElement | null)?.getAttribute("data-month");

describe("MonthPicker trigger", () => {
  it("shows the month in the locale's own words", () => {
    renderPicker({ locale: "de-DE" });
    expect(trigger()).toHaveTextContent("August 2026");
    renderPicker({ locale: "fr-FR", value: "2026-02" });
    expect(screen.getAllByRole("combobox")[1]).toHaveTextContent(/février 2026/i);
  });

  it("takes custom Intl options for its text", () => {
    renderPicker({ formatOptions: { month: "short", year: "2-digit" } });
    expect(trigger()).toHaveTextContent("Aug 26");
  });

  it("shows the placeholder, muted, when there is no value", () => {
    renderPicker({ value: "", placeholder: "Pick a month" });
    expect(screen.getByText("Pick a month")).toHaveClass("text-[var(--text-placeholder)]");
  });

  it("is named by its label AND its value", () => {
    renderPicker({ label: "Budget month" });
    expect(trigger()).toHaveAccessibleName("Budget month August 2026");
  });

  it("paints and announces the invalid state", () => {
    renderPicker({ invalid: true });
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    for (const token of FIELD_INVALID.split(/\s+/)) expect(trigger().className).toContain(token);
  });

  it("does not open when disabled", () => {
    renderPicker({ disabled: true });
    open();
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("passes the caller's attributes to its root", () => {
    renderPicker({ "data-testid": "mp" } as Partial<MonthPickerProps>);
    expect(screen.getByTestId("mp")).toContainElement(trigger());
  });
});

describe("MonthPicker panel", () => {
  it("opens on the value's year, with the value selected and focused", () => {
    renderPicker();
    open();
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: DEFAULT_MONTH_PICKER_LABELS.panel })).toBeInTheDocument();
    expect(screen.getByRole("grid")).toHaveAccessibleName("2026");
    expect(screen.getAllByRole("gridcell")).toHaveLength(12);
    expect(cell("August 2026")).toHaveAttribute("aria-selected", "true");
    expect(cell("August 2026")).toHaveFocus();
    expect(cell("September 2026")).toHaveAttribute("aria-current", "date");
  });

  it("opens on the current month when there is no value", () => {
    renderPicker({ value: "" });
    open();
    expect(cell("September 2026")).toHaveFocus();
  });

  it("picks a month as a YYYY-MM key and closes", () => {
    const { onChange } = renderPicker();
    open();
    fireEvent.click(cell("March 2026"));
    expect(onChange).toHaveBeenCalledWith("2026-03");
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("steps whole years with the arrows, keeping focus on the arrow", () => {
    const { onChange } = renderPicker();
    open();
    const next = screen.getByRole("button", { name: "Next year" });
    fireEvent.click(next);
    expect(screen.getByRole("grid")).toHaveAccessibleName("2027");
    fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous year" }));
    fireEvent.click(cell("January 2025"));
    expect(onChange).toHaveBeenCalledWith("2025-01");
  });

  it("names the month cells in the locale, through the labels prop", () => {
    renderPicker({
      locale: "de-DE",
      labels: { month: (m) => `${m} wählen`, previousYear: "Vorheriges Jahr" },
    });
    open();
    expect(cell("Mai 2026 wählen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vorheriges Jahr" })).toBeInTheDocument();
    // An override of one string leaves the others on their defaults.
    expect(screen.getByRole("button", { name: "Next year" })).toBeInTheDocument();
  });

  it("hands focus back to the trigger after a pick", () => {
    renderPicker();
    open();
    fireEvent.click(cell("March 2026"));
    expect(trigger()).toHaveFocus();
  });

  it("closes on Escape without picking", () => {
    const { onChange } = renderPicker();
    open();
    fireEvent.keyDown(cell("August 2026"), { key: "Escape" });
    expect(screen.queryByRole("grid")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("MonthPicker bounds", () => {
  it("refuses months before min, and reads a full ISO date as its month", () => {
    // keksdose's floor is "the first day we have data for", a YYYY-MM-DD.
    const { onChange } = renderPicker({ min: "2026-03-15" });
    open();
    expect(cell("February 2026")).toHaveAttribute("aria-disabled", "true");
    expect(cell("March 2026")).not.toHaveAttribute("aria-disabled");
    fireEvent.click(cell("February 2026"));
    expect(onChange).not.toHaveBeenCalled();
    // The whole previous year is out, so the arrow toward it is dead.
    expect(screen.getByRole("button", { name: "Previous year" })).toBeDisabled();
  });

  it("refuses months after max and disables the arrow past it", () => {
    renderPicker({ max: "2026-10" });
    open();
    expect(cell("November 2026")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Next year" })).toBeDisabled();
  });

  it("opens inside the bounds when the value is outside them", () => {
    renderPicker({ value: "2020-01", min: "2024-06" });
    open();
    expect(cell("June 2024")).toHaveFocus();
  });
});

describe("MonthPicker keyboard", () => {
  it("keeps exactly one month in the tab order", () => {
    renderPicker();
    open();
    const tabbable = screen.getAllByRole("gridcell").filter((c) => c.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  });

  it("walks by month, by row, and to the row's ends", () => {
    renderPicker();
    open();
    const press = (key: string) => fireEvent.keyDown(document.activeElement!, { key });
    press("ArrowRight");
    expect(focusedMonth()).toBe("2026-09");
    press("ArrowLeft");
    press("ArrowLeft");
    expect(focusedMonth()).toBe("2026-07");
    press("ArrowUp");
    expect(focusedMonth()).toBe("2026-04");
    press("ArrowDown");
    press("ArrowDown");
    expect(focusedMonth()).toBe("2026-10");
    press("Home");
    expect(focusedMonth()).toBe("2026-10");
    press("End");
    expect(focusedMonth()).toBe("2026-12");
  });

  it("crosses into the neighbouring year instead of stopping at the edge", () => {
    renderPicker({ value: "2026-12" });
    open();
    fireEvent.keyDown(cell("December 2026"), { key: "ArrowRight" });
    expect(screen.getByRole("grid")).toHaveAccessibleName("2027");
    expect(focusedMonth()).toBe("2027-01");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    expect(focusedMonth()).toBe("2026-10");
  });

  it("steps a year with PageUp / PageDown", () => {
    renderPicker();
    open();
    fireEvent.keyDown(cell("August 2026"), { key: "PageDown" });
    expect(focusedMonth()).toBe("2027-08");
    fireEvent.keyDown(document.activeElement!, { key: "PageUp" });
    fireEvent.keyDown(document.activeElement!, { key: "PageUp" });
    expect(focusedMonth()).toBe("2025-08");
  });

  it("reverses left and right in a right-to-left page", () => {
    // On <html>, where a host sets it: the panel is portalled to <body>, so a `dir`
    // on some wrapper around the FIELD is not an ancestor of the grid.
    document.documentElement.setAttribute("dir", "rtl");
    try {
      renderPicker();
      open();
      fireEvent.keyDown(cell("August 2026"), { key: "ArrowLeft" });
      expect(focusedMonth()).toBe("2026-09");
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  it("commits the focused month with Enter, as a button does", () => {
    // A native <button> turns Enter into a click; jsdom does not, so the click is
    // what is asserted to be wired — the key → click step is the browser's.
    const { onChange } = renderPicker();
    open();
    fireEvent.keyDown(cell("August 2026"), { key: "ArrowRight" });
    fireEvent.click(document.activeElement!);
    expect(onChange).toHaveBeenCalledWith("2026-09");
  });
});

describe("MonthPicker as a controlled field", () => {
  it("reopens on a value moved from outside", () => {
    function Host() {
      const [month, setMonth] = useState("2026-08");
      return (
        <>
          <button type="button" onClick={() => setMonth("2031-02")}>
            jump
          </button>
          <MonthPicker value={month} onChange={setMonth} locale="en-GB" currentMonth="2026-09" />
        </>
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByText("jump"));
    open();
    expect(screen.getByRole("grid")).toHaveAccessibleName("2031");
    expect(cell("February 2031")).toHaveFocus();
  });
});
