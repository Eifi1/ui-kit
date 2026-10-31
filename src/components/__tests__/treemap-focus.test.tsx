import type { ReactElement } from "react";
import { Activity, cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Treemap } from "../treemap";
import { flushMicrotasks } from "../../test/tasks";

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

  // 0.52 code review (deep, charts), finding 3 of treemap.tsx: the path of a focused tile
  // that left was kept until the same path came back or the data changed. A map hidden
  // with no new data — `<Activity mode="hidden">`, a panel 0 wide — kept it, and the tile
  // took the focus back whenever it was shown again, from wherever the reader was then.
  it("gives no focus back to a tile that left without a relayout", async () => {
    const view = (mode: "visible" | "hidden") => (
      <>
        <button type="button">Elsewhere</button>
        <Activity mode={mode}>
          <Treemap data={DATA} />
        </Activity>
      </>
    );
    const { container, rerender } = render(view("visible"));
    act(() => tile(container, "Groceries").focus());
    rerender(view("hidden"));
    await flushMicrotasks();
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
    act(() => elsewhere.focus());
    rerender(view("visible"));
    expect(document.activeElement).toBe(elsewhere);
  });
});

// 0.52 code review (deep, charts), finding 1 of treemap.tsx: the arrows read the page's
// direction, but the tiles are laid out left to right in any (the plot is not mirrored,
// see `ChartContainer`): in an RTL page → walked the order backwards, against the picture.
describe("Treemap's arrows in a right-to-left page", () => {
  it("move with the picture, as SeriesChart's stops do", () => {
    const { container } = render(
      <div dir="rtl">
        <Treemap data={DATA} />
      </div>,
    );
    // Rent | Groceries | Leisure, left to right, as in a left-to-right page.
    const x = (name: string) => Number(tile(container, name).querySelector("rect")!.getAttribute("x"));
    expect(x("Rent")).toBeLessThan(x("Groceries"));
    act(() => tile(container, "Rent").focus());
    fireEvent.keyDown(tile(container, "Rent"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(tile(container, "Groceries"));
    fireEvent.keyDown(tile(container, "Groceries"), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tile(container, "Rent"));
  });
});

// 0.52 code review (deep, charts), finding 11 of treemap.tsx: the map kept one ref
// callback per path it had ever drawn, and never let one go — a long-lived map switching
// data (a month picker over payees) gathered one per payee it was ever shown. Counted on
// the Maps that are handed ref callbacks by path.
describe("Treemap's ref callbacks", () => {
  it("keeps one per node drawn, not one per node ever drawn", () => {
    const set = Map.prototype.set;
    const caches = new Set<Map<unknown, unknown>>();
    vi.spyOn(Map.prototype, "set").mockImplementation(function (this: Map<unknown, unknown>, key, value) {
      if (typeof key === "string" && key.startsWith("[") && typeof value === "function") caches.add(this);
      return set.call(this, key, value);
    });
    const month = (m: number) => DATA.map((d) => ({ ...d, id: `${d.id}-${m}`, name: `${d.name} ${m}` }));
    const { rerender } = render(<Treemap data={month(0)} />);
    for (let m = 1; m <= 12; m++) rerender(<Treemap data={month(m)} />);
    vi.restoreAllMocks();
    expect(caches.size).toBeGreaterThan(0);
    expect([...caches].reduce((sum, cache) => sum + cache.size, 0)).toBe(DATA.length);
  });
});
