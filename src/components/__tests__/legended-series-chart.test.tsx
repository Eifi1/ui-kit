import type { ReactElement } from "react";
import { cloneElement, useState } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { LegendedSeriesChart } from "../legended-series-chart";
import {
  seriesLegendEntries,
  type SeriesChartAxis,
  type SeriesChartHit,
  type SeriesChartSeries,
} from "../series-chart";

/**
 * The chart with its legend, as the kit's layout (0.55). keksdose's `LegendedSeriesChart`
 * (features/reports/charts/legended-series-chart.tsx) and its suite are the model; its cases
 * are here against the real chart rather than a stub of it, plus what the kit adds: a key
 * legend, the units of the axes the budget hid, a lone series' way back, typed rows. Real
 * recharts at a fixed 800x300, as in `series-chart.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const SERIES: SeriesChartSeries[] = [
  { key: "a", label: "Alpha" },
  { key: "b", label: "Beta" },
  { key: "c", label: "Gamma", axis: "right" },
];
const AXES: SeriesChartAxis[] = [
  { id: "y", title: "Value (u)" },
  { id: "right", title: "Gamma (kN)", orientation: "right" },
];
const ROWS = [
  { x: 0, a: 1, b: 2, c: 30 },
  { x: 1, a: 3, b: 1, c: 10 },
  { x: 2, a: 2, b: 4, c: 20 },
];

/** The series the chart draws, by the colour var each line is painted with. */
const drawn = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-line-curve")].map((path) => path.getAttribute("stroke"));
/** The colour the chart paints a series' var with. */
const paintOf = (container: HTMLElement, key: string) =>
  new RegExp(`--color-${key}: ([^;]+);`).exec(container.querySelector("style")?.textContent ?? "")?.[1];
const entry = (name: string) => screen.getByRole("button", { name });

