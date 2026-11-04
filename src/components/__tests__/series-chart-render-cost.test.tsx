import type { ReactElement } from "react";
import { cloneElement, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SeriesChart, type SeriesChartAxis, type SeriesChartSeries, type SeriesChartX } from "../series-chart";

/**
 * What a render of the page, a pointer and a keyboard step cost the plot (0.55, held back
 * from 0.52's review: "the plot re-renders on every parent render and every hover").
 *
 * Counted on what recharts calls while it draws: a series' `dot` once per point of a line
 * drawn again, an axis' `format` once per tick drawn again, and the abscissa's `format`
 * per tick (and per tick the plot measures its tick band by — the plot's own render).
 * Measured before the change, on a 12-row chart (a line with dots, an area; one y axis):
 *
 * - a render of the page, every prop the same: 24 dots, 30 y ticks, 42 x formats;
 * - a pointer moved over three slots: nothing (recharts draws only its tooltip);
 * - focusing a keyboard stop: 24, 30, 42 again; three arrow-key steps: 72, 90, 126;
 * - the same with two bar series: a render of the page 0, 30, 42; three steps 0, 90, 126.
 *
 * After it, every one of those is 0: the plot is memoised and keeps its props' identities
 * (the zoom's binding, the plotted `x`), and its keyboard state is a store that only the
 * stops, the tooltip and the focused bar read. Real recharts at a fixed 800x300.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const ROWS = Array.from({ length: 12 }, (_, i) => ({ x: i, a: (i * 7) % 5, b: (i * 3) % 4 }));

/** A page holding a chart whose props stay the same objects, and a state of its own. */
function page(kind: "lines" | "bars" = "lines") {
  const dot = vi.fn(() => true);
  const yTick = vi.fn((v: number) => String(v));
  const xFormat = vi.fn((v: number) => `t${v}`);
  const series: SeriesChartSeries[] =
    kind === "bars"
      ? [
          { key: "a", label: "A", type: "bar" },
          { key: "b", label: "B", type: "bar" },
        ]
      : [
          { key: "a", label: "A", dot },
          { key: "b", label: "B", type: "area" },
        ];
  const axes: SeriesChartAxis[] = [{ id: "y", title: "Value (u)", format: yTick }];
  // The tooltip's heading is `label`, so `format` counts the axis and the plot alone.
  const x: SeriesChartX = { title: "Time (s)", format: xFormat, label: (v) => `at ${v}` };
  let bump: () => void = () => {};
  let swap: (rows: typeof ROWS) => void = () => {};
  function Page() {
    const [n, setN] = useState(0);
    const [rows, setRows] = useState(ROWS);
    bump = () => setN((value) => value + 1);
    swap = setRows;
    return (
      <div data-renders={n}>
        <SeriesChart rows={rows} series={series} axes={axes} x={x} />
      </div>
    );
  }
  const view = render(<Page />);
  const drawn = () => ({
    dots: dot.mock.calls.length,
    yTicks: yTick.mock.calls.length,
    xFormats: xFormat.mock.calls.length,
  });
  const forget = () => [dot, yTick, xFormat].forEach((spy) => spy.mockClear());
  return {
    ...view,
    drawn,
    forget,
    rerenderPage: () => act(() => bump()),
    newRows: (rows: typeof ROWS) => act(() => swap(rows)),
  };
}

const NOTHING = { dots: 0, yTicks: 0, xFormats: 0 };
const stops = () => screen.getAllByRole("img").filter((el) => el.tagName === "rect");
const tooltip = (container: HTMLElement) => container.querySelector(".recharts-tooltip-wrapper")?.textContent ?? "";

describe("SeriesChart's render cost", () => {
  it("draws nothing again for a render of the page that hands it the same props", () => {
    const chart = page();
    expect(chart.drawn().dots).toBe(ROWS.length);
    chart.forget();
    chart.rerenderPage();
    chart.rerenderPage();
    expect(chart.drawn()).toEqual(NOTHING);
  });

  it("draws nothing again for a pointer moving the tooltip", async () => {
    const chart = page();
    const wrapper = chart.container.querySelector<HTMLElement>(".recharts-wrapper")!;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 800, height: 300 }),
    );
    chart.forget();
    for (const clientX of [200, 400, 600]) {
      const before = tooltip(chart.container);
      fireEvent.mouseMove(wrapper, { clientX, clientY: 150 });
      await waitFor(() => expect(tooltip(chart.container)).not.toBe(before));
    }
    expect(chart.drawn()).toEqual(NOTHING);
  });

  it("draws nothing again for a keyboard step, which moves the tooltip and the tab stop", () => {
    const chart = page();
    chart.forget();
    act(() => stops()[0]!.focus());
    for (let i = 0; i < 3; i++) fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    // The step happened: the stop, its tab stop and its tooltip moved.
    expect(document.activeElement).toBe(stops()[3]);
    expect(stops().filter((stop) => stop.getAttribute("tabindex") === "0")).toEqual([stops()[3]]);
    expect(tooltip(chart.container)).toContain("at 3");
    expect(chart.drawn()).toEqual(NOTHING);
  });

  it("moves a bar chart's outline from bar to bar without drawing its axes again", () => {
    const chart = page("bars");
    const outlined = () =>
      [...chart.container.querySelectorAll(".recharts-bar-rectangle path")].filter(
        (bar) => bar.getAttribute("stroke") === "var(--text-primary)",
      );
    chart.forget();
    chart.rerenderPage();
    // The first row's bars are 0, drawn as nothing: start at the second row's first bar.
    act(() => stops()[2]!.focus());
    const first = outlined();
    expect(first).toHaveLength(1);
    for (let i = 0; i < 3; i++) fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(outlined()).toHaveLength(1);
    expect(outlined()[0]).not.toBe(first[0]);
    expect(chart.drawn()).toEqual(NOTHING);
  });

  it("draws again when what it shows changes", () => {
    const chart = page();
    chart.forget();
    chart.newRows(ROWS.map((row) => ({ ...row, a: row.a + 1 })));
    expect(chart.drawn().dots).toBeGreaterThanOrEqual(ROWS.length);
    expect(chart.drawn().yTicks).toBeGreaterThan(0);
  });
});
