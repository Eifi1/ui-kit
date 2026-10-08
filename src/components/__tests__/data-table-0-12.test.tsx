import { useState } from "react";
import { createPortal } from "react-dom";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { BooleanMark, booleanColumn } from "../data-table-cells";
import {
  type ColumnFilter,
  dateFilter,
  filterHref,
  numberFilter,
  selectFilter,
  textFilter,
} from "../data-table-filters";
import { DEFAULT_DATA_TABLE_LABELS } from "../data-table-labels";
import { readTableUrlState, useTableUrlState } from "../use-table-state";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * 0.12.0: row actions and the toolbar, the "No entries" default, the yes/no cell, the
 * filter builders and `filterHref`, the owner-held URL state for a server table, and
 * clicks inside an expanded row. As in the sibling suites, jsdom has no `matchMedia`, so
 * the DESKTOP table renders unless a test stubs a phone.
 */

interface Row {
  id: number;
  name: string;
  active: boolean | null;
}

const ROWS: Row[] = [
  { id: 1, name: "Alpha", active: true },
  { id: 2, name: "Bravo", active: false },
  { id: 3, name: "Charlie", active: null },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name, filterBy: (r) => r.name },
];

function renderTable(extra: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} {...extra} />
    </MemoryRouter>,
  );
}

