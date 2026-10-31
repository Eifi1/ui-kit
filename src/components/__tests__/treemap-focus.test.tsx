import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Treemap } from "../treemap";

/**
 * The map's tab stop and the focus it holds (0.52 code review of treemap.tsx, findings 6
 * and 7). The stop lived in the tiles' context, so each arrow-key step was a new context
 * and every tile drew again. And recharts keys a node by where it is laid out
 * (`x-y-name`), so a relayout — new data, a resize — remounted the focused tile and the
 * focus fell to <body>. Real recharts at 800x300.
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
  { id: "rent", name: "Rent", value: 1200 },
  { id: "food", name: "Groceries", value: 600 },
  { id: "fun", name: "Leisure", value: 200 },
];

const tile = (container: HTMLElement, start: string) =>
  [...container.querySelectorAll<HTMLElement>("[aria-label]")].find((el) =>
    el.getAttribute("aria-label")!.startsWith(`${start}:`),
  )!;

describe("Treemap's tab stop", () => {
  it("draws no tile again for an arrow-key step", () => {
    const nodeNote = vi.fn((_id: string): string | undefined => undefined);
    const { container } = render(<Treemap data={DATA} nodeNote={nodeNote} />);
    act(() => tile(container, "Rent").focus());
    nodeNote.mockClear();
    fireEvent.keyDown(tile(container, "Rent"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(tile(container, "Groceries"));
    expect(nodeNote).not.toHaveBeenCalled();
    expect([...container.querySelectorAll('[tabindex="0"]')]).toEqual([tile(container, "Groceries")]);
  });

  it("keeps the focus on its tile when the map is laid out again", () => {
    const { container, rerender } = render(<Treemap data={DATA} />);
    const before = tile(container, "Leisure");
    act(() => before.focus());
    // Leisure grows to the largest: recharts lays it out elsewhere and remounts its node.
    rerender(
      <Treemap
        data={[
          { id: "rent", name: "Rent", value: 300 },
          { id: "food", name: "Groceries", value: 600 },
          { id: "fun", name: "Leisure", value: 1200 },
        ]}
      />,
    );
    const after = tile(container, "Leisure");
    expect(after).not.toBe(before);
    expect(document.activeElement).toBe(after);
    expect([...container.querySelectorAll('[tabindex="0"]')]).toEqual([after]);
  });
});
