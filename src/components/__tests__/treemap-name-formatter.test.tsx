import type { ReactElement } from "react";
import { cloneElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Treemap } from "../treemap";

/**
 * A tile's accessible name and a host's `valueFormatter` (0.52 code review of
 * treemap.tsx, finding 2). DSP-5 asked the formatter for the name's value with the share
 * `undefined` — which, with anything drawn, it had never been before 0.52. A formatter
 * written to that (`share!`) printed "NaN%" into every name, or threw inside the names'
 * memo and took the whole chart down. Real recharts at 800x300.
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

describe("Treemap's names and a formatter that relies on the share", () => {
  it("never says NaN", () => {
    render(<Treemap data={DATA} valueFormatter={(v, s) => `€${v} · ${(s! * 100).toFixed(0)}%`} />);
    expect(names().join(" | ")).not.toContain("NaN");
    expect(names()).toContain("Rent: 1,200 (60%)");
  });

  it("still draws when the formatter throws without a share", () => {
    const throwing = (v: number, s: number | undefined) => `€${v} (${s!.toFixed(2)})`;
    expect(() => render(<Treemap data={DATA} valueFormatter={throwing} />)).not.toThrow();
    expect(names()).toContain("Rent: 1,200 (60%)");
  });

  it("keeps the caller's own words where its formatter gives them without a share", () => {
    render(<Treemap data={DATA} valueFormatter={(v, s) => (s === undefined ? `CHF ${v}` : `CHF ${v} · ${s}`)} />);
    expect(names()).toContain("Rent: CHF 1200 (60%)");
  });
});
