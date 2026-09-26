import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MiniCalendar, type MiniCalendarDayState } from "../mini-calendar";
import { parseIsoDate } from "../../lib/dates";

/**
 * `MiniCalendar` as a MONTH VIEW: `renderDay` content and the `size="lg"` ruled grid a
 * planner page used to hand-build (kastlan's calendar page), plus the followed
 * `month` / `onMonthChange` pair such a page's own header drives.
 */

const LOCALE = "en-GB";
const FULL_DATE = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;
const dayName = (iso: string) => parseIsoDate(iso)!.toLocaleDateString(LOCALE, FULL_DATE);
const day = (iso: string) => screen.getByRole("gridcell", { name: dayName(iso) });
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, bubbles: true, ...init });
const noop = () => {};

const EVENTS: Record<string, string[]> = {
  "2026-09-14": ["Rent due", "Plumber"],
  "2026-09-30": ["Lease ends"],
};
const events = (_: Date, s: MiniCalendarDayState) =>
  EVENTS[s.iso]?.map((e) => <span key={e}>{e}</span>) ?? null;

describe("MiniCalendar renderDay", () => {
  it("draws the content inside the day's button, and leaves empty days alone", () => {
    render(
      <MiniCalendar size="lg" mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} onSelect={noop} renderDay={events} />,
    );
    const cell = day("2026-09-14");
    expect(cell.tagName).toBe("BUTTON");
    expect(cell).toHaveTextContent("14");
    expect(cell).toHaveTextContent("Rent due");
    expect(cell).toHaveTextContent("Plumber");
    expect(day("2026-09-15")).not.toHaveAttribute("aria-describedby");
  });

  it("keeps the date as the name and makes the content its description", () => {
    render(
      <MiniCalendar size="lg" mode="single" locale={LOCALE} month="2026-09" onSelect={noop} renderDay={events} />,
    );
    // Named by the whole date still — `aria-label` would otherwise be all a screen
    // reader hears, and the events inside would be lost.
    const cell = day("2026-09-14");
    const described = document.getElementById(cell.getAttribute("aria-describedby")!);
    expect(described).toHaveTextContent("Rent duePlumber");
    expect(cell).toContainElement(described);
  });

  it("tells renderDay the day's state", () => {
    const seen = new Map<string, MiniCalendarDayState>();
    render(
      <MiniCalendar
        from="2026-09-10"
        to="2026-09-12"
        min="2026-09-02"
        locale={LOCALE}
        onSelect={noop}
        renderDay={(_, s) => {
          seen.set(s.iso, s);
          return null;
        }}
      />,
    );
    expect(seen.size).toBe(30);
    expect(seen.get("2026-09-10")).toMatchObject({ rangeStart: true, selected: true, inRange: false, size: "sm", label: "10", active: true });
    expect(seen.get("2026-09-11")).toMatchObject({ inRange: true, selected: true });
    expect(seen.get("2026-09-12")).toMatchObject({ rangeEnd: true, active: false });
    expect(seen.get("2026-09-01")).toMatchObject({ disabled: true, selected: false });
  });

  it("puts sm content under the number without changing the name", () => {
    render(
      <MiniCalendar
        mode="single"
        from="2026-09-14"
        to="2026-09-14"
        locale={LOCALE}
        onSelect={noop}
        renderDay={(_, s) => (s.iso === "2026-09-14" ? <span data-testid="dot" aria-hidden /> : null)}
      />,
    );
    expect(day("2026-09-14")).toContainElement(screen.getByTestId("dot"));
  });

  it("selects the DAY on a click, the way clickable events are reached", () => {
    const onSelect = vi.fn();
    render(<MiniCalendar size="lg" mode="single" locale={LOCALE} month="2026-09" onSelect={onSelect} renderDay={events} />);
    fireEvent.click(screen.getByText("Plumber"));
    expect(onSelect).toHaveBeenCalledWith("2026-09-14", "2026-09-14");
  });
});

describe("MiniCalendar size=lg", () => {
  it("is the same grid: one tab stop, full-date names, blanks as cells", () => {
    render(<MiniCalendar size="lg" mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} weekStartsOn={1} onSelect={noop} />);
    expect(screen.getByRole("grid", { name: "September 2026" })).toBeTruthy();
    const cells = screen.getAllByRole("gridcell");
    // 1 September 2026 is a Tuesday: one blank before it, 30 days, 4 blanks after.
    expect(cells).toHaveLength(35);
    expect(cells.filter((c) => c.getAttribute("tabindex") === "0")).toEqual([day("2026-09-14")]);
    // Short weekday names in the header, the long one as each column's name.
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-label", "Monday");
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Mon");
  });

  it("walks by day and week, mirrored in RTL", () => {
    render(
      <div dir="rtl">
        <MiniCalendar size="lg" mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} onSelect={noop} />
      </div>,
    );
    day("2026-09-14").focus();
    press("ArrowLeft");
    expect(document.activeElement).toBe(day("2026-09-15"));
    press("ArrowDown");
    expect(document.activeElement).toBe(day("2026-09-22"));
  });

  it("keeps the week start", () => {
    render(<MiniCalendar size="lg" mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} weekStartsOn={0} onSelect={noop} />);
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-label", "Sunday");
  });
});

describe("MiniCalendar month / onMonthChange / hideNavigation", () => {
  it("opens on `month`, and follows it when it changes", () => {
    const { rerender } = render(<MiniCalendar mode="single" locale={LOCALE} month="2026-02" onSelect={noop} />);
    expect(screen.getByRole("grid", { name: "February 2026" })).toBeTruthy();
    rerender(<MiniCalendar mode="single" locale={LOCALE} month="2026-05" onSelect={noop} />);
    expect(screen.getByRole("grid", { name: "May 2026" })).toBeTruthy();
  });

  it("reports the user's month moves", () => {
    const onMonthChange = vi.fn();
    render(
      <MiniCalendar mode="single" from="2026-09-30" to="2026-09-30" locale={LOCALE} onSelect={noop} onMonthChange={onMonthChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(onMonthChange).toHaveBeenLastCalledWith("2026-10");
    day("2026-10-30").focus();
    press("PageUp");
    expect(onMonthChange).toHaveBeenLastCalledWith("2026-09");
    // A move within the month says nothing.
    onMonthChange.mockClear();
    press("ArrowLeft");
    expect(onMonthChange).not.toHaveBeenCalled();
  });

  it("drops the arrows but keeps the grid's name", () => {
    render(<MiniCalendar mode="single" locale={LOCALE} month="2026-09" hideNavigation onSelect={noop} />);
    expect(screen.queryByRole("button", { name: "Next month" })).toBeNull();
    expect(screen.getByRole("grid", { name: "September 2026" })).toBeTruthy();
  });

  it("still works with no selection at all", () => {
    const onSelect = vi.fn();
    render(<MiniCalendar mode="single" locale={LOCALE} month="2026-09" onSelect={onSelect} />);
    fireEvent.click(day("2026-09-03"));
    expect(onSelect).toHaveBeenCalledWith("2026-09-03", "2026-09-03");
  });
});
