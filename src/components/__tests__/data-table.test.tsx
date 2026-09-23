import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";

/**
 * What the table DOES, as opposed to what it announces.
 *
 * `DataTable` is 1,449 lines with 122 call sites across three applications, and until
 * the a11y suite beside this one it had never been rendered by a test in this
 * repository at all. The codecs it delegates to — `data-table-sort.test.ts`,
 * `data-table-filters.test.ts` — are tested as pure functions, which is the easy half:
 * they answer "is this the right comparator" and cannot answer "does clicking the
 * header reach the comparator", "does the filtered count reach the pager", or "does
 * the empty state ever render". Every one of those seams is where a table breaks.
 *
 * So these assert PUBLIC behaviour only: rows in the DOM, in order; attributes a
 * screen reader can read; controls found by their accessible names. Nothing here
 * knows a class name, a state shape or an internal helper, because the component is
 * being worked on in parallel and a test that pins its internals would be a tax on
 * that work rather than a guard on it.
 *
 * Two environment facts, both load-bearing (the a11y suite records them too):
 *
 *  - `useSearchParams()` is called unconditionally, so every render needs a Router
 *    even with `urlSync` off.
 *  - `window.matchMedia` is undefined in this jsdom, so the desktop `<table>` renders
 *    rather than the mobile card list.
 */

interface Row {
  id: number;
  name: string;
  city: string;
  amount: number;
}

/** Five rows, deliberately NOT in alphabetical order: it is what makes "unsorted"
 *  an observable third state rather than the absence of the other two. */
const ROWS: Row[] = [
  { id: 1, name: "Delta", city: "Bern", amount: 40 },
  { id: 2, name: "Alpha", city: "Zug", amount: 10 },
  { id: 3, name: "Echo", city: "Bern", amount: 50 },
  { id: 4, name: "Bravo", city: "Zug", amount: 20 },
  { id: 5, name: "Charlie", city: "Bern", amount: 30 },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name, filterBy: (r) => r.name },
  { key: "city", header: "City", cell: (r) => r.city, filterBy: (r) => r.city },
  { key: "amount", header: "Amount", cell: (r) => String(r.amount), sortBy: (r) => r.amount },
];

function renderTable(extra: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} {...extra} />
    </MemoryRouter>,
  );
}

/** The first data cell of every body row, in DOM order — "what is on screen", which
 *  is the only thing a caller of this component can observe. */
function namesOnScreen(): string[] {
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  return rows.map((r) => within(r).getAllByRole("cell")[0]?.textContent ?? "");
}

/** The header cell for a column, by its visible text. */
const header = (name: string) =>
  screen.getAllByRole("columnheader").find((th) => th.textContent?.includes(name))!;

