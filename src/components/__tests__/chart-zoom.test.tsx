import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  NO_ZOOM,
  SharedXZoom,
  ZOOM_MIN_DRAG,
  ZOOM_SQUARE_ENOUGH,
  fitXToY,
  fitYToX,
  selectionFromDrag,
  withChartZoom,
  zoomAfter,
  zoomAxesFor,
  zoomDomains,
  type ZoomBinding,
  type ZoomFitSource,
  type ZoomSelection,
} from "../chart-zoom";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * Drag-to-zoom, ported from lenkbank's `with-zoom` / `zoom-fit` / `zoom-layer` suites.
 *
 * Most of this file is the arithmetic, because that is where every decision is: what a
 * drag meant, what the axis nobody dragged should show, and how two drags compose. The
 * last block drives the HOC end to end with recharts' three hooks stubbed — a plot of a
 * known size and scales somebody can do in their head — around a chart that is nothing
 * but an `<svg>` rendering the layer. (`series-chart.test.tsx` drives the same drag
 * through a REAL recharts chart.)
 */

const PLOT = { x: 60, y: 10, width: 900, height: 300 };

vi.mock("recharts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("recharts")>()),
  usePlotArea: () => PLOT,
  // x reads straight off the pixel; y counts the other way, as a y axis does — pixel
  // 10 (the top) is 300 and pixel 310 (the bottom) is 0.
  useXAxisInverseScale: () => (pixel: number) => pixel - PLOT.x,
  useYAxisInverseScale: () => (pixel: number) => PLOT.y + PLOT.height - pixel,
}));

/* ── What a drag means ──────────────────────────────────────────────────── */

describe("zoomAxesFor", () => {
  const axesFor = (dx: number, dy: number) => zoomAxesFor(dx, dy, PLOT.width, PLOT.height);

  it("zooms both axes when the selection covers a similar share of each", () => {
    // 450 of 900 across and 150 of 300 down: a 3:1 rectangle on screen, and a square
    // selection of the DATA.
    expect(axesFor(450, 150)).toBe("both");
  });

  it("zooms only x for a wide flat band and only y for a tall narrow one", () => {
    expect(axesFor(600, 10)).toBe("x");
    expect(axesFor(10, 240)).toBe("y");
  });

  it("reads a drag the same whichever direction it was made in", () => {
    expect(axesFor(-600, -10)).toBe("x");
    expect(axesFor(-10, -240)).toBe("y");
    expect(axesFor(-450, 150)).toBe("both");
  });

  it("takes a band even when the other direction never moved", () => {
    expect(axesFor(500, 0)).toBe("x");
    expect(axesFor(0, 200)).toBe("y");
  });

  it("ignores a drag under the minimum in BOTH directions, which is a click that moved", () => {
    expect(axesFor(4, 2)).toBeNull();
    const justUnder = ZOOM_MIN_DRAG * 0.99;
    expect(axesFor(justUnder * PLOT.width, justUnder * PLOT.height)).toBeNull();
    // Past the minimum in one direction is enough.
    expect(axesFor(ZOOM_MIN_DRAG * PLOT.width, 0)).toBe("x");
  });

  it("switches between box and band exactly at the threshold", () => {
    const across = 0.6;
    const down = across * ZOOM_SQUARE_ENOUGH;
    expect(axesFor(across * PLOT.width, down * PLOT.height)).toBe("both");
    expect(axesFor(across * PLOT.width, down * 0.9 * PLOT.height)).toBe("x");
  });

  it("honours a caller's own threshold", () => {
    expect(zoomAxesFor(450, 150, PLOT.width, PLOT.height, 0.99)).toBe("both");
    expect(zoomAxesFor(450, 100, PLOT.width, PLOT.height, 0.9)).toBe("x");
  });

  it("has nothing to say about a plot with no size, or a NaN one", () => {
    expect(zoomAxesFor(100, 100, 0, 0)).toBeNull();
    expect(zoomAxesFor(100, 100, NaN, 300)).toBeNull();
    expect(zoomAxesFor(100, 100, 900, -1)).toBeNull();
  });
});

