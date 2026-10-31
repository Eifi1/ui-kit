import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

// The press-and-hold that puts DataTable's phone cards into selection mode (0.40,
// keksdose live #421). Taken over from keksdose's register list
// (frontend/src/shared/hooks/use-long-press.ts, its feedback #153) so the kit's cards
// and kk's register answer the same gesture the same way: 500 ms, an 8 px dead zone,
// cancelled by a scroll, the trailing click swallowed. Public since 0.52 (DUP-8, refactor
// audit 2026-10-30): private, it left keksdose keeping the original beside the copy.

const LONG_PRESS_MS = 500;
/** The same 8 px dead zone `useRowSwipe` locks its axis at: the press is dead by the
 *  time the swipe hook takes pointer capture on its (ancestor) layer. */
const SLOP_PX = 8;

const movedBeyondSlop = (from: { x: number; y: number }, x: number, y: number) =>
  Math.hypot(x - from.x, y - from.y) > SLOP_PX;

export interface LongPressOptions {
  /** Default `true`. Off, a press does nothing and the context menu is the browser's. */
  enabled?: boolean;
  /** How long a press is held, in ms. Default 500. */
  delay?: number;
}

export interface LongPressResult {
  handlers: {
    onPointerDown: (e: ReactPointerEvent) => void;
    onPointerMove: (e: ReactPointerEvent) => void;
    onContextMenu: (e: { preventDefault: () => void }) => void;
  };
  /** True exactly once after a long press fired: call it from an `onClickCapture` to
   *  swallow the click the browser still sends when the finger lifts. */
  consumeClick: () => boolean;
}

/**
 * A press-and-hold on a touch row that may ALSO be swipeable.
 *
 *  - The cancel listeners live on `window`: `useRowSwipe` captures the pointer on an
 *    ancestor once a drag resolves to the x axis, after which the pressed element's
 *    own pointer handlers stop firing, and a timer cancelled only there would fire
 *    mid-swipe.
 *  - A scroll cancels too (`touch-action: pan-y` hands vertical panning to the
 *    browser, which sends `pointercancel`; the capture-phase `scroll` is the backstop).
 *  - `contextmenu` is suppressed while enabled — Android fires it at ~500 ms. Pair it
 *    with `select-none [-webkit-touch-callout:none]` on the element: iOS's callout
 *    only yields to that CSS.
 */
export function useLongPress(
  onLongPress: () => void,
  { enabled = true, delay = LONG_PRESS_MS }: LongPressOptions = {},
): LongPressResult {
  const timer = useRef<number | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const fired = useRef(false);
  const teardown = useRef<(() => void) | null>(null);
  const cbRef = useRef(onLongPress);
  useEffect(() => {
    cbRef.current = onLongPress;
  });

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    teardown.current?.();
    teardown.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      // Cleared above every early return: a press whose trailing click never arrives
      // (the finger lifted over another row) would otherwise leave the latch armed,
      // and it would eat the next real tap once the card has switched modes.
      fired.current = false;
      if (!enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      cancel();
      start.current = { x: e.clientX, y: e.clientY };

      const onEnd = () => cancel();
      const onMove = (ev: PointerEvent) => {
        if (movedBeyondSlop(start.current, ev.clientX, ev.clientY)) cancel();
      };
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("scroll", onEnd, { capture: true, passive: true });
      teardown.current = () => {
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onEnd, { capture: true });
      };

      timer.current = window.setTimeout(() => {
        cancel();
        fired.current = true;
        // The swipe stages' haptic vocabulary; absent on iOS Safari.
        navigator.vibrate?.(20);
        cbRef.current();
      }, delay);
    },
    [cancel, delay, enabled],
  );

  // Also on the element: it still cancels if an ancestor stops the native event
  // before it reaches `window`.
  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (timer.current === null) return;
      if (movedBeyondSlop(start.current, e.clientX, e.clientY)) cancel();
    },
    [cancel],
  );

  const onContextMenu = useCallback(
    (e: { preventDefault: () => void }) => {
      if (enabled) e.preventDefault();
    },
    [enabled],
  );

  const consumeClick = useCallback(() => {
    if (!fired.current) return false;
    fired.current = false;
    return true;
  }, []);

  // Turned off mid-press: the armed timer still fired, entering selection mode against the
  // caller's wish and arming `consumeClick` for the next click (0.52 code review).
  useEffect(() => {
    if (!enabled) cancel();
  }, [enabled, cancel]);

  useEffect(() => cancel, [cancel]);

  return { handlers: { onPointerDown, onPointerMove, onContextMenu }, consumeClick };
}
