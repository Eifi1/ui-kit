import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Calls `handler` on an Escape keydown while `enabled`. A single document-level
 * listener owns the "press Escape to dismiss" behaviour that popovers, flyouts
 * and menus otherwise each re-implement. `handler` is read live at event time,
 * so it need not be memoised and the listener only re-subscribes when `enabled`
 * flips (typically the open/closed transition).
 */
export function useEscapeKey(handler: () => void, enabled = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handlerRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/**
 * Calls `handler` on a mousedown that lands outside every supplied element,
 * while `enabled` — the outside-click-to-close half of the same dismissal story.
 * Pass one ref or several (trigger + panel); a press inside any of them is
 * ignored. Refs and `handler` are read live, so an inline `[triggerRef, panelRef]`
 * array is fine and won't churn the listener.
 */
export function useOutsideClick(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled = true,
): void {
  const refsRef = useRef(refs);
  refsRef.current = refs;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const list = Array.isArray(refsRef.current) ? refsRef.current : [refsRef.current];
      for (const r of list) {
        if (r.current?.contains(target)) return;
      }
      handlerRef.current();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [enabled]);
}
