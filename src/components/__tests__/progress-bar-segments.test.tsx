import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "../progress-bar";

describe("ProgressBar segments (keksdose cut-card:133)", () => {
  const PARTS = [
    { value: 0.4, label: "Rent", tone: "danger" as const },
    { value: 0.25, label: "Food" },
    { value: 0.1, label: "Fun", className: "bg-[var(--brand)]" },
  ];

  it("is a meter whose value is the sum and whose valuetext names every part", () => {
    render(<ProgressBar segments={PARTS} max={1} label="Spending" />);
    const meter = screen.getByRole("meter", { name: "Spending" });
    expect(meter).toHaveAttribute("aria-valuenow", "0.75");
    expect(meter).toHaveAttribute("aria-valuetext", "Rent: 40%, Food: 25%, Fun: 10%");
  });

  it("draws one fill per part, sized on the scale, coloured by tone, class or chart colour", () => {
    render(<ProgressBar segments={PARTS} max={1} aria-label="x" />);
    const segs = screen.getByRole("meter").querySelectorAll<HTMLElement>('[data-part="segment"]');
    expect(segs).toHaveLength(3);
    expect(segs[0]).toHaveStyle({ width: "40%" });
    expect(segs[0].className).toContain("bg-[var(--danger)]");
    // The first part WITHOUT a colour of its own: --chart-1, though it is second.
    expect(segs[1].className).toContain("bg-[var(--chart-1)]");
    expect(segs[2].className).toContain("bg-[var(--brand)]");
  });

  it("counts the chart-colour fallback among uncoloured parts only, in the bar and the legend", () => {
    render(
      <ProgressBar
        aria-label="x"
        max={1}
        legend
        segments={[
          { value: 0.1, label: "Tone", tone: "danger" },
          { value: 0.1, label: "A" },
          { value: 0.1, label: "Colour", color: "var(--text-muted)" },
          { value: 0.1, label: "Class", className: "bg-[var(--brand)]" },
          { value: 0.1, label: "B" },
        ]}
      />,
    );
    const segs = screen.getByRole("meter").querySelectorAll<HTMLElement>('[data-part="segment"]');
    expect(segs[1].className).toContain("bg-[var(--chart-1)]");
    expect(segs[4].className).toContain("bg-[var(--chart-2)]");
    expect(segs[2].className).not.toMatch(/--chart-/);
    expect(segs[2]).toHaveStyle({ backgroundColor: "var(--text-muted)" });
    const swatches = document.querySelectorAll<HTMLElement>('[data-part="legend"] li > :first-child');
    expect(swatches[1].className).toContain("bg-[var(--chart-1)]");
    expect(swatches[4].className).toContain("bg-[var(--chart-2)]");
  });

  it("uses formatValue for each part and for the total shown", () => {
    render(
      <ProgressBar
        segments={[{ value: 3, label: "Done" }, { value: 2, label: "Failed" }]}
        max={10}
        label="Files"
        showValue
        formatValue={(v) => `${v} files`}
      />,
    );
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "Done: 3 files, Failed: 2 files");
    expect(screen.getByText("5 files")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a legend only when asked", () => {
    const { rerender } = render(<ProgressBar segments={PARTS} max={1} aria-label="x" />);
    expect(screen.queryByRole("list")).toBeNull();
    rerender(<ProgressBar segments={PARTS} max={1} aria-label="x" legend />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveTextContent("Food");
    expect(items[1]).toHaveTextContent("25%");
  });

  it("an empty set is a meter at min", () => {
    render(<ProgressBar segments={[]} aria-label="Nothing" />);
    expect(screen.getByRole("meter", { name: "Nothing" })).toHaveAttribute("aria-valuenow", "0");
  });
});
