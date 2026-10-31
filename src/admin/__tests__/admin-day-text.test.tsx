import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider, type KitDateFormatter } from "../../i18n/kit-labels";
import { useDayText } from "../admin-parts";

/**
 * The admin parts' day in a sentence ("Sent 6 Nov 2026", "Free until 6 Nov 2026") is the
 * kit's one day ladder since 0.52 (refactor audit 2026-10-30, DUP-2): the provider's
 * `formatDate` without a weekday, else the medium date in the provider's locale and —
 * new — its `timeZone`; `""` for nothing to say.
 */

const wrap =
  (props: { formatDate?: KitDateFormatter; locale?: string; timeZone?: string }) =>
  ({ children }: { children: ReactNode }) => <UiKitProvider {...props}>{children}</UiKitProvider>;

describe("useDayText", () => {
  it("asks the provider for the day, without a weekday", () => {
    const formatDate = vi.fn<KitDateFormatter>((iso) => `«${iso}»`);
    const { result } = renderHook(() => useDayText(), { wrapper: wrap({ formatDate, locale: "fr-CH" }) });
    expect(result.current("2026-11-06T10:00:00Z")).toBe("«2026-11-06»");
    expect(formatDate).toHaveBeenCalledWith("2026-11-06", {
      unit: "day",
      source: "dateMark",
      locale: "fr-CH",
      weekday: false,
    });
  });

  it("prints the medium date in the provider's timeZone without a formatter", () => {
    const { result } = renderHook(() => useDayText(), {
      wrapper: wrap({ locale: "en-GB", timeZone: "America/New_York" }),
    });
    // 03:00 UTC on the 6th is the 5th in New York.
    expect(result.current("2026-11-06T03:00:00Z")).toBe("5 Nov 2026");
    expect(result.current("2026-11-06")).toBe("6 Nov 2026");
  });

  it('answers "" for no date and one that does not parse', () => {
    const { result } = renderHook(() => useDayText(), { wrapper: wrap({ locale: "en-GB" }) });
    expect(result.current(null)).toBe("");
    expect(result.current(undefined)).toBe("");
    expect(result.current("soon")).toBe("");
  });
});
