import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { SeriesChart } from "../series-chart";
import { TreemapCell } from "../treemap";
import { resolveChartColor } from "../chart-edge";
import { CHART_ROLES, EDGE_MIN_CONTRAST, PALETTE_HEX, chartShade, paletteFor } from "../../theme/chart-palette";
import { contrast } from "../../theme/color";
import { DEFAULT_PRESET, applyTokenSet } from "../../theme/palette-presets";

/**
 * 0.49 (Marcel via keksdose, anyplot.ai/palette): a FILLED mark whose hue sits under
 * 3:1 against the ground (WCAG 1.4.11) gets an edge — and a hue that clears it stays bare.
 * Treemap's tiles take a 1px ink edge; SeriesChart's bars and areas, since 0.55, their own
 * shade that clears the rule (`chartShade`), where the ink read as a black line on an
 * area. Real recharts at a fixed 800x300, as in `series-chart.test.tsx`.
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

function bars(series: { key: string; color?: string; strokeWidth?: number }[], type: "bar" | "area" = "bar") {
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

/** More contrast, as the setting (or System on such a device) puts it on <html>. */
function moreContrast(on: boolean) {
  if (on) root.setAttribute("data-contrast", "more");
  else root.removeAttribute("data-contrast");
}

/** The card and the page, as painted. */
const grounds = () => {
  const style = getComputedStyle(root);
  return ["--bg-surface", "--bg-page"].map((name) => style.getPropertyValue(name).trim());
};

/** The edge a mark in ramp slot `i` takes on the page as painted: its own shade that
 *  clears 3:1 on both grounds (0.55) — checked here with the kit's contrast measure. */
function shadeOf(i: number): string {
  const hex = resolveChartColor(paletteFor(i), getComputedStyle(root))!;
  const shade = chartShade(hex, grounds())!;
  expect(shade).not.toBe(hex);
  for (const ground of grounds()) expect(contrast(shade, ground)).toBeGreaterThanOrEqual(EDGE_MIN_CONTRAST);
  return shade;
}

describe("SeriesChart's edge (under More contrast): the mark's own shade", () => {
  afterEach(() => moreContrast(false));

  it("edges a bar in a low-contrast hue and leaves a high-contrast one bare (light)", () => {
    paint("light");
    moreContrast(true);
    // Slot 1 green (2.69:1 on the page), slot 3 blue (4.4:1), slot 6 cyan (1.8:1).
    const { container } = bars([
      { key: "a", color: paletteFor(0) },
      { key: "b", color: paletteFor(2) },
      { key: "c", color: paletteFor(5) },
    ]);
    expect(barStrokes(container)).toEqual([shadeOf(0), null, shadeOf(5)]);
  });

  it("follows the ground: on the dark theme red is edged and cyan is not", () => {
    paint("dark");
    moreContrast(true);
    const { container } = bars([
      { key: "a", color: paletteFor(4) },
      { key: "b", color: paletteFor(5) },
    ]);
    expect(barStrokes(container)).toEqual([shadeOf(4), null]);
  });

  it("re-measures when the theme flips under a mounted chart", async () => {
    paint("light");
    moreContrast(true);
    const { container } = bars([{ key: "a", color: paletteFor(4) }]);
    expect(barStrokes(container)).toEqual([null]);
    await act(async () => paint("dark"));
    expect(barStrokes(container)).toEqual([shadeOf(4)]);
  });

  it("draws a bar's edge thin, 1px, and never in ink", () => {
    paint("light");
    moreContrast(true);
    const { container } = bars([{ key: "a", color: paletteFor(7) }]);
    const bar = container.querySelector(".recharts-bar-rectangle path")!;
    expect(bar.getAttribute("stroke")).toBe(shadeOf(7));
    expect(bar.getAttribute("stroke-width")).toBe("1");
    expect(bar.getAttribute("fill")).toBe("var(--color-a)");
  });

  // Refactor audit 2026-10-30, DSP-18: the edge swapped the area's 2px outline in its own
  // hue for 1px of ink, and ignored the series' `strokeWidth`. 0.52 kept the width and the
  // ink; 0.55 keeps the width and draws the line in the area's own shade.
  it("draws an area's outline in its own shade at the area's own width, keeping the hue on its fill", () => {
    paint("light");
    moreContrast(true);
    const { container } = bars([{ key: "a", color: paletteFor(5) }], "area");
    const curve = container.querySelector(".recharts-area-curve")!;
    expect(curve.getAttribute("stroke")).toBe(shadeOf(5));
    expect(curve.getAttribute("stroke-width")).toBe("2");
    expect(container.querySelector(".recharts-area-area")!.getAttribute("fill")).toBe("var(--color-a)");
    cleanup();
    const wide = bars([{ key: "a", color: paletteFor(5), strokeWidth: 3 }], "area");
    expect(wide.container.querySelector(".recharts-area-curve")!.getAttribute("stroke-width")).toBe("3");
  });

  it("leaves a mark alone when nothing is measurable (no tokens on the page)", () => {
    moreContrast(true);
    const { container } = bars([{ key: "a" }]);
    expect(barStrokes(container)).toEqual([null]);
  });
});