describe("selectionFromDrag", () => {
  const xInverse = (pixel: number) => pixel - PLOT.x;
  const yInverse = () => (pixel: number) => PLOT.y + PLOT.height - pixel;

  it("turns a box into both windows, ascending whichever way it was dragged", () => {
    const drag = { fromX: 610, fromY: 210, toX: 160, toY: 60 };
    expect(selectionFromDrag(drag, PLOT, xInverse, yInverse, ["y"])).toEqual({
      which: "both",
      x: [100, 550],
      y: { y: [100, 250] },
    });
  });

  it("names no y window for an x band and no x window for a y band", () => {
    const band = selectionFromDrag({ fromX: 160, fromY: 100, toX: 760, toY: 110 }, PLOT, xInverse, yInverse, ["y"]);
    expect(band).toEqual({ which: "x", x: [100, 700], y: {} });
    const tall = selectionFromDrag({ fromX: 300, fromY: 60, toX: 310, toY: 260 }, PLOT, xInverse, yInverse, ["y"]);
    expect(tall).toEqual({ which: "y", y: { y: [50, 250] } });
  });

  it("gives every axis its own window, because they are in different units", () => {
    const scales: Record<string, (pixel: number) => number> = {
      position: (pixel) => 310 - pixel,
      jerk: (pixel) => (310 - pixel) * 1000,
    };
    const sel = selectionFromDrag(
      { fromX: 300, fromY: 60, toX: 310, toY: 260 },
      PLOT,
      xInverse,
      (id) => scales[id],
      ["position", "jerk"],
    );
    expect(sel?.y).toEqual({ position: [50, 250], jerk: [50000, 250000] });
  });

  it("leaves out an axis with no scale or a non-finite reading, rather than a NaN window", () => {
    const sel = selectionFromDrag(
      { fromX: 300, fromY: 60, toX: 310, toY: 260 },
      PLOT,
      xInverse,
      (id) => (id === "broken" ? () => "nope" : id === "gone" ? undefined : yInverse()),
      ["y", "broken", "gone"],
    );
    expect(Object.keys(sel!.y)).toEqual(["y"]);
  });

  it("selects nothing for a click, or when no axis can be read", () => {
    expect(selectionFromDrag({ fromX: 300, fromY: 100, toX: 302, toY: 101 }, PLOT, xInverse, yInverse, ["y"])).toBeNull();
    expect(
      selectionFromDrag({ fromX: 160, fromY: 100, toX: 760, toY: 110 }, PLOT, undefined, yInverse, ["y"]),
    ).toBeNull();
  });
});

/* ── What the axis nobody dragged shows ─────────────────────────────────── */

/** Two channels over one sweep: one that rises across it, one that only does anything
 *  in the middle — exactly the case a refit is for. */
const SOURCE: ZoomFitSource = {
  rows: [
    { x: 0, rise: 0, blip: 0 },
    { x: 1, rise: 10, blip: 0 },
    { x: 2, rise: 20, blip: 5 },
    { x: 3, rise: 30, blip: 0 },
    { x: 4, rise: 40, blip: 0 },
  ],
  series: [
    { key: "rise", axis: "left" },
    { key: "blip", axis: "right" },
  ],
  axes: [{ id: "left" }, { id: "right" }],
  xKey: "x",
};

