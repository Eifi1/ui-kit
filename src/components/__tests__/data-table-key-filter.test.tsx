import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import type { DataTableKeyFilter } from "../data-table-filters";
import { stubPhone } from "../../test/viewport";

/**
 * 0.59 (keksdose live #500, dev #678): `keyFilter`, a SET of rows named from outside —
 * the reports a notice links (`?ids=`) — shown as one column's filter. Marcel, #678: *"Url
 * shows …/feedback?ids=675&row=675. But nowhere in the table columns is a filter set (should
 * be in the # column)"*. And a link's view keeps the saved filters out — live #500: the
 * status filter he had left on hid all four reports a notice named — without wiping them
 * or the rest of the saved layout (keksdose's interim mounted with `storageKey` off and
 * lost the widths, the hidden columns, the sort and the page size).
 */

interface Report {
  id: number;
  title: string;
  status: string;
}

const REPORTS: Report[] = [
  { id: 1, title: "Crash on save", status: "OPEN" },
  { id: 2, title: "Typo in the footer", status: "DONE" },
  { id: 3, title: "Dark mode", status: "OPEN" },
  { id: 4, title: "Export to CSV", status: "DONE" },
  { id: 5, title: "Slow list", status: "OPEN" },
];

const COLUMNS: DataTableColumn<Report>[] = [
  { key: "id", header: "#", cell: (r) => r.id, sortBy: (r) => r.id, filter: { type: "number", getValue: (r) => r.id } },
  { key: "title", header: "Subject", cell: (r) => r.title, sortBy: (r) => r.title },
  {
    key: "status",
    header: "Status",
    cell: (r) => r.status,
    filter: { type: "select", getValue: (r) => r.status, options: [{ value: "OPEN" }, { value: "DONE" }] },
  },
];

const STORE = "hbui-table:reports";

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

const titles = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .filter((r) => r.closest("tbody"))
    .map((r) => r.textContent ?? "");

const shows = (...titlesShown: string[]) =>
  expect(titles().map((t) => REPORTS.find((r) => t.includes(r.title))?.title)).toEqual(titlesShown);

const header = (name: string) => screen.getByRole("columnheader", { name: new RegExp(`^${name}`) });

const stored = () => JSON.parse(localStorage.getItem(STORE) ?? "{}") as Record<string, unknown>;

function Search() {
  const { search } = useLocation();
  return <output data-testid="search">{search}</output>;
}
const search = () => new URLSearchParams(screen.getByTestId("search").textContent ?? "");

function set(keys: readonly number[], onClear = vi.fn(), label?: string): DataTableKeyFilter {
  return { column: "id", keys, onClear, ...(label ? { label } : {}) };
}

function Table(props: Partial<DataTableProps<Report>>) {
  return <DataTable rows={REPORTS} columns={COLUMNS} rowKey={(r) => r.id} {...props} />;
}

/** The owner of a set, as the inbox is: it keeps the set and drops it on Clear. */
function Owner({ initial, ...props }: { initial: readonly number[] | null } & Partial<DataTableProps<Report>>) {
  const [keys, setKeys] = useState(initial);
  return (
    <>
      <button type="button" onClick={() => setKeys([2, 4])}>
        Open the notice
      </button>
      <Table
        {...props}
        keyFilter={
          keys
            ? set(
                keys,
                vi.fn(() => setKeys(null)),
                "Only these reports",
              )
            : undefined
        }
      />
    </>
  );
}

