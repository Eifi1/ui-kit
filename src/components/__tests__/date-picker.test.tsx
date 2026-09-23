import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DatePicker, DateRangePicker } from "../date-picker";
import { formatIsoDate } from "../../lib/dates";

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
      <DateRangePicker
        from="2026-09-01"
        to=""
        onChange={() => {}}
        locale="en"
        formatValue={(iso) => `host:${iso}`}
      />,
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
