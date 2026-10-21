import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { deviceTimeZone, useDeviceZoneReport } from "../device-zone-report";
import { deviceTimeZone as rootDeviceTimeZone } from "../../index";

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

  it("reports the second account signed in on a shared PC in the same start (sign-out between)", () => {
    const report = vi.fn();
    const { rerender } = renderHook((stored: string | null | undefined) => useDeviceZoneReport({ stored, report }), {
      initialProps: undefined as string | null | undefined,
    });
    rerender(null); // engineer A, none stored
    expect(report).toHaveBeenCalledTimes(1);
    rerender(undefined); // signed out
    rerender(null); // engineer B, none stored either
    expect(report).toHaveBeenCalledTimes(2);
  });

  it("keys the once-per-start guard on the account when given", () => {
    const report = vi.fn();
    renderHook(() => useDeviceZoneReport({ stored: "Asia/Seoul", report, account: 1 }));
    renderHook(() => useDeviceZoneReport({ stored: "Asia/Seoul", report, account: 1 }));
    renderHook(() => useDeviceZoneReport({ stored: "Asia/Seoul", report, account: 2 }));
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

describe("deviceTimeZone (0.46.1: beside useDeviceZoneReport, keksdose N6)", () => {
  it("lives here, and the package root hands out the same function", () => {
    expect(deviceTimeZone()).toBe("Europe/Berlin");
    expect(rootDeviceTimeZone).toBe(deviceTimeZone);
  });
});
