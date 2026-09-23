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
// by the reset button, by a double click, and by nothing else.
//
// Everything with a decision in it is a pure exported function below (`zoomAxesFor`,
// `selectionFromDrag`, `zoomAfter`, `zoomDomains`, `fitYToX`, `fitXToY`); the
// components are plumbing between a pointer and those.
import { createContext, useContext, useEffect, useState } from "react";
import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react";
import {
  usePlotArea,
  useXAxisInverseScale,
  useYAxisInverseScale,
  type InverseScaleFunction,
} from "recharts";
import { X } from "lucide-react";
import { useKitLabels } from "../i18n/kit-labels";
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
): ZoomAxes | null {
  if (!(width > 0) || !(height > 0)) return null;
  const across = Math.abs(dx) / width;
  const down = Math.abs(dy) / height;
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
): ZoomSelection | null {
  const which = zoomAxesFor(drag.toX - drag.fromX, drag.toY - drag.fromY, plot.width, plot.height);
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

/** What a band refit needs to know about the chart — a subset of `SeriesChart`'s own
 *  props, so a chart hands its data straight over. */
export interface ZoomFitSource {
  rows: Record<string, number>[];
  series: { key: string; axis?: string }[];
  axes: { id: string }[];
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
function widen(span: Span, value: number): Span {
  if (!Number.isFinite(value)) return span;
  if (!span) return [value, value];
  if (value < span[0]) span[0] = value;
  else if (value > span[1]) span[1] = value;
  return span;
}

/** Which series are measured on an axis. */
function keysOn(source: ZoomFitSource, axisId: string): string[] {
  return source.series
    .filter((entry) => (entry.axis ?? DEFAULT_Y_AXIS) === axisId)
    .map((entry) => entry.key);
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
export function fitYToX(
  source: ZoomFitSource,
  window: readonly [number, number],
): Record<string, [number, number]> {
  const [from, to] = window;
  const fitted: Record<string, [number, number]> = {};
  for (const axis of source.axes) {
    const keys = keysOn(source, axis.id);
    let span: Span;
    for (const row of source.rows) {
      const at = row[source.xKey];
      if (!(at >= from && at <= to)) continue;
      for (const key of keys) span = widen(span, row[key]);
    }
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
        if (Number.isFinite(value) && value >= low && value <= high) {
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
export function zoomAfter(
  state: ZoomState,
  selection: ZoomSelection,
  source: ZoomFitSource,
): ZoomState {
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

/* ── The components ─────────────────────────────────────────────────────── */

/** What the wrapped chart is handed. It applies the domains to its own axes and renders
 *  `layer` INSIDE the recharts chart, where recharts' hooks answer. */
export interface ZoomBinding {
  xDomain?: [number, number];
  yDomains: Record<string, [number, number]>;
  layer: ReactNode;
}

/** The props `withChartZoom` reads off the chart it wraps. */
export interface ZoomTarget {
  /** Default: the single axis {@link DEFAULT_Y_AXIS}. */
  axes?: readonly { id: string; hide?: boolean }[];
  /** The chart's own data, so a band can refit the axis it did not name. Optional: a
   *  chart with nothing plotted has nothing to fit to. */
  rows?: Record<string, number>[];
  series?: readonly { key: string; axis?: string }[];
  x?: { key?: string };
  zoom?: ZoomBinding;
  labels?: Partial<SeriesChartLabels>;
}

const SharedX = createContext<{
  window?: [number, number];
  set: Dispatch<SetStateAction<[number, number] | undefined>>;
} | null>(null);

/**
 * One x window for several charts.
 *
 * A column of charts over one abscissa is one picture, and zooming one of them and not
 * the rest turns it into several pictures of different things. Every zoomable chart
 * inside this shares the x window: any drag in any of them moves all of them.
 *
 * **Only x.** The y axes stay each chart's own — they are in different units — and
 * each refits its own y to what is inside the shared window.
 */
export function SharedXZoom({ children }: { children: ReactNode }) {
  const [window, set] = useState<[number, number] | undefined>(undefined);
  return <SharedX.Provider value={{ window, set }}>{children}</SharedX.Provider>;
}

/**
 * Wrap a chart in drag-to-zoom.
 *
 * The chart receives a `zoom` binding: it applies `xDomain`/`yDomains` to its axes
 * (with `allowDataOverflow`, so recharts clips to the window instead of widening it
 * back out) and renders `layer` as a child of its recharts chart. A reset button
 * appears over the chart's top end corner while it is zoomed — a real button, so the
 * keyboard can undo what the pointer did.
 */
export function withChartZoom<P extends ZoomTarget>(Chart: ComponentType<P>) {
  function Zoomable(props: P) {
    const labels = useKitLabels("seriesChart", DEFAULT_SERIES_CHART_LABELS, props.labels);
    const group = useContext(SharedX);
    const [ownX, setOwnX] = useState<[number, number] | undefined>(undefined);
    const [ownY, setOwnY] = useState<Record<string, [number, number]> | null>(null);
    const xWindow = group ? group.window : ownX;
    const setXWindow = group ? group.set : setOwnX;
    const axes = props.axes ?? [{ id: DEFAULT_Y_AXIS }];

    // Every axis, hidden ones included: a hidden axis still scales its lines, and a
    // line whose axis did not refit is drawn as a flat streak inside the window.
    const source: ZoomFitSource = {
      rows: props.rows ?? [],
      series: [...(props.series ?? [])],
      axes: [...axes],
      xKey: props.x?.key ?? "x",
    };
    const state: ZoomState = { x: xWindow, y: ownY };
    const zoomed = xWindow !== undefined || ownY !== null;

    const clear = () => {
      setXWindow(undefined);
      setOwnY(null);
    };

    const binding: ZoomBinding = {
      ...zoomDomains(state, source),
      layer: (
        <ZoomLayer
          axisIds={axes.map((axis) => axis.id)}
          label={labels.zoomHint}
          onZoom={(selection) => {
            const next = zoomAfter(state, selection, source);
            if (next.x !== xWindow) setXWindow(next.x);
            setOwnY(next.y);
          }}
          onReset={clear}
        />
      ),
    };

    return (
      <div className="relative">
        <Chart {...props} zoom={binding} />
        {zoomed && (
          <button
            type="button"
            onClick={clear}
            className="absolute end-1 top-1 z-10 inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--bg-surface)]/90 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] backdrop-blur transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <X aria-hidden className="size-3" /> {labels.resetZoom}
          </button>
        )}
      </div>
    );
  }
  Zoomable.displayName = `withChartZoom(${Chart.displayName ?? Chart.name ?? "Chart"})`;
  return Zoomable;
}

/**
 * The part that lives INSIDE the recharts chart, where recharts will say where the plot
 * is and what value a pixel is.
 *
 * A transparent rectangle over the plot area that reads the drag. It does NOT stop the
 * event: recharts drives its tooltip from the same pointer move bubbling up to its own
 * wrapper, so swallowing it here would trade the tooltip for the zoom.
 */
function ZoomLayer({
  axisIds,
  label,
  onZoom,
  onReset,
}: {
  axisIds: string[];
  label: string;
  onZoom: (selection: ZoomSelection) => void;
  onReset: () => void;
}) {
  const plot = usePlotArea();
  const xInverse = useXAxisInverseScale();
  // One probe COMPONENT per axis rather than a hook in a loop: the number of axes
  // changes as series are toggled, and a hook count that changes with the data is the
  // one thing React will not forgive.
  const [scales] = useState(() => new Map<string, InverseScaleFunction | undefined>());
  const [drag, setDrag] = useState<ZoomDrag | null>(null);

  if (!plot || plot.width <= 0 || plot.height <= 0) return null;

  const at = (event: { clientX: number; clientY: number; currentTarget: Element }) => {
    // Against the overlay's own screen box, so padding around the container cannot
    // shift every reading — plus the plot's offset, because the scales are in the
    // chart's coordinates rather than the plot's.
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left + plot.x, y: event.clientY - box.top + plot.y };
  };

  const finish = () => {
    if (!drag) return;
    setDrag(null);
    const selection = selectionFromDrag(drag, plot, xInverse, (id) => scales.get(id), axisIds);
    if (selection) onZoom(selection);
  };

  // What the drag would do, shown while it is being made: a band paints the full width
  // or height, so the reader sees it is about to let the other axis refit.
  const which = drag
    ? zoomAxesFor(drag.toX - drag.fromX, drag.toY - drag.fromY, plot.width, plot.height)
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
        // `transparent`, not `none`: an unpainted shape takes no pointer events.
        fill="transparent"
        role="application"
        aria-label={label}
        style={{ cursor: "crosshair" }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const point = at(event);
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
          if (!drag) return;
          const point = at(event);
          setDrag({ ...drag, toX: point.x, toY: point.y });
        }}
        onPointerUp={finish}
        onPointerCancel={() => setDrag(null)}
        onDoubleClick={onReset}
      />
    </g>
  );
}

/** One axis's pixel→value function, parked where the pointer handler can reach it. */
function AxisProbe({
  axisId,
  scales,
}: {
  axisId: string;
  scales: Map<string, InverseScaleFunction | undefined>;
}) {
  const inverse = useYAxisInverseScale(axisId);
  useEffect(() => {
    scales.set(axisId, inverse);
    return () => {
      scales.delete(axisId);
    };
  }, [axisId, inverse, scales]);
  return null;
}
