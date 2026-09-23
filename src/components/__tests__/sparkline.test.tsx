import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline, DEFAULT_SPARKLINE_LABELS, sparklineSummary } from "../sparkline";
import { UiKitProvider } from "../../i18n/kit-labels";

const fmt = (v: number) => String(v);

/** The drawn line paths (not the reference line, not the last-point dot). */
const lines = (svg: Element) =>
  [...svg.querySelectorAll("path")].filter(
    (p) => p.getAttribute("fill") === "none" && !p.hasAttribute("stroke-dasharray") && !p.hasAttribute("data-sparkline-last"),
  );

/** The y coordinates of a path's `M`/`L` commands. */
const ys = (d: string) => [...d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => Number(m[2]));

describe("sparklineSummary", () => {
  it("says which way the series went, from its first value to its last", () => {
    expect(sparklineSummary([12, 30, 40], DEFAULT_SPARKLINE_LABELS, fmt)).toBe("Rising from 12 to 40");
    expect(sparklineSummary([40, 50, 12], DEFAULT_SPARKLINE_LABELS, fmt)).toBe("Falling from 40 to 12");
    expect(sparklineSummary([5, 9, 5], DEFAULT_SPARKLINE_LABELS, fmt)).toBe("Unchanged at 5");
  });

  it("skips gaps when finding the ends", () => {
    expect(sparklineSummary([null, 3, null, 7, undefined], DEFAULT_SPARKLINE_LABELS, fmt)).toBe(
      "Rising from 3 to 7",
    );
  });

  it("does not call one value, or none, a trend", () => {
    expect(sparklineSummary([null, 4], DEFAULT_SPARKLINE_LABELS, fmt)).toBe("One value: 4");
    expect(sparklineSummary([], DEFAULT_SPARKLINE_LABELS, fmt)).toBe("No data");
    expect(sparklineSummary([null, Number.NaN], DEFAULT_SPARKLINE_LABELS, fmt)).toBe("No data");
  });
});

describe("Sparkline", () => {
  it("is an image named by its summary, prefixed with the series name", () => {
    render(<Sparkline data={[12, 20, 40]} label="Price" locale="en" />);
    expect(screen.getByRole("img", { name: "Price: Rising from 12 to 40" })).toBeInTheDocument();
  });

  it("formats the spoken values in the kit's locale", () => {
    render(
      <UiKitProvider locale="de-DE">
        <Sparkline data={[1234.5, 2000]} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("Rising from 1.234,5 to 2.000");
  });

  it("takes its words from the provider, and a prop over the provider", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ sparkline: { rising: (a, b) => `Steigend von ${a} auf ${b}` } }}>
        <Sparkline data={[1, 2]} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("Steigend von 1 auf 2");
    rerender(
      <UiKitProvider labels={{ sparkline: { rising: () => "provider" } }}>
        <Sparkline data={[1, 2]} labels={{ rising: () => "prop" }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("prop");
  });

  it("an explicit aria-label wins over the generated summary", () => {
    render(<Sparkline data={[1, 2]} aria-label="Custom" />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Custom");
  });

  it("uses a tight scale by default, so a small move is not flattened (dev#449)", () => {
    const { container } = render(<Sparkline data={[9.75, 12.4]} height={24} highlightLast={false} strokeWidth={2} />);
    const [path] = lines(container.querySelector("svg")!);
    const [a, b] = ys(path.getAttribute("d")!);
    // Bottom edge to top edge, minus the stroke's half-width of padding.
    expect(a).toBe(23);
    expect(b).toBe(1);
  });

  it("honours an explicit min/max", () => {
    const { container } = render(
      <Sparkline data={[5, 5]} min={0} max={10} height={24} highlightLast={false} strokeWidth={2} />,
    );
    const [path] = lines(container.querySelector("svg")!);
    expect(ys(path.getAttribute("d")!)).toEqual([12, 12]);
  });

  it("breaks the line at a gap instead of bridging it", () => {
    const { container } = render(<Sparkline data={[1, 2, null, 3, 4]} highlightLast={false} />);
    expect(lines(container.querySelector("svg")!)).toHaveLength(2);
  });

  it("still draws a point isolated between two gaps", () => {
    const { container } = render(<Sparkline data={[1, 2, null, 3, null, 4, 5]} highlightLast={false} />);
    const paths = lines(container.querySelector("svg")!);
    expect(paths).toHaveLength(3);
    expect(paths[1].getAttribute("d")).toMatch(/h0$/);
  });

  it("marks the last DEFINED point", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, null]} />);
    expect(container.querySelectorAll("[data-sparkline-last]")).toHaveLength(1);
  });

  it("draws one bar per value, zero-based, with the money trio under `signed`", () => {
    const { container } = render(<Sparkline data={[3, -2, null, 5]} variant="bar" tone="signed" />);
    const bars = container.querySelectorAll("rect");
    expect(bars).toHaveLength(3);
    expect(bars[0].getAttribute("class")).toContain("--money-income");
    expect(bars[1].getAttribute("class")).toContain("--money-expense");
  });

  it("closes an area under the line", () => {
    const { container } = render(<Sparkline data={[1, 3, 2]} variant="area" />);
    expect([...container.querySelectorAll("path")].some((p) => p.getAttribute("d")?.endsWith("Z"))).toBe(true);
  });

  it("draws a reference line and pulls it into the scale", () => {
    const { container } = render(<Sparkline data={[4, 8]} referenceValue={0} />);
    expect(container.querySelector("path[stroke-dasharray]")).not.toBeNull();
  });

  it("stretches under `fluid` without distorting its strokes", () => {
    const { container } = render(<Sparkline data={[1, 2]} fluid />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("100%");
    for (const p of svg.querySelectorAll("path")) {
      if (p.getAttribute("stroke") === "currentColor") {
        expect(p.getAttribute("vector-effect")).toBe("non-scaling-stroke");
      }
    }
  });
});
