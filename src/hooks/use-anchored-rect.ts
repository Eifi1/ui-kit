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
      if (r) {
        setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
      }
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
