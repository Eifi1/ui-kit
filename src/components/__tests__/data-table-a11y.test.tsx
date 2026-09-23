import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps, FilterState } from "../data-table";

/**
 * The first test that renders `DataTable` at all.
 *
 * 1,449 lines and 122 call sites across three apps were covered by `tsc` and by the
 * consumers' own page tests, which is why the two things asserted here could be
 * missing for as long as they were: the table re-sorts, re-filters and re-pages
 * without telling anyone, and its header cells carry no `aria-sort` for an unsorted
 * column and no `scope`. Both are invisible to a test that only looks at a screen.
 *
 * Two facts about the environment, both load-bearing:
 *
 *  - `DataTable` calls `useSearchParams()` unconditionally, so every render here needs
 *    a Router even with `urlSync` off. That is a real finding against the component
 *    (the audit records it) and not something this test is entitled to work around.
 *  - `window.matchMedia` is undefined in this jsdom, so `useMediaQuery(_, true)` falls
 *    back to `true` and we get the DESKTOP table. The phone branch renders a card list
 *    with no `<table>` at all; a test that stubbed matchMedia the other way would be
 *    asserting about different markup.
 */

interface Row {
  id: number;
  name: string;
  city: string;
}

const ROWS: Row[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  city: i % 2 ? "Bern" : "Zug",
}));

const COLUMNS: DataTableColumn<Row>[] = [
  {
    key: "name",
    header: "Name",
    cell: (r) => r.name,
    sortBy: (r) => r.name,
    filterBy: (r) => r.name,
  },
  // Deliberately neither sortable nor filterable: `aria-sort` must not appear on a
  // header that cannot be sorted, and "none" is a claim about a control that is there.
  { key: "city", header: "City", cell: (r) => r.city },
];

function renderTable(extra: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        defaultPageSize={10}
        {...extra}
      />
    </MemoryRouter>,
  );
}

/** `useAnnounce` clears the region and re-fills it a tick later, so nothing is said
 *  synchronously — see the note on re-announcing an identical string in the hook. */
async function settleAnnouncement() {
  await act(async () => {
    vi.advanceTimersByTime(60);
  });
}

describe("DataTable table semantics", () => {
  it("gives the table an accessible name, which a consumer can translate", () => {
    const { unmount } = renderTable();
    expect(screen.getByRole("table", { name: "Data table" })).toBeInTheDocument();
    unmount();

    renderTable({ labels: { table: "Transactions" } });
    expect(screen.getByRole("table", { name: "Transactions" })).toBeInTheDocument();
  });

  it("scopes every header cell to its column", () => {
    // Without `scope`, a `<th>` in a table whose header row is not the only one is
    // ambiguous to AT, and the cell announcements lose the column name.
    renderTable({
      selection: {
        isSelected: () => false,
        onToggle: () => {},
        allSelected: false,
        someSelected: false,
        onToggleAll: () => {},
      },
    });
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(3); // selection + name + city
    for (const th of headers) expect(th).toHaveAttribute("scope", "col");
  });

  it("reports a sortable column as unsorted, then as sorted, on the header cell", () => {
    renderTable();
    const [name, city] = screen.getAllByRole("columnheader");

    // "none" is the part that was missing: a header with no `aria-sort` at all reads
    // as a plain column, so the user never learns the column is sortable.
    expect(name).toHaveAttribute("aria-sort", "none");
    expect(city).not.toHaveAttribute("aria-sort");

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-sort", "none");
  });
});

