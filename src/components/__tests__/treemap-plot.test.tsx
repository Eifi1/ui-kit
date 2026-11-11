import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Treemap, type TreemapNode } from "../treemap";
import { stubDesktop, stubResizeObserver, type ResizeObserverStub } from "../../test/viewport";
import { cssValue } from "../../test/css";

/**
 * The map's own picture (0.55, held back from 0.53's code review): the kit lays the nodes
 * out, draws them as an `<svg>` and stands its own bubble over them, where up to 0.54
 * recharts' `<Treemap>` rendered every cell and the tooltip and the map worked round it.
 *
 * The other suites stand recharts' `ResponsiveContainer` in at 800x300, handing the map
 * its size as recharts 2 did. Here it hands nothing — as recharts 3's does, which keeps
 * its size in a context of its own — so the map is laid out for the box it measures on its
 * own root, through a `ResizeObserver` the test drives.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => children };
});

let ro: ResizeObserverStub;
beforeEach(() => {
  ro = stubResizeObserver();
});
afterEach(() => {
  cleanup();
  ro.restore();
  vi.unstubAllGlobals();
});

const DATA: TreemapNode[] = [
  { id: "rent", name: "Rent", value: 1200 },
  { id: "food", name: "Groceries", value: 600 },
  { id: "fun", name: "Leisure", value: 200 },
];

const GROUPED: TreemapNode[] = [
  {
    id: "home",
    name: "Home",
    value: 1500,
    children: [
      { id: "rent", name: "Rent", value: 1200 },
      { id: "power", name: "Power", value: 300 },
    ],
  },
  { id: "fun", name: "Leisure", value: 500 },
];

/** The map at `width` × `height`, as its root measures. */
function drawn(node: ReactNode, size = { width: 800, height: 300 }) {
  const view = render(node);
  const root = view.container.querySelector<HTMLElement>("[data-chart]")!;
  act(() => ro.resize(root, size));
  return { ...view, root };
}

const named = (start: string) =>
  [...document.querySelectorAll<HTMLElement>("[aria-label]")].find((el) =>
    new RegExp(`^${start}[:,]`).test(el.getAttribute("aria-label")!),
  )!;
const rectOf = (g: Element) => {
  const rect = g.querySelector("rect")!;
  return ["x", "y", "width", "height"].map((a) => Number(rect.getAttribute(a)));
};
const bubble = () => document.querySelector<HTMLElement>(".recharts-tooltip-wrapper");

