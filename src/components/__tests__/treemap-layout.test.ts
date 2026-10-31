import { describe, expect, it } from "vitest";
import { BAND, FRAME_MARGIN, groupBody, layoutTreemap, squarify, type Box, type LayoutNode } from "../treemap-layout";

/**
 * The map's own layout (0.52 code review of treemap.tsx, findings 1 and 8): a pure
 * function of the nodes, the chart's size and the text size — so nothing in it depends on
 * the order recharts renders its cells in — that keeps a tile's area its value's share of
 * the picture in whichever group it sits.
 */

const area = (b: Box) => b.width * b.height;
const inside = (b: Box, outer: Box) =>
  b.x >= outer.x &&
  b.y >= outer.y &&
  b.x + b.width <= outer.x + outer.width &&
  b.y + b.height <= outer.y + outer.height;

const leaf = (path: string, size: number): LayoutNode => ({ path, size });

describe("squarify", () => {
  it("shares the rectangle out by weight, filling it exactly", () => {
    const rect = { x: 10, y: 20, width: 400, height: 300 };
    const boxes = squarify([6, 3, 2, 1], rect);
    const total = boxes.reduce((acc, b) => acc + area(b), 0);
    expect(total).toBeCloseTo(area(rect), 6);
    boxes.forEach((b, i) => expect(area(b) / area(rect)).toBeCloseTo([6, 3, 2, 1][i]! / 12, 6));
    for (const b of boxes) expect(inside(b, rect)).toBe(true);
  });

  it("draws nothing for nothing to share", () => {
    expect(squarify([0, 0], { x: 0, y: 0, width: 100, height: 100 }).map(area)).toEqual([0, 0]);
  });
});

describe("groupBody", () => {
  it("draws the band from 61px at Normal; under that, the margin only", () => {
    expect(groupBody({ x: 0, y: 0, width: 200, height: 61 }, 1)).toEqual({
      banded: true,
      body: { x: FRAME_MARGIN, y: BAND, width: 200 - 2 * FRAME_MARGIN, height: 61 - BAND - FRAME_MARGIN },
    });
    expect(groupBody({ x: 0, y: 0, width: 200, height: 60 }, 1)).toEqual({
      banded: false,
      body: { x: 3, y: 3, width: 194, height: 54 },
    });
  });

  it("grows the band with the text size", () => {
    expect(groupBody({ x: 0, y: 0, width: 300, height: 200 }, 1.5).body.y).toBe(BAND * 1.5);
  });
});

describe("layoutTreemap", () => {
  // Tiles of 100 in a large group, a small one, a group in a group, and at the top.
  const NODES: LayoutNode[] = [
    { path: "big", size: 1600, children: [leaf("b1", 100), leaf("b2", 900), leaf("b3", 600)] },
    { path: "small", size: 220, children: [leaf("s1", 100), leaf("s2", 120)] },
    {
      path: "outer",
      size: 400,
      children: [{ path: "inner", size: 300, children: [leaf("i1", 100), leaf("i2", 200)] }, leaf("o1", 100)],
    },
    leaf("top", 100),
  ];
  const placed = layoutTreemap(NODES, 800, 400, 1);
  const box = (path: string) => placed.get(path)!.box;

  it("draws equal values at equal areas, in any group and at any depth", () => {
    const target = area(box("top"));
    for (const path of ["b1", "s1", "i1", "o1"]) {
      const b = box(path);
      // Whole pixels: half a pixel along each edge of either.
      const slack = (b.width + b.height + box("top").width + box("top").height) / 2;
      expect(Math.abs(area(b) - target), path).toBeLessThanOrEqual(slack);
    }
  });

  it("puts every node inside the body of its group, and fills the body", () => {
    for (const [group, kids] of [
      ["big", ["b1", "b2", "b3"]],
      ["small", ["s1", "s2"]],
      ["outer", ["inner", "o1"]],
      ["inner", ["i1", "i2"]],
    ] as const) {
      const body = placed.get(group)!.body!;
      for (const kid of kids) expect(inside(box(kid), body), `${kid} in ${group}`).toBe(true);
      expect(
        kids.reduce((acc, kid) => acc + area(box(kid)), 0),
        group,
      ).toBe(area(body));
    }
  });

  it("is the same layout however often it is asked", () => {
    expect(layoutTreemap(NODES, 800, 400, 1)).toEqual(placed);
  });

  it("covers the chart, edge to edge", () => {
    const top = ["big", "small", "outer", "top"].reduce((acc, p) => acc + area(box(p)), 0);
    expect(top).toBe(800 * 400);
  });
});
