import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { SeriesChart, StaticSeriesChart } from "../series-chart";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * Refactor audit 2026-10-30, DSP-5: a SeriesChart had no text alternative. Without
 * `onPointClick` it was an unnamed `role="application"` tab stop (recharts'
 * `accessibilityLayer`) whose arrows moved a tooltip nothing announced, and the zoom
 * layer's `role="application"` rect carried the only name — the drag hint — on an
 * element that could not take focus. PieChart is the model: a named figure, named
 * stops behind one tab stop. Real recharts at a fixed 800x300, as in
 * `series-chart.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const MONTHS = [
  { period: "Jan", income: 900, expense: 300 },
  { period: "Feb", income: 1200 },
  { period: "Mar", income: 800, expense: 900 },
];

const BARS = [
  { key: "income", label: "Income", type: "bar" as const },
  { key: "expense", label: "Expense", type: "bar" as const },
];

const stops = () => within(screen.getByRole("group", { name: "Chart values" })).getAllByRole("img");

describe("SeriesChart as a figure", () => {
  it("is a figure named by `aria-label` and described by `description` and the drag hint", () => {
    render(
      <SeriesChart
        rows={[
          { x: 0, v: 1 },
          { x: 1, v: 3 },
        ]}
        series={[{ key: "v", label: "V" }]}
        aria-label="Steering angle"
        description="Rises from 1 to 3."
      />,
    );
    const figure = screen.getByRole("figure", { name: "Steering angle" });
    expect(figure).toHaveAccessibleDescription(/^Rises from 1 to 3\. Drag to zoom/);
  });

  it("says the drag hint in the provider's words", () => {
    render(
      <UiKitProvider labels={{ seriesChart: { zoomHint: "Ziehen zum Zoomen." } }}>
        <SeriesChart
          rows={[
            { x: 0, v: 1 },
            { x: 1, v: 3 },
          ]}
          series={[{ key: "v", label: "V" }]}
          aria-label="Lenkwinkel"
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("figure", { name: "Lenkwinkel" })).toHaveAccessibleDescription("Ziehen zum Zoomen.");
  });

  it("says no drag hint where nothing zooms", () => {
    render(
      <StaticSeriesChart
        rows={MONTHS}
        x={{ type: "category", key: "period" }}
        series={BARS}
        aria-label="Income and expense"
        description="Income ahead every month."
      />,
    );
    expect(screen.getByRole("figure", { name: "Income and expense" })).toHaveAccessibleDescription(
      "Income ahead every month.",
    );
  });

  it("names the empty state too, so the reader knows which chart has nothing", () => {
    render(<SeriesChart rows={[]} series={BARS} aria-label="Income and expense" />);
    expect(screen.getByRole("figure", { name: "Income and expense" })).toHaveTextContent("No data");
  });

  it("is no `application` anywhere: not recharts' surface, not the zoom layer", () => {
    const { container } = render(
      <SeriesChart
        rows={[
          { x: 0, v: 1 },
          { x: 1, v: 3 },
        ]}
        series={[{ key: "v", label: "V" }]}
      />,
    );
    expect(container.querySelector('[role="application"]')).toBeNull();
    // The drag surface is still there, and still takes the pointer.
    expect(container.querySelector("rect[data-zoom-surface]")).not.toBeNull();
  });
});

describe("SeriesChart's read-only stops (no `onPointClick`)", () => {
  const draw = () =>
    render(
      <SeriesChart rows={MONTHS} x={{ type: "category", key: "period" }} series={BARS} valueFormat={(v) => `€${v}`} />,
    );

  it("names every bar with a value, as the clickable chart does, behind ONE tab stop", () => {
    const { container } = draw();
    expect(stops().map((stop) => stop.getAttribute("aria-label"))).toEqual([
      "Jan — Income: €900",
      "Jan — Expense: €300",
      "Feb — Income: €1200",
      "Mar — Income: €800",
      "Mar — Expense: €900",
    ]);
    expect([...container.querySelectorAll('[tabindex="0"]')]).toEqual([stops()[0]]);
  });

  it("steps with the arrows and shows the stop's tooltip; Enter does nothing", () => {
    const { container } = draw();
    const all = stops();
    act(() => all[0].focus());
    fireEvent.keyDown(all[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(all[1]);
    fireEvent.keyDown(all[1], { key: "End" });
    expect(document.activeElement).toBe(all[4]);
    expect(container.querySelector(".recharts-tooltip-wrapper")?.textContent).toContain("€900");
    const enter = fireEvent.keyDown(all[4], { key: "Enter" });
    // Not claimed: a key with nothing to do is left to the page.
    expect(enter).toBe(true);
  });

  it("names a line chart's slots with every value in them", () => {
    render(
      <SeriesChart
        rows={MONTHS}
        x={{ type: "category", key: "period" }}
        series={[
          { key: "income", label: "Income" },
          { key: "expense", label: "Expense" },
        ]}
      />,
    );
    expect(stops().map((stop) => stop.getAttribute("aria-label"))).toEqual([
      "Jan — Income: 900, Expense: 300",
      "Feb — Income: 1,200",
      "Mar — Income: 800, Expense: 900",
    ]);
  });

  it("draws a long series' stops round the roving one only, and still walks all of them", () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ x: i, v: i * 2 }));
    render(<SeriesChart rows={rows} series={[{ key: "v", label: "V" }]} />);
    expect(stops().length).toBeLessThanOrEqual(5);
    act(() => stops()[0].focus());
    expect(document.activeElement).toHaveAttribute("aria-label", "0 — V: 0");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toHaveAttribute("aria-label", "1 — V: 2");
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toHaveAttribute("aria-label", "499 — V: 998");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toHaveAttribute("aria-label", "498 — V: 996");
    expect(stops().length).toBeLessThanOrEqual(5);
  });

  it("takes the group's name from the provider", () => {
    render(
      <UiKitProvider labels={{ seriesChart: { points: "Werte" } }}>
        <SeriesChart rows={MONTHS} x={{ type: "category", key: "period" }} series={BARS} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("group", { name: "Werte" })).toBeInTheDocument();
  });
});
