// Where `Treemap` draws each node — a pure function of the nodes, the chart's size and the
// text size, with no recharts in it (0.52 code review of treemap.tsx, findings 1 and 8).
//
// recharts lays nested data out itself, edge to edge, and 0.52 first made the groups' room
// afterwards: a group's cell took its band and margin out of its rectangle and each child's
// cell SQUEEZED the rectangle recharts gave it into what was left. Two faults followed.
// A fixed 23px is a different share of every group, so a €100 tile in a 61px group was
// drawn at two thirds of a €100 tile in a 300px one — in a chart whose one promise is that
// area is share. And the squeeze ran through a cache the group's cell wrote during render
// for its children's cells to read, which held only because recharts renders a group
// before its children.
//
// So the layout is made here, up front: squarified as recharts does it, with each group
// asking for its tiles' area PLUS its frame's, and its tiles laid out in its body. A
// frame's area depends on the rectangle it gets, so the layout is run again with each
// group's frame as measured until no frame moves by a pixel — two or three rounds.

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What the layout needs of a node: its key, its value, and a group's nodes. */
export interface LayoutNode {
  path: string;
  size: number;
  children?: readonly LayoutNode[];
}

/** A node as drawn: its rectangle, and for a group the body its nodes fill and whether
 *  its band is drawn. Whole pixels, on shared edges, so neighbours meet without a seam. */
export interface Placed {
  box: Box;
  body?: Box;
  banded?: boolean;
}

const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * A group's band, in px at Normal, × the text size's scale: the 20px floor a tile keeps
 * for its own name, so the group's name sits in it as a tile's does in a tile.
 */
export const BAND = 20;
/**
 * The frame's margin round its body, in px. Each tile keeps its 2px gutter, half of it
 * inside the tile, so 3 leaves one pixel of the frame's own colour between the group's
 * gutter and its tiles' — the frame reads as one outline round the group, not as a gutter
 * that happens to be wider.
 */
export const FRAME_MARGIN = 3;
/**
 * The least of a group's height its body keeps under the band: 1/φ. At Normal that is a
 * group of 61px (20 band + 3 margin = 0.382 of it), whose body of 38px still holds a
 * tile's name and its second line (the note's 36px floor) — so a single row of tiles under
 * the band keeps both. A smaller group draws no band, and its name is in its tiles'
 * accessible names and its tooltip rather than over their area. Since the frame's area is
 * given to the group (above), this bounds the frame's share of the picture, not the tiles'.
 */
export const BODY_SHARE = 1 / PHI;

/** A group drawn at `box`: whether it has the room for its band (see {@link BODY_SHARE};
 *  and 44px across, the floor of a word), and the body its nodes are drawn into. */
export function groupBody(box: Box, scale: number): { banded: boolean; body: Box } {
  const band = BAND * scale;
  const margin = Math.min(FRAME_MARGIN, Math.floor(box.width / 4), Math.floor(box.height / 4));
  const banded = box.width >= 44 * scale && box.height - band - margin >= box.height * BODY_SHARE;
  const top = banded ? band : margin;
  return {
    banded,
    body: {
      x: box.x + margin,
      y: box.y + top,
      width: Math.max(0, box.width - 2 * margin),
      height: Math.max(0, box.height - top - margin),
    },
  };
}

/** The worst aspect ratio in a row of `area` along `side`, against the target `ratio`. */
function worst(area: number, min: number, max: number, side: number, ratio: number): number {
  const along = side * side;
  const across = area * area;
  if (across === 0 || min === 0) return Infinity;
  return Math.max((along * max * ratio) / across, across / (along * min * ratio));
}

/**
 * Bruls, Huizing and van Wijk's squarified layout, as recharts runs it: `weights` share
 * out `rect` in order, a row at a time along its shorter side, and a row closes when the
 * next node would make its worst tile further from φ:1 (recharts' default ratio). Returns
 * one rectangle per weight, in order, in fractional pixels.
 */
