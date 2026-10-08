import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BulkActionBar } from "../bulk-action-bar";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * Two phone-width layout faults found on the showcase at 390px. jsdom has no layout,
 * so these pin the classes that carry the fix rather than measured boxes:
 *
 *  - `fillHeight` bounded only the desktop table; the phone card list grew past its
 *    bounded parent and drew itself over whatever followed it.
 *  - BulkActionBar did not wrap, and its count (`flex-1`, a zero basis) was the one
 *    item that could shrink — to a sliver — while the actions ran out of the bar.
 */

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

/** The phone layout: `usePhoneLayout()`'s `(width < 768px)` matches, nothing else. */
function stubPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("width <"), // the phone layout's `(width < 768px)`
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("DataTable fillHeight on a phone", () => {
  const renderCards = (fillHeight: boolean) =>
    render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} fillHeight={fillHeight} />
      </MemoryRouter>,
    );

  it("makes the card list the scroller inside a flex column that fills the parent", () => {
    stubPhone();
    const { container } = renderCards(true);
    const list = container.querySelector("ul")!;
    expect(list).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
    // Every ancestor up to the root is a shrinkable flex column, or the bound is lost.
    expect(list.parentElement).toHaveClass("flex", "flex-col", "min-h-0", "flex-1");
    expect(list.parentElement!.parentElement).toHaveClass("flex", "flex-col", "min-h-0", "flex-1");
  });

  it("leaves the card list in the page's flow without fillHeight", () => {
    stubPhone();
    const { container } = renderCards(false);
    expect(container.querySelector("ul")).not.toHaveClass("overflow-y-auto");
  });
});

describe("BulkActionBar at phone width", () => {
  it.each(["inline", "sticky", "floating"] as const)("%s: wraps, and the count keeps its own width", (variant) => {
    render(
      <BulkActionBar variant={variant} count={3} onClear={() => {}}>
        <button type="button">Edit</button>
      </BulkActionBar>,
    );
    expect(screen.getByRole("toolbar")).toHaveClass("flex-wrap");
    const count = screen.getByText("3 selected", { selector: "span" });
    expect(count).toHaveClass("flex-auto");
    expect(count).not.toHaveClass("flex-1");
  });
});
