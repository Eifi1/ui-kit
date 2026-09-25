import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  SeriesChart,
  StaticSeriesChart,
  anchoredBand,
  seriesLegendEntries,
  visibleSeries,
  type SeriesChartPoint,
  type SeriesChartProps,
} from "../series-chart";
import { STROKE_PATTERNS } from "../toggle-legend";

/**
 * The 0.8.0 marks — dots, references, markers, explicit ticks, category and time
 * abscissas, bars and areas — drawn by REAL recharts at a fixed 800x300, as in
 * `series-chart.test.tsx`, so every assertion is about what a reader would see.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const ROWS = [
  { x: 0, a: 1, b: 2 },
  { x: 1, a: 3 },
  { x: 2, a: 2, b: 5 },
  { x: 3, a: 4, b: 3 },
];

const MONTHS = [
  { period: "2026-01", income: 900, expense: -300, net: 600 },
  { period: "2026-02", income: 1200, expense: -500, net: 700 },
  { period: "2026-03", income: 800, expense: -900, net: -100 },
];

function draw(props: Partial<SeriesChartProps> = {}) {
  return render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} {...props} />);
}

const text = (container: HTMLElement, selector: string) =>
  [...container.querySelectorAll(`${selector} tspan`)].map((t) => t.textContent ?? "");
const xTicks = (container: HTMLElement) => text(container, ".recharts-xAxis-tick-labels");
const yTicks = (container: HTMLElement) => text(container, ".recharts-yAxis-tick-labels");
const bars = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-bar-rectangle path")] as SVGPathElement[];
/** A bar's left edge and top, off its path's first move-to. */
const barBox = (bar: SVGPathElement) => {
  const [x, y] = (bar.getAttribute("d") ?? "").match(/-?\d+(\.\d+)?/g)!.map(Number);
  return { x, y };
};

function dragOver(target: Element, from: [number, number], to: [number, number]) {
  target.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
  for (const [type, [x, y]] of [
    ["pointerdown", from],
    ["pointermove", to],
    ["pointerup", to],
  ] as const) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
    Object.defineProperty(event, "pointerId", { value: 1 });
    fireEvent(target, event);
  }
}
const hint = /drag to zoom/i;

describe("per-point dots", () => {
  it("rings every measured point with `dot: true`, and skips the holes", () => {
    const { container } = draw({ series: [{ key: "b", label: "B", dot: true }], connectNulls: true });
    const dots = [...container.querySelectorAll("circle.recharts-dot")];
    // Row 1 has no `b`: three dots for three samples, none invented at the gap.
    expect(dots).toHaveLength(3);
    expect(dots[0].getAttribute("fill")).toBe("var(--color-b)");
    expect(dots[0].getAttribute("stroke")).toBe("var(--bg-surface)");
  });

  it("asks a function per point, with the caller's row, and draws what it returns", () => {
    const seen: SeriesChartPoint[] = [];
    const { container } = draw({
      series: [
        {
          key: "a",
          label: "A",
          dot: (point) => {
            seen.push(point);
            if (point.index === 0) return true;
            if (point.value === 4) return <rect data-testid="trade" x={point.cx - 3} y={point.cy - 3} width={6} height={6} />;
            return false;
          },
        },
      ],
    });
    expect(seen.map((point) => [point.index, point.x, point.value])).toEqual([
      [0, 0, 1],
      [1, 1, 3],
      [2, 2, 2],
      [3, 3, 4],
    ]);
    expect(seen[1].row).toBe(ROWS[1]);
    expect(seen[0].color).toBe("var(--color-a)");
    expect(container.querySelectorAll("circle.recharts-dot")).toHaveLength(1);
    const trade = screen.getByTestId("trade");
    expect(Number(trade.getAttribute("x"))).toBeCloseTo(seen[3].cx - 3);
  });

  it("draws no dots by default", () => {
    const { container } = draw();
    expect(container.querySelectorAll("circle.recharts-dot")).toHaveLength(0);
  });
});

