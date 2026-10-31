import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Treemap } from "../treemap";

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
