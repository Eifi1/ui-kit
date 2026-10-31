import type { ReactElement } from "react";
import { cloneElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Treemap } from "../treemap";
import type { TreemapLabels } from "../treemap-labels";

/**
 * What a render of the map costs its tiles (0.52, code review of feat/0.52.0).
 *
 * DSP-22 moved the tokens, the edge and the edge rule up into the map so a tile stops
 * resolving them itself. But the map then built its tile context, the `keys` inside it and
 * every tile's name afresh on each of its own renders: a page re-rendering the card, or one
 * arrow-key step (which moves the tab stop, a state of the map), re-rendered every tile and
 * ran `labels.tile` and two `Intl` formats per node again. A tile calls `nodeNote` on each
 * of its renders, so a spy there counts them. Real recharts at 800x300.
 */
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children, { width: 800, height: 300 } as never),
  };
});

const DATA = [
  { id: "rent", name: "Rent", value: 1200 },
  { id: "food", name: "Groceries", value: 600 },
  { id: "fun", name: "Leisure", value: 200 },
];

function spies() {
  const nodeNote = vi.fn((_id: string): string | undefined => undefined);
  const tile = vi.fn<TreemapLabels["tile"]>((name, value, share) => `${name}: ${value} (${share})`);
  // One object for the map's whole life, as a caller's constant is: a fresh one per render
  // is a new override, and the names follow it.
  const labels = { tile };
  return { nodeNote, tile, labels };
}

describe("Treemap's render cost", () => {
  it("draws no tile again when the page re-renders it with the same props", () => {
    const { nodeNote, tile, labels } = spies();
    const { rerender } = render(<Treemap data={DATA} nodeNote={nodeNote} labels={labels} />);
    expect(nodeNote).toHaveBeenCalled();
    nodeNote.mockClear();
    tile.mockClear();
    rerender(<Treemap data={DATA} nodeNote={nodeNote} labels={labels} />);
    expect(nodeNote).not.toHaveBeenCalled();
    expect(tile).not.toHaveBeenCalled();
  });

  it("names the tiles once, not again on every arrow-key step", () => {
    const { nodeNote, tile, labels } = spies();
    render(<Treemap data={DATA} nodeNote={nodeNote} labels={labels} />);
    const rent = screen.getByRole("img", { name: /^Rent:/ });
    act(() => rent.focus());
    tile.mockClear();
    nodeNote.mockClear();
    fireEvent.keyDown(rent, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("img", { name: /^Groceries:/ }));
    expect(tile).not.toHaveBeenCalled();
    // The stop moved, so a tile may draw again for its tabindex — once, not once per render
    // of everything above it.
    expect(nodeNote.mock.calls.length).toBeLessThanOrEqual(DATA.length);
  });
});
