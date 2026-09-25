import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  AXIS_TICK_WIDTH,
  AXIS_TITLE_STRIP,
  SeriesChart,
  StaticSeriesChart,
  axisBandWidth,
  mergeSeries,
  oneAxis,
  padBand,
  paddedDomain,
  seriesKey,
  seriesLegendEntries,
  soleSeriesColor,
  type SeriesChartAxis,
  type SeriesChartProps,
  type SeriesChartSeries,
} from "../series-chart";
import { FACING_SIDES, facingAxes, facingBand, facingHeadingPad } from "../facing-pair";
import { SharedXZoom } from "../chart-zoom";
import { STROKE_PATTERNS } from "../toggle-legend";
import { integerTicks } from "../series-chart-ticks";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * The series chart, drawn by REAL recharts.
 *
 * `ResponsiveContainer` measures 0x0 under jsdom and renders nothing, so it is replaced
 * by one that hands its chart a fixed 800x300 — and with a size, recharts lays the
 * whole thing out in jsdom: grid, axes, one `<path>` per line, reference lines, and the
 * zoom layer (its hooks answer, because the plot area is real). So this file asserts
 * what a reader would see, and drives the zoom through the same scales a browser uses.
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
  { x: 0, a: 1, b: 2, c: 0 },
  { x: 1, a: 3, b: 1, c: 1 },
  { x: 2, a: 2, b: 5, c: 1 },
  { x: 3, a: 4, b: 3, c: 2 },
];

function draw(props: Partial<SeriesChartProps> = {}) {
  return render(
    <SeriesChart
      rows={ROWS}
      series={[{ key: "a", label: "A" }]}
      axes={oneAxis(undefined, "Value (u)")}
      x={{ title: "Time (s)" }}
      {...props}
    />,
  );
}

const paths = (container: HTMLElement) =>
  [...container.querySelectorAll("path.recharts-line-curve")] as SVGPathElement[];
const style = (container: HTMLElement) => container.querySelector("style")?.textContent ?? "";

