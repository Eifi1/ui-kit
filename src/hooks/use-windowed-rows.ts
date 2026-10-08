import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useTextSize } from "../theme/text-size";

/** Rows kept mounted beyond each edge, so a flick-scroll has something to show
 *  before the next render lands. */
const OVERSCAN = 6;

/** The attribute a measured row carries so {@link WindowedRows.measureRef} knows which
 *  row it is looking at: `data-row-index={index}`. */
export const WINDOWED_ROW_INDEX = "data-row-index";

/** What {@link useWindowedRows} answers: render rows `first` up to (not including)
 *  `last`, inside a scroll body `totalHeight` pixels tall. */
export interface WindowedRows {
  first: number;
  last: number;
  totalHeight: number;
  /**
   * The top of row `index`, in px from the top of the list: the rows above it at their
   * MEASURED heights where they have been rendered, at {@link estimate} where not.
   * Position each row at this (`style={{ top: offsetOf(index) }}`) rather than at
   * `index × rowHeight`, which is right only while every row is the estimate.
   */
  offsetOf: (index: number) => number;
  /** The height of row `index`: measured, else {@link estimate}. */
  heightOf: (index: number) => number;
  /**
   * The height assumed for a row not measured yet: `rowHeight × scale`, the text
   * size's factor (`useTextSize`). Give a row this as its `minHeight`, not its
   * `height`: a row that wraps must be allowed to grow, and is then measured.
   */
  estimate: number;
  /**
   * Put on every rendered row, with `data-row-index={index}` beside it: the row is
   * observed while it is mounted, and its height replaces the estimate. Stable for the
   * life of the list. A row without it keeps the estimate, which is the pre-0.32
   * fixed-height list exactly.
   */
  measureRef: (element: HTMLElement | null) => (() => void) | undefined;
}

type Heights = ReadonlyMap<number, number>;
const NO_HEIGHTS: Heights = new Map();

/** The box height of an observed row: the border box where the browser reports one,
 *  else its laid-out rectangle. `0` means "not laid out" (hidden, jsdom) and is ignored. */
function rowHeightOf(entry: ResizeObserverEntry): number {
  const box = entry.borderBoxSize?.[0];
  if (box && box.blockSize > 0) return box.blockSize;
  return entry.target.getBoundingClientRect().height;
}

/** The row index an element was given with {@link WINDOWED_ROW_INDEX}, or `null`. */
function indexOf(element: Element): number | null {
  const raw = element.getAttribute(WINDOWED_ROW_INDEX);
  if (raw === null) return null;
  const index = Number(raw);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

/** The last index `i` with `offsets[i] <= y` (0 when none): the row whose box holds `y`. */
function rowAt(offsets: Float64Array, count: number, y: number): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= y) lo = mid;
    else hi = mid - 1;
  }
  return Math.min(lo, Math.max(0, count - 1));
}

/**
 * Which rows of a long list are worth rendering — and, since 0.32, where each one goes.
 *
 * Hand-rolled rather than pulled from a virtualization library: the obvious one
 * (`@tanstack/react-virtual`) returns functions that cannot be memoized safely, so the
 * React Compiler skips optimising any component that calls it — a list that exists to
 * stay fast would opt out of the consumer's main source of speed.
 *
 * **Measured rows (docs/text-size-harmonization.md §10.9).** Until 0.32 every row was
 * `rowHeight` px and the window was two divisions. "Nothing truncates" at Large and
 * Extra large needs rows that grow with their text — Kurvenschmiede's segment list
 * wraps a long name at 150 %, and a fixed 68 px row cut it off. So the rows are
 * measured: put {@link WindowedRows.measureRef} and `data-row-index` on each rendered
 * row, and one `ResizeObserver` watches every row while it is mounted (one observer for
 * all of them, which the browser batches into one callback per frame). A measured
 * height replaces the estimate; a row never rendered keeps `rowHeight × scale`, the
 * text size's factor, so the scroll body is about right before anything is measured
 * and exactly right for everything that has been. Offsets are a prefix sum over both,
 * rebuilt only when a height changes — scrolling is a binary search.
 *
 * Measurements are dropped when the text size changes (every row is a different height
 * then, and the rendered ones measure again at once) and ignored past `count` (a row
 * removed at the end). Removing a row in the MIDDLE shifts the indices below it; they
 * keep the old row's height until they are rendered again, which costs a few pixels of
 * scrollbar, never a row out of place on screen.
 *
 * Without a `ResizeObserver` (jsdom, an old webview) the estimate holds for every row,
 * which is the fixed-height list of before.
 *
 * `scrollRef` is the element that scrolls. The rows are assumed to start at its top;
 * a sticky header above them costs a row or two of the overscan, not correctness.
 *
 * Moved from Lenkbank, where `MeasuredGrid` and a segment list window the same way over
 * rows of different heights — two copies of this would be two places to fix the day
 * the overscan turns out to be wrong.
 */
