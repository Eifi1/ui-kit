import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SeriesChart, type SeriesChartProps } from "../series-chart";

/**
 * keksdose 0.10 (D8): the spending tab's weekday bars drew a 2% stub for a day with no
 * spending, so the slot still read as a day. `minBarLength` is that stub — drawing only.
 * Real recharts at a fixed 800x300, as in `series-chart.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const WEEK = [
  { day: "Mon", spent: 40 },
  { day: "Tue", spent: 0 },
  // A hole: no value at all, which is not a zero.
  { day: "Wed" },
  { day: "Thu", spent: 10 },
];

function draw(props: Partial<SeriesChartProps> = {}) {
  return render(
    <SeriesChart
      rows={WEEK}
      x={{ type: "category", key: "day" }}
      series={[{ key: "spent", label: "Spent", type: "bar" }]}
      valueFormat={(v) => `€${v}`}
      {...props}
    />,
  );
}

/** Each drawn bar's height in px, off its path: the first `L` is on the top edge, the
 *  last on the baseline. */
const heights = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-bar-rectangle path")].map((path) => {
    const ys = [...(path.getAttribute("d") ?? "").matchAll(/L\s*[\d.]+,([\d.]+)/g)].map((m) => Number(m[1]));
    return Math.round(ys[ys.length - 1] - ys[0]);
  });

const yTicks = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-yAxis-tick-labels tspan")].map((t) => t.textContent ?? "");

const stopNames = () =>
  within(screen.getByRole("group", { name: "Chart values" }))
    .getAllByRole("button")
    .map((stop) => stop.getAttribute("aria-label"));

describe("SeriesChart minBarLength", () => {
  it("draws nothing for a zero by default", () => {
    const { container } = draw();
    expect(heights(container)).toHaveLength(2);
  });

  it("keeps a stub for a zero, chart-wide — and none for a hole", () => {
    const plain = draw();
    const before = heights(plain.container);
    const ticks = yTicks(plain.container);
    plain.unmount();

    const { container } = draw({ minBarLength: 4 });
    const after = heights(container);
    // Mon, Tue's stub, Thu: Wed has no value and stays a gap.
    expect(after).toHaveLength(3);
    expect(after[1]).toBe(4);
    // The real bars are exactly as tall as before, on the same axis.
    expect([after[0], after[2]]).toEqual(before);
    expect(yTicks(container)).toEqual(ticks);
  });

  it("takes a series' own length over the chart's, and 0 turns it off", () => {
    const own = draw({
      minBarLength: 4,
      series: [{ key: "spent", label: "Spent", type: "bar", minBarLength: 6 }],
    });
    expect(heights(own.container)[1]).toBe(6);
    own.unmount();

    const off = draw({
      minBarLength: 4,
      series: [{ key: "spent", label: "Spent", type: "bar", minBarLength: 0 }],
    });
    expect(heights(off.container)).toHaveLength(2);
  });

  it("stretches only the drawing: stops and their names still say 0", () => {
    const plain = draw({ onPointClick: vi.fn() });
    const names = stopNames();
    plain.unmount();
    draw({ onPointClick: vi.fn(), minBarLength: 4 });
    expect(stopNames()).toEqual(names);
    expect(stopNames()).toContain("Tue — Spent: €0");
  });

  it("gives a hole in a stack no stub", () => {
    const { container } = draw({
      minBarLength: 4,
      series: [
        { key: "spent", label: "Spent", type: "bar", stack: "s" },
        { key: "saved", label: "Saved", type: "bar", stack: "s" },
      ],
      rows: WEEK.map((row) => ({ ...row, saved: 5 })),
    });
    // spent: Mon, Tue's stub, Thu (not Wed); saved: all four.
    expect(heights(container)).toHaveLength(7);
  });
});
