import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  type ChartConfig,
} from "../chart";

/**
 * The chart shell's three consumer-facing defects (module audit 2026-09-22 §7).
 *
 * `ResponsiveContainer` measures its parent with a `ResizeObserver` and renders nothing
 * until it reports a non-zero box — which in jsdom it never does. That would hide the
 * tooltip and the legend from every assertion below, so it is replaced here by a plain
 * div. Nothing in this file is testing recharts' layout; it is testing what the kit
 * puts inside it.
 */
vi.mock("recharts", async () => {
  const { createElement } = await import("react");
  return {
    Legend: () => null,
    Tooltip: () => null,
    ResponsiveContainer: ({ children }: { children: ReactNode }) =>
      createElement("div", null, children),
  };
});

const CONFIG: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
};

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
});

function styleOf(container: HTMLElement): string {
  return container.querySelector("style")?.textContent ?? "";
}

describe("ChartStyle", () => {
  it("writes the well-formed entries as scoped custom properties", () => {
    const { container } = render(
      <ChartContainer id="ok" config={CONFIG}>
        <div />
      </ChartContainer>,
    );
    expect(styleOf(container)).toContain("--color-revenue: var(--chart-1);");
  });

  it("cannot be made to close its own rule by a config KEY", () => {
    // kastlan builds its ChartConfig from category rows in its database, so these keys
    // are user data reaching a <style> through dangerouslySetInnerHTML. A key holding a
    // brace ends the rule and everything after it is a NEW rule, applying to the whole
    // document rather than this one chart.
    const { container } = render(
      <ChartContainer
        id="inj"
        config={{
          ...CONFIG,
          "x} html { display: none } .y": { label: "Evil", color: "#ff0000" },
        }}
      >
        <div />
      </ChartContainer>,
    );
    const css = styleOf(container);
    expect(css).toContain("--color-revenue: var(--chart-1);");
    expect(css).not.toContain("display: none");
    // One rule in, one rule out: exactly one brace pair, and it is the kit's own.
    expect(css.match(/[{}]/g)).toEqual(["{", "}"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("x} html { display: none } .y"));
  });

  it("cannot be made to add a declaration by a config COLOUR", () => {
    const { container } = render(
      <ChartContainer
        id="col"
        config={{
          ...CONFIG,
          evil: { label: "Evil", color: "#fff; position: fixed; inset: 0" },
        }}
      >
        <div />
      </ChartContainer>,
    );
    const css = styleOf(container);
    expect(css).toContain("--color-revenue: var(--chart-1);");
    expect(css).not.toContain("position: fixed");
    expect(css).not.toContain("--color-evil");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("evil"));
  });

  it("keeps every colour form a palette actually produces", () => {
    const { container } = render(
      <ChartContainer
        id="forms"
        config={{
          a: { label: "a", color: "#abc" },
          b: { label: "b", color: "#aabbcc" },
          c: { label: "c", color: "rgb(1, 2, 3)" },
          d: { label: "d", color: "rgba(1, 2, 3, 0.5)" },
          e: { label: "e", color: "hsl(210 40% 50%)" },
          f: { label: "f", color: "var(--chart-9)" },
        }}
      >
        <div />
      </ChartContainer>,
    );
    const css = styleOf(container);
    for (const key of ["a", "b", "c", "d", "e", "f"]) {
      expect(css).toContain(`--color-${key}:`);
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it("gives the rule a selector even when the consumer's id is not an identifier", () => {
    // `[data-chart=…]` is an UNQUOTED attribute selector, so the id has to be a CSS
    // identifier or the whole rule is discarded by the parser and the chart loses its
    // colours — silently, because an invalid rule is not an error anywhere.
    const { container } = render(
      <ChartContainer id="my chart #1" config={CONFIG}>
        <div />
      </ChartContainer>,
    );
    const css = styleOf(container);
    const selector = css.slice(0, css.indexOf("{")).trim();
    expect(selector).toMatch(/^\[data-chart=[A-Za-z0-9_-]+\]$/);
    // …and the attribute it selects on is the one actually rendered.
    const id = selector.slice("[data-chart=".length, -1);
    expect(container.querySelector(`[data-chart="${id}"]`)).not.toBeNull();
  });
});

describe("ChartTooltipContent", () => {
  const sparse = [
    { dataKey: "revenue", value: 120 },
    { dataKey: "projected" },
    { dataKey: "target", value: null as unknown as undefined },
  ];

  it("does not print a zero for a value that is not in the data", () => {
    // A gap, a projection that has not happened yet, a field that did not exist at an
    // earlier capture: all three arrive as a missing value, and all three used to read
    // as a confident "0" — a number the series never contained.
    render(
      <ChartContainer id="tip" config={CONFIG}>
        <ChartTooltipContent active payload={sparse} label="March" />
      </ChartContainer>,
    );
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("hands formatValue the missing value rather than a substitute", () => {
    const formatValue = vi.fn((v: number | undefined) => (v == null ? "no data" : `£${v}`));
    render(
      <ChartContainer id="tipfmt" config={CONFIG}>
        <ChartTooltipContent active payload={sparse} formatValue={formatValue} />
      </ChartContainer>,
    );
    expect(formatValue).toHaveBeenCalledWith(120);
    expect(formatValue).toHaveBeenCalledWith(undefined);
    expect(screen.getByText("£120")).toBeInTheDocument();
    expect(screen.getAllByText("no data")).toHaveLength(2);
  });

  it("never asks valueFormatter to format a value that is not there", () => {
    // The narrow prop is the one three apps already pass, as `(v) => money(v)`. It is
    // only ever called with a real number, so those call sites keep compiling AND stop
    // being handed a fabricated 0 to format.
    const valueFormatter = vi.fn((v: number) => `£${v}`);
    render(
      <ChartContainer id="tipnarrow" config={CONFIG}>
        <ChartTooltipContent active payload={sparse} valueFormatter={valueFormatter} />
      </ChartContainer>,
    );
    expect(valueFormatter).toHaveBeenCalledTimes(1);
    expect(valueFormatter).toHaveBeenCalledWith(120);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});

describe("ChartLegendContent", () => {
  const payload = [{ dataKey: "revenue" }, { dataKey: "cost" }];

  it("renders nothing focusable when there is nothing to click", () => {
    // Every legend in kastlan is a plain legend. Each series was a <button> with no
    // handler, so a keyboard user paid N tab stops per chart for N no-ops.
    render(
      <ChartContainer id="leg" config={CONFIG}>
        <ChartLegendContent payload={payload} />
      </ChartContainer>,
    );
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("is still a real control when it is interactive", () => {
    const onItemClick = vi.fn();
    render(
      <ChartContainer id="leg2" config={CONFIG}>
        <ChartLegendContent payload={payload} onItemClick={onItemClick} />
      </ChartContainer>,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(onItemClick).toHaveBeenCalledWith("revenue");
  });

  it("in toggle mode, each entry reports whether its series is shown", () => {
    render(
      <ChartContainer id="leg3" config={CONFIG}>
        <ChartLegendContent payload={payload} onItemClick={() => {}} hiddenKeys={["revenue"]} />
      </ChartContainer>,
    );
    const [revenue, other] = screen.getAllByRole("button");
    // Off: not pressed, drawn struck through. On: pressed.
    expect(revenue).toHaveAttribute("aria-pressed", "false");
    expect(revenue.querySelector(".line-through")).not.toBeNull();
    expect(other).toHaveAttribute("aria-pressed", "true");
  });

  it("claims no pressed state it does not know", () => {
    render(
      <ChartContainer id="leg4" config={CONFIG}>
        <ChartLegendContent payload={payload} onItemClick={() => {}} />
      </ChartContainer>,
    );
    for (const b of screen.getAllByRole("button")) expect(b).not.toHaveAttribute("aria-pressed");
  });
});