describe("references and markers", () => {
  it("draws a y reference across the plot, dashed and muted by default, with its label", () => {
    const { container } = draw({ references: [{ value: 2.5, label: "one month" }] });
    const [line] = [...container.querySelectorAll(".recharts-reference-line-line")];
    expect(line.getAttribute("stroke")).toBe("var(--text-muted)");
    expect(line.getAttribute("stroke-dasharray")).toBe(STROKE_PATTERNS[1]);
    // Horizontal, from one side of the plot to the other.
    expect(line.getAttribute("y1")).toBe(line.getAttribute("y2"));
    expect(screen.getByText("one month")).toBeInTheDocument();
  });

  it("takes a tone, a colour and a pattern", () => {
    const { container } = draw({
      references: [
        { value: 2, tone: "danger", dash: 2 },
        { value: 3, tone: "danger", color: "#abcdef", dash: 0 },
      ],
    });
    const lines = [...container.querySelectorAll(".recharts-reference-line-line")];
    expect(lines[0].getAttribute("stroke")).toBe("var(--danger)");
    expect(lines[0].getAttribute("stroke-dasharray")).toBe(STROKE_PATTERNS[2]);
    expect(lines[1].getAttribute("stroke")).toBe("#abcdef");
    expect(lines[1].getAttribute("stroke-dasharray")).toBeNull();
  });

  it("draws an x reference vertically, at a category in the axis' own terms", () => {
    const { container } = render(
      <SeriesChart
        rows={MONTHS}
        x={{ type: "category", key: "period" }}
        series={[{ key: "net", label: "Net" }]}
        references={[
          { axis: "x", value: "2026-02", label: "move" },
          { axis: "x", value: "2027-01" },
        ]}
      />,
    );
    // The unknown category draws nothing rather than a line somewhere.
    const lines = [...container.querySelectorAll(".recharts-reference-line-line")];
    expect(lines).toHaveLength(1);
    expect(lines[0].getAttribute("x1")).toBe(lines[0].getAttribute("x2"));
    expect(Number(lines[0].getAttribute("x1"))).toBeCloseTo(
      Number((screen.getByText("2026-02").closest("text") as SVGTextElement).getAttribute("x")),
    );
  });

  it("widens the fitted band to show a reference outside the data", () => {
    const { container } = draw({ axes: [{ id: "y", title: "", format: String }], references: [{ value: 10 }] });
    expect(Math.max(...yTicks(container).map(Number))).toBeGreaterThanOrEqual(10);
  });

  it("marks a single point, labelled above it, and fits it in", () => {
    const { container } = draw({
      axes: [{ id: "y", title: "", format: String }],
      markers: [{ key: "today", x: 3, y: 12, label: "40 days" }],
    });
    const dot = container.querySelector(".recharts-reference-dot circle, .recharts-reference-dot-dot")!;
    expect(dot).not.toBeNull();
    expect(dot.getAttribute("fill")).toBe("var(--brand)");
    expect(screen.getByText("40 days")).toBeInTheDocument();
    expect(Math.max(...yTicks(container).map(Number))).toBeGreaterThanOrEqual(12);
  });
});

describe("explicit ticks", () => {
  it("ticks a y axis on the caller's grid instead of the round one, inside the domain", () => {
    const { container } = draw({
      rows: [
        { x: 0, a: 1.29 },
        { x: 1, a: 1.49 },
      ],
      axes: [
        {
          id: "y",
          title: "",
          domain: [1.2, 1.5],
          // A cent grid, and one tick outside the frame that must not print.
          tickValues: [1.2, 1.3, 1.4, 1.5, 1.6],
          format: (v) => `€${v.toFixed(2)}`,
        },
      ],
    });
    expect(yTicks(container)).toEqual(["€1.20", "€1.30", "€1.40", "€1.50"]);
  });

  it("asks a tick function again for the domain on show", () => {
    const asked: [number, number][] = [];
    draw({
      axes: [
        {
          id: "y",
          title: "",
          tickValues: (domain) => {
            asked.push(domain);
            return [2];
          },
        },
      ],
    });
    expect(asked.length).toBeGreaterThan(0);
    expect(asked[0][0]).toBeLessThan(1);
    expect(asked[0][1]).toBeGreaterThan(4);
  });

  it("ticks the abscissa where the caller says", () => {
    const { container } = draw({ x: { tickValues: [0, 3], format: (v) => `t${v}` } });
    expect(xTicks(container)).toEqual(["t0", "t3"]);
  });
});