describe("SeriesChart — what it draws", () => {
  it("draws one line per series, painted through its own custom property", () => {
    const { container } = draw({
      series: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
    });
    expect(paths(container).map((p) => p.getAttribute("stroke"))).toEqual([
      "var(--color-a)",
      "var(--color-b)",
    ]);
  });

  it("defaults series colours to the kit's --chart-N ramp, and keeps a caller's own", () => {
    const { container } = draw({
      series: [
        { key: "a", label: "A" },
        { key: "b", label: "B", color: "#123456" },
        { key: "c", label: "C" },
      ],
    });
    expect(style(container)).toContain("--color-a: var(--chart-1);");
    expect(style(container)).toContain("--color-b: #123456;");
    expect(style(container)).toContain("--color-c: var(--chart-3);");
  });

  it("strokes each line in the pattern it asked for, from the legend's own table", () => {
    const { container } = draw({
      series: [
        { key: "a", label: "solid" },
        { key: "b", label: "dashed", dashed: true },
        { key: "c", label: "dash-dot", dash: 3 },
      ],
    });
    expect(paths(container).map((p) => p.getAttribute("stroke-dasharray"))).toEqual([
      null,
      STROKE_PATTERNS[1],
      STROKE_PATTERNS[3],
    ]);
  });

  it("draws a step series as a step, in the step pattern whatever `dash` says", () => {
    const { container } = draw({ series: [{ key: "c", label: "index", step: true, dash: 4 }] });
    const [line] = paths(container);
    expect(line.getAttribute("stroke-dasharray")).toBe(STROKE_PATTERNS[1]);
    expect(line.getAttribute("stroke-width")).toBe("1.5");
    // stepAfter: every segment is horizontal or vertical — only H/V/L commands, no curves.
    expect(line.getAttribute("d")).not.toMatch(/C/);
  });

  it("titles the abscissa and each visible y axis, and no hidden one", () => {
    draw({
      series: [
        { key: "a", label: "A", axis: "pos" },
        { key: "b", label: "B", axis: "jerk" },
      ],
      axes: [
        { id: "pos", title: "Position (mm)" },
        { id: "jerk", title: "Jerk", hide: true },
      ],
    });
    expect(screen.getByText("Time (s)")).toBeInTheDocument();
    expect(screen.getByText("Position (mm)")).toBeInTheDocument();
    expect(screen.queryByText("Jerk")).toBeNull();
  });

  it("tints an axis title with its line's colour only when it measures one line", () => {
    draw({
      series: [
        { key: "a", label: "A", axis: "one" },
        { key: "b", label: "B", axis: "two" },
        { key: "c", label: "C", axis: "two" },
      ],
      axes: [
        { id: "one", title: "Mine", color: "#aa0000" },
        { id: "two", title: "Shared", color: "#00aa00", orientation: "right" },
      ],
    });
    // jsdom normalises the inline colour to rgb().
    const fill = (text: string) => (screen.getByText(text).closest("text") as SVGTextElement).style.fill;
    expect(fill("Mine")).toBe("rgb(170, 0, 0)");
    expect(fill("Shared")).toBe("");
  });

  it("formats ticks with Intl in the kit's locale by default, and with the caller's format when given", () => {
    const rows = [
      { x: 1000, a: 1500.5 },
      { x: 3000, a: 2500.25 },
    ];
    const { unmount } = render(
      <UiKitProvider locale="de-DE">
        <SeriesChart rows={rows} series={[{ key: "a", label: "A" }]} axes={oneAxis(undefined, "V")} />
      </UiKitProvider>,
    );
    const ticks = () => [...document.querySelectorAll(".recharts-yAxis-tick-labels tspan")].map((t) => t.textContent);
    // German groups thousands with a dot.
    expect(ticks().some((t) => /^\d\.\d{3}/.test(t ?? ""))).toBe(true);
    unmount();
    render(
      <SeriesChart rows={rows} series={[{ key: "a", label: "A" }]} axes={oneAxis((v) => `<${Math.round(v)}>`, "V")} />,
    );
    expect(ticks().every((t) => /^<-?\d+>$/.test(t ?? ""))).toBe(true);
  });

  it("ticks both axes at round values inside the padded band", () => {
    // Handed the padded domain, recharts split it evenly and printed wherever that
    // landed — 92.08, 275.25 … for data running 126…974.
    const rows = [
      { x: 126, a: 126 },
      { x: 974, a: 974 },
    ];
    const { container } = render(
      <SeriesChart rows={rows} series={[{ key: "a", label: "A" }]} axes={oneAxis(String, "V")} x={{ format: String }} />,
    );
    const read = (axis: string) =>
      [...container.querySelectorAll(`.recharts-${axis}-tick-labels tspan`)].map((t) => Number(t.textContent));
    expect(read("yAxis")).toEqual([200, 400, 600, 800, 1000]);
    for (const tick of read("xAxis")) expect(tick % 200).toBe(0);
  });

  it("closes shapes with spans, on the axis they name, in the muted ink by default", () => {
    const { container } = draw({
      spans: [
        { key: "turn", x: 1, from: 1, to: 3 },
        { key: "tinted", x: 2, from: 2, to: 4, color: "#abcdef" },
      ],
    });
    const lines = [...container.querySelectorAll(".recharts-reference-line-line")];
    expect(lines).toHaveLength(2);
    expect(lines[0].getAttribute("stroke")).toBe("var(--text-muted)");
    expect(lines[1].getAttribute("stroke")).toBe("#abcdef");
    // Vertical: one abscissa, two values.
    expect(lines[0].getAttribute("x1")).toBe(lines[0].getAttribute("x2"));
  });

  it("puts the height class and a caller's className on the chart root", () => {
    const { container } = draw({ height: "h-40", className: "my-grid" });
    const root = container.querySelector("[data-chart]")!;
    expect(root).toHaveClass("h-40", "my-grid", "w-full");
  });
});

describe("SeriesChart — the empty state", () => {
  it("says the default label, centred at the chart's own height", () => {
    const { container } = draw({ rows: [], height: "h-56" });
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(container.querySelector(".h-56")).not.toBeNull();
    expect(container.querySelector("svg.recharts-surface")).toBeNull();
  });

  it("is empty when every series has been switched off, not only when there are no rows", () => {
    draw({ series: [] });
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows the caller's own node, or nothing at all for `null`", () => {
    const { unmount } = draw({ rows: [], empty: <em>Pick two</em> });
    expect(screen.getByText("Pick two")).toBeInTheDocument();
    unmount();
    const { container } = draw({ rows: [], empty: null });
    expect(container.textContent).toBe("");
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={{ seriesChart: { empty: "Keine Daten" } }}>
        <SeriesChart rows={[]} series={[]} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Keine Daten")).toBeInTheDocument();
  });
});

