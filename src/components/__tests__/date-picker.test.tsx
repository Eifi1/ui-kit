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
