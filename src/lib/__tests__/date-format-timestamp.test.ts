// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDateTimeWithPreference, formatDateWithPreference } from "../date-format";

/** The suite runs in Europe/Berlin (vitest.config.ts). */
describe("formatDateTimeWithPreference — the preference's date, the language's clock (DUP-2)", () => {
  it("writes the date as the preference does and the time as the language does", () => {
    expect(formatDateTimeWithPreference("2026-08-01T12:05:00Z", "sv-SE", "de")).toBe("2026-08-01, 14:05");
    expect(formatDateTimeWithPreference("2026-08-01T12:05:00Z", "de-DE", "en")).toBe("01.08.2026, 14:05");
    // English is the British 24-hour clock, never "02:05 PM".
    expect(formatDateTimeWithPreference("2026-08-01T12:05:00Z", "en-US", "en")).toBe("08/01/2026, 14:05");
  });

  it("names the weekday in the language when asked", () => {
    expect(formatDateTimeWithPreference("2026-08-01T12:05:00Z", "de-DE", "de", { weekday: true })).toBe(
      "Sa., 01.08.2026, 14:05",
    );
  });

  it("a bare day names no moment: the date alone; no value is empty; garbage comes back", () => {
    expect(formatDateTimeWithPreference("2026-08-01", "sv-SE", "de")).toBe("2026-08-01");
    expect(formatDateTimeWithPreference(null, "sv-SE", "de")).toBe("");
    expect(formatDateTimeWithPreference("soon", "sv-SE", "de")).toBe("soon");
  });
});

describe("formatDateWithPreference renders through the shared formatter cache", () => {
  afterEach(() => vi.restoreAllMocks());

  it("builds no formatter for a shape it has formatted before", () => {
    formatDateWithPreference("2026-08-01", "de-DE", "en", { weekday: true });
    const built = vi.spyOn(Intl, "DateTimeFormat");
    for (let i = 0; i < 50; i++) formatDateWithPreference("2026-08-01", "de-DE", "en", { weekday: true });
    expect(built).not.toHaveBeenCalled();
  });
});
