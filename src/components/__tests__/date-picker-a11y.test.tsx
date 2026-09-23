import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DatePicker, DateRangePicker } from "../date-picker";
import { parseIsoDate } from "../../lib/dates";

/**
 * The picker half of the audit's §a11y finding on the calendar: a grid you can only
 * reach with a mouse is no better than one you cannot use once you are in it.
 *
 * Two defects, both of them invisible to a sighted user:
 *
 *   - **The trigger said the wrong thing.** `aria-label={label}` REPLACES a button's
 *     text, so the one field on the form whose whole job is to show a date announced
 *     "Due date" and stopped. There was no way to read back what was picked short of
 *     opening the calendar and hunting for the highlighted day.
 *   - **Opening it went nowhere.** `Popover` portals its panel to the end of `<body>`
 *     and moves no focus, so the calendar opened behind the user: their focus stayed
 *     on the trigger, and the days were somewhere past the end of the document.
 *
 * (Containment — what Tab does once you are inside the panel — belongs to `Popover`
 * itself, `popover.tsx:46` in the same audit, and is not what this file holds.)
 */

const LOCALE = "en-GB";
const FULL_DATE = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;
const dayName = (iso: string) => parseIsoDate(iso)!.toLocaleDateString(LOCALE, FULL_DATE);
const day = (iso: string) => screen.getByRole("gridcell", { name: dayName(iso) });
const noop = () => {};

afterEach(() => {
  vi.useRealTimers();
});

describe("the date trigger says what it holds", () => {
  it("names itself with the label AND the value", () => {
    render(<DatePicker value="2026-09-06" onChange={noop} locale={LOCALE} label="Due date" />);
    expect(screen.getByRole("combobox", { name: "Due date 06/09/2026" })).toBeTruthy();
    // The name that used to be the whole of it — the field, never its answer.
    expect(screen.queryByRole("button", { name: "Due date" })).toBeNull();
  });

  it("names an unlabelled trigger by its value alone", () => {
    render(<DatePicker value="2026-09-06" onChange={noop} locale={LOCALE} />);
    expect(screen.getByRole("combobox", { name: "06/09/2026" })).toBeTruthy();
  });

  it("reads the host's own formatting, whatever that is", () => {
    render(
      <DatePicker
        value="2026-09-06"
        onChange={noop}
        locale={LOCALE}
        label="Due date"
        formatValue={(iso) => `host:${iso}`}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Due date host:2026-09-06" })).toBeTruthy();
  });

  it("reports both ends of a range", () => {
    render(
      <DateRangePicker from="2026-09-10" to="2026-09-12" onChange={noop} locale={LOCALE} label="Period" />,
    );
    expect(screen.getByRole("combobox", { name: "Period 10/09/2026 – 12/09/2026" })).toBeTruthy();
  });

  it("says whether the calendar is open", () => {
    render(<DatePicker value="2026-09-06" onChange={noop} locale={LOCALE} label="Due date" />);
    const trigger = screen.getByRole("combobox", { name: /^Due date/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

describe("opening the calendar takes the keyboard with it", () => {
  it("lands on the day being edited", () => {
    render(<DatePicker value="2026-09-06" onChange={noop} locale={LOCALE} label="Due date" />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    expect(day("2026-09-06")).toHaveFocus();
  });

  it("lands on today when the field is empty", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 14, 9, 30));
    render(<DatePicker value="" onChange={noop} locale={LOCALE} label="Due date" />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    expect(day("2026-09-14")).toHaveFocus();
  });

  it("lands on the start of a range", () => {
    render(
      <DateRangePicker from="2026-09-10" to="2026-09-12" onChange={noop} locale={LOCALE} label="Period" />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /^Period/ }));
    expect(day("2026-09-10")).toHaveFocus();
  });

  it("gives focus back to the trigger when the panel closes", () => {
    render(<DatePicker value="2026-09-06" onChange={noop} locale={LOCALE} label="Due date" />);
    const trigger = screen.getByRole("combobox", { name: /^Due date/ });
    trigger.focus();
    fireEvent.click(trigger);
    expect(day("2026-09-06")).toHaveFocus();
    // Escape is Popover's dismissal; the day the user was standing on unmounts with
    // the panel, which drops focus to <body> — i.e. back to the top of the document.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("grid")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("gives it back when a picked date closes the panel too", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-09-06" onChange={onChange} locale={LOCALE} label="Due date" />);
    const trigger = screen.getByRole("combobox", { name: /^Due date/ });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(day("2026-09-08"));
    expect(onChange).toHaveBeenCalledWith("2026-09-08");
    expect(trigger).toHaveFocus();
  });

  it("leaves focus alone when the panel was dismissed by going somewhere else", () => {
    render(
      <>
        <DatePicker value="2026-09-06" onChange={noop} locale={LOCALE} label="Due date" />
        <button type="button">Elsewhere</button>
      </>,
    );
    const trigger = screen.getByRole("combobox", { name: /^Due date/ });
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    trigger.focus();
    fireEvent.click(trigger);
    // What a real outside click does, in the order a browser does it: the press
    // dismisses the panel, and the click focuses what it landed on.
    fireEvent.pointerDown(elsewhere);
    elsewhere.focus();
    expect(elsewhere).toHaveFocus();
  });
});
