import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  SeriesChart,
  axisBandWidth,
  seriesLegendEntries,
  type SeriesChartAxis,
  type SeriesChartSeries,
} from "../series-chart";
import { MIN_PLOT_WIDTH, NARROW_AXIS_BUDGET, autoAxisBudget, axisUnit, budgetedAxes } from "../series-chart-budget";

/**
 * The axis budget (0.15.1): the pure rule on numbers, and the chart drawing what the
 * rule says. recharts is laid out at a fixed 800x300, as in `series-chart.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

/** lenkbank's curve plot: three axes on the left, one on the right. */
const AXES: SeriesChartAxis[] = [
  { id: "vel", title: "Velocity (mm/s)" },
  { id: "pos", title: "Position (mm)" },
  { id: "acc", title: "Acceleration", unit: "mm/s²" },
  { id: "load", title: "Load (N)", orientation: "right" },
];
const SERIES: SeriesChartSeries[] = [
  { key: "vel", label: "Velocity", axis: "vel" },
  { key: "pos", label: "Position", axis: "pos" },
  { key: "acc", label: "Acceleration", axis: "acc" },
  { key: "load", label: "Rack load", axis: "load" },
];
const ROWS = [0, 1, 2, 3].map((x) => ({ x, vel: x * 10, pos: x * x, acc: -x, load: 400 - x * 100 }));
const band = (axis: { width?: number; title?: string }) => axisBandWidth(axis.width, Boolean(axis.title));
// Every band of AXES: 4 × (48 + 16).
const BANDS = 4 * 64;

describe("budgetedAxes", () => {
  it("hides nothing without a budget", () => {
    expect(budgetedAxes(AXES, undefined)).toEqual([]);
  });

  it("caps each side in declaration order, keeping the first", () => {
    expect(budgetedAxes(AXES, { left: 1, right: 1 })).toEqual(["pos", "acc"]);
    expect(budgetedAxes(AXES, { left: 2 })).toEqual(["acc"]);
    expect(budgetedAxes(AXES, { right: 0 })).toEqual(["load"]);
  });

  it("caps the total, keeping the first axis of each side before any second", () => {
    expect(budgetedAxes(AXES, 2)).toEqual(["pos", "acc"]);
    expect(budgetedAxes(AXES, 3)).toEqual(["acc"]);
    expect(budgetedAxes(AXES, 1)).toEqual(["pos", "acc", "load"]);
    expect(budgetedAxes(AXES, 9)).toEqual([]);
  });

  it("neither counts nor returns an axis already hidden", () => {
    const axes: SeriesChartAxis[] = [{ id: "a", title: "A", hide: true }, ...AXES];
    expect(budgetedAxes(axes, { left: 1 })).toEqual(["pos", "acc"]);
  });
});

describe("autoAxisBudget", () => {
  it("is one a side when the plot would drop under MIN_PLOT_WIDTH", () => {
    expect(autoAxisBudget(AXES, BANDS + MIN_PLOT_WIDTH - 1, band)).toBe(NARROW_AXIS_BUDGET);
    expect(autoAxisBudget(AXES, 324, band)).toBe(NARROW_AXIS_BUDGET);
  });

  it("is nothing at a width that leaves the plot its room", () => {
    expect(autoAxisBudget(AXES, BANDS + MIN_PLOT_WIDTH, band)).toBeUndefined();
    expect(autoAxisBudget(AXES, 888, band)).toBeUndefined();
  });

  it("never touches a chart with at most one axis a side, however narrow", () => {
    expect(autoAxisBudget([AXES[0], AXES[3]], 120, band)).toBeUndefined();
  });

  it("is nothing for a width nobody measured", () => {
    expect(autoAxisBudget(AXES, undefined, band)).toBeUndefined();
    expect(autoAxisBudget(AXES, 0, band)).toBeUndefined();
  });
});

describe("axisUnit", () => {
  it("reads the bracket at the end of the title, and prefers an explicit unit", () => {
    expect(axisUnit({ title: "Load (N)" })).toBe("N");
    expect(axisUnit({ title: "Velocity (mm/s)" })).toBe("mm/s");
    expect(axisUnit({ title: "Acceleration", unit: "mm/s²" })).toBe("mm/s²");
    expect(axisUnit({ title: "Segment" })).toBeUndefined();
    expect(axisUnit({ title: "Ratio (a/b)", unit: "" })).toBeUndefined();
  });
});