describe("DataTable announcements", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("mounts the live region empty, before there is anything to say", () => {
    renderTable();
    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();
    // `sr-only` is position:absolute and would escape to the initial containing block
    // from wherever a consumer put the table — see sr-only-containment.test.tsx.
    expect(region).toHaveClass("sr-only-fixed");
  });

  it("announces the sort when a header is activated", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    await settleAnnouncement();
    expect(screen.getByRole("status")).toHaveTextContent("Sorted by Name, ascending");

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    await settleAnnouncement();
    expect(screen.getByRole("status")).toHaveTextContent("Sorted by Name, descending");

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    await settleAnnouncement();
    expect(screen.getByRole("status")).toHaveTextContent("Sort cleared on Name");
  });

  it("announces the result count when a filter changes", async () => {
    // Driven through the column's own filter popover: the count only exists after the
    // table re-filters, so this is the path that proves the announcement is made from
    // the render that produced the new number rather than from the click.
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.change(screen.getByPlaceholderText("Filter…"), { target: { value: "Row 7" } });
    await settleAnnouncement();
    expect(screen.getByRole("status")).toHaveTextContent("1 of 25 rows");
  });

  it("announces the result count when the OWNER changes the filter", async () => {
    // Controlled filters are still the table's rows on screen. The announcement is
    // keyed on the filter state, not on the handler, so an owner-driven change (a
    // saved view, a chip dismissed outside the table) speaks too.
    function Host() {
      const [filters, setFilters] = useState<FilterState>({});
      return (
        <MemoryRouter>
          <button onClick={() => setFilters({ name: { type: "text", q: "Bern" } })}>apply</button>
          <DataTable
            rows={ROWS}
            columns={COLUMNS}
            rowKey={(r) => r.id}
            defaultPageSize={10}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </MemoryRouter>
      );
    }
    render(<Host />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: "apply" }));
    await settleAnnouncement();
    // "Bern" is in the city column, which carries no filter — so nothing matches.
    expect(screen.getByRole("status")).toHaveTextContent("0 of 25 rows");
  });

  it("announces the page when the user pages", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await settleAnnouncement();
    expect(screen.getByRole("status")).toHaveTextContent("Page 2 of 3");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await settleAnnouncement();
    expect(screen.getByRole("status")).toHaveTextContent("Page 3 of 3");
  });

  it("says nothing on mount, or when unrelated rows arrive", async () => {
    // A live region that speaks on first paint talks over the page the user just
    // opened, and every table on it does so at once.
    const { rerender } = renderTable();
    await settleAnnouncement();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(
      <MemoryRouter>
        <DataTable
          rows={ROWS.slice(0, 5)}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          defaultPageSize={10}
        />
      </MemoryRouter>,
    );
    await settleAnnouncement();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("speaks the consumer's strings, not English ones", async () => {
    renderTable({
      labels: {
        sortedAscending: (column) => `Sortiert nach ${column}, aufsteigend`,
        pageChanged: (page, totalPages) => `Seite ${page} von ${totalPages}`,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    await settleAnnouncement();
    expect(screen.getByRole("status")).toHaveTextContent("Sortiert nach Name, aufsteigend");

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await settleAnnouncement();
    expect(screen.getByRole("status")).toHaveTextContent("Seite 2 von 3");
  });
});

describe("DataTable counted chrome", () => {
  it("builds the pagination range through a label, not a template literal", () => {
    renderTable({ labels: { pageRange: (from, to, total) => `${from} bis ${to} von ${total}` } });
    expect(screen.getByText("1 bis 10 von 25")).toBeInTheDocument();
  });

  it("builds the column count through a label, and keeps a translated `columns`", () => {
    const { unmount } = renderTable({ labels: { columnsCount: (v, t) => `${v}/${t} Spalten` } });
    expect(screen.getAllByText("2/2 Spalten").length).toBeGreaterThan(0);
    unmount();

    // A consumer who translated `columns` before `columnsCount` existed must not get
    // English back for having done so first.
    renderTable({ labels: { columns: "Spalten" } });
    expect(screen.getAllByText("Spalten (2/2)").length).toBeGreaterThan(0);
  });

  it("marks the current page for assistive tech", () => {
    renderTable();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "2" })).not.toHaveAttribute("aria-current");
  });
});
