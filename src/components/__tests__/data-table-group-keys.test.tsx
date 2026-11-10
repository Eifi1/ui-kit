import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Plus } from "lucide-react";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableGroupBy } from "../data-table";
import { emptyGroupsIn, placeEmptyGroups } from "../data-table-groups";
import { IconButton } from "../icon-button";
import { stubPhone } from "../../test/viewport";
import { axeViolations } from "../../test/axe";

/**
 * 0.59 (keksdose live #504: *"Can the headers be shown without entries? To get the + from
 * the header row that fills in the account type."*): a level's `keys` — the groups to draw
 * even with no rows, each its band (or the phone's section header) with the level's
 * `action`, the "+" that adds the first one, and an `empty` line. keksdose faked them with a
 * placeholder row per type (accounts-page.tsx `emptySectionRow`), which the table counted,
 * paged and selected as an account; an empty group is no row.
 */

interface Account {
  id: string;
  type: string;
  name: string;
}

const TYPES = ["CHECKING", "SAVINGS", "CREDIT_CARD", "DEPOT", "LOAN"];

const ACCOUNTS: Account[] = [
  { id: "a1", type: "CHECKING", name: "Giro" },
  { id: "a2", type: "CHECKING", name: "Joint" },
  { id: "a3", type: "CREDIT_CARD", name: "Amex" },
  { id: "a4", type: "OTHER", name: "Piggy bank" },
];

const COLUMNS: DataTableColumn<Account>[] = [
  {
    key: "name",
    header: "Name",
    cell: (r) => r.name,
    sortBy: (r) => r.name,
    filter: { type: "text", getValue: (r) => r.name },
  },
];

