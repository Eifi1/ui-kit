import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { formatNumber, useKitFormat } from "../format";
import { UiKitProvider } from "../../i18n/kit-labels";

/** lenkbank P8: a figure with its unit, joined by a narrow no-break space. */
describe("formatNumber unit", () => {
  it("appends the unit after U+202F", () => {
    expect(formatNumber(3400, { locale: "de-DE", unit: "N" })).toBe("3.400 N");
    expect(formatNumber(4.5, { locale: "de-DE", digits: 1, unit: "m²" })).toBe("4,5 m²");
  });

  it("prints the missing value without the unit", () => {
    expect(formatNumber(null, { unit: "N" })).toBe("—");
    expect(formatNumber(Number.NaN, { unit: "N", empty: "" })).toBe("");
  });

  it("is unchanged without a unit, or with an empty one", () => {
    expect(formatNumber(3400, { locale: "de-DE" })).toBe("3.400");
    expect(formatNumber(3400, { locale: "de-DE", unit: "" })).toBe("3.400");
  });

  it("works through the provider-bound formatter", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <UiKitProvider locale="de-DE">{children}</UiKitProvider>
    );
    const { result } = renderHook(() => useKitFormat(), { wrapper });
    expect(result.current.formatNumber(3400, { unit: "N" })).toBe("3.400 N");
    expect(result.current.formatNumber(undefined, { unit: "N" })).toBe("—");
  });
});
