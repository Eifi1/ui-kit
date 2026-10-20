import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDeviceZoneReport } from "../device-zone-report";

/**
 * docs/notifications-harmonization.md §10.3 (amended 2026-10-20: automatic only): the
 * account's zone is the device last used, reported when it differs. The suite runs in
 * Europe/Berlin (vitest.config.ts).
 */

describe("useDeviceZoneReport", () => {
  it("reports nothing while the account loads, nor when the stored zone is this device's", () => {
    const report = vi.fn();
    const { rerender } = renderHook((stored: string | null | undefined) => useDeviceZoneReport({ stored, report }), {
      initialProps: undefined,
    });
    expect(report).not.toHaveBeenCalled();
    rerender("Europe/Berlin");
    expect(report).not.toHaveBeenCalled();
  });

  it("reports this device's zone when it differs, once per start", () => {
    const report = vi.fn();
    const first = renderHook(() => useDeviceZoneReport({ stored: "America/New_York", report }));
    first.rerender();
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith("Europe/Berlin");
    // A remount in the same start (a route change, a re-render of the shell) does not repeat it.
    first.unmount();
    renderHook(() => useDeviceZoneReport({ stored: "America/New_York", report }));
    expect(report).toHaveBeenCalledTimes(1);
    // A first report too: none stored yet.
    renderHook(() => useDeviceZoneReport({ stored: null, report }));
    expect(report).toHaveBeenCalledTimes(2);
  });

  it("never reports for a demo", () => {
    const report = vi.fn();
    renderHook(() => useDeviceZoneReport({ stored: "Asia/Tokyo", report, isDemo: true }));
    expect(report).not.toHaveBeenCalled();
  });

  it("swallows a failed report", async () => {
    const report = vi.fn(() => Promise.reject(new Error("offline")));
    renderHook(() => useDeviceZoneReport({ stored: "Australia/Perth", report }));
    await Promise.resolve();
    expect(report).toHaveBeenCalledTimes(1);
  });
});
