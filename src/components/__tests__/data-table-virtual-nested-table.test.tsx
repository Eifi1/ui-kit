import { useMemo, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * 0.52 code review, data-table-row.tsx: every desktop row carries `data-row-index` since
 * DSP-4 (the window's rows had it alone before), and `virtualize`'s window found its rows
 * with selectors that search the whole subtree — so a DataTable in a virtualized table's
 * open row answered for the outer one. ArrowDown from the outer row 0 went to the nested
 * row 1 (first in document order), a focus in the nested row 2 pinned the outer row 2,
 * and the focus a deleted row left went into the nested table. The window reads its own
 * rows only.
 *
 * jsdom lays nothing out: the geometry is data-table-virtual.test.tsx's model.
 */

interface Row {
  id: number;
  name: string;
}
const ROW_H = 40;
const HEAD_H = 40;
const VIEW_H = 400;

const rect = (top: number, height: number) =>
  ({ top, bottom: top + height, height, left: 0, right: 800, width: 800, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;

beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this instanceof HTMLElement && this.querySelector(":scope > table[data-virtualized]")) return rect(0, VIEW_H);
    if (this.matches("tbody[data-vt-body]")) {
      const sc = this.closest("table[data-virtualized]")?.parentElement;
      return rect(HEAD_H - (sc?.scrollTop ?? 0), 0);
    }
    return rect(0, 0);
  });
});
afterEach(() => vi.restoreAllMocks());

const NESTED: Row[] = [0, 1, 2].map((i) => ({ id: i, name: `Part ${i}` }));
const nestedColumns: DataTableColumn<Row>[] = [{ key: "name", header: "Part", cell: (r) => r.name }];

function Host({ count = 1000 }: { count?: number }) {
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: count }, (_, i) => ({ id: i, name: `Row ${i}` })));
  const columns = useMemo<DataTableColumn<Row>[]>(
    () => [
      { key: "name", header: "Name", cell: (r) => r.name },
      {
        key: "del",
        header: "Delete",
        noRowLink: true,
        cell: (r) => (
          <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}>
            Delete {r.name}
          </button>
        ),
      },
    ],
    [],
  );
  return (
    <MemoryRouter>
      <DataTable<Row>
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        paginated={false}
        virtualize={{ estimateRowHeight: ROW_H, overscan: 5 }}
        onRowClick={() => {}}
        // Row 0 stays open, with a table of its own parts.
        isExpanded={(r) => r.id === 0}
        expandedRow={() => (
          <DataTable<Row> rows={NESTED} columns={nestedColumns} rowKey={(r) => r.id} onRowClick={() => {}} />
        )}
      />
    </MemoryRouter>
  );
}

const outer = () => screen.getAllByRole("table")[0];
const outerRow = (i: number) => outer().querySelector<HTMLElement>(`:scope > tbody > tr[data-row-index="${i}"]`)!;
const nestedRow = (i: number) =>
  outer().querySelector<HTMLElement>(`tr[data-row-detail] table tr[data-row-index="${i}"]`)!;
const outerIndices = () =>
  [...outer().querySelectorAll<HTMLElement>(":scope > tbody > tr[data-row-index]")].map((tr) =>
    Number(tr.dataset.rowIndex),
  );
const outerScroller = () => outer().parentElement as HTMLElement;

describe("a DataTable in a virtualized table's open row (0.52 code review, data-table-row.tsx)", () => {
  it("ArrowDown from the outer row 0 goes to the outer row 1, not the nested one", () => {
    render(<Host />);
    expect(nestedRow(1)).not.toBeNull();
    act(() => outerRow(0).focus());
    act(() => {
      fireEvent.keyDown(outerRow(0), { key: "ArrowDown" });
    });
    expect(document.activeElement).toBe(outerRow(1));
  });

  it("a focus in the nested row 2 keeps the outer row 0 (its open row) drawn, not the outer row 2", () => {
    render(<Host />);
    act(() => nestedRow(2).focus());
    act(() => {
      outerScroller().scrollTop = 800 * ROW_H;
      fireEvent.scroll(outerScroller());
    });
    const shown = outerIndices();
    expect(shown).toContain(0);
    expect(shown).toContain(805);
    expect(shown).not.toContain(2);
  });

  it("the focus a deleted outer row leaves goes to the outer row now in its place", () => {
    render(<Host />);
    const del = screen.getByRole("button", { name: "Delete Row 1" });
    act(() => del.focus());
    fireEvent.click(del);
    expect(screen.queryByRole("button", { name: "Delete Row 1" })).toBeNull();
    expect(document.activeElement).toBe(outerRow(1));
    expect(outerRow(1)).toHaveTextContent("Row 2");
  });
});