describe("LegendedSeriesChart", () => {
  it("takes a series off the chart from its legend entry, and keeps the entry to bring it back", () => {
    const { container } = render(<LegendedSeriesChart rows={ROWS} series={SERIES} axes={AXES} />);
    expect(drawn(container)).toEqual(["var(--color-a)", "var(--color-b)", "var(--color-c)"]);
    const gamma = paintOf(container, "c");
    fireEvent.click(entry("Beta"));
    expect(drawn(container)).toEqual(["var(--color-a)", "var(--color-c)"]);
    expect(entry("Beta")).toHaveAttribute("aria-pressed", "false");
    // Colours are settled on the FULL list before Beta goes: Gamma does not move up into
    // Beta's slot and take its colour, and stays the colour its entry shows.
    expect(paintOf(container, "c")).toBe(gamma);
    expect(gamma).toBe(seriesLegendEntries(SERIES)[2]!.color);
    fireEvent.click(entry("Beta"));
    // Back — recharts paints a returning series last, so as a set.
    expect(drawn(container).sort()).toEqual(["var(--color-a)", "var(--color-b)", "var(--color-c)"]);
    expect(entry("Beta")).toHaveAttribute("aria-pressed", "true");
  });

  it("hands an axes function the switched-off keys, so an axis can leave with its series", () => {
    const axes = vi.fn((hidden: ReadonlySet<string>): SeriesChartAxis[] => (hidden.has("c") ? [AXES[0]!] : AXES));
    const { container } = render(<LegendedSeriesChart rows={ROWS} series={SERIES} axes={axes} />);
    expect(container.querySelectorAll(".recharts-yAxis")).toHaveLength(2);
    fireEvent.click(entry("Gamma"));
    expect(axes).toHaveBeenLastCalledWith(new Set(["c"]));
    expect(container.querySelectorAll(".recharts-yAxis")).toHaveLength(1);
  });

  it("draws what the caller's hidden set says and reports a switch instead of keeping it", () => {
    const onToggle = vi.fn();
    const { container } = render(
      <LegendedSeriesChart rows={ROWS} series={SERIES} axes={AXES} hidden={new Set(["a"])} onToggle={onToggle} />,
    );
    expect(drawn(container)).toEqual(["var(--color-b)", "var(--color-c)"]);
    expect(entry("Alpha")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(entry("Beta"));
    expect(onToggle).toHaveBeenCalledWith("b");
    expect(drawn(container)).toEqual(["var(--color-b)", "var(--color-c)"]);
  });

  it("wraps the chart alone in its frame and lists the caller's legend entries", () => {
    const { container } = render(
      <LegendedSeriesChart
        rows={ROWS}
        series={SERIES}
        axes={AXES}
        legendEntries={SERIES.map((s) => ({ key: s.key, label: `${String(s.label)} line`, color: "red" }))}
        frame={(chart) => <div data-testid="frame">{chart}</div>}
      />,
    );
    const frame = screen.getByTestId("frame");
    expect(frame.querySelector("[data-chart]")).not.toBeNull();
    // The legend stays OUTSIDE the frame — under a scroller, in view however far the chart
    // is scrolled.
    expect(within(frame).queryByRole("button", { name: /line$/ })).toBeNull();
    fireEvent.click(entry("Beta line"));
    expect(drawn(container)).toEqual(["var(--color-a)", "var(--color-c)"]);
  });

  it("says the unit of an axis the budget hid, and still tells the caller", () => {
    const onAxisBudget = vi.fn();
    render(
      <LegendedSeriesChart rows={ROWS} series={SERIES} axes={AXES} maxVisibleAxes={1} onAxisBudget={onAxisBudget} />,
    );
    expect(onAxisBudget).toHaveBeenLastCalledWith(["right"]);
    expect(entry("Gamma (kN)")).toBeInTheDocument();
    expect(entry("Alpha")).toBeInTheDocument();
  });

  it("draws a lone series' legend only while it is off: its one way back", () => {
    const one = [SERIES[0]!];
    const { rerender } = render(<LegendedSeriesChart rows={ROWS} series={one} hidden={new Set()} onToggle={vi.fn()} />);
    expect(screen.queryByRole("group", { name: "Series" })).toBeNull();
    rerender(<LegendedSeriesChart rows={ROWS} series={one} hidden={new Set(["a"])} onToggle={vi.fn()} />);
    expect(entry("Alpha")).toHaveAttribute("aria-pressed", "false");
  });

  it('is a key with legend="key": every series drawn, a list, no switches', () => {
    const { container } = render(
      <LegendedSeriesChart
        rows={ROWS}
        series={SERIES}
        axes={AXES}
        legend="key"
        legendEntries={[
          { key: "a", label: "Measured", color: "var(--chart-1)", marker: "stroke" },
          { key: "today", label: "Today", color: "var(--brand)", marker: "dot" },
        ]}
      />,
    );
    expect(drawn(container)).toHaveLength(3);
    const key = screen.getByRole("list", { name: "Series" });
    expect(
      within(key)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Measured", "Today"]);
    expect(within(container).queryAllByRole("button")).toHaveLength(0);
  });

  it("centres its legend under the chart, and takes the caller's class on it", () => {
    render(<LegendedSeriesChart rows={ROWS} series={SERIES} axes={AXES} legendClassName="mt-4" />);
    const legend = screen.getByRole("group", { name: "Series" });
    expect(legend).toHaveClass("justify-center", "mt-4");
    // Under the chart, in the reading order too: the chart is the element before it.
    expect(legend.previousElementSibling!.querySelector("[data-chart]")).not.toBeNull();
  });

  it("costs the chart nothing for a render of the page or a switch elsewhere", () => {
    const dot = vi.fn(() => true);
    const series: SeriesChartSeries[] = [
      { key: "a", label: "Alpha", dot },
      { key: "b", label: "Beta" },
    ];
    let bump: () => void = () => {};
    function Page() {
      const [n, setN] = useState(0);
      bump = () => setN((value) => value + 1);
      return (
        <div data-renders={n}>
          <LegendedSeriesChart rows={ROWS} series={series} axes={AXES} />
        </div>
      );
    }
    render(<Page />);
    dot.mockClear();
    act(() => bump());
    expect(dot).not.toHaveBeenCalled();
    // Beta off: the chart draws again, as it must — Alpha's points with it.
    fireEvent.click(entry("Beta"));
    expect(dot).toHaveBeenCalled();
  });

  it("types a hit's row as the rows are, as SeriesChart does", () => {
    const months = [{ period: "Jan", rawPeriod: "2026-01-01", a: 1 }];
    const onPointClick = vi.fn((hit: SeriesChartHit<(typeof months)[number]>) => hit.row.rawPeriod);
    render(
      <LegendedSeriesChart
        rows={months}
        series={[{ key: "a", label: "A", type: "bar" }]}
        x={{ type: "category", key: "period" }}
        onPointClick={(hit) => {
          expectTypeOf(hit.row.rawPeriod).toEqualTypeOf<string>();
          onPointClick(hit);
        }}
      />,
    );
    const stop = screen.getAllByRole("button").find((el) => el.tagName === "rect")!;
    fireEvent.keyDown(stop, { key: "Enter" });
    expect(onPointClick).toHaveReturnedWith("2026-01-01");
  });
});
