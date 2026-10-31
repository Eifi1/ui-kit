import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Treemap, TreemapCell, type TreemapNode } from "../treemap";
import { lerpHex, textOn } from "../../theme/chart-palette";
import { axeViolations } from "../../test/axe";

/**
 * Groups in the tile chart (0.52, keksdose dev #642: "Is there already a distinction
 * between shop and chain?"). A node with `children` is drawn as a labelled frame with its
 * tiles inside, laid out by recharts' own nested layout and moved into the frame's body
 * below its band. Real recharts at a fixed 800x300, as in `treemap-text-alternative`.
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
  // Unmount before <html> is reset, so no observer fires after the test (see treemap.test).
  cleanup();
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-contrast");
});

// A total of 2000, so every share is a round figure. Food holds a group of its own.
const SPEND: TreemapNode[] = [
  {
    id: "housing",
    name: "Housing",
    value: 1240,
    children: [
      { id: "rent", name: "Rent", value: 1000 },
      { id: "council", name: "Council tax", value: 200 },
      { id: "insurance", name: "Home insurance", value: 40 },
    ],
  },
  {
    id: "food",
    name: "Food",
    value: 560,
    children: [
      {
        id: "groceries",
        name: "Groceries",
        value: 400,
        children: [
          { id: "supermarket", name: "Supermarket", value: 300 },
          { id: "bakery", name: "Bakery", value: 40 },
          { id: "market", name: "Market", value: 60 },
        ],
      },
      { id: "eating-out", name: "Eating out", value: 160, fill: "#abcdef" },
    ],
  },
  { id: "fees", name: "Bank fees", value: 200 },
];

const RAMP = ["#111111", "#222222", "#333333"];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A tile's or a frame's `<g>`, image or button, by the start of its accessible name. */
function node(start: string): HTMLElement {
  const name = new RegExp(`^${start}[:,]`);
  const found = [...document.querySelectorAll<HTMLElement>("[aria-label]")].filter((el) =>
    name.test(el.getAttribute("aria-label")!),
  );
  expect(found, start).toHaveLength(1);
  return found[0]!;
}
/** The rect a tile or frame draws — the first, before any ink edge. */
function rectOf(g: Element): Rect {
  const rect = g.querySelector("rect")!;
  const n = (a: string) => Number(rect.getAttribute(a));
  return { x: n("x"), y: n("y"), width: n("width"), height: n("height") };
}

describe("Treemap with groups: the frame", () => {
  it("draws each group as a frame in the page's colours, its name in a band along the top", () => {
    render(<Treemap data={SPEND} colors={RAMP} />);
    const housing = node("Housing");
    expect(housing).toHaveAttribute("data-group");
    const rect = housing.querySelector("rect")!;
    expect(rect.getAttribute("fill")).toBe("var(--bg-surface-2)");
    const title = housing.querySelector("text")!;
    expect(title.textContent).toBe("Housing");
    expect(title.getAttribute("fill")).toBe("var(--text-primary)");
    expect(Number(title.getAttribute("y"))).toBeLessThan(rectOf(housing).y + 20);
  });

  it("lays every tile out inside its group's frame, below the band", () => {
    render(<Treemap data={SPEND} colors={RAMP} />);
    const inside = (group: string, tiles: string[]) => {
      const frame = rectOf(node(group));
      const banded = node(group).querySelector("text") !== null;
      for (const tile of tiles) {
        const r = rectOf(node(tile));
        expect(r.x, `${tile} in ${group}`).toBeGreaterThanOrEqual(frame.x + 3);
        expect(r.y, `${tile} in ${group}`).toBeGreaterThanOrEqual(frame.y + (banded ? 20 : 3));
        expect(r.x + r.width, `${tile} in ${group}`).toBeLessThanOrEqual(frame.x + frame.width - 3);
        expect(r.y + r.height, `${tile} in ${group}`).toBeLessThanOrEqual(frame.y + frame.height - 3);
      }
    };
    inside("Housing", ["Rent", "Council tax", "Home insurance"]);
    inside("Food", ["Groceries", "Supermarket", "Bakery", "Market", "Eating out"]);
    inside("Groceries", ["Supermarket", "Bakery", "Market"]);
  });

  it("sizes a group by the sum of its tiles, and fills its body with them", () => {
    render(<Treemap data={SPEND} colors={RAMP} />);
    const area = (r: Rect) => r.width * r.height;
    // Housing is 1240 of 2000: 62 % of the 800x300 picture, give or take the rounding.
    expect(area(rectOf(node("Housing"))) / (800 * 300)).toBeCloseTo(0.62, 1);
    const housing = rectOf(node("Housing"));
    const tiles = ["Rent", "Council tax", "Home insurance"].map((t) => area(rectOf(node(t))));
    // The body: the frame less its 20px band and its 3px margin on the other three sides.
    const body = (housing.width - 6) * (housing.height - 20 - 3);
    expect(tiles.reduce((a, b) => a + b, 0)).toBe(body);
    // And within it, in the ratio of their values (Rent 1000 to Council tax 200).
    expect(tiles[0]! / tiles[1]!).toBeCloseTo(5, 0);
  });

  it("does not draw a group whose tiles are all left off", () => {
    render(
      <Treemap
        data={[
          { id: "a", name: "A", value: 0, children: [{ id: "a1", name: "A1", value: 0 }] },
          { id: "b", name: "B", value: 5 },
        ]}
      />,
    );
    expect(screen.getAllByRole("img").map((t) => t.getAttribute("aria-label"))).toEqual(["B: 5 (100%)"]);
  });

  it("counts maxTiles across the groups, in the order given", () => {
    render(<Treemap data={SPEND} maxTiles={4} />);
    const names = screen.getAllByRole("img").map((t) => t.getAttribute("aria-label")!.split(/[:,]/)[0]);
    // Housing's three, then Supermarket: Food and Groceries hold one tile, Eating out and
    // Bank fees are past the cap.
    expect(names).toEqual(["Housing", "Rent", "Council tax", "Home insurance", "Food", "Groceries", "Supermarket"]);
  });
});

