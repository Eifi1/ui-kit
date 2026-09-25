import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  LegendColumn,
  LegendGroup,
  STEP_DASH,
  STROKE_PATTERNS,
  ToggleLegend,
  strokeDash,
  toggleHidden,
  type LegendEntry,
} from "../toggle-legend";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * The legend of switches. Plain buttons, no recharts — so nothing here needs mocking,
 * and every assertion is on what a keyboard or a screen reader meets.
 */

const ENTRIES: LegendEntry[] = [
  { key: "x", label: "X", color: "var(--chart-1)" },
  { key: "y", label: "Y", color: "var(--chart-2)" },
  { key: "z", label: "Z", color: "var(--chart-3)", marker: "stroke", dash: 2 },
];

/** A legend that owns its hidden set, the way every caller wires it. */
function Controlled({ initial = [] as string[] }) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set(initial));
  return (
    <>
      <ToggleLegend entries={ENTRIES} hidden={hidden} onToggle={(key) => setHidden(toggleHidden(hidden, key))} />
      <output>{[...hidden].sort().join(",")}</output>
    </>
  );
}

const button = (name: string) => screen.getByRole("button", { name });

describe("ToggleLegend", () => {
  it("is a named group of toggle buttons, pressed while the series is on the chart", () => {
    render(<Controlled initial={["y"]} />);
    const group = screen.getByRole("group", { name: "Series" });
    expect(within(group).getAllByRole("button")).toHaveLength(3);
    expect(button("X")).toHaveAttribute("aria-pressed", "true");
    expect(button("Y")).toHaveAttribute("aria-pressed", "false");
  });

  it("switches any number of series off and back on", () => {
    render(<Controlled />);
    fireEvent.click(button("X"));
    fireEvent.click(button("Z"));
    expect(screen.getByRole("status").textContent).toBe("x,z");
    expect(button("X")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button("X"));
    expect(screen.getByRole("status").textContent).toBe("z");
  });

  it("is reachable and operable from the keyboard, being real buttons", () => {
    render(<Controlled />);
    const x = button("X");
    expect(x.tagName).toBe("BUTTON");
    expect(x).toHaveAttribute("type", "button");
    x.focus();
    expect(x).toHaveFocus();
  });

  it("keeps a hidden entry in place, dimmed, with its mark outlined rather than gone", () => {
    const { container } = render(
      <ToggleLegend entries={ENTRIES} hidden={new Set(["x"])} onToggle={() => {}} />,
    );
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["X", "Y", "Z"]);
    expect(button("X")).toHaveClass("opacity-35");
    const swatch = button("X").querySelector("span[aria-hidden]") as HTMLElement;
    expect(swatch.style.backgroundColor).toBe("transparent");
    expect(swatch.style.boxShadow).toContain("var(--chart-1)");
    expect(container.querySelectorAll("svg[aria-hidden]")).toHaveLength(1);
  });

  it("fades a hidden stroke mark once, with its button, not a second time on the line", () => {
    // The line used to carry its own opacity 0.35 inside the button's opacity-35: about
    // 12 % in all, a mark gone rather than dimmed, while a square beside it read at 35 %.
    render(<ToggleLegend entries={ENTRIES} hidden={new Set(["z"])} onToggle={() => {}} />);
    expect(button("Z")).toHaveClass("opacity-35");
    expect(button("Z").querySelector("line")!.hasAttribute("opacity")).toBe(false);
  });

  it("draws a stroke entry in the chart's own dash pattern", () => {
    render(<ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={() => {}} />);
    const line = button("Z").querySelector("line")!;
    expect(line.getAttribute("stroke-dasharray")).toBe(STROKE_PATTERNS[2]);
    expect(line.getAttribute("stroke")).toBe("var(--chart-3)");
  });

  it("calls onToggle with the entry's key", () => {
    const onToggle = vi.fn();
    render(<ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={onToggle} />);
    fireEvent.click(button("Y"));
    expect(onToggle).toHaveBeenCalledWith("y");
  });

  it("draws nothing for a single entry unless asked, since there is nothing to compare", () => {
    const one = ENTRIES.slice(0, 1);
    const { container, rerender } = render(<ToggleLegend entries={one} hidden={new Set()} onToggle={() => {}} />);
    expect(container.firstChild).toBeNull();
    rerender(<ToggleLegend entries={one} hidden={new Set()} onToggle={() => {}} showSingle />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    rerender(<ToggleLegend entries={[]} hidden={new Set()} onToggle={() => {}} showSingle />);
    expect(container.firstChild).toBeNull();
  });

  it("stacks vertically when it stands beside the charts", () => {
    render(<ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={() => {}} orientation="vertical" className="extra" />);
    expect(screen.getByRole("group")).toHaveClass("flex-col", "extra");
    expect(screen.getByRole("group")).not.toHaveClass("mt-2");
  });

  it("takes its group name from the provider, and from its own labels prop over that", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ seriesChart: { legend: "Kanäle" } }}>
        <ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("group", { name: "Kanäle" })).toBeInTheDocument();
    rerender(
      <UiKitProvider labels={{ seriesChart: { legend: "Kanäle" } }}>
        <ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={() => {}} labels={{ legend: "Messungen" }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("group", { name: "Messungen" })).toBeInTheDocument();
  });
});