describe("seriesLegendEntries — units of the axes not drawn", () => {
  it("leaves labels as given without the axes", () => {
    expect(seriesLegendEntries(SERIES).map((entry) => entry.label)).toEqual([
      "Velocity",
      "Position",
      "Acceleration",
      "Rack load",
    ]);
  });

  it("names the unit of a budgeted or hidden axis on its series' entry", () => {
    const axes: SeriesChartAxis[] = [...AXES.slice(0, 3), { id: "load", title: "Load (N)", hide: true }];
    expect(seriesLegendEntries(SERIES, { axes, budgeted: ["pos", "acc"] }).map((entry) => entry.label)).toEqual([
      "Velocity",
      "Position (mm)",
      "Acceleration (mm/s²)",
      "Rack load (N)",
    ]);
  });
});

describe("SeriesChart — maxVisibleAxes", () => {
  const titles = () => ["Velocity (mm/s)", "Position (mm)", "Acceleration", "Load (N)"].filter((t) => screen.queryByText(t));

  it("draws every axis without a budget (and without layout, no automatic one)", () => {
    const report = vi.fn();
    render(<SeriesChart rows={ROWS} series={SERIES} axes={AXES} onAxisBudget={report} />);
    expect(titles()).toEqual(["Velocity (mm/s)", "Position (mm)", "Acceleration", "Load (N)"]);
    expect(report).not.toHaveBeenCalled();
  });

  it("draws the first axis of each side, still plotting every line, and reports the rest", () => {
    const report = vi.fn();
    const { container } = render(
      <SeriesChart rows={ROWS} series={SERIES} axes={AXES} maxVisibleAxes={{ left: 1, right: 1 }} onAxisBudget={report} />,
    );
    expect(titles()).toEqual(["Velocity (mm/s)", "Load (N)"]);
    expect(container.querySelectorAll("path.recharts-line-curve")).toHaveLength(4);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenLastCalledWith(["pos", "acc"]);
    expect(container.querySelector("[data-axis-budget]")?.getAttribute("data-axis-budget")).toBe("pos acc");
  });

  it("keeps the axis it draws inside the chart when the budget hides its neighbours on a mounted chart", () => {
    // What a resize does: the chart was drawn with every axis, then the budget hides two.
    // recharts kept the hidden axes' old widths when stacking the left side outward, and
    // pushed the one axis still drawn off the chart's left edge (x < 0).
    const { container, rerender } = render(<SeriesChart rows={ROWS} series={SERIES} axes={AXES} />);
    rerender(<SeriesChart rows={ROWS} series={SERIES} axes={AXES} maxVisibleAxes={{ left: 1 }} />);
    const xs = [...container.querySelectorAll(".recharts-yAxis-tick-labels text")].map((t) =>
      Number(t.getAttribute("x")),
    );
    expect(xs.length).toBeGreaterThan(0);
    expect(xs.every((x) => x > 0)).toBe(true);
  });

  it("ignores the automatic rule with axisBudget=\"off\", and reports nothing", () => {
    const report = vi.fn();
    render(<SeriesChart rows={ROWS} series={SERIES} axes={AXES} axisBudget="off" onAxisBudget={report} />);
    expect(titles()).toHaveLength(4);
    expect(report).not.toHaveBeenCalled();
  });
});

describe("SeriesChart — the automatic budget, with a measured width", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function measuredAt(width: number) {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width } as DOMRect);
  }

  it("draws one axis a side on a phone", () => {
    measuredAt(324);
    const report = vi.fn();
    render(<SeriesChart rows={ROWS} series={SERIES} axes={AXES} onAxisBudget={report} />);
    expect(screen.queryByText("Position (mm)")).toBeNull();
    expect(screen.getByText("Velocity (mm/s)")).toBeInTheDocument();
    expect(report).toHaveBeenLastCalledWith(["pos", "acc"]);
  });

  it("changes nothing on a desktop", () => {
    measuredAt(888);
    render(<SeriesChart rows={ROWS} series={SERIES} axes={AXES} />);
    expect(screen.getByText("Position (mm)")).toBeInTheDocument();
    expect(screen.getByText("Acceleration")).toBeInTheDocument();
  });

  it("stays off with axisBudget=\"off\"", () => {
    measuredAt(324);
    render(<SeriesChart rows={ROWS} series={SERIES} axes={AXES} axisBudget="off" />);
    expect(screen.getByText("Position (mm)")).toBeInTheDocument();
  });
});