describe("Treemap with groups: colours", () => {
  it("paints a group's tiles in the group's colour, unless a tile sets its own", () => {
    render(<Treemap data={SPEND} colors={RAMP} />);
    const fill = (name: string) => node(name).querySelector("rect")!.getAttribute("fill");
    // By index at the top, as a flat map: Housing the first, Food the second hue.
    expect(["Rent", "Council tax", "Home insurance"].map(fill)).toEqual(["#111111", "#111111", "#111111"]);
    // Down two levels, through Groceries, which sets none.
    expect(["Supermarket", "Bakery", "Market"].map(fill)).toEqual(["#222222", "#222222", "#222222"]);
    expect(fill("Eating out")).toBe("#abcdef");
    expect(fill("Bank fees")).toBe("#333333");
  });

  it("takes the group's own fill as its tiles' default, and measures their ink on it", () => {
    render(<Treemap data={[{ ...SPEND[0]!, fill: "#332288" }]} />);
    const rent = node("Rent");
    expect(rent.querySelector("rect")!.getAttribute("fill")).toBe("#332288");
    expect(rent.querySelector("text")!.getAttribute("fill")).toBe(textOn("#332288"));
  });

  it("hands a group's labelColor to the tiles that take its fill, not to one with its own", () => {
    const mix = "color-mix(in srgb, var(--chart-1) 60%, transparent)";
    render(
      <Treemap
        data={[
          {
            id: "g",
            name: "Group",
            value: 30,
            fill: mix,
            labelColor: "#ffffff",
            children: [
              { id: "a", name: "Inherits", value: 20 },
              { id: "b", name: "Own colour", value: 10, fill: "#f0e442" },
            ],
          },
        ]}
      />,
    );
    expect(node("Inherits").querySelector("text")!.getAttribute("fill")).toBe("#ffffff");
    expect(node("Own colour").querySelector("text")!.getAttribute("fill")).toBe(textOn("#f0e442"));
  });

  it("shades a tile into the card as a measured hex, so its ink stays automatic", () => {
    document.documentElement.style.setProperty("--bg-surface", "#f6ecd9");
    render(
      <Treemap
        data={[
          {
            id: "chain",
            name: "Greenway",
            value: 30,
            fill: "#4467a3",
            children: [
              { id: "new", name: "Seen this week", value: 20 },
              { id: "old", name: "Seen in spring", value: 10, shade: 0.55 },
            ],
          },
        ]}
      />,
    );
    const shaded = lerpHex("#f6ecd9", "#4467a3", 0.55);
    expect(node("Seen this week").querySelector("rect")!.getAttribute("fill")).toBe("#4467a3");
    const old = node("Seen in spring");
    expect(old.querySelector("rect")!.getAttribute("fill")).toBe(shaded);
    expect(old.querySelector("text")!.getAttribute("fill")).toBe(textOn(shaded));
  });

  it("keeps the full hue where there is no card colour to shade into", () => {
    render(<Treemap data={[{ id: "a", name: "Alone", value: 1, fill: "#4467a3", shade: 0.55 }]} />);
    expect(node("Alone").querySelector("rect")!.getAttribute("fill")).toBe("#4467a3");
  });

  it("outlines every frame in ink under More contrast, and none at Standard", async () => {
    const { container } = render(<Treemap data={SPEND} />);
    expect(node("Housing").querySelector("[data-edge]")).toBeNull();
    await act(async () => document.documentElement.setAttribute("data-contrast", "more"));
    const edge = node("Housing").querySelector("[data-edge]");
    expect(edge?.getAttribute("stroke")).toBe("var(--chart-ink)");
    expect(container.querySelectorAll("[data-group] > [data-edge]")).toHaveLength(3);
  });
});

