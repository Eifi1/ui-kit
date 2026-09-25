import type { ReactElement } from "react";
import { cloneElement, createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@testing-library/react";
import { SeriesChart, type SeriesChartProps } from "../series-chart";

/**
 * The three gaps keksdose's migration found (0.8.0): tilted x ticks for long category
 * names (budget performance), a tooltip that stays inside a horizontal-scroll wrapper
 * (budget performance), and a per-series hover dot (the cash-buffer projection). Drawn
 * by REAL recharts at a fixed 800x300, as in `series-chart-marks.test.tsx`.
 */
const tooltipProps = vi.hoisted(() => ({ last: null as Record<string, unknown> | null }));

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

// Records what the chart hands `ChartTooltip`, and still draws the real one.
vi.mock("../chart", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../chart")>();
  const { createElement } = await import("react");
  return {
    ...actual,
    ChartTooltip: (props: Record<string, unknown>) => {
      tooltipProps.last = props;
      return createElement(actual.ChartTooltip, props);
    },
  };
});

const ROWS = [
  { x: 0, a: 1, b: 2 },
  { x: 1, a: 3, b: 1 },
  { x: 2, a: 2, b: 5 },
];

const CATEGORIES = [
  { name: "Groceries and household", assigned: 400, spent: 380 },
  { name: "Transport", assigned: 120, spent: 150 },
  { name: "Eating out with friends", assigned: 90, spent: 60 },
];

function draw(props: Partial<SeriesChartProps> = {}) {
  return render(<SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} {...props} />);
}

/** Moves the pointer over the plot at `clientX` — jsdom lays nothing out, so the
 *  wrapper's box is the chart's. */
