import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MiniCalendar } from "../mini-calendar";
import { parseIsoDate } from "../../lib/dates";

/**
 * The audit's §a11y, `mini-calendar.tsx:140`: *"MiniCalendar is unusable with a
 * keyboard or screen reader"*.
 *
 * It was 42 plain buttons in a `grid-cols-7` div. Three things follow from that, and
 * all three are what this file holds:
 *
 *   - **Every day was a tab stop.** Reaching the control after a date field meant 31
 *     presses of Tab, and reaching next month meant none at all — the month arrows
 *     were the only way there and the grid had no key handling whatsoever.
 *   - **A cell said "14".** Not which month, not which year, not which weekday. A
 *     screen-reader user arrowing (had they been able to) could not tell September's
 *     14th from October's, and the number alone is exactly what a sighted user reads
 *     the CAPTION to disambiguate.
 *   - **Nothing was selected, bounded or current** in the accessibility tree. The
 *     start, the end, the days between them, the days outside `min`/`max` and today
 *     were all colour, and colour is not an API.
 *
 * The pattern being implemented is APG's date grid, which is also what decides the
 * key map below: arrows by day, up/down by week, Page by month, Home/End to the ends
 * of the week — and a move off the edge of the month brings the next month with it
 * rather than stopping.
 */

const LOCALE = "en-GB";
const FULL_DATE = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;

/** What a day cell must be CALLED: the whole date, in the calendar's own locale. */
const dayName = (iso: string) => parseIsoDate(iso)!.toLocaleDateString(LOCALE, FULL_DATE);
const day = (iso: string) => screen.getByRole("gridcell", { name: dayName(iso) });
const grid = () => screen.getByRole("grid");
const press = (key: string, init: Partial<KeyboardEventInit> = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, { key, bubbles: true, ...init });

const noop = () => {};

afterEach(() => {
  vi.useRealTimers();
});

