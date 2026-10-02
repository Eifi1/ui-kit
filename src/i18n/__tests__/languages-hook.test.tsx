import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { loadUiKitLabels, peekUiKitLabels, useUiKitLabels } from "../languages";

/**
 * The synchronous half of the registry (kastlan 0.19): a provider renders every frame
 * and cannot await, so it reads what has arrived and keeps the last catalogue through
 * a switch.
 */

describe("peekUiKitLabels", () => {
  it("is undefined before the catalogue arrives and the same object after", async () => {
    expect(peekUiKitLabels("hu", "hu-HU")).toBeUndefined();
    const labels = await loadUiKitLabels("hu", "hu-HU");
    expect(peekUiKitLabels("hu", "hu-HU")).toBe(labels);
    expect(peekUiKitLabels("hu-HU", "hu-HU")).toBe(labels);
  });
});

describe("useUiKitLabels", () => {
  it("loads on first use, then keeps the previous catalogue until the next arrives", async () => {
    const { result, rerender } = renderHook(({ code }) => useUiKitLabels(code), { initialProps: { code: "fr" } });
    await waitFor(() => expect(result.current?.common.close).toBe("Fermer"));
    const french = result.current;
    rerender({ code: "it" });
    // The Italian catalogue has not arrived in this frame: the French one stays.
    if (!peekUiKitLabels("it")) expect(result.current).toBe(french);
    await waitFor(() => expect(result.current?.common.close).toBe("Chiudi"));
    await act(async () => {
      rerender({ code: "fr" });
    });
    expect(result.current).toBe(french);
  });
});
