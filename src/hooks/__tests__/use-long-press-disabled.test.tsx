import { act, renderHook } from "@testing-library/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLongPress } from "../use-long-press";

/**
 * A press already held when the caller turns the hook off does not fire (0.52 code review,
 * src/hooks/use-long-press.ts). Nothing watched `enabled`: the armed timer still ran the
 * callback and set the latch, so a parent that left selection mode mid-press was put
 * back into it, and the next click was swallowed by `consumeClick`.
 */
describe("useLongPress turned off mid-press", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const press = { pointerType: "touch", button: 0, clientX: 10, clientY: 10 } as unknown as ReactPointerEvent;

  it("cancels the armed press: no callback, no swallowed click", () => {
    const onLongPress = vi.fn();
    const { result, rerender } = renderHook(({ enabled }) => useLongPress(onLongPress, { enabled }), {
      initialProps: { enabled: true },
    });
    act(() => result.current.handlers.onPointerDown(press));
    act(() => vi.advanceTimersByTime(200));
    rerender({ enabled: false });
    act(() => vi.advanceTimersByTime(600));
    expect(onLongPress).not.toHaveBeenCalled();
    expect(result.current.consumeClick()).toBe(false);
  });

  it("still fires a press held while it stays on", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));
    act(() => result.current.handlers.onPointerDown(press));
    act(() => vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(result.current.consumeClick()).toBe(true);
  });
});
