import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { clockTime, dateFormatterFor, formatDateTimeWithPreference, formatDateWithPreference } from "../date-format";
import { useDayFormatter } from "../day-format";

/**
 * The suite runs in Europe/Berlin (vitest.config.ts).
 *
 * 0.52 code review, lib/date-format.ts, two findings:
 *
 *  - `formatDateTimeWithPreference` took no zone, so it printed the day and the clock in
 *    the DEVICE's zone, while the kit's own components print a timestamp in the
 *    `<UiKitProvider timeZone>`: an app on Zurich time used from New York showed
 *    "31.10.2026, 14:05" in the inbox and "31.10.2026, 09:05" in its own column — the
 *    drift the helper was written to end (keksdose's `formatDateTimeFor`, DUP-2);
 *  - a zone `Intl` refuses fell back to the UTC clock (`toISOString().slice(11, 16)`), an
 *    hour or more off with no error, beside a day `isoDayIn` had already read on the
 *    reader's own calendar.
 */

const NEW_YORK = "America/New_York";

describe("formatDateTimeWithPreference in a zone", () => {
  it("prints the day, the weekday and the clock in `timeZone`", () => {
    // 02:30 UTC on 1 November: still the 31st, 22:30, in New York (EDT until that night).
    const value = "2026-11-01T02:30:00Z";
    expect(formatDateTimeWithPreference(value, "de-DE", "de")).toBe("01.11.2026, 03:30");
    expect(formatDateTimeWithPreference(value, "de-DE", "de", { timeZone: NEW_YORK })).toBe("31.10.2026, 22:30");
    expect(formatDateTimeWithPreference(value, "de-DE", "de", { weekday: true, timeZone: NEW_YORK })).toBe(
      "Sa., 31.10.2026, 22:30",
    );
    expect(formatDateWithPreference(value, "sv-SE", "de", { timeZone: NEW_YORK })).toBe("2026-10-31");
  });

  it("a bare day is the day it names in any zone", () => {
    expect(formatDateTimeWithPreference("2026-11-01", "sv-SE", "de", { timeZone: NEW_YORK })).toBe("2026-11-01");
  });

  it("says what the kit's own timestamp says under the same provider", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UiKitProvider locale="de-CH" timeZone={NEW_YORK} formatDate={dateFormatterFor("de-DE", "de")}>
        {children}
      </UiKitProvider>
    );
    const { result } = renderHook(() => useDayFormatter(), { wrapper });
    const value = "2026-11-01T02:30:00Z";
    expect(result.current(value, { time: true })).toBe(
      formatDateTimeWithPreference(value, "de-DE", "de", { timeZone: NEW_YORK }),
    );
  });
});

describe("a zone Intl refuses", () => {
  it("prints the reader's own clock, never UTC's", () => {
    // 13:05 UTC is 14:05 in Berlin.
    const date = new Date("2026-10-31T13:05:00Z");
    expect(clockTime(date, "de", "Europe/Zürich")).toBe("14:05");
    expect(formatDateTimeWithPreference(date, "de-DE", "de", { timeZone: "Europe/Zürich" })).toBe("31.10.2026, 14:05");
  });

  it("prints the reader's own day too, never UTC's", () => {
    // 23:30 UTC on the 31st is already 1 November in Berlin.
    expect(formatDateWithPreference("2026-10-31T23:30:00Z", "sv-SE", "de", { timeZone: "Not/AZone" })).toBe(
      "2026-11-01",
    );
  });
});
