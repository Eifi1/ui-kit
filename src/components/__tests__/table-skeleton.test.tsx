import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { TableSkeleton } from "../table-skeleton";

/**
 * 0.48 (keksdose dev #628): the table/list loading preset. keksdose hand-built three —
 * TabSkeleton (tiles + a list or a chart), BudgetSkeleton (groups of rows with three
 * figures each) and VarianceHeatmapSkeleton (a label column and a grid of blocks) — each
 * with its own sr-only "Loading…". The preset says it ONCE.
 */
const rowsOf = (c: HTMLElement) => c.querySelectorAll('[data-skeleton-row=""]');

describe("TableSkeleton (0.48, keksdose #628)", () => {
  it("is ONE status region with the kit's 'Loading…'; every placeholder is hidden", () => {
    const { container } = render(<TableSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/^Loading…$/);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    const art = status.querySelector('[aria-hidden="true"]')!;
    expect(art).not.toBeNull();
    for (const el of container.querySelectorAll("[data-skeleton]")) {
      expect(el.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it("takes the provider's loading label, and a label of its own over that", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ common: { loading: "Laden…" } }}>
        <TableSkeleton />
      </UiKitProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Laden…");
    rerender(<TableSkeleton label="Loading the budget…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the budget…");
  });

  it("list: rows × columns — a name bar, then the figures at the row's end", () => {
    const { container } = render(<TableSkeleton rows={6} columns={2} />);
    const rows = rowsOf(container);
    expect(rows).toHaveLength(6);
    expect(rows[0].querySelectorAll("[data-skeleton]")).toHaveLength(2);
    // Two columns stay on one line on a phone too (TabSkeleton's list).
    expect(rows[0]).not.toHaveClass("max-sm:flex-col");
  });

  it("list with three figures or more: the figures go under the name on a phone", () => {
    const { container } = render(<TableSkeleton rows={4} columns={4} />);
    const row = rowsOf(container)[0];
    expect(row.querySelectorAll("[data-skeleton]")).toHaveLength(4);
    expect(row).toHaveClass("max-sm:flex-col");
  });

  it("groups: a header bar over each group's rows (BudgetSkeleton)", () => {
    const { container } = render(<TableSkeleton groups={2} rows={4} columns={4} />);
    expect(container.querySelectorAll('[data-skeleton-group=""]')).toHaveLength(2);
    expect(rowsOf(container)).toHaveLength(8);
  });

  it("grid: a label column, then one block per column, clipped (VarianceHeatmapSkeleton)", () => {
    const { container } = render(<TableSkeleton variant="grid" rows={8} columns={16} />);
    const rows = rowsOf(container);
    expect(rows).toHaveLength(8);
    expect(rows[0].querySelectorAll("[data-skeleton]")).toHaveLength(16);
    expect(rows[0].parentElement).toHaveClass("overflow-hidden");
  });

  it("tiles and heading: a row of tile outlines above, a title and hint over the rows", () => {
    const { container } = render(<TableSkeleton tiles={3} heading />);
    expect(container.querySelectorAll('[data-skeleton-tile=""]')).toHaveLength(3);
    expect(container.querySelector('[data-skeleton-heading=""]')).not.toBeNull();
  });

  it("reduced motion: every placeholder drops its pulse", () => {
    const { container } = render(<TableSkeleton tiles={2} heading groups={1} />);
    for (const el of container.querySelectorAll("[data-skeleton]")) {
      expect(el).toHaveClass("motion-reduce:animate-none");
    }
  });

  it("framed by default; `framed={false}` drops the border; ref and props go to the region", () => {
    const ref = createRef<HTMLDivElement>();
    const { container, rerender } = render(<TableSkeleton ref={ref} data-testid="sk" className="mt-4" />);
    expect(ref.current).toBe(screen.getByRole("status"));
    expect(ref.current).toHaveClass("mt-4");
    expect(screen.getByTestId("sk")).toBe(ref.current);
    expect(container.querySelector('[data-skeleton-panel=""]')).toHaveClass("border");
    rerender(<TableSkeleton framed={false} />);
    expect(container.querySelector('[data-skeleton-panel=""]')).not.toHaveClass("border");
  });
});
