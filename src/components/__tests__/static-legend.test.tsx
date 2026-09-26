import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { StaticLegend, ToggleLegend, type LegendEntry } from "../toggle-legend";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * The legend that is a KEY: kastlan's lease timeline and keksdose's cash buffer drew
 * one by hand — swatches, a dashed line, a dot — under charts whose marks cannot be
 * switched off.
 */
const ENTRIES: LegendEntry[] = [
  { key: "active", label: "Active", color: "#117733" },
  { key: "projection", label: "Projection", color: "var(--money-net)", marker: "stroke", dash: "4 3" },
  { key: "depletion", label: "Depletion", color: "var(--money-expense)", marker: "dot" },
  { key: "today", label: "Today", color: "red", icon: <span data-testid="hairline" className="h-3 w-px" /> },
];

describe("StaticLegend", () => {
  it("is a named list of items, with nothing to press and no tab stops", () => {
    const { container } = render(<StaticLegend entries={ENTRIES} />);
    const list = screen.getByRole("list", { name: "Series" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Active",
      "Projection",
      "Depletion",
      "Today",
    ]);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelectorAll("[tabindex]")).toHaveLength(0);
  });

  it("draws each entry's mark: swatch, the chart's own dash, a dot, or a mark of its own", () => {
    const { container } = render(<StaticLegend entries={ENTRIES} />);
    const items = container.querySelectorAll("li");
    expect(items[0].querySelector("span")).toHaveClass("rounded-[3px]");
    expect(items[1].querySelector("line")).toHaveAttribute("stroke-dasharray", "4 3");
    expect(items[2].querySelector("span")).toHaveClass("rounded-full");
    // The custom mark is decoration: the label is the name.
    expect(screen.getByTestId("hairline").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("draws a single entry (a key of one line still says what it means)", () => {
    render(<StaticLegend entries={ENTRIES.slice(0, 1)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("draws nothing for no entries", () => {
    const { container } = render(<StaticLegend entries={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("takes its name from the prop, else the provider's seriesChart.legend", () => {
    render(<StaticLegend entries={ENTRIES} aria-label="Lease status" />);
    expect(screen.getByRole("list", { name: "Lease status" })).toBeInTheDocument();
    render(
      <UiKitProvider labels={{ seriesChart: { legend: "Legende" } }}>
        <StaticLegend entries={ENTRIES} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("list", { name: "Legende" })).toBeInTheDocument();
  });

  it("stacks vertically", () => {
    render(<StaticLegend entries={ENTRIES} orientation="vertical" />);
    expect(screen.getByRole("list")).toHaveClass("flex-col");
  });
});

describe("ToggleLegend's new marks", () => {
  it("draws a dot, hollow while its entry is off", () => {
    const { container } = render(
      <ToggleLegend entries={ENTRIES.slice(1, 3)} hidden={new Set(["depletion"])} onToggle={() => {}} />,
    );
    const dot = container.querySelectorAll("button")[1].querySelector("span.rounded-full") as HTMLElement;
    expect(dot.style.backgroundColor).toBe("transparent");
  });
});
