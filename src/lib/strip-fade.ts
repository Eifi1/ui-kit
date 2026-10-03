import { useCallback, useLayoutEffect, useState } from "react";
import type { CSSProperties, FocusEvent, RefObject } from "react";

// How far the fade at a scrolled strip's cut edge reaches, and how much room a tab
// brought into view keeps from that edge so the fade never lies on top of it.
export const TAB_FADE_PX = 24;

/**
 * What {@link useStripFade} can be asked to do beyond the strip it was written for.
 */
export interface StripFadeOptions {
  /**
   * Keep the strip's own SCROLLBARS out of the fade (0.25, for the kit Table's and
   * DataTable's `edgeFade`). A `mask-image` masks everything the element paints, and
   * a classic scrollbar is painted by the element: on a desktop with always-visible
   * scrollbars, a DataTable's vertical scrollbar sits at the inline end, inside the
   * very band that fades whenever columns are hidden that way — it all but vanished,
   * and the horizontal one lost its ends. With this set, the mask is opaque over
   * each scrollbar (measured: `offsetWidth − clientWidth − borders`, its side read
   * off `clientLeft`, which is where an RTL scrollbar on the left shows up) and the
   * fade runs inside it, from the content's own edge. Where scrollbars take no room
   * — phones, overlay scrollbars, `scrollbar-width: none` — nothing changes: the
   * mask is the plain one. Off by default, so Tabs and AppShell paint exactly as
   * they did.
   */
  spareScrollbars?: boolean;
}

/** The room the classic scrollbars of a strip take, and the borders beside them. */
export interface StripScrollbars {
  /** Vertical scrollbar on the left (RTL in Chromium and Firefox), in px. */
  left: number;
  /** Vertical scrollbar on the right, in px. */
  right: number;
  /** Horizontal scrollbar, in px. */
  bottom: number;
  /** The border widths outside each of them, in px — the fade still covers a border. */
  borderLeft: number;
  borderRight: number;
  borderBottom: number;
}

const NO_SCROLLBARS: StripScrollbars = {
  left: 0,
  right: 0,
  bottom: 0,
  borderLeft: 0,
  borderRight: 0,
  borderBottom: 0,
};

// A scrollbar is never this thin; anything under it is sub-pixel rounding between
// `offsetWidth` and `clientWidth`, not a scrollbar.
const MIN_SCROLLBAR_PX = 2;

function measureScrollbars(el: HTMLElement, style: CSSStyleDeclaration): StripScrollbars {
  const px = (value: string) => parseFloat(value) || 0;
  const borderLeft = px(style.borderLeftWidth);
  const borderRight = px(style.borderRightWidth);
  const borderTop = px(style.borderTopWidth);
  const borderBottom = px(style.borderBottomWidth);
  const vertical = el.offsetWidth - el.clientWidth - borderLeft - borderRight;
  const horizontal = el.offsetHeight - el.clientHeight - borderTop - borderBottom;
  const onLeft = el.clientLeft - borderLeft >= MIN_SCROLLBAR_PX;
  const v = vertical >= MIN_SCROLLBAR_PX ? Math.round(vertical) : 0;
  return {
    left: onLeft ? v : 0,
    right: onLeft ? 0 : v,
    bottom: horizontal >= MIN_SCROLLBAR_PX ? Math.round(horizontal) : 0,
    borderLeft,
    borderRight,
    borderBottom,
  };
}

const sameScrollbars = (a: StripScrollbars, b: StripScrollbars) =>
  a.left === b.left &&
  a.right === b.right &&
  a.bottom === b.bottom &&
  a.borderLeft === b.borderLeft &&
  a.borderRight === b.borderRight &&
  a.borderBottom === b.borderBottom;

/**
 * The `mask-image` for a strip whose `left` and/or `right` (physical) edge has
 * content behind it, or `undefined` when neither has. Pure, for {@link useStripFade}
 * and its tests; `scrollbars` (see {@link StripFadeOptions.spareScrollbars}) keeps
 * those bands opaque and starts the fade at the content's edge instead of the box's.
 */
