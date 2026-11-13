// Drag-to-zoom for cartesian charts — the HOC, the shared x window, and the arithmetic.
// Lifted out of lenkbank, where every plot in the app is one `SeriesChart` and zoom is
// therefore wired in exactly once.
//
// **Which axes a drag zooms is read off the drag itself.** A selection that is roughly
// square is a box: the reader framed a REGION and means both axes. A long thin one is a
// band, and its own direction says which: a wide flat drag means "this stretch of the
// abscissa", a tall narrow one "this range of values". Asking with a modifier key
// instead would be asking people to remember a convention for something they have
// already drawn.
//
// Squareness is measured **in fractions of the plot**, not pixels. These charts are
// three times wider than they are tall, so a pixel-square selection is a very wide
// slice of the data and would read as a band to anybody looking at it.
//
// The zoom is VIEW state and lives here, never in a query or a store: it is where
// somebody is looking, and a chart whose data reloads should not lose it. It is cleared
// by the reset button, by a double click, by Back past the first zoom step, by a pinch
// (two fingers or a trackpad) out to the whole range, and by nothing else.
//
// On a touch screen one finger READS (the tooltip follows it) and two fingers zoom and
// pan x (`ZoomLayer`); a mouse or a pen draws the band; a trackpad pinch, or Ctrl + wheel,
// zooms x about the cursor. While x is zoomed an overview strip under the plot pans it
// (./chart-zoom-overview).
//
// Everything with a decision in it is a pure exported function below (`zoomAxesFor`,
// `selectionFromDrag`, `zoomAfter`, `zoomDomains`, `fitYToX`, `fitXToY`, `zoomStep`,
// `zoomBack`) or in lib/zoom-window.ts (the pinch and the pan); the components are
// plumbing between a pointer and those.
//
// The kit's own module (0.34, refactor audit 2026-10, API-6b): SeriesChart, its axes and
// the facing pair import from here. ./chart-zoom is the public face — `SharedXZoom`, the
// types, and until 0.35 the deprecated arithmetic and HOC, which no app imports.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentType, Dispatch, PointerEvent, ReactNode, RefObject, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { usePlotArea, useXAxisInverseScale, useYAxisInverseScale, type InverseScaleFunction } from "recharts";
import { Undo2, X } from "lucide-react";
import { cn } from "../lib/cn";
import {
  extentOf,
  isWholeRange,
  pinchScale,
  pinchWindow,
  pinchZoomed,
  zoomWindowAt,
  type PinchStart,
  type XWindow,
} from "../lib/zoom-window";
import { wheelZoomFactor } from "../lib/zoom-view";
import { FOCUS_RING } from "./focus-ring";
import { ZoomOverview } from "./chart-zoom-overview";
import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { DEFAULT_SERIES_CHART_LABELS, type SeriesChartLabels } from "./series-chart-labels";

/** The y axis a series lands on when it names none — the single shared scale most
 *  charts have. `SeriesChart` and the fit below agree on it by importing this. */
export const DEFAULT_Y_AXIS = "y";

/* ── The arithmetic ─────────────────────────────────────────────────────── */

/**
 * How square a selection has to be before it counts as a box: the shorter side
 * against the longer, both as fractions of the plot. At 0.5 a selection twice as wide
 * as it is tall is still a box and one three times as wide is a band.
 */
export const ZOOM_SQUARE_ENOUGH = 0.5;

/** Below this a drag is a click that moved, not a selection. In fractions of the plot,
 *  so it is the same gesture on a phone and on a wall display. */
export const ZOOM_MIN_DRAG = 0.02;

export type ZoomAxes = "both" | "x" | "y";

/** Which axes a drag zooms — or `null` for a drag too small to mean one, or a plot
 *  that has not been laid out yet. Direction does not matter; proportion does. */
export function zoomAxesFor(
  dx: number,
  dy: number,
  width: number,
  height: number,
  threshold: number = ZOOM_SQUARE_ENOUGH,
  /** A chart that zooms ONE axis only (see {@link ZoomTarget.zoomAxes}): every drag is
   *  a band along it, however it was drawn, and a drag with no extent along it is
   *  nothing — a tall narrow drag over a bar chart names no stretch of the abscissa. */
  only?: "x" | "y",
): ZoomAxes | null {
  if (!(width > 0) || !(height > 0)) return null;
  const across = Math.abs(dx) / width;
  const down = Math.abs(dy) / height;
  if (only === "x") return across < ZOOM_MIN_DRAG ? null : "x";
  if (only === "y") return down < ZOOM_MIN_DRAG ? null : "y";
  if (across < ZOOM_MIN_DRAG && down < ZOOM_MIN_DRAG) return null;
  const longer = Math.max(across, down);
  const shorter = Math.min(across, down);
  if (shorter / longer >= threshold) return "both";
  return across > down ? "x" : "y";
}

/** What a drag chose, in DATA coordinates, and which axes it actually named — the
 *  caller needs the second to know which of the two it may derive from the other. */
export interface ZoomSelection {
  which: ZoomAxes;
  x?: [number, number];
  /** One window per y axis, keyed by axis id: they are in different units. */
  y: Record<string, [number, number]>;
}

