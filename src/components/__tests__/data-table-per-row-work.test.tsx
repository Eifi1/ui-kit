import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn, FilterState } from "../data-table";

/**
 * Work a table did once per ROW where once per change would do (0.52 code review,
 * data-table.tsx and data-table-filters.ts):
 *
 * - the focused row's note (DSP-4) looked its key up with a `findIndex` that called
 *   `rowKey` on every row — at each focus, and in every commit while a row was noted — and
 *   the roving tab stop checked its key with a `some` on every render, and the window's
 *   model was rebuilt with the groups the table builds afresh on every render: under
 *   `virtualize`, 3000 rows, 21 053 `rowKey` calls per arrow step at the bottom of the
 *   table (57 now);
 * - the text filter folded the query again for every row it tested: 1000 rows, 1000
 *   extra folds per keystroke.
 *
 * jsdom lays nothing out: the window's geometry is data-table-virtual.test.tsx's model.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 3000 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, filterBy: (r) => r.name },
  { key: "id", header: "Id", cell: (r) => String(r.id) },
];

const rect = (top: number, height: number) =>
  ({ top, bottom: top + height, height, left: 0, right: 800, width: 800, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this instanceof HTMLElement && this.querySelector(":scope > table[data-virtualized]")) return rect(0, 400);
    if (this.matches("tbody[data-vt-body]")) {
      const sc = this.closest("table[data-virtualized]")?.parentElement;
      return rect(40 - (sc?.scrollTop ?? 0), 0);
    }
    return rect(0, 0);
  });
});
afterEach(() => vi.restoreAllMocks());

describe("the focused row's note costs a lookup, not a pass over the rows (0.52 code review)", () => {
  it("an arrow step at the bottom of 3000 virtualized rows calls rowKey for the rows drawn, not all", () => {
    const rowKey = vi.fn((r: Row) => r.id);
    render(
      <MemoryRouter>
        <DataTable<Row>
          rows={ROWS}
          columns={columns}
          rowKey={rowKey}
          paginated={false}
          virtualize={{ estimateRowHeight: 40, overscan: 5 }}
          onRowClick={() => {}}
        />
      </MemoryRouter>,
    );
    const first = screen.getByRole("table").querySelector<HTMLElement>('tr[data-row-index="0"]')!;
    act(() => first.focus());
    act(() => {
      fireEvent.keyDown(first, { key: "End" });
    });
    expect((document.activeElement as HTMLElement).dataset.rowIndex).toBe("2999");
    rowKey.mockClear();
    act(() => {
      fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    });
    expect((document.activeElement as HTMLElement).dataset.rowIndex).toBe("2998");
    expect(rowKey.mock.calls.length).toBeLessThan(300);
  });
});

describe("the text filter folds its query once per change, not once per row (0.52 code review)", () => {
  it("1000 rows, a new query: one fold per row's value and one for the query", () => {
    const rows = ROWS.slice(0, 1000);
    const ui = (q: string) => (
      <MemoryRouter>
        <DataTable<Row>
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          filters={{ name: { type: "text", q } } satisfies FilterState}
          onFiltersChange={() => {}}
        />
      </MemoryRouter>
    );
    const { rerender } = render(ui("row 1"));
    const fold = vi.spyOn(String.prototype, "toLocaleLowerCase");
    rerender(ui("row 2"));
    expect(fold.mock.calls.length).toBeGreaterThanOrEqual(1000);
    expect(fold.mock.calls.length).toBeLessThan(1100);
  });
});
