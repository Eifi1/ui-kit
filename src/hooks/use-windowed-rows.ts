import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** Rows kept mounted beyond each edge, so a flick-scroll has something to show
 *  before the next render lands. */
const OVERSCAN = 6;

/** What {@link useWindowedRows} answers: render rows `first` up to (not including)
 *  `last`, inside a scroll body `totalHeight` pixels tall. */
export interface WindowedRows {
  first: number;
  last: number;
  totalHeight: number;
}

/**
 * Which rows of a fixed-height list are worth rendering.
 *
 * Hand-rolled rather than pulled from a virtualization library, for two reasons. With
 * a fixed row height the whole problem is two divisions — a library earns its keep on
 * measured, variable-height rows, and there are none here. And the obvious library for
 * it (`@tanstack/react-virtual`) returns functions that cannot be memoized safely, so
 * the React Compiler skips optimising any component that calls it: a list that exists
 * to stay fast would opt out of the consumer's main source of speed.
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
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(0);

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

  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  // A viewport of 0 is the first render, before the pane has been laid out (and every
  // render under jsdom). Rendering nothing then would leave the list blank until
  // something scrolled it, so fall back to a screenful.
  const visible = Math.ceil((viewport || 600) / rowHeight) + OVERSCAN * 2;
  const last = Math.min(count, first + visible);
  return { first, last, totalHeight: count * rowHeight };
}
