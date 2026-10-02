import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { DatePicker, DateRangePicker } from "../date-picker";
import { Form } from "../../rhf/form";
import { RhfDateRangePicker } from "../../rhf/fields";
import type { DateRangePickerPreset, DateRangePickerProps } from "../date-picker";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * `monthJump` (0.23, kastlan): the panel's caption opens a month grid with year steps,
 * so a July-to-June service-charge period is a handful of clicks instead of eleven
 * month arrows. Today is pinned to 3 October 2026.
 */

const LOCALE = "en-GB";
const noop = () => {};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 3, 9, 0));
});
afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, "matchMedia");
});

const day = (iso: string) => document.querySelector<HTMLElement>(`[data-iso="${iso}"]`)!;
const panel = () => screen.getByRole("dialog");
const caption = () => within(panel()).getByRole("button", { expanded: false });
const openCaption = () => within(panel()).getByRole("button", { expanded: true });
const monthCell = (name: string) => within(screen.getByRole("grid")).getByRole("gridcell", { name });

function Range(props: Partial<DateRangePickerProps> & { onCommit?: DateRangePickerProps["onChange"] }) {
  const { onCommit, ...rest } = props;
  const [range, setRange] = useState({ from: "", to: "" });
  return (
    <DateRangePicker
      label="Service-charge period"
      locale={LOCALE}
      monthJump
      {...rest}
      from={range.from}
      to={range.to}
      onChange={(from, to, id) => {
        setRange({ from, to });
        // As the picker calls it: two arguments unless a preset made the range.
        if (id === undefined) onCommit?.(from, to);
        else onCommit?.(from, to, id);
      }}
    />
  );
}

