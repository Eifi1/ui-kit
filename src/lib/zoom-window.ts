/**
 * The x window of a zoomed chart, moved by a gesture: the pure half of the chart zoom's
 * two-finger pinch and pan and of its overview strip (components/chart-zoom-core.tsx,
 * components/chart-zoom-overview.tsx), kept apart so every number can be checked on its
 * own. Internal (not exported from the package).
 *
 * A window is `[from, to]` in the abscissa's own units — epoch ms, a slot index, a plain
 * number — with `from < to`. `whole` is the range the chart draws when nothing is zoomed:
 * no gesture takes a window past it. Positions on screen are px from the PLOT's left edge,
 * so the axes beside it never enter the arithmetic.
 */

/** A window, or the whole range: `[from, to]`, `from < to`. */
export type XWindow = readonly [number, number];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * `window` kept inside `whole`: as wide as it was, or as `whole` where it was wider, and
 * moved back in from whichever edge it crossed. A pan that runs into an edge stops there
 * rather than squeezing the window, so the zoom never changes under a pan. A `whole` with
 * no width says nothing about where the edges are, and leaves `window` as it is.
 */
export function clampWindow(window: XWindow, whole: XWindow): [number, number] {
  const room = whole[1] - whole[0];
  if (!(room > 0)) return [window[0], window[1]];
  const span = Math.min(window[1] - window[0], room);
  const from = clamp(window[0], whole[0], whole[1] - span);
  return [from, from + span];
}

/** `window` moved by `by` (in the abscissa's units), kept inside `whole`. */
export function panWindow(window: XWindow, by: number, whole: XWindow): [number, number] {
  return clampWindow([window[0] + by, window[1] + by], whole);
}

/** Whether `window` shows all of `whole` — where a pinch out ends the zoom instead of
 *  leaving a window the size of the chart. To a billionth of the range: a window computed
 *  back from the fingers lands a rounding error short of the edge. */
export function isWholeRange(window: XWindow, whole: XWindow): boolean {
  const slack = (whole[1] - whole[0]) * 1e-9;
  return window[0] <= whole[0] + slack && window[1] >= whole[1] - slack;
}

/**
 * The narrowest the fingers count as apart, in px, horizontally. Two fingers side by side
 * are never closer than about this; two set one above the other are 0 px apart across,
 * and a spread measured from 0 would turn the first pixel of movement into an infinite
 * zoom.
 */
export const PINCH_MIN_SPREAD = 24;

/** The most one pinch narrows the window: to this share of where it began. The band's own
 *  floor (`ZOOM_MIN_DRAG`, 2 % of the plot): a drag narrower than that is not a zoom. */
export const PINCH_MIN_SHARE = 0.02;

/** How far a two-finger gesture must change the window's WIDTH to be a zoom rather than a
 *  pan: 2 %, as above. Two fingers that pan never keep exactly the same spread. */
export const PINCH_MIN_CHANGE = 0.02;

/** Where a two-finger gesture began: the window on show and the two fingers, in px from
 *  the plot's left edge. */
export interface PinchStart {
  window: XWindow;
  a: number;
  b: number;
}

/**
 * A two-finger gesture over a plot `width` px wide, pinch and pan at once. Only x: the
 * width of the window follows the fingers' spread ACROSS the plot (inverse: fingers twice
 * as far apart show half as much), and the value that was under their midpoint stays under
 * it as the midpoint moves — so two fingers that only move together pan. Measured from the
 * START every time, as ZoomableImage's pinch is, so rounding never accumulates and a
 * gesture that returns to where it began shows its first window again.
 *
 * Kept inside `whole` (see {@link clampWindow}), and no narrower than
 * {@link PINCH_MIN_SHARE} of the window it began on.
 */
export function pinchWindow(start: PinchStart, a: number, b: number, width: number, whole: XWindow): [number, number] {
  const was = start.window[1] - start.window[0];
  if (!(width > 0) || !(was > 0)) return [start.window[0], start.window[1]];
  const before = Math.max(Math.abs(start.b - start.a), PINCH_MIN_SPREAD);
  const after = Math.max(Math.abs(b - a), PINCH_MIN_SPREAD);
  const room = whole[1] - whole[0];
  const span = clamp((was * before) / after, was * PINCH_MIN_SHARE, room > 0 ? room : Infinity);
  const under = start.window[0] + (((start.a + start.b) / 2) * was) / width;
  const from = under - (((a + b) / 2) * span) / width;
  return clampWindow([from, from + span], whole);
}

/** Whether a two-finger gesture from `from` to `to` changed the window's width enough to be
 *  a zoom (see {@link PINCH_MIN_CHANGE}). */
export function pinchZoomed(from: XWindow, to: XWindow): boolean {
  const was = from[1] - from[0];
  return was > 0 && Math.abs((to[1] - to[0]) / was - 1) > PINCH_MIN_CHANGE;
}

/** The lowest and highest finite number under `key` in `rows`, or `undefined` when there
 *  is none. A loop, not `Math.min(...)`: the spread passes one argument per row. */
export function extentOf(
  rows: readonly Readonly<Record<string, unknown>>[],
  key: string,
): [number, number] | undefined {
  let low = Infinity;
  let high = -Infinity;
  for (const row of rows) {
    const value = row[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return low <= high ? [low, high] : undefined;
}
