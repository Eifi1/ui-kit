import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  EMPTY_FORMATTED_VALUE,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  toDate,
  useKitFormat,
} from "../format";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("formatNumber", () => {
  it("formats in the given locale, with pinned or ranged digits", () => {
    expect(formatNumber(1234.5, { locale: "en-US" })).toBe("1,234.5");
    expect(formatNumber(1234.5, { locale: "de-DE", digits: 2 })).toBe("1.234,50");
    expect(formatNumber(1.23456, { locale: "en-US", digits: { min: 1, max: 3 } })).toBe("1.235");
    expect(formatNumber(12400, { locale: "en-US", compact: true })).toBe("12K");
    expect(formatNumber(3, { locale: "en-US", signDisplay: "exceptZero" })).toBe("+3");
  });

  it("prints a dash (or `empty`) for a missing value", () => {
    expect(formatNumber(null)).toBe(EMPTY_FORMATTED_VALUE);
    expect(formatNumber(undefined)).toBe("—");
    expect(formatNumber(Number.NaN, { empty: "" })).toBe("");
  });
});

describe("formatMoney / formatPercent", () => {
  it("formats money in the locale's own way", () => {
    expect(formatMoney(1234.5, "EUR", { locale: "de-DE" })).toBe(
      new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(1234.5),
    );
    expect(formatMoney(1234.5, "CHF", { locale: "de-CH", currencyDisplay: "code" })).toContain("CHF");
    expect(formatMoney(null, "CHF")).toBe("—");
  });

  it("reads a ratio by default and a percentage with ratio: false", () => {
    expect(formatPercent(0.12, { locale: "en-US" })).toBe("12%");
    expect(formatPercent(0.1234, { locale: "en-US" })).toBe("12.3%");
    expect(formatPercent(1.25, { locale: "en-US", ratio: false, digits: 2, signDisplay: "exceptZero" })).toBe(
      "+1.25%",
    );
  });
});

describe("formatDate", () => {
  it("reads a bare ISO date on the LOCAL calendar", () => {
    expect(toDate("2026-07-08")?.getDate()).toBe(8);
    expect(formatDate("2026-07-08", "short", { locale: "de-DE" })).toBe("08.07.26");
  });

  it("formats timestamps, named styles and Intl options", () => {
    const ts = "2026-07-08T14:05:00Z";
    expect(formatDate(ts, "dateTime", { locale: "en-GB", timeZone: "UTC" })).toBe("8 Jul 2026, 14:05");
    expect(formatDate(ts, "time", { locale: "en-GB", timeZone: "UTC" })).toBe("14:05");
    expect(formatDate(ts, "monthYear", { locale: "en-GB", timeZone: "UTC" })).toBe("July 2026");
    expect(formatDate(ts, { weekday: "long", timeZone: "UTC" }, { locale: "en-GB" })).toBe("Wednesday");
  });

  it("prints a dash for an unparseable or missing date", () => {
    expect(formatDate("2026-02-30")).toBe("—");
    expect(formatDate("not a date")).toBe("—");
    expect(formatDate(null, "medium", { empty: "n/a" })).toBe("n/a");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-08T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("picks the unit by size and speaks the locale", () => {
    expect(formatRelativeTime(ago(10_000), { now, locale: "en" })).toBe("now");
    expect(formatRelativeTime(ago(5 * 60_000), { now, locale: "en" })).toBe("5 minutes ago");
    expect(formatRelativeTime(ago(3 * 3_600_000), { now, locale: "en" })).toBe("3 hours ago");
    expect(formatRelativeTime(ago(3 * 3_600_000), { now, locale: "de" })).toBe("vor 3 Stunden");
    expect(formatRelativeTime(ago(86_400_000), { now, locale: "en" })).toBe("yesterday");
    expect(formatRelativeTime(ago(2 * 86_400_000), { now, locale: "en", numeric: "always" })).toBe("2 days ago");
    expect(formatRelativeTime(new Date(now.getTime() + 2 * 86_400_000), { now, locale: "en" })).toBe(
      "in 2 days",
    );
    expect(formatRelativeTime(ago(400 * 86_400_000), { now, locale: "en" })).toBe("last year");
  });

  it("switches to the date past absoluteAfterDays", () => {
    const old = ago(10 * 86_400_000);
    expect(formatRelativeTime(old, { now, locale: "en-GB", absoluteAfterDays: 7 })).toBe(
      formatDate(old, "medium", { locale: "en-GB" }),
    );
  });
});

describe("useKitFormat", () => {
  it("binds the provider's locale, and an explicit locale still wins", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UiKitProvider locale="de-DE">{children}</UiKitProvider>
    );
    const { result } = renderHook(() => useKitFormat(), { wrapper });
    expect(result.current.locale).toBe("de-DE");
    expect(result.current.formatNumber(1234.5, { digits: 2 })).toBe("1.234,50");
    expect(result.current.formatNumber(1234.5, { digits: 2, locale: "en-US" })).toBe("1,234.50");
    expect(result.current.formatRelativeTime(new Date(Date.now() - 3 * 3_600_000))).toBe("vor 3 Stunden");
  });
});
