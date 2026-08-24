import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

/** The subset of an element's viewport rect used for anchored positioning. */
export interface AnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

function sameRect(a: AnchorRect | null, b: AnchorRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.right === b.right &&
    a.bottom === b.bottom &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * Tracks an anchor element's viewport rect while `open`, re-measuring on scroll
 * (capture phase, so nested scroll containers are caught too) and resize, and
 * returning null when closed or unmeasured. Callers derive their own panel
 * position from the rect — this hook owns only the measure + listener lifecycle
 * that every portalled, position:fixed popover/flyout otherwise re-implements.
 *
 * Measured in a layout effect so the position is ready before paint (no flicker
 * on open).
 */
export function useAnchoredRect<T extends HTMLElement>(
  ref: RefObject<T | null>,
  open: boolean,
): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when closed
      setRect(null);
      return;
    }
    const measure = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const next = {
        top: r.top,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
      // Only publish a rect that actually MOVED. Every measurement allocates a fresh
      // object and React compares state by identity, so an unguarded `setRect` here
      // re-rendered the anchored panel on every scroll and resize event whether or not
      // the anchor had moved — and this listens on the capture phase, so that is every
      // ancestor scroll container, roughly per frame through a momentum scroll.
      // `tour.tsx` already does exactly this on the same problem.
      setRect((prev) => (sameRect(prev, next) ? prev : next));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, ref]);

  return rect;
}
