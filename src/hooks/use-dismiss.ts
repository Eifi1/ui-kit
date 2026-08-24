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
  // Written in an effect, not during render, so it satisfies react-hooks/refs: a
  // render that React starts and then discards — a transition, a Suspense retry —
  // would otherwise leave this holding a handler from a tree that never committed,
  // and the document listener below would go on to call it. Keydown events fire
  // after the commit, so the ref is always current by the time one arrives.
  useEffect(() => {
    handlerRef.current = handler;
  });
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
 * Calls `handler` on a press that lands outside every supplied element, while
 * `enabled` — the outside-click-to-close half of the same dismissal story. Pass one
 * ref or several (trigger + panel); a press inside any of them is ignored. Refs and
 * `handler` are read live, so an inline `[triggerRef, panelRef]` array is fine and
 * won't churn the listener.
 *
 * **`pointerdown`, not `mousedown`** — one event covering mouse, touch and pen.
 * This listened for `mousedown` alone, which on a touch platform is a SYNTHESISED
 * event: the browser emits it for most taps, which is why nothing obviously broke,
 * but the synthesis is not guaranteed. A tap that begins a scroll, or one that lands
 * on an element which preventDefaults the touch sequence, may never produce one — and
 * on a phone-first PWA whose pickers, menus and flyouts all dismiss through this hook,
 * inheriting that is worse than choosing it.
 *
 * The one behaviour this changes deliberately: a touch-drag that starts outside an
 * open panel now dismisses it at touch-down, where before it did not dismiss at all
 * (a drag synthesises no mousedown). That matches every other platform surface, and
 * the anchored panels re-measure on scroll precisely because the page moves under
 * them.
 */
export function useOutsideClick(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  handler: () => void,
  enabled = true,
): void {
  const refsRef = useRef(refs);
  const handlerRef = useRef(handler);
  // In an effect rather than during render — see the note on useEscapeKey.
  useEffect(() => {
    refsRef.current = refs;
    handlerRef.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = (e: Event) => {
      const target = e.target as Node;
      const list = Array.isArray(refsRef.current) ? refsRef.current : [refsRef.current];
      for (const r of list) {
        if (r.current?.contains(target)) return;
      }
      handlerRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [enabled]);
}
