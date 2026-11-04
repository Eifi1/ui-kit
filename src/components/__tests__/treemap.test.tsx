import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { PALETTE_HEX, textOn } from "../../theme/chart-palette";

/**
 * The tile chart, ported from keksdose's `category-treemap` suites.
 *
 * `ResponsiveContainer` measures 0x0 under jsdom, so it stands in at a fixed 800x300, as
 * in `treemap-text-alternative.test.tsx`. Up to 0.54 recharts' `Treemap` drew the map, and
 * this suite replaced it by a spy that recorded what the kit HANDED it (which nodes, which
 * colours, which tooltip, which tile options). The kit draws the map itself since 0.55, so
 * the same claims are asserted on what it draws: the tiles' rects and labels, and the
 * bubble a hover shows. The cell is still rendered on its own too, inside an `<svg>`: it
 * is what a caller's own recharts map draws.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

import { Treemap, TreemapCell, fitLabel } from "../treemap";

const DARK_INK = "#1a1a1a";
const LIGHT_INK = "#f8fafc";

afterEach(() => {
  // Unmount FIRST. This hook runs before the global `cleanup()` in src/test/setup.ts
  // (after-hooks run in reverse registration order), so resetting <html> with the
  // Treemap still mounted fired its MutationObserver — a state update after the test,
  // outside act(), and a warning whenever the scheduler let it land in time.
  cleanup();
  document.documentElement.removeAttribute("style");
  document.documentElement.classList.remove("dark");
});

function renderCell(props: { width: number; height: number; name: string; fill?: string; labelColor?: string }) {
  // The chart root used to carry stroke="#fff", which INHERITS into the label text —
  // that is what smeared the glyphs. Reproduce it so the cell has to defend itself.
  return render(
    <svg stroke="#fff">
      <TreemapCell depth={1} x={0} y={0} {...props} />
    </svg>,
  );
}

/** The map's tiles as drawn, in the order drawn: each one's `<g>`, by its accessible name. */
const drawnTiles = () => screen.getAllByRole("img");
/** A tile's `<g>`, by the start of its accessible name ("Rent: …"). */
const tileNamed = (start: string) => drawnTiles().find((g) => g.getAttribute("aria-label")!.startsWith(`${start}:`))!;
/** The colour a tile is drawn in: its first rect, before any ink edge. */
const fillOf = (g: Element) => g.querySelector("rect")!.getAttribute("fill");

/** The bubble the map shows once the pointer is on `start`'s tile. */
function hover(start: string): HTMLElement {
  fireEvent.mouseEnter(tileNamed(start));
  return document.querySelector<HTMLElement>(".recharts-tooltip-wrapper")!;
}

const DATA = [
  { id: "1", name: "Groceries", value: 120 },
  { id: "2", name: "Rent", value: 880 },
];

