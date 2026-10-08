import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";

/**
 * The totals row (kastlan 54): a column's `footer`, the table's `footerLabel` and
 * `footer` switch — a `<tfoot>` on a wide screen, a summary card on a phone.
 */

interface Acc {
  no: string;
  name: string;
  debit: number;
  credit: number;
}

const ROWS: Acc[] = [
  { no: "1000", name: "Cash", debit: 100, credit: 0 },
  { no: "1020", name: "Bank", debit: 50, credit: 0 },
  { no: "2000", name: "Payables", debit: 0, credit: 120 },
  { no: "3000", name: "Revenue", debit: 0, credit: 30 },
];

const total = (rows: Acc[], k: "debit" | "credit") => rows.reduce((t, r) => t + r[k], 0);

const COLUMNS: DataTableColumn<Acc>[] = [
  { key: "no", header: "Account", cell: (r) => r.no },
  { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name, filterBy: (r) => r.name },
  {
    key: "debit",
    header: "Debit",
    cell: (r) => String(r.debit),
    className: "text-right",
    footer: (rows) => `D=${total(rows, "debit")}`,
  },
  {
    key: "credit",
    header: "Credit",
    cell: (r) => String(r.credit),
    className: "text-right",
    footer: (rows, page) => `C=${total(rows, "credit")} page=${page.length}`,
  },
];

function renderTable(props: Partial<DataTableProps<Acc>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.no} footerLabel="Total" {...props} />
    </MemoryRouter>,
  );
}

function phone() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("width <"), // the phone layout's `(width < 768px)`
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

const tfoot = (container: HTMLElement) => container.querySelector("tfoot");

describe("DataTable footer", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("renders a <tfoot> row aligned with the columns, labelled by a row header", () => {
    const { container } = renderTable();
    const foot = tfoot(container)!;
    expect(foot).not.toBeNull();
    const cells = Array.from(foot.querySelectorAll("tr > *"));
    // One cell per visible column, in column order.
    expect(cells.map((c) => c.getAttribute("data-col"))).toEqual(["no", "name", "debit", "credit"]);
    // The label sits in the first column without a value, as the row's header.
    const label = within(foot).getByRole("rowheader", { name: "Total" });
    expect(label.tagName).toBe("TH");
    expect(label).toHaveAttribute("scope", "row");
    expect(label).toHaveAttribute("data-col", "no");
    // Values take the column's (logical) alignment.
    const debit = within(foot).getByText("D=150");
    expect(debit.tagName).toBe("TD");
    expect(debit.className).toContain("text-end");
    expect(debit.className).toContain("sticky");
  });

  it("totals every filtered row, not just the page", () => {
    const { container } = renderTable({ defaultPageSize: 2 });
    // Two rows on screen, four totalled; the page is the second argument.
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(within(tfoot(container)!).getByText("C=150 page=2")).toBeInTheDocument();
    expect(within(tfoot(container)!).getByText("D=150")).toBeInTheDocument();
  });

  it("follows the filters", () => {
    const { container } = renderTable({ filters: { name: { type: "text", q: "a" } }, onFiltersChange: () => {} });
    // "a" matches Cash, Bank, Payables (not "Revenue"): debit 150, credit 120.
    expect(within(tfoot(container)!).getByText("D=150")).toBeInTheDocument();
    expect(within(tfoot(container)!).getByText("C=120 page=3")).toBeInTheDocument();
  });

  it("puts an empty cell under the selection column", () => {
    const { container } = renderTable({
      selection: {
        isSelected: () => false,
        onToggle: () => {},
        allSelected: false,
        someSelected: false,
        onToggleAll: () => {},
      },
    });
    const cells = Array.from(tfoot(container)!.querySelectorAll("tr > *"));
    expect(cells).toHaveLength(5);
    expect(cells[0].textContent).toBe("");
    expect(cells[0]).not.toHaveAttribute("data-col");
  });

  it("moves the label when its column is hidden", () => {
    const { container } = renderTable();
    fireEvent.click(screen.getAllByRole("button", { name: /Columns/ })[0]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Account" }));
    const foot = tfoot(container)!;
    expect(Array.from(foot.querySelectorAll("tr > *")).map((c) => c.getAttribute("data-col"))).toEqual([
      "name",
      "debit",
      "credit",
    ]);
    expect(within(foot).getByRole("rowheader", { name: "Total" })).toHaveAttribute("data-col", "name");
  });

  it("is off with footer={false}, without footer columns, and with no rows", () => {
    const off = renderTable({ footer: false });
    expect(tfoot(off.container)).toBeNull();
    off.unmount();
    const plain = render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={COLUMNS.map(({ footer: _f, ...c }) => c)} rowKey={(r) => r.no} />
      </MemoryRouter>,
    );
    expect(tfoot(plain.container)).toBeNull();
    plain.unmount();
    const empty = renderTable({ rows: [] });
    expect(tfoot(empty.container)).toBeNull();
  });

  it("server mode hands the footer the page it holds", () => {
    const { container } = renderTable({
      serverPagination: { page: 0, pageSize: 2, total: 40, onPageChange: () => {} },
      rows: ROWS.slice(0, 2),
    });
    expect(within(tfoot(container)!).getByText("C=0 page=2")).toBeInTheDocument();
  });

  it("on a phone, renders a labelled summary card after the list", () => {
    phone();
    renderTable({ columns: COLUMNS.map((c) => (c.key === "credit" ? { ...c, mobileHidden: true } : c)) });
    const card = screen.getByRole("region", { name: "Total" });
    expect(within(card).getByText("Debit")).toBeInTheDocument();
    expect(within(card).getByText("D=150")).toBeInTheDocument();
    // `mobileHidden` holds on the summary as on the cards.
    expect(within(card).queryByText(/C=/)).toBeNull();
    // After the list, not inside it.
    expect(card.closest("ul")).toBeNull();
  });
});
