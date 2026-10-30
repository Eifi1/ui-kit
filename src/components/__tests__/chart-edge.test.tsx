import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { SeriesChart } from "../series-chart";
import { TreemapCell } from "../treemap";
import { resolveChartColor } from "../chart-edge";
import { CHART_ROLES, PALETTE_HEX, paletteFor } from "../../theme/chart-palette";
import { DEFAULT_PRESET, applyTokenSet } from "../../theme/palette-presets";

/**
 * 0.49 (Marcel via keksdose, anyplot.ai/palette): a FILLED mark whose hue sits under
 * 3:1 against the ground (WCAG 1.4.11) gets a 1px ink edge — SeriesChart's bars and
 * areas, Treemap's tiles — and a hue that clears it stays bare. Real recharts at a fixed
 * 800x300, as in `series-chart.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const root = document.documentElement;

function paint(mode: "light" | "dark") {
  root.classList.toggle("dark", mode === "dark");
  applyTokenSet(root, DEFAULT_PRESET[mode]);
  root.style.setProperty("--chart-ink", mode === "dark" ? "#f0efe8" : "#1a1a17");
  root.style.setProperty("--chart-muted", mode === "dark" ? "#a8a79f" : "#6b6a63");
}

afterEach(() => {
  cleanup();
  root.removeAttribute("style");
  root.classList.remove("dark");
});

const ROWS = [
  { m: "Jan", a: 3, b: 5, c: 2 },
  { m: "Feb", a: 4, b: 2, c: 6 },
];

function bars(series: { key: string; color?: string }[], type: "bar" | "area" = "bar") {
  return render(
    <SeriesChart
      rows={ROWS}
      x={{ type: "category", key: "m" }}
      series={series.map((s) => ({ ...s, label: s.key, type }))}
    />,
  );
}

const barStrokes = (container: HTMLElement) =>
  [...container.querySelectorAll(".recharts-bar")].map(
    (g) => g.querySelector(".recharts-bar-rectangle path")?.getAttribute("stroke") ?? null,
  );

describe("SeriesChart's ink edge", () => {
  it("edges a bar in a low-contrast hue and leaves a high-contrast one bare (light)", () => {
    paint("light");
    // Slot 1 green (2.69:1 on the page), slot 3 blue (4.4:1), slot 6 cyan (1.8:1).
    const { container } = bars([
      { key: "a", color: paletteFor(0) },
      { key: "b", color: paletteFor(2) },
      { key: "c", color: paletteFor(5) },
    ]);
    expect(barStrokes(container)).toEqual(["var(--chart-ink)", null, "var(--chart-ink)"]);
  });

  it("follows the ground: on the dark theme red is edged and cyan is not", () => {
    paint("dark");
    const { container } = bars([
      { key: "a", color: paletteFor(4) },
      { key: "b", color: paletteFor(5) },
    ]);
    expect(barStrokes(container)).toEqual(["var(--chart-ink)", null]);
  });

  it("re-measures when the theme flips under a mounted chart", async () => {
    paint("light");
    const { container } = bars([{ key: "a", color: paletteFor(4) }]);
    expect(barStrokes(container)).toEqual([null]);
    await act(async () => paint("dark"));
    expect(barStrokes(container)).toEqual(["var(--chart-ink)"]);
  });

  it("draws an area's outline in ink, keeping the hue on its fill", () => {
    paint("light");
    const { container } = bars([{ key: "a", color: paletteFor(5) }], "area");
    const curve = container.querySelector(".recharts-area-curve")!;
    expect(curve.getAttribute("stroke")).toBe("var(--chart-ink)");
    expect(curve.getAttribute("stroke-width")).toBe("1");
    expect(container.querySelector(".recharts-area-area")!.getAttribute("fill")).toBe("var(--color-a)");
  });

  it("leaves a mark alone when nothing is measurable (no tokens on the page)", () => {
    const { container } = bars([{ key: "a" }]);
    expect(barStrokes(container)).toEqual([null]);
  });
});

describe("TreemapCell's ink edge", () => {
  const cell = (fill: string, edges: "contrast" | "uniform" = "contrast") =>
    render(
      <svg>
        <TreemapCell depth={1} x={0} y={0} width={200} height={60} name="Tile" fill={fill} edges={edges} />
      </svg>,
    ).container.querySelector("rect[data-edge]");

  it('edges a tile in a low-contrast hue only, under `edges="contrast"`', () => {
    paint("light");
    expect(cell(PALETTE_HEX.light[7])?.getAttribute("stroke")).toBe("var(--chart-ink)"); // lime
    expect(cell(PALETTE_HEX.light[4])).toBeNull(); // matte red, 5:1
  });

  it("0.51.6 `uniform` (the default): no per-tile edge, one page-coloured gutter on every tile", () => {
    paint("dark");
    const tiles = PALETTE_HEX.dark.map((hex) => {
      const { container } = render(
        <svg>
          <TreemapCell depth={1} x={0} y={0} width={200} height={60} name="Tile" fill={hex} />
        </svg>,
      );
      return container;
    });
    for (const tile of tiles) {
      expect(tile.querySelector("rect[data-edge]")).toBeNull();
      expect(tile.querySelector("rect")!.getAttribute("stroke")).toBe("var(--bg-page)");
    }
  });

  it("measures the muted 'rest' colour, so its label ink is measured too", () => {
    paint("light");
    const { container } = render(
      <svg>
        <TreemapCell depth={1} x={0} y={0} width={200} height={60} name="Rest" fill={CHART_ROLES.other} />
      </svg>,
    );
    // #6b6a63 is dark enough for the light ink; `currentColor` would mean "unmeasured".
    expect(container.querySelector("text")!.getAttribute("fill")).toBe("#f8fafc");
  });
});

describe("resolveChartColor", () => {
  const style = {
    getPropertyValue: (n: string) => ({ "--chart-1": " #009e73 ", "--x": "oklch(0.5 0.1 120)" })[n] ?? "",
  };
  it("reads a hex, a bare token, and refuses what it cannot measure", () => {
    expect(resolveChartColor("#abc", style)).toBe("#abc");
    expect(resolveChartColor("var(--chart-1)", style)).toBe("#009e73");
    expect(resolveChartColor("var(--x)", style)).toBeNull();
    expect(resolveChartColor("var(--chart-1, red)", style)).toBeNull();
    expect(resolveChartColor("color-mix(in srgb, red, blue)", style)).toBeNull();
  });
});