describe("without monthJump", () => {
  it("the caption stays text, as before", () => {
    render(<DatePicker value="2026-10-03" onChange={noop} locale={LOCALE} label="Due date" />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    expect(within(panel()).getByText("October 2026").closest("button")).toBeNull();
    expect(within(panel()).queryByRole("button", { expanded: false })).toBeNull();
  });
});

describe("DatePicker monthJump", () => {
  it("the caption is a described disclosure button that opens the months, focused on the month on show", () => {
    render(<DatePicker value="2026-10-03" onChange={noop} locale={LOCALE} label="Due date" monthJump />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    // The days open as they always did, on the value.
    expect(day("2026-10-03")).toHaveFocus();
    const button = caption();
    expect(button).toHaveAccessibleName("October 2026");
    expect(button).toHaveAccessibleDescription("Choose a month");
    expect(within(button).getByText("October 2026")).toHaveAttribute("aria-live", "polite");

    fireEvent.click(button);
    const grid = screen.getByRole("grid", { name: "2026" });
    expect(within(grid).getAllByRole("gridcell")).toHaveLength(12);
    expect(within(grid).getAllByRole("row")).toHaveLength(4);
    expect(monthCell("October 2026")).toHaveFocus();
    expect(monthCell("October 2026")).toHaveAttribute("aria-selected", "true");
    expect(monthCell("October 2026")).toHaveAttribute("aria-current", "date");
    expect(monthCell("July 2026")).toHaveAttribute("tabindex", "-1");
    // The same button, now expanded and showing the year it steps.
    expect(openCaption()).toHaveAccessibleName("2026");
    // The arrows now step a year.
    expect(within(panel()).getByRole("button", { name: "Previous year" })).toBeInTheDocument();
    expect(within(panel()).getByRole("button", { name: "Next year" })).toBeInTheDocument();
  });

  it("picking a month returns to its days, focus on the 1st; a day then commits", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-10-03" onChange={onChange} locale={LOCALE} label="Due date" monthJump />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    fireEvent.click(caption());
    fireEvent.click(monthCell("July 2026"));
    expect(screen.getByRole("grid", { name: "July 2026" })).toBeInTheDocument();
    expect(caption()).toHaveAccessibleName("July 2026");
    expect(day("2026-07-01")).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(day("2026-07-15"));
    expect(onChange).toHaveBeenCalledWith("2026-07-15");
  });

  it("year steps, the keyboard, and Escape back to the days without closing", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-10-03" onChange={onChange} locale={LOCALE} label="Due date" monthJump />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    fireEvent.click(caption());

    const next = within(panel()).getByRole("button", { name: "Next year" });
    fireEvent.click(next);
    expect(screen.getByRole("grid", { name: "2027" })).toBeInTheDocument();
    expect(monthCell("October 2027")).toHaveAttribute("tabindex", "0");

    // Arrows walk the months, across the year's edge; PageUp is a year.
    monthCell("October 2027").focus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(screen.getByRole("grid", { name: "2028" })).toBeInTheDocument();
    expect(monthCell("January 2028")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(monthCell("February 2028")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "PageUp" });
    expect(monthCell("February 2027")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(monthCell("March 2027")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(monthCell("January 2027")).toHaveFocus();

    // Escape steps back, not out: the panel stays, the days are back, focus on the caption.
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(caption()).toHaveFocus();
    // …and the next Escape, in the days, closes the panel as it always did.
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("right-to-left: the panel carries the field's dir, and ArrowLeft is the next month", () => {
    render(
      <div dir="rtl">
        <DatePicker value="2026-10-03" onChange={noop} locale={LOCALE} label="Due date" monthJump />
      </div>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    expect(panel()).toHaveAttribute("dir", "rtl");
    fireEvent.click(caption());
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(monthCell("November 2026")).toHaveFocus();
  });

  it("the caption again, in the month grid, goes back to the days without moving", () => {
    render(<DatePicker value="2026-10-03" onChange={noop} locale={LOCALE} label="Due date" monthJump />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    fireEvent.click(caption());
    fireEvent.click(within(panel()).getByRole("button", { name: "Next year" }));
    fireEvent.click(openCaption());
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
  });

  it("the month arrows and the day grid's PageDown keep the caption in step", () => {
    render(<DatePicker value="2026-10-03" onChange={noop} locale={LOCALE} label="Due date" monthJump />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    fireEvent.click(within(panel()).getByRole("button", { name: "Next month" }));
    expect(caption()).toHaveAccessibleName("November 2026");
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Previous month" }));
    fireEvent.click(within(panel()).getByRole("button", { name: "Previous month" }));
    expect(caption()).toHaveAccessibleName("September 2026");
    day("2026-09-03").focus();
    fireEvent.keyDown(day("2026-09-03"), { key: "PageDown", shiftKey: true });
    expect(caption()).toHaveAccessibleName("September 2027");
    expect(day("2026-09-03")).toBeNull();
    // And an arrow after a keyboard move steps from where the grid IS.
    fireEvent.click(within(panel()).getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("grid", { name: "October 2027" })).toBeInTheDocument();
  });

  it("min / max: months outside refuse, a year arrow dies with its year", () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        value=""
        onChange={onChange}
        locale={LOCALE}
        label="Due date"
        monthJump
        min="2026-03-15"
        max="2027-02-10"
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /^Due date/ }));
    fireEvent.click(caption());
    const prev = within(panel()).getByRole("button", { name: "Previous year" });
    const next = within(panel()).getByRole("button", { name: "Next year" });
    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(next).not.toHaveAttribute("aria-disabled");
    expect(monthCell("February 2026")).toHaveAttribute("aria-disabled", "true");
    expect(monthCell("March 2026")).not.toHaveAttribute("aria-disabled");
    fireEvent.click(prev);
    expect(screen.getByRole("grid", { name: "2026" })).toBeInTheDocument();
    // A refused month leaves the grid where it is.
    fireEvent.click(monthCell("February 2026"));
    expect(screen.getByRole("grid", { name: "2026" })).toBeInTheDocument();
    fireEvent.click(next);
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(monthCell("March 2027")).toHaveAttribute("aria-disabled", "true");
    // A month cut by a bound opens on its first selectable day.
    fireEvent.click(prev);
    fireEvent.click(monthCell("March 2026"));
    expect(day("2026-03-15")).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reads the provider's monthPicker and miniCalendar words, and Intl's names", () => {
    render(
      <UiKitProvider
        locale="de-DE"
        labels={{
          miniCalendar: { nextMonth: "Nächster Monat" },
          monthPicker: { nextYear: "Nächstes Jahr", panel: "Monat wählen" },
        }}
      >
        <DatePicker value="2026-07-03" onChange={noop} label="Fällig" monthJump />
      </UiKitProvider>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /^Fällig/ }));
    expect(within(panel()).getByRole("button", { name: "Nächster Monat" })).toBeInTheDocument();
    expect(caption()).toHaveAccessibleName("Juli 2026");
    expect(caption()).toHaveAccessibleDescription("Monat wählen");
    fireEvent.click(caption());
    expect(within(panel()).getByRole("button", { name: "Nächstes Jahr" })).toBeInTheDocument();
    expect(monthCell("März 2026")).toHaveTextContent("Mär");
  });

  it("keeps the 0.22 anatomy: hint, error and the step row", () => {
    render(
      <DatePicker
        value="2026-10-03"
        onChange={noop}
        locale={LOCALE}
        label="Due date"
        monthJump
        step
        hint="Business days only"
        error="Before the invoice date"
      />,
    );
    const trigger = screen.getByRole("combobox", { name: /^Due date/ });
    expect(trigger).toHaveAccessibleDescription("Business days only Before the invoice date");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    // `monthJump` is the panel's, never an attribute on the field.
    expect(document.querySelector("[monthjump]")).toBeNull();
    fireEvent.click(trigger);
    expect(caption()).toHaveAccessibleName("October 2026");
  });
});

describe("DateRangePicker monthJump (kastlan's July–June period)", () => {
  it("a whole service-charge period in eight clicks", () => {
    const onCommit = vi.fn();
    render(<Range onCommit={onCommit} />);
    let clicks = 0;
    const click = (el: HTMLElement) => {
      clicks++;
      fireEvent.click(el);
    };
    click(screen.getByRole("combobox", { name: /^Service-charge period/ }));
    click(caption());
    click(monthCell("July 2026"));
    click(day("2026-07-01"));
    expect(onCommit).toHaveBeenLastCalledWith("2026-07-01", "");
    click(caption());
    // The start's month is marked in the grid.
    expect(monthCell("July 2026")).toHaveAttribute("aria-selected", "true");
    click(within(panel()).getByRole("button", { name: "Next year" }));
    click(monthCell("June 2027"));
    expect(day("2027-06-01")).toHaveFocus();
    click(day("2027-06-30"));
    expect(onCommit).toHaveBeenLastCalledWith("2026-07-01", "2027-06-30");
    expect(clicks).toBe(8);
    // Committed and closed; the trigger says so.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("combobox", { name: /^Service-charge period/ })).toHaveAccessibleName(
      "Service-charge period 01/07/2026 – 30/06/2027",
    );
  });

  it("marks the selected range's months: both ends and the band between", () => {
    render(
      <DateRangePicker
        label="Period"
        locale={LOCALE}
        monthJump
        from="2026-07-01"
        to="2027-06-30"
        onChange={noop}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /^Period/ }));
    fireEvent.click(caption());
    expect(monthCell("June 2026")).toHaveAttribute("aria-selected", "false");
    expect(monthCell("July 2026")).toHaveAttribute("aria-selected", "true");
    expect(monthCell("December 2026")).toHaveAttribute("aria-selected", "true");
    fireEvent.click(within(panel()).getByRole("button", { name: "Next year" }));
    expect(monthCell("June 2027")).toHaveAttribute("aria-selected", "true");
    expect(monthCell("July 2027")).toHaveAttribute("aria-selected", "false");
  });

  it('commit="apply": a preset picked while the months are open goes back to its days', () => {
    const presets: DateRangePickerPreset[] = [
      { id: "fy25", label: "2025/26", from: "2025-07-01", to: "2026-06-30" },
      { id: "fy26", label: "2026/27", from: "2026-07-01", to: "2027-06-30" },
    ];
    const onCommit = vi.fn();
    render(<Range onCommit={onCommit} commit="apply" presets={presets} />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Service-charge period/ }));
    fireEvent.click(caption());
    fireEvent.click(within(panel()).getByRole("button", { name: "2025/26" }));
    expect(screen.getByRole("grid", { name: "July 2025" })).toBeInTheDocument();
    expect(caption()).toHaveAccessibleName("July 2025");
    // The tab stop is the preset's start, as without the jump.
    expect(day("2025-07-01")).toHaveAttribute("tabindex", "0");
    // In the days, a preset that lands in another month moves the caption with it.
    fireEvent.click(within(panel()).getByRole("button", { name: "Next month" }));
    expect(caption()).toHaveAccessibleName("August 2025");
    fireEvent.click(within(panel()).getByRole("button", { name: "2026/27" }));
    expect(caption()).toHaveAccessibleName("July 2026");
    expect(screen.getByRole("grid", { name: "July 2026" })).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenCalledWith("2026-07-01", "2027-06-30", "fy26");
  });

  it("works in the phone sheet, where Escape in the months also stays in the sheet", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("max-width: 767px") || query.includes("reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    render(<Range />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Service-charge period/ }));
    expect(panel()).toHaveAttribute("aria-modal", "true");
    fireEvent.click(caption());
    expect(monthCell("October 2026")).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
  });
});