describe("a category abscissa", () => {
  it("places rows by position and labels them with the caller's own values", () => {
    const { container } = render(
      <SeriesChart rows={MONTHS} x={{ type: "category", key: "period" }} series={[{ key: "net", label: "Net" }]} />,
    );
    expect(xTicks(container)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("hands `format` the slot and the category", () => {
    const format = vi.fn((slot: number, tick: { value: unknown; index?: number }) => `${slot}:${String(tick.value)}`);
    const { container } = render(
      <SeriesChart rows={MONTHS} x={{ type: "category", key: "period", format }} series={[{ key: "net", label: "Net" }]} />,
    );
    expect(xTicks(container)).toEqual(["0:2026-01", "1:2026-02", "2:2026-03"]);
    expect(format).toHaveBeenCalledWith(1, expect.objectContaining({ value: "2026-02", index: 1 }));
  });

  it("takes Dates as periods, and labels only the categories asked for", () => {
    const rows = [0, 1, 2, 3].map((month) => ({ x: new Date(2026, month, 1), v: month }));
    const { container } = render(
      <SeriesChart
        rows={rows}
        x={{
          type: "category",
          format: (_, tick) => (tick.value as Date).toLocaleDateString("en-US", { month: "short" }),
          tickValues: [new Date(2026, 0, 1), new Date(2026, 3, 1)],
        }}
        series={[{ key: "v", label: "V" }]}
      />,
    );
    expect(xTicks(container)).toEqual(["Jan", "Apr"]);
  });

  it("zooms along its slots, ticking whole slots only", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ m: `M${i + 1}`, v: (i * 7) % 5 }));
    const { container } = render(
      <SeriesChart rows={rows} x={{ type: "category", key: "m" }} series={[{ key: "v", label: "V" }]} />,
    );
    const rect = screen.getByLabelText(hint);
    const left = Number(rect.getAttribute("x"));
    const width = Number(rect.getAttribute("width"));
    dragOver(rect, [left + width * 0.25, 100], [left + width * 0.6, 104]);
    const zoomed = xTicks(container);
    expect(zoomed.length).toBeGreaterThan(0);
    expect(zoomed.length).toBeLessThan(12);
    for (const tick of zoomed) expect(tick).toMatch(/^M\d+$/);
    expect(zoomed).not.toContain("M1");
    expect(zoomed).not.toContain("M12");
  });
});

describe("a time abscissa", () => {
  it("reads ISO dates as local days and ticks calendar boundaries", () => {
    const rows = ["2026-01-10", "2026-02-20", "2026-04-05", "2026-06-15"].map((day, i) => ({ day, p: 1 + i / 10 }));
    const seen: unknown[] = [];
    const { container } = render(
      <SeriesChart
        rows={rows}
        x={{
          type: "time",
          key: "day",
          format: (ms, tick) => {
            seen.push(tick.value);
            const at = new Date(ms);
            return `${at.getFullYear()}-${at.getMonth() + 1}-${at.getDate()}`;
          },
        }}
        series={[{ key: "p", label: "P" }]}
      />,
    );
    const ticks = xTicks(container);
    expect(ticks.length).toBeGreaterThan(1);
    // Month starts, at local midnight — never the 3rd of a month, never an hour.
    for (const tick of ticks) expect(tick).toMatch(/^2026-\d+-1$/);
    expect(seen.every((value) => value instanceof Date)).toBe(true);
  });
});