describe("fitYToX", () => {
  it("fits every y axis to what is inside the window, with five per cent air", () => {
    const fitted = fitYToX(SOURCE, [1, 3]);
    expect(fitted.left[0]).toBeCloseTo(9, 6);
    expect(fitted.left[1]).toBeCloseTo(31, 6);
    expect(fitted.right[0]).toBeCloseTo(-0.25, 6);
    expect(fitted.right[1]).toBeCloseTo(5.25, 6);
  });

  it("includes the window's own edges", () => {
    const fitted = fitYToX(SOURCE, [4, 4]);
    expect(fitted.left[0]).toBeLessThan(40);
    expect(fitted.left[1]).toBeGreaterThan(40);
  });

  it("gives a flat channel a range it can be drawn in, centred on its value", () => {
    const flat = fitYToX(SOURCE, [3, 4]).right;
    expect(flat[0]).toBeLessThan(0);
    expect(flat[1]).toBeGreaterThan(0);
    const high = fitYToX({ ...SOURCE, rows: [{ x: 0, rise: 200, blip: 0 }] }, [0, 0]).left;
    expect(high).toEqual([190, 210]);
  });

  it("leaves out an axis with nothing inside the window rather than collapsing it", () => {
    expect(fitYToX({ ...SOURCE, rows: [] }, [1, 3])).toEqual({});
    expect(fitYToX(SOURCE, [10, 20])).toEqual({});
  });

  it("skips non-finite samples and rows with no abscissa", () => {
    const rows = [
      { x: 1, rise: NaN, blip: 0 },
      { x: 2, rise: 20, blip: Infinity },
      { rise: 999, blip: 999 } as Record<string, number>,
    ];
    const fitted = fitYToX({ ...SOURCE, rows }, [0, 5]);
    expect(fitted.left[0]).toBeLessThan(20);
    expect(fitted.left[1]).toBeLessThan(25);
    expect(fitted.right[1]).toBeLessThan(1);
  });

  it("reads a series with no axis of its own as the default `y` axis", () => {
    const single: ZoomFitSource = { rows: SOURCE.rows, series: [{ key: "rise" }], axes: [{ id: "y" }], xKey: "x" };
    expect(fitYToX(single, [0, 1]).y[1]).toBeGreaterThan(10);
  });

  it("reads its own abscissa key", () => {
    const rows = SOURCE.rows.map(({ x, ...rest }) => ({ t: x, ...rest }));
    expect(fitYToX({ ...SOURCE, rows, xKey: "t" }, [1, 3]).left[1]).toBeCloseTo(31, 6);
  });

  it("refits a stack wide enough to fault a spread", () => {
    // `Math.min(...values)` faults past ~125,000 arguments; 64 series over 2000 rows
    // is 128,000 samples, so the walk is what is under test.
    const keys = Array.from({ length: 64 }, (_, index) => `s${index}`);
    const wide: ZoomFitSource = {
      rows: Array.from({ length: 2000 }, (_, at) =>
        Object.fromEntries([["x", at], ...keys.map((key, index) => [key, at + index])]),
      ),
      series: keys.map((key) => ({ key })),
      axes: [{ id: "y" }],
      xKey: "x",
    };
    expect(fitYToX(wide, [0, 1999]).y[1]).toBeGreaterThan(2062);
    expect(fitXToY(wide, { y: [0, 2062] })![1]).toBeGreaterThan(1999);
  });
});

describe("fitXToY", () => {
  it("pulls x in to where the samples inside a y band are", () => {
    const fitted = fitXToY(SOURCE, { right: [4, 6] })!;
    expect(fitted[0]).toBeLessThanOrEqual(2);
    expect(fitted[1]).toBeGreaterThanOrEqual(2);
    expect(fitted[1] - fitted[0]).toBeLessThan(1);
  });

  it("spans every hit across several axes at once", () => {
    const fitted = fitXToY(SOURCE, { left: [35, 45], right: [4, 6] })!;
    expect(fitted[0]).toBeLessThan(2);
    expect(fitted[1]).toBeGreaterThan(4);
  });

  it("says nothing when no sample falls in the band, or the axis has no series", () => {
    expect(fitXToY(SOURCE, { right: [100, 200] })).toBeUndefined();
    expect(fitXToY(SOURCE, { nobody: [0, 100] })).toBeUndefined();
    expect(fitXToY(SOURCE, {})).toBeUndefined();
  });
});

/* ── How drags compose ──────────────────────────────────────────────────── */

describe("zoomAfter / zoomDomains", () => {
  const RAMP: ZoomFitSource = {
    rows: Array.from({ length: 901 }, (_, x) => ({ x, v: x })),
    series: [{ key: "v" }],
    axes: [{ id: "y" }],
    xKey: "x",
  };
  const box: ZoomSelection = { which: "both", x: [100, 550], y: { y: [100, 250] } };
  const xBand: ZoomSelection = { which: "x", x: [100, 700], y: {} };
  const yBand: ZoomSelection = { which: "y", y: { y: [50, 250] } };

  it("starts with no window, so every axis fits its own data", () => {
    expect(zoomDomains(NO_ZOOM, RAMP)).toEqual({ xDomain: undefined, yDomains: {} });
  });

  it("keeps both windows of a box exactly as dragged", () => {
    const state = zoomAfter(NO_ZOOM, box, RAMP);
    expect(zoomDomains(state, RAMP)).toEqual({ xDomain: [100, 550], yDomains: { y: [100, 250] } });
  });

  it("derives y from an x band, and re-derives it on every render", () => {
    const state = zoomAfter(NO_ZOOM, xBand, RAMP);
    expect(state.y).toBeNull();
    const { yDomains } = zoomDomains(state, RAMP);
    expect(yDomains.y[0]).toBeCloseTo(70, 6);
    expect(yDomains.y[1]).toBeCloseTo(730, 6);
  });

  it("throws away a dragged y when an x band follows it", () => {
    const state = zoomAfter(zoomAfter(NO_ZOOM, box, RAMP), xBand, RAMP);
    expect(state).toEqual({ x: [100, 700], y: null });
  });

  it("pulls x in to the samples inside a y band", () => {
    const state = zoomAfter(NO_ZOOM, yBand, RAMP);
    expect(state.y).toEqual({ y: [50, 250] });
    expect(state.x![0]).toBeGreaterThan(30);
    expect(state.x![1]).toBeLessThan(270);
  });

  it("keeps the x window when a y band holds no samples, instead of undoing it", () => {
    const empty: ZoomFitSource = { ...RAMP, rows: [] };
    const state = zoomAfter(zoomAfter(NO_ZOOM, xBand, empty), yBand, empty);
    expect(state).toEqual({ x: [100, 700], y: { y: [50, 250] } });
  });
});

