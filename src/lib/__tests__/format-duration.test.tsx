import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { formatDuration, useKitFormat } from "../format";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * formatDuration (0.54, keksdose audit follow-up, 2026-11-01): a number of seconds as an
 * elapsed time — keksdose's `formatElapsed` (the scan card's "3m 5s"), with hours from an
 * hour on. Each unit is `Intl.NumberFormat`'s unit style in the locale, the narrow form by
 * default.
 *
 * The hours, the joining and the zeros are the kit's; the unit words are ICU's, so the
 * expectations past English and the three asked-for locales are built from `Intl` itself.
 */

const M = "−";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** One unit as `Intl` writes it — what keksdose's own test builds its readout from. */
const unit = (locale: string, u: "hour" | "minute" | "second", n: number, unitDisplay = "narrow") =>
  new Intl.NumberFormat(locale, { style: "unit", unit: u, unitDisplay: unitDisplay as "narrow" }).format(n);

describe("formatDuration", () => {
  it("writes English in the narrow form keksdose's readout has", () => {
    const en = (s: number) => formatDuration(s, { locale: "en" });
    expect(en(0)).toBe("0s");
    expect(en(42)).toBe("42s");
    expect(en(59)).toBe("59s");
    expect(en(60)).toBe("1m 0s");
    expect(en(185)).toBe("3m 5s");
    expect(en(3599)).toBe("59m 59s");
    expect(en(3600)).toBe("1h 0m 0s");
    expect(en(3725)).toBe("1h 2m 5s");
    // Hours are the largest unit: no days.
    expect(en(100_000)).toBe("27h 46m 40s");
  });

  it("writes German (de-CH) and French in their own units", () => {
    expect(formatDuration(42, { locale: "de-CH" })).toBe("42 Sek.");
    expect(formatDuration(192, { locale: "de-CH" })).toBe("3 Min. 12 Sek.");
    expect(formatDuration(3600, { locale: "de-CH" })).toBe(
      `${unit("de-CH", "hour", 1)} ${unit("de-CH", "minute", 0)} ${unit("de-CH", "second", 0)}`,
    );
    expect(formatDuration(42, { locale: "fr" })).toBe("42s");
    expect(formatDuration(192, { locale: "fr" })).toBe("3min 12s");
    expect(formatDuration(3725, { locale: "fr" })).toBe("1h 2min 5s");
  });

  it("prints exactly what keksdose's formatElapsed printed, under an hour", () => {
    // Its rule: seconds alone under a minute, else minutes and seconds, joined by a space.
    const elapsed = (locale: string, secs: number) =>
      secs < 60
        ? unit(locale, "second", secs)
        : `${unit(locale, "minute", Math.floor(secs / 60))} ${unit(locale, "second", secs % 60)}`;
    for (const locale of ["en", "de-CH", "fr", "it", "es", "hu", "zh"]) {
      for (const secs of [0, 1, 42, 59, 60, 185, 660, 3599]) {
        expect(formatDuration(secs, { locale }), `${locale} ${secs}`).toBe(elapsed(locale, secs));
      }
    }
  });

  it("writes the short and the long form when asked", () => {
    expect(formatDuration(192, { locale: "en", unitDisplay: "short" })).toBe("3 min 12 sec");
    expect(formatDuration(192, { locale: "en", unitDisplay: "long" })).toBe("3 minutes 12 seconds");
    expect(formatDuration(192, { locale: "de-CH", unitDisplay: "long" })).toBe("3 Minuten 12 Sekunden");
    expect(formatDuration(3725, { locale: "fr", unitDisplay: "short" })).toBe(
      `${unit("fr", "hour", 1, "short")} ${unit("fr", "minute", 2, "short")} ${unit("fr", "second", 5, "short")}`,
    );
  });

  it("counts whole seconds, cut toward zero: a timer reads 59s until the minute is full", () => {
    expect(formatDuration(59.9, { locale: "en" })).toBe("59s");
    expect(formatDuration(0.4, { locale: "en" })).toBe("0s");
    expect(formatDuration(3599.99, { locale: "en" })).toBe("59m 59s");
  });

  it("puts a negative's minus on its first unit, the kit's minus unless told otherwise", () => {
    expect(formatDuration(-42, { locale: "en" })).toBe(`${M}42s`);
    expect(formatDuration(-192, { locale: "en" })).toBe(`${M}3m 12s`);
    expect(formatDuration(-3725, { locale: "en" })).toBe(`${M}1h 2m 5s`);
    expect(formatDuration(-192, { locale: "en", minus: "ascii" })).toBe("-3m 12s");
    // Under a second either way is zero, and zero has no sign.
    expect(formatDuration(-0.5, { locale: "en" })).toBe("0s");
    expect(formatDuration(-0, { locale: "en" })).toBe("0s");
  });

  it("reads a numeric string as its number, and prints `empty` for no value or a broken one", () => {
    expect(formatDuration("185", { locale: "en" })).toBe("3m 5s");
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(undefined, { empty: "" })).toBe("");
    expect(formatDuration(Number.NaN)).toBe("—");
    expect(formatDuration(Infinity)).toBe("—");
    expect(formatDuration("soon")).toBe("—");
  });

  it("says so in a development build when the value is broken, not when it is missing", () => {
    vi.stubEnv("VITEST", "");
    vi.stubEnv("DEV", true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    formatDuration(null);
    expect(warn).not.toHaveBeenCalled();
    formatDuration(Number.NaN);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("formatDuration got NaN");
  });

  it("builds no formatter for a locale and form it has written before", () => {
    formatDuration(3725, { locale: "de-CH" });
    const built = vi.spyOn(Intl, "NumberFormat");
    for (let i = 0; i < 50; i++) formatDuration(3725 + i, { locale: "de-CH" });
    expect(built).not.toHaveBeenCalled();
  });

  it("formats in the provider's locale through useKitFormat; an explicit one wins", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <UiKitProvider locale="de-CH">{children}</UiKitProvider>;
    const { result } = renderHook(() => useKitFormat(), { wrapper });
    expect(result.current.formatDuration(192)).toBe("3 Min. 12 Sek.");
    expect(result.current.formatDuration(192, { locale: "en" })).toBe("3m 12s");
    expect(result.current.formatDuration(null, { empty: "" })).toBe("");
  });
});
