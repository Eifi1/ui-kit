import type { CSSProperties } from "react";
import { readKeyboardInset } from "../hooks/use-anchored-panel";

/*
 * # The docked card (docs/tours-harmonization.md §11.7, contract round 054 §6)
 *
 * On a phone a field step's card is pinned full-width to the top or bottom edge of the
 * USABLE BAND — the visual viewport less the keyboard, raised above the highest
 * `[data-tour-obstruction]` (the number pad, a picker sheet) — on the edge away from the
 * spotlighted field, so it covers neither the field nor the keyboard nor the pad.
 */

export type DockEdge = "top" | "bottom";

export interface DockRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The band, in layout-viewport px (what `position: fixed` measures from). */
export interface Band {
  top: number;
  bottom: number;
}

/** Below this the docked layout applies (Tailwind's `sm`). */
export const DOCK_MAX_WIDTH = 640;
/** The gutter between the card and the band's edge, and between the card and the field. */
const GUTTER = 8;
/** An obstruction whose top is within this of the band's top covers the screen. */
const FULL_SCREEN_SLACK = 64;
/** Under this much free space on its edge the card flips (the hysteresis floor). */
const MIN_DOCK = 140;

/**
 * The usable band now: the visual viewport while a keyboard is up (`readKeyboardInset`'s
 * rules — pinch zoom is not a keyboard, 100 px minimum), else the layout viewport; its
 * bottom raised to the top of the highest visible obstruction that holds neither the field
 * nor the card. An obstruction that starts at the band's top (a full-screen picker, opened
 * over everything) is not a bottom layer and is ignored; a tall one (the number pad at
 * Large text is over half a phone) still counts.
 */
export function readBand(target: Element | null, card: Element | null): Band {
  const vh = window.innerHeight;
  let top = 0;
  let bottom = vh;
  const vv = window.visualViewport;
  if (vv && readKeyboardInset() > 0) {
    top = vv.offsetTop;
    bottom = vv.offsetTop + vv.height;
  }
  for (const el of Array.from(document.querySelectorAll("[data-tour-obstruction]"))) {
    if ((target && el.contains(target)) || (card && el.contains(card))) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.top <= top + FULL_SCREEN_SLACK) continue;
    if (r.top < bottom) bottom = r.top;
  }
  return { top, bottom };
}

/** The card's free space on `edge`, between the band's edge and the spotlight. */
function room(edge: DockEdge, spot: DockRect, band: Band): number {
  return edge === "bottom" ? band.bottom - (spot.top + spot.height) - GUTTER * 2 : spot.top - band.top - GUTTER * 2;
}

/**
 * The edge away from the field: the bottom when the spotlight's centre is in the band's
 * upper half, else the top. With a `previous` edge, it stays unless the card would have to
 * cover the spotlight there (no flip on every keyboard animation frame).
 */
export function dockEdge(spot: DockRect, band: Band, previous: DockEdge | null, cardHeight: number): DockEdge {
  const preferred: DockEdge = spot.top + spot.height / 2 < band.top + (band.bottom - band.top) / 2 ? "bottom" : "top";
  if (!previous || previous === preferred) return preferred;
  return room(previous, spot, band) >= Math.min(MIN_DOCK, cardHeight) ? previous : preferred;
}

/** The docked card's position: full-width with 8 px (safe-area aware) gutters, its height
 *  capped to the free space so its body scrolls and its title and buttons show. */
export function dockStyle(edge: DockEdge, spot: DockRect | null, band: Band): CSSProperties {
  const vh = window.innerHeight;
  const cap = spot ? Math.max(MIN_DOCK / 2, room(edge, spot, band)) : band.bottom - band.top - GUTTER * 2;
  const base: CSSProperties = {
    left: `max(${GUTTER}px, env(safe-area-inset-left))`,
    right: `max(${GUTTER}px, env(safe-area-inset-right))`,
    width: "auto",
    maxWidth: "none",
    maxHeight: cap,
  };
  if (edge === "top") {
    return { ...base, top: band.top <= 0 ? `max(${GUTTER}px, env(safe-area-inset-top))` : band.top + GUTTER, bottom: "auto" };
  }
  const fromBottom = vh - band.bottom;
  return {
    ...base,
    top: "auto",
    bottom: fromBottom <= 0 ? `max(${GUTTER}px, env(safe-area-inset-bottom))` : fromBottom + GUTTER,
  };
}

/** The target's nearest ancestor that scrolls vertically now (a sheet's body), or null. */
export function scrollParent(el: Element): HTMLElement | null {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * Scroll the field into the half of the band away from the card, through its nearest
 * scrollable ancestor (the window only when there is none — the page behind a sheet never
 * moves). A field already inside that half is left where it is. Returns the edge the card
 * takes.
 */
export function scrollIntoFreeHalf(el: Element, card: Element | null, previous: DockEdge | null): DockEdge {
  const r = el.getBoundingClientRect();
  const band = readBand(el, card);
  const edge = dockEdge(r, band, previous, card instanceof HTMLElement ? card.offsetHeight : MIN_DOCK);
  const mid = band.top + (band.bottom - band.top) / 2;
  const half = edge === "bottom" ? { top: band.top + GUTTER, bottom: mid } : { top: mid, bottom: band.bottom - GUTTER };
  if (r.top >= half.top && r.top + r.height <= half.bottom) return edge;
  // Centred in the half, or its top at the half's top when it is taller than the half.
  const delta =
    r.height > half.bottom - half.top ? r.top - half.top : r.top + r.height / 2 - (half.top + half.bottom) / 2;
  const scroller = scrollParent(el);
  if (scroller) scroller.scrollTop += delta;
  // A field in a kit layer with nothing to scroll: the page behind it stays put.
  else if (!el.closest("[data-kit-layer]")) window.scrollBy?.(0, delta);
  return edge;
}