describe("TreemapCell", () => {
  it("never lets an inherited stroke paint over the glyphs", () => {
    const { container } = renderCell({ width: 200, height: 60, name: "Groceries", fill: "#44aa99" });
    const text = container.querySelector("text")!;
    expect(text.getAttribute("stroke")).toBe("#44aa99");
    expect(text.getAttribute("paint-order")).toBe("stroke");
  });

  it("picks the ink with the better measured contrast on the tile", () => {
    // Teal and olive read as washed-out white text under a luma rule (2.7:1 / 2.9:1).
    for (const fill of ["#44aa99", "#999933"]) {
      const { container } = renderCell({ width: 200, height: 60, name: "Groceries", fill });
      expect(container.querySelector("text")!.getAttribute("fill")).toBe(DARK_INK);
    }
    const { container } = renderCell({ width: 200, height: 60, name: "Groceries", fill: "#332288" });
    expect(container.querySelector("text")!.getAttribute("fill")).toBe(LIGHT_INK);
  });

  it("inherits the ink for a fill it cannot measure, and draws no halo in it", () => {
    const { container } = renderCell({ width: 200, height: 60, name: "Groceries", fill: "var(--brand)" });
    const text = container.querySelector("text")!;
    expect(text.getAttribute("fill")).toBe("currentColor");
    // Still overrides the inherited chart stroke, just without a tile-coloured ring.
    expect(text.getAttribute("stroke")).toBe("none");
  });

  it("measures a bare chart token — what paletteFor hands a hand-built map", () => {
    // jsdom resolves no custom properties, so the token reads as the built-in ramp.
    const { container } = renderCell({ width: 200, height: 60, name: "Rent", fill: "var(--chart-1)" });
    const text = container.querySelector("text")!;
    expect(text.getAttribute("fill")).toBe(textOn(PALETTE_HEX.light[0]));
    expect(text.getAttribute("fill")).not.toBe("currentColor");
    expect(text.getAttribute("stroke")).toBe("var(--chart-1)");
  });

  it("draws no halo on a translucent fill, which would double the glyph edges", () => {
    const { container } = renderCell({
      width: 200,
      height: 60,
      name: "Gifts",
      fill: "color-mix(in srgb, var(--chart-1) 20%, transparent)",
      labelColor: "var(--text-primary)",
    });
    expect(container.querySelector("text")!.getAttribute("stroke")).toBe("none");
  });

  it("takes the caller's labelColor for a fill it cannot measure (keksdose B13)", () => {
    const { container } = renderCell({
      width: 200,
      height: 60,
      name: "Newest",
      fill: "color-mix(in srgb, var(--chart-1) 100%, transparent)",
      labelColor: "#ffffff",
    });
    expect(container.querySelector("text")!.getAttribute("fill")).toBe("#ffffff");
  });

  it("snaps its geometry to whole pixels", () => {
    const { container } = render(
      <svg>
        <TreemapCell depth={1} x={10.4} y={20.6} width={200.2} height={60.7} name="Groceries" fill="#332288" />
      </svg>,
    );
    const rect = container.querySelector("rect")!;
    expect(rect.getAttribute("x")).toBe("10");
    expect(rect.getAttribute("y")).toBe("21");
    expect(rect.getAttribute("width")).toBe("200");
    expect(rect.getAttribute("height")).toBe("61");
  });

  it("truncates a long name instead of running it over the neighbouring tiles", () => {
    const { container } = renderCell({ width: 70, height: 40, name: "Lebensmittel & Haushalt", fill: "#332288" });
    expect(container.querySelector("text")!.textContent).toMatch(/…$/);
  });

  it("draws no label on a tile too small to hold one", () => {
    const narrow = renderCell({ width: 30, height: 40, name: "Groceries", fill: "#332288" });
    expect(narrow.container.querySelector("text")).toBeNull();
    const short = renderCell({ width: 200, height: 12, name: "Groceries", fill: "#332288" });
    expect(short.container.querySelector("text")).toBeNull();
  });

  it("tags the label private only when the names are the user's own data", () => {
    const plain = renderCell({ width: 200, height: 60, name: "Groceries", fill: "#332288" });
    expect(plain.container.querySelector("text")).not.toHaveAttribute("data-private");
    const { container } = render(
      <svg>
        <TreemapCell depth={1} width={200} height={60} name="Edeka" fill="#332288" redactNames />
      </svg>,
    );
    expect(container.querySelector("text")).toHaveAttribute("data-private");
  });

  it("renders nothing for the synthetic root node", () => {
    const { container } = render(
      <svg>
        <TreemapCell depth={0} width={200} height={60} name="root" fill="#332288" />
      </svg>,
    );
    expect(container.querySelector("rect")).toBeNull();
  });

  it("is a named button, operable from the keyboard, when the chart takes clicks", () => {
    const onNodeClick = vi.fn();
    const { getByRole } = render(
      <svg>
        <TreemapCell depth={1} width={200} height={60} id="7" name="Rent" fill="#332288" onNodeClick={onNodeClick} />
      </svg>,
    );
    const tile = getByRole("button", { name: "Rent" });
    expect(tile).toHaveAttribute("tabindex", "0");
    fireEvent.click(tile);
    fireEvent.keyDown(tile, { key: "Enter" });
    fireEvent.keyDown(tile, { key: " " });
    expect(onNodeClick).toHaveBeenCalledTimes(3);
    expect(onNodeClick).toHaveBeenLastCalledWith("7", "Rent");
  });

  it("is not a button when nothing listens", () => {
    const { container } = renderCell({ width: 200, height: 60, name: "Rent", fill: "#332288" });
    expect(container.querySelector("[role=button]")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });
});

describe("TreemapCell's second line", () => {
  const cell = (props: { height: number; nodeNote?: (id: string) => string | undefined }) =>
    render(
      <svg stroke="#fff">
        <TreemapCell depth={1} width={200} name="Früchte" fill="#332288" id="fruit" redactNames {...props} />
      </svg>,
    );

  it("hangs the note under the name, with the same halo and no redaction", () => {
    const { container } = cell({ height: 60, nodeNote: () => "+100%" });
    const texts = [...container.querySelectorAll("text")];
    expect(texts.map((t) => t.textContent)).toEqual(["Früchte", "+100%"]);
    expect(texts[1]!.getAttribute("stroke")).toBe("#332288");
    expect(texts[1]!.getAttribute("paint-order")).toBe("stroke");
    // A ratio is not an amount; blurring it would hide the one figure left readable.
    expect(texts[1]).not.toHaveAttribute("data-private");
  });

  it("drops the note rather than hanging it off the bottom of a short tile", () => {
    const { container } = cell({ height: 26, nodeNote: () => "+100%" });
    expect([...container.querySelectorAll("text")].map((t) => t.textContent)).toEqual(["Früchte"]);
  });

  it("draws exactly one line for a caller that passes no note", () => {
    const { container } = cell({ height: 60 });
    expect(container.querySelectorAll("text")).toHaveLength(1);
  });
});

describe("fitLabel", () => {
  it("keeps a name that fits", () => {
    expect(fitLabel("Rent", 200, 12)).toBe("Rent");
  });

  it("ellipsises a name that does not, within the tile's character budget", () => {
    const max = Math.floor((70 - 12) / (12 * 0.58));
    const out = fitLabel("Lebensmittel & Haushalt", 70, 12)!;
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(max);
  });

  it("returns null when not even three characters fit", () => {
    expect(fitLabel("x", 30, 12)).toBeNull();
  });
});

describe("Treemap", () => {
  it("draws no chart-level stroke on its SVG", () => {
    // recharts spread a chart-level `stroke` onto its <svg>, from where it inherited into
    // every label (see TreemapCell); the map's own SVG carries none.
    const { container } = render(<Treemap data={DATA} />);
    expect(drawnTiles()).toHaveLength(2);
    expect(container.querySelector("svg")).not.toHaveAttribute("stroke");
  });

  it("lets a node carry its own colour, and otherwise takes the ramp by index", () => {
    render(<Treemap data={[{ ...DATA[0]!, fill: "#123456" }, DATA[1]!]} />);
    expect(fillOf(tileNamed("Groceries"))).toBe("#123456");
    // No token on <html> in jsdom: the built-in light ramp is the fallback.
    expect(fillOf(tileNamed("Rent"))).toBe(PALETTE_HEX.light[1]);
  });

  it("reads the live --chart-N tokens, and follows a palette switch", async () => {
    document.documentElement.style.setProperty("--chart-1", "#abcdef");
    render(<Treemap data={DATA} />);
    expect(fillOf(tileNamed("Groceries"))).toBe("#abcdef");
    // A MutationObserver reports on a microtask, so the act has to be async to see it.
    await act(async () => document.documentElement.style.setProperty("--chart-1", "#fedcba"));
    expect(fillOf(tileNamed("Groceries"))).toBe("#fedcba");
  });

  it("falls back to the dark ramp under .dark", () => {
    document.documentElement.classList.add("dark");
    render(<Treemap data={DATA} />);
    expect(fillOf(tileNamed("Groceries"))).toBe(PALETTE_HEX.dark[0]);
  });

  it("takes an explicit ramp over the tokens", () => {
    render(<Treemap data={DATA} colors={["#111111", "#222222"]} />);
    expect(drawnTiles().map(fillOf)).toEqual(["#111111", "#222222"]);
  });

  it("leaves non-positive nodes off without shifting anyone else's colour", () => {
    render(
      <Treemap
        colors={["#111111", "#222222", "#333333"]}
        data={[
          { id: "a", name: "A", value: 5 },
          { id: "b", name: "B", value: -3 },
          { id: "c", name: "C", value: 2 },
        ]}
      />,
    );
    expect(drawnTiles().map((g) => [g.getAttribute("aria-label")!.split(":")[0], fillOf(g)])).toEqual([
      ["A", "#111111"],
      ["C", "#333333"],
    ]);
  });

  it("draws nothing at all when nothing is drawable", () => {
    const { container } = render(<Treemap data={[{ id: "a", name: "A", value: 0 }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("draws at most maxTiles, in the order given", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: `N${i}`, value: 100 - i }));
    render(<Treemap data={many} maxTiles={24} />);
    expect(drawnTiles()).toHaveLength(24);
    expect(drawnTiles()[23]).toHaveAccessibleName(/^N23:/);
  });

  it("hands the formatter each value's share of what is drawn", () => {
    const valueFormatter = vi.fn((v: number, share: number | undefined) => `${v} · ${share}`);
    render(<Treemap data={DATA} valueFormatter={valueFormatter} />);
    expect(within(hover("Groceries")).getByText("120 · 0.12")).toBeInTheDocument();
  });

  it("prints a bare number when no formatter is given", () => {
    render(<Treemap data={DATA} />);
    expect(within(hover("Groceries")).getByText(new Intl.NumberFormat().format(120))).toBeInTheDocument();
  });

  it("forwards the tile options to the tiles", () => {
    const onNodeClick = vi.fn();
    const nodeNote = () => "new";
    render(<Treemap data={DATA} onNodeClick={onNodeClick} nodeNote={nodeNote} redactNames />);
    const groceries = screen.getByRole("button", { name: /^Groceries:/ });
    fireEvent.click(groceries);
    expect(onNodeClick).toHaveBeenCalledWith("1", "Groceries");
    const [label, note] = [...groceries.querySelectorAll("text")];
    expect(note).toHaveTextContent("new");
    expect(label).toHaveAttribute("data-private");
  });

  it("redacts the tooltip's name when the names are the user's own data", () => {
    render(<Treemap data={DATA} redactNames />);
    const tip = within(hover("Groceries"));
    expect(tip.getByText("Groceries").closest("[data-private]")).not.toBeNull();
  });

  it("leaves ordinary node names readable", () => {
    render(<Treemap data={DATA} />);
    const tip = within(hover("Groceries"));
    expect(tip.getByText("Groceries").closest("[data-private]")).toBeNull();
  });

  it("puts the caller's attributes and height on the chart root", () => {
    const { getByTestId } = render(<Treemap data={DATA} height={440} data-testid="map" />);
    expect(getByTestId("map")).toHaveStyle({ height: "440px" });
    expect(getByTestId("map")).toHaveAttribute("data-chart");
  });
});

describe("Treemap in RTL", () => {
  it("anchors a tile's labels at its right edge, shaped right-to-left", () => {
    // The tiles are laid out physically, but the chart's SVG is pinned `ltr`: without a
    // direction of its own, an Arabic name sat at the tile's LEFT edge with its ellipsis
    // on the wrong end.
    const { container } = render(
      <svg>
        <TreemapCell
          depth={1}
          x={10}
          y={0}
          width={200}
          height={60}
          name="البقالة"
          fill="#332288"
          id="1"
          nodeNote={() => "+12%"}
          dir="rtl"
        />
      </svg>,
    );
    const texts = [...container.querySelectorAll("text")];
    expect(texts).toHaveLength(2);
    for (const text of texts) {
      expect(text.getAttribute("x")).toBe(String(10 + 200 - 6));
      expect(text.getAttribute("direction")).toBe("rtl");
    }
  });

  it("stays at the left edge in LTR, which is the default", () => {
    const { container } = renderCell({ width: 200, height: 60, name: "Groceries", fill: "#332288" });
    const text = container.querySelector("text")!;
    expect(text.getAttribute("x")).toBe("6");
    expect(text.getAttribute("direction")).toBe("ltr");
  });

  it("reads the direction off its own root and hands it to its tiles", () => {
    const rtl = render(
      <div dir="rtl">
        <Treemap data={DATA} />
      </div>,
    );
    expect(rtl.container.querySelector("text")!.getAttribute("direction")).toBe("rtl");
    const ltr = render(<Treemap data={DATA} />);
    expect(ltr.container.querySelector("text")!.getAttribute("direction")).toBe("ltr");
  });
});

describe("Treemap passes labelColor through to its cells (0.8.1)", () => {
  it("draws each node's labelColor on its tile, and measures the ink of the rest", () => {
    render(
      <Treemap
        data={[
          {
            id: "a",
            name: "Newest",
            value: 10,
            fill: "color-mix(in srgb, var(--chart-1) 100%, transparent)",
            labelColor: "#ffffff",
          },
          { id: "b", name: "Oldest", value: 5 },
        ]}
      />,
    );
    expect(tileNamed("Newest").querySelector("text")!.getAttribute("fill")).toBe("#ffffff");
    expect(tileNamed("Oldest").querySelector("text")!.getAttribute("fill")).toBe(textOn(PALETTE_HEX.light[1]));
  });
});
