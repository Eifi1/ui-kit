import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DatePicker, DateRangePicker } from "../date-picker";
import { formatIsoDate } from "../../lib/dates";
import { FieldHint } from "../field-parts";

/**
 * `formatValue` — the host's own rendering of the trigger text (Keksdose dev#546
 * rework: a weekday named in the UI language beside digits ordered by a separate
 * format preference is two locales in one string, which the one-locale
 * `formatOptions` pass-through cannot say). It wins over `formatOptions`; without it
 * the trigger renders exactly as before.
 */
describe("DatePicker formatValue", () => {
  it("renders the trigger through the host's formatter when one is given", () => {
    render(
      <DatePicker
        value="2026-09-06"
        onChange={() => {}}
        locale="en"
        formatOptions={{ year: "numeric", month: "2-digit", day: "2-digit" }}
        formatValue={(iso) => `host:${iso}`}
      />,
    );
    expect(screen.getByText("host:2026-09-06")).toBeTruthy();
    expect(screen.queryByText("09/06/2026")).toBeNull();
  });

  it("falls back to the locale rendering without one", () => {
    const options = { year: "numeric", month: "2-digit", day: "2-digit" } as const;
    render(<DatePicker value="2026-09-06" onChange={() => {}} locale="en" formatOptions={options} />);
    expect(screen.getByText(formatIsoDate("2026-09-06", "en", options))).toBeTruthy();
  });

  it("applies to both ends of a range, and never to an empty end", () => {
    render(
      <DateRangePicker from="2026-09-01" to="" onChange={() => {}} locale="en" formatValue={(iso) => `host:${iso}`} />,
    );
    // `to` is empty: the separator and ellipsis, not `host:` of nothing.
    expect(screen.getByText("host:2026-09-01 – …")).toBeTruthy();
  });
});

/**
 * The empty trigger holds a line (Keksdose live #294, *"Date field malformed"*).
 *
 * A `<button>` styled with the field padding and NOTHING in it collapses to that
 * padding: 22px against the 42px of every field beside it, with the calendar glyph —
 * absolutely positioned against the button — then hanging out of its own box. That is
 * what a receipt whose scan found no date looked like, sitting between two 42px
 * fields.
 *
 * The trap this pins is that the obvious fix does not work. The code read
 * `triggerText || " "` for months: an ordinary space is collapsible white space, and
 * white space at the start and end of a line is removed, so the span rendered with
 * height 0 and nothing changed. It has to be U+00A0. Asserted on the CHARACTER rather
 * than on a height, because jsdom has no layout — the height was measured in a real
 * browser (22 → 42) and this is the property that produced it.
 */
describe("an empty DatePicker trigger", () => {
  // `/^When/`, not `"When"`: the trigger's accessible name is the label AND the value
  // now (audit §a11y — a date field named only "When" never says what it says), so
  // the placeholder case below is called "When varies". The assertions underneath are
  // on `textContent`, which is what live #294 was actually about, and they are
  // unchanged.
  const trigger = () => screen.getByRole("combobox", { name: /^When/ });

  it("holds its line with a non-breaking space when there is no value and no placeholder", () => {
    render(<DatePicker value="" onChange={() => {}} locale="en" label="When" />);
    expect(trigger().textContent).toBe(" ");
    // …and specifically NOT a plain space, which is the version that did nothing.
    expect(trigger().textContent).not.toBe(" ");
  });

  it("shows the placeholder instead when the caller gives one", () => {
    render(<DatePicker value="" onChange={() => {}} locale="en" label="When" placeholder="varies" />);
    expect(trigger().textContent).toBe("varies");
  });
});

describe("Date pickers in RTL (0.7.0)", () => {
  it("carries the field's `dir` onto the portalled calendar panel", () => {
    render(
      <div dir="rtl">
        <DatePicker value="2026-09-14" onChange={() => {}} locale="en-GB" />
      </div>,
    );
    fireEvent.click(screen.getByRole("combobox"));
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveAttribute("dir", "rtl");
  });

  it("does the same for the range picker", () => {
    render(
      <div dir="rtl">
        <DateRangePicker from="2026-09-01" to="2026-09-14" onChange={() => {}} locale="en-GB" />
      </div>,
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("dialog")).toHaveAttribute("dir", "rtl");
  });

  it("puts the clear button and the trigger's padding on the logical END", () => {
    render(<DatePicker value="2026-09-14" onChange={() => {}} clearable clearLabel="Clear" />);
    const clear = screen.getByRole("button", { name: "Clear" });
    expect(clear.className).toContain("end-1.5");
    expect(clear.className).not.toMatch(/\bright-/);
    expect(screen.getByRole("combobox").className).toContain("pe-9");
  });

  it("mirrors the ‹ › day steps in RTL but not the today icon", () => {
    render(
      <DatePicker
        value="2026-09-14"
        onChange={() => {}}
        step
        today="2026-09-20"
        stepLabels={{ prev: "Previous day", next: "Next day" }}
        todayLabel="Today"
      />,
    );
    const icon = (name: string) =>
      screen.getByRole("button", { name }).querySelector("svg")!.getAttribute("class") ?? "";
    expect(icon("Previous day")).toContain("rtl:-scale-x-100");
    expect(icon("Next day")).toContain("rtl:-scale-x-100");
    expect(icon("Today")).not.toContain("rtl:-scale-x-100");
  });
});

