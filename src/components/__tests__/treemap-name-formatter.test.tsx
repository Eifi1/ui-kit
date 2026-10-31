import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Treemap } from "../treemap";

/**
 * A tile's accessible name and a host's `valueFormatter`. DSP-5 asked the formatter for
 * the name's value with the share `undefined` — which, with anything drawn, it had never
 * been before 0.52 — and a formatter written to that (`share!`) printed "NaN%" into every
 * name or threw and took the chart down (0.52 code review of treemap.tsx, finding 2). A
 * guard caught both; the deep review (charts, finding 13) took the cause out instead: the
 * name asks the formatter as the tooltip does, with the node's real share — every named
 * node has one. Real recharts at 800x300.
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

const names = () => screen.getAllByRole("img").map((t) => t.getAttribute("aria-label"));

describe("Treemap's names and the caller's valueFormatter", () => {
  it("hands the formatter the node's share of what is drawn, as the tooltip does", () => {
    const valueFormatter = vi.fn((v: number, s: number | undefined) => `€${v} · ${(s! * 100).toFixed(0)}%`);
    render(<Treemap data={DATA} valueFormatter={valueFormatter} />);
    expect(names()).toContain("Rent: €1200 · 60% (60%)");
    expect(names()).toContain("Leisure: €200 · 10% (10%)");
    expect(valueFormatter).not.toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("hands a group and a tile inside one their shares of the whole picture", () => {
    const valueFormatter = vi.fn((v: number, s: number | undefined) => `${v}=${s}`);
    render(
      <Treemap
        data={[
          {
            id: "home",
            name: "Home",
            value: 1800,
            children: [
              { id: "rent", name: "Rent", value: 1200 },
              { id: "food", name: "Groceries", value: 600 },
            ],
          },
          { id: "fun", name: "Leisure", value: 200 },
        ]}
        valueFormatter={valueFormatter}
      />,
    );
    expect(valueFormatter).toHaveBeenCalledWith(1800, 0.9);
    expect(valueFormatter).toHaveBeenCalledWith(1200, 0.6);
    expect(valueFormatter).not.toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("says a value the formatter gives as markup as the number", () => {
    render(<Treemap data={DATA} valueFormatter={(v) => <b>€{v}</b>} />);
    expect(names()).toContain("Rent: 1,200 (60%)");
  });
});
