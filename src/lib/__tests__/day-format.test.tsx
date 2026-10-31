import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider, type KitDateFormatter } from "../../i18n/kit-labels";
import { useDayFormatter } from "../day-format";
import { formatDate } from "../format";

/** The suite runs in Europe/Berlin (vitest.config.ts). */
function withProvider(props: { formatDate?: KitDateFormatter; locale?: string; timeZone?: string }) {
  return ({ children }: { children: ReactNode }) => <UiKitProvider {...props}>{children}</UiKitProvider>;
}

describe("useDayFormatter — the one ladder a kit component prints a day by (DUP-2)", () => {
  it("asks the provider's formatDate for the calendar day, as a dateMark, with the weekday as asked", () => {
    const provider = vi.fn<KitDateFormatter>((iso, { weekday }) => `pref:${iso}${weekday ? ":wd" : ""}`);
    const { result } = renderHook(() => useDayFormatter(), {
      wrapper: withProvider({ formatDate: provider, locale: "de-CH" }),
    });
    expect(result.current("2026-11-06T09:30:00Z")).toBe("pref:2026-11-06");
    expect(result.current("2026-11-06", { weekday: true })).toBe("pref:2026-11-06:wd");
    expect(provider).toHaveBeenCalledWith("2026-11-06", {
      unit: "day",
      source: "dateMark",
      locale: "de-CH",
      weekday: true,
    });
  });

  it("asks for the day in the provider's timeZone, the zone the kit's own date is printed in", () => {
    const provider = vi.fn<KitDateFormatter>((iso) => iso);
    const { result } = renderHook(() => useDayFormatter(), {
      wrapper: withProvider({ formatDate: provider, timeZone: "America/New_York" }),
    });
    // 03:00 UTC on the 6th is still the 5th in New York (and the 6th in Berlin).
    expect(result.current("2026-11-06T03:00:00Z")).toBe("2026-11-05");
    // A bare day is the day it names in every zone.
    expect(result.current("2026-11-06")).toBe("2026-11-06");
  });

  it("adds the language's clock to the provider's day for a timestamp", () => {
    const { result } = renderHook(() => useDayFormatter(), {
      wrapper: withProvider({ formatDate: (iso) => `[${iso}]`, locale: "en" }),
    });
    // English is the British 24-hour clock (formatLocaleOf), 10:30 in Berlin.
    expect(result.current("2026-11-06T09:30:00Z", { time: true })).toBe("[2026-11-06], 10:30");
    // A bare day names no moment.
    expect(result.current("2026-11-06", { time: true })).toBe("[2026-11-06]");
  });

  it("falls back to the kit's formatDate in the provider's locale and timeZone", () => {
    const { result } = renderHook(() => useDayFormatter(), {
      wrapper: withProvider({ locale: "de-CH", timeZone: "America/New_York" }),
    });
    const value = "2026-11-06T03:00:00Z";
    expect(result.current(value)).toBe(formatDate(value, "medium", { locale: "de-CH", timeZone: "America/New_York" }));
    expect(result.current(value, { time: true })).toBe(
      formatDate(value, "dateTime", { locale: "de-CH", timeZone: "America/New_York" }),
    );
    expect(result.current(value)).toContain("5.");
  });

  it("an empty answer from the provider falls through to the kit's", () => {
    const { result } = renderHook(() => useDayFormatter(), {
      wrapper: withProvider({ formatDate: () => "", locale: "en-GB" }),
    });
    expect(result.current("2026-11-06")).toBe("6 Nov 2026");
  });

  it("the component's prop wins over the provider, and an empty answer falls through", () => {
    const provider = vi.fn<KitDateFormatter>(() => "provider");
    const { result, rerender } = renderHook(({ prop }) => useDayFormatter(prop), {
      initialProps: { prop: ((iso: string) => `prop:${iso}`) as ((iso: string) => string) | undefined },
      wrapper: withProvider({ formatDate: provider }),
    });
    expect(result.current("2026-11-06")).toBe("prop:2026-11-06");
    expect(provider).not.toHaveBeenCalled();
    rerender({ prop: () => "" });
    expect(result.current("2026-11-06")).toBe("provider");
  });

  it("preference: false skips the provider (an explicit style wins)", () => {
    const { result } = renderHook(() => useDayFormatter(), {
      wrapper: withProvider({ formatDate: () => "provider", locale: "en-GB" }),
    });
    expect(result.current("2026-11-06", { preference: false, style: "long" })).toBe("6 November 2026");
  });

  it("no value prints `empty`; a value that does not parse prints as it came", () => {
    const { result } = renderHook(() => useDayFormatter(), { wrapper: withProvider({}) });
    expect(result.current(null)).toBe("—");
    expect(result.current(undefined, { empty: "" })).toBe("");
    expect(result.current("soon")).toBe("soon");
  });
});
