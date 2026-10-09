import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { SeriesChart, resolveTooltipPlacement, type SeriesChartProps } from "../series-chart";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * keksdose #359: `tooltip.placement` — the values in a readout row above or below the
 * plot instead of a box under the reader's finger. Drawn by REAL recharts at a fixed
 * 800x300 (see `series-chart.test.tsx` for why that works in jsdom).
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

/** jsdom has no matchMedia; `phone` answers the readout's phone query, `(width < N)`. */
function stubPhone(phone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: phone && query.includes("width <"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

const MONTHS = [
  { period: "Jan", income: 900, expense: 300 },
  { period: "Feb", income: 1200 },
  { period: "Mar", income: 800, expense: 900 },
];

const chart = (props: Partial<SeriesChartProps> = {}) => (
  <SeriesChart
    rows={MONTHS}
    x={{ type: "category", key: "period", title: "Month" }}
    series={[
      { key: "income", label: "Income", type: "bar" },
      { key: "expense", label: "Expense", type: "bar" },
    ]}
    valueFormat={(v) => `€${v}`}
    {...props}
  />
);

const readout = (container: HTMLElement) => container.querySelector<HTMLElement>("[data-tooltip-readout]");

describe("resolveTooltipPlacement", () => {
  it("is the cursor box when nobody says otherwise", () => {
    expect(resolveTooltipPlacement(undefined, undefined, false)).toBe("cursor");
    expect(resolveTooltipPlacement(undefined, undefined, true)).toBe("cursor");
  });

  it("takes the chart's own placement over the provider's", () => {
    expect(resolveTooltipPlacement("below", "above", false)).toBe("below");
    expect(resolveTooltipPlacement("cursor", "auto", true)).toBe("cursor");
    expect(resolveTooltipPlacement(undefined, "below", false)).toBe("below");
  });

  it("reads `auto` as above on a phone and the cursor box from `sm` up", () => {
    expect(resolveTooltipPlacement("auto", undefined, true)).toBe("above");
    expect(resolveTooltipPlacement("auto", undefined, false)).toBe("cursor");
    expect(resolveTooltipPlacement(undefined, "auto", true)).toBe("above");
  });
});

describe("tooltip placement on the chart", () => {
  it("keeps today's floating tooltip, and no row, by default", () => {
    const { container } = render(chart());
    expect(readout(container)).toBeNull();
  });

  it("reserves an idle row above the plot before anything is pointed at", () => {
    const { container } = render(chart({ tooltip: { placement: "above" } }));
    const row = readout(container)!;
    expect(row.dataset.tooltipReadout).toBe("above");
    // Before the plot, in document order.
    const plot = container.querySelector("[data-chart]")!;
    expect(row.compareDocumentPosition(plot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Idle: the x axis' title, and every series with a dash — the cells it will have.
    const idle = row.querySelector("[data-chart-readout]")!;
    expect(idle.getAttribute("data-chart-readout")).toBe("idle");
    expect(idle.textContent).toContain("Month");
    expect(idle.textContent).toContain("Income");
    expect(idle.textContent).toContain("Expense");
    expect(idle.textContent).not.toContain("€");
    // Not a live region: scrubbing would announce a value per pixel.
    expect(row.closest("[aria-live]")).toBeNull();
    expect(row.querySelector("[aria-live]")).toBeNull();
  });

  it("puts the row under the plot with `below`", () => {
    const { container } = render(chart({ tooltip: { placement: "below" } }));
    const row = readout(container)!;
    const plot = container.querySelector("[data-chart]")!;
    expect(row.compareDocumentPosition(plot) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it("fills the row from the keyboard's stop, and goes idle again on blur", () => {
    const { container } = render(chart({ tooltip: { placement: "above" }, onPointClick: vi.fn() }));
    const stops = within(screen.getByRole("group", { name: "Chart values" })).getAllByRole("button");
    act(() => stops[3].focus());
    const row = readout(container)!;
    expect(row.querySelector("[data-chart-readout]")?.getAttribute("data-chart-readout")).toBe("active");
    expect(row.textContent).toContain("Mar");
    expect(row.textContent).toContain("€800");
    expect(row.textContent).toContain("€900");
    // The values are in the row, not in a box floating over the plot.
    expect(container.querySelector("[data-chart] .recharts-tooltip-wrapper")).toBeNull();
    act(() => stops[3].blur());
    expect(row.textContent).not.toContain("€800");
    expect(row.querySelector("[data-chart-readout]")?.getAttribute("data-chart-readout")).toBe("idle");
  });

  it("takes the provider's default, and the chart's own prop over it", () => {
    const { container, rerender } = render(
      <UiKitProvider chartTooltipPlacement="below">{chart()}</UiKitProvider>,
    );
    expect(readout(container)?.dataset.tooltipReadout).toBe("below");
    rerender(<UiKitProvider chartTooltipPlacement="below">{chart({ tooltip: { placement: "cursor" } })}</UiKitProvider>);
    expect(readout(container)).toBeNull();
  });

  it("resolves the provider's `auto` against the phone query", () => {
    stubPhone(true);
    const phone = render(<UiKitProvider chartTooltipPlacement="auto">{chart()}</UiKitProvider>);
    expect(readout(phone.container)?.dataset.tooltipReadout).toBe("above");
    phone.unmount();
    stubPhone(false);
    const desk = render(<UiKitProvider chartTooltipPlacement="auto">{chart()}</UiKitProvider>);
    expect(readout(desk.container)).toBeNull();
  });

  it("says a budgeted axis' unit in the row as the box does", () => {
    // Over `maxVisibleAxes`, the second left axis is drawn hidden and its series says "(N)".
    const { container } = render(
      <SeriesChart
        rows={[
          { x: 0, a: 1, b: 2 },
          { x: 1, a: 2, b: 3 },
        ]}
        series={[
          { key: "a", label: "Travel", axis: "mm" },
          { key: "b", label: "Load", axis: "n" },
        ]}
        axes={[
          { id: "mm", title: "Travel (mm)" },
          { id: "n", title: "Load (N)" },
        ]}
        maxVisibleAxes={1}
        tooltip={{ placement: "above" }}
      />,
    );
    expect(readout(container)?.textContent).toContain("Load (N)");
  });
});
