import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SeriesChart, type SeriesChartProps, type SeriesChartRow } from "../series-chart";
import { ascending, envelopeIndices, minimumRows, thinnedRows } from "../series-chart-thin";

/**
 * The row budget (0.34, KS U2): the pure envelope on numbers, and the chart drawing
 * what it keeps. recharts is laid out at a fixed 800x300, as in `series-chart.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

/** `seconds` of a sine at `hz`, sampled at `rate`, as rows `{ x, v }` — the acoustic
 *  sweep's top tone on a 1 kHz profile is the case a stride aliased (KS F88). */
function tone(hz: number, rate: number, seconds: number, amplitude = 10) {
  return Array.from({ length: Math.round(rate * seconds) }, (_, i) => ({
    x: i / rate,
    v: amplitude * Math.sin((2 * Math.PI * hz * i) / rate),
  }));
}

/** The lowest and highest `key` over `rows[from, to)`. */
function extent(rows: readonly SeriesChartRow[], key: string, from: number, to: number): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  for (let i = from; i < to; i += 1) {
    const value = rows[i][key] as number;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return [low, high];
}

const flat = (length: number) => Array.from({ length }, (_, i) => ({ x: i, v: 0 }));

/** A `dot` function that draws nothing and writes down each point's index. */
const record = (seen: number[]) => (point: { index: number }) => {
  seen.push(point.index);
  return null;
};

