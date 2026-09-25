import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce, useDebouncedCallback } from "../use-debounce";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDebounce", () => {
  it("returns the first value immediately, then follows only after the value settles", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: "a" } });
    expect(result.current).toBe("a");
    rerender({ v: "ab" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: "abc" });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe("abc");
  });

  it("never lets a stale value land after a fresh one (kastlan's missing cleanup)", () => {
    const seen: string[] = [];
    function Probe({ v }: { v: string }) {
      seen.push(useDebounce(v, 100));
      return null;
    }
    const { rerender } = render(<Probe v="x" />);
    rerender(<Probe v="xy" />);
    act(() => vi.advanceTimersByTime(50));
    rerender(<Probe v="xyz" />);
    act(() => vi.advanceTimersByTime(500));
    expect(seen).not.toContain("xy");
    expect(seen.at(-1)).toBe("xyz");
  });
});

describe("useDebouncedCallback", () => {
  it("calls once with the last arguments", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 100));
    result.current(1);
    result.current(2);
    result.current(3);
    expect(fn).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("keeps its identity across renders and calls the latest fn", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useDebouncedCallback(fn, 100), {
      initialProps: { fn: first },
    });
    const before = result.current;
    rerender({ fn: second });
    expect(result.current).toBe(before);
    result.current("go");
    act(() => vi.advanceTimersByTime(100));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("go");
  });

  it("cancel drops, flush runs now, pending tells", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 100));
    result.current("a");
    expect(result.current.pending()).toBe(true);
    result.current.cancel();
    expect(result.current.pending()).toBe(false);
    act(() => vi.advanceTimersByTime(200));
    expect(fn).not.toHaveBeenCalled();

    result.current("b");
    result.current.flush();
    expect(fn).toHaveBeenCalledWith("b");
    act(() => vi.advanceTimersByTime(200));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("maxWait forces a call during a continuous stream", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 100, { maxWait: 250 }));
    for (let i = 0; i < 6; i++) {
      result.current(i);
      act(() => vi.advanceTimersByTime(50));
    }
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(4);
  });

  it("drops a pending call on unmount", () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 100));
    result.current();
    unmount();
    act(() => vi.advanceTimersByTime(200));
    expect(fn).not.toHaveBeenCalled();
  });
});
