import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

// ---------- Mobile swipe gesture ----------
//
// Multi-stage half-swipe affordance (feedback #103, extended #9): drag a row
// horizontally to commit an action; how FAR you drag picks which action, so a
// single gesture can walk a chain of increasingly involved outcomes (e.g. on a
// cleared row, a short left-swipe un-clears it, further un-accepts it, further
// still deletes it). We track via Pointer Events, lock the gesture to the X axis
// only after the user has moved more horizontally than vertically, and clamp the
// drag to `maxDrag` so the row can't be pulled across the whole viewport.
//
// Each side is an ordered list of stages sorted by ascending `threshold` (px of
// drag magnitude). On release the LAST stage whose threshold the drag passed is
// committed; while dragging, `armedRightIndex`/`armedLeftIndex` report which
// stage is currently armed so the reveal panel can preview its label/colour.

export interface SwipeStage {
  /** Drag magnitude (px) at which this stage arms. Stages must be sorted ascending. */
  threshold: number;
  onCommit: () => void;
}

/** Below this much horizontal travel a gesture is treated as a clumsy click, not
 *  a swipe: the row still follows the pointer, but the click that follows is NOT
 *  swallowed. Without it, `swallowClick` was set the instant the axis lock
 *  resolved to "x" — 8px — so a slightly-draggy click on a control INSIDE a
 *  swipeable row silently did nothing, which is a poor trade on rows whose
 *  content is itself interactive (Keksdose feedback #144: budget rows edit their
 *  assigned amount and their name by clicking them). */
const CLICK_SWALLOW_PX = 24;

/** How far a drag may travel toward a side that has no actions. Zero — the old
 *  behaviour — makes the row completely inert in that direction, which reads as
 *  "this row is not swipeable at all" rather than "there is nothing on this
 *  side"; that is exactly the report behind Keksdose feedback #144 ("tried, but
 *  there is nothing swipeable"). A short, resisted travel that snaps back is the
 *  conventional answer and the one that answers the question the drag asked. */
const EMPTY_SIDE_RUBBER_PX = 28;

/** Resistance applied past a bound: the row keeps moving, at a fraction of the
 *  pointer, so the gesture feels answered without ever looking committed. */
function rubberBand(overshoot: number, limit: number): number {
  const eased = limit * (1 - Math.exp(-Math.abs(overshoot) / limit));
  return Math.sign(overshoot) * eased;
}

export interface RowSwipeOptions {
  enabled: boolean;
  // Ordered stages per direction (ascending threshold). A longer drag commits a
  // later — usually more involved — stage. An empty/undefined side means that
  // direction rubber-bands a little and snaps back, committing nothing.
  leftStages?: SwipeStage[];
  rightStages?: SwipeStage[];
  maxDrag?: number;
}

export interface RowSwipeReturn {
  dx: number;
  dragging: boolean;
  /** Highest armed stage index for the current drag (-1 when none armed). */
  armedRightIndex: number;
  armedLeftIndex: number;
  handlers: {
    onPointerDown: (e: PointerEvent) => void;
    onPointerMove: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
    onPointerCancel: (e: PointerEvent) => void;
  };
  consumeClick: () => boolean;
}

/** The highest index whose threshold the magnitude has reached (-1 if none).
 *  Stages are ascending, so we can stop at the first one not yet reached. */
function lastArmed(stages: SwipeStage[] | undefined, magnitude: number): number {
  if (!stages) return -1;
  let idx = -1;
  for (let i = 0; i < stages.length; i++) {
    if (magnitude >= stages[i].threshold) idx = i;
    else break;
  }
  return idx;
}

export function useRowSwipe({
  enabled,
  leftStages,
  rightStages,
  maxDrag = 252,
}: RowSwipeOptions): RowSwipeReturn {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"none" | "x" | "y">("none");
  const pointerId = useRef<number | null>(null);
  const dxRef = useRef(0);
  // True after the user has dragged horizontally far enough that the following
  // synthetic click should be swallowed (so a swipe doesn't also expand the row).
  const swallowClick = useRef(false);

  // Keep the latest stage arrays in refs so the memoised pointer handlers always
  // commit against the current plan rather than a stale closure — the arrays and
  // their onCommit closures are rebuilt on every render. Written in an effect (not
  // during render) so it satisfies react-hooks/refs; pointer events fire after the
  // commit, so the refs are always current by the time a gesture reads them.
  const leftRef = useRef(leftStages);
  const rightRef = useRef(rightStages);
  useEffect(() => {
    leftRef.current = leftStages;
    rightRef.current = rightStages;
  });

  const reset = useCallback(() => {
    setDx(0);
    dxRef.current = 0;
    setDragging(false);
    startX.current = 0;
    startY.current = 0;
    axis.current = "none";
    pointerId.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerId.current = e.pointerId;
      startX.current = e.clientX;
      startY.current = e.clientY;
      axis.current = "none";
      swallowClick.current = false;
      setDragging(true);
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (pointerId.current !== e.pointerId) return;
      const rawDx = e.clientX - startX.current;
      const rawDy = e.clientY - startY.current;
      if (axis.current === "none") {
        if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8) return;
        axis.current = Math.abs(rawDx) > Math.abs(rawDy) ? "x" : "y";
        if (axis.current === "x") {
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        } else {
          // Vertical scroll wins — bail out of the gesture entirely.
          reset();
          return;
        }
      }
      if (axis.current !== "x") return;
      if (Math.abs(rawDx) >= CLICK_SWALLOW_PX) swallowClick.current = true;
      // Toward a side that HAS actions the row tracks the pointer up to maxDrag.
      // Toward an empty one it rubber-bands a little and snaps back on release —
      // inert would be indistinguishable from "not swipeable".
      const hasLeft = (leftRef.current?.length ?? 0) > 0;
      const hasRight = (rightRef.current?.length ?? 0) > 0;
      let next: number;
      if (rawDx > 0) {
        next = hasRight ? Math.min(maxDrag, rawDx) : rubberBand(rawDx, EMPTY_SIDE_RUBBER_PX);
      } else if (rawDx < 0) {
        next = hasLeft ? Math.max(-maxDrag, rawDx) : rubberBand(rawDx, EMPTY_SIDE_RUBBER_PX);
      } else {
        next = 0;
      }
      dxRef.current = next;
      setDx(next);
    },
    [maxDrag, reset],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (pointerId.current !== e.pointerId) return;
      const finalDx = dxRef.current;
      const wasDragX = axis.current === "x";
      reset();
      if (!wasDragX) return;
      if (finalDx > 0) {
        const i = lastArmed(rightRef.current, finalDx);
        if (i >= 0) rightRef.current![i].onCommit();
      } else if (finalDx < 0) {
        const i = lastArmed(leftRef.current, -finalDx);
        if (i >= 0) leftRef.current![i].onCommit();
      }
    },
    [reset],
  );

  const onPointerCancel = useCallback(() => reset(), [reset]);

  const consumeClick = useCallback(() => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    dx,
    dragging,
    armedRightIndex: lastArmed(rightStages, dx > 0 ? dx : 0),
    armedLeftIndex: lastArmed(leftStages, dx < 0 ? -dx : 0),
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
    consumeClick,
  };
}
