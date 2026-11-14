import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Treemap, type TreemapNode } from "../treemap";

/**
 * `showValues` (0.64, keksdose live #517, Marcel: the absolute and relative amount next to
 * the tile's title). On a phone the amount lived only in the hover tooltip, and a tap drills
 * in, so a map at 406px said names alone. The value is drawn as a second, smaller line under
 * the name — the `valueFormatter`'s text, tagged `data-private` as the tooltip's value cell —
 * where the tile has the room for it whole. Real layout at a fixed 800x300, as in
 * `treemap-share-in-value.test.tsx`.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const DATA: TreemapNode[] = [
  { id: "rent", name: "Rent", value: 1200 },
  { id: "food", name: "Groceries", value: 600 },
  { id: "fun", name: "Leisure", value: 200 },
];

const chf = (value: number, share: number | undefined) =>
  `CHF ${value.toFixed(2)} · ${((share ?? 0) * 100).toFixed(1)}%`;

/** The texts a tile draws, top to bottom, by its accessible name's start. */
function lines(name: string): SVGTextElement[] {
  const tile = screen.getByRole("img", { name: new RegExp(`^${name}:`) });
  return [...tile.querySelectorAll("text")].sort((a, b) => Number(a.getAttribute("y")) - Number(b.getAttribute("y")));
}

describe("Treemap showValues", () => {
  it("draws the formatter's text under the name, smaller and tagged private", () => {
    render(<Treemap data={DATA} valueFormatter={chf} showValues />);
    const [name, value] = lines("Rent");
    expect(name).toHaveTextContent("Rent");
    expect(value).toHaveTextContent("CHF 1200.00 · 60.0%");
    expect(value).toHaveAttribute("data-private");
    expect(name).not.toHaveAttribute("data-private");
    expect(Number(value!.getAttribute("font-size"))).toBeLessThan(Number(name!.getAttribute("font-size")));
    expect(lines("Groceries")[1]).toHaveTextContent("CHF 600.00 · 30.0%");
  });

  it("draws the default number without a formatter, and nothing without the option", () => {
    const { unmount } = render(<Treemap data={DATA} showValues />);
    expect(lines("Rent")[1]).toHaveTextContent("1,200");
    unmount();
    render(<Treemap data={DATA} valueFormatter={chf} />);
    expect(lines("Rent")).toHaveLength(1);
  });

  it("drops a value that does not fit whole, never an ellipsis, and keeps the name", () => {
    const long = (value: number) => `CHF ${value.toFixed(2)} of everything you spent this month on it`;
    render(<Treemap data={DATA} valueFormatter={long} showValues />);
    const leisure = lines("Leisure");
    expect(leisure).toHaveLength(1);
    expect(leisure[0]).toHaveTextContent("Leisure");
    expect(document.body.textContent).not.toContain("…");
  });

  it("draws no value a formatter gives as markup: an SVG text holds none", () => {
    render(<Treemap data={DATA} valueFormatter={(v) => <b>{v}</b>} showValues />);
    expect(lines("Rent")).toHaveLength(1);
  });

  it("puts a note on a third line under the value where the tile has the room", () => {
    render(<Treemap data={DATA} valueFormatter={chf} showValues nodeNote={() => "+12%"} />);
    const [name, value, note] = lines("Rent");
    expect(name).toHaveTextContent("Rent");
    expect(value).toHaveTextContent("CHF 1200.00");
    expect(note).toHaveTextContent("+12%");
    expect(note).not.toHaveAttribute("data-private");
    expect(Number(note!.getAttribute("y"))).toBeGreaterThan(Number(value!.getAttribute("y")));
  });

  it("keeps a group's band to its name", () => {
    const grouped: TreemapNode[] = [
      { id: "home", name: "Home", value: 1800, children: DATA.slice(0, 2) },
      { id: "fun", name: "Leisure", value: 200 },
    ];
    render(<Treemap data={grouped} valueFormatter={chf} showValues />);
    const band = screen.getByRole("img", { name: /^Home, group:/ });
    const own = [...band.querySelectorAll(":scope > text")];
    expect(own).toHaveLength(1);
    expect(own[0]).toHaveTextContent("Home");
    expect(lines("Rent")[1]).toHaveTextContent("CHF 1200.00");
  });
});
