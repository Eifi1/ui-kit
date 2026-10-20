// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DATE_FORMAT_PREFERENCES,
  dateFormatSample,
  dateFormatterFor,
  formatDateWithPreference,
  isDateFormatPreference,
  resolveDateFormat,
} from "../date-format";

/** keksdose's date-format-store and formatDate cases (feedback #180, dev#546), on the kit's lift. */
describe("resolveDateFormat", () => {
  it("follows the language's format tag on auto, in the short-month shape", () => {
    expect(resolveDateFormat("auto", "de")).toEqual({
      locale: "de-CH",
      options: { year: "numeric", month: "short", day: "2-digit" },
    });
    expect(resolveDateFormat("auto", "en").locale).toBe("en-GB");
    expect(resolveDateFormat("auto", "fr").locale).toBe("fr-FR");
    expect(resolveDateFormat("auto", "sv-SE").locale).toBe("sv-SE");
    expect(resolveDateFormat("auto", undefined).locale).toBeUndefined();
  });

  it("an explicit choice beats the language, all-numeric", () => {
    expect(resolveDateFormat("de-DE", "en")).toEqual({
      locale: "de-DE",
      options: { year: "numeric", month: "2-digit", day: "2-digit" },
    });
  });

  it("hands the weekday back as the language's, never in the date's own options", () => {
    expect(resolveDateFormat("sv-SE", "de", { weekday: true })).toEqual({
      locale: "sv-SE",
      options: { year: "numeric", month: "2-digit", day: "2-digit" },
      weekday: { locale: "de-CH" },
    });
    expect(resolveDateFormat("sv-SE", "de")).not.toHaveProperty("weekday");
  });
});

describe("dateFormatSample", () => {
  it("renders each option in the shape it promises, each one distinct", () => {
    expect(dateFormatSample("de-DE", "en")).toBe("01.08.2026");
    expect(dateFormatSample("en-GB", "en")).toBe("01/08/2026");
    expect(dateFormatSample("en-US", "en")).toBe("08/01/2026");
    expect(dateFormatSample("sv-SE", "en")).toBe("2026-08-01");
    expect(dateFormatSample("auto", "en")).toBe("01 Aug 2026");
    const explicit = DATE_FORMAT_PREFERENCES.filter((p) => p !== "auto").map((p) => dateFormatSample(p, "en"));
    expect(new Set(explicit).size).toBe(explicit.length);
  });
});

describe("formatDateWithPreference", () => {
  it("follows the language on auto, and an explicit choice beats it", () => {
    expect(formatDateWithPreference("2026-08-01", "auto", "en-GB")).toBe("01 Aug 2026");
    expect(formatDateWithPreference("2026-08-01", "sv-SE", "en-GB")).toBe("2026-08-01");
    expect(formatDateWithPreference(new Date(2026, 7, 1), "de-DE", "en")).toBe("01.08.2026");
  });

  it("answers empty for nothing and echoes what does not parse", () => {
    expect(formatDateWithPreference(null, "de-DE", "en")).toBe("");
    expect(formatDateWithPreference(undefined, "de-DE", "en")).toBe("");
    expect(formatDateWithPreference("", "de-DE", "en")).toBe("");
    expect(formatDateWithPreference("not-a-date", "de-DE", "en")).toBe("not-a-date");
  });

  it("names the weekday in the language, around the preference's digits", () => {
    // ISO chosen, German interface: a German day name, never a Swedish one (dev#546).
    expect(formatDateWithPreference("2026-09-06", "sv-SE", "en", { weekday: true })).toBe("Sun, 2026-09-06");
    expect(formatDateWithPreference("2026-09-06", "sv-SE", "de", { weekday: true })).toMatch(/^So\.?, 2026-09-06$/);
    // Where the two coincide, the native string, character for character.
    expect(formatDateWithPreference("2026-09-06", "de-DE", "de-DE", { weekday: true })).toBe(
      new Date(Date.UTC(2026, 8, 6)).toLocaleDateString("de-DE", {
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
      }),
    );
  });

  it("keeps a timestamp in the reader's zone (the suite runs in Europe/Berlin)", () => {
    expect(formatDateWithPreference("2026-08-01T23:30:00Z", "sv-SE", "en")).toBe("2026-08-02");
  });
});

describe("dateFormatterFor", () => {
  it("formats a day under the preference and leaves a month or a year to the kit", () => {
    const format = dateFormatterFor("sv-SE", "en");
    expect(format("2026-09-06", { unit: "day", source: "datePicker", locale: undefined, weekday: true })).toBe(
      "Sun, 2026-09-06",
    );
    expect(format("2026-09-06", { unit: "day", source: "dateRangePicker", locale: undefined, weekday: false })).toBe(
      "2026-09-06",
    );
    expect(format("2026-09", { unit: "month", source: "monthPicker", locale: undefined, weekday: false })).toBe("");
    expect(format("2026", { unit: "year", source: "monthPicker", locale: undefined, weekday: false })).toBe("");
    // auto: the component's own locale goes first, as the kit would have formatted.
    expect(
      dateFormatterFor("auto", "en")("2026-08-01", { unit: "day", source: "dateMark", locale: "fr", weekday: false }),
    ).toBe("01 août 2026");
  });
});

describe("isDateFormatPreference", () => {
  it("accepts the five and nothing else", () => {
    for (const p of DATE_FORMAT_PREFERENCES) expect(isDateFormatPreference(p)).toBe(true);
    expect(isDateFormatPreference("de-CH")).toBe(false);
    expect(isDateFormatPreference(null)).toBe(false);
  });
});