async function hover(container: HTMLElement, clientX: number) {
  const wrapper = container.querySelector(".recharts-wrapper")!;
  wrapper.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 800, height: 300, right: 800, bottom: 300, x: 0, y: 0 }) as DOMRect;
  await act(async () => {
    fireEvent.mouseMove(wrapper, { clientX, clientY: 150 });
    // recharts throttles pointer moves to an animation frame.
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

const tickTexts = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-xAxis-tick-labels text")] as SVGTextElement[];
/** The plot's height, off the grid's frame of horizontal rules. */
const plotBottom = (container: HTMLElement) =>
  Math.max(
    ...[...container.querySelectorAll(".recharts-cartesian-grid-horizontal line")].map((line) =>
      Number(line.getAttribute("y1")),
    ),
  );

describe("x.tickAngle", () => {
  const category = (tickAngle?: number) =>
    render(
      <SeriesChart
        rows={CATEGORIES}
        x={{ type: "category", key: "name", tickAngle }}
        series={[
          { key: "assigned", label: "Assigned", type: "bar" },
          { key: "spent", label: "Spent", type: "bar" },
        ]}
      />,
    );

  it("leaves level ticks centred, as before", () => {
    const { container } = category();
    const ticks = tickTexts(container);
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.getAttribute("text-anchor")).toBe("middle");
      expect(tick.getAttribute("transform") ?? "").not.toContain("rotate");
    }
  });

  it("hangs a label rising to the right off its END, rotated", () => {
    const { container } = category(-45);
    const ticks = tickTexts(container);
    expect(ticks.map((tick) => tick.textContent)).toContain("Groceries and household");
    for (const tick of ticks) {
      expect(tick.getAttribute("text-anchor")).toBe("end");
      expect(tick.getAttribute("transform")).toMatch(/rotate\(-45/);
    }
  });

  it("anchors a falling label by its START", () => {
    const { container } = category(30);
    for (const tick of tickTexts(container)) expect(tick.getAttribute("text-anchor")).toBe("start");
  });

  it("reserves the rotated height under the axis, capped", () => {
    const level = plotBottom(category().container);
    const tilted = plotBottom(category(-45).container);
    // 23 characters at 45°: well over recharts' 30 px, so the plot gives up the rest.
    expect(level - tilted).toBeGreaterThan(60);
    const steep = plotBottom(category(-90).container);
    // 23 × 7 px upright is 161 px; the band stops at 120 (90 more than level).
    expect(level - steep).toBeLessThanOrEqual(90 + 1);
  });

  it("is the same anchor in RTL — the plot is not mirrored", () => {
    const host = document.createElement("div");
    host.dir = "rtl";
    document.body.append(host);
    const { container } = render(
      <SeriesChart
        rows={CATEGORIES}
        x={{ type: "category", key: "name", tickAngle: -45 }}
        series={[{ key: "spent", label: "Spent", type: "bar" }]}
      />,
      { container: host },
    );
    for (const tick of tickTexts(container)) expect(tick.getAttribute("text-anchor")).toBe("end");
    host.remove();
  });

  it("is ignored where the ticks are off", () => {
    const { container } = draw({ x: { ticks: false, tickAngle: -45 } });
    expect(tickTexts(container)).toHaveLength(0);
  });
});

describe("tooltip containment", () => {
  it("hands recharts nothing new by default", () => {
    draw();
    expect(tooltipProps.last).not.toHaveProperty("allowEscapeViewBox");
    expect(tooltipProps.last).not.toHaveProperty("offset");
  });

  it("passes `allowEscapeViewBox` through", () => {
    draw({ tooltip: { allowEscapeViewBox: { y: true } } });
    expect(tooltipProps.last?.allowEscapeViewBox).toEqual({ y: true });
    expect(tooltipProps.last).not.toHaveProperty("offset");
  });

  it("with a boundary, escapes on x and leaves the offset to the content", () => {
    draw({ tooltip: { boundary: createRef<HTMLElement>() } });
    expect(tooltipProps.last?.allowEscapeViewBox).toEqual({ x: true });
    expect(tooltipProps.last?.offset).toBe(0);
  });

  it("flips the tooltip left at the boundary's VISIBLE right edge", async () => {
    // A 300 px scroll wrapper around the 800 px chart, scrolled to the start.
    const scroller = document.createElement("div");
    Object.defineProperty(scroller, "clientWidth", { value: 300 });
    Object.defineProperty(scroller, "scrollWidth", { value: 800 });
    document.body.append(scroller);
    const boundary = { current: scroller };
    const { container } = render(
      <SeriesChart rows={ROWS} series={[{ key: "a", label: "A" }]} tooltip={{ boundary }} />,
      { container: scroller },
    );
    const tip = () => container.querySelector(".recharts-tooltip-wrapper .shadow-xl") as HTMLElement;
    await hover(container, 700);
    expect(tip().style.transform).toBe("translateX(calc(-100% - 12px))");
    await hover(container, 60);
    expect(tip().style.transform).toBe("translateX(12px)");
    scroller.remove();
  });
});

describe("per-series activeDot", () => {
  const two = (a: SeriesChartProps["series"][number]["activeDot"], type?: "area") =>
    draw({
      series: [
        { key: "a", label: "A", type, activeDot: a },
        { key: "b", label: "B", type },
      ],
    });

  it("draws recharts' hover dot on every series by default", async () => {
    const { container } = two(undefined);
    await hover(container, 400);
    expect(container.querySelectorAll(".recharts-active-dot")).toHaveLength(2);
  });

  it("takes it off a series with `false` — the projection", async () => {
    const { container } = two(false);
    await hover(container, 400);
    expect(container.querySelectorAll(".recharts-active-dot")).toHaveLength(1);
  });

  it("sets its radius with `{ r }`, on an area too", async () => {
    const { container } = two({ r: 7 }, "area");
    await hover(container, 400);
    const radii = [...container.querySelectorAll(".recharts-active-dot circle")].map((dot) =>
      dot.getAttribute("r"),
    );
    expect(radii).toContain("7");
  });
});
