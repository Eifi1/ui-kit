import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Treemap } from "../treemap";

/**
 * `maxTiles` that is not a whole number (0.52 code review of treemap.tsx, finding 4).
 * Up to 0.51 the cap was `slice(0, maxTiles)`: 2.5 drew 2 tiles and NaN none. The count
 * across groups (0.52) drew 3 for 2.5 and every tile for NaN. Real recharts at 800x300.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

afterEach(() => cleanup());

const DATA = [
  { id: "a", name: "A", value: 40 },
  { id: "b", name: "B", value: 30 },
  { id: "c", name: "C", value: 20 },
  { id: "d", name: "D", value: 10 },
];

describe("Treemap's maxTiles", () => {
  it("draws the whole tiles a fraction allows, as slice() did", () => {
    render(<Treemap data={DATA} maxTiles={2.5} />);
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("draws nothing for NaN, as slice() did", () => {
    const { container } = render(<Treemap data={DATA} maxTiles={Number.NaN} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("draws every tile for Infinity", () => {
    render(<Treemap data={DATA} maxTiles={Number.POSITIVE_INFINITY} />);
    expect(screen.getAllByRole("img")).toHaveLength(4);
  });

  // 0.52 code review (deep, charts), finding 2 of treemap.tsx: `slice(0, maxTiles ?? undefined)`
  // read null as no cap; the whole-tile count made it Math.floor(null) — 0, and an empty
  // card. A JS caller, or a `number | null` setting cast through.
  it("draws every tile for null, as slice() did", () => {
    render(<Treemap data={DATA} maxTiles={null as unknown as number} />);
    expect(screen.getAllByRole("img")).toHaveLength(4);
  });
});