function stubPhone() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("width <"), // the phone layout's `(width < 768px)`
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  return () => vi.unstubAllGlobals();
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("DataTable rowActions", () => {
  it("renders an actions column with the preset edit and delete buttons", () => {
    renderTable({
      rowActions: [
        { kind: "edit", onAction: vi.fn() },
        { kind: "delete", onAction: vi.fn() },
      ],
    });
    // The header has a name for a screen reader and no visible text.
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    const first = screen.getAllByRole("row")[1];
    expect(within(first).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(first).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("runs the action without opening the row", () => {
    const onEdit = vi.fn();
    const onRowClick = vi.fn();
    renderTable({ onRowClick, rowActions: [{ kind: "edit", onAction: onEdit }] });
    fireEvent.click(within(screen.getAllByRole("row")[2]).getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(ROWS[1]);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("asks `confirm` first and acts only on a yes", async () => {
    const onDelete = vi.fn();
    const confirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderTable({ rowActions: [{ kind: "delete", onAction: onDelete, confirm }] });
    const del = within(screen.getAllByRole("row")[1]).getByRole("button", { name: "Delete" });

    fireEvent.click(del);
    await flush();
    expect(confirm).toHaveBeenCalledWith(ROWS[0]);
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(del);
    await flush();
    expect(onDelete).toHaveBeenCalledWith(ROWS[0]);
  });

  it("takes per-row actions, custom labels and translated preset names", () => {
    render(
      <UiKitProvider labels={{ dataTable: { edit: "Bearbeiten", actions: "Aktionen" } }}>
        <MemoryRouter>
          <DataTable
            rows={ROWS}
            columns={COLUMNS}
            rowKey={(r) => r.id}
            rowActions={(row) => [
              { kind: "edit", onAction: vi.fn(), hidden: () => row.id === 2 },
              { label: "Archive", icon: <span>A</span>, onAction: vi.fn() },
            ]}
          />
        </MemoryRouter>
      </UiKitProvider>,
    );
    const [, first, second] = screen.getAllByRole("row");
    expect(within(first).getByRole("button", { name: "Bearbeiten" })).toBeInTheDocument();
    expect(within(second).queryByRole("button", { name: "Bearbeiten" })).toBeNull();
    expect(within(second).getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Aktionen" })).toBeInTheDocument();
  });

  it("keeps the actions column out of the column-settings panel and its count", () => {
    renderTable({ rowActions: [{ kind: "edit", onAction: vi.fn() }] });
    expect(screen.getAllByRole("button", { name: "Columns (1/1)" }).length).toBeGreaterThan(0);
  });

  describe("on a phone", () => {
    let restore: () => void;
    beforeEach(() => {
      restore = stubPhone();
    });
    afterEach(() => restore());

    it("offers the same actions as swipes (delete toward the start, edit toward the end)", async () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const confirm = vi.fn().mockResolvedValue(true);
      renderTable({
        rows: ROWS.slice(0, 1),
        rowActions: [
          { kind: "edit", onAction: onEdit },
          { kind: "delete", onAction: onDelete, confirm },
        ],
      });
      // No actions column on the card: the card list has no table at all.
      expect(screen.queryByRole("table")).toBeNull();
      const group = screen.getByRole("group", { name: "Row actions" });
      // Drag-right (LTR end) first, then drag-left (LTR start).
      expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Edit", "Delete"]);
      fireEvent.click(within(group).getByRole("button", { name: "Delete" }));
      await flush();
      expect(confirm).toHaveBeenCalledWith(ROWS[0]);
      expect(onDelete).toHaveBeenCalledWith(ROWS[0]);
    });

    it("gives no swipe to an action with `swipe: false` or a disabled reason", () => {
      renderTable({
        rows: ROWS.slice(0, 1),
        rowActions: [
          { kind: "edit", onAction: vi.fn(), swipe: false },
          { kind: "delete", onAction: vi.fn(), disabledReason: () => "Locked" },
        ],
      });
      expect(screen.queryByRole("group", { name: "Row actions" })).toBeNull();
    });

    it("lets an explicit mobileSwipeActions win", () => {
      renderTable({
        rows: ROWS.slice(0, 1),
        rowActions: [{ kind: "edit", onAction: vi.fn() }],
        mobileSwipeActions: () => ({
          end: [{ label: "Own", onCommit: vi.fn(), className: "", armedClassName: "" }],
        }),
      });
      const group = screen.getByRole("group", { name: "Row actions" });
      expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Own"]);
    });
  });
});

describe("DataTable toolbar", () => {
  it("renders above the table, inside the frame", () => {
    const { container } = renderTable({ toolbar: <button type="button">New</button> });
    const bar = container.querySelector("[data-table-toolbar]");
    expect(bar).not.toBeNull();
    expect(within(bar as HTMLElement).getByRole("button", { name: "New" })).toBeInTheDocument();
    // Before the table in document order.
    expect(bar!.compareDocumentPosition(screen.getByRole("table")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders nothing without one", () => {
    const { container } = renderTable();
    expect(container.querySelector("[data-table-toolbar]")).toBeNull();
  });
});

describe("DataTable empty state", () => {
  it("says 'No entries' by default, not a dash", () => {
    renderTable({ rows: [] });
    expect(screen.getByText(DEFAULT_DATA_TABLE_LABELS.empty)).toBeInTheDocument();
    expect(DEFAULT_DATA_TABLE_LABELS.empty).toBe("No entries");
    expect(screen.queryByText("—")).toBeNull();
  });

  it("takes the provider's translation, and the prop still wins", () => {
    const { unmount } = render(
      <UiKitProvider labels={{ dataTable: { empty: "Keine Einträge" } }}>
        <MemoryRouter>
          <DataTable rows={[] as Row[]} columns={COLUMNS} rowKey={(r) => r.id} />
        </MemoryRouter>
      </UiKitProvider>,
    );
    expect(screen.getByText("Keine Einträge")).toBeInTheDocument();
    unmount();
    renderTable({ rows: [], empty: "Nothing yet" });
    expect(screen.getByText("Nothing yet")).toBeInTheDocument();
  });
});

describe("DataTable expandedRow", () => {
  function Expandable({ onRowClick }: { onRowClick: (r: Row) => void }) {
    const [open, setOpen] = useState<number | null>(1);
    return (
      <MemoryRouter>
        <DataTable
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          onRowClick={(r) => {
            onRowClick(r);
            setOpen((id) => (id === r.id ? null : r.id));
          }}
          isExpanded={(r) => r.id === open}
          expandedRow={(r) => (
            <div>
              <p>Details of {r.name}</p>
              <textarea aria-label="Comment" />
            </div>
          )}
        />
      </MemoryRouter>
    );
  }

  it("does not open or close the row for a click inside the expansion (desktop)", () => {
    const onRowClick = vi.fn();
    render(<Expandable onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("Details of Alpha"));
    fireEvent.click(screen.getByRole("textbox", { name: "Comment" }));
    expect(onRowClick).not.toHaveBeenCalled();
    expect(screen.getByText("Details of Alpha")).toBeInTheDocument();
  });

  it("does not open or close the row for a click inside the expansion (phone)", () => {
    const restore = stubPhone();
    try {
      const onRowClick = vi.fn();
      render(<Expandable onRowClick={onRowClick} />);
      fireEvent.click(screen.getByText("Details of Alpha"));
      fireEvent.click(screen.getByRole("textbox", { name: "Comment" }));
      expect(onRowClick).not.toHaveBeenCalled();
      expect(screen.getByText("Details of Alpha")).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});

describe("DataTable clicks from a portal", () => {
  // React bubbles a portal's events through the component tree: a popover a cell
  // opens at <body> used to report its clicks to the row, which opened.
  const portalled: DataTableColumn<Row>[] = [
    ...COLUMNS,
    {
      key: "menu",
      header: "Menu",
      cell: (r) => createPortal(<p>Panel of {r.name}</p>, document.body),
    },
  ];

  it("does not open the row (desktop)", () => {
    const onRowClick = vi.fn();
    renderTable({ columns: portalled, onRowClick });
    fireEvent.click(screen.getByText("Panel of Bravo"));
    expect(onRowClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Bravo"));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);
  });

  it("does not open the card, plain or linked (phone)", () => {
    const restore = stubPhone();
    try {
      const onRowClick = vi.fn();
      const { unmount } = renderTable({ columns: portalled, onRowClick });
      fireEvent.click(screen.getByText("Panel of Bravo"));
      expect(onRowClick).not.toHaveBeenCalled();
      unmount();

      renderTable({ columns: portalled, onRowClick, rowHref: (r) => `/rows/${r.id}` });
      const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      screen.getByText("Panel of Bravo").dispatchEvent(click);
      expect(onRowClick).not.toHaveBeenCalled();
      // Not cancelled either: a link inside the panel must still work.
      expect(click.defaultPrevented).toBe(false);
    } finally {
      restore();
    }
  });
});

describe("BooleanMark", () => {
  it("draws check / cross / dash, each with words for a screen reader", () => {
    render(
      <>
        <BooleanMark value={true} />
        <BooleanMark value={false} />
        <BooleanMark value={null} />
        <BooleanMark value={false} falseAs="dash" />
      </>,
    );
    expect(screen.getByText("Yes")).toHaveClass("sr-only");
    expect(screen.getAllByText("No")).toHaveLength(2);
    expect(screen.getByText("Not set")).toBeInTheDocument();
    const marks = document.querySelectorAll("[data-value]");
    expect(Array.from(marks).map((m) => m.getAttribute("data-value"))).toEqual(["true", "false", "unset", "false"]);
    // The glyph itself is decoration.
    for (const m of Array.from(marks)) expect(m.querySelector("svg")).toHaveAttribute("aria-hidden");
  });

  it("speaks the provider's words", () => {
    render(
      <UiKitProvider labels={{ dataTable: { booleanTrue: "Ja" } }}>
        <BooleanMark value />
      </UiKitProvider>,
    );
    expect(screen.getByText("Ja")).toBeInTheDocument();
  });
});

describe("booleanColumn", () => {
  it("renders marks, sorts yes first and filters by yes/no", () => {
    const col = booleanColumn<Row>({
      key: "active",
      header: "Active",
      value: (r) => r.active,
      filterOptions: { true: "Yes", false: "No" },
    });
    expect(col.sortBy!(ROWS[0])).toBe(0);
    expect(col.sortBy!(ROWS[1])).toBe(1);
    expect(col.sortBy!(ROWS[2])).toBeNull();
    expect(col.filter).toEqual({
      type: "select",
      getValue: expect.any(Function),
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    });
    renderTable({ columns: [...COLUMNS, col] });
    expect(document.querySelectorAll("tbody [data-value]")).toHaveLength(3);
  });
});

describe("filter builders and filterHref", () => {
  const get = (r: Row) => r.name;
  it("build each filter type", () => {
    expect(textFilter(get)).toEqual({ type: "text", getValue: get });
    expect(dateFilter(get)).toEqual({ type: "date", getValue: get });
    const num = (r: Row) => r.id;
    expect(numberFilter(num)).toEqual({ type: "number", getValue: num });
  });

  it("selectFilter takes a { value: label } record or an array", () => {
    const options = (f: ColumnFilter<Row>) => (f.type === "select" ? f.options : null);
    expect(options(selectFilter(get, { open: "Open", done: "Done" }))).toEqual([
      { value: "open", label: "Open" },
      { value: "done", label: "Done" },
    ]);
    expect(options(selectFilter(get, [{ value: "a" }]))).toEqual([{ value: "a" }]);
    expect(options(selectFilter(get))).toBeUndefined();
  });

  it("filterHref links to a list with a filter applied, in the table's own scheme", () => {
    expect(filterHref("/units", "status", ["vacant"])).toBe("/units?f.status=vacant");
    expect(filterHref("/units", "name", "Rewe Markt")).toBe("/units?f.name=Rewe+Markt");
    expect(filterHref("/units?tab=a#top", "status", ["a,b", "c"])).toBe("/units?tab=a&f.status=a%252Cb%2Cc#top");
    expect(filterHref("/units", "status", [])).toBe("/units");
    expect(filterHref("/tx", "date", { type: "date", from: "2026-01-01", to: "" })).toBe(
      "/tx?f.date=2026-01-01..",
    );
    // What the table reads back.
    const cols: DataTableColumn<Row>[] = [
      { key: "status", header: "S", cell: () => null, filter: selectFilter(get) },
    ];
    const href = filterHref("/units", "status", ["a,b", "c"]);
    const state = readTableUrlState(new URLSearchParams(href.split("?")[1]), cols);
    expect(state.filters).toEqual({ status: { type: "select", values: ["a,b", "c"] } });
  });
});

describe("useTableUrlState", () => {
  const cols: DataTableColumn<Row>[] = [
    { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name, filter: textFilter((r) => r.name) },
  ];

  let hook: ReturnType<typeof useTableUrlState> | null = null;
  let search = "";
  function Probe({ withSearch = false }: { withSearch?: boolean }) {
    hook = useTableUrlState({ columns: cols, defaultPageSize: 10, search: withSearch });
    search = useLocation().search;
    return null;
  }

  it("seeds from the URL, writes changes back by replace, and resets the page", () => {
    render(
      <MemoryRouter initialEntries={["/list?f.name=Al&sort=name.desc&p=3&ps=50&other=1"]}>
        <Probe />
      </MemoryRouter>,
    );
    expect(hook!.filters).toEqual({ name: { type: "text", q: "Al" } });
    expect(hook!.sorts).toEqual([{ key: "name", dir: "desc" }]);
    expect(hook!.page).toBe(2);
    expect(hook!.pageSize).toBe(50);

    act(() => hook!.setPage(4));
    expect(new URLSearchParams(search).get("p")).toBe("5");

    act(() => hook!.setFilters({ name: { type: "text", q: "Br" } }));
    expect(hook!.page).toBe(0);
    const sp = new URLSearchParams(search);
    expect(sp.get("f.name")).toBe("Br");
    expect(sp.get("p")).toBeNull();
    expect(sp.get("other")).toBe("1");

    act(() => hook!.setPageSize(10));
    expect(new URLSearchParams(search).get("ps")).toBeNull();
  });

  it("manages `q` only when asked to", () => {
    render(
      <MemoryRouter initialEntries={["/list?q=hello"]}>
        <Probe withSearch />
      </MemoryRouter>,
    );
    expect(hook!.search).toBe("hello");
    act(() => hook!.setSearch("world"));
    expect(new URLSearchParams(search).get("q")).toBe("world");
    act(() => hook!.setSearch(""));
    expect(new URLSearchParams(search).get("q")).toBeNull();
  });

  it("leaves someone else's `q` alone by default", () => {
    render(
      <MemoryRouter initialEntries={["/list?q=keep"]}>
        <Probe />
      </MemoryRouter>,
    );
    act(() => hook!.setPage(1));
    expect(new URLSearchParams(search).get("q")).toBe("keep");
    expect(hook!.search).toBe("");
  });

  it("hands the table everything through tableProps", () => {
    function Host() {
      const table = useTableUrlState({ columns: cols, defaultPageSize: 2 });
      search = useLocation().search;
      return (
        <DataTable
          rows={ROWS.slice(table.page * 2, table.page * 2 + 2)}
          columns={cols}
          rowKey={(r) => r.id}
          {...table.tableProps(ROWS.length, { isLoading: false })}
        />
      );
    }
    render(
      <MemoryRouter>
        <Host />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(new URLSearchParams(search).get("p")).toBe("2");
    expect(screen.getByText("Charlie")).toBeInTheDocument();
  });
});