describe("bars and areas", () => {
  const money = (props: Partial<SeriesChartProps> = {}) =>
    render(
      <SeriesChart
        rows={MONTHS}
        x={{ type: "category", key: "period" }}
        axes={[{ id: "y", title: "", format: String }]}
        {...props}
        series={
          props.series ?? [
            { key: "income", label: "In", type: "bar" },
            { key: "expense", label: "Out", type: "bar" },
          ]
        }
      />,
    );

  it("stands ungrouped bars side by side in each slot, painted per series", () => {
    const { container } = money();
    const drawn = bars(container);
    expect(drawn).toHaveLength(6);
    expect(drawn.map((bar) => bar.getAttribute("fill"))).toEqual([
      ...Array(3).fill("var(--color-income)"),
      ...Array(3).fill("var(--color-expense)"),
    ]);
    // Same slot, different place: grouped, not overdrawn.
    expect(barBox(drawn[0]).x).toBeLessThan(barBox(drawn[3]).x);
  });

  it("stacks bars that share a stack, and fits the axis to the stack's sum", () => {
    const { container } = money({
      series: [
        { key: "income", label: "In", type: "bar", stack: "s" },
        { key: "net", label: "Net", type: "bar", stack: "s" },
      ],
    });
    const drawn = bars(container);
    // Stacked: one column per slot, the second layer on top of the first.
    expect(barBox(drawn[0]).x).toBeCloseTo(barBox(drawn[3]).x);
    // Feb stacks 1200 + 700 = 1900. Fitted on single values the band would end at
    // 1248 (ticks to 1200) and the top layer would run out of the plot.
    expect(Math.max(...yTicks(container).map(Number))).toBeGreaterThan(1200);
    expect(barBox(drawn[4]).y).toBeGreaterThanOrEqual(8);
  });

  it("keeps zero on an axis carrying bars, and hangs negatives below it", () => {
    const { container } = money();
    const ticks = yTicks(container).map(Number);
    expect(ticks).toContain(0);
    expect(Math.min(...ticks)).toBeLessThan(0);
  });

  it("stands bars on the frame's bottom edge when nothing is negative", () => {
    const { container } = money({ series: [{ key: "income", label: "In", type: "bar" }] });
    expect(Math.min(...yTicks(container).map(Number))).toBe(0);
  });

  it("does not zoom a bar chart unless asked, and then only along x", () => {
    const { unmount } = money();
    expect(screen.queryByLabelText(hint)).toBeNull();
    unmount();
    const { container } = money({ zoomAxes: "x" });
    const rect = screen.getByLabelText(hint);
    const before = yTicks(container);
    // A tall, narrow drag names no stretch of the abscissa: nothing happens.
    dragOver(rect, [300, 20], [302, 250]);
    expect(screen.queryByRole("button", { name: /reset zoom/i })).toBeNull();
    expect(yTicks(container)).toEqual(before);
  });

  it("draws areas, stacked ones more opaque, and zooms them along x only", () => {
    const { container } = money({
      series: [
        { key: "income", label: "In", type: "area", stack: "a" },
        { key: "net", label: "Net", type: "area", stack: "a" },
        { key: "expense", label: "Out", type: "area" },
      ],
    });
    const areas = [...container.querySelectorAll("path.recharts-area-area")];
    expect(areas).toHaveLength(3);
    expect(areas[0].getAttribute("fill-opacity")).toBe("0.55");
    expect(areas[2].getAttribute("fill-opacity")).toBe("0.2");
    const rect = screen.getByLabelText(hint);
    // A box drag on an area chart is read as a band along x.
    const left = Number(rect.getAttribute("x"));
    const width = Number(rect.getAttribute("width"));
    dragOver(rect, [left + width * 0.3, 40], [left + width * 0.7, 200]);
    expect(screen.getByRole("button", { name: /reset zoom/i })).toBeInTheDocument();
    expect(yTicks(container).map(Number)).toContain(0);
  });

  it("mixes a line over bars on one axis, each its own mark", () => {
    const { container } = money({
      series: [
        { key: "income", label: "In", type: "bar" },
        { key: "net", label: "Net" },
      ],
    });
    expect(bars(container)).toHaveLength(3);
    expect(container.querySelectorAll("path.recharts-line-curve")).toHaveLength(1);
  });

  it("reports a click on a bar with its series and the caller's row", () => {
    const onPointClick = vi.fn();
    const { container } = money({ onPointClick });
    fireEvent.click(bars(container)[4]);
    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick.mock.calls[0][0]).toMatchObject({
      index: 1,
      key: "expense",
      x: "2026-02",
      row: MONTHS[1],
    });
  });

  it("draws the same marks without the zoom in StaticSeriesChart", () => {
    const { container } = render(
      <StaticSeriesChart
        rows={MONTHS}
        x={{ type: "category", key: "period" }}
        series={[{ key: "income", label: "In", type: "area" }]}
      />,
    );
    expect(container.querySelectorAll("path.recharts-area-area")).toHaveLength(1);
    expect(screen.queryByLabelText(hint)).toBeNull();
  });
});

describe("the legend and the arithmetic", () => {
  it("settles colours on the full list before any series is switched off", () => {
    const series = [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
      { key: "c", label: "C", color: "#123456" },
    ];
    expect(visibleSeries(series, new Set(["a"]))).toEqual([
      { key: "b", label: "B", color: "var(--chart-2)" },
      { key: "c", label: "C", color: "#123456" },
    ]);
  });

  it("gives a patterned line a stroke entry and everything else a swatch", () => {
    const entries = seriesLegendEntries([
      { key: "total", label: "Total" },
      { key: "assets", label: "Assets", dashed: true },
      { key: "spent", label: "Spent", type: "bar", dashed: true },
    ]);
    expect(entries).toEqual([
      { key: "total", label: "Total", color: "var(--chart-1)" },
      { key: "assets", label: "Assets", color: "var(--chart-2)", marker: "stroke", dash: 1 },
      { key: "spent", label: "Spent", color: "var(--chart-3)" },
    ]);
  });

  it("anchors a band at zero, padding only the free side", () => {
    expect(anchoredBand([100, 500])).toEqual([0, 520]);
    expect(anchoredBand([-100, 400])).toEqual([-120, 420]);
    expect(anchoredBand([-500, -100])).toEqual([-520, 0]);
    expect(anchoredBand(undefined)).toBeUndefined();
  });
});