export function squarify(weights: readonly number[], rect: Box, ratio = PHI): Box[] {
  const out: Box[] = weights.map(() => ({ x: rect.x, y: rect.y, width: 0, height: 0 }));
  const sum = weights.reduce((acc, w) => acc + Math.max(0, w), 0);
  if (!(sum > 0) || rect.width <= 0 || rect.height <= 0) return out;
  const areas = weights.map((w) => (Math.max(0, w) * rect.width * rect.height) / sum);
  let { x, y, width, height } = rect;
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(width, height);
    let rowArea = 0;
    let min = Infinity;
    let max = 0;
    let best = Infinity;
    let j = i;
    while (j < areas.length) {
      const a = areas[j]!;
      const score = worst(rowArea + a, Math.min(min, a), Math.max(max, a), side, ratio);
      if (j > i && score > best) break;
      rowArea += a;
      min = Math.min(min, a);
      max = Math.max(max, a);
      best = score;
      j += 1;
    }
    // The last row takes what is left, so rounding never leaves a sliver unpainted.
    const last = j === areas.length;
    if (side === width) {
      // A row along the top, as wide as the space.
      const thick = last ? height : rowArea / width;
      let at = x;
      for (let k = i; k < j; k++) {
        const len = k === j - 1 ? x + width - at : (areas[k]! / rowArea) * width;
        out[k] = { x: at, y, width: len, height: thick };
        at += len;
      }
      y += thick;
      height -= thick;
    } else {
      // A column at the left, as tall as the space.
      const thick = last ? width : rowArea / height;
      let at = y;
      for (let k = i; k < j; k++) {
        const len = k === j - 1 ? y + height - at : (areas[k]! / rowArea) * height;
        out[k] = { x, y: at, width: thick, height: len };
        at += len;
      }
      x += thick;
      width -= thick;
    }
    i = j;
  }
  return out;
}

/** Whole pixels on the EDGES: neighbours share an edge, so they round it alike. */
function snap(b: Box): Box {
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  return { x, y, width: Math.round(b.x + b.width) - x, height: Math.round(b.y + b.height) - y };
}

/** The rounds the frames get to settle; three is usual, more only when a band switches. */
const ROUNDS = 8;

/**
 * Every node of `nodes` placed in a `width` × `height` chart, by path.
 *
 * Each tile's area is its value's share of what is left for tiles once the frames have
 * theirs — the same density in every group and at the top. A group asks for its tiles'
 * area and its own frame's (band and margin, as {@link groupBody} measures them on the
 * rectangle it got last round), so its body holds exactly its tiles.
 */
export function layoutTreemap(
  nodes: readonly LayoutNode[],
  width: number,
  height: number,
  scale: number,
): Map<string, Placed> {
  const total = nodes.reduce((acc, n) => acc + n.size, 0);
  const frames = new Map<string, number>();
  let placed = new Map<string, Placed>();
  for (let round = 0; round < ROUNDS; round++) {
    const framed = [...frames.values()].reduce((acc, a) => acc + a, 0);
    const spare = width * height - framed;
    // Frames that would take the whole chart (a tiny chart of many groups) leave nothing
    // to share; the tiles then take the density they would have without frames.
    const density = total > 0 ? (spare > 0 ? spare : width * height) / total : 0;
    const need = (n: LayoutNode): number =>
      n.children ? (frames.get(n.path) ?? 0) + n.children.reduce((acc, c) => acc + need(c), 0) : n.size * density;
    let moved = 0;
    placed = new Map();
    const place = (list: readonly LayoutNode[], rect: Box) => {
      const boxes = squarify(
        list.map((n) => need(n)),
        rect,
      );
      list.forEach((n, i) => {
        const box = snap(boxes[i]!);
        if (!n.children) {
          placed.set(n.path, { box });
          return;
        }
        const { banded, body } = groupBody(box, scale);
        placed.set(n.path, { box, body, banded });
        const frame = box.width * box.height - body.width * body.height;
        moved = Math.max(moved, Math.abs(frame - (frames.get(n.path) ?? 0)));
        frames.set(n.path, frame);
        place(n.children, body);
      });
    };
    place(nodes, { x: 0, y: 0, width, height });
    if (moved < 1) break;
  }
  return placed;
}