export function stripFadeMask(
  edges: { left: boolean; right: boolean },
  scrollbars: StripScrollbars = NO_SCROLLBARS,
): string | undefined {
  if (!edges.left && !edges.right) return undefined;
  const F = TAB_FADE_PX;
  const sb = scrollbars;
  // The plain mask, as Tabs and AppShell have always drawn it.
  let l = edges.left ? `transparent, #000 ${F}px` : "#000";
  let r = edges.right ? `#000 calc(100% - ${F}px), transparent` : "#000";
  const fromRight = (px: number) => (px === 0 ? "100%" : `calc(100% - ${px}px)`);
  // A vertical scrollbar on a FADED side: the border outside it fades with the rest
  // of that edge, the scrollbar itself stays whole, and the fade starts inside it.
  if (edges.left && sb.left > 0) {
    const inner = sb.borderLeft + sb.left;
    const border = sb.borderLeft > 0 ? `transparent ${sb.borderLeft}px, ` : "";
    l = `${border}#000 ${sb.borderLeft}px, #000 ${inner}px, transparent ${inner}px, #000 ${inner + F}px`;
  }
  if (edges.right && sb.right > 0) {
    const inner = sb.borderRight + sb.right;
    const border =
      sb.borderRight > 0 ? `, #000 ${fromRight(sb.borderRight)}, transparent ${fromRight(sb.borderRight)}` : "";
    r = `#000 ${fromRight(inner + F)}, transparent ${fromRight(inner)}, #000 ${fromRight(inner)}${border}`;
  }
  const across = `linear-gradient(to right, ${l}, ${r})`;
  if (sb.bottom <= 0) return across;
  // The horizontal scrollbar, as a second layer: layers ADD, so this band is opaque
  // over its whole width whatever the first layer says there.
  const top = sb.borderBottom + sb.bottom;
  const border = sb.borderBottom > 0 ? `transparent ${sb.borderBottom}px, ` : "";
  return `${across}, linear-gradient(to top, ${border}#000 ${sb.borderBottom}px, #000 ${top}px, transparent ${top}px)`;
}

/**
 * Shared by Tabs' strip, AppShell's scrolling phone sub-nav, (0.24) ColumnRoleTable's
 * preview and (0.25) Table's and DataTable's `edgeFade`; internal, not part of the
 * package's surface.
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
  options?: StripFadeOptions,
): { mask: string | undefined; overflow: "start" | "end" | "both" | undefined } {
  const spare = options?.spareScrollbars === true;
  const [edges, setEdges] = useState({ left: false, right: false, rtl: false, scrollbars: NO_SCROLLBARS });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const hidden = el.scrollWidth - el.clientWidth;
      const scrolled = Math.abs(el.scrollLeft);
      const style = getComputedStyle(el);
      const rtl = style.direction === "rtl";
      const atStart = scrolled > 1;
      const atEnd = hidden - scrolled > 1;
      const left = rtl ? atEnd : atStart;
      const right = rtl ? atStart : atEnd;
      const scrollbars = spare && (left || right) ? measureScrollbars(el, style) : NO_SCROLLBARS;
      setEdges((prev) =>
        prev.left === left && prev.right === right && prev.rtl === rtl && sameScrollbars(prev.scrollbars, scrollbars)
          ? prev
          : { left, right, rtl, scrollbars },
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
  const mask = stripFadeMask(edges, edges.scrollbars);
  if (mask === undefined) return { mask: undefined, overflow: undefined };
  const rtl = edges.rtl;
  const start = rtl ? edges.right : edges.left;
  const end = rtl ? edges.left : edges.right;
  return {
    mask,
    overflow: start && end ? "both" : start ? "start" : "end",
  };
}

/**
 * Scroll `item` into view inside `strip` — the strip only (`scrollBy` on it, never
 * `scrollIntoView`, which would scroll the page too) — far enough to clear the fade.
 * A no-op when the strip fits or the item is already clear of both edges.
 *
 * The edges are the strip's CONTENT edges (0.25: `clientLeft` + `clientWidth`), not
 * its box's: a vertical scrollbar or a side border takes room the item can never be
 * scrolled into, and {@link StripFadeOptions.spareScrollbars} starts the fade inside
 * the scrollbar. A Tabs strip has neither, so its edges are where they were.
 */
