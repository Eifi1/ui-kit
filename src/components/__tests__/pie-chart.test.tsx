import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { PieChart, type PieChartSlice } from "../pie-chart";
import { ChartContainer, ChartTooltipContent } from "../chart";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * The donut, drawn by REAL recharts at a fixed 400x300 (the `ResponsiveContainer`
 * measures 0x0 under jsdom, so it is replaced by one that hands its chart a size).
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 400, height: 300 } as never),
  };
});

const DATA: PieChartSlice[] = [
  { key: "occupied", label: "Occupied", value: 6 },
  { key: "vacant", label: "Vacant", value: 3 },
  { key: "missing", label: "Unknown", value: null },
  { key: "reserved", label: "Reserved", value: 1 },
];

const slices = (container: HTMLElement) => [...container.querySelectorAll<SVGGElement>("[data-slice]")];

describe("PieChart", () => {
  it("draws one named slice per positive value, clockwise in data order", () => {
    const { container } = render(<PieChart data={DATA} locale="en-US" />);
    const drawn = slices(container);
    expect(drawn.map((s) => s.dataset.slice)).toEqual(["occupied", "vacant", "reserved"]);
    expect(drawn.map((s) => s.getAttribute("aria-label"))).toEqual([
      "Occupied: 6 (60%)",
      "Vacant: 3 (30%)",
      "Reserved: 1 (10%)",
    ]);
    // Inert without onSliceClick: announced as a figure, not as a button.
    expect(drawn[0]).toHaveAttribute("role", "img");
    expect(screen.getByRole("group", { name: "Chart slices" })).toBeInTheDocument();
  });

  it("colours slices by index into data as given, from the palette tokens", () => {
    const { container } = render(<PieChart data={DATA} />);
    const fills = slices(container).map((s) => s.querySelector("path")?.getAttribute("fill"));
    // `reserved` is the fourth row: it keeps --chart-4 although `missing` is not drawn.
    expect(fills).toEqual(["var(--chart-1)", "var(--chart-2)", "var(--chart-4)"]);
  });

  it("puts the total in the donut's centre and the percentages beside the slices", () => {
    const { container } = render(<PieChart data={DATA} formatValue={(v) => `€${v}`} locale="en-US" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("€10")).toBeInTheDocument();
    const labels = [...container.querySelectorAll("text")].map((t) => t.textContent);
    expect(labels).toEqual(expect.arrayContaining(["60%", "30%", "10%"]));
  });

  it("has no centre as a full pie, and no slice labels with sliceLabels='none'", () => {
    const { container } = render(<PieChart data={DATA} variant="pie" sliceLabels="none" />);
    expect(screen.queryByText("Total")).toBeNull();
    expect(container.querySelectorAll("text")).toHaveLength(0);
  });

  it("is ONE tab stop, walked with the arrows and wrapped around the circle", () => {
    const { container } = render(<PieChart data={DATA} />);
    const drawn = slices(container);
    expect(drawn.map((s) => s.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    drawn[0].focus();
    fireEvent.keyDown(drawn[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(drawn[1]);
    fireEvent.keyDown(drawn[1], { key: "ArrowDown" });
    expect(document.activeElement).toBe(drawn[2]);
    fireEvent.keyDown(drawn[2], { key: "ArrowRight" });
    expect(document.activeElement).toBe(drawn[0]);
    fireEvent.keyDown(drawn[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(drawn[2]);
    fireEvent.keyDown(drawn[2], { key: "Home" });
    expect(document.activeElement).toBe(drawn[0]);
    fireEvent.keyDown(drawn[0], { key: "End" });
    expect(document.activeElement).toBe(drawn[2]);
    // The tab stop follows focus.
    expect(slices(container).map((s) => s.getAttribute("tabindex"))).toEqual(["-1", "-1", "0"]);
  });

  it("mirrors ←/→ in RTL, where the next slice is to the left", () => {
    const { container } = render(
      <div dir="rtl">
        <PieChart data={DATA} />
      </div>,
    );
    const drawn = slices(container);
    drawn[0].focus();
    fireEvent.keyDown(drawn[0], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(drawn[1]);
    fireEvent.keyDown(drawn[1], { key: "ArrowRight" });
    expect(document.activeElement).toBe(drawn[0]);
  });

  it("reports a slice on click and on Enter/Space, as buttons", () => {
    const onSliceClick = vi.fn();
    const { container } = render(<PieChart data={DATA} onSliceClick={onSliceClick} />);
    const drawn = slices(container);
    expect(drawn[1]).toHaveAttribute("role", "button");
    fireEvent.keyDown(drawn[1], { key: "Enter" });
    expect(onSliceClick).toHaveBeenLastCalledWith("vacant", DATA[1]);
    fireEvent.keyDown(drawn[2], { key: " " });
    expect(onSliceClick).toHaveBeenLastCalledWith("reserved", DATA[3]);
    fireEvent.click(drawn[0]);
    expect(onSliceClick).toHaveBeenLastCalledWith("occupied", DATA[0]);
  });

  it("switches slices off from the legend, and the shares become of what is left", () => {
    const onHidden = vi.fn();
    const { container } = render(<PieChart data={DATA} onHiddenSlicesChange={onHidden} locale="en-US" />);
    const legend = screen.getByRole("group", { name: "Categories" });
    // Only what can be drawn is in the key: the missing value has no slice to switch.
    expect(within(legend).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Occupied",
      "Vacant",
      "Reserved",
    ]);
    fireEvent.click(within(legend).getByRole("button", { name: "Occupied" }));
    expect(onHidden).toHaveBeenCalledWith(new Set(["occupied"]));
    expect(slices(container).map((s) => s.getAttribute("aria-label"))).toEqual([
      "Vacant: 3 (75%)",
      "Reserved: 1 (25%)",
    ]);
    expect(within(legend).getByRole("button", { name: "Occupied" })).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the legend when every slice is switched off, so they can come back", () => {
    render(<PieChart data={DATA} hiddenSlices={new Set(["occupied", "vacant", "reserved"])} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Categories" })).toBeInTheDocument();
  });

  it("draws a static key with legend='static'", () => {
    render(<PieChart data={DATA} legend="static" />);
    const list = screen.getByRole("list", { name: "Categories" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).queryByRole("button")).toBeNull();
  });

  it("says so with nothing to draw, rather than an empty box", () => {
    const { container, rerender } = render(<PieChart data={[{ key: "a", label: "A", value: null }]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(slices(container)).toHaveLength(0);
    expect(screen.queryByRole("group")).toBeNull();
    rerender(<PieChart data={[]} empty="Nothing yet" />);
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });

  it("tags the centre, the tooltip and value labels data-private under redact", () => {
    const { container } = render(<PieChart data={DATA} redact sliceLabels="value" />);
    expect(screen.getByText("10").closest("[data-private]")).not.toBeNull();
    const valueLabels = [...container.querySelectorAll("text")];
    expect(valueLabels.length).toBeGreaterThan(0);
    for (const t of valueLabels) expect(t).toHaveAttribute("data-private");
  });

  it("leaves percentages readable under redact", () => {
    const { container } = render(<PieChart data={DATA} redact />);
    for (const t of container.querySelectorAll("text")) expect(t).not.toHaveAttribute("data-private");
  });

  it("speaks the provider's language and its percent format", () => {
    const { container } = render(
      <UiKitProvider
        locale="de-DE"
        labels={{ pieChart: { slice: (l, v, p) => `${l} – ${v} (${p})`, total: "Gesamt" } }}
      >
        <PieChart data={[{ key: "a", label: "A", value: 1500 }, { key: "b", label: "B", value: 500 }]} />
      </UiKitProvider>,
    );
    expect(slices(container)[0]).toHaveAttribute("aria-label", "A – 1.500 (75 %)");
    expect(screen.getByText("Gesamt")).toBeInTheDocument();
  });

  it("gives a small share a decimal rather than rounding it to 0%", () => {
    const { container } = render(
      <PieChart data={[{ key: "a", label: "A", value: 996 }, { key: "b", label: "B", value: 4 }]} locale="en-US" />,
    );
    expect(slices(container)[1]).toHaveAttribute("aria-label", "B: 4 (0.4%)");
  });
});

describe("the shared tooltip it uses", () => {
  it("prints the em dash for a slice with no value, not a fabricated 0", () => {
    render(
      <ChartContainer config={{}}>
        <div>
          <ChartTooltipContent
            active
            hideLabel
            valueFormatter={(v) => `${v} (x%)`}
            payload={[{ dataKey: "value", name: "Unknown", value: undefined }]}
          />
        </div>
      </ChartContainer>,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