describe("envelopeIndices — which rows a long table keeps", () => {
  it("keeps a 160 Hz tone at its full swing everywhere, where a stride drew a slow wave", () => {
    // Ten seconds at 1 kHz into 2000 rows. Every sixth sample (the stride the app kept)
    // samples the tone at 167 Hz: a 6.7 Hz wave whose swing comes and goes. The envelope
    // keeps the lowest and the highest sample inside every stretch of the curve.
    const rows = tone(160, 1000, 10);
    const kept = envelopeIndices(rows, ["v"], 2000);
    expect(kept.length).toBeLessThanOrEqual(2000);
    expect(kept.length).toBeGreaterThan(1000);
    for (let from = 0; from < rows.length; from += 100) {
      const drawn = kept.filter((i) => i >= from && i < from + 100).map((i) => rows[i].v);
      const [low, high] = extent(rows, "v", from, from + 100);
      expect(Math.min(...drawn)).toBeCloseTo(low, 9);
      expect(Math.max(...drawn)).toBeCloseTo(high, 9);
    }
  });

  it("keeps a spike one sample wide, which a stride steps over", () => {
    const rows = flat(50_000);
    rows[12_347].v = 400;
    rows[31_001].v = -250;
    const kept = envelopeIndices(rows, ["v"], 1000);
    expect(kept).toContain(12_347);
    expect(kept).toContain(31_001);
  });

  it("returns the rows in order, each once, and only rows that exist", () => {
    const kept = envelopeIndices(tone(37, 1000, 5), ["v"], 300);
    expect(kept).toEqual([...new Set(kept)].sort((a, b) => a - b));
    expect(kept.every((i) => Number.isInteger(i) && i >= 0 && i < 5000)).toBe(true);
  });

  it("keeps the table's first and last row, and each series' first and last sample", () => {
    // `b` is a shorter series laid over a longer one: it starts late and stops early.
    const rows = tone(3, 1000, 7.0013).map((row, i) => ({ ...row, b: i >= 1234 && i <= 5555 ? row.v / 2 : undefined }));
    const kept = envelopeIndices(rows, ["v", "b"], 400);
    expect(kept[0]).toBe(0);
    expect(kept.at(-1)).toBe(rows.length - 1);
    expect(kept).toContain(1234);
    expect(kept).toContain(5555);
  });

  it("stays within the budget with several series sharing one set of rows", () => {
    const rows = tone(160, 1000, 10).map((row, i) => ({ ...row, w: Math.cos(i / 7), z: (i % 13) - 6, y: i % 2 }));
    const kept = envelopeIndices(rows, ["v", "w", "z", "y"], 2000);
    expect(kept.length).toBeLessThanOrEqual(2000);
    // Two rows per series per bucket: four series leave about a quarter as many buckets.
    expect(kept.length).toBeGreaterThan(1000);
  });

  it("returns a range no longer than the budget whole", () => {
    expect(envelopeIndices(flat(10), ["v"], 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(envelopeIndices(flat(100), ["v"], 50, 20, 30)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  });

  it("raises a budget too small to draw an envelope with to the fewest that can", () => {
    expect(minimumRows(1)).toBe(6);
    expect(minimumRows(3)).toBe(14);
    const kept = envelopeIndices(tone(5, 1000, 2), ["v"], 2);
    expect(kept.length).toBeLessThanOrEqual(minimumRows(1));
    expect(kept.length).toBeGreaterThanOrEqual(2);
  });

  it("skips holes: a missing or non-finite cell is no sample", () => {
    const rows = flat(1000).map((row, i) => ({ ...row, v: i === 500 ? Number.NaN : i === 501 ? 9 : 0 }));
    const kept = envelopeIndices(rows, ["v"], 20);
    expect(kept).toContain(501);
    expect(kept).not.toContain(500);
  });
});

describe("thinnedRows — what a chart under `maxRows` draws", () => {
  it("draws everything with no budget, or no more rows than it", () => {
    const rows = flat(500);
    expect(thinnedRows(rows, "x", ["v"], undefined)).toBeUndefined();
    expect(thinnedRows(rows, "x", ["v"], 500)).toBeUndefined();
    expect(thinnedRows(rows, "x", ["v"], 0)).toBeUndefined();
    expect(thinnedRows(rows, "x", ["v"], Number.NaN)).toBeUndefined();
    expect(thinnedRows(rows, "x", ["v"], 100)?.length).toBeLessThanOrEqual(100);
  });

  it("reads the abscissa's direction, skipping holes", () => {
    expect(ascending([{ x: 0 }, { x: 1 }, { x: undefined }, { x: 1 }, { x: 4 }], "x")).toBe(true);
    expect(ascending([{ x: 0 }, { x: 2 }, { x: 1 }], "x")).toBe(false);
  });

  it("envelopes the abscissa too where it doubles back, so a loop keeps its turning points", () => {
    // Out to x = 1000 and back, a hysteresis loop against position; `v` is flat, so only
    // the abscissa's own envelope can keep the turning point.
    const rows = Array.from({ length: 20_001 }, (_, i) => ({ x: i <= 10_000 ? i / 10 : (20_000 - i) / 10, v: 1 }));
    const kept = thinnedRows(rows, "x", ["v"], 200)!;
    expect(kept.length).toBeLessThanOrEqual(200);
    expect(kept).toContain(10_000);
  });

  it("thins only the window on show when zoomed, one row past each edge", () => {
    const rows = tone(160, 1000, 10);
    const kept = thinnedRows(rows, "x", ["v"], 400, [4, 6])!;
    expect(kept[0]).toBe(3999);
    expect(kept.at(-1)).toBe(6001);
    expect(kept.length).toBeLessThanOrEqual(400);
  });

  it("draws every sample of a window holding fewer rows than the budget", () => {
    const rows = tone(160, 1000, 10);
    const kept = thinnedRows(rows, "x", ["v"], 400, [5, 5.1])!;
    expect(kept).toEqual(Array.from({ length: 103 }, (_, i) => 4999 + i));
  });

  it("keeps the two rows either side of a window that falls between samples", () => {
    const rows = flat(1000);
    expect(thinnedRows(rows, "x", ["v"], 100, [500.2, 500.7])).toEqual([500, 501]);
  });
});

describe("SeriesChart `maxRows`", () => {
  const ROWS = tone(160, 1000, 6);

  function draw(props: Partial<SeriesChartProps> = {}) {
    return render(
      <SeriesChart rows={ROWS} series={[{ key: "v", label: "V" }]} axes={[{ id: "y", title: "V" }]} {...props} />,
    );
  }

  const root = (container: HTMLElement) => container.querySelector("[data-chart]") as HTMLElement;
  const yTicks = (container: HTMLElement) =>
    [...container.querySelectorAll(".recharts-yAxis-tick-labels tspan")].map((t) => t.textContent);

  it("draws every row by default, as before", () => {
    const seen: number[] = [];
    const { container } = draw({
      rows: ROWS.slice(0, 300),
      series: [{ key: "v", label: "V", dot: record(seen) }],
    });
    expect(root(container).hasAttribute("data-thinned")).toBe(false);
    expect(new Set(seen).size).toBe(300);
  });

  it("hands recharts at most `maxRows` rows, says so on the root, and fits the axes on every row", () => {
    const whole = draw();
    const ticks = yTicks(whole.container);
    whole.unmount();
    const { container } = draw({ maxRows: 500 });
    const [drawn, all] = root(container).getAttribute("data-thinned")!.split("/").map(Number);
    expect(all).toBe(ROWS.length);
    expect(drawn).toBeLessThanOrEqual(500);
    expect(yTicks(container)).toEqual(ticks);
  });

  it("reports the CALLER's index to a dot function and to a click, not the drawn row's", () => {
    const rows = flat(3000).map((row, i) => ({ ...row, v: i === 1234 ? 999 : 0 }));
    const seen: number[] = [];
    const onPointClick = vi.fn();
    draw({
      rows,
      maxRows: 100,
      onPointClick,
      series: [{ key: "v", label: "V", dot: record(seen) }],
    });
    expect(seen).toContain(1234);
    expect(seen.length).toBeLessThanOrEqual(100);
    const stop = within(screen.getByRole("group", { name: "Chart values" })).getByRole("button", { name: /V: 999$/ });
    fireEvent.keyDown(stop, { key: "Enter" });
    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick.mock.calls[0][0]).toMatchObject({ index: 1234, row: rows[1234], x: 1234 });
  });

  it("never thins a category axis: a slot left out would be a gap", () => {
    const rows = Array.from({ length: 300 }, (_, i) => ({ month: `m${i}`, v: i % 7 }));
    const { container } = draw({ rows, x: { type: "category", key: "month" }, maxRows: 50 });
    expect(root(container).hasAttribute("data-thinned")).toBe(false);
  });

  it("thins a time axis on its plotted instants", () => {
    const start = Date.UTC(2026, 0, 1);
    const rows = ROWS.map((row, i) => ({ at: new Date(start + i * 60_000), v: row.v }));
    const { container } = draw({ rows, x: { type: "time", key: "at" }, maxRows: 300 });
    expect(Number(root(container).getAttribute("data-thinned")!.split("/")[0])).toBeLessThanOrEqual(300);
  });

  it("draws the zoomed window's own samples rather than the same rows larger", () => {
    const rows = flat(5000).map((row, i) => ({ ...row, v: Math.sin(i / 3) }));
    const { container, rerender } = draw({ rows, maxRows: 400 });
    const surface = container.querySelector<SVGRectElement>("rect[data-zoom-surface]")! as unknown as HTMLElement;
    surface.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
    const left = Number(surface.getAttribute("x"));
    const width = Number(surface.getAttribute("width"));
    for (const [type, at] of [
      ["pointerdown", 0.5],
      ["pointermove", 0.53],
      ["pointerup", 0.53],
    ] as const) {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: left + width * at, clientY: 100 });
      Object.defineProperty(event, "pointerId", { value: 1 });
      fireEvent(surface, event);
    }
    // A fresh dot function, so only the zoomed render is counted.
    const seen: number[] = [];
    rerender(
      <SeriesChart
        rows={rows}
        maxRows={400}
        series={[{ key: "v", label: "V", dot: record(seen) }]}
        axes={[{ id: "y", title: "V" }]}
      />,
    );
    const drawn = [...new Set(seen)].sort((a, b) => a - b);
    // A window of about 150 rows, under the budget: every one of them, in a run.
    expect(drawn.length).toBeGreaterThan(50);
    expect(drawn.length).toBeLessThan(400);
    expect(drawn.at(-1)! - drawn[0]).toBe(drawn.length - 1);
    expect(root(container).getAttribute("data-thinned")).toBe(`${drawn.length}/5000`);
  });
});