/* ── The HOC, end to end ────────────────────────────────────────────────── */

/** A chart that is nothing but somewhere to put the layer, printing what it was handed. */
function StubChart({
  axes,
  zoom,
}: {
  axes?: { id: string; hide?: boolean }[];
  rows?: Record<string, number>[];
  series?: { key: string; axis?: string }[];
  zoom?: ZoomBinding;
  labels?: { resetZoom?: string };
}) {
  return (
    <svg data-testid="chart">
      <text>{JSON.stringify({ x: zoom?.xDomain ?? null, y: zoom?.yDomains ?? {} })}</text>
      {zoom?.layer}
      {axes?.map((axis) => <g key={axis.id} />)}
    </svg>
  );
}

const Zoomable = withChartZoom(StubChart);
const HINT = /drag to zoom/i;

function overlay(index = 0) {
  const rect = screen.getAllByLabelText(HINT)[index];
  // jsdom has no layout: the overlay's screen box starts where the plot does, which is
  // what the layer adds back to turn a client position into a chart one.
  rect.getBoundingClientRect = () => ({ left: PLOT.x, top: PLOT.y }) as DOMRect;
  return rect;
}

/** jsdom has no `PointerEvent`; a `MouseEvent` under the pointer event's name carries
 *  everything the handlers read — position, button, and an id. */
function pointer(target: Element, type: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerId", { value: 1 });
  fireEvent(target, event);
}

function drag(from: [number, number], to: [number, number], index = 0) {
  const rect = overlay(index);
  pointer(rect, "pointerdown", from[0], from[1]);
  pointer(rect, "pointermove", to[0], to[1]);
  pointer(rect, "pointerup", to[0], to[1]);
}

const bindings = () =>
  screen.getAllByTestId("chart").map((chart) => JSON.parse(chart.querySelector("text")!.textContent!));

