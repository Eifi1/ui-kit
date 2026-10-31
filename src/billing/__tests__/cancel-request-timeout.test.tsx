import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCancelRequest } from "../cancel-request";

/**
 * `useCancelRequest` waits for the provider's webhook for so long and no longer
 * (refactor audit 2026-10-30, FLW-6).
 *
 * It had no bound: a webhook that never landed kept `waiting` true for as long as the
 * page was open, so kastlan re-read the billing overview every 3 s — keeping a Cloud Run
 * instance awake — and the plan line said "Cancels on …" for a row that never moved.
 * `useCheckoutProcessing` stops after 10 minutes for exactly this reason.
 */

const MINUTE = 60_000;

/** The page's order, as kastlan writes it: the request, the overview, the view. */
function usePage(row: boolean, timeoutMs?: number) {
  const request = useCancelRequest({ timeoutMs });
  return { waiting: request.waiting, ...request.view(row) };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useCancelRequest's bound", () => {
  it("drops a request the row never answered after 10 minutes, and shows the row as it is", () => {
    const { result } = renderHook(() => usePage(false));
    act(() => result.current.noteAsked());
    expect(result.current).toMatchObject({ requested: "cancel", cancelScheduled: true, waiting: true });

    act(() => void vi.advanceTimersByTime(10 * MINUTE - 1));
    expect(result.current.waiting).toBe(true);
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({ requested: null, cancelScheduled: false, waiting: false });
  });

  it("takes its own timeoutMs", () => {
    const { result } = renderHook(() => usePage(true, MINUTE));
    act(() => result.current.noteAsked());
    expect(result.current).toMatchObject({ requested: "resume", cancelScheduled: false, waiting: true });
    act(() => void vi.advanceTimersByTime(MINUTE));
    expect(result.current).toMatchObject({ requested: null, cancelScheduled: true, waiting: false });
  });

  it("gives each ask its own clock", () => {
    const { result, rerender } = renderHook(({ row }) => usePage(row), { initialProps: { row: false } });
    act(() => result.current.noteAsked());
    act(() => void vi.advanceTimersByTime(5 * MINUTE));
    // The webhook landed; the next ask, a minute later, is a new request.
    rerender({ row: true });
    expect(result.current.waiting).toBe(false);
    act(() => void vi.advanceTimersByTime(MINUTE));
    act(() => result.current.noteAsked());
    act(() => void vi.advanceTimersByTime(9 * MINUTE));
    expect(result.current).toMatchObject({ requested: "resume", waiting: true });
    act(() => void vi.advanceTimersByTime(MINUTE));
    expect(result.current.waiting).toBe(false);
  });
});
