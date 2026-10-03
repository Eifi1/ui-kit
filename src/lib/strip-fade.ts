import { useLayoutEffect, useState, type RefObject } from "react";

// How far the fade at a scrolled strip's cut edge reaches, and how much room a tab
// brought into view keeps from that edge so the fade never lies on top of it.
export const TAB_FADE_PX = 24;

/**
 * Shared by Tabs' strip, AppShell's scrolling phone sub-nav and (0.24) ColumnRoleTable's
 * preview; internal, not part of the package's surface.
 *
 * Which ends of a sideways-scrolling strip have tabs cut off behind them, as the
 * `mask-image` that fades those ends out — or `undefined` while everything fits.
 *
 * A strip that overflowed used to stop dead at its edge: the last tab sliced through
 * mid-word, and nothing on a phone (whose scrollbars are overlays that only show
 * while you drag) said there was more to reach. A fade is the cue — the letters
 * thin out rather than end — and it is measured, not assumed, so a strip that fits
 * is painted exactly as before. Physical `left`/`right` in the gradient, because
 * `mask-image` has no logical directions; the reading direction is read from the
 * element, and `scrollLeft` is a magnitude here because an RTL strip counts it
 * negative from the start edge.
 */
export function useStripFade(
  ref: RefObject<HTMLElement | null>,
): { mask: string | undefined; overflow: "start" | "end" | "both" | undefined } {
  const [edges, setEdges] = useState({ left: false, right: false, rtl: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const hidden = el.scrollWidth - el.clientWidth;
      const scrolled = Math.abs(el.scrollLeft);
      const rtl = getComputedStyle(el).direction === "rtl";
      const atStart = scrolled > 1;
      const atEnd = hidden - scrolled > 1;
      const left = rtl ? atEnd : atStart;
      const right = rtl ? atStart : atEnd;
      setEdges((prev) =>
        prev.left === left && prev.right === right && prev.rtl === rtl ? prev : { left, right, rtl },
      );
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    // The tabs, too: a label or a badge that grows changes the overflow without
    // resizing the strip's own box.
    for (const child of Array.from(el.children)) observer?.observe(child);
    return () => {
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  });
  if (!edges.left && !edges.right) return { mask: undefined, overflow: undefined };
  const l = edges.left ? `transparent, #000 ${TAB_FADE_PX}px` : "#000";
  const r = edges.right ? `#000 calc(100% - ${TAB_FADE_PX}px), transparent` : "#000";
  const rtl = edges.rtl;
  const start = rtl ? edges.right : edges.left;
  const end = rtl ? edges.left : edges.right;
  return {
    mask: `linear-gradient(to right, ${l}, ${r})`,
    overflow: start && end ? "both" : start ? "start" : "end",
  };
}

/**
 * Scroll `item` into view inside `strip` — the strip only (`scrollBy` on it, never
 * `scrollIntoView`, which would scroll the page too) — far enough to clear the fade.
 * A no-op when the strip fits or the item is already clear of both edges.
 */
export function scrollIntoStrip(strip: HTMLElement, item: HTMLElement): void {
  if (strip.scrollWidth <= strip.clientWidth) return;
  const s = strip.getBoundingClientRect();
  const t = item.getBoundingClientRect();
  const delta =
    t.left < s.left + TAB_FADE_PX
      ? t.left - s.left - TAB_FADE_PX
      : t.right > s.right - TAB_FADE_PX
        ? t.right - s.right + TAB_FADE_PX
        : 0;
  if (delta !== 0) strip.scrollBy({ left: delta });
}
