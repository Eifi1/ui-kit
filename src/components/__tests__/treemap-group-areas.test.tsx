import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { Treemap, type TreemapNode } from "../treemap";

/**
 * A tile's area is its share of the picture, in a group or not (0.52 code review of
 * treemap.tsx, finding 1). The groups' frames first took their band and margin out of
 * each group's rectangle and squeezed the tiles into what was left — a fixed 23px out of
 * a group's height is a different share of every group, so a €100 tile in a small group
 * was drawn at two thirds of a €100 tile in a large one. Real recharts at 800x300.
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
  vi.restoreAllMocks();
});

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectOf(start: string, container: HTMLElement): Rect {
  const g = [...container.querySelectorAll("[aria-label]")].find((el) =>
    el.getAttribute("aria-label")!.startsWith(`${start}:`),
  );
  expect(g, start).toBeDefined();
  const rect = g!.querySelector("rect")!;
  const n = (a: string) => Number(rect.getAttribute(a));
  return { x: n("x"), y: n("y"), width: n("width"), height: n("height") };
}

const area = (r: Rect) => r.width * r.height;
/** Within what drawing on whole pixels costs: half a pixel along each edge. */
function expectSameArea(a: Rect, b: Rect, what: string) {
  const slack = (a.width + a.height + b.width + b.height) / 2;
  expect(Math.abs(area(a) - area(b)), `${what}: ${area(a)} against ${area(b)}`).toBeLessThanOrEqual(slack);
}

// Three tiles of 100: one in a large group, one in a small one, one at the top.
const DATA: TreemapNode[] = [
  {
    id: "big",
    name: "Big",
    value: 1600,
    children: [
      { id: "b1", name: "Big one", value: 100 },
      { id: "b2", name: "Big two", value: 900 },
      { id: "b3", name: "Big three", value: 600 },
    ],
  },
  {
    id: "small",
    name: "Small",
    value: 220,
    children: [
      { id: "s1", name: "Small one", value: 100 },
      { id: "s2", name: "Small two", value: 120 },
    ],
  },
  { id: "top", name: "Top one", value: 100 },
];

describe("Treemap with groups: areas", () => {
  it("draws equal values at equal areas, whichever group they are in", () => {
    const { container } = render(<Treemap data={DATA} />);
    const top = rectOf("Top one", container);
    expectSameArea(rectOf("Big one", container), top, "Big one against Top one");
    expectSameArea(rectOf("Small one", container), top, "Small one against Top one");
  });

  it("keeps the proportion inside a group too", () => {
    const { container } = render(<Treemap data={DATA} />);
    const one = area(rectOf("Big one", container));
    expect(area(rectOf("Big two", container)) / one).toBeCloseTo(9, 0);
  });

  it("stands the tooltip at the hovered tile as it is drawn, not where recharts laid it", () => {
    // recharts places the bubble only once it has measured it; jsdom measures nothing.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 120, height: 40 }),
    );
    const { container } = render(<Treemap data={DATA} />);
    const tile = [...container.querySelectorAll("[aria-label]")].find((el) =>
      el.getAttribute("aria-label")!.startsWith("Small one:"),
    )!;
    fireEvent.mouseEnter(tile);
    const r = rectOf("Small one", container);
    const wrapper = container.querySelector<HTMLElement>(".recharts-tooltip-wrapper")!;
    const [x, y] = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(wrapper.style.transform)!.slice(1).map(Number);
    // The bubble's corner sits at the tile's centre, 10px off it.
    expect(Math.abs(x! - (r.x + r.width / 2))).toBe(10);
    expect(Math.abs(y! - (r.y + r.height / 2))).toBe(10);
  });
});
