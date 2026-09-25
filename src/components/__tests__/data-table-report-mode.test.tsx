import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";

/**
 * B20 — what keksdose's aggregated report tables needed before they could move onto
 * DataTable: keyboard-activatable rows, a configurable sort cycle, a switch for the
 * power-user chrome, and a mode without the card frame.
 *
 * jsdom has no `matchMedia`, so these render the DESKTOP table (see data-table-a11y).
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
  { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name },
  {
    key: "amount",
    header: "Amount",
    cell: (r) => r.amount,
    sortBy: (r) => r.amount,
    firstSort: "desc",
  },
  {
    key: "actions",
    header: "Actions",
    cell: (r) => (
      <>
        <button type="button">Edit {r.name}</button>
        <a href={`#x-${r.id}`}>Link {r.name}</a>
        <input aria-label={`Note ${r.name}`} />
      </>
    ),
  },
];

function renderTable(extra: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} {...extra} />
    </MemoryRouter>,
  );
}

const bodyRows = () => screen.getAllByRole("row").slice(1);
const rowOf = (name: string) => screen.getByRole("cell", { name }).closest("tr")!;
const header = (name: string) =>
  screen.getAllByRole("columnheader").find((th) => th.textContent?.startsWith(name))!;
const names = () => bodyRows().map((r) => within(r).getAllByRole("cell")[0].textContent);

describe("keyboard-activatable rows", () => {
  it("puts exactly one row in the tab order and keeps the row role", () => {
    renderTable({ onRowClick: () => {} });
    const rows = bodyRows();
    expect(rows.map((r) => r.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    for (const r of rows) {
      expect(r.tagName).toBe("TR");
      expect(r).not.toHaveAttribute("role");
      expect(r.className).toContain("focus-visible:outline-2");
    }
  });

  it("is not focusable without onRowClick", () => {
    renderTable();
    for (const r of bodyRows()) expect(r).not.toHaveAttribute("tabindex");
  });

  it("activates on Enter and Space, and only for the row itself", () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    const row = rowOf("Bravo");
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenLastCalledWith(ROWS[1]);

    // A key press inside a nested control belongs to that control.
    fireEvent.keyDown(screen.getByRole("button", { name: "Edit Bravo" }), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Note Bravo" }), { key: " " });
    // And a modified Enter is not an activation.
    fireEvent.keyDown(row, { key: "Enter", ctrlKey: true });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("moves focus with the arrow keys, Home and End, and roves the tab stop", () => {
    renderTable({ onRowClick: () => {} });
    const [a, b, c] = bodyRows();
    act(() => a.focus());
    fireEvent.keyDown(a, { key: "ArrowDown" });
    expect(document.activeElement).toBe(b);
    expect(b).toHaveAttribute("tabindex", "0");
    expect(a).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(b, { key: "End" });
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c, { key: "ArrowDown" }); // stays at the end
    expect(document.activeElement).toBe(c);
    fireEvent.keyDown(c, { key: "Home" });
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(a, { key: "ArrowUp" });
    expect(document.activeElement).toBe(a);
  });

  it("does not open the row for clicks on nested buttons, links or inputs", () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    fireEvent.click(screen.getByRole("button", { name: "Edit Alpha" }));
    fireEvent.click(screen.getByRole("link", { name: "Link Alpha" }));
    fireEvent.click(screen.getByRole("textbox", { name: "Note Alpha" }));
    expect(onRowClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("cell", { name: "Alpha" }));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("still opens the row through its own rowHref link", () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick, rowHref: (r) => `/rows/${r.id}` });
    const link = screen.getByRole("link", { name: "Alpha" });
    expect(link).toHaveAttribute("data-row-link");
    fireEvent.click(link);
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("says whether an expandable row is open", () => {
    renderTable({
      onRowClick: () => {},
      expandedRow: (r) => `detail ${r.name}`,
      isExpanded: (r) => r.id === 2,
    });
    expect(rowOf("Alpha")).toHaveAttribute("aria-expanded", "false");
    expect(rowOf("Bravo")).toHaveAttribute("aria-expanded", "true");
  });
});

describe("configurable sort cycle", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());
  const settle = () =>
    act(async () => {
      vi.advanceTimersByTime(60);
    });

  it("starts a firstSort=desc column descending and announces that", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(header("Amount")).toHaveAttribute("aria-sort", "descending");
    expect(names()).toEqual(["Bravo", "Charlie", "Alpha"]);
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent("Sorted by Amount, descending");

    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(header("Amount")).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(header("Amount")).toHaveAttribute("aria-sort", "none");
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent("Sort cleared on Amount");
  });

  it("sortCycle=toggle never reaches unsorted, and aria-sort and the announcement follow", async () => {
    renderTable({ sortCycle: "toggle" });
    const btn = () => screen.getByRole("button", { name: "Amount" });
    fireEvent.click(btn());
    fireEvent.click(btn());
    fireEvent.click(btn());
    expect(header("Amount")).toHaveAttribute("aria-sort", "descending");
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent("Sorted by Amount, descending");
    fireEvent.click(btn());
    expect(header("Amount")).toHaveAttribute("aria-sort", "ascending");
    expect(names()).toEqual(["Alpha", "Charlie", "Bravo"]);
  });

  it("reports the configured cycle to a controlled owner", () => {
    const onSortsChange = vi.fn();
    renderTable({
      sortCycle: "toggle",
      sorts: [{ key: "amount", dir: "asc" }],
      onSortsChange,
    });
    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(onSortsChange).toHaveBeenCalledWith([{ key: "amount", dir: "desc" }]);
  });
});

describe("chrome switches", () => {
  const settingsRail = () => screen.queryByRole("button", { name: /Columns \(/ });
  const handles = () => screen.queryAllByRole("separator");

  it("shows the full chrome by default", () => {
    renderTable();
    expect(settingsRail()).toBeInTheDocument();
    expect(handles()).toHaveLength(COLUMNS.length);
  });

  it('chrome="minimal" drops the settings rail, the resize handles and multi-sort', () => {
    renderTable({ chrome: "minimal" });
    expect(settingsRail()).not.toBeInTheDocument();
    expect(screen.queryByText("Auto-size columns")).not.toBeInTheDocument();
    expect(handles()).toHaveLength(0);
    // Shift-click is a plain click: the second column replaces the first.
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    fireEvent.click(screen.getByRole("button", { name: "Amount" }), { shiftKey: true });
    expect(header("Name")).toHaveAttribute("aria-sort", "none");
    expect(header("Amount")).toHaveAttribute("aria-sort", "descending");
    expect(header("Amount").querySelector(".text-brand")).toBeNull(); // no priority badge
  });

  it("drops the shift-click tooltip with multi-sort", async () => {
    const hint = async (extra: Partial<DataTableProps<Row>>) => {
      const { unmount } = renderTable(extra);
      const btn = screen.getByRole("button", { name: "Name" });
      fireEvent.mouseEnter(btn);
      fireEvent.focus(btn);
      await act(async () => {});
      const shown = !!screen.queryByText(/Shift-click/);
      unmount();
      return shown;
    };
    expect(await hint({})).toBe(true); // the control: the default table has it
    expect(await hint({ multiSort: false })).toBe(false);
    expect(await hint({ chrome: "minimal" })).toBe(false);
  });

  it("lets an explicit boolean win over the preset, each switch on its own", () => {
    const { unmount } = renderTable({ chrome: "minimal", resizable: true });
    expect(handles()).toHaveLength(COLUMNS.length);
    expect(settingsRail()).not.toBeInTheDocument();
    unmount();

    renderTable({ columnSettings: false });
    expect(settingsRail()).not.toBeInTheDocument();
    expect(handles()).toHaveLength(COLUMNS.length);
  });

  it("ignores persisted hidden columns and widths while their controls are off", () => {
    localStorage.setItem(
      "hbui-table:b20",
      JSON.stringify({ sort: null, filters: {}, pageSize: 25, widths: { name: 80 }, hidden: ["amount"] }),
    );
    const { unmount } = renderTable({ storageKey: "b20" });
    expect(screen.queryByRole("button", { name: "Amount" })).not.toBeInTheDocument();
    expect(header("Name").style.width).toBe("80px");
    unmount();

    renderTable({ storageKey: "b20", chrome: "minimal" });
    expect(screen.getByRole("button", { name: "Amount" })).toBeInTheDocument();
    expect(header("Name").style.width).toBe("");
    localStorage.removeItem("hbui-table:b20");
  });
});

describe("frame", () => {
  it("renders inside the kit's card by default, with className on the root", () => {
    const { container } = renderTable({ className: "mt-4" });
    const root = container.querySelector("[data-density]")!;
    expect(root).toHaveClass("border-y", "mt-4", "overflow-clip");
    expect(root).not.toHaveAttribute("data-frame");
  });

  it("frame={false} drops the card's border, surface and shadow", () => {
    const { container } = renderTable({ frame: false, className: "mt-4" });
    const root = container.querySelector("[data-density]")!;
    expect(root).toHaveAttribute("data-frame", "none");
    expect(root).toHaveClass("group/table", "mt-4");
    expect(root.className).not.toMatch(/border|shadow|rounded|bg-\[var\(--bg-surface\)\]/);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
