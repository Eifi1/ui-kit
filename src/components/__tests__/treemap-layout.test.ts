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

  // 0.55: the map is drawn from this alone (recharts' `<Treemap>` is gone from it), so what
  // the picture promises is asserted here, on the layout, as well as on the drawn tiles.
  it("keeps the order given: the first weight at the top-left, the last at the bottom-right", () => {
    const rect = { x: 10, y: 20, width: 400, height: 300 };
    const boxes = squarify([5, 4, 3, 2, 1], rect);
    expect(boxes[0]).toMatchObject({ x: rect.x, y: rect.y });
    const last = boxes[boxes.length - 1]!;
    expect(last.x + last.width).toBeCloseTo(rect.x + rect.width, 9);
    expect(last.y + last.height).toBeCloseTo(rect.y + rect.height, 9);
    // Row by row along the shorter side: each box starts right of the one before it (along
    // a row, or in the next column) or below it (down a column, or in the next row).
    for (let i = 1; i < boxes.length; i++) {
      const [a, b] = [boxes[i - 1]!, boxes[i]!];
      expect(b.x >= a.x + a.width - 1e-9 || b.y >= a.y + a.height - 1e-9, `box ${i}`).toBe(true);
    }
  });

  it("never overlaps two boxes", () => {
    const boxes = squarify([9, 7, 7, 4, 3, 3, 2, 1, 1], { x: 0, y: 0, width: 640, height: 360 });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i]!, boxes[j]!];
        const across = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const down = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        expect(across <= 1e-9 || down <= 1e-9, `${i} and ${j}`).toBe(true);
      }
    }
  });

  it("keeps the tiles near square, where slicing would draw strips", () => {
    // Ten equal tiles in a square: slices would be 10:1 each.
    const boxes = squarify(Array(10).fill(1), { x: 0, y: 0, width: 500, height: 500 });
    const worst = Math.max(...boxes.map((b) => Math.max(b.width / b.height, b.height / b.width)));
    expect(worst).toBeLessThan(3);
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

  it("draws every tile at its value's share, across groups: 900 is nine tiles of 100", () => {
    // `b2` (900, in "big") against `top` (100, at the top), and `i2` (200, two groups down).
    const slack = (a: Box, b: Box) => (a.width + a.height) / 2 + 9 * ((b.width + b.height) / 2);
    expect(Math.abs(area(box("b2")) - 9 * area(box("top")))).toBeLessThanOrEqual(slack(box("b2"), box("top")));
    expect(area(box("i2")) / area(box("i1"))).toBeCloseTo(2, 0);
  });

  it("gives a group its frame on top of its tiles' area, a band and a margin", () => {
    for (const group of ["big", "small", "outer", "inner"]) {
      const { box: outer, body, banded } = placed.get(group)!;
      expect(inside(body!, outer), group).toBe(true);
      // The margin on three sides; the band — or, where there is no room for it, the margin
      // — on top.
      expect(body!.x - outer.x, group).toBe(FRAME_MARGIN);
      expect(outer.x + outer.width - (body!.x + body!.width), group).toBe(FRAME_MARGIN);
      expect(outer.y + outer.height - (body!.y + body!.height), group).toBe(FRAME_MARGIN);
      expect(body!.y - outer.y, group).toBe(banded ? BAND : FRAME_MARGIN);
    }
  });

  it("never overlaps two nodes of one level, and keeps their order", () => {
    const levels: string[][] = [
      ["big", "small", "outer", "top"],
      ["b1", "b2", "b3"],
      ["inner", "o1"],
      ["i1", "i2"],
    ];
    for (const level of levels) {
      const boxes = level.map(box);
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, b] = [boxes[i]!, boxes[j]!];
          const across = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
          const down = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          expect(across <= 0 || down <= 0, `${level[i]} and ${level[j]}`).toBe(true);
        }
      }
    }
    // The first node of the chart and of each group starts at the corner of its rectangle.
    expect(box("big")).toMatchObject({ x: 0, y: 0 });
    const body = placed.get("big")!.body!;
    expect(box("b1")).toMatchObject({ x: body.x, y: body.y });
  });
});