describe("SeriesChart — zoom, through real recharts scales", () => {
  const hint = /drag to zoom/i;

  function dragOver(target: Element, from: [number, number], to: [number, number]) {
    // The overlay's box starts at the chart origin, so client coordinates are chart ones.
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

  const xTicks = (container: HTMLElement) =>
    [...container.querySelectorAll(".recharts-xAxis-tick-labels tspan")].map((t) => Number(t.textContent));

  it("lays a drag surface over the plot, named by the zoom hint", () => {
    draw();
    const rect = screen.getByLabelText(hint);
    expect(rect.tagName.toLowerCase()).toBe("rect");
    expect(Number(rect.getAttribute("width"))).toBeGreaterThan(0);
  });

  it("narrows the abscissa to a wide flat drag, and the reset button puts it back", () => {
    const { container } = draw();
    const before = xTicks(container);
    const rect = screen.getByLabelText(hint);
    const left = Number(rect.getAttribute("x"));
    const width = Number(rect.getAttribute("width"));
    dragOver(rect, [left + width * 0.4, 100], [left + width * 0.6, 104]);
    const zoomed = xTicks(container);
    // Still round numbers inside the window, just a finer step (see niceTicks).
    for (const tick of zoomed) expect(Number.isInteger(tick * 10)).toBe(true);
    expect(Math.min(...zoomed)).toBeGreaterThan(Math.min(...before));
    expect(Math.max(...zoomed)).toBeLessThan(Math.max(...before));
    fireEvent.click(screen.getByRole("button", { name: /reset zoom/i }));
    expect(xTicks(container)).toEqual(before);
  });

  it("zooms a column of charts together inside SharedXZoom", () => {
    render(
      <SharedXZoom>
        <SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} axes={oneAxis(undefined, "A")} />
        <SeriesChart rows={ROWS} series={[{ key: "b", label: "B" }]} axes={oneAxis(undefined, "B")} />
      </SharedXZoom>,
    );
    const [first] = screen.getAllByLabelText(hint);
    const left = Number(first.getAttribute("x"));
    const width = Number(first.getAttribute("width"));
    dragOver(first, [left + width * 0.2, 100], [left + width * 0.8, 104]);
    expect(screen.getAllByRole("button", { name: /reset zoom/i })).toHaveLength(2);
  });

  it("has no drag layer and no reset in StaticSeriesChart", () => {
    render(<StaticSeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} />);
    expect(screen.queryByLabelText(hint)).toBeNull();
  });
});

describe("the chart's arithmetic", () => {
  it("pads a fitted band by four per cent, and gives constant data a real band", () => {
    expect(paddedDomain([0, 100])).toEqual([-4, 104]);
    expect(paddedDomain([50, 50])).toEqual([48, 52]);
    expect(paddedDomain([0, 0])).toEqual([-1, 1]);
  });

  it("ignores non-finite samples, and has no band for no finite data", () => {
    expect(paddedDomain([NaN, 0, Infinity, 100, -Infinity])).toEqual([-4, 104]);
    expect(paddedDomain([])).toBeUndefined();
    expect(paddedDomain([NaN])).toBeUndefined();
    expect(padBand(Infinity, -Infinity)).toBeUndefined();
    expect(padBand(0, 100)).toEqual(paddedDomain([0, 100]));
  });

  it("reserves the title strip on top of the ticks, and the default tick width", () => {
    expect(axisBandWidth(60, true)).toBe(60 + AXIS_TITLE_STRIP);
    expect(axisBandWidth(60, false)).toBe(60);
    expect(axisBandWidth(undefined, false)).toBe(AXIS_TICK_WIDTH);
  });

  it("gives an axis its line's colour only when it measures exactly one", () => {
    const axis = (id: string, color?: string) => ({ id, color });
    const line = (axisId?: string): Pick<SeriesChartSeries, "axis"> => ({ axis: axisId });
    expect(soleSeriesColor(axis("v", "#0ea5e9"), [line("v")])).toBe("#0ea5e9");
    expect(soleSeriesColor(axis("loads", "#0ea5e9"), [line("loads"), line("loads")])).toBeUndefined();
    expect(soleSeriesColor(axis("loads", "#0ea5e9"), [line("v")])).toBeUndefined();
    // A line that names no axis counts against the default one.
    expect(soleSeriesColor(axis("y", "#0ea5e9"), [line()])).toBe("#0ea5e9");
    expect(soleSeriesColor(axis("v"), [line("v")])).toBeUndefined();
  });

  it("merges sources on the abscissa itself, never interpolating", () => {
    const rows = mergeSeries([
      { x: [0, 2, 4], channels: { a: [1, 2, 3] } },
      { x: [1, 2], channels: { b: [10, 20], c: [5, 6] } },
    ]);
    expect(rows).toEqual([
      { x: 0, a: 1 },
      { x: 1, b: 10, c: 5 },
      { x: 2, a: 2, b: 20, c: 6 },
      { x: 4, a: 3 },
    ]);
  });

  it("builds series keys that the chart shell will accept as CSS identifiers", () => {
    expect(seriesKey("l", 12, "left:10")).toBe("l_12_left_10");
    expect(seriesKey("a b", "c#d")).toBe("a_b_c_d");
    // A leading digit or hyphen is not an identifier start.
    expect(seriesKey(42)).toBe("_42");
    expect(seriesKey("-x")).toBe("_-x");
    expect(seriesKey("")).toBe("_");
    for (const key of [seriesKey("l", 12, "left:10"), seriesKey(42), seriesKey("-x")]) {
      expect(key).toMatch(/^[A-Za-z_][A-Za-z0-9_-]*$/);
    }
  });

  it("builds the one-axis case", () => {
    const format = (v: number) => String(v);
    expect(oneAxis(format, "T (s)", 60, "right")).toEqual<SeriesChartAxis[]>([
      { id: "y", format, title: "T (s)", width: 60, orientation: "right" },
    ]);
  });
});