describe("MiniCalendar is a date grid", () => {
  it("names the grid after the month on show", () => {
    render(<MiniCalendar mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} onSelect={noop} />);
    // Named BY the caption element, so the name is the same localized string the
    // sighted user reads and there is no second copy to translate.
    expect(screen.getByRole("grid", { name: "September 2026" })).toBeTruthy();
  });

  it("puts exactly one day in the tab order, and puts it on the selected date", () => {
    render(<MiniCalendar mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} onSelect={noop} />);
    const tabbable = screen.getAllByRole("gridcell").filter((c) => c.getAttribute("tabindex") === "0");
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(day("2026-09-14"));
    // The other 29 are reachable, but by the arrow keys — not by 29 more presses of Tab.
    const roving = screen.getAllByRole("gridcell").filter((c) => c.getAttribute("tabindex") === "-1");
    expect(roving.length).toBe(29);
  });

  it("opens on today when nothing is selected", () => {
    // `toFake: ["Date"]` — the clock, not the timers: the live region below schedules
    // a real one, and React's scheduler wants the others left alone.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 14, 9, 30));
    render(<MiniCalendar mode="single" from="" to="" locale={LOCALE} onSelect={noop} />);
    const tabbable = screen.getAllByRole("gridcell").filter((c) => c.getAttribute("tabindex") === "0");
    expect(tabbable[0]).toBe(day("2026-09-14"));
    expect(day("2026-09-14")).toHaveAttribute("aria-current", "date");
    // and only that one is today
    expect(screen.getAllByRole("gridcell").filter((c) => c.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("names each day with the whole date rather than its number", () => {
    render(<MiniCalendar mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} onSelect={noop} />);
    // The number is still what is DRAWN…
    expect(day("2026-09-14")).toHaveTextContent("14");
    // …and "14" is not what it is called.
    expect(screen.queryByRole("gridcell", { name: "14" })).toBeNull();
    // The weekday is in there too: picking a date is very often picking a weekday.
    expect(day("2026-09-14")).toHaveAccessibleName("Monday, 14 September 2026");
  });

  it("formats that name from the locale it was given", () => {
    render(<MiniCalendar mode="single" from="2026-09-14" to="2026-09-14" locale="de-DE" onSelect={noop} />);
    expect(screen.getByRole("gridcell", { name: "Montag, 14. September 2026" })).toBeTruthy();
  });

  it("lets the host name a day itself, like every other string here", () => {
    render(
      <MiniCalendar
        mode="single"
        from="2026-09-14"
        to="2026-09-14"
        locale={LOCALE}
        onSelect={noop}
        labels={{ day: (date) => `Choose ${date}` }}
      />,
    );
    expect(screen.getByRole("gridcell", { name: "Choose Monday, 14 September 2026" })).toBeTruthy();
  });
});

describe("walking the month with the keyboard", () => {
  const openOn = (iso: string) => {
    render(<MiniCalendar mode="single" from={iso} to={iso} locale={LOCALE} onSelect={noop} />);
    day(iso).focus();
    expect(day(iso)).toHaveFocus();
  };

  it("moves a day with Left/Right and a week with Up/Down", () => {
    openOn("2026-09-14");
    press("ArrowRight");
    expect(day("2026-09-15")).toHaveFocus();
    press("ArrowLeft");
    expect(day("2026-09-14")).toHaveFocus();
    press("ArrowDown");
    expect(day("2026-09-21")).toHaveFocus();
    press("ArrowUp");
    expect(day("2026-09-14")).toHaveFocus();
  });

  it("goes to the ends of the week with Home and End", () => {
    openOn("2026-09-16"); // a Wednesday
    press("Home");
    expect(day("2026-09-14")).toHaveFocus(); // Monday — the grid is Monday-first
    press("End");
    expect(day("2026-09-20")).toHaveFocus(); // Sunday
  });

  it("carries the visible month with it over the boundary", () => {
    openOn("2026-09-01");
    press("ArrowLeft");
    // The 31st of August cannot be focused in a September grid, so the grid moved.
    expect(screen.getByRole("grid", { name: "August 2026" })).toBeTruthy();
    expect(day("2026-08-31")).toHaveFocus();
    // …and the roving tab stop went with the focus, or the next Tab into this
    // calendar would land on a day that is no longer on screen.
    expect(day("2026-08-31")).toHaveAttribute("tabindex", "0");
  });

  it("pages by month with PageUp/PageDown and by year with Shift", () => {
    openOn("2026-09-14");
    press("PageDown");
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeTruthy();
    expect(day("2026-10-14")).toHaveFocus();
    press("PageUp");
    expect(day("2026-09-14")).toHaveFocus();
    press("PageUp", { shiftKey: true });
    expect(day("2025-09-14")).toHaveFocus();
    press("PageDown", { shiftKey: true });
    expect(day("2026-09-14")).toHaveFocus();
  });

  it("lands on a day the short month has when paging off the 31st", () => {
    // `setMonth` alone rolls over: 31 January + 1 month is 3 March, which skips
    // February for anyone holding PageDown.
    openOn("2026-01-31");
    press("PageDown");
    expect(screen.getByRole("grid", { name: "February 2026" })).toBeTruthy();
    expect(day("2026-02-28")).toHaveFocus();
  });

  it("does not let the arrows scroll the panel it sits in", () => {
    openOn("2026-09-14");
    const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("what the grid says about each day", () => {
  it("marks both ends of a range and every day between them as selected", () => {
    render(<MiniCalendar from="2026-09-10" to="2026-09-12" locale={LOCALE} onSelect={noop} />);
    for (const iso of ["2026-09-10", "2026-09-11", "2026-09-12"]) {
      expect(day(iso)).toHaveAttribute("aria-selected", "true");
    }
    expect(day("2026-09-13")).toHaveAttribute("aria-selected", "false");
    expect(day("2026-09-09")).toHaveAttribute("aria-selected", "false");
  });

  it("marks out-of-range days disabled, keeps them readable, and refuses the click", () => {
    const onSelect = vi.fn();
    render(
      <MiniCalendar
        mode="single"
        from="2026-09-14"
        to="2026-09-14"
        min="2026-09-10"
        max="2026-09-20"
        locale={LOCALE}
        onSelect={onSelect}
      />,
    );
    const outside = day("2026-09-09");
    expect(outside).toHaveAttribute("aria-disabled", "true");
    // aria-disabled, NOT disabled: a `disabled` button cannot be focused, and a
    // roving tabindex that steps onto one would strand the keyboard in a hole.
    expect(outside).not.toBeDisabled();
    outside.focus();
    expect(outside).toHaveFocus();
    fireEvent.click(outside);
    expect(onSelect).not.toHaveBeenCalled();
    // The days inside the bounds still work.
    fireEvent.click(day("2026-09-11"));
    expect(onSelect).toHaveBeenCalledWith("2026-09-11", "2026-09-11");
  });
});

describe("range mode says which end the next click sets", () => {
  const hint = () => {
    const id = grid().getAttribute("aria-describedby");
    return id ? document.getElementById(id)?.textContent : null;
  };

  it("describes the grid with the end it is waiting for", () => {
    const { rerender } = render(<MiniCalendar from="" to="" locale={LOCALE} onSelect={noop} />);
    expect(hint()).toBe("Choose a start date");
    rerender(<MiniCalendar from="2026-09-10" to="" locale={LOCALE} onSelect={noop} />);
    expect(hint()).toBe("Choose an end date");
    // A complete range is not a third state: the next click starts a new one.
    rerender(<MiniCalendar from="2026-09-10" to="2026-09-12" locale={LOCALE} onSelect={noop} />);
    expect(hint()).toBe("Choose a start date");
  });

  it("announces it, because a click moves no focus to carry the news", async () => {
    const { rerender } = render(<MiniCalendar from="" to="" locale={LOCALE} onSelect={noop} />);
    fireEvent.click(day("2026-09-10"));
    rerender(<MiniCalendar from="2026-09-10" to="" locale={LOCALE} onSelect={noop} />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Thursday, 10 September 2026 selected as the start. Choose an end date.",
      ),
    );
    fireEvent.click(day("2026-09-12"));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Thursday, 10 September 2026 to Saturday, 12 September 2026 selected.",
      ),
    );
  });

  it("speaks the host's words, not these", () => {
    render(
      <MiniCalendar
        from="2026-09-10"
        to=""
        locale={LOCALE}
        onSelect={noop}
        labels={{ chooseEnd: "Bis wann?" }}
      />,
    );
    expect(hint()).toBe("Bis wann?");
  });

  it("keeps the grid on the month the end was picked in", () => {
    // Following `from` unconditionally sent the grid back to the start's month after
    // the second click, which with a roving tabindex unmounts the cell the user is
    // standing on and drops their focus to <body>.
    const { rerender } = render(<MiniCalendar from="2026-09-28" to="" locale={LOCALE} onSelect={noop} />);
    rerender(<MiniCalendar from="2026-09-28" to="2026-10-02" locale={LOCALE} onSelect={noop} />);
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeTruthy();
    expect(day("2026-10-02")).toHaveAttribute("tabindex", "0");
  });
});

describe("MiniCalendar in RTL (0.7.0)", () => {
  const renderRtl = () =>
    render(
      <div dir="rtl">
        <MiniCalendar mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} onSelect={noop} />
      </div>,
    );

  it("walks the days along the reading direction: ArrowLeft is the NEXT day", async () => {
    renderRtl();
    day("2026-09-14").focus();
    press("ArrowLeft");
    await waitFor(() => expect(day("2026-09-15")).toHaveFocus());
    press("ArrowRight");
    await waitFor(() => expect(day("2026-09-14")).toHaveFocus());
    press("ArrowRight");
    await waitFor(() => expect(day("2026-09-13")).toHaveFocus());
  });

  it("keeps ↑/↓ as the week step", async () => {
    renderRtl();
    day("2026-09-14").focus();
    press("ArrowDown");
    await waitFor(() => expect(day("2026-09-21")).toHaveFocus());
  });

  it("still walks LTR the usual way", async () => {
    render(<MiniCalendar mode="single" from="2026-09-14" to="2026-09-14" locale={LOCALE} onSelect={noop} />);
    day("2026-09-14").focus();
    press("ArrowRight");
    await waitFor(() => expect(day("2026-09-15")).toHaveFocus());
  });

  it("mirrors the month chevrons", () => {
    renderRtl();
    const prev = screen.getByRole("button", { name: "Previous month" });
    const next = screen.getByRole("button", { name: "Next month" });
    expect(prev.querySelector("svg")!.getAttribute("class")).toContain("rtl:-scale-x-100");
    expect(next.querySelector("svg")!.getAttribute("class")).toContain("rtl:-scale-x-100");
  });
});