export function useWindowedRows(
  count: number,
  rowHeight: number,
  scrollRef: RefObject<HTMLElement | null>,
): WindowedRows {
  const { scale } = useTextSize();
  const estimate = rowHeight * scale;
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);
  // The heights are keyed to the scale they were measured at: a text size switch makes
  // every one of them stale at once, and the derivation below drops them on read.
  const [measured, setMeasured] = useState<{ scale: number; heights: Heights }>({ scale, heights: NO_HEIGHTS });
  const heights = measured.scale === scale ? measured.heights : NO_HEIGHTS;
  // The observer's callback runs outside render and needs the scale in force then. A
  // LAYOUT effect: the rows' new heights after a size switch are reported before the
  // browser paints, which can be before a passive effect has run.
  const scaleRef = useRef(scale);
  useLayoutEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = () => {
      setScrollTop(element.scrollTop);
      setViewport(element.clientHeight);
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    // The pane usually sits in a responsive layout, so its height changes without the
    // window's — a resize listener alone would miss every one of those. Guarded:
    // jsdom and older embedded webviews have no ResizeObserver, and the list still
    // has to render there.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      element.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [scrollRef]);

  // ONE observer for every row, made on the first row that asks for it.
  const rowObserver = useRef<ResizeObserver | null>(null);
  useEffect(
    () => () => {
      rowObserver.current?.disconnect();
      rowObserver.current = null;
    },
    [],
  );

  const measureRef = useCallback((element: HTMLElement | null) => {
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    if (!rowObserver.current) {
      rowObserver.current = new ResizeObserver((entries) => {
        const updates: [number, number][] = [];
        for (const entry of entries) {
          const index = indexOf(entry.target);
          const height = rowHeightOf(entry);
          if (index !== null && height > 0) updates.push([index, height]);
        }
        if (!updates.length) return;
        const at = scaleRef.current;
        setMeasured((previous) => {
          const base = previous.scale === at ? previous.heights : NO_HEIGHTS;
          // Unchanged heights are the common case (a row re-observed after a re-render):
          // the same map back means no render.
          if (updates.every(([index, height]) => base.get(index) === height)) {
            return previous.scale === at ? previous : { scale: at, heights: base };
          }
          const next = new Map(base);
          for (const [index, height] of updates) next.set(index, height);
          return { scale: at, heights: next };
        });
      });
    }
    const observer = rowObserver.current;
    observer.observe(element);
    // React 19 calls this when the row unmounts (or the ref moves to another element).
    return () => observer.unobserve(element);
  }, []);

  // The prefix sum: offsets[i] is the top of row i, offsets[count] the whole height.
  // Skipped while nothing is measured, when the arithmetic is exact without it.
  const offsets = useMemo(() => {
    if (heights.size === 0) return null;
    const table = new Float64Array(count + 1);
    for (let index = 0; index < count; index += 1) {
      table[index + 1] = table[index] + (heights.get(index) ?? estimate);
    }
    return table;
  }, [count, estimate, heights]);

  const offsetOf = useCallback(
    (index: number) => (offsets ? offsets[Math.max(0, Math.min(index, count))] : index * estimate),
    [offsets, count, estimate],
  );
  const heightOf = useCallback((index: number) => heights.get(index) ?? estimate, [heights, estimate]);

  // A viewport of 0 is the first render, before the pane has been laid out (and every
  // render under jsdom). Rendering nothing then would leave the list blank until
  // something scrolled it, so fall back to a screenful.
  const room = viewport || 600;
  let first: number;
  let last: number;
  if (offsets) {
    first = Math.max(0, rowAt(offsets, count, scrollTop) - OVERSCAN);
    last = Math.min(count, rowAt(offsets, count, scrollTop + room) + 1 + OVERSCAN);
  } else {
    first = Math.max(0, Math.floor(scrollTop / estimate) - OVERSCAN);
    last = Math.min(count, first + Math.ceil(room / estimate) + OVERSCAN * 2);
  }
  const totalHeight = offsets ? offsets[count] : count * estimate;
  return { first, last, totalHeight, offsetOf, heightOf, estimate, measureRef };
}