export function scrollIntoStrip(strip: HTMLElement, item: HTMLElement): void {
  if (strip.scrollWidth <= strip.clientWidth) return;
  const box = strip.getBoundingClientRect();
  const left = box.left + strip.clientLeft;
  const right = left + strip.clientWidth;
  const t = item.getBoundingClientRect();
  const delta =
    t.left < left + TAB_FADE_PX
      ? t.left - left - TAB_FADE_PX
      : t.right > right - TAB_FADE_PX
        ? t.right - right + TAB_FADE_PX
        : 0;
  if (delta !== 0) strip.scrollBy({ left: delta });
}

/**
 * Focus landed on `focused` inside a faded table's scroller (0.25, Table and
 * DataTable `edgeFade`): bring it clear of the fade. The browser's own focus scroll
 * stops at the scroller's edge — under the fade, where a focused control is a few
 * faint pixels. Its whole CELL is brought clear when the cell fits between the two
 * fades (a select that fills its header, as ColumnRoleTable's do, then keeps the
 * cell's padding round it too); a cell wider than that — a long note with a link at
 * its end — would be brought in by its start and leave the link out, so then the
 * focused element itself is what is scrolled clear.
 */
export function scrollFocusIntoStrip(strip: HTMLElement, focused: HTMLElement): void {
  if (focused === strip || !strip.contains(focused)) return;
  const cell = focused.closest<HTMLElement>("td, th");
  const rect = cell && strip.contains(cell) ? cell.getBoundingClientRect() : null;
  const fits = rect !== null && rect.right - rect.left <= strip.clientWidth - 2 * TAB_FADE_PX;
  scrollIntoStrip(strip, fits && cell ? cell : focused);
}

/** `edgeFade` off: {@link useStripFade} gets no element and measures nothing. */
const NO_ELEMENT: RefObject<HTMLElement | null> = { current: null };
const SPARE_SCROLLBARS: StripFadeOptions = { spareScrollbars: true };

/** `:focus-visible`, or `false` where the engine cannot say. */
function focusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

/** What {@link useEdgeFade} puts on the scroller; every field `undefined` while off. */
export interface EdgeFadeProps {
  "data-overflow": "start" | "end" | "both" | undefined;
  style: CSSProperties | undefined;
  onFocus: ((event: FocusEvent<HTMLElement>) => void) | undefined;
  onBlur: ((event: FocusEvent<HTMLElement>) => void) | undefined;
}

/**
 * Table's and DataTable's `edgeFade` on their scroller (0.25; internal, like the rest
 * of this file): the measured fade with the scroller's own scrollbars spared, its
 * `data-overflow`, focus inside brought clear of it ({@link scrollFocusIntoStrip}),
 * and — on a scroller that is itself a tab stop, as Table's is while it overflows —
 * the fade lifted while the scroller shows the keyboard's focus outline: an inset
 * outline lies exactly in the faded band, and its sides would fade out with the
 * columns. Inert while `on` is false: no measuring, no listeners, no attributes.
 *
 * `style` is the mask alone; a caller with a style of its own spreads it over that.
 */
export function useEdgeFade(scroller: RefObject<HTMLElement | null>, on: boolean): EdgeFadeProps {
  const fade = useStripFade(on ? scroller : NO_ELEMENT, SPARE_SCROLLBARS);
  const [selfFocused, setSelfFocused] = useState(false);
  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const box = event.currentTarget;
    if (event.target === box) {
      // A click in the table's text focuses the scroller too (it is the nearest tab
      // stop); only the keyboard's focus draws an outline worth lifting the fade for.
      if (focusVisible(box)) setSelfFocused(true);
      return;
    }
    if (event.target instanceof HTMLElement) scrollFocusIntoStrip(box, event.target);
  }, []);
  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setSelfFocused(false);
  }, []);
  if (!on) return { "data-overflow": undefined, style: undefined, onFocus: undefined, onBlur: undefined };
  const mask = selfFocused ? undefined : fade.mask;
  return {
    "data-overflow": fade.overflow,
    style: mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined,
    onFocus,
    onBlur,
  };
}
