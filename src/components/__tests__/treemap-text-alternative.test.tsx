import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Treemap } from "../treemap";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * Refactor audit 2026-10-30, DSP-5: a Treemap's values lived only in the pointer's
 * tooltip, and a clickable tile was named by its name alone; a map nobody clicks was
 * nothing to a screen reader. PieChart is the model: a named figure, every tile named
 * "name: value (share)" behind ONE tab stop. Real recharts at a fixed 800x300 (the
 * mocked one in `treemap.test.tsx` draws no tiles).
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

afterEach(() => {
  vi.restoreAllMocks();
});

const tiles = (role: "img" | "button" = "img") => screen.getAllByRole(role);
const names = (role: "img" | "button" = "img") => tiles(role).map((tile) => tile.getAttribute("aria-label"));

describe("Treemap as a figure", () => {
  it("is a figure named by `aria-label` and described by `description`", () => {
    render(<Treemap data={DATA} aria-label="Spending by category" description="Rent is three fifths." />);
    expect(screen.getByRole("figure", { name: "Spending by category" })).toHaveAccessibleDescription(
      "Rent is three fifths.",
    );
  });

  // 0.52 code review (deep, charts), finding 7: the description was a `hidden` sibling
  // AFTER the figure, so the chart stopped being its parent's last child and a stack's
  // `space-y-*` / `divide-y` put a margin or a rule under it that it never had.
  it("holds its description inside, and stays its parent's last child", () => {
    const { container } = render(
      <div>
        <p>Above</p>
        <Treemap data={DATA} aria-label="Spending" description="Rent is three fifths." aria-describedby="note" />
      </div>,
    );
    const figure = screen.getByRole("figure", { name: "Spending" });
    expect(container.firstElementChild!.lastElementChild).toBe(figure);
    expect(figure.getAttribute("aria-describedby")!.split(" ")[0]).toBe("note");
    expect(figure.querySelector(`[id="${figure.getAttribute("aria-describedby")!.split(" ")[1]}"]`)).toHaveTextContent(
      "Rent is three fifths.",
    );
  });
});

describe("Treemap's tiles", () => {
  it("names every tile with its value and share, as an image nobody clicks", () => {
    render(<Treemap data={DATA} />);
    expect(names().sort()).toEqual(["Groceries: 600 (30%)", "Leisure: 200 (10%)", "Rent: 1,200 (60%)"]);
  });

  it("is ONE tab stop, walked with the arrows in the order given", () => {
    const { container } = render(<Treemap data={DATA} />);
    const byName = (name: string) => screen.getByRole("img", { name: new RegExp(`^${name}:`) });
    expect([...container.querySelectorAll('[tabindex="0"]')]).toEqual([byName("Rent")]);
    act(() => byName("Rent").focus());
    fireEvent.keyDown(byName("Rent"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(byName("Groceries"));
    fireEvent.keyDown(byName("Groceries"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(byName("Leisure"));
    fireEvent.keyDown(byName("Leisure"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(byName("Leisure"));
    fireEvent.keyDown(byName("Leisure"), { key: "Home" });
    expect(document.activeElement).toBe(byName("Rent"));
    fireEvent.keyDown(byName("Rent"), { key: "End" });
    expect(document.activeElement).toBe(byName("Leisure"));
    expect([...container.querySelectorAll('[tabindex="0"]')]).toEqual([byName("Leisure")]);
  });

  it("names a clickable tile the same way, and Enter activates it", () => {
    const onNodeClick = vi.fn();
    const { container } = render(<Treemap data={DATA} onNodeClick={onNodeClick} />);
    expect(names("button").sort()).toEqual(["Groceries: 600 (30%)", "Leisure: 200 (10%)", "Rent: 1,200 (60%)"]);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    const groceries = screen.getByRole("button", { name: /^Groceries/ });
    act(() => groceries.focus());
    fireEvent.keyDown(groceries, { key: "Enter" });
    expect(onNodeClick).toHaveBeenCalledWith("food", "Groceries");
  });

  it("says the value the caller formats, asked with its share as the tooltip asks", () => {
    const valueFormatter = vi.fn((v: number, _share: number | undefined) => `CHF ${v}`);
    render(<Treemap data={DATA} valueFormatter={valueFormatter} />);
    expect(screen.getByRole("img", { name: "Rent: CHF 1200 (60%)" })).toBeInTheDocument();
    expect(valueFormatter).toHaveBeenCalledWith(1200, 0.6);
  });

  it("takes the provider's locale and words (DOC-10: the default number was the runtime's)", () => {
    render(
      <UiKitProvider
        locale="de-CH"
        labels={{ treemap: { tile: (name, value, share) => `${name}, ${value}, ${share}` } }}
      >
        <Treemap data={DATA} />
      </UiKitProvider>,
    );
    const swiss = new Intl.NumberFormat("de-CH").format(1200);
    const share = new Intl.NumberFormat("de-CH", { style: "percent" }).format(0.6);
    expect(swiss).not.toBe("1,200");
    expect(screen.getByRole("img", { name: `Rent, ${swiss}, ${share}` })).toBeInTheDocument();
  });

  // Refactor audit 2026-10-30, DSP-22: every tile subscribed to three stores, each with a
  // MutationObserver on <html> — 72 for a 24-tile map — and re-read up to 29 custom
  // properties on each of its renders. The map resolves them once and hands them down.
  it("watches <html> from the map, not from every tile", () => {
    const observe = vi.spyOn(MutationObserver.prototype, "observe");
    const map = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `n${i}`, name: `Node ${i}`, value: n - i }));
    const one = render(<Treemap data={map(1)} />);
    const forOne = observe.mock.calls.length;
    one.unmount();
    observe.mockClear();
    render(<Treemap data={map(24)} />);
    expect(tiles()).toHaveLength(24);
    expect(observe.mock.calls.length).toBe(forOne);
  });
});
