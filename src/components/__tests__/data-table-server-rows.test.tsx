import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps, FilterState, SortState } from "../data-table";

/**
 * 0.48.1 (keksdose K-052-1): `serverRows` — the rows are already filtered and sorted by
 * the server, so the table renders them as given (no client filter, sort or paging) and
 * the sort/filter UI reports to the owner as under `serverPagination`. `loadMore`
 * implies it unless the app passes `serverRows={false}`. keksdose's transfer-merge test
 * lost the other leg of each transfer when the loaded rows were re-filtered locally.
 */

interface Leg {
  id: number;
  payee: string;
  amount: number;
}

// The server's order: newest first, the two legs of a transfer next to each other.
const LEGS: Leg[] = [
  { id: 1, payee: "Transfer to savings", amount: -500 },
  { id: 2, payee: "Transfer from checking", amount: 500 },
  { id: 3, payee: "Migros", amount: -42.5 },
  { id: 4, payee: "Salary", amount: 5000 },
];

const COLUMNS: DataTableColumn<Leg>[] = [
  { key: "payee", header: "Payee", cell: (r) => r.payee, sortBy: (r) => r.payee, filterBy: (r) => r.payee },
  { key: "amount", header: "Amount", cell: (r) => r.amount.toFixed(2), sortBy: (r) => r.amount },
];

// A client filter would keep only "Transfer to savings"; a client sort by amount would
// reorder everything.
const FILTERS: FilterState = { payee: { type: "text", q: "savings" } };
const SORTS: SortState[] = [{ key: "amount", dir: "asc" }];

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
});

function Table(props: Partial<DataTableProps<Leg>>) {
  return (
    <MemoryRouter>
      <DataTable rows={LEGS} columns={COLUMNS} rowKey={(r) => r.id} {...props} />
    </MemoryRouter>
  );
}

const bodyPayees = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("tbody tr")).map(
    (tr) => LEGS.find((l) => tr.textContent?.includes(l.payee))?.payee,
  );

const loadMore = { hasMore: true, onLoadMore: () => {}, label: "Load more" };

describe("DataTable serverRows (0.48.1, keksdose K-052-1)", () => {
  it("loadMore alone keeps every row, in the order given, under an active filter and sort", () => {
    const { container } = render(
      <Table loadMore={loadMore} filters={FILTERS} onFiltersChange={() => {}} sorts={SORTS} onSortsChange={() => {}} />,
    );
    expect(bodyPayees(container)).toEqual(LEGS.map((l) => l.payee));
  });

  it("hands a column's sort click to onSortsChange and leaves the order to the owner", () => {
    const onSortsChange = vi.fn();
    const { container } = render(<Table loadMore={loadMore} onSortsChange={onSortsChange} />);
    const head = container.querySelector("thead") as HTMLElement;
    fireEvent.click(within(head).getByRole("button", { name: /Amount/ }));
    expect(onSortsChange).toHaveBeenCalledWith([{ key: "amount", dir: "asc" }]);
    expect(bodyPayees(container)).toEqual(LEGS.map((l) => l.payee));
  });

  it("hides the sort and filter controls nobody listens to, as serverPagination does", () => {
    const { container } = render(<Table loadMore={loadMore} />);
    const head = container.querySelector("thead") as HTMLElement;
    // Plain text, not a disabled button (0.52, audit 2026-10-30 DSP-23 a).
    expect(within(head).queryByRole("button", { name: /Amount/ })).toBeNull();
    expect(head).toHaveTextContent("Amount");
    expect(within(head).queryByRole("button", { name: /filter/i })).toBeNull();
  });

  it("serverRows without loadMore renders every row as given, with no pager", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: 100 + i, payee: `P${29 - i}`, amount: i }));
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={many}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          serverRows
          sorts={SORTS}
          onSortsChange={() => {}}
          defaultPageSize={10}
        />
      </MemoryRouter>,
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(30);
    expect(rows[0].textContent).toContain("P29");
    expect(screen.queryByRole("button", { name: /next page/i })).toBeNull();
  });

  it("serverRows={false} beside loadMore keeps the client filter and sort", () => {
    const { container } = render(
      <Table
        loadMore={loadMore}
        serverRows={false}
        filters={{ payee: { type: "text", q: "transfer" } }}
        onFiltersChange={() => {}}
        sorts={SORTS}
        onSortsChange={() => {}}
      />,
    );
    expect(bodyPayees(container)).toEqual(["Transfer to savings", "Transfer from checking"]);
  });

  it("serverRows={false} beside loadMore sorts on the column's click locally", () => {
    const { container } = render(<Table loadMore={loadMore} serverRows={false} />);
    const head = container.querySelector("thead") as HTMLElement;
    fireEvent.click(within(head).getByRole("button", { name: /Amount/ }));
    expect(bodyPayees(container)).toEqual(["Transfer to savings", "Migros", "Transfer from checking", "Salary"]);
  });

  it("a plain client table still filters, sorts and pages", () => {
    const { container } = render(
      <Table
        filters={{ payee: { type: "text", q: "transfer" } }}
        onFiltersChange={() => {}}
        sorts={SORTS}
        onSortsChange={() => {}}
      />,
    );
    expect(bodyPayees(container)).toEqual(["Transfer to savings", "Transfer from checking"]);
  });

  it("serverPagination is unchanged: rows as given, its pager, serverRows={false} does not undo it", () => {
    const sp = { page: 0, pageSize: 2, total: 40, onPageChange: () => {}, onPageSizeChange: () => {} };
    const { container } = render(
      <Table
        serverPagination={sp}
        serverRows={false}
        filters={FILTERS}
        onFiltersChange={() => {}}
        sorts={SORTS}
        onSortsChange={() => {}}
      />,
    );
    expect(bodyPayees(container)).toEqual(LEGS.map((l) => l.payee));
    expect(screen.getByRole("button", { name: /next page/i })).toBeInTheDocument();
  });
});
