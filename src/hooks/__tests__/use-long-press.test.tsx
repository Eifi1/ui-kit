import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useLongPress } from "../use-long-press";

/**
 * The gesture as a row answers it — keksdose's own suite for the hook, taken over when
 * keksdose deleted its copy for the kit's (0.53, keksdose after 0.52: its 0511aac2
 * dropped the hook AND these 8 cases, so the latch reset of its live #153 rested on
 * nothing here but the `enabled` pair in use-long-press-disabled.test.tsx). Plus the
 * kit's own additions to the hook: the `scroll` backstop and `delay`.
 */

/** A minimal stand-in for a swipeable row: one pressable element wired to the hook,
 *  with the same onClickCapture swallow the real row uses. A `<button>`, where keksdose's
 *  was a `div` with `role="button"`: the kit's lint wants a keyboard handler on that, and
 *  the gesture is a pointer's either way. */
function Row({
  onLongPress,
  onClick,
  enabled,
  delay,
}: {
  onLongPress: () => void;
  onClick?: () => void;
  enabled?: boolean;
  delay?: number;
}) {
  const longPress = useLongPress(onLongPress, { enabled, delay });
  return (
    <button
      type="button"
      onClick={onClick}
      onClickCapture={(e) => {
        if (!longPress.consumeClick()) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      {...longPress.handlers}
    >
      row
    </button>
  );
}

/** jsdom implements no PointerEvent constructor at all, so pointer events have to be
 *  forged from MouseEvent (which does carry button/clientX/clientY) with the
 *  pointer-only fields defined on top. */
function pointerEvent(type: string, init: MouseEventInit & { pointerType?: string } = {}) {
  const { pointerType = "touch", ...mouseInit } = init;
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, ...mouseInit });
  Object.defineProperty(ev, "pointerType", { value: pointerType });
  Object.defineProperty(ev, "pointerId", { value: 1 });
  return ev;
}

const press = (el: Element, x = 10, y = 10) =>
  fireEvent(el, pointerEvent("pointerdown", { button: 0, clientX: x, clientY: y }));

describe("useLongPress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires after the hold delay", () => {
    const onLongPress = vi.fn();
    render(<Row onLongPress={onLongPress} />);
    press(screen.getByRole("button"));
    expect(onLongPress).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("holds for `delay` when one is given", () => {
    const onLongPress = vi.fn();
    render(<Row onLongPress={onLongPress} delay={800} />);
    press(screen.getByRole("button"));
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(300));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("cancels once the finger leaves the 8px dead zone", () => {
    const onLongPress = vi.fn();
    render(<Row onLongPress={onLongPress} />);
    press(screen.getByRole("button"));
    // Beyond the slop the gesture is a swipe or a scroll, not a press. Dispatched on
    // WINDOW because useRowSwipe captures the pointer on an ancestor once it locks the
    // x axis, which re-targets every later move away from the row.
    act(() => {
      window.dispatchEvent(pointerEvent("pointermove", { clientX: 40, clientY: 12 }));
    });
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("does not fire on a short tap", () => {
    const onLongPress = vi.fn();
    render(<Row onLongPress={onLongPress} />);
    press(screen.getByRole("button"));
    act(() => void vi.advanceTimersByTime(200));
    act(() => {
      window.dispatchEvent(pointerEvent("pointerup"));
    });
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels when the browser claims the gesture for a scroll", () => {
    const onLongPress = vi.fn();
    render(<Row onLongPress={onLongPress} />);
    press(screen.getByRole("button"));
    // `touch-action: pan-y` on the swipe layer makes this the guaranteed signal.
    act(() => {
      window.dispatchEvent(pointerEvent("pointercancel"));
    });
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels on a scroll anywhere, the backstop when no pointercancel comes", () => {
    const onLongPress = vi.fn();
    render(<Row onLongPress={onLongPress} />);
    press(screen.getByRole("button"));
    // A scroll does not bubble: the hook listens in the capture phase on window, so a
    // scrolling list deep in the page reaches it.
    act(() => {
      document.body.dispatchEvent(new Event("scroll"));
    });
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("swallows the trailing click exactly once after firing", () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    render(<Row onLongPress={onLongPress} onClick={onClick} />);
    const row = screen.getByRole("button");
    press(row);
    act(() => void vi.advanceTimersByTime(500));
    // The browser still dispatches a click after the hold; without the swallow it would
    // immediately undo whatever the long press just did.
    fireEvent.click(row);
    expect(onClick).not.toHaveBeenCalled();
    // …and only that one. The next tap is a real tap again.
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not eat the next tap when the trailing click never arrived (keksdose #153)", () => {
    const onLongPress = vi.fn();
    const onClick = vi.fn();
    const { rerender } = render(<Row onLongPress={onLongPress} onClick={onClick} />);
    const row = screen.getByRole("button");
    press(row);
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).toHaveBeenCalledTimes(1);
    // No click follows the hold: the finger lifted over a NEIGHBOURING row, so the
    // browser dispatched it on the common ancestor and this row's capture handler never
    // ran — the swallow latch is still armed.
    // Firing put the list into selection mode, which disables the gesture per row…
    rerender(<Row onLongPress={onLongPress} onClick={onClick} enabled={false} />);
    // …and the user's next genuine tap (pointerdown, then click) must still count.
    press(row);
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", () => {
    const onLongPress = vi.fn();
    render(<Row onLongPress={onLongPress} enabled={false} />);
    press(screen.getByRole("button"));
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("ignores a non-primary mouse button", () => {
    const onLongPress = vi.fn();
    render(<Row onLongPress={onLongPress} />);
    fireEvent(
      screen.getByRole("button"),
      pointerEvent("pointerdown", { pointerType: "mouse", button: 2, clientX: 10, clientY: 10 }),
    );
    act(() => void vi.advanceTimersByTime(500));
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