function byType(onAdd: (key: string) => void = () => {}, keys: readonly string[] = TYPES): DataTableGroupBy<Account> {
  return {
    key: (r) => r.type,
    label: (k) => `Type ${k}`,
    end: (_k, rows) => `${rows.length} accounts`,
    action: (k) => (
      <IconButton label={`Add ${k}`} onClick={() => onAdd(k)}>
        <Plus />
      </IconButton>
    ),
    keys,
    empty: (k) => `No ${k} account yet`,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const bandLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("th[data-group-band='1'] span.min-w-0")).map(
    (el) => el.textContent,
  );

describe("placeEmptyGroups — where a level's declared empty groups go (0.59, live #504)", () => {
  const key = (r: { k: string }) => r.k;
  const rows = (...ks: string[]) => ks.map((k) => ({ k }));

  it("puts each at its place in `keys` when the rows follow that order", () => {
    expect(placeEmptyGroups(rows("A", "A", "C"), key, ["A", "B", "C", "D"])).toEqual([
      { key: "B", at: 2 },
      { key: "D", at: 3 },
    ]);
  });

  it("leaves a key the rows have alone, and keeps an undeclared group where its rows are", () => {
    // X is no declared key: it moves the pointer nowhere, and is drawn where its rows are.
    expect(placeEmptyGroups(rows("A", "X", "C"), key, ["A", "B", "C"])).toEqual([{ key: "B", at: 2 }]);
  });

  it("puts all of them after the rows when `keys` names only the groups to start", () => {
    expect(placeEmptyGroups(rows("A", "C"), key, ["B", "D"])).toEqual([
      { key: "B", at: 2 },
      { key: "D", at: 2 },
    ]);
  });

  it("sends the ones a column sort skipped to after the last row, each once", () => {
    // The rows run C, A (a column sort): C places B before it; A is behind the pointer.
    expect(placeEmptyGroups(rows("C", "A", "C"), key, ["A", "B", "C", "D", "B"])).toEqual([
      { key: "B", at: 0 },
      { key: "D", at: 3 },
    ]);
  });

  it("places every declared key of a table with no rows at 0", () => {
    expect(placeEmptyGroups([], key, ["A", "B"])).toEqual([
      { key: "A", at: 0 },
      { key: "B", at: 0 },
    ]);
  });

  it("draws each on one page: the page its next row is on, the trailing ones on the last", () => {
    const empties = [
      { key: "B", at: 2 },
      { key: "D", at: 4 },
      { key: "E", at: 5 },
    ];
    // Five rows, pages of two: [0,2) [2,4) [4,5).
    expect(emptyGroupsIn(empties, 0, 2, 5)).toEqual([]);
    expect(emptyGroupsIn(empties, 2, 4, 5)).toEqual([{ key: "B", at: 2 }]);
    expect(emptyGroupsIn(empties, 4, 5, 5)).toEqual([
      { key: "D", at: 4 },
      { key: "E", at: 5 },
    ]);
  });
});

describe("DataTable groupBy keys — declared groups drawn empty (0.59, live #504)", () => {
  it("draws a band, its end and its action for a declared group with no rows, and its empty line", () => {
    const onAdd = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <DataTable rows={ACCOUNTS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={byType(onAdd)} />
      </MemoryRouter>,
    );
    // In `keys`' order among the rows' groups; OTHER, undeclared, where its rows are.
    expect(bandLabels(container)).toEqual([
      "Type CHECKING",
      "Type SAVINGS",
      "Type CREDIT_CARD",
      "Type OTHER",
      "Type DEPOT",
      "Type LOAN",
    ]);
    const depot = screen.getByText("Type DEPOT").closest("tbody")!;
    // `end` and `action` are called with no rows.
    expect(within(depot).getByText("0 accounts")).toBeInTheDocument();
    expect(within(depot).getByText("No DEPOT account yet")).toBeInTheDocument();
    fireEvent.click(within(depot).getByRole("button", { name: "Add DEPOT" }));
    expect(onAdd).toHaveBeenCalledWith("DEPOT");
  });

  it("counts no empty group as a row: no data-row-index, no box, not in the pager", () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={ACCOUNTS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          groupBy={byType()}
          selection={{
            isSelected: () => false,
            onToggle: () => {},
            allSelected: false,
            someSelected: false,
            onToggleAll: () => {},
          }}
        />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll("tr[data-row-index]")).toHaveLength(4);
    const lines = container.querySelectorAll<HTMLElement>("tr[data-group-empty]");
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line).not.toHaveAttribute("data-row-index");
      expect(within(line).queryByRole("checkbox")).toBeNull();
      // One cell across the selection column and every visible one.
      expect(line.querySelector("td")).toHaveAttribute("colspan", "2");
    }
    // The row boxes: the four accounts' and the select-all.
    expect(within(screen.getByRole("table")).getAllByRole("checkbox")).toHaveLength(5);
  });

  it("draws the band alone when `empty` returns null, and the table's words without one", () => {
    const { container, rerender } = render(
      <MemoryRouter>
        <DataTable
          rows={ACCOUNTS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          groupBy={{ key: (r) => r.type, keys: TYPES, empty: () => null }}
        />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll("tr[data-group-empty]")).toHaveLength(0);
    expect(within(screen.getByText("DEPOT").closest("tbody")!).getAllByRole("row")).toHaveLength(1);
    rerender(
      <MemoryRouter>
        <DataTable
          rows={ACCOUNTS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          groupBy={{ key: (r) => r.type, keys: TYPES }}
        />
      </MemoryRouter>,
    );
    expect(within(screen.getByText("DEPOT").closest("tbody")!).getByText("No entries")).toBeInTheDocument();
  });

  it("draws the declared groups in place of the empty state when there are no rows", () => {
    render(
      <MemoryRouter>
        <DataTable rows={[]} columns={COLUMNS} rowKey={(r) => r.id} groupBy={byType()} empty="Nothing here" />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(screen.getAllByText(/^No .* account yet$/)).toHaveLength(TYPES.length);
  });

  it("draws none while a filter narrows the rows: their emptiness would be the filter's", () => {
    render(
      <MemoryRouter initialEntries={["/?f.name=amex"]}>
        <DataTable rows={ACCOUNTS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={byType()} urlSync />
      </MemoryRouter>,
    );
    expect(screen.getByText("Amex")).toBeInTheDocument();
    expect(screen.queryByText(/account yet$/)).toBeNull();
    expect(screen.queryByText("Type SAVINGS")).toBeNull();
  });

  it("draws each empty group on one page only, as `emptyGroupsIn` places it", () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable rows={ACCOUNTS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={byType()} defaultPageSize={2} />
      </MemoryRouter>,
    );
    // Page 1 holds the two CHECKING rows; SAVINGS stands before CREDIT_CARD's row, on page 2.
    expect(bandLabels(container)).toEqual(["Type CHECKING"]);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(bandLabels(container)).toEqual([
      "Type SAVINGS",
      "Type CREDIT_CARD",
      "Type OTHER",
      "Type DEPOT",
      "Type LOAN",
    ]);
  });

  it("draws none while a load-more table has more to come, nor under virtualize", () => {
    const { rerender } = render(
      <MemoryRouter>
        <DataTable
          rows={ACCOUNTS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          groupBy={byType()}
          loadMore={{ hasMore: true, onLoadMore: () => {}, auto: false }}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/account yet$/)).toBeNull();
    rerender(
      <MemoryRouter>
        <DataTable
          rows={ACCOUNTS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          groupBy={byType()}
          loadMore={{ hasMore: false, onLoadMore: () => {} }}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/account yet$/)).toHaveLength(3);
    rerender(
      <MemoryRouter>
        <DataTable rows={ACCOUNTS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={byType()} virtualize />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/account yet$/)).toBeNull();
  });

  it("skips the empty lines with the rows' arrow keys", () => {
    render(
      <MemoryRouter>
        <DataTable rows={ACCOUNTS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={byType()} onRowClick={() => {}} />
      </MemoryRouter>,
    );
    const row = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
    // Joint (CHECKING) → past SAVINGS' band and line → Amex (CREDIT_CARD).
    row("Joint").focus();
    fireEvent.keyDown(row("Joint"), { key: "ArrowDown" });
    expect(row("Amex")).toHaveFocus();
  });

  it("is axe-clean", async () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable rows={ACCOUNTS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={byType()} />
      </MemoryRouter>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("DataTable mobileGroupBy keys — the phone's empty sections (0.59, live #504)", () => {
  it("draws each declared section with no cards: its header, its +, its line", () => {
    stubPhone();
    const onAdd = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={ACCOUNTS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          // keksdose's accounts list: only the types not yet started, after the accounts.
          mobileGroupBy={byType(onAdd, ["SAVINGS", "DEPOT"])}
          mobileGroupLabel={(k) => `Section ${k}`}
        />
      </MemoryRouter>,
    );
    const headers = Array.from(container.querySelectorAll("li.sticky span.min-w-0")).map((el) => el.textContent);
    expect(headers).toEqual([
      "Section CHECKING",
      "Section CREDIT_CARD",
      "Section OTHER",
      "Section SAVINGS",
      "Section DEPOT",
    ]);
    const add = screen.getByRole("button", { name: "Add DEPOT" });
    expect(add.closest("li")).toHaveTextContent("0 accounts");
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalledWith("DEPOT");
    // The line is no card: no `data-row-index`, the four accounts' cards alone.
    const line = screen.getByText("No DEPOT account yet").closest("li")!;
    expect(line).toHaveAttribute("data-group-empty");
    expect(line).not.toHaveAttribute("data-row-index");
    expect(container.querySelectorAll("li[data-row-index]")).toHaveLength(4);
  });

  it("draws every declared section, and no empty state, for a list with no rows", () => {
    stubPhone();
    render(
      <MemoryRouter>
        <DataTable rows={[]} columns={COLUMNS} rowKey={(r) => r.id} mobileGroupBy={byType()} empty="Nothing here" />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(screen.getAllByText(/^No .* account yet$/)).toHaveLength(TYPES.length);
  });

  it("draws none for a plain key function, which declares nothing", () => {
    stubPhone();
    render(
      <MemoryRouter>
        <DataTable rows={ACCOUNTS} columns={COLUMNS} rowKey={(r) => r.id} mobileGroupBy={(r) => r.type} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("SAVINGS")).toBeNull();
  });
});
