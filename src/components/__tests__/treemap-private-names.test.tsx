import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { Treemap, TreemapCell, type TreemapNode } from "../treemap";

/**
 * `redactNames` and the tiles' accessible names (0.52, code review of feat/0.52.0).
 *
 * Since DSP-5 every tile carries `labels.tile` — the node's name and its value — in an
 * `aria-label`, clickable or not. `data-private` still went on the tile only when it was a
 * button, so a map that nobody clicks left the payees and their amounts in untagged
 * attributes, where a session replay or a screenshot redaction keyed on `[data-private]`
 * reads what the app asked to hide (before 0.52 those tiles had no name to leak). Real
 * recharts at a fixed 800x300, as in `treemap-text-alternative.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const PAYEES = [
  { id: "p1", name: "Riverside Lettings", value: 1050 },
  { id: "p2", name: "Greenway Foods", value: 318 },
  { id: "p3", name: "Northern Rail", value: 124 },
];

describe("Treemap under redactNames", () => {
  it("tags every named tile private, when nothing clicks it", () => {
    render(<Treemap data={PAYEES} redactNames />);
    const tiles = screen.getAllByRole("img");
    expect(tiles).toHaveLength(3);
    for (const tile of tiles) expect(tile, tile.getAttribute("aria-label")!).toHaveAttribute("data-private");
  });

  it("tags a clickable tile as it always did", () => {
    render(<Treemap data={PAYEES} redactNames onNodeClick={() => {}} />);
    for (const tile of screen.getAllByRole("button")) expect(tile).toHaveAttribute("data-private");
  });

  it("leaves the tiles of a map whose names are the app's own untagged", () => {
    render(<Treemap data={PAYEES} />);
    for (const tile of screen.getAllByRole("img")) expect(tile).not.toHaveAttribute("data-private");
  });
});

// Shops by chain, keksdose's #642 map: a chain is a public name (Migros, Coop), a shop is
// where the user spent. Both chains are large enough at 800x300 to draw their band.
const SHOPS: TreemapNode[] = [
  {
    id: "migros",
    name: "Migros",
    value: 900,
    children: [
      { id: "m1", name: "Migros Bahnhof", value: 600 },
      { id: "m2", name: "Migros Altstadt", value: 300 },
    ],
  },
  {
    id: "coop",
    name: "Coop",
    value: 700,
    children: [
      { id: "c1", name: "Coop Seepark", value: 450 },
      { id: "c2", name: "Coop Mitte", value: 250 },
    ],
  },
  { id: "bakery", name: "Village Bakery", value: 400 },
];

/** A tile's or a frame's `<g>` by the start of its accessible name. */
function node(start: string): HTMLElement {
  const name = new RegExp(`^${start}[:,]`);
  const found = [...document.querySelectorAll<HTMLElement>("[aria-label]")].filter((el) =>
    name.test(el.getAttribute("aria-label")!),
  );
  expect(found, start).toHaveLength(1);
  return found[0]!;
}

/** The name the bubble shows, once the pointer is on `start`'s node. */
function hover(start: string): HTMLElement {
  fireEvent.mouseEnter(node(start));
  const wrapper = document.querySelector<HTMLElement>(".recharts-tooltip-wrapper")!;
  return within(wrapper).getByText(start);
}

// 0.53, keksdose after 0.52: its groups are public chain names, but `redactNames` tagged the
// frames too, so its demo's blur on `[data-private]` blurred "Migros" with the payees.
describe('Treemap under redactNames="tiles"', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tags every tile, its label too, as `true` does", () => {
    render(<Treemap data={SHOPS} redactNames="tiles" />);
    for (const start of ["Migros Bahnhof", "Coop Mitte", "Village Bakery"]) {
      expect(node(start), start).toHaveAttribute("data-private");
    }
    expect(node("Migros Bahnhof").querySelector("text")).toHaveAttribute("data-private");
  });

  it("leaves a group's frame and its band untagged", () => {
    render(<Treemap data={SHOPS} redactNames="tiles" />);
    for (const start of ["Migros", "Coop"]) {
      const frame = node(start);
      expect(frame).toHaveAttribute("data-group");
      expect(frame, start).not.toHaveAttribute("data-private");
      expect(frame.querySelector("text"), start).toHaveTextContent(start);
      expect(frame.querySelector("text"), start).not.toHaveAttribute("data-private");
    }
  });

  it("leaves a clickable frame untagged too, and its tiles tagged", () => {
    render(<Treemap data={SHOPS} redactNames="tiles" onNodeClick={() => {}} onGroupClick={() => {}} />);
    expect(screen.getByRole("button", { name: /^Migros, group/ })).not.toHaveAttribute("data-private");
    expect(screen.getByRole("button", { name: /^Migros Bahnhof:/ })).toHaveAttribute("data-private");
  });

  it("tags a tile's tooltip bubble and leaves a group's untagged", () => {
    // recharts places the bubble only once it has measured it; jsdom measures nothing.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 120, height: 40 }),
    );
    render(<Treemap data={SHOPS} redactNames="tiles" />);
    expect(hover("Migros Bahnhof").closest("[data-private]")).not.toBeNull();
    expect(hover("Migros").closest("[data-private]")).toBeNull();
    expect(hover("Village Bakery").closest("[data-private]")).not.toBeNull();
  });
});

describe("Treemap under redactNames, groups and all", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tags the frames, their bands and the tiles, as in 0.52", () => {
    render(<Treemap data={SHOPS} redactNames />);
    for (const start of ["Migros", "Coop", "Migros Bahnhof", "Village Bakery"]) {
      expect(node(start), start).toHaveAttribute("data-private");
      expect(node(start).querySelector("text"), start).toHaveAttribute("data-private");
    }
  });

  it("tags a group's tooltip bubble as a tile's", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: 0, width: 120, height: 40 }),
    );
    render(<Treemap data={SHOPS} redactNames />);
    expect(hover("Migros").closest("[data-private]")).not.toBeNull();
    expect(hover("Migros Bahnhof").closest("[data-private]")).not.toBeNull();
  });
});

describe('TreemapCell under redactNames="tiles"', () => {
  // A caller's own recharts map: the cell is told it is a group by its `children`.
  const cell = (children: readonly object[] | null) =>
    render(
      <svg>
        <TreemapCell depth={1} width={300} height={120} name="Migros" fill="#332288" redactNames="tiles">
          {children}
        </TreemapCell>
      </svg>,
    );

  it("leaves a group's band untagged", () => {
    const { container } = cell([{}]);
    expect(container.querySelector("text")).toHaveTextContent("Migros");
    expect(container.querySelector("text")).not.toHaveAttribute("data-private");
  });

  it("tags a tile's label", () => {
    const { container } = cell(null);
    expect(container.querySelector("text")).toHaveAttribute("data-private");
  });
});
