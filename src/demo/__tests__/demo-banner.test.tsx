import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DemoBanner } from "../demo-banner";
import { demoCountdown, useDemoCountdown } from "../demo-countdown";
import type { AccessChoice } from "../../landing/access";

const ACCESS: AccessChoice = { kind: "request", email: "support@example.com", app: "Ada's Garden Planner" };
const T0 = Date.parse("2026-10-07T12:00:00Z");
const MIN = 60_000;
const HOUR = 60 * MIN;

describe("demoCountdown — the format's numbers and the tone's thresholds (§5.4)", () => {
  it("splits hours and minutes above the last hour", () => {
    expect(demoCountdown(T0 + 23 * HOUR + 12 * MIN, T0)).toMatchObject({
      minutesLeft: 23 * 60 + 12,
      hours: 23,
      minutes: 12,
      lastHour: false,
      warning: false,
      ended: false,
    });
  });

  it("rounds a part minute up, so 0 is only ever the end", () => {
    expect(demoCountdown(T0 + 23 * HOUR + 11 * MIN + 1_000, T0)).toMatchObject({ hours: 23, minutes: 12 });
    expect(demoCountdown(T0 + 30_000, T0)).toMatchObject({ minutesLeft: 1, ended: false, warning: true });
    expect(demoCountdown(T0, T0)).toMatchObject({ minutesLeft: 0, ended: true });
    expect(demoCountdown(T0 - HOUR, T0)).toMatchObject({ minutesLeft: 0, ended: true });
  });

  it("shows minutes only from 60 down, and warns from 10 down", () => {
    expect(demoCountdown(T0 + 61 * MIN, T0)).toMatchObject({ lastHour: false, hours: 1, minutes: 1 });
    expect(demoCountdown(T0 + 60 * MIN, T0)).toMatchObject({ lastHour: true, hours: 0, minutes: 60 });
    expect(demoCountdown(T0 + 11 * MIN, T0)).toMatchObject({ warning: false });
    expect(demoCountdown(T0 + 10 * MIN, T0)).toMatchObject({ warning: true });
  });

  it("reads an ISO string or a Date, and never ends on an unreadable one", () => {
    expect(demoCountdown("2026-10-07T12:50:00Z", T0).minutesLeft).toBe(50);
    expect(demoCountdown(new Date(T0 + 4 * MIN), T0).minutesLeft).toBe(4);
    expect(demoCountdown("not a date", T0)).toMatchObject({ minutesLeft: null, ended: false, warning: false });
    expect(demoCountdown(null, T0)).toMatchObject({ minutesLeft: null, ended: false });
  });
});

describe("useDemoCountdown — with a fake clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => vi.useRealTimers());

  it("moves at each minute boundary and calls onEnded once at zero", () => {
    const onEnded = vi.fn();
    const { result } = renderHook(() => useDemoCountdown(T0 + 2 * MIN + 30_000, { onEnded }));
    expect(result.current.minutesLeft).toBe(3);
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.minutesLeft).toBe(2);
    act(() => vi.advanceTimersByTime(MIN));
    expect(result.current.minutesLeft).toBe(1);
    expect(onEnded).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(MIN));
    expect(result.current).toMatchObject({ minutesLeft: 0, ended: true });
    expect(onEnded).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10 * MIN));
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("takes an injected clock", () => {
    const now = () => T0 + 23 * HOUR;
    const { result } = renderHook(() => useDemoCountdown(T0 + 24 * HOUR, { now }));
    expect(result.current).toMatchObject({ minutesLeft: 60, lastHour: true });
  });

  it("ends on mount when the demo is already over", () => {
    const onEnded = vi.fn();
    renderHook(() => useDemoCountdown(T0 - MIN, { onEnded }));
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe("DemoBanner — §5.4", () => {
  afterEach(() => window.sessionStorage.clear());
  const at = (left: number) => {
    const now = () => T0;
    return { expiresAt: T0 + left, now };
  };

  it("says the time left, the read-only line, Request access and Sign in", () => {
    render(<DemoBanner {...at(23 * HOUR + 12 * MIN)} model="read-only" access={ACCESS} />);
    expect(screen.getByText("Demo · 23 h 12 min left")).toBeInTheDocument();
    expect(screen.getByText("You’re looking at sample data. Changes aren’t possible.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request access" }).getAttribute("href")).toMatch(/^mailto:/);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows minutes only in the last hour, in the info tone until the last ten minutes", () => {
    const { container } = render(<DemoBanner {...at(50 * MIN)} model="sandbox" access={ACCESS} />);
    expect(screen.getByText("Demo · 50 min left")).toBeInTheDocument();
    expect(screen.getByText("Your own work is deleted when the demo ends.")).toBeInTheDocument();
    expect(container.firstElementChild!.className).toContain("var(--info-bg)");
  });

  it("turns to the warning tone in the last ten minutes", () => {
    const { container } = render(<DemoBanner {...at(4 * MIN)} model="read-only" access={ACCESS} />);
    expect(screen.getByText("Demo · 4 min left")).toBeInTheDocument();
    expect(container.firstElementChild!.className).toContain("var(--warning-bg)");
  });

  it("collapses to the countdown for the session, and opens again", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DemoBanner {...at(3 * HOUR)} model="read-only" access={ACCESS} />);
    const toggle = screen.getByRole("button", { name: "Demo details" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Demo details" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Request access" })).toBeNull();
    expect(screen.queryByText(/sample data/)).toBeNull();
    expect(screen.getByText("Demo · 3 h 0 min left")).toBeInTheDocument();
    unmount();

    // Another page of the same tab: still collapsed.
    render(<DemoBanner {...at(3 * HOUR)} model="read-only" access={ACCESS} />);
    expect(screen.getByRole("button", { name: "Demo details" })).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Demo details" }));
    expect(screen.getByRole("link", { name: "Request access" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem("kit.demoBanner.collapsed")).toBeNull();
  });

  it("calls onEnded at zero and says the demo has ended", () => {
    const onEnded = vi.fn();
    render(<DemoBanner {...at(0)} model="read-only" access={ACCESS} onEnded={onEnded} />);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(screen.getByText("The demo has ended")).toBeInTheDocument();
  });

  it("says plain Demo when the end cannot be read", () => {
    render(<DemoBanner expiresAt={undefined} model="read-only" access={ACCESS} />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });
});
