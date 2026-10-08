import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { applyTextSize } from "../../theme/text-size";
import { SeriesChart, axisBandWidth, AXIS_TICK_WIDTH, AXIS_TITLE_STRIP, oneAxis } from "../series-chart";
import { tickTarget, niceTicks } from "../series-chart-ticks";
import { facingHeadingPad } from "../facing-pair";
import { chartHeightProps, isCssLength } from "../chart-height";
import { PieChart } from "../pie-chart";
import { TreemapCell } from "../treemap";
import { Sparkline } from "../sparkline";
import { LegendColumn, StaticLegend, ToggleLegend } from "../toggle-legend";

/**
 * Charts at the three text sizes (docs/text-size-harmonization.md §3.2, §4, §10.10). jsdom
 * lays nothing out, so recharts is drawn at a fixed 800×300, as in `series-chart.test.tsx`;
 * what is pinned is what the chart ASKS for at each size — the bands, the tick count, the
 * px font sizes — not pixels on a screen.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

afterEach(() => applyTextSize("normal"));

const ROWS = [0, 25, 50, 75, 100].map((a, x) => ({ x, a }));

const yTicks = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-yAxis-tick-labels tspan")].map((t) => t.textContent ?? "");
/** Where the plot starts: the horizontal grid rules run from it. */
const plotLeft = (container: HTMLElement) =>
  Math.min(
    ...[...container.querySelectorAll(".recharts-cartesian-grid-horizontal line")].map((line) =>
      Number(line.getAttribute("x1")),
    ),
  );

describe("SeriesChart height", () => {
  it("takes a CSS length inline, so a height can grow with the text and stop at the screen", () => {
    const { container } = render(
      <SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} height="min(20rem, 60dvh)" />,
    );
    const root = container.querySelector<HTMLElement>("[data-chart]")!;
    expect(root.style.height).toBe("min(20rem, 60dvh)");
    expect(root.className).not.toContain("min(");
    expect(root.className).not.toContain("h-72");
  });

  it("keeps a class a class and a number px", () => {
    const asClass = render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} height="h-64 md:h-80" />);
    expect(asClass.container.querySelector("[data-chart]")!.className).toContain("md:h-80");
    asClass.unmount();
    const asPx = render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} height={260} />);
    expect(asPx.container.querySelector<HTMLElement>("[data-chart]")!.style.height).toBe("260px");
  });

  it("sizes the empty state the same way", () => {
    render(<SeriesChart rows={[]} series={[{ key: "a", label: "A" }]} height="20rem" />);
    expect(screen.getByText(/no data/i).parentElement!.style.height).toBe("20rem");
  });

  it("tells a length from a class", () => {
    for (const length of ["20rem", "320px", "50%", "min(20rem, 60dvh)", "clamp(12rem, 40vh, 30rem)", "calc(100% - 1rem)", "var(--h)"]) {
      expect(isCssLength(length), length).toBe(true);
    }
    for (const cls of ["h-72", "h-[20rem]", "h-64 md:h-80", "min-h-0 flex-1"]) expect(isCssLength(cls), cls).toBe(false);
    expect(chartHeightProps(300)).toEqual({ style: { height: 300 } });
    expect(chartHeightProps(undefined)).toEqual({});
  });
});

describe("SeriesChart at Large and Extra large", () => {
  it("aims at three y ticks instead of five from Large up", () => {
    expect(tickTarget(1)).toBe(5);
    expect(tickTarget(1.25)).toBe(3);
    expect(tickTarget(1.5)).toBe(3);
    const normal = render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} />);
    expect(yTicks(normal.container)).toEqual(["0", "20", "40", "60", "80", "100"]);
    normal.unmount();
    applyTextSize("large");
    const large = render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} />);
    expect(yTicks(large.container)).toEqual(["0", "50", "100"]);
    expect(niceTicks([-4, 104], tickTarget(1.5))).toEqual([0, 50, 100]);
  });

  it("widens the y band by the scale — the default and a caller's own width alike", () => {
    const normal = render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} />);
    expect(plotLeft(normal.container)).toBe(AXIS_TICK_WIDTH);
    normal.unmount();
    applyTextSize("xlarge");
    const xl = render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} />);
    expect(plotLeft(xl.container)).toBe(AXIS_TICK_WIDTH * 1.5);
    xl.unmount();
    // keksdose's MONEY_AXIS_WIDTH-style own width, titled.
    const own = render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} axes={oneAxis(undefined, "CHF", 60)} />);
    expect(plotLeft(own.container)).toBe(Math.round((60 + AXIS_TITLE_STRIP) * 1.5));
  });

  it("scales a facing pair's two bands by one factor, and the heading with them", () => {
    expect(axisBandWidth(48, true)).toBe(64);
    expect(axisBandWidth(48, true, 1.25)).toBe(80);
    // The right chart declares the whole band as its width, untitled: the same at every size.
    for (const scale of [1, 1.25, 1.5]) {
      expect(axisBandWidth(axisBandWidth(48, true), false, scale)).toBe(axisBandWidth(48, true, scale));
    }
    expect(facingHeadingPad("left", 48, 1.5)).toEqual({ paddingLeft: 96 });
    expect(facingHeadingPad("right", 48)).toEqual({ paddingRight: 64 });
  });

  it("draws the reference and marker labels larger, and keeps the strokes px", () => {
    applyTextSize("xlarge");
    const { container } = render(
      <SeriesChart
        rows={ROWS}
        series={[{ key: "a", label: "A" }]}
        references={[{ value: 50, label: "target" }]}
        markers={[{ x: 2, y: 50, label: "now" }]}
      />,
    );
    expect(screen.getByText("target").closest("text")!.getAttribute("font-size")).toBe("15");
    expect(screen.getByText("now").closest("text")!.getAttribute("font-size")).toBe("16.5");
    const line = container.querySelector(".recharts-reference-line-line")!;
    expect(line.getAttribute("stroke-width")).toBe("1");
  });
});