// Refactor audit 2026-10-30, DSP-18 (Marcel's decision 3): the bars and areas follow the
// tiles' `edges="auto"` rule of 0.51.6 (#642) — at Standard contrast no mark gets the ink
// edge, which in light fell on 5 of 8 hues and in dark on chart-5 and chart-7 alone.
describe("SeriesChart's marks at Standard contrast", () => {
  afterEach(() => moreContrast(false));

  it("draws no ink edge on any bar, in either theme", () => {
    for (const mode of ["light", "dark"] as const) {
      paint(mode);
      const { container, unmount } = bars(PALETTE_HEX[mode].map((_, i) => ({ key: `s${i}`, color: paletteFor(i) })));
      expect(barStrokes(container).every((stroke) => stroke === null)).toBe(true);
      unmount();
    }
  });

  it("keeps an area's outline in its own hue", () => {
    paint("light");
    const { container } = bars([{ key: "a", color: paletteFor(5) }], "area");
    const curve = container.querySelector(".recharts-area-curve")!;
    expect(curve.getAttribute("stroke")).toBe("var(--color-a)");
    expect(curve.getAttribute("stroke-width")).toBe("2");
  });

  it("follows the contrast setting live", async () => {
    paint("light");
    const { container } = bars([{ key: "a", color: paletteFor(5) }]);
    expect(barStrokes(container)).toEqual([null]);
    // A MutationObserver reports in a microtask: let it.
    await act(async () => moreContrast(true));
    expect(barStrokes(container)).toEqual([shadeOf(5)]);
    await act(async () => moreContrast(false));
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

  it("0.51.6 `auto` (the default): one page-coloured gutter at Standard contrast, the ink edges under More", async () => {
    paint("dark");
    const lime = PALETTE_HEX.dark[7];
    const { container } = render(
      <svg>
        <TreemapCell depth={1} x={0} y={0} width={200} height={60} name="Tile" fill={lime} />
      </svg>,
    );
    // Standard: no per-tile edge, the same gutter as every tile.
    expect(container.querySelector("rect[data-edge]")).toBeNull();
    expect(container.querySelector("rect")!.getAttribute("stroke")).toBe("var(--bg-page)");
    // More contrast switched on (by the reader, or by System on such a device): live.
    // A MutationObserver reports in a microtask: let it.
    await act(async () => document.documentElement.setAttribute("data-contrast", "more"));
    expect(container.querySelector("rect")!.getAttribute("stroke")).toBe("var(--bg-surface)");
    await act(async () => document.documentElement.setAttribute("data-contrast", "standard"));
    expect(container.querySelector("rect")!.getAttribute("stroke")).toBe("var(--bg-page)");
    document.documentElement.removeAttribute("data-contrast");
  });

  it("0.51.6 `uniform` stays uniform under More contrast", () => {
    paint("dark");
    document.documentElement.setAttribute("data-contrast", "more");
    try {
      for (const hex of PALETTE_HEX.dark) {
        const { container } = render(
          <svg>
            <TreemapCell depth={1} x={0} y={0} width={200} height={60} name="Tile" fill={hex} edges="uniform" />
          </svg>,
        );
        expect(container.querySelector("rect[data-edge]")).toBeNull();
        expect(container.querySelector("rect")!.getAttribute("stroke")).toBe("var(--bg-page)");
      }
    } finally {
      document.documentElement.removeAttribute("data-contrast");
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