describe("DataTable keyFilter — a set of rows as a column's filter (0.59, dev #678)", () => {
  it("shows the named rows only, the column's filter on, its panel saying the set", () => {
    render(
      <MemoryRouter>
        <Table keyFilter={set([1, 3], vi.fn(), "Only these 2 reports")} />
      </MemoryRouter>,
    );
    shows("Crash on save", "Dark mode");
    const button = within(header("#")).getByRole("button", { name: "Filter # (active)" });
    fireEvent.click(button);
    expect(screen.getByText("Only these 2 reports")).toBeInTheDocument();
    // The set in place of the column's own fields.
    expect(screen.queryByLabelText("Min")).toBeNull();
  });

  it("says the kit's words when the owner names none", () => {
    render(
      <MemoryRouter>
        <Table keyFilter={set([1, 3])} />
      </MemoryRouter>,
    );
    fireEvent.click(within(header("#")).getByRole("button", { name: "Filter # (active)" }));
    expect(screen.getByText("Only these 2 rows")).toBeInTheDocument();
  });

  it("hands the column's Clear filter to the owner, which drops the set", () => {
    render(
      <MemoryRouter>
        <Owner initial={[1, 3]} />
      </MemoryRouter>,
    );
    shows("Crash on save", "Dark mode");
    fireEvent.click(within(header("#")).getByRole("button", { name: "Filter # (active)" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    shows("Crash on save", "Typo in the footer", "Dark mode", "Export to CSV", "Slow list");
    expect(within(header("#")).getByRole("button", { name: "Filter #" })).toBeInTheDocument();
  });

  it("wins over the column's own filter, and its Clear clears both", () => {
    render(
      <MemoryRouter initialEntries={["/?f.id=4..5"]}>
        <Owner initial={[1, 3]} urlSync />
        <Search />
      </MemoryRouter>,
    );
    // The link's `f.id=4..5` is not applied while the set is on.
    shows("Crash on save", "Dark mode");
    fireEvent.click(within(header("#")).getByRole("button", { name: "Filter # (active)" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    shows("Crash on save", "Typo in the footer", "Dark mode", "Export to CSV", "Slow list");
    expect(search().has("f.id")).toBe(false);
  });

  it("draws the button on a column with no filter of its own while the set is on", () => {
    render(
      <MemoryRouter>
        <DataTable
          rows={REPORTS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          keyFilter={{ column: "title", keys: [2], onClear: () => {} }}
        />
      </MemoryRouter>,
    );
    shows("Typo in the footer");
    expect(within(header("Subject")).getByRole("button", { name: "Filter Subject (active)" })).toBeInTheDocument();
  });

  it("keeps the other filters on top, and is a filter for the count", () => {
    render(
      <MemoryRouter initialEntries={["/?f.status=OPEN"]}>
        <Table urlSync keyFilter={set([1, 2, 3])} />
      </MemoryRouter>,
    );
    // The link's own filter (in its URL) narrows the set further.
    shows("Crash on save", "Dark mode");
  });

  it("leaves the rows to the owner with serverRows, and still shows the set", () => {
    render(
      <MemoryRouter>
        <Table serverRows onFiltersChange={() => {}} keyFilter={set([1])} />
      </MemoryRouter>,
    );
    expect(titles()).toHaveLength(5);
    expect(within(header("#")).getByRole("button", { name: "Filter # (active)" })).toBeInTheDocument();
  });
});

describe("DataTable keyFilter — a link's view keeps the saved filters out (0.59, live #500)", () => {
  /** The list as the last visit left it: only DONE reports, sorted by #, descending, the
   *  Subject column 240px wide and Status hidden — what Marcel's phone had kept. */
  const saved = {
    sort: [{ key: "id", dir: "desc" }],
    filters: { status: { type: "select", values: ["DONE"] } },
    pageSize: 50,
    widths: { title: 240 },
    hidden: ["status"],
  };

  it("does not apply the saved filters, and keeps the saved sort and layout", () => {
    localStorage.setItem(STORE, JSON.stringify(saved));
    render(
      <MemoryRouter>
        <Table storageKey="reports" columnSettings keyFilter={set([1, 3, 4])} />
      </MemoryRouter>,
    );
    // The saved DONE filter would have hidden #1 and #3; the saved sort is applied.
    shows("Export to CSV", "Dark mode", "Crash on save");
    // The saved hidden column stays hidden.
    expect(screen.queryByRole("columnheader", { name: /^Status/ })).toBeNull();
  });

  it("writes the layout as always and leaves the saved filters as they were", () => {
    localStorage.setItem(STORE, JSON.stringify(saved));
    render(
      <MemoryRouter>
        <Table storageKey="reports" keyFilter={set([1, 3, 4])} />
      </MemoryRouter>,
    );
    // A sort changed in the link's view is the person's: written.
    fireEvent.click(within(header("Subject")).getByRole("button", { name: /Subject/ }));
    expect(stored().sort).toEqual([{ key: "title", dir: "asc" }]);
    expect(stored().filters).toEqual(saved.filters);
    expect(stored().widths).toEqual(saved.widths);
    expect(stored().pageSize).toBe(50);
  });

  it("gives the saved filters back when the set goes", () => {
    localStorage.setItem(STORE, JSON.stringify({ filters: saved.filters }));
    render(
      <MemoryRouter initialEntries={["/?f.status=OPEN"]}>
        <Owner initial={[1, 2, 3, 4]} storageKey="reports" urlSync />
        <Search />
      </MemoryRouter>,
    );
    // The link's own filter, not the saved one.
    shows("Crash on save", "Dark mode");
    fireEvent.click(within(header("#")).getByRole("button", { name: "Filter # (active)" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    // The list the person left: DONE only, in the address too, and the blob unchanged.
    shows("Typo in the footer", "Export to CSV");
    expect(search().get("f.status")).toBe("DONE");
    expect(stored().filters).toEqual(saved.filters);
  });

  it("starts a set that arrives while the table lives from the URL's filters, and ends it the same", () => {
    localStorage.setItem(STORE, JSON.stringify({ filters: saved.filters }));
    render(
      <MemoryRouter>
        <Owner initial={null} storageKey="reports" />
      </MemoryRouter>,
    );
    shows("Typo in the footer", "Export to CSV");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Open the notice" }));
    });
    // #2 and #4, with no saved filter between them and the reader.
    shows("Typo in the footer", "Export to CSV");
    fireEvent.click(within(header("Status")).getByRole("button", { name: "Filter Status" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "OPEN" }));
    // A filter set in the link's view is not written over the saved one…
    expect(screen.queryByText("Typo in the footer")).toBeNull();
    expect(stored().filters).toEqual(saved.filters);
    // (its popover closed again by its own button)
    fireEvent.click(within(header("Status")).getByRole("button", { name: "Filter Status (active)" }));
    fireEvent.click(within(header("#")).getByRole("button", { name: "Filter # (active)" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filter" }));
    // …and the view's end brings the saved one back.
    shows("Typo in the footer", "Export to CSV");
    expect(within(header("Status")).getByRole("button", { name: "Filter Status (active)" })).toBeInTheDocument();
  });
});

describe("DataTable keyFilter with its column hidden, on a desktop (0.60)", () => {
  // 0.59's known limit: the set showed only in its column's header, so with the # column
  // hidden the table showed 2 rows of 5 (3 of hundreds in an inbox) and said nothing, with
  // no Clear anywhere but the address bar.

  /** The set's line above the table, named as its column's filter button is. */
  const line = () => screen.queryByRole("group", { name: "Filter # (active)" });
  const toggleColumn = (name: string) => fireEvent.click(screen.getByRole("checkbox", { name }));
  const openColumns = () => fireEvent.click(screen.getByRole("button", { name: /^Columns/ }));

  it("says the set above the table once its column is hidden, and nothing more while it is drawn", () => {
    render(
      <MemoryRouter>
        <Table keyFilter={set([1, 3], vi.fn(), "Only these 2 reports")} />
      </MemoryRouter>,
    );
    // Drawn: its header's button says it, and nothing else does.
    expect(line()).toBeNull();
    expect(screen.queryByText("Only these 2 reports")).toBeNull();
    openColumns();
    toggleColumn("#");
    expect(screen.queryByRole("columnheader", { name: /^#/ })).toBeNull();
    shows("Crash on save", "Dark mode");
    expect(line()).toHaveTextContent("Only these 2 reports");
    // Drawn again: the header has it back, and the line goes.
    toggleColumn("#");
    expect(line()).toBeNull();
    expect(within(header("#")).getByRole("button", { name: "Filter # (active)" })).toBeInTheDocument();
  });

  it("says the kit's words when the owner names none, for a column the view saved hidden", () => {
    localStorage.setItem(STORE, JSON.stringify({ hidden: ["id"] }));
    render(
      <MemoryRouter>
        <Table storageKey="reports" keyFilter={set([1, 3])} />
      </MemoryRouter>,
    );
    expect(line()).toHaveTextContent("Only these 2 rows");
  });

  it("is the column's own Clear filter: the set's onClear, and the column's filter with it", () => {
    localStorage.setItem(STORE, JSON.stringify({ hidden: ["id"] }));
    const onClear = vi.fn();
    render(
      <MemoryRouter initialEntries={["/?f.id=4..5"]}>
        <Table storageKey="reports" urlSync keyFilter={set([1, 3], onClear)} />
        <Search />
      </MemoryRouter>,
    );
    fireEvent.click(within(line()!).getByRole("button", { name: "Clear filter" }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(search().has("f.id")).toBe(false);
  });

  it("goes with the set, and leaves the focus on the table rather than on <body>", () => {
    localStorage.setItem(STORE, JSON.stringify({ hidden: ["id"] }));
    render(
      <MemoryRouter>
        <Owner initial={[1, 3]} storageKey="reports" />
      </MemoryRouter>,
    );
    shows("Crash on save", "Dark mode");
    const clear = within(line()!).getByRole("button", { name: "Clear filter" });
    act(() => clear.focus());
    fireEvent.click(clear);
    shows("Crash on save", "Typo in the footer", "Dark mode", "Export to CSV", "Slow list");
    expect(line()).toBeNull();
    expect(screen.getByRole("table")).toHaveFocus();
  });

  it("says the set for a column the table does not have", () => {
    render(
      <MemoryRouter>
        <DataTable
          rows={REPORTS}
          columns={COLUMNS.filter((c) => c.key !== "id")}
          rowKey={(r) => r.id}
          keyFilter={set([2])}
        />
      </MemoryRouter>,
    );
    shows("Typo in the footer");
    expect(screen.getByText("Only this row")).toBeInTheDocument();
  });

  it("leaves the phone as it was: no line, and the Filters sheet counts the set", () => {
    stubPhone();
    localStorage.setItem(STORE, JSON.stringify({ hidden: ["id"] }));
    render(
      <MemoryRouter>
        <Table storageKey="reports" keyFilter={set([1, 3], vi.fn(), "Only these 2 reports")} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Only these 2 reports")).toBeNull();
    expect(screen.getByRole("button", { name: /^Filters/ })).toHaveTextContent("1");
  });
});

describe("DataTable keyFilter on the phone (0.59, dev #678)", () => {
  it("is a filter in the sheet, said there, and Clear all drops it", () => {
    stubPhone();
    const onClear = vi.fn();
    render(
      <MemoryRouter>
        <Table keyFilter={set([1, 3], onClear, "Only these 2 reports")} />
      </MemoryRouter>,
    );
    // One filter on: the bar's count and its Clear all.
    const opener = screen.getByRole("button", { name: /^Filters/ });
    expect(opener).toHaveTextContent("1");
    fireEvent.click(opener);
    const sheet = screen.getByRole("dialog", { name: "Filters" });
    fireEvent.click(within(sheet).getByRole("button", { name: "#" }));
    expect(within(sheet).getByText("Only these 2 reports")).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "Clear all" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
