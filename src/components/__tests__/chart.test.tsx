import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
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
const tooltipProps = vi.hoisted(() => ({ last: null as Record<string, unknown> | null }));

vi.mock("recharts", async () => {
  const { createElement } = await import("react");
  return {
    Legend: () => null,
    // Records what `ChartTooltip` hands recharts, so its defaults can be asserted.
    Tooltip: (props: Record<string, unknown>) => {
      tooltipProps.last = props;
      return null;
    },
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

/** A legend entry's swatch colour, as jsdom normalised it. A key entry is one <span>
 *  holding the swatch and the label text. */
const swatchOf = (text: string) =>
  (screen.getByText(text).querySelector("span[style]") as HTMLElement).style.backgroundColor;

describe("the key shows the colour the series is painted with", () => {
  // Both entries below are refused by ChartStyle — one for its key, one for its colour —
  // so neither gets a `--color-…` and neither is painted in its configured colour. The
  // swatch used to show that colour anyway: a key promising red for a series drawn in
  // recharts' own colour.
  const REFUSING: ChartConfig = {
    revenue: { label: "Revenue", color: "#00ff00" },
    "bad key": { label: "Bad key", color: "#ff0000" },
    badColour: { label: "Bad colour", color: "#f00; x: y" },
  };

  it("in the legend", () => {
    render(
      <ChartContainer id="legcol" config={REFUSING}>
        <ChartLegendContent
          payload={[
            { dataKey: "revenue", color: "#0000ff" },
            { dataKey: "bad key", color: "#0000ff" },
            { dataKey: "badColour", color: "#0000ff" },
          ]}
        />
      </ChartContainer>,
    );
    expect(swatchOf("Revenue")).toBe("rgb(0, 255, 0)");
    expect(swatchOf("Bad key")).toBe("rgb(0, 0, 255)");
    expect(swatchOf("Bad colour")).toBe("rgb(0, 0, 255)");
  });

  it("in the tooltip", () => {
    render(
      <ChartContainer id="tipcol" config={REFUSING}>
        <ChartTooltipContent
          active
          payload={[
            { dataKey: "revenue", value: 1, color: "#0000ff" },
            { dataKey: "bad key", value: 2, color: "#0000ff" },
            { dataKey: "badColour", value: 3, color: "#0000ff" },
          ]}
        />
      </ChartContainer>,
    );
    const swatch = (text: string) =>
      (screen.getByText(text).parentElement!.querySelector("span[style]") as HTMLElement).style.backgroundColor;
    expect(swatch("Revenue")).toBe("rgb(0, 255, 0)");
    expect(swatch("Bad key")).toBe("rgb(0, 0, 255)");
    expect(swatch("Bad colour")).toBe("rgb(0, 0, 255)");
  });
});

describe("ChartTooltip — the missing-value path runs by default", () => {
  it("keeps null values (recharts' filterNull defaults to true), and a caller can opt back", () => {
    // Under recharts' default the em dash documented on ChartTooltipContent never ran:
    // a series with no value at the cursor was dropped before the content saw it.
    render(<ChartTooltip />);
    expect(tooltipProps.last?.filterNull).toBe(false);
    render(<ChartTooltip filterNull />);
    expect(tooltipProps.last?.filterNull).toBe(true);
  });

  it("still drops series drawn with `hide`, unless recharts says includeHidden", () => {
    // The other half of the filter recharts no longer applies: a legend toggle must
    // still take its series out of the tooltip.
    const payload = [
      { dataKey: "revenue", value: 1 },
      { dataKey: "gone", value: 2, hide: true },
      { dataKey: "gap" },
    ];
    const { unmount } = render(
      <ChartContainer id="tiphide" config={CONFIG}>
        <ChartTooltipContent active payload={payload} />
      </ChartContainer>,
    );
    expect(screen.queryByText("gone")).toBeNull();
    expect(screen.getByText("gap")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    unmount();
    render(
      <ChartContainer id="tiphide2" config={CONFIG}>
        <ChartTooltipContent active payload={payload} includeHidden />
      </ChartContainer>,
    );
    expect(screen.getByText("gone")).toBeInTheDocument();
  });

  it("renders nothing when every entry is hidden", () => {
    const { container } = render(
      <ChartContainer id="tipnone" config={CONFIG}>
        <ChartTooltipContent active payload={[{ dataKey: "revenue", value: 1, hide: true }]} />
      </ChartContainer>,
    );
    expect(container.querySelector(".shadow-xl")).toBeNull();
  });
});

describe("chart shell in RTL", () => {
  it("pins the plot's SVG to ltr, so tick anchoring stays physical", () => {
    const { container } = render(
      <div dir="rtl">
        <ChartContainer id="rtl" config={CONFIG}>
          <div />
        </ChartContainer>
      </div>,
    );
    expect(container.querySelector("[data-chart]")).toHaveClass("[&_.recharts-surface]:[direction:ltr]");
  });

  it("puts the tooltip's value at the logical end", () => {
    render(
      <div dir="rtl">
        <ChartContainer id="rtltip" config={CONFIG}>
          <ChartTooltipContent active payload={[{ dataKey: "revenue", value: 7 }]} />
        </ChartContainer>
      </div>,
    );
    const value = screen.getByText("7");
    expect(value).toHaveClass("ms-auto");
    expect(value).not.toHaveClass("ml-auto");
  });

  it("reads an RTL scroller's scrollLeft from its right edge when deciding to flip", () => {
    // 1000px of chart in a 400px RTL scroller, scrolled fully to its START (the right
    // end): scrollLeft 0, and the visible window is x 600…1000. A cursor at x 700 is
    // 100px into it, so the tooltip fits to its right. Read as LTR, 700 - 0 is past the
    // edge and it flipped for no reason.
    const scroller = document.createElement("div");
    scroller.setAttribute("dir", "rtl");
    Object.defineProperties(scroller, {
      scrollLeft: { value: 0 },
      scrollWidth: { value: 1000 },
      clientWidth: { value: 400 },
    });
    document.body.appendChild(scroller);
    const ref = { current: scroller };
    const { container } = render(
      <ChartContainer id="rtlflip" config={CONFIG}>
        <ChartTooltipContent
          active
          payload={[{ dataKey: "revenue", value: 7 }]}
          boundaryRef={ref}
          coordinate={{ x: 700 }}
        />
      </ChartContainer>,
      { container: scroller },
    );
    const tip = container.querySelector(".shadow-xl") as HTMLElement;
    expect(tip.style.transform).toBe("translateX(12px)");
    scroller.remove();
  });
});