describe("withChartZoom", () => {
  it("takes a box from a drag and offers a way back only once zoomed", () => {
    render(<Zoomable axes={[{ id: "y" }]} />);
    expect(screen.queryByRole("button", { name: /reset zoom/i })).toBeNull();
    drag([160, 60], [610, 210]);
    expect(bindings()[0]).toEqual({ x: [100, 550], y: { y: [100, 250] } });
    const reset = screen.getByRole("button", { name: /reset zoom/i });
    // A real button, so Tab reaches it and Enter/Space press it.
    expect(reset.tagName).toBe("BUTTON");
    expect(reset).toHaveAttribute("type", "button");
    fireEvent.click(reset);
    expect(bindings()[0]).toEqual({ x: null, y: {} });
    expect(screen.queryByRole("button", { name: /reset zoom/i })).toBeNull();
  });

  it("defaults to the single `y` axis when the chart names none", () => {
    render(<Zoomable />);
    drag([300, 60], [310, 260]);
    expect(bindings()[0].y).toEqual({ y: [50, 250] });
  });

  it("refits y from the chart's own data when an x band names only x", () => {
    render(<Zoomable axes={[{ id: "y" }]} rows={Array.from({ length: 901 }, (_, x) => ({ x, v: x }))} series={[{ key: "v" }]} />);
    drag([160, 100], [760, 110]);
    const { x, y } = bindings()[0];
    expect(x).toEqual([100, 700]);
    expect(y.y[0]).toBeGreaterThan(60);
    expect(y.y[1]).toBeLessThan(740);
  });

  it("refits a HIDDEN axis too, since it still scales its lines", () => {
    render(
      <Zoomable
        axes={[{ id: "y" }, { id: "jerk", hide: true }]}
        rows={Array.from({ length: 11 }, (_, x) => ({ x: x * 90, v: x, j: x * 1000 }))}
        series={[{ key: "v" }, { key: "j", axis: "jerk" }]}
      />,
    );
    drag([160, 100], [760, 110]);
    expect(Object.keys(bindings()[0].y).sort()).toEqual(["jerk", "y"]);
  });

  it("ignores a drag too small to be a selection and a non-primary button", () => {
    render(<Zoomable axes={[{ id: "y" }]} />);
    drag([300, 100], [304, 102]);
    const rect = overlay();
    fireEvent(rect, Object.assign(new MouseEvent("pointerdown", { bubbles: true, button: 2, clientX: 160, clientY: 60 }), { pointerId: 1 }));
    pointer(rect, "pointermove", 610, 210);
    pointer(rect, "pointerup", 610, 210);
    expect(bindings()[0]).toEqual({ x: null, y: {} });
  });

  it("forgets a drag the pointer cancelled", () => {
    render(<Zoomable axes={[{ id: "y" }]} />);
    const rect = overlay();
    pointer(rect, "pointerdown", 160, 60);
    pointer(rect, "pointermove", 610, 210);
    pointer(rect, "pointercancel", 610, 210);
    pointer(rect, "pointerup", 610, 210);
    expect(bindings()[0]).toEqual({ x: null, y: {} });
  });

  it("draws the selection while it is being made, full height for an x band", () => {
    const { container } = render(<Zoomable axes={[{ id: "y" }]} />);
    const rect = overlay();
    pointer(rect, "pointerdown", 160, 100);
    pointer(rect, "pointermove", 760, 110);
    const preview = container.querySelector("rect[stroke-dasharray]")!;
    expect(preview.getAttribute("height")).toBe(String(PLOT.height));
    expect(preview.getAttribute("y")).toBe(String(PLOT.y));
  });

  it("puts the whole plot back on a double click", () => {
    render(<Zoomable axes={[{ id: "y" }]} />);
    drag([160, 60], [610, 210]);
    fireEvent.doubleClick(overlay());
    expect(bindings()[0]).toEqual({ x: null, y: {} });
  });

  it("moves every chart in a SharedXZoom, and leaves each one's y its own", () => {
    render(
      <SharedXZoom>
        <Zoomable axes={[{ id: "y" }]} />
        <Zoomable axes={[{ id: "y" }]} />
      </SharedXZoom>,
    );
    drag([160, 60], [610, 210], 0);
    const [first, second] = bindings();
    expect(first.x).toEqual([100, 550]);
    expect(second.x).toEqual([100, 550]);
    expect(first.y).toEqual({ y: [100, 250] });
    expect(second.y).toEqual({});
    // Either chart's reset clears the shared window for both.
    fireEvent.click(screen.getAllByRole("button", { name: /reset zoom/i })[1]);
    expect(bindings().map((b) => b.x)).toEqual([null, null]);
  });

  it("keeps charts outside a SharedXZoom independent", () => {
    render(
      <>
        <Zoomable axes={[{ id: "y" }]} />
        <Zoomable axes={[{ id: "y" }]} />
      </>,
    );
    drag([160, 100], [760, 110], 1);
    expect(bindings().map((b) => b.x)).toEqual([null, [100, 700]]);
  });

  it("speaks the provider's language, and a chart's own labels over that", () => {
    const wrap = (children: ReactNode) => (
      <UiKitProvider labels={{ seriesChart: { resetZoom: "Zoom zurücksetzen", zoomHint: "Ziehen" } }}>
        {children}
      </UiKitProvider>
    );
    render(wrap(<Zoomable axes={[{ id: "y" }]} labels={{ resetZoom: "Alles zeigen" }} />));
    // The hint comes from the provider; the reset text from the chart's own prop.
    const rect = screen.getByLabelText("Ziehen");
    rect.getBoundingClientRect = () => ({ left: PLOT.x, top: PLOT.y }) as DOMRect;
    pointer(rect, "pointerdown", 160, 60);
    pointer(rect, "pointermove", 610, 210);
    pointer(rect, "pointerup", 610, 210);
    expect(screen.getByRole("button", { name: "Alles zeigen" })).toBeInTheDocument();
  });
});
