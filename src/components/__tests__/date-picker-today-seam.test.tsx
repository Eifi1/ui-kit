import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DatePicker } from "../date-picker";
import { MonthPicker } from "../month-picker";
import { setToday } from "../../lib/dates";

/**
 * The pickers' own "today" is the kit's (0.55, keksdose's 0.51 adoption N2): a day the dev
 * clock moved with `setToday` is the one the calendar marks and opens on, and the month
 * grid's this month — not the device's. The device is pinned to 4 November 2026.
 */

const LOCALE = "en-GB";
const noop = () => {};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 4, 10, 30));
});
afterEach(() => {
  setToday(null);
  vi.useRealTimers();
  Reflect.deleteProperty(window, "matchMedia");
});

const todayCell = () => document.querySelector<HTMLElement>('[role="gridcell"][aria-current="date"]');
const openPicker = () => fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));

describe("DatePicker's today", () => {
  it("is the device's day with nothing moved", () => {
    render(<DatePicker value="" onChange={noop} locale={LOCALE} label="Due date" />);
    openPicker();
    expect(todayCell()?.dataset.iso).toBe("2026-11-04");
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
  });

  it("follows setToday: the calendar opens on the moved day and marks it", () => {
    setToday("2026-10-31");
    render(<DatePicker value="" onChange={noop} locale={LOCALE} label="Due date" />);
    openPicker();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(todayCell()?.dataset.iso).toBe("2026-10-31");
    expect(todayCell()).toHaveFocus();
  });

  it("marks the moved day, not the device's, in a month that shows both", () => {
    setToday("2026-11-20");
    render(<DatePicker value="2026-11-02" onChange={noop} locale={LOCALE} label="Due date" />);
    openPicker();
    expect(todayCell()?.dataset.iso).toBe("2026-11-20");
    expect(document.querySelector('[data-iso="2026-11-04"]')).not.toHaveAttribute("aria-current");
    // It opens on the value, as ever.
    expect(document.querySelector('[data-iso="2026-11-02"]')).toHaveFocus();
  });

  it("the month grid's this month follows it (monthJump)", () => {
    setToday("2026-08-15");
    render(<DatePicker value="2026-10-03" onChange={noop} locale={LOCALE} label="Due date" monthJump />);
    openPicker();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { expanded: false }));
    const grid = screen.getByRole("grid", { name: "2026" });
    expect(within(grid).getByRole("gridcell", { name: "August 2026" })).toHaveAttribute("aria-current", "date");
    expect(within(grid).getByRole("gridcell", { name: "November 2026" })).not.toHaveAttribute("aria-current");
  });
});

describe("MonthPicker's this month", () => {
  it("follows setToday", () => {
    setToday("2026-08-15");
    render(<MonthPicker value="" onChange={noop} locale={LOCALE} label="Month" />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Month/ }));
    expect(screen.getByRole("gridcell", { name: "August 2026" })).toHaveAttribute("aria-current", "date");
  });
});