/** A drag, in the chart's own pixel coordinates. */
export interface ZoomDrag {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

/** A pair as a domain, smallest first. Recharts wants an ascending domain whichever
 *  way the drag went, and a y axis counts downward in pixels while its values count
 *  upward — so both ends are read and sorted rather than one assumed to be low. */
function ordered(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

/**
 * A finished drag as a selection, or `null` when it selects nothing.
 *
 * `xInverse` and `yInverse(axisId)` are recharts' pixel→value functions; an axis whose
 * function is missing, or whose ends come back non-finite, is left out rather than
 * handed a NaN window.
 */
export function selectionFromDrag(
  drag: ZoomDrag,
  plot: { width: number; height: number },
  xInverse: InverseScaleFunction | undefined,
  yInverse: (axisId: string) => InverseScaleFunction | undefined,
  axisIds: readonly string[],
  only?: "x" | "y",
): ZoomSelection | null {
  const which = zoomAxesFor(
    drag.toX - drag.fromX,
    drag.toY - drag.fromY,
    plot.width,
    plot.height,
    ZOOM_SQUARE_ENOUGH,
    only,
  );
  if (!which) return null;
  const next: ZoomSelection = { which, y: {} };
  if (which !== "y" && xInverse) {
    const from = Number(xInverse(drag.fromX));
    const to = Number(xInverse(drag.toX));
    if (Number.isFinite(from) && Number.isFinite(to)) next.x = ordered(from, to);
  }
  if (which !== "x") {
    for (const id of axisIds) {
      const inverse = yInverse(id);
      if (!inverse) continue;
      const from = Number(inverse(drag.fromY));
      const to = Number(inverse(drag.toY));
      if (Number.isFinite(from) && Number.isFinite(to)) next.y[id] = ordered(from, to);
    }
  }
  return next.x || Object.keys(next.y).length ? next : null;
}

/** One row of a zoomable chart. Loose on purpose: a row also carries what the chart
 *  does not plot — keksdose's `rawPeriod` for a drilldown, a label for a category axis —
 *  and only the finite NUMBERS in it are ever read as samples. */
export type ZoomRow = Readonly<Record<string, unknown>>;

/** A series as the fit sees it. `stack` groups bars/areas drawn on top of each other
 *  (recharts' `stackId`), whose extent is their SUM, not any one of them. */
export interface ZoomFitSeries {
  key: string;
  axis?: string;
  stack?: string;
  /** Only `"line"` matters here: recharts cannot stack a line, so a line's `stack` is
   *  ignored rather than summed into a height nothing on the chart reaches. */
  type?: string;
}

/** What a band refit needs to know about the chart — a subset of `SeriesChart`'s own
 *  props, so a chart hands its data straight over. */
export interface ZoomFitSource {
  rows: readonly ZoomRow[];
  series: readonly ZoomFitSeries[];
  axes: readonly { id: string }[];
  xKey: string;
}

/** How much of a refitted span to leave as air, top and bottom. Without it the
 *  highest sample sits exactly on the frame, where a line is half drawn and reads as
 *  clipped rather than as the maximum. */
const FIT_AIR = 0.05;

/** A span with air around it — and a real span for a flat channel, which would
 *  otherwise be a zero-height window recharts cannot scale. */
function airy(low: number, high: number): [number, number] {
  const span = high - low;
  const air = span > 0 ? span * FIT_AIR : Math.max(Math.abs(high), 1) * FIT_AIR;
  return [low - air, high + air];
}

/** A running low/high pair. A pair rather than an array to take `Math.min(...)` of:
 *  the spread passes one argument per sample, and V8 faults past ~125,000 of them. */
type Span = [number, number] | undefined;

/** A pair widened by one value. A non-finite one is not a value — one NaN would
 *  otherwise take the whole window with it. */
function widen(span: Span, value: unknown): Span {
  if (typeof value !== "number" || !Number.isFinite(value)) return span;
  if (!span) return [value, value];
  if (value < span[0]) span[0] = value;
  else if (value > span[1]) span[1] = value;
  return span;
}

/** Which series are measured on an axis. */
function keysOn(source: ZoomFitSource, axisId: string): string[] {
  return source.series.filter((entry) => (entry.axis ?? DEFAULT_Y_AXIS) === axisId).map((entry) => entry.key);
}

/** A row's value as a sample, or 0 for a stack's missing layer — a stacked bar with no
 *  value for one series draws the rest of the stack from where that one would end. */
const layer = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/**
 * The lowest and highest value an axis DRAWS over the rows whose abscissa is inside
 * `window` (every row when there is none) — `undefined` when it draws nothing finite.
 *
 * Stack-aware, and that is why it exists: a stack of three bars reaches the SUM of
 * them, and fitting the axis to the tallest single layer (what fitting on values did)
 * cuts the top two thirds of every stack off. Positive and negative layers are summed
 * apart, as recharts draws them under `stackOffset="sign"` — a month with 900 income
 * and −300 expense stacks up to 900 and down to −300, not to 600. A stacked extent
 * therefore always contains the zero its layers stand on.
 *
 * `SeriesChart` fits its axes with this and the zoom refits them with it, so the two
 * cannot disagree about how tall a stack is.
 */
export function axisExtent(
  source: ZoomFitSource,
  axisId: string,
  window?: readonly [number, number],
): [number, number] | undefined {
  const mine = source.series.filter((entry) => (entry.axis ?? DEFAULT_Y_AXIS) === axisId);
  const loose: string[] = [];
  const stacks = new Map<string, string[]>();
  for (const entry of mine) {
    if (entry.stack === undefined || entry.type === "line" || entry.type === undefined) {
      loose.push(entry.key);
    } else {
      stacks.set(entry.stack, [...(stacks.get(entry.stack) ?? []), entry.key]);
    }
  }
  let span: Span;
  for (const row of source.rows) {
    if (window) {
      const at = row[source.xKey];
      if (typeof at !== "number" || !(at >= window[0] && at <= window[1])) continue;
    }
    for (const key of loose) span = widen(span, row[key]);
    for (const keys of stacks.values()) {
      let up = 0;
      let down = 0;
      let any = false;
      for (const key of keys) {
        const value = layer(row[key]);
        any ||= typeof row[key] === "number" && Number.isFinite(row[key]);
        if (value >= 0) up += value;
        else down += value;
      }
      if (!any) continue;
      span = widen(widen(span, down), up);
    }
  }
  return span;
}

/**
 * Each y axis fitted to the samples inside an x window — what a band across x leaves
 * the axes nobody dragged showing. Zoom into a tenth of a sweep and a y axis still
 * scaled to the whole run draws that tenth as a flat line, which is the one thing the
 * zoom was for; so the unnamed axes are refitted, which is what "zoom" means everywhere
 * else.
 *
 * An axis with nothing inside the window is left OUT rather than collapsed: a window
 * between two samples is one where the chart should keep drawing the line across.
 */
export function fitYToX(source: ZoomFitSource, window: readonly [number, number]): Record<string, [number, number]> {
  const fitted: Record<string, [number, number]> = {};
  for (const axis of source.axes) {
    const span = axisExtent(source, axis.id, window);
    if (span) fitted[axis.id] = airy(span[0], span[1]);
  }
  return fitted;
}

/**
 * The x window that holds every sample inside a set of y windows — the other direction
 * of the same idea. A channel crossing its band once gives a tight window; one that
 * oscillates through it gives back most of the sweep, which is the truthful answer.
 * `undefined` when no sample qualifies, rather than a guess.
 */
export function fitXToY(
  source: ZoomFitSource,
  windows: Readonly<Record<string, readonly [number, number]>>,
): [number, number] | undefined {
  let hits: Span;
  for (const [axisId, [low, high]] of Object.entries(windows)) {
    for (const key of keysOn(source, axisId)) {
      for (const row of source.rows) {
        const value = row[key];
        if (typeof value === "number" && Number.isFinite(value) && value >= low && value <= high) {
          hits = widen(hits, row[source.xKey]);
        }
      }
    }
  }
  return hits ? airy(hits[0], hits[1]) : undefined;
}

/**
 * What a chart remembers about its zoom: the x window, and the y windows the reader
 * DRAGGED. `y: null` means "derive y from x" — the split is the whole design: what was
 * dragged is kept, and what follows from it is recomputed on every render, so a band
 * across x refits y here and in every chart sharing the window.
 */
export interface ZoomState {
  x?: [number, number];
  y: Record<string, [number, number]> | null;
}

export const NO_ZOOM: ZoomState = { x: undefined, y: null };

/**
 * The state after a selection. Two band drags COMPOSE rather than the second undoing
 * the first: a band down y keeps the x window when the band holds no samples, and
 * otherwise pulls x in to where they are.
 */
export function zoomAfter(state: ZoomState, selection: ZoomSelection, source: ZoomFitSource): ZoomState {
  if (selection.which === "both") return { x: selection.x, y: selection.y };
  // Leave y derived, so it fits itself to what is inside the new window.
  if (selection.which === "x") return { x: selection.x, y: null };
  return { x: fitXToY(source, selection.y) ?? state.x, y: selection.y };
}

/** The domains a chart draws for a state: the x window as is, and each y axis either
 *  as dragged or fitted to the x window. `{}` means "fit your own data". */
export function zoomDomains(
  state: ZoomState,
  source: ZoomFitSource,
): { xDomain?: [number, number]; yDomains: Record<string, [number, number]> } {
  return {
    xDomain: state.x,
    yDomains: state.y ?? (state.x ? fitYToX(source, state.x) : {}),
  };
}

/* ── The way back ───────────────────────────────────────────────────────── */

/**
 * Where a chart is looking — or every chart of a `SharedXZoom`, which share it: the x
 * window, and each chart's DRAGGED y windows by chart (a chart missing, or `null`,
 * derives its y from x — see {@link ZoomState}).
 */
export interface ZoomSnapshot {
  x?: [number, number];
  y: Readonly<Record<string, Record<string, [number, number]> | null>>;
}

/**
 * The view, and the view before each zoom step, oldest first: what Back walks (Kurvenschmiede
 * production feedback #4, Marcel's design of 2026-11-12). A step is a zoom: a band, or a
 * two-finger gesture or a trackpad pinch that changed the window's width. A pan is not: it moves the view the
 * step left, so Back returns to where the reader was before that zoom, whatever was
 * panned since. Reset empties it.
 */
export interface ZoomHistory extends ZoomSnapshot {
  back: readonly ZoomSnapshot[];
}

/** The whole range, with nowhere to go back to. */
export const NO_HISTORY: ZoomHistory = { x: undefined, y: {}, back: [] };

/** Whether a view shows the whole range: no x window, and no chart with a y window. */
export function isUnzoomed(view: ZoomSnapshot): boolean {
  return view.x === undefined && Object.values(view.y).every((windows) => windows == null);
}

/** `history` showing `x`, and `y` on `chart` — a pan, or a two-finger gesture under way.
 *  No step: what Back returns to is left as it was. */
export function zoomMove(
  history: ZoomHistory,
  chart: string,
  x: [number, number] | undefined,
  y: Record<string, [number, number]> | null,
): ZoomHistory {
  return { x, y: { ...history.y, [chart]: y }, back: history.back };
}

/**
 * The view `history` shows made a step, with `before` — the view the zoom began on — as
 * the one Back returns to. A step that lands on the whole range (a pinch out to it) is the
 * end of the zoom, not a step: no Back is drawn there, so nothing is kept to go back to.
 */
export function zoomStep(history: ZoomHistory, before: ZoomSnapshot): ZoomHistory {
  if (isUnzoomed(history)) return NO_HISTORY;
  return { x: history.x, y: history.y, back: [...history.back, { x: before.x, y: before.y }] };
}

/** One step back: the view before the last zoom. Past the first, the whole range. */
export function zoomBack(history: ZoomHistory): ZoomHistory {
  const last = history.back[history.back.length - 1];
  if (!last || isUnzoomed(last)) return NO_HISTORY;
  return { x: last.x, y: last.y, back: history.back.slice(0, -1) };
}

/* ── recharts' pointer ──────────────────────────────────────────────────── */

/**
 * Stands recharts' pointer at (`x`, `y`) in the chart's own px, as a mouse moved there
 * would — what the keyboard's stops show their tooltip by (0.52 code review, deep, charts,
 * finding 4). Their `defaultIndex` alone moved it only until a pointer had hovered the
 * chart: recharts reads it no more once a hover has an index, and a mouse that has left
 * keeps its index. After one hover the arrows moved the tint, and the tooltip, the one
 * place the value is drawn, stayed where the mouse had left it. recharts' own keyboard
 * layer, which these stops replaced (DSP-5), drove the tooltip through its own state.
 *
 * A point off the plot (`x` left of it) takes the pointer off the chart: recharts hides
 * its tooltip there, through the same frame-throttled path a pending move takes, so a
 * blur right after a focus is never overtaken by it. recharts reads the pointer against
 * its wrapper's box, scaled as the box is drawn (`getRelativeCoordinate`); the point is
 * put back into that box.
 *
 * Here rather than in series-chart.tsx since 0.61: the zoom takes the pointer off the
 * chart on a reset (see {@link leaveChart}).
 */
export function pointAt(within: Element, x: number, y: number) {
  const wrapper = within.closest<HTMLElement>(".recharts-wrapper");
  if (!wrapper) return;
  const box = wrapper.getBoundingClientRect();
  const scaleX = wrapper.offsetWidth > 0 ? box.width / wrapper.offsetWidth : 1;
  const scaleY = wrapper.offsetHeight > 0 ? box.height / wrapper.offsetHeight : 1;
  wrapper.dispatchEvent(
    new MouseEvent("mousemove", { bubbles: true, clientX: box.left + x * scaleX, clientY: box.top + y * scaleY }),
  );
}

/**
 * Takes recharts' pointer off the chart inside `root`, which hides its tooltip (and sends
 * a readout row back to idle). x = −1 is left of any plot: the axes and the margins put
 * the plot's own left edge at 0 or right of it.
 *
 * What a reset does (Kurvenschmiede, 2026-11, Android Chrome): recharts hides its tooltip
 * when the mouse LEAVES its wrapper, and a finger never leaves — a tap on Reset zoom lands
 * on a button outside the wrapper and sends it nothing. So the tooltip of the last tap
 * stood over the whole range, naming a value from the window that was just left.
 */
export function leaveChart(root: Element | null) {
  const wrapper = root?.querySelector(".recharts-wrapper");
  if (wrapper) pointAt(wrapper, -1, 0);
}

/* ── The components ─────────────────────────────────────────────────────── */

/** What the wrapped chart is handed. It applies the domains to its own axes and renders
 *  `layer` INSIDE the recharts chart, where recharts' hooks answer. */
export interface ZoomBinding {
  xDomain?: [number, number];
  yDomains: Record<string, [number, number]>;
  layer: ReactNode;
}

/**
 * Which axes a chart lets a drag zoom. `"none"` draws no drag layer and no reset.
 * A drag on a one-axis chart is always a band along that axis (see {@link zoomAxesFor}).
 */
export type ZoomAxesSetting = ZoomAxes | "none";

/**
 * The zoom a chart gets when it does not say, read off what its series ARE.
 *
 * - Only lines: `"both"` — lenkbank's measurement plots, unchanged.
 * - Any area: `"x"`. An area's height is a length from zero, and a y window that cuts
 *   the baseline off draws a band of 40 as three times one of 20 — so its y axis refits
 *   to the x window (still from zero), and a drag never names a y range.
 * - Any bar: `"none"`. A bar chart is a handful of periods read one bar at a time, and
 *   in keksdose every one of them is CLICKED — to drill into a payee, a month, a budget
 *   line — which a drag layer over the plot would swallow. A chart of many bars opts
 *   back in with `zoomAxes: "x"`; a click then reports the period, not the bar.
 */
export function defaultZoomAxes(series: readonly { type?: string }[] | undefined): ZoomAxesSetting {
  if (series?.some((entry) => entry.type === "bar")) return "none";
  if (series?.some((entry) => entry.type === "area")) return "x";
  return "both";
}

/** The props `withChartZoom` reads off the chart it wraps. */
export interface ZoomTarget {
  /** Default: the single axis {@link DEFAULT_Y_AXIS}. */
  axes?: readonly { id: string; hide?: boolean }[];
  /** The chart's own data, so a band can refit the axis it did not name. Optional: a
   *  chart with nothing plotted has nothing to fit to. */
  rows?: readonly ZoomRow[];
  series?: readonly ZoomFitSeries[];
  x?: { key?: string };
  zoom?: ZoomBinding;
  labels?: LabelOverride<SeriesChartLabels>;
  /** Which axes a drag may zoom. Default: {@link defaultZoomAxes} of `series`. */
  zoomAxes?: ZoomAxesSetting;
  /**
   * The overview strip under the chart while x is zoomed: the whole range, with the window
   * on show as a handle that drags and takes ←/→. Default `true`. Inside a `SharedXZoom`
   * the column draws ONE, under its last chart that has one: `false` on a chart takes it
   * off that chart (the strip then goes under the last chart that still has one).
   */
  zoomOverview?: boolean;
}

/** A view and the way back to it, and the setter: a chart's own, or a `SharedXZoom`'s. */
interface ZoomStore {
  history: ZoomHistory;
  set: Dispatch<SetStateAction<ZoomHistory>>;
}

/** A `SharedXZoom`'s strips: each chart that would draw one claims its slot (the claim's
 *  return gives it back), and the last slot in the document is the one drawn. */
interface ZoomGroup extends ZoomStore {
  claim: (slot: Element) => () => void;
  strip?: Element;
}

const SharedX = createContext<ZoomGroup | null>(null);

/** The last of `slots` in document order. */
function lastInDocument(slots: readonly Element[]): Element | undefined {
  let last: Element | undefined;
  for (const slot of slots) {
    if (!last || last.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING) last = slot;
  }
  return last;
}

/**
 * One x window for several charts.
 *
 * A column of charts over one abscissa is one picture, and zooming one of them and not
 * the rest turns it into several pictures of different things. Every zoomable chart
 * inside this shares the x window: any drag in any of them moves all of them.
 *
 * **Only x.** The y axes stay each chart's own — they are in different units — and
 * each refits its own y to what is inside the shared window.
 *
 * The way back is shared too (0.61): Back on any chart of the column undoes the column's
 * last zoom, whichever chart it was made on, and Reset zoom on any of them shows the
 * whole range on all of them. So is the overview strip: one for the column, under its
 * last chart (see {@link ZoomTarget.zoomOverview}) — a strip under every chart would say
 * the same thing once per chart, between an upper chart and the one under it.
 */
export function SharedXZoom({ children }: { children: ReactNode }) {
  const [history, set] = useState<ZoomHistory>(NO_HISTORY);
  const [slots, setSlots] = useState<readonly Element[]>([]);
  const claim = useCallback((slot: Element) => {
    setSlots((was) => [...was, slot]);
    return () => setSlots((was) => was.filter((other) => other !== slot));
  }, []);
  const value = useMemo<ZoomGroup>(
    () => ({ history, set, claim, strip: lastInDocument(slots) }),
    [history, claim, slots],
  );
  return <SharedX.Provider value={value}>{children}</SharedX.Provider>;
}

/**
 * What only the chart knows about its abscissa, for the layer it renders: the range it
 * draws when nothing is zoomed — its fitted domain, with its air, or a category axis'
 * half slot either side. A pinch and a pan stop at its edges. `SeriesChart` provides it
 * round `zoom.layer`; under a chart that does not, the layer falls back on the extent of
 * the rows' own abscissae.
 */
export interface ZoomRange {
  whole?: [number, number];
  /** A position as the chart names it (its tooltip's heading): what the overview strip's
   *  handle says its window is. */
  label?: (position: number) => string;
}

export const ZoomRangeContext = createContext<ZoomRange | null>(null);

/** The axes a chart that names none zooms: the single shared scale, one array for all. */
const ONE_AXIS: readonly { id: string }[] = [{ id: DEFAULT_Y_AXIS }];

/** The binding of a chart that does not zoom: no window, no layer, the same object always. */
const NO_BINDING: ZoomBinding = { yDomains: {}, layer: null };

/** The zoom's two buttons over the chart's top end corner. */
const CORNER_BUTTON = cn(
  "inline-flex items-center gap-1 rounded border border-subtle bg-surface/90 px-1.5 py-0.5 text-micro text-muted backdrop-blur transition-colors hover:text-primary",
  FOCUS_RING,
);

/**
 * Wrap a chart in drag-to-zoom.
 *
 * The chart receives a `zoom` binding: it applies `xDomain`/`yDomains` to its axes
 * (with `allowDataOverflow`, so recharts clips to the window instead of widening it
 * back out) and renders `layer` as a child of its recharts chart. While it is zoomed two
 * buttons stand over the chart's top end corner — Back, one zoom step, and Reset zoom,
 * the whole range — real buttons, so the keyboard can undo what the pointer did.
 */
export function withChartZoom<P extends ZoomTarget>(Chart: ComponentType<P>) {
  function Zoomable(props: P) {
    const labels = useKitLabels("seriesChart", DEFAULT_SERIES_CHART_LABELS, props.labels);
    const group = useContext(SharedX);
    const [own, setOwn] = useState<ZoomHistory>(NO_HISTORY);
    const history = group ? group.history : own;
    const setHistory = group ? group.set : setOwn;
    // This chart's key for its own y windows in a history a `SharedXZoom` shares.
    const id = useId();
    const xWindow = history.x;
    const ownY = history.y[id] ?? null;
    const axes = props.axes ?? ONE_AXIS;
    const setting = props.zoomAxes ?? defaultZoomAxes(props.series);
    const only = setting === "x" || setting === "y" ? setting : undefined;
    const { rows, series } = props;
    const xKey = props.x?.key ?? "x";

    // Every axis, hidden ones included: a hidden axis still scales its lines, and a
    // line whose axis did not refit is drawn as a flat streak inside the window.
    const source = useMemo<ZoomFitSource>(
      () => ({ rows: rows ?? [], series: [...(series ?? [])], axes: [...axes], xKey }),
      [rows, series, axes, xKey],
    );
    // The range a pinch stops at, under a chart that does not say its own (`ZoomRange`).
    const dataWhole = useMemo(() => extentOf(source.rows, source.xKey), [source]);
    const zoomed = xWindow !== undefined || ownY !== null;
    // A chart handed no rows or no series draws its empty state, not a plot — and a
    // "Reset zoom" floating over "No data" (every line toggled off while zoomed) offers
    // to undo something the reader cannot see. The zoom itself is KEPT: it is where they
    // were looking, and it applies again the moment a line comes back. Only an array
    // that is there and empty counts; a chart that does not pass its data is not known
    // to be empty.
    const empty = rows?.length === 0 || series?.length === 0;

    const clear = useCallback(() => setHistory(NO_HISTORY), [setHistory]);
    const back = useCallback(() => setHistory(zoomBack), [setHistory]);

    // The overview strip's slot, under the chart: the layer portals the strip into it (it
    // knows where the plot is). In a `SharedXZoom` only the column's last slot is drawn
    // into, so each chart claims its own (a ref callback's cleanup gives it back).
    const overview = setting !== "none" && props.zoomOverview !== false && !empty;
    const [slot, setSlot] = useState<HTMLDivElement | null>(null);
    const claim = group?.claim;
    const slotRef = useCallback(
      (node: HTMLDivElement | null) => {
        setSlot(node);
        if (!node) return;
        const release = claim?.(node);
        // With a cleanup to call, React no longer calls the ref with `null` on detach.
        return () => {
          setSlot(null);
          release?.();
        };
      },
      [claim],
    );
    const strip = overview && slot && (!group || group.strip === slot) ? slot : null;

    // Every way back to the whole range clears the tooltip — the button, a double click,
    // Back past the first step, a pinch out to it, and in a `SharedXZoom` any of those on
    // another chart of the column (see `leaveChart`). On the change, not in each handler,
    // so none of them can miss it.
    const root = useRef<HTMLDivElement>(null);
    const wasZoomed = useRef(zoomed);
    useEffect(() => {
      if (wasZoomed.current && !zoomed) leaveChart(root.current);
      wasZoomed.current = zoomed;
    }, [zoomed]);

    // Two fingers zoom x: on a chart whose drag names x at all.
    const pinchable = setting === "both" || setting === "x";
    // While two fingers are down the whole chart is `touch-none`, so the browser does not
    // read them as a scroll (ChartContainer's `touch-pan-y` would let a vertical two-finger
    // drag scroll the page) — set from the second finger, before it has moved, as
    // ZoomableImage's pinch does.
    const [pinching, setPinching] = useState(false);
    // The view the gesture began on: what Back returns to once it has zoomed, and the y a
    // two-finger PAN keeps (a pinch lets y refit, as an x band does).
    const pinchFrom = useRef<ZoomSnapshot>(NO_HISTORY);
    const onTouchMove = useEffectEvent((event: TouchEvent) => {
      // The class above lands a render after the second finger; a move the browser sends
      // before it would still scroll. React attaches `touchmove` passive, where
      // `preventDefault` is ignored — hence the native listener below.
      if (pinchable && event.touches.length > 1 && event.cancelable) event.preventDefault();
    });
    useEffect(() => {
      const node = root.current;
      if (!node) return;
      const move = (event: TouchEvent) => onTouchMove(event);
      node.addEventListener("touchmove", move, { passive: false });
      return () => node.removeEventListener("touchmove", move);
    }, []);

    // Memoised over what it reads (0.55, held back from 0.52's review): built afresh on every
    // render, the binding was a new prop — and its layer a new element — for the chart,
    // which then drew every series, axis and tick again for a render of the page that
    // changed nothing in it.
    //
    // Switched off, the chart still gets a binding — with no window and no layer — so a
    // chart whose series change type mid-life is not remounted by a different tree.
    const binding = useMemo<ZoomBinding>(() => {
      if (setting === "none") return NO_BINDING;
      const state: ZoomState = { x: xWindow, y: ownY };
      return {
        ...zoomDomains(state, source),
        layer: (
          <ZoomLayer
            root={root}
            axisIds={source.axes.map((axis) => axis.id)}
            only={only}
            whole={dataWhole}
            window={xWindow}
            pinchable={pinchable}
            onZoom={(selection) =>
              setHistory((was) => {
                const next = zoomAfter({ x: was.x, y: was.y[id] ?? null }, selection, source);
                return zoomStep(zoomMove(was, id, next.x, next.y), was);
              })
            }
            onPinch={(phase, window, zooming) => {
              if (phase === "start") {
                pinchFrom.current = { x: history.x, y: history.y };
                setPinching(true);
                return;
              }
              const from = pinchFrom.current;
              if (phase === "end") {
                setPinching(false);
                // One step for the whole gesture, from where it began; a pan is none.
                if (zooming) setHistory((was) => zoomStep(was, from));
                return;
              }
              setHistory((was) => zoomMove(was, id, window, zooming ? null : (from.y[id] ?? null)));
            }}
            onReset={clear}
            strip={strip}
            stripName={labels.zoomWindow}
            stripRange={labels.zoomWindowRange}
            // A pan is no step: Back returns to before the zoom it panned.
            onPan={(window) => setHistory((was) => zoomMove(was, id, window, was.y[id] ?? null))}
          />
        ),
      };
    }, [
      setting,
      xWindow,
      ownY,
      history,
      id,
      source,
      dataWhole,
      only,
      pinchable,
      setHistory,
      clear,
      strip,
      labels.zoomWindow,
      labels.zoomWindowRange,
    ]);

    if (setting === "none") {
      return (
        <div ref={root} className="relative">
          <Chart {...props} zoom={binding} />
        </div>
      );
    }

    return (
      <div ref={root} className={cn("relative", pinching && "touch-none")}>
        <Chart {...props} zoom={binding} />
        {zoomed && !empty && (
          <div className="absolute end-1 top-1 z-10 flex gap-1">
            {history.back.length > 0 && (
              <button type="button" onClick={back} className={CORNER_BUTTON}>
                <Undo2 aria-hidden className="size-3 rtl:-scale-x-100" /> {labels.zoomBack}
              </button>
            )}
            <button type="button" onClick={clear} className={CORNER_BUTTON}>
              <X aria-hidden className="size-3" /> {labels.resetZoom}
            </button>
          </div>
        )}
        {overview && <div ref={slotRef} data-zoom-overview-slot="" />}
      </div>
    );
  }
  Zoomable.displayName = `withChartZoom(${Chart.displayName ?? Chart.name ?? "Chart"})`;
  return Zoomable;
}

/**
 * How long a trackpad pinch's wheel may pause before the pinch counts as over: the end of
 * one zoom step for Back. Chrome sends a pinch as a wheel event a frame, and the notches of
 * one spin of a mouse wheel with Ctrl held come well inside it; a reader who pinches again
 * after a pause has made a second zoom.
 */
const TRACKPAD_QUIET_MS = 300;

/** WebKit's GestureEvent, which lib.dom does not declare: Safari's two-finger pinch, on a
 *  Mac's trackpad and on iOS. `scale` is the fingers' spread over their spread at
 *  `gesturestart` (1 there). Only the fields read here. */
interface WebKitGestureEvent extends UIEvent {
  readonly scale: number;
  readonly clientX: number;
}
const WEBKIT_GESTURE_EVENTS = ["gesturestart", "gesturechange", "gestureend"] as const;

/** A trackpad pinch under way. One pinch may arrive both ways at once; the way it came
 *  first zooms, and the other is only kept from zooming the page. */
interface TrackpadPinch {
  via: "wheel" | "safari";
  /** The window it began on, and the one it shows now: unset until it first moves
   *  anything (a Safari pinch begins at its first `gesturechange`). */
  start?: XWindow;
  window?: XWindow;
  /** How many times larger than `start` it shows the window (see `pinchScale`). */
  scale: number;
  /** Whether it changed the window's width enough to be a zoom step (`pinchZoomed`). */
  zooming: boolean;
  /** Ended (Safari's `gestureend`), and kept until the wheel is quiet: a Ctrl + wheel that
   *  trails it is the same pinch's. */
  over: boolean;
}

/**
 * The part that lives INSIDE the recharts chart, where recharts will say where the plot
 * is and what value a pixel is.
 *
 * A transparent rectangle over the plot area that reads the pointer. It does NOT stop the
 * event: recharts drives its tooltip from the same pointer move bubbling up to its own
 * wrapper, so swallowing it here would trade the tooltip for the zoom.
 *
 * **A mouse (or a pen) draws the band; a finger reads** (Kurvenschmiede production
 * feedback, 2026-11, Marcel's design of 2026-11-12). On a phone a drag across the plot is
 * how a curve is READ — the tooltip following the finger — and one finger drew a zoom band
 * instead, so reading a value zoomed into it. Now:
 *
 * - One finger stands recharts' pointer where it is (`pointAt`, the hover a mouse sets),
 *   on touch-down and on every move, so the tooltip follows it along the curve. A
 *   vertical swipe is still the page's: ChartContainer is `touch-pan-y`, so horizontal
 *   movement is the chart's and vertical the browser's. Lifting the finger KEEPS the
 *   tooltip, as a tap always has: the value stays readable once the finger is out of the
 *   way. The next touch, a reset, or the mouse moves it.
 * - Two fingers zoom x about their midpoint and, as they move together, pan it
 *   (`pinchWindow`): tracked by pointer id, as ZoomableImage tracks its pinch. Lifting one
 *   ends the pinch, and the finger still down reads on.
 * - A trackpad pinch zooms x about the cursor (`zoomWindowAt`), one step a pinch (0.62).
 *

 * Nothing to assistive technology (0.52, refactor audit 2026-10-30, DSP-5): it was a
 * `role="application"` named by the drag hint, which could not take focus — the one name
 * on an otherwise unnamed chart. The hint is in the chart's description now
 * (`SeriesChart`'s figure), and `data-zoom-surface` is how a test finds the rect.
 */
function ZoomLayer({
  root,
  axisIds,
  only,
  whole: dataWhole,
  window,
  pinchable,
  onZoom,
  onPinch,
  onReset,
  strip,
  stripName,
  stripRange,
  onPan,
}: {
  /** The zoomable chart's own root, which hears a trackpad pinch over any of it. */
  root: RefObject<HTMLDivElement | null>;
  axisIds: string[];
  only?: "x" | "y";
  /** The range a pinch stops at when the chart does not say its own (see `ZoomRange`). */
  whole?: [number, number];
  /** The x window on show, `undefined` for the whole range. */
  window?: [number, number];
  /** Whether two fingers, and a trackpad pinch, zoom x. */
  pinchable: boolean;
  onZoom: (selection: ZoomSelection) => void;
  /** A two-finger gesture, or a trackpad pinch: its start, each move with the window it
   *  leaves (`undefined` once it shows the whole range) and whether it has zoomed rather
   *  than panned, and its end. */
  onPinch: (phase: "start" | "move" | "end", window?: [number, number], zooming?: boolean) => void;
  onReset: () => void;
  /** Where the overview strip goes while x is zoomed; `null` draws none. */
  strip: HTMLElement | null;
  stripName: string;
  stripRange: (from: string, to: string) => string;
  /** The strip moved the window: a pan. */
  onPan: (window: [number, number]) => void;
}) {
  const plot = usePlotArea();
  const xInverse = useXAxisInverseScale();
  const range = useContext(ZoomRangeContext);
  const drawnWhole = range?.whole;
  const whole = drawnWhole ?? dataWhole;
  // One probe COMPONENT per axis rather than a hook in a loop: the number of axes
  // changes as series are toggled, and a hook count that changes with the data is the
  // one thing React will not forgive.
  const [scales] = useState(() => new Map<string, InverseScaleFunction | undefined>());
  const [drag, setDrag] = useState<ZoomDrag | null>(null);
  // A finished drag is followed by a click on the same element, and a chart with an
  // `onClick` (keksdose opens a drilldown on one) would read the zoom as a pick.
  const draggedRef = useRef(false);
  // The fingers on the plot, by pointer id, in the chart's px.
  const fingers = useRef(new Map<number, { x: number; y: number }>());
  // The two-finger gesture under way: its fingers, where it began, and whether it zooms.
  const pinch = useRef<{ ids: [number, number]; start: PinchStart; zooming: boolean } | null>(null);
  // The overlay, whose screen box is where the plot is: what a trackpad pinch's cursor is
  // read against.
  const surface = useRef<SVGRectElement>(null);
  // The trackpad pinch under way, and the timer that ends a wheel's (see `TRACKPAD_QUIET_MS`).
  const trackpad = useRef<TrackpadPinch | null>(null);
  const quiet = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** The window on show: the zoom's own while zoomed (the axis draws exactly that, under
   *  `allowDataOverflow`), else the whole range as the chart draws it — said by the chart,
   *  or read back off the x scale at the plot's edges. */
  const shown = (): [number, number] | undefined => {
    if (window ?? drawnWhole) return window ?? drawnWhole;
    if (!plot) return dataWhole;
    const from = Number(xInverse?.(plot.x));
    const to = Number(xInverse?.(plot.x + plot.width));
    return Number.isFinite(from) && Number.isFinite(to) && to > from ? [from, to] : dataWhole;
  };

  /* A trackpad pinch (0.62): Chrome, Edge and Firefox send it as a wheel with `ctrlKey`,
     Safari as WebKit's gesture events, and either left alone zooms the whole page. Over a
     chart whose zoom names x it zooms x about the cursor instead, as ZoomableImage zooms
     its picture, and a mouse's Ctrl (⌘) + wheel does the same. Heard on the chart's root,
     so the axes and the strip take it too; a plain wheel still scrolls the page. Each
     pinch is one step for Back, through the two-finger gesture's own `onPinch`. */

  /** The pinch, `now`, `scale` times larger than where it began, about the cursor at
   *  `clientX`. */
  const pinchTo = (now: TrackpadPinch, scale: number, clientX: number) => {
    const box = surface.current?.getBoundingClientRect();
    if (!box || !plot || !whole || !now.start || !now.window) return;
    now.scale = pinchScale(scale, now.start, whole);
    const span = (now.start[1] - now.start[0]) / now.scale;
    const next = zoomWindowAt(now.window, span, clientX - box.left, plot.width, whole);
    now.window = next;
    now.zooming = pinchZoomed(now.start, next);
    onPinch("move", isWholeRange(next, whole) ? undefined : next, now.zooming);
  };
  /** The pinch begun on the window on show: the view Back returns to once it has zoomed. */
  const beginTrackpad = (now: TrackpadPinch) => {
    const from = shown();
    if (!from) return false;
    now.start = from;
    now.window = from;
    onPinch("start");
    return true;
  };
  /** The pinch over: one zoom step, if it zoomed. Kept as `over` until the wheel is quiet. */
  const endTrackpad = () => {
    const now = trackpad.current;
    if (!now) return;
    if (now.start && !now.over) onPinch("end", undefined, now.zooming);
    now.over = true;
  };
  const onQuiet = useEffectEvent(() => {
    endTrackpad();
    trackpad.current = null;
  });
  /** (Re)starts the quiet spell after which the pinch is over. */
  const untilQuiet = useEffectEvent(() => {
    clearTimeout(quiet.current);
    quiet.current = setTimeout(() => onQuiet(), TRACKPAD_QUIET_MS);
  });

  const onWheel = useEffectEvent((event: WheelEvent) => {
    // A plain wheel scrolls the page, as anywhere else.
    if (!pinchable || !(event.ctrlKey || event.metaKey) || !plot || !(plot.width > 0) || !whole) return;
    event.preventDefault();
    const now = trackpad.current;
    // Two fingers on a touch screen are their pointers'. A Safari pinch is its gesture
    // events': a wheel beside them, or trailing them, is the same pinch, which zooms once.
    if (pinch.current) return;
    if (now?.via === "safari") {
      if (now.over) untilQuiet();
      return;
    }
    untilQuiet();
    let wheel = now;
    if (!wheel) {
      wheel = { via: "wheel", scale: 1, zooming: false, over: false };
      if (!beginTrackpad(wheel)) return;
      trackpad.current = wheel;
    }
    // A turn and its reverse cancel, and a trackpad's many small deltas add up to what one
    // notch does: ZoomableImage's factor, measured from where the pinch began.
    pinchTo(wheel, wheel.scale * wheelZoomFactor(event.deltaY, event.deltaMode, plot.height), event.clientX);
  });

  const onSafariGesture = useEffectEvent((event: WebKitGestureEvent) => {
    if (!pinchable || !plot || !(plot.width > 0) || !whole) return;
    event.preventDefault();
    const now = trackpad.current;
    // iOS Safari sends a touch screen's pinch as these events too, beside the pointer
    // events two fingers already follow: applied both ways, one pinch would zoom twice.
    // A Mac's trackpad puts no finger down on the plot, so one there says the pinch is the
    // fingers', and this side only prevents the event (what keeps iOS from zooming the
    // page). Asked on every event: two fingers that land together may send `gesturestart`
    // before either `pointerdown` (ZoomableImage's rule, 0.60).
    if (fingers.current.size > 0) {
      if (now?.via === "safari") {
        endTrackpad();
        trackpad.current = null;
      }
      return;
    }
    if (event.type === "gesturestart") {
      // A wheel pinch under way is this same pinch, arriving both ways.
      if (now?.via === "wheel") return;
      clearTimeout(quiet.current);
      // Begun at its first change, not here: the fingers may yet land on the plot.
      trackpad.current = { via: "safari", scale: 1, zooming: false, over: false };
      return;
    }
    if (now?.via !== "safari" || now.over) return;
    if (event.type === "gestureend") {
      endTrackpad();
      untilQuiet();
      return;
    }
    // `scale` is the fingers' spread over their spread at `gesturestart`; a missing one
    // would make the window NaN wide.
    if (!(event.scale > 0) || (!now.start && !beginTrackpad(now))) return;
    pinchTo(now, event.scale, event.clientX);
  });

  // Native listeners, because each must be able to cancel: React attaches `wheel` as
  // passive, where `preventDefault` is ignored, and has no `gesture*` events at all.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => onWheel(event);
    // lib.dom types an unknown event's listener as taking an `Event`.
    const gesture = (event: Event) => onSafariGesture(event as WebKitGestureEvent);
    node.addEventListener("wheel", wheel, { passive: false });
    for (const type of WEBKIT_GESTURE_EVENTS) node.addEventListener(type, gesture);
    const timer = quiet;
    return () => {
      node.removeEventListener("wheel", wheel);
      for (const type of WEBKIT_GESTURE_EVENTS) node.removeEventListener(type, gesture);
      clearTimeout(timer.current);
    };
  }, [root]);

  if (!plot || plot.width <= 0 || plot.height <= 0) return null;

  const at = (event: { clientX: number; clientY: number; currentTarget: Element }) => {
    // Against the overlay's own screen box, so padding around the container cannot
    // shift every reading — plus the plot's offset, because the scales are in the
    // chart's coordinates rather than the plot's.
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left + plot.x, y: event.clientY - box.top + plot.y };
  };

  /** Where a mouse band's end is: the pointer, kept on the plot. Pointer capture keeps the
   *  drag alive past the plot's edge, and there the scales read on into values the chart
   *  does not draw — a window outside the data, whose overview handle then ran off its
   *  track. The plot shows the window on show, which is inside the range the chart draws
   *  unzoomed (`ZoomRange.whole`): stopped at the plot, a band is inside both, on y too,
   *  and is never cut down to nothing in a `SharedXZoom` column whose charts span
   *  different ranges, as a clamp to this chart's own range could. The band drawn while
   *  dragging stops there too, so it shows what the zoom will be. */
  const onPlot = (point: { x: number; y: number }) => ({
    x: Math.min(Math.max(point.x, plot.x), plot.x + plot.width),
    y: Math.min(Math.max(point.y, plot.y), plot.y + plot.height),
  });

  const finish = () => {
    if (!drag) return;
    setDrag(null);
    const selection = selectionFromDrag(drag, plot, xInverse, (id) => scales.get(id), axisIds, only);
    draggedRef.current = selection !== null;
    if (selection) onZoom(selection);
  };

  const touchDown = (event: PointerEvent<SVGRectElement>) => {
    draggedRef.current = false;
    const down = fingers.current;
    // A primary pointer starts a new touch: no other finger is down, whatever a lost
    // `pointerup` left in the map.
    if (event.isPrimary) down.clear();
    const point = at(event);
    down.set(event.pointerId, point);
    if (down.size === 1) {
      pointAt(event.currentTarget, point.x, point.y);
      return;
    }
    if (down.size !== 2 || !pinchable || !whole || pinch.current) return;
    // Two fingers on the plot are a touch screen's pinch: a trackpad pinch that began before
    // them (iOS's gesture events) is over, as one step, before this one starts.
    if (trackpad.current) {
      endTrackpad();
      trackpad.current = null;
      clearTimeout(quiet.current);
    }
    const from = shown();
    if (!from) return;
    const [[idA, a], [idB, b]] = [...down.entries()];
    pinch.current = { ids: [idA, idB], start: { window: from, a: a.x - plot.x, b: b.x - plot.x }, zooming: false };
    // Two fingers are not reading: the tooltip of the first would stand over a plot that
    // is rescaling under it.
    pointAt(event.currentTarget, -1, 0);
    onPinch("start");
  };

  const touchMove = (event: PointerEvent<SVGRectElement>) => {
    const down = fingers.current;
    if (!down.has(event.pointerId)) return;
    const point = at(event);
    down.set(event.pointerId, point);
    const now = pinch.current;
    if (!now) {
      if (down.size === 1) pointAt(event.currentTarget, point.x, point.y);
      return;
    }
    const a = down.get(now.ids[0]);
    const b = down.get(now.ids[1]);
    if (!a || !b || !whole) return;
    const next = pinchWindow(now.start, a.x - plot.x, b.x - plot.x, plot.width, whole);
    now.zooming = pinchZoomed(now.start.window, next);
    onPinch("move", isWholeRange(next, whole) ? undefined : next, now.zooming);
  };

  const touchUp = (event: PointerEvent<SVGRectElement>) => {
    const down = fingers.current;
    down.delete(event.pointerId);
    const now = pinch.current;
    if (!now || !now.ids.includes(event.pointerId)) return;
    pinch.current = null;
    onPinch("end", undefined, now.zooming);
    // Two fingers down to one: the one still down reads on from where it is.
    const survivor = [...down.values()][0];
    if (survivor) pointAt(event.currentTarget, survivor.x, survivor.y);
  };

  // What the drag would do, shown while it is being made: a band paints the full width
  // or height, so the reader sees it is about to let the other axis refit.
  const which = drag
    ? zoomAxesFor(drag.toX - drag.fromX, drag.toY - drag.fromY, plot.width, plot.height, ZOOM_SQUARE_ENOUGH, only)
    : null;

  return (
    <g>
      {axisIds.map((id) => (
        <AxisProbe key={id} axisId={id} scales={scales} />
      ))}
      {drag && which && (
        <rect
          x={which === "y" ? plot.x : Math.min(drag.fromX, drag.toX)}
          y={which === "x" ? plot.y : Math.min(drag.fromY, drag.toY)}
          width={which === "y" ? plot.width : Math.abs(drag.toX - drag.fromX)}
          height={which === "x" ? plot.height : Math.abs(drag.toY - drag.fromY)}
          className="fill-[var(--brand)]/15 stroke-[var(--brand)]"
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
      <rect
        x={plot.x}
        y={plot.y}
        width={plot.width}
        height={plot.height}
        ref={surface}
        // `transparent`, not `none`: an unpainted shape takes no pointer events.
        fill="transparent"
        data-zoom-surface=""
        style={{ cursor: "crosshair" }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") {
            touchDown(event);
            return;
          }
          if (event.button !== 0) return;
          draggedRef.current = false;
          const point = onPlot(at(event));
          // Best effort: capture keeps a drag alive past the plot's edge, but a
          // pointer id the environment does not know throws — jsdom refuses them all —
          // and a zoom that threw on pointer-down would be a chart nobody could click.
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* the drag still works; it just stops at the edge of the plot */
          }
          setDrag({ fromX: point.x, fromY: point.y, toX: point.x, toY: point.y });
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "touch") {
            touchMove(event);
            return;
          }
          if (!drag) return;
          const point = onPlot(at(event));
          setDrag({ ...drag, toX: point.x, toY: point.y });
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "touch") touchUp(event);
          else finish();
        }}
        onPointerCancel={(event) => {
          // A cancel is the browser taking the touch over — the vertical swipe that
          // scrolls the page — or a pinch it would not leave to us: either way it ends.
          if (event.pointerType === "touch") touchUp(event);
          else setDrag(null);
        }}
        // recharts follows a touch itself (its wrapper's `touchmove`, from the FIRST
        // finger), which during a pinch is a tooltip jumping over a plot that rescales
        // under it. Two fingers are the zoom's, so their moves stop here.
        onTouchMove={(event) => {
          if (pinch.current) event.stopPropagation();
        }}
        onClick={(event) => {
          if (!draggedRef.current) return;
          draggedRef.current = false;
          event.stopPropagation();
        }}
        onDoubleClick={onReset}
      />
      {strip &&
        window &&
        whole &&
        createPortal(
          <ZoomOverview
            whole={whole}
            window={window}
            left={plot.x}
            width={plot.width}
            label={range?.label}
            name={stripName}
            range={stripRange}
            onPan={onPan}
          />,
          strip,
        )}
    </g>
  );
}

/** One axis's pixel→value function, parked where the pointer handler can reach it. */
function AxisProbe({ axisId, scales }: { axisId: string; scales: Map<string, InverseScaleFunction | undefined> }) {
  const inverse = useYAxisInverseScale(axisId);
  useEffect(() => {
    scales.set(axisId, inverse);
    return () => {
      scales.delete(axisId);
    };
  }, [axisId, inverse, scales]);
  return null;
}
