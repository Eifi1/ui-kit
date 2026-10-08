import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable, DEFAULT_DATA_TABLE_SORT_LABELS } from "../data-table";
import type { DataTableColumn, DataTableProps, SortState } from "../data-table";
import type { DataTableLabels } from "../data-table-labels";

/**
 * keksdose K10 — the phone card list's "Sort by" control. The card list has no header
 * row, so the sort the headers carry was unreachable on a phone; keksdose's aggregated
 * report tables hand-built a select + direction button over their DataTable (#258).
 * `mobileSort` is that row, on the table's own sort state.
 */

interface Row {
  id: number;
  name: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: 1, name: "Alpha", amount: 10 },
  { id: 2, name: "Bravo", amount: 30 },
  { id: 3, name: "Charlie", amount: 20 },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name, mobilePrimary: true },
  {
    key: "amount",
    header: <span>Amount €</span>,
    headerText: "Amount",
    cell: (r) => r.amount,
    sortBy: (r) => r.amount,
    firstSort: "desc",
  },
  // Not sortable: never offered.
  { key: "note", header: "Note", cell: () => "–" },
];

/** A matchMedia whose answer the test can change, with the change event the hook listens for. */
function stubViewport(initialWide: boolean) {
  let wide = initialWide;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    // Wide: `md` matches; narrow: the phone layout's `(width < 768px)` does.
    get matches() {
      return wide !== query.includes("width <");
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }));
  return (next: boolean) => {
    wide = next;
    act(() => {
      for (const cb of listeners) cb();
    });
  };
}

function renderTable(extra: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} mobileSort {...extra} />
    </MemoryRouter>,
  );
}

const sortSelect = () => screen.getByRole("combobox", { name: "Sort by" }) as HTMLSelectElement;
const optionTexts = () => within(sortSelect()).getAllByRole("option").map((o) => o.textContent);
/** The card list's names, top to bottom. */
const cardNames = () =>
  screen
    .getAllByRole("listitem")
    .map((li) => li.textContent ?? "")
    .map((t) => ["Alpha", "Bravo", "Charlie"].find((n) => t.includes(n)))
    .filter(Boolean);
/** The live region speaks 50 ms after the change. */
const announced = (text: string) =>
  waitFor(() => expect(screen.getAllByRole("status").some((s) => s.textContent === text)).toBe(true));
const pick = (key: string) => fireEvent.change(sortSelect(), { target: { value: key } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DataTable mobileSort", () => {
  it("is off by default", () => {
    stubViewport(false);
    renderTable({ mobileSort: undefined });
    expect(screen.queryByRole("combobox", { name: "Sort by" })).toBeNull();
  });

  it("offers the sortable columns, named by headerText or the string header", () => {
    stubViewport(false);
    renderTable();
    expect(optionTexts()).toEqual([DEFAULT_DATA_TABLE_SORT_LABELS.sortDefault, "Name", "Amount"]);
    expect(sortSelect().value).toBe("");
    // Nothing to flip yet.
    expect(screen.getByRole("button", { name: "Ascending" })).toBeDisabled();
  });

  it("sorts the cards: a picked column starts in its firstSort, the button flips it", async () => {
    stubViewport(false);
    renderTable();
    expect(cardNames()).toEqual(["Alpha", "Bravo", "Charlie"]);

    pick("amount");
    expect(cardNames()).toEqual(["Bravo", "Charlie", "Alpha"]);
    await announced("Sorted by Amount, descending");

    fireEvent.click(screen.getByRole("button", { name: "Descending" }));
    expect(cardNames()).toEqual(["Alpha", "Charlie", "Bravo"]);
    expect(screen.getByRole("button", { name: "Ascending" })).toBeEnabled();

    pick("name");
    expect(cardNames()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(sortSelect().value).toBe("name");

    pick("");
    expect(sortSelect().value).toBe("");
    await announced("Sort cleared on Name");
  });

  it("drives the same sort state as the column headers", () => {
    const setWide = stubViewport(false);
    renderTable();
    pick("amount");
    // Turn the phone sideways: the header shows the sort the phone chose…
    setWide(true);
    const amountHeader = screen.getAllByRole("columnheader").find((th) => th.textContent?.includes("Amount"))!;
    expect(amountHeader).toHaveAttribute("aria-sort", "descending");
    // …and a header click is what the phone shows when it comes back.
    fireEvent.click(within(amountHeader).getByRole("button"));
    expect(amountHeader).toHaveAttribute("aria-sort", "ascending");
    setWide(false);
    expect(sortSelect().value).toBe("amount");
    expect(screen.getByRole("button", { name: "Ascending" })).toBeEnabled();
  });

  it("under sortCycle='toggle' offers no way back to unsorted once ranked", () => {
    stubViewport(false);
    renderTable({ sortCycle: "toggle" });
    // Unsorted to begin with, so the select can still say so.
    expect(optionTexts()[0]).toBe(DEFAULT_DATA_TABLE_SORT_LABELS.sortDefault);
    pick("amount");
    expect(optionTexts()).toEqual(["Name", "Amount"]);
  });

  it("follows controlled sorts and reports through onSortsChange", () => {
    stubViewport(false);
    const onSortsChange = vi.fn<(next: SortState[]) => void>();
    const { rerender } = renderTable({ sorts: [{ key: "name", dir: "desc" }], onSortsChange });
    expect(sortSelect().value).toBe("name");
    expect(cardNames()).toEqual(["Charlie", "Bravo", "Alpha"]);

    fireEvent.click(screen.getByRole("button", { name: "Descending" }));
    expect(onSortsChange).toHaveBeenLastCalledWith([{ key: "name", dir: "asc" }]);
    pick("amount");
    expect(onSortsChange).toHaveBeenLastCalledWith([{ key: "amount", dir: "desc" }]);

    // The owner has not applied either, so the control still shows its value.
    expect(sortSelect().value).toBe("name");
    rerender(
      <MemoryRouter>
        <DataTable
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          mobileSort
          sorts={[{ key: "amount", dir: "asc" }]}
          onSortsChange={onSortsChange}
        />
      </MemoryRouter>,
    );
    expect(sortSelect().value).toBe("amount");
    expect(cardNames()).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("keeps a secondary sort when the direction flips", () => {
    stubViewport(false);
    const onSortsChange = vi.fn<(next: SortState[]) => void>();
    renderTable({
      sorts: [
        { key: "amount", dir: "desc" },
        { key: "name", dir: "asc" },
      ],
      onSortsChange,
    });
    fireEvent.click(screen.getByRole("button", { name: "Descending" }));
    expect(onSortsChange).toHaveBeenLastCalledWith([
      { key: "amount", dir: "asc" },
      { key: "name", dir: "asc" },
    ]);
  });

  it("takes its strings from the dataTable labels", () => {
    stubViewport(false);
    renderTable({
      labels: {
        table: "Payees",
        sortBy: "Sortieren nach",
        sortDefault: "Standardreihenfolge",
        sortAscending: "Aufsteigend",
      } as Partial<DataTableLabels>,
    });
    const select = screen.getByRole("combobox", { name: "Sortieren nach" });
    expect(within(select).getAllByRole("option")[0]).toHaveTextContent("Standardreihenfolge");
    expect(screen.getByRole("button", { name: "Aufsteigend" })).toBeDisabled();
  });

  it("is a phone control only", () => {
    stubViewport(true);
    renderTable();
    expect(screen.queryByRole("combobox", { name: "Sort by" })).toBeNull();
  });
});