describe("toggleHidden", () => {
  it("adds a key that was shown and removes one that was hidden", () => {
    expect([...toggleHidden(new Set(), "a")]).toEqual(["a"]);
    expect([...toggleHidden(new Set(["a", "b"]), "a")]).toEqual(["b"]);
  });

  it("returns a NEW set and leaves the one it was given alone", () => {
    const before = new Set(["a"]);
    const after = toggleHidden(before, "b");
    expect(after).not.toBe(before);
    expect([...before]).toEqual(["a"]);
  });
});

describe("strokeDash", () => {
  it("hands out the five draughtsman's patterns in order, solid first", () => {
    expect([0, 1, 2, 3, 4].map(strokeDash)).toEqual([...STROKE_PATTERNS]);
    expect(strokeDash(0)).toBeUndefined();
  });

  it("wraps past the fifth, for negative indices too", () => {
    expect(strokeDash(5)).toBe(STROKE_PATTERNS[0]);
    expect(strokeDash(7)).toBe(STROKE_PATTERNS[2]);
    expect(strokeDash(-1)).toBe(STROKE_PATTERNS[4]);
  });

  it("draws a step line in one of the table's own patterns", () => {
    expect(STROKE_PATTERNS).toContain(strokeDash(STEP_DASH));
    expect(strokeDash(STEP_DASH)).toBeDefined();
  });
});

describe("LegendColumn / LegendGroup", () => {
  it("centres a column of legends and heads a group with its title", () => {
    render(
      <LegendColumn className="w-36">
        <LegendGroup title="Channel">
          <span>entry</span>
        </LegendGroup>
      </LegendColumn>,
    );
    const title = screen.getByText("Channel");
    expect(title.parentElement!.parentElement).toHaveClass("justify-center", "w-36");
    expect(screen.getByText("entry")).toBeInTheDocument();
  });
});

describe("ToggleLegend in RTL", () => {
  it("uses only logical alignment, so entries start at the reading edge", () => {
    render(
      <div dir="rtl">
        <ToggleLegend entries={ENTRIES} hidden={new Set()} onToggle={() => {}} />
      </div>,
    );
    for (const b of screen.getAllByRole("button")) {
      expect(b).toHaveClass("text-start");
      expect(b.className).not.toMatch(/\b(text-left|text-right|ml-|mr-|pl-|pr-)/);
    }
  });
});

describe("ToggleLegend custom dash", () => {
  it("draws a custom stroke-dasharray string as given", () => {
    const { container } = render(
      <ToggleLegend
        showSingle
        entries={[{ key: "p", label: "Projection", color: "#000", marker: "stroke", dash: "4 3" }]}
        hidden={new Set()}
        onToggle={() => {}}
      />,
    );
    expect(container.querySelector("[stroke-dasharray]")?.getAttribute("stroke-dasharray")).toBe("4 3");
  });
});
