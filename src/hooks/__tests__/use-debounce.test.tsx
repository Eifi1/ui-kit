import { useEffect } from "react";
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

  it("without a key, re-arms on a new identity with the same content, as it always has", () => {
    const first = { q: "a" };
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 100), { initialProps: { v: first } });
    const second = { q: "b" };
    rerender({ v: second });
    act(() => vi.advanceTimersByTime(60));
    // The same content as `second`, under a new identity: the wait starts over.
    const third = { q: "b" };
    rerender({ v: third });
    act(() => vi.advanceTimersByTime(60));
    expect(result.current).toBe(first);
    act(() => vi.advanceTimersByTime(40));
    // The newest object is what settles.
    expect(result.current).toBe(third);
  });
});

describe("useDebounce with a key (KS U9)", () => {
  type Body = { kp: number };
  const keyed = ({ v }: { v: Body }) => useDebounce(v, 100, { key: JSON.stringify(v) });

  it("does not re-arm on a new identity under the same key, and settles on the object the key came with", () => {
    const first = { kp: 1 };
    const { result, rerender } = renderHook(keyed, { initialProps: { v: first } });
    const second = { kp: 2 };
    rerender({ v: second });
    act(() => vi.advanceTimersByTime(60));
    // Rebuilt in render, as every Kurvenschmiede caller builds its body: not news.
    rerender({ v: { kp: 2 } });
    act(() => vi.advanceTimersByTime(40));
    // 100 ms after the KEY changed, not after the last object arrived.
    expect(result.current).toBe(second);

    // And it keeps that identity for as long as the key holds — what a query key needs.
    rerender({ v: { kp: 2 } });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(second);
  });

  it("re-arms when the key changes", () => {
    const first = { kp: 1 };
    const { result, rerender } = renderHook(keyed, { initialProps: { v: first } });
    rerender({ v: { kp: 2 } });
    act(() => vi.advanceTimersByTime(60));
    const third = { kp: 3 };
    rerender({ v: third });
    act(() => vi.advanceTimersByTime(60));
    expect(result.current).toBe(first);
    act(() => vi.advanceTimersByTime(40));
    expect(result.current).toBe(third);
  });

  it("settles on nothing new when the key comes back before the wait is over (A → B → A)", () => {
    const first = { kp: 1 };
    const { result, rerender } = renderHook(keyed, { initialProps: { v: first } });
    rerender({ v: { kp: 2 } });
    act(() => vi.advanceTimersByTime(50));
    rerender({ v: { kp: 1 } });
    act(() => vi.advanceTimersByTime(500));
    // The caller's own object, not a second one holding the first one's numbers.
    expect(result.current).toBe(first);
  });

  it("takes the caller's own key — a number here — not the content", () => {
    // Kurvenschmiede's control page keys a body it cannot afford to stringify on what
    // its signal IS; samples that change under the same key are not the key's business.
    const { result, rerender } = renderHook(
      ({ id, samples }: { id: number; samples: number[] }) => useDebounce({ samples }, 100, { key: id }),
      { initialProps: { id: 1, samples: [0, 1] } },
    );
    const before = result.current;
    rerender({ id: 1, samples: [0, 2] });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(before);
    rerender({ id: 2, samples: [0, 3] });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toEqual({ samples: [0, 3] });
  });

  it("lets a component that builds its value in render settle once and then stop", () => {
    // KS U9's metronome: the settled value re-renders the component, the component
    // builds a new object, and a debounce on identity fires again every `ms` with nobody
    // typing. Counted in commits, since a hook that settles right and keeps rendering is
    // exactly what shipped.
    let commits = 0;
    function Screen({ kp }: { kp: number }) {
      const body = { controller: { kp } };
      const settled = useDebounce(body, 100, { key: JSON.stringify(body) });
      useEffect(() => {
        commits += 1;
      });
      return <output>{settled.controller.kp}</output>;
    }
    const { container, rerender } = render(<Screen kp={1} />);
    rerender(<Screen kp={2} />);
    act(() => vi.advanceTimersByTime(100));
    expect(container.textContent).toBe("2");
    const landed = commits;
    act(() => vi.advanceTimersByTime(1_000));
    expect(commits).toBe(landed);
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