describe("a facing pair", () => {
  const TICKS = 54;
  const left = facingAxes({ side: "left", title: "Inner joint (mm)", tickWidth: TICKS });
  const right = facingAxes({ side: "right", title: "Inner joint (mm)", tickWidth: TICKS });

  it("reserves the same band on both charts, titled or not", () => {
    // The right chart's axis draws no title but still spends its strip — otherwise its
    // plot is AXIS_TITLE_STRIP wider, and one abscissa lands on two different pixels.
    expect(axisBandWidth(right[0].width, false)).toBe(axisBandWidth(left[0].width, true));
  });

  it("names the quantity on the left chart only, with the ticks outside", () => {
    expect(left[0].title).toBe("Inner joint (mm)");
    expect(right[0].title).toBe("");
    expect(left[0].orientation).toBeUndefined();
    expect(right[0].orientation).toBe("right");
  });

  it("pins both sides to one domain when asked, and never half of it", () => {
    const domain: [number, number] = [-100, 900];
    for (const side of FACING_SIDES) {
      expect(facingAxes({ side, title: "Loads (N)", domain })[0].domain).toEqual(domain);
    }
  });

  it("pads a heading over its own plot, on the side its axis stands", () => {
    expect(facingHeadingPad("left", TICKS)).toEqual({ paddingLeft: facingBand(TICKS) });
    expect(facingHeadingPad("right", TICKS)).toEqual({ paddingRight: facingBand(TICKS) });
    expect(facingBand(TICKS)).toBe(TICKS + AXIS_TITLE_STRIP);
    expect(facingBand()).toBe(AXIS_TICK_WIDTH + AXIS_TITLE_STRIP);
  });
});

describe("SeriesChart 0.8.0 (keksdose B21)", () => {
  const xTicks = (container: HTMLElement) =>
    [...container.querySelectorAll(".recharts-xAxis-tick-labels tspan")].map((t) => Number(t.textContent));

  it("takes a height in pixels, inline, on the chart and on its empty state", () => {
    const { container, unmount } = draw({ height: 260 });
    const root = container.querySelector<HTMLElement>("[data-chart]")!;
    expect(root.style.height).toBe("260px");
    expect(root).not.toHaveClass("h-72");
    unmount();
    const empty = draw({ rows: [], height: 180 });
    const box = screen.getByText("No data").parentElement!;
    expect(box.style.height).toBe("180px");
    expect(empty.container.querySelector(".h-72")).toBeNull();
  });

  it("ticks a short whole-number series on whole numbers only, automatically", () => {
    const { container } = draw({ rows: ROWS.slice(0, 3) });
    const ticks = xTicks(container);
    expect(ticks.length).toBeGreaterThan(1);
    for (const tick of ticks) expect(Number.isInteger(tick)).toBe(true);
  });

  it("integerTicks: false keeps the fractional ticks of the same series", () => {
    const { container } = draw({ rows: ROWS.slice(0, 3), x: { integerTicks: false } });
    expect(xTicks(container).some((tick) => !Number.isInteger(tick))).toBe(true);
  });

  it("does not switch on by itself over fractional abscissae", () => {
    const rows = [0, 0.5, 1, 1.5, 2].map((x, i) => ({ x, a: i }));
    const { container } = draw({ rows });
    expect(xTicks(container).some((tick) => !Number.isInteger(tick))).toBe(true);
  });

  it("dash takes a custom dash array, and its legend entry draws the same one", () => {
    const series: SeriesChartSeries[] = [{ key: "a", label: "Projection", dash: "4 3" }];
    const { container } = draw({ series });
    expect(paths(container)[0].getAttribute("stroke-dasharray")).toBe("4 3");
    expect(seriesLegendEntries(series)[0]).toMatchObject({ marker: "stroke", dash: "4 3" });
  });
});

describe("integerTicks", () => {
  it("never steps below 1", () => {
    expect(integerTicks([-0.2, 4.2])).toEqual([0, 1, 2, 3, 4]);
    expect(integerTicks([-0.05, 2.05])).toEqual([0, 1, 2]);
  });

  it("matches the round ladder on a wide span", () => {
    expect(integerTicks([0, 1000])).toEqual([0, 200, 400, 600, 800, 1000]);
  });

  it("is undefined for a window with no whole number in it, or no window", () => {
    expect(integerTicks([1.2, 1.8])).toBeUndefined();
    expect(integerTicks(undefined)).toBeUndefined();
    expect(integerTicks([Number.NaN, 1])).toBeUndefined();
  });
});