describe("DataTable sorting", () => {
  it("cycles ascending → descending → unsorted, and the rows follow", () => {
    renderTable();
    expect(namesOnScreen()).toEqual(["Delta", "Alpha", "Echo", "Bravo", "Charlie"]);

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(namesOnScreen()).toEqual(["Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
    expect(header("Name")).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(namesOnScreen()).toEqual(["Echo", "Delta", "Charlie", "Bravo", "Alpha"]);
    expect(header("Name")).toHaveAttribute("aria-sort", "descending");

    // The third click removes the column from the sort rather than re-sorting it,
    // so the rows come back in the order the CALLER passed them.
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(namesOnScreen()).toEqual(["Delta", "Alpha", "Echo", "Bravo", "Charlie"]);
    expect(header("Name")).toHaveAttribute("aria-sort", "none");
  });

  it("sorts a numeric column as numbers", () => {
    // The column that catches a comparator reached through `String()`: "10" sorts
    // before "5" lexically, and this table renders its amounts as text.
    renderTable({ rows: [...ROWS, { id: 6, name: "Foxtrot", city: "Zug", amount: 5 }] });
    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(namesOnScreen()).toEqual(["Foxtrot", "Alpha", "Bravo", "Charlie", "Delta", "Echo"]);
  });

  it("leaves a column with no sortBy alone", () => {
    renderTable();
    // The header still renders a button (it carries the label), but it is disabled —
    // a sort a column cannot perform must not look available.
    expect(screen.getByRole("button", { name: "City" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "City" }));
    expect(namesOnScreen()).toEqual(["Delta", "Alpha", "Echo", "Bravo", "Charlie"]);
  });
});

/** Open a column's filter popover and type into it. The popover is reached through
 *  the header's own Filter button, which is how a user reaches it. */
function filterColumn(column: string, text: string) {
  fireEvent.click(within(header(column)).getByRole("button", { name: "Filter" }));
  fireEvent.change(screen.getByPlaceholderText("Filter…"), { target: { value: text } });
}

describe("DataTable filtering", () => {
  it("narrows the rows to the matches", () => {
    renderTable();
    filterColumn("Name", "bravo");
    expect(namesOnScreen()).toEqual(["Bravo"]);
  });

  it("filters on the column the popover belongs to, not the whole row", () => {
    // Two columns carry a filter here. A single shared query would make "Zug" — a
    // city — match through the name column and quietly return everything.
    renderTable();
    filterColumn("City", "Zug");
    expect(namesOnScreen()).toEqual(["Alpha", "Bravo"]);
  });

  it("shows the empty state when nothing matches, and the caller's own words", () => {
    // `empty` is a ReactNode prop with a "—" default: a table that filters down to
    // nothing must still render a row, or the body collapses and the user is left
    // looking at a header with no explanation.
    renderTable({ empty: "No rows match" });
    filterColumn("Name", "nothing matches this");
    expect(namesOnScreen()).toEqual(["No rows match"]);
  });
});

describe("DataTable selection", () => {
  /** The owner holds the selected set — the shape `selection` asks for. */
  function SelectionHost({ onToggle }: { onToggle: (name: string, checked: boolean) => void }) {
    const [selected, setSelected] = useState<number[]>([]);
    return (
      <MemoryRouter>
        <DataTable
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          selection={{
            isSelected: (r) => selected.includes(r.id),
            onToggle: (r, checked) => {
              onToggle(r.name, checked);
              setSelected((s) => (checked ? [...s, r.id] : s.filter((id) => id !== r.id)));
            },
            allSelected: selected.length === ROWS.length,
            someSelected: selected.length > 0 && selected.length < ROWS.length,
            onToggleAll: (checked) => setSelected(checked ? ROWS.map((r) => r.id) : []),
          }}
        />
      </MemoryRouter>
    );
  }

  it("toggles a row on and off, and tells the owner which row", () => {
    const onToggle = vi.fn();
    render(<SelectionHost onToggle={onToggle} />);
    const boxes = screen.getAllByRole("checkbox", { name: "Select row" });
    expect(boxes).toHaveLength(5);
    expect(boxes[1]).not.toBeChecked();

    fireEvent.click(boxes[1]);
    expect(onToggle).toHaveBeenCalledWith("Alpha", true);
    expect(screen.getAllByRole("checkbox", { name: "Select row" })[1]).toBeChecked();

    fireEvent.click(screen.getAllByRole("checkbox", { name: "Select row" })[1]);
    expect(onToggle).toHaveBeenLastCalledWith("Alpha", false);
    expect(screen.getAllByRole("checkbox", { name: "Select row" })[1]).not.toBeChecked();
  });

  it("select-all takes every row, and clears them all again", () => {
    render(<SelectionHost onToggle={vi.fn()} />);
    const all = screen.getByRole("checkbox", { name: "Select all rows" });

    fireEvent.click(all);
    for (const box of screen.getAllByRole("checkbox", { name: "Select row" })) {
      expect(box).toBeChecked();
    }

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    for (const box of screen.getAllByRole("checkbox", { name: "Select row" })) {
      expect(box).not.toBeChecked();
    }
  });
});

describe("DataTable pagination", () => {
  it("moves through the pages and keeps the summary honest", () => {
    renderTable({ defaultPageSize: 2 });
    expect(namesOnScreen()).toEqual(["Delta", "Alpha"]);
    expect(screen.getByText("1–2 / 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(namesOnScreen()).toEqual(["Echo", "Bravo"]);
    expect(screen.getByText("3–4 / 5")).toBeInTheDocument();

    // The last page is short — the slice has to stop at the end of the rows rather
    // than at the page size.
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(namesOnScreen()).toEqual(["Charlie"]);
    expect(screen.getByText("5–5 / 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(namesOnScreen()).toEqual(["Echo", "Bravo"]);
  });

  it("re-pages when a filter shortens the list under the current page", () => {
    // The page the user is on can stop existing. Left unclamped this renders an
    // empty page THREE of one — the table looks broken and the rows look lost.
    renderTable({ defaultPageSize: 2 });
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(namesOnScreen()).toEqual(["Charlie"]);

    filterColumn("City", "Bern");
    expect(namesOnScreen()).toEqual(["Delta", "Echo"]);
  });
});
