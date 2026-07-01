import { useEffect } from "react";

/**
 * Lock background scrolling while `locked` is true, restoring the prior value on
 * unlock/unmount. For the hand-rolled bottom-sheets that don't go through the
 * {@link Modal} component, so they don't each re-implement the same effect.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