describe("the step row's focus frame (keksdose live #394)", () => {
  it("raises the focused, pressed or invalid part, not the trigger on :focus-visible", () => {
    render(
      <DatePicker
        value="2026-09-14"
        onChange={() => {}}
        step
        today="2026-09-20"
        stepLabels={{ prev: "Previous day", next: "Next day" }}
        todayLabel="Today"
      />,
    );
    // A tap focuses without :focus-visible, so the tapped part stayed under its later
    // neighbour, whose grey left edge covered its right one.
    // The row of parts: the steps sit in their tooltip's wrapper, so find it by its
    // stretch rather than as a button's parent.
    const row = screen.getByRole("combobox").closest<HTMLElement>(".items-stretch")!;
    expect(row.className).toContain("[&>*:focus-within]:z-20");
    expect(row.className).toContain("[&>*:active]:z-20");
    expect(row.className).toContain("[&>*:has([aria-invalid=true])]:z-10");
    expect(row.className).not.toContain("focus-visible]:z-10");
    for (const name of ["Previous day", "Next day", "Today"]) {
      expect(screen.getByRole("button", { name }).className).not.toMatch(/(hover|focus-visible):z-10/);
    }
  });

  // Fourth round (kk K5): at 125 % a 1px border on a fractional pixel is two half-strength
  // device pixels — ‹'s left side and the field's right read grey. An inset 1px ring in
  // the focus colour beside the border keeps one full pixel on every side.
  it("frames the focused part 2px wide: an inset 1px ring in the brand colour beside its border", () => {
    render(
      <DatePicker
        label="Booking date"
        hint={<FieldHint label="The day the bank booked it" />}
        value="2026-09-14"
        onChange={() => {}}
        step
        today="2026-09-20"
        stepLabels={{ prev: "Previous day", next: "Next day" }}
        todayLabel="Today"
      />,
    );
    for (const name of ["Previous day", "Next day", "Today"]) {
      const tokens = screen.getByRole("button", { name }).className.split(/\s+/);
      expect(tokens, name).toEqual(
        expect.arrayContaining(["focus:border-brand", "focus:ring-brand", "focus:ring-1", "focus:ring-inset"]),
      );
      // A box-shadow, inset: nothing outside the part moves.
      expect(tokens, name).not.toContain("focus:ring-2");
      expect(tokens, name).not.toContain("focus:border-2");
    }
    // The trigger sits inside DateField and is FIELD_BASE (through FIELD_TRIGGER), whose
    // focus ring is this very inset ring since the K5 follow-up — the row's own copy of it
    // went in Wave 2.
    const trigger = screen.getByRole("combobox");
    const row = trigger.closest<HTMLElement>(".items-stretch")!.className.split(/\s+/);
    expect(trigger.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["focus:border-brand", "focus:ring-brand", "focus:ring-1", "focus:ring-inset"]),
    );
    // Not every button in the row: the label's "?" keeps its own 2px focus frame.
    expect(row.some((t) => t.includes("[&_button"))).toBe(false);
    const hint = screen.getByRole("button", { name: "The day the bank booked it" });
    expect(hint).toHaveClass("focus-visible:ring-focus");
    expect(hint.className).not.toContain("ring-inset");
  });
});

/**
 * `today` without `step` still makes a row (refactor audit 2026-10-30, INP-13): the
 * caller's `className` belongs on that row, once, and the field inside it takes the
 * row's `min-w-0 flex-1`. The field was dressed on `step` alone, so a today-only picker
 * put a `w-48` on the row AND on the field, and the field did not fill the row.
 */
describe("a DatePicker with `today` and no `step`", () => {
  it("puts the caller's className on the row only, and stretches the field", () => {
    const { container } = render(
      <DatePicker value="2026-10-20" onChange={() => {}} today="2026-10-31" className="w-48 caller-class" />,
    );
    expect(container.querySelectorAll(".caller-class")).toHaveLength(1);
    const field = container.querySelector<HTMLElement>('[data-slot="date-step-field"]')!;
    expect(field).not.toHaveClass("caller-class");
    expect(field).toHaveClass("min-w-0", "flex-1");
    expect(field.parentElement).toHaveClass("caller-class");
  });
});