describe("Treemap with groups: keyboard and screen reader", () => {
  it("names a frame as a group with its total, and a tile with its groups", () => {
    render(<Treemap data={SPEND} />);
    expect(node("Housing")).toHaveAccessibleName("Housing, group: 1,240 (62%)");
    expect(node("Rent")).toHaveAccessibleName("Rent: 1,000 (50%), in Housing");
    expect(node("Groceries")).toHaveAccessibleName("Groceries, group: 400 (20%), in Food");
    expect(node("Bakery")).toHaveAccessibleName("Bakery: 40 (2%), in Groceries, in Food");
    expect(node("Bank fees")).toHaveAccessibleName("Bank fees: 200 (10%)");
  });

  it("walks frames and tiles in the data's order, depth first, from ONE tab stop", () => {
    const { container } = render(<Treemap data={SPEND} />);
    const walk = [
      "Housing",
      "Rent",
      "Council tax",
      "Home insurance",
      "Food",
      "Groceries",
      "Supermarket",
      "Bakery",
      "Market",
      "Eating out",
      "Bank fees",
    ];
    expect([...container.querySelectorAll('[tabindex="0"]')]).toEqual([node("Housing")]);
    act(() => node("Housing").focus());
    for (const [i, name] of walk.slice(1).entries()) {
      fireEvent.keyDown(document.activeElement!, { key: i % 2 ? "ArrowDown" : "ArrowRight" });
      expect(document.activeElement, name).toBe(node(name));
    }
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(node("Housing"));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(document.activeElement).toBe(node("Bank fees"));
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });

  it("hands onNodeClick a tile's groups, outermost first, and a top tile none", () => {
    const onNodeClick = vi.fn();
    render(<Treemap data={SPEND} onNodeClick={onNodeClick} />);
    fireEvent.click(node("Bakery"));
    expect(onNodeClick).toHaveBeenLastCalledWith("bakery", "Bakery", ["food", "groceries"]);
    fireEvent.keyDown(node("Bank fees"), { key: "Enter" });
    expect(onNodeClick).toHaveBeenLastCalledWith("fees", "Bank fees");
    // A frame is not a tile: without onGroupClick it is an image to read, not a button.
    expect(node("Housing")).toHaveAttribute("role", "img");
    fireEvent.click(node("Housing"));
    expect(onNodeClick).toHaveBeenCalledTimes(2);
  });

  it("makes the frames buttons with onGroupClick", () => {
    const onGroupClick = vi.fn();
    render(<Treemap data={SPEND} onGroupClick={onGroupClick} />);
    const groceries = screen.getByRole("button", { name: /^Groceries, group/ });
    fireEvent.keyDown(groceries, { key: " " });
    expect(onGroupClick).toHaveBeenLastCalledWith("groceries", "Groceries", ["food"]);
    fireEvent.click(screen.getByRole("button", { name: /^Housing, group/ }));
    expect(onGroupClick).toHaveBeenLastCalledWith("housing", "Housing");
    expect(node("Rent")).toHaveAttribute("role", "img");
  });

  it("tags the frames and their bands private under redactNames", () => {
    render(<Treemap data={SPEND} redactNames />);
    const housing = node("Housing");
    expect(housing).toHaveAttribute("data-private");
    expect(housing.querySelector("text")).toHaveAttribute("data-private");
  });

  it("passes axe as a figure of frames and tiles", async () => {
    const { container } = render(<Treemap data={SPEND} aria-label="Spending by group" onNodeClick={() => {}} />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("TreemapCell as a group's cell", () => {
  /** A group cell and one child cell, wired as recharts wires them: the child's `root` is
   *  recharts' object for the group, which is its own parent's `children[index]`. */
  function group(height: number) {
    const child = {};
    const groupNode = { children: [child] };
    const top = { children: [groupNode] };
    return render(
      <svg>
        <TreemapCell depth={1} x={0} y={0} width={200} height={height} name="Chain" root={top} index={0}>
          {[child]}
        </TreemapCell>
        <TreemapCell
          depth={2}
          x={0}
          y={0}
          width={200}
          height={height}
          name="Shop"
          fill="#332288"
          root={groupNode}
          index={0}
        />
      </svg>,
    );
  }

  it("draws the band from 61px at Normal, and moves its child below it", () => {
    const { container } = group(61);
    const [frame, tile] = [...container.querySelectorAll("svg > g")];
    expect(frame!.querySelector("text")!.textContent).toBe("Chain");
    expect(rectOf(tile!)).toEqual({ x: 3, y: 20, width: 194, height: 38 });
  });

  it("keeps a group under 61px whole for its tiles: no band, the margin only", () => {
    const { container } = group(60);
    const [frame, tile] = [...container.querySelectorAll("svg > g")];
    expect(frame!.querySelector("text")).toBeNull();
    expect(rectOf(tile!)).toEqual({ x: 3, y: 3, width: 194, height: 54 });
  });
});
