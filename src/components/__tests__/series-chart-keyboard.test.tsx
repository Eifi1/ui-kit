import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { SeriesChart, type SeriesChartProps } from "../series-chart";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * 0.10: whole-number y ticks and the keyboard stops of a clickable chart, drawn by REAL
 * recharts at a fixed 800x300 (see `series-chart.test.tsx` for why that works in jsdom).
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const text = (container: HTMLElement, selector: string) =>
  [...container.querySelectorAll(`${selector} tspan`)].map((t) => t.textContent ?? "");
const yTicks = (container: HTMLElement) => text(container, ".recharts-yAxis-tick-labels");

const COUNTS = [
  { x: 0, users: 1 },
  { x: 1, users: 3 },
  { x: 2, users: 2 },
  { x: 3, users: 3 },
];

describe("whole-number y ticks", () => {
  const draw = (props: Partial<SeriesChartProps> = {}) =>
    render(
      <SeriesChart
        rows={COUNTS}
        series={[{ key: "users", label: "Users" }]}
        axes={[{ id: "y", title: "Users" }]}
        {...props}
      />,
    );

  it("ticks an axis of whole-number data on whole numbers by itself", () => {
    // Fitted to [0.92, 3.08] the 1/2/5 ladder would step by 0.5 — half a user.
    const { container } = draw();
    expect(yTicks(container)).toEqual(["1", "2", "3"]);
  });

  it("keeps the fractional ticks with `integerTicks: false`", () => {
    const { container } = draw({ axes: [{ id: "y", title: "Users", integerTicks: false }] });
    expect(yTicks(container)).toContain("1.5");
  });

  it("forces whole ticks over fractional data with `integerTicks: true` (days of runway)", () => {
    const rows = [
      { x: 0, days: 0.4 },
      { x: 1, days: 2.7 },
      { x: 2, days: 3.6 },
    ];
    const series = [{ key: "days", label: "Days" }];
    const fractional = render(<SeriesChart rows={rows} series={series} axes={[{ id: "y", title: "Days" }]} />);
    expect(yTicks(fractional.container).some((t) => t.includes("."))).toBe(true);
    fractional.unmount();
    const { container } = render(
      <SeriesChart rows={rows} series={series} axes={[{ id: "y", title: "Days", integerTicks: true }]} />,
    );
    const ticks = yTicks(container);
    expect(ticks.length).toBeGreaterThan(1);
    for (const tick of ticks) expect(Number.isInteger(Number(tick))).toBe(true);
  });

  it("falls back to the ordinary ticks in a window holding no whole number", () => {
    const { container } = draw({ axes: [{ id: "y", title: "Users", domain: [1.1, 1.9] }] });
    expect(yTicks(container).length).toBeGreaterThan(0);
  });

  it("leaves the caller's own tickValues alone", () => {
    const { container } = draw({ axes: [{ id: "y", title: "Users", tickValues: [1.5, 2.5], integerTicks: true }] });
    expect(yTicks(container)).toEqual(["1.5", "2.5"]);
  });

  it("decides per axis: a whole-number axis beside a fractional one", () => {
    const rows = COUNTS.map((row, i) => ({ ...row, rate: 0.1 + i * 0.37 }));
    const { container } = render(
      <SeriesChart
        rows={rows}
        series={[
          { key: "users", label: "Users" },
          { key: "rate", label: "Rate", axis: "r" },
        ]}
        axes={[
          { id: "y", title: "Users" },
          { id: "r", title: "Rate", orientation: "right" },
        ]}
      />,
    );
    const [left, right] = [...container.querySelectorAll(".recharts-yAxis-tick-labels")].map((axis) =>
      [...axis.querySelectorAll("tspan")].map((t) => t.textContent ?? ""),
    );
    expect(left).toEqual(["1", "2", "3"]);
    expect(right.some((t) => t.includes("."))).toBe(true);
  });
});