describe("RhfDateRangePicker monthJump — kastlan's period_start / period_end", () => {
  interface Period {
    period_start: string;
    period_end: string;
  }
  function PeriodForm({ formRef }: { formRef: { current: UseFormReturn<Period> | null } }) {
    const form = useForm<Period>({ defaultValues: { period_start: "", period_end: "" } });
    useEffect(() => {
      formRef.current = form;
    });
    return (
      <Form {...form}>
        <form>
          <RhfDateRangePicker
            fromName="period_start"
            toName="period_end"
            label="Period"
            required
            monthJump
          />
        </form>
      </Form>
    );
  }

  it("reaches the picker through the wrapper and writes both keys", () => {
    const formRef: { current: UseFormReturn<Period> | null } = { current: null };
    render(<PeriodForm formRef={formRef} />);
    fireEvent.click(screen.getByRole("combobox", { name: /^Period/ }));
    fireEvent.click(caption());
    fireEvent.click(monthCell("July 2026"));
    fireEvent.click(day("2026-07-01"));
    fireEvent.click(caption());
    fireEvent.click(within(panel()).getByRole("button", { name: "Next year" }));
    fireEvent.click(monthCell("June 2027"));
    fireEvent.click(day("2027-06-30"));
    expect(formRef.current!.getValues()).toEqual({ period_start: "2026-07-01", period_end: "2027-06-30" });
  });
});
