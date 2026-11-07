import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn, type DataTableProps } from "../data-table";

/**
 * `selection.onFilteredRowsChange` (0.57, keksdose dev #663): the rows the table's OWN
 * filters keep, told to the owner — what its select-all takes and its bulk action acts
 * on. The feedback inbox's select-all under a status filter selected the rows the filter
 * hid too, since `onToggleAll` says only "checked" and the filters are the table's.
 */

interface Row {
  id: number;
  name: string;
  kind: string;
}

const ROWS: Row[] = [
  { id: 1, name: "Alpha", kind: "a" },
  { id: 2, name: "Bravo", kind: "b" },
  { id: 3, name: "Charlie", kind: "a" },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  { key: "kind", header: "Kind", cell: (r) => r.kind, filter: { type: "select", getValue: (r) => r.kind } },
];

function table(rows: readonly Row[], told: (rows: readonly Row[]) => void, url = "/") {
  const selection: DataTableProps<Row>["selection"] = {
    isSelected: () => false,
    onToggle: () => {},
    allSelected: false,
    someSelected: false,
    onToggleAll: () => {},
    onFilteredRowsChange: told,
  };
  return (
    <MemoryRouter initialEntries={[url]}>
      <DataTable rows={rows} columns={COLUMNS} rowKey={(r) => r.id} urlSync selection={selection} />
    </MemoryRouter>
  );
}

afterEach(() => {
  localStorage.clear();
});

describe("selection.onFilteredRowsChange", () => {
  it("tells the owner the rows its filters keep — every page, not the rows it was given", () => {
    const told = vi.fn();
    render(table(ROWS, told, "/?f.kind=a"));
    expect(told).toHaveBeenCalledTimes(1);
    expect(told.mock.calls[0][0].map((r: Row) => r.name)).toEqual(["Alpha", "Charlie"]);
  });

  it("tells it again when the set changes, and not for a fresh array of the same rows", () => {
    const told = vi.fn();
    const view = render(table(ROWS, told));
    expect(told).toHaveBeenCalledTimes(1);
    // `list.data ?? []` while a query refetches: a new array, the same rows.
    view.rerender(table([...ROWS], told));
    expect(told).toHaveBeenCalledTimes(1);
    view.rerender(table(ROWS.slice(1), told));
    expect(told).toHaveBeenCalledTimes(2);
    expect(told.mock.calls[1][0].map((r: Row) => r.name)).toEqual(["Bravo", "Charlie"]);
  });
});
