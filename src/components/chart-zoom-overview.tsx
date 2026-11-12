// The overview strip under a zoomed chart: the whole range as a thin track, and the window
// on show as a handle on it that drags and takes the arrow keys (Kurvenschmiede production
// feedback #4, Marcel's design of 2026-11-12). Zoomed into a twentieth of a sweep, the
// plot alone no longer says WHERE in the sweep it is, nor offers a way along it short of
// zooming out and in again.
//
// Rendered by the zoom layer (chart-zoom-core.tsx) inside the recharts chart, where the
// plot's position is known, and portalled into a slot the zoom puts under the chart. Its
// arithmetic is lib/zoom-window.ts. Internal (not exported from the package).
import { useRef } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { cn } from "../lib/cn";
import { panWindow, type XWindow } from "../lib/zoom-window";
import { FOCUS_RING } from "./focus-ring";

/** The narrowest the handle is drawn, in px: a 2 % window on a phone's plot would be a
 *  6 px sliver no finger can hold (WCAG 2.5.8's 24 px target). Past it the handle stands
 *  for the window rather than measuring it, and its travel is the strip less its width. */
const MIN_HANDLE = 24;

/** What an arrow key pans, as a share of the window on show. */
const KEY_STEP = 0.1;

/** The strip's height: the handle's 24px hit area (WCAG 2.5.8) at Normal text. The zoom
 *  keeps this much room under the chart before the strip is drawn (chart-zoom-core.tsx). */
export const ZOOM_OVERVIEW_HEIGHT = "h-6";

export interface ZoomOverviewProps {
  /** The range the chart draws unzoomed: the track. */
  whole: XWindow;
  /** The window on show: the handle. */
  window: XWindow;
  /** Where the plot is in the chart, in px, so the strip lines up under it. */
  left: number;
  width: number;
  /** A position as the chart names it — the tooltip's heading — for the handle's value. */
  label?: (position: number) => string;
  /** The handle's accessible name. */
  name: string;
  /** The handle's value, said: the window's two ends, already formatted. */
  range: (from: string, to: string) => string;
  /** A new window, moved and kept inside `whole`. A pan, never a zoom step. */
  onPan: (window: [number, number]) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * The strip. Thin and quiet — a `bg-hover` track, a handle in the input border's ink —
 * and only there while x is zoomed, so an unzoomed chart draws nothing more. Its 1.5rem
 * is kept free under the chart from the start (see `withChartZoom`), so nothing under the
 * chart moves when it comes, and the plot keeps the height the app gave it.
 *
 * The handle is a `slider` (the window's start, between the range's start and its end less
 * the window), named by `name` and said by `range`: ←/↓ and →/↑ pan a tenth of the window,
 * Home and End go to the ends. Laid out left to right in every page, as the plot is.
 */
export function ZoomOverview({ whole, window, left, width, label = String, name, range, onPan }: ZoomOverviewProps) {
  const drag = useRef<{ id: number; x: number; window: XWindow } | null>(null);
  const room = whole[1] - whole[0];
  const span = Math.min(window[1] - window[0], room);
  const free = Math.max(0, room - span);
  const handle = clamp((span / room) * width, Math.min(MIN_HANDLE, width), width);
  const travel = width - handle;
  const at = free > 0 ? clamp(((window[0] - whole[0]) / free) * travel, 0, travel) : 0;
  /** px of travel → units of the abscissa, so the handle stays under the pointer. */
  const perPx = travel > 0 ? free / travel : 0;

  const panTo = (from: number) => onPan(panWindow([from, from + span], 0, whole));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = span * KEY_STEP;
    // The plot runs left to right in a right-to-left page too (ChartContainer), and so does
    // this strip: → is later in every page.
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") panTo(window[0] - step);
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") panTo(window[0] + step);
    else if (event.key === "Home") panTo(whole[0]);
    else if (event.key === "End") panTo(whole[1] - span);
    else return;
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, window };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the environment does not know (jsdom knows none): the drag still
      // works while the pointer stays on the handle.
    }
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const now = drag.current;
    if (!now || now.id !== event.pointerId) return;
    onPan(panWindow(now.window, (event.clientX - now.x) * perPx, whole));
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
  };
  // The strip is React's child of recharts' wrapper (a portal out of the chart), and React
  // bubbles a click through the tree it belongs to: there it reached the wrapper's
  // `onClick`, the chart's drilldown, with the index the pointer last hovered.
  const keepClick = (event: MouseEvent) => event.stopPropagation();

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- it only keeps a click from reaching the chart's drilldown (above); the handle inside is the control, with its keys
    <div dir="ltr" className={cn("relative", ZOOM_OVERVIEW_HEIGHT)} data-zoom-overview="" onClick={keepClick}>
      <div className="absolute inset-y-0" style={{ left, width }}>
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-hover" />
        <div
          role="slider"
          tabIndex={0}
          aria-label={name}
          aria-valuemin={whole[0]}
          aria-valuemax={whole[1] - span}
          aria-valuenow={window[0]}
          aria-valuetext={range(label(window[0]), label(window[1]))}
          className={cn(
            "group absolute inset-y-0 flex cursor-grab touch-none items-center rounded-full active:cursor-grabbing",
            FOCUS_RING,
          )}
          style={{ left: at, width: handle }}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span
            aria-hidden
            className="h-2.5 w-full rounded-full border border-strong bg-surface transition-colors group-hover:border-brand group-active:border-brand"
          />
        </div>
      </div>
    </div>
  );
}
