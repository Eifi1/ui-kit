import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Treemap, type TreemapNode } from "../treemap";

/**
 * A group and a tile with the same id (0.52 code review of treemap.tsx, finding 3). Ids
 * from two tables — chain 12 and shop 12 — meet in one map once shops are grouped by
 * chain; the map's keyboard keyed both on "12", so the map had two tab stops, the frame
 * took the tile's name, and the arrows stuck. Real recharts at 800x300.
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

const DATA: TreemapNode[] = [
  {
    id: "12",
    name: "Chain",
    value: 8,
    children: [
      { id: "12", name: "Shop", value: 5 },
      { id: "13", name: "Other shop", value: 3 },
    ],
  },
];

const byName = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll<HTMLElement>("[aria-label]")].filter((el) => el.getAttribute("aria-label") === name);

describe("Treemap with a group and a tile of one id", () => {
  it("names each, and keeps ONE tab stop", () => {
    const { container } = render(<Treemap data={DATA} />);
    expect(byName(container, "Chain, group: 8 (100%)")).toHaveLength(1);
    expect(byName(container, "Shop: 5 (63%), in Chain")).toHaveLength(1);
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
  });

  it("walks frame, tile and tile with the arrows", () => {
    const { container } = render(<Treemap data={DATA} />);
    const [chain] = byName(container, "Chain, group: 8 (100%)");
    act(() => chain!.focus());
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(byName(container, "Shop: 5 (63%), in Chain")[0]);
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(byName(container, "Other shop: 3 (38%), in Chain")[0]);
  });
});
