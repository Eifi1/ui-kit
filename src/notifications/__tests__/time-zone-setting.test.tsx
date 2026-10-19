import { render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimeZoneSetting, useDeviceZoneReport } from "../time-zone-setting";
import { axeViolations } from "../../test/axe";

/**
 * docs/notifications-harmonization.md §10.3: the zone on the account — Automatic (the
 * device last used) or a pick — and the device's report. The suite runs in Europe/Berlin
 * (vitest.config.ts).
 */

describe("TimeZoneSetting", () => {
  it("Automatic names this device's zone, and draws no picker", () => {
    render(<TimeZoneSetting value={null} onChange={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Time zone" });
    expect(within(group).getByRole("switch", { name: "Automatic (this device: Europe / Berlin)" })).toBeChecked();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("turning Automatic off pins this device's zone; on again sends null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(async () => undefined);
    const { rerender } = render(<TimeZoneSetting value={null} onChange={onChange} />);
    await user.click(screen.getByRole("switch", { name: /Automatic/ }));
    expect(onChange).toHaveBeenLastCalledWith("Europe/Berlin");
    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue("Berlin");
    rerender(<TimeZoneSetting value="Europe/Berlin" onChange={onChange} />);
    await user.click(screen.getByRole("switch", { name: /Automatic/ }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("sends a zone picked from the list", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeZoneSetting value="Europe/Berlin" onChange={onChange} />);
    const zone = screen.getByRole("combobox", { name: "Time zone" });
    await user.clear(zone);
    await user.type(zone, "Vienna");
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: /Vienna/ }));
    expect(onChange).toHaveBeenCalledWith("Europe/Vienna");
  });

  it("a pick that is not this device's offers \"Use it\"", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<TimeZoneSetting value="Europe/Zurich" onChange={onChange} />);
    expect(screen.getByText("This device is in Europe / Berlin.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use it" }));
    expect(onChange).toHaveBeenCalledWith("Europe/Berlin");
    rerender(<TimeZoneSetting value="Europe/Berlin" onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Use it" })).not.toBeInTheDocument();
  });

  it("puts a rejected change back and says so", async () => {
    const user = userEvent.setup();
    render(<TimeZoneSetting value={null} onChange={() => Promise.reject(new Error("offline"))} />);
    await user.click(screen.getByRole("switch", { name: /Automatic/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn’t work. Please try again.");
    expect(screen.getByRole("switch", { name: /Automatic/ })).toBeChecked();
  });

  it("passes axe, automatic and picked", async () => {
    const { container, rerender } = render(<TimeZoneSetting value={null} onChange={vi.fn()} />);
    expect(await axeViolations(container)).toEqual([]);
    rerender(<TimeZoneSetting value="Europe/Zurich" onChange={vi.fn()} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

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
