import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Treemap, type TreemapNode } from "../treemap";
import { lerpHex, textOn } from "../../theme/chart-palette";

/**
 * A group's `labelColor` and a shaded tile (0.52 code review of treemap.tsx, finding 5).
 * `shade` turns the tile's colour into another hex, measured like any other — but an ink
 * the GROUP chose for its own fill still came along, and white ink went on a tile shaded
 * almost to the card (~1.3:1). Real recharts at 800x300.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("style");
});

const CARD = "#f6ecd9";
const HUE = "#332288";

const DATA: TreemapNode[] = [
  {
    id: "g",
    name: "Group",
    value: 30,
    fill: HUE,
    labelColor: "#ffffff",
    children: [
      { id: "full", name: "Full hue", value: 15 },
      { id: "pale", name: "Pale", value: 10, shade: 0.2 },
      { id: "own", name: "Own ink", value: 5, shade: 0.2, labelColor: "#000000" },
    ],
  },
];

function ink(container: HTMLElement, start: string): string | null {
  const g = [...container.querySelectorAll("[aria-label]")].find((el) =>
    el.getAttribute("aria-label")!.startsWith(`${start}:`),
  )!;
  return g.querySelector("text")!.getAttribute("fill");
}

describe("Treemap: the ink of a shaded tile", () => {
  it("measures a shaded tile instead of taking its group's labelColor", () => {
    document.documentElement.style.setProperty("--bg-surface", CARD);
    const { container } = render(<Treemap data={DATA} />);
    expect(ink(container, "Pale")).toBe(textOn(lerpHex(CARD, HUE, 0.2)));
  });

  it("keeps the group's labelColor on a tile drawn in the group's own fill", () => {
    document.documentElement.style.setProperty("--bg-surface", CARD);
    const { container } = render(<Treemap data={DATA} />);
    expect(ink(container, "Full hue")).toBe("#ffffff");
  });

  it("keeps a tile's own labelColor, shaded or not", () => {
    document.documentElement.style.setProperty("--bg-surface", CARD);
    const { container } = render(<Treemap data={DATA} />);
    expect(ink(container, "Own ink")).toBe("#000000");
  });
});