describe("Treemap's own picture", () => {
  it("is the kit's SVG, with nothing of recharts' chart in it", () => {
    const { root } = drawn(<Treemap data={DATA} />);
    expect(root.querySelectorAll("svg")).toHaveLength(1);
    expect(root.querySelector(".recharts-wrapper, .recharts-surface, .recharts-layer")).toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("draws in the order the keyboard walks: each frame, then the tiles inside it", () => {
    drawn(<Treemap data={GROUPED} />);
    const order = [...document.querySelectorAll("svg [aria-label]")].map((g) => g.getAttribute("aria-label")!);
    expect(order.map((name) => name.split(/[:,]/)[0])).toEqual(["Home", "Rent", "Power", "Leisure"]);
    // The frame first, so its tiles paint over it; none of them inside its element.
    expect(named("Home").querySelectorAll("[aria-label]")).toHaveLength(0);
  });
});

describe("Treemap's box", () => {
  it("draws nothing until its root has a size", () => {
    const { container } = render(<Treemap data={DATA} />);
    expect(container.querySelector("[data-chart]")).not.toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("is laid out for the box its root measures, and again when that box changes", () => {
    const { root } = drawn(<Treemap data={DATA} />);
    expect(root.querySelector("svg")).toHaveAttribute("viewBox", "0 0 800 300");
    const area = (start: string) => rectOf(named(start)).reduce((acc, v, i) => (i < 2 ? acc : acc * v), 1);
    // Rent is 60 % of what is drawn, at any size.
    expect(area("Rent") / (800 * 300)).toBeCloseTo(0.6, 2);
    act(() => ro.resize(root, { width: 400, height: 300 }));
    expect(root.querySelector("svg")).toHaveAttribute("viewBox", "0 0 400 300");
    expect(area("Rent") / (400 * 300)).toBeCloseTo(0.6, 2);
  });

  it("keeps the focused tile's element through a resize", () => {
    const { root } = drawn(<Treemap data={DATA} />);
    const leisure = named("Leisure");
    act(() => leisure.focus());
    act(() => ro.resize(root, { width: 360, height: 300 }));
    expect(named("Leisure")).toBe(leisure);
    expect(document.activeElement).toBe(leisure);
  });

  it("hands the focus to the stop when the focused tile's node is gone", () => {
    const { rerender } = drawn(<Treemap data={DATA} />);
    act(() => named("Leisure").focus());
    rerender(<Treemap data={DATA.slice(0, 2)} />);
    expect(document.activeElement).toBe(named("Rent"));
    expect(document.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });
});

describe("Treemap's bubble", () => {
  it("says the node the pointer enters, in the node's own colour", () => {
    drawn(<Treemap data={DATA} colors={["#111111", "#222222", "#333333"]} />);
    fireEvent.mouseEnter(named("Groceries"));
    const tip = within(bubble()!);
    expect(tip.getByText("Groceries")).toBeInTheDocument();
    expect(tip.getByText("600")).toBeInTheDocument();
    // The swatch is the tile's fill, read off the node it is handed.
    expect(bubble()!.querySelector<HTMLElement>("span[style]")).toHaveStyle({ backgroundColor: "#222222" });
    fireEvent.mouseEnter(named("Leisure"));
    expect(within(bubble()!).getByText("Leisure")).toBeInTheDocument();
  });

  it("goes when the pointer leaves the chart, and on Escape until it enters another node", () => {
    const { root } = drawn(<Treemap data={DATA} />);
    fireEvent.mouseEnter(named("Rent"));
    expect(bubble()).not.toBeNull();
    fireEvent.mouseLeave(root.querySelector("svg")!);
    expect(bubble()).toBeNull();
    fireEvent.mouseEnter(named("Rent"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(bubble()).toBeNull();
    fireEvent.mouseEnter(named("Groceries"));
    expect(bubble()).not.toBeNull();
  });

  it("moves with its node when the map is laid out again under a still pointer", () => {
    const { root, rerender } = drawn(<Treemap data={DATA} />);
    fireEvent.mouseEnter(named("Groceries"));
    const at = () => /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(bubble()!.style.transform)!.slice(1).map(Number);
    const centre = () => {
      const [x, y, width, height] = rectOf(named("Groceries"));
      return [x! + width! / 2, y! + height! / 2];
    };
    const off = (point: number[], middle: number[]) => point.map((v, i) => Math.abs(v - middle[i]!));
    expect(off(at(), centre())).toEqual([10, 10]);
    act(() => ro.resize(root, { width: 400, height: 300 }));
    expect(within(bubble()!).getByText("Groceries")).toBeInTheDocument();
    expect(off(at(), centre())).toEqual([10, 10]);
    // And it goes with a node that is gone, for good: the node coming back is not the
    // pointer coming back to it.
    rerender(<Treemap data={[DATA[0]!, DATA[2]!]} />);
    expect(bubble()).toBeNull();
    rerender(<Treemap data={DATA} />);
    expect(bubble()).toBeNull();
  });

  it("slides from node to node, unless the reader asked for less motion", () => {
    drawn(<Treemap data={DATA} />);
    fireEvent.mouseEnter(named("Rent"));
    expect(bubble()!.style.transition).toBe(cssValue("transition", "transform 400ms ease"));
    stubDesktop({ reducedMotion: true });
    fireEvent.mouseEnter(named("Groceries"));
    expect(bubble()!.style.transition).toBe("");
  });

  it("is a group's too, with the group's total", () => {
    drawn(<Treemap data={GROUPED} />);
    fireEvent.mouseEnter(named("Home"));
    expect(within(bubble()!).getByText("Home")).toBeInTheDocument();
    expect(within(bubble()!).getByText("1,500")).toBeInTheDocument();
  });
});
