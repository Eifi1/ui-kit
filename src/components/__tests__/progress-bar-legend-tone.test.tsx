import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "../progress-bar";
import { toneTextClass } from "../signed-amount";

// keksdose's tax card: one bucket's three certainties, filled by the app's own ramp,
// the figures in the bucket's money direction.
const PARTS = [
  { key: "booked", value: 60, label: "Booked", className: "bg-[var(--chart-1)]" },
  { key: "committed", value: 30, label: "Committed", className: "bg-[var(--chart-2)]" },
  { key: "extrapolated", value: -10, label: "Extrapolated", className: "bg-[var(--chart-3)]" },
];
const figures = () => Array.from(document.querySelectorAll<HTMLElement>('[data-part="legend-value"]'));

describe("ProgressBar legendTone (keksdose tax-tab Bucket)", () => {
  it("leaves every legend figure muted by default", () => {
    render(<ProgressBar segments={PARTS} max={100} aria-label="x" legend />);
    for (const f of figures()) {
      expect(f.className).toContain("text-[var(--text-muted)]");
      expect(f.className).not.toContain("money");
    }
  });

  it("colours every figure in one tone, from the kit's text-tone palette", () => {
    render(<ProgressBar segments={PARTS} max={100} aria-label="x" legend legendTone="expense" />);
    for (const f of figures()) {
      expect(f.className).toContain(toneTextClass("expense"));
      expect(f.className).not.toContain("text-[var(--text-muted)]");
    }
  });

  it("takes a tone per row from a function, undefined staying muted", () => {
    render(
      <ProgressBar
        segments={PARTS}
        max={100}
        aria-label="x"
        legend
        legendTone={(seg, i) => (i === 2 ? undefined : seg.value < 0 ? "expense" : "income")}
      />,
    );
    const [a, b, c] = figures();
    expect(a.className).toContain("text-[var(--money-income)]");
    expect(b.className).toContain("text-[var(--money-income)]");
    expect(c.className).toContain("text-[var(--text-muted)]");
  });

  it("hands the function the segment and its index, legend-only rows included", () => {
    const seen: Array<[string | undefined, number]> = [];
    render(
      <ProgressBar
        segments={[...PARTS, { key: "empty", value: 0, label: "Empty", legendOnly: true }]}
        max={100}
        aria-label="x"
        legend
        legendTone={(seg, i) => {
          seen.push([seg.key, i]);
          return "muted";
        }}
      />,
    );
    expect(seen).toEqual([
      ["booked", 0],
      ["committed", 1],
      ["extrapolated", 2],
      ["empty", 3],
    ]);
  });

  it("keeps `sensitive` tagging the toned figure, and leaves the formatted text alone", () => {
    render(
      <ProgressBar
        segments={PARTS}
        max={100}
        aria-label="x"
        legend
        sensitive
        legendTone="income"
        formatValue={(v) => `CHF ${v}`}
      />,
    );
    const fs = figures();
    expect(fs.map((f) => f.textContent)).toEqual(["CHF 60", "CHF 30", "CHF -10"]);
    for (const f of fs) {
      expect(f).toHaveAttribute("data-private");
      expect(f.className).toContain("text-[var(--money-income)]");
    }
  });

  it("does not touch the part names or swatches", () => {
    render(<ProgressBar segments={PARTS} max={100} aria-label="x" legend legendTone="expense" />);
    const row = document.querySelector('[data-part="legend"] li')!;
    expect(row.children[0].className).toContain("bg-[var(--chart-1)]");
    expect(row.children[1].className).toContain("text-[var(--text-secondary)]");
  });
});