describe("PieChart, Treemap and Sparkline follow the text size", () => {
  const SLICES = [
    { key: "a", label: "Rent", value: 60 },
    { key: "b", label: "Food", value: 40 },
  ];

  it("gives the pie a rem height by default, and a CSS length when asked", () => {
    const { container, unmount } = render(<PieChart data={SLICES} />);
    expect(container.querySelector<HTMLElement>("[role=group]")!.style.height).toBe("18.75rem");
    unmount();
    const own = render(<PieChart data={SLICES} height="min(20rem, 50dvh)" />);
    expect(own.container.querySelector<HTMLElement>("[role=group]")!.style.height).toBe("min(20rem, 50dvh)");
  });

  it("draws the pie's slice labels at 11 px × the scale", () => {
    applyTextSize("xlarge");
    render(<PieChart data={SLICES} />);
    expect(screen.getByText("60%").getAttribute("font-size")).toBe("16.5");
  });

  it("draws a tile's name at 12 px × the scale", () => {
    applyTextSize("large");
    const { container } = render(
      <svg>
        <TreemapCell depth={1} width={300} height={80} name="Groceries" fill="#332288" />
      </svg>,
    );
    expect(container.querySelector("text")!.getAttribute("font-size")).toBe("15");
  });

  it("grows the sparkline's box, not its drawing", () => {
    applyTextSize("xlarge");
    const { container } = render(<Sparkline data={[1, 3, 2]} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("108");
    expect(svg.getAttribute("height")).toBe("36");
    expect(svg.getAttribute("viewBox")).toBe("0 0 72 24");
  });
});

describe("legends beside a chart go under it at Large (§4)", () => {
  const ENTRIES = [
    { key: "a", label: "Left", color: "#123456" },
    { key: "b", label: "Right", color: "#654321" },
  ];
  const UNDER = ["large:order-last", "large:col-span-full", "large:basis-full", "large:[*:has(>&)]:flex-wrap"];

  it("LegendColumn takes a row of its own and lays its legends across", () => {
    const { container } = render(
      <LegendColumn className="sm:w-40">
        <span>legend</span>
      </LegendColumn>,
    );
    const column = container.firstElementChild!;
    for (const cls of [...UNDER, "large:flex-row", "large:flex-wrap", "large:h-auto", "sm:w-40"]) {
      expect(column.classList, cls).toContain(cls);
    }
  });

  it("a vertical ToggleLegend or StaticLegend goes under and across; a horizontal one is already under", () => {
    const { container } = render(
      <>
        <ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={() => {}} orientation="vertical" />
        <StaticLegend entries={ENTRIES} orientation="vertical" />
        <ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={() => {}} />
      </>,
    );
    const [toggle, key, horizontal] = [...container.children];
    for (const legend of [toggle, key]) {
      for (const cls of [...UNDER, "flex-col", "large:flex-row", "large:flex-wrap"]) expect(legend.classList, cls).toContain(cls);
    }
    for (const cls of UNDER) expect(horizontal.classList).not.toContain(cls);
  });

  it("names the legend entries' type in rem, and rings them with the shared frame", () => {
    render(<ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={() => {}} />);
    const entry = screen.getByRole("button", { name: "Left" });
    expect(entry.className).toContain("text-caption");
    expect(entry.className).toContain("focus-visible:ring-[length:var(--focus-ring-width)]");
  });
});