const MONTHS = [
  { period: "Jan", income: 900, expense: 300 },
  { period: "Feb", income: 1200 },
  { period: "Mar", income: 800, expense: 900 },
];

const money = (props: Partial<SeriesChartProps> = {}) =>
  render(
    <SeriesChart
      rows={MONTHS}
      x={{ type: "category", key: "period" }}
      series={[
        { key: "income", label: "Income", type: "bar" },
        { key: "expense", label: "Expense", type: "bar" },
      ]}
      valueFormat={(v) => `€${v}`}
      {...props}
    />,
  );

const stops = () => within(screen.getByRole("group", { name: "Chart values" })).getAllByRole("button");

describe("keyboard stops of a clickable chart", () => {
  it("has none without `onPointClick`", () => {
    money();
    expect(screen.queryByRole("group", { name: "Chart values" })).toBeNull();
  });

  it("makes every bar with a value a named stop, in slot order, behind ONE tab stop", () => {
    money({ onPointClick: vi.fn() });
    // Feb has no expense: five bars, five stops.
    expect(stops().map((stop) => stop.getAttribute("aria-label"))).toEqual([
      "Jan — Income: €900",
      "Jan — Expense: €300",
      "Feb — Income: €1200",
      "Mar — Income: €800",
      "Mar — Expense: €900",
    ]);
    expect(stops().map((stop) => stop.getAttribute("tabindex"))).toEqual(["0", "-1", "-1", "-1", "-1"]);
  });

  it("takes no pointer events, so the pointer still reaches the chart underneath", () => {
    money({ onPointClick: vi.fn() });
    for (const stop of stops()) expect(stop.getAttribute("pointer-events")).toBe("none");
  });

  it("steps with the arrows, Home and End, and moves the tab stop along", () => {
    money({ onPointClick: vi.fn() });
    const all = stops();
    act(() => all[0].focus());
    fireEvent.keyDown(all[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(all[1]);
    fireEvent.keyDown(all[1], { key: "ArrowRight" });
    expect(document.activeElement).toBe(all[2]);
    expect(stops().map((stop) => stop.getAttribute("tabindex"))).toEqual(["-1", "-1", "0", "-1", "-1"]);
    fireEvent.keyDown(all[2], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(all[1]);
    fireEvent.keyDown(all[1], { key: "End" });
    expect(document.activeElement).toBe(all[4]);
    fireEvent.keyDown(all[4], { key: "ArrowRight" });
    expect(document.activeElement).toBe(all[4]);
    fireEvent.keyDown(all[4], { key: "Home" });
    expect(document.activeElement).toBe(all[0]);
  });

  it("keeps ↑/↓ inside one slot's bars", () => {
    money({ onPointClick: vi.fn() });
    const all = stops();
    act(() => all[0].focus());
    fireEvent.keyDown(all[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(all[1]);
    // Jan has two bars; ↓ from the last one stays put rather than falling into Feb.
    fireEvent.keyDown(all[1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(all[1]);
    fireEvent.keyDown(all[1], { key: "ArrowUp" });
    expect(document.activeElement).toBe(all[0]);
  });

  it("reports ↵ and Space as the click on that bar would, series included", () => {
    const onPointClick = vi.fn();
    money({ onPointClick });
    const all = stops();
    act(() => all[4].focus());
    fireEvent.keyDown(all[4], { key: "Enter" });
    expect(onPointClick).toHaveBeenCalledTimes(1);
    expect(onPointClick.mock.calls[0][0]).toMatchObject({ index: 2, key: "expense", x: "Mar", row: MONTHS[2] });
    fireEvent.keyDown(all[2], { key: " " });
    expect(onPointClick.mock.calls[1][0]).toMatchObject({ index: 1, key: "income", x: "Feb" });
  });

  it("gives a chart without bars one stop per slot, naming every value in it", () => {
    const onPointClick = vi.fn();
    render(
      <SeriesChart
        rows={MONTHS}
        x={{ type: "category", key: "period" }}
        series={[
          { key: "income", label: "Income" },
          { key: "expense", label: "Expense" },
        ]}
        onPointClick={onPointClick}
      />,
    );
    const all = stops();
    expect(all.map((stop) => stop.getAttribute("aria-label"))).toEqual([
      "Jan — Income: 900, Expense: 300",
      "Feb — Income: 1,200",
      "Mar — Income: 800, Expense: 900",
    ]);
    act(() => all[1].focus());
    fireEvent.keyDown(all[1], { key: "Enter" });
    expect(onPointClick).toHaveBeenCalledWith({ index: 1, row: MONTHS[1], x: "Feb", key: undefined });
  });

  it("names a time slot by the tooltip's date and orders stops along the axis", () => {
    const rows = [
      { day: "2026-03-02", v: 2 },
      { day: "2026-03-01", v: 1 },
    ];
    render(
      <SeriesChart
        rows={rows}
        x={{ type: "time", key: "day", label: (ms) => `day ${new Date(ms).getDate()}` }}
        series={[{ key: "v", label: "V" }]}
        onPointClick={vi.fn()}
      />,
    );
    expect(stops().map((stop) => stop.getAttribute("aria-label"))).toEqual(["day 1 — V: 1", "day 2 — V: 2"]);
  });

  it("shows the focused stop's tooltip, and outlines the focused bar", () => {
    const { container } = money({ onPointClick: vi.fn() });
    const all = stops();
    act(() => all[3].focus());
    const tooltip = container.querySelector(".recharts-tooltip-wrapper");
    expect(tooltip?.textContent).toContain("Mar");
    expect(tooltip?.textContent).toContain("€800");
    // The outline goes on that one bar, not on the slot's other.
    const outlined = [...container.querySelectorAll(".recharts-bar-rectangle path")].filter(
      (bar) => bar.getAttribute("stroke") === "var(--text-primary)",
    );
    expect(outlined).toHaveLength(1);
    act(() => all[3].blur());
    expect(container.querySelector(".recharts-tooltip-wrapper")?.textContent ?? "").not.toContain("€800");
  });

  it("drops recharts' own keyboard layer, so the chart is one tab stop and not two", () => {
    const { container } = money({ onPointClick: vi.fn() });
    const tabbable = [...container.querySelectorAll('[tabindex="0"]')];
    expect(tabbable).toEqual([stops()[0]]);
  });

  it("names the group from the provider's labels", () => {
    render(
      <UiKitProvider labels={{ seriesChart: { points: "Werte" } }}>
        <SeriesChart
          rows={MONTHS}
          x={{ type: "category", key: "period" }}
          series={[{ key: "income", label: "Income", type: "bar" }]}
          onPointClick={vi.fn()}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("group", { name: "Werte" })).toBeInTheDocument();
  });

  it("leaves the zoom working on a clickable line chart", () => {
    const onPointClick = vi.fn();
    const rows = Array.from({ length: 12 }, (_, i) => ({ x: i, v: (i * 7) % 5 }));
    render(<SeriesChart rows={rows} series={[{ key: "v", label: "V" }]} onPointClick={onPointClick} />);
    expect(stops()).toHaveLength(12);
    const rect = screen.getByLabelText(/drag to zoom/i);
    rect.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
    const left = Number(rect.getAttribute("x"));
    const width = Number(rect.getAttribute("width"));
    for (const [type, x, y] of [
      ["pointerdown", left + width * 0.2, 100],
      ["pointermove", left + width * 0.6, 104],
      ["pointerup", left + width * 0.6, 104],
      ["click", left + width * 0.6, 104],
    ] as const) {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
      Object.defineProperty(event, "pointerId", { value: 1 });
      fireEvent(rect, event);
    }
    expect(screen.getByRole("button", { name: /reset zoom/i })).toBeInTheDocument();
    // The drag was a zoom, not a pick — and the stops now cover only the window.
    expect(onPointClick).not.toHaveBeenCalled();
    expect(stops().length).toBeLessThan(12);
  });
});
