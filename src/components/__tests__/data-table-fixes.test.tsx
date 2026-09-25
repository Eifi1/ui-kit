import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { HashRouter, MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps, FilterState } from "../data-table";
import { Pagination } from "../data-table-pagination";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { SwipeAction } from "../swipeable-row";

/**
 * The 0.7.0 data-table fixes, one `describe` per finding: server loading state,
 * Shift-click range on the checkbox, urlSync under a HashRouter, RTL, the standalone
 * pager's labels, the inert page-size select, `paginated={false}` on phones, and the
 * page reset for controlled filters.
 *
 * Environment as in the sibling suites: a Router around every render, and no
 * `matchMedia` in jsdom — so the DESKTOP table renders unless a test stubs it.
 */

interface Row {
  id: number;
  name: string;
  city: string;
  amount: number;
}

const ROWS: Row[] = [
  { id: 1, name: "Delta", city: "Bern", amount: 40 },
  { id: 2, name: "Alpha", city: "Zug", amount: 10 },
  { id: 3, name: "Echo", city: "Bern", amount: 50 },
  { id: 4, name: "Bravo", city: "Zug", amount: 20 },
  { id: 5, name: "Charlie", city: "Bern", amount: 30 },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name },
  { key: "city", header: "City", cell: (r) => r.city, filterBy: (r) => r.city },
  {
    key: "amount",
    header: "Amount",
    cell: (r) => String(r.amount),
    sortBy: (r) => r.amount,
    // What every numeric column written before 0.7.0 says.
    className: "text-right tabular-nums",
    headClassName: "text-right",
  },
];

function renderTable(extra: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} {...extra} />
    </MemoryRouter>,
  );
}

function namesOnScreen(): string[] {
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  return rows.map((r) => within(r).getAllByRole("cell")[0]?.textContent ?? "");
}

/** The phone layout: `useMediaQuery("(min-width: 768px)")` answers false. */
function stubPhone() {
  const mql = {
    matches: false,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vi.stubGlobal("matchMedia", () => mql);
  return () => vi.unstubAllGlobals();
}

// ---------------------------------------------------------------------------

describe("serverPagination.isLoading", () => {
  const server = (isLoading: boolean) => ({
    page: 0,
    pageSize: 2,
    total: 5,
    onPageChange: vi.fn(),
    isLoading,
  });

  it("marks the table busy and dims the rows it is still showing", () => {
    renderTable({ rows: ROWS.slice(0, 2), serverPagination: server(true) });
    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("aria-busy", "true");
    expect(table.querySelector("tbody")).toHaveClass("opacity-60");
    // The pager stays usable: disabling it would drop focus off the button just pressed.
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("says loading, not empty, before the first page has arrived", () => {
    renderTable({ rows: [], serverPagination: server(true), empty: "No rows" });
    expect(screen.queryByText("No rows")).not.toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("is not busy once the page is in", () => {
    renderTable({ rows: [], serverPagination: server(false), empty: "No rows" });
    expect(screen.getByRole("table")).not.toHaveAttribute("aria-busy");
    expect(screen.getByText("No rows")).toBeInTheDocument();
  });
});

describe("Shift-click on a row checkbox", () => {
  it("reports the range through onToggleMany only, never also as a single toggle", () => {
    const onToggle = vi.fn();
    const onToggleMany = vi.fn();
    renderTable({
      selection: {
        isSelected: () => false,
        allSelected: false,
        someSelected: false,
        onToggleAll: () => {},
        onToggle,
        onToggleMany,
      },
    });
    const boxes = () => screen.getAllByRole("checkbox", { name: "Select row" });
    fireEvent.click(boxes()[1]); // anchor on Alpha
    expect(onToggle).toHaveBeenCalledTimes(1);
    onToggle.mockClear();

    fireEvent.click(boxes()[3], { shiftKey: true });

    expect(onToggleMany).toHaveBeenCalledTimes(1);
    expect(onToggleMany.mock.calls[0][0].map((r: Row) => r.name)).toEqual([
      "Alpha",
      "Echo",
      "Bravo",
    ]);
    // Was called once more, for Bravo: React's `onChange` fires from the click
    // itself, and `preventDefault` does not stop it.
    expect(onToggle).not.toHaveBeenCalled();

    // ...and the NEXT plain click is not swallowed by the one before it.
    fireEvent.click(boxes()[4]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("urlSync reads and writes the same query string", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("opens a MemoryRouter deep link filtered", () => {
    // `window.location.search` is empty here: the router's own location is the only
    // place the filter exists, which is the point.
    render(
      <MemoryRouter initialEntries={["/?f.city=Bern"]}>
        <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} urlSync />
      </MemoryRouter>,
    );
    expect(namesOnScreen()).toEqual(["Delta", "Echo", "Charlie"]);
  });

  it("opens a HashRouter link filtered, and leaves the link's filter in place", () => {
    window.history.replaceState(null, "", "/#/tx?f.city=Zug");
    expect(window.location.search).toBe("");
    render(
      <HashRouter>
        <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} urlSync />
      </HashRouter>,
    );
    expect(namesOnScreen()).toEqual(["Alpha", "Bravo"]);
    // Before the fix the table read the (empty) `location.search`, then wrote its
    // unfiltered state into the hash — overwriting the shared link.
    expect(window.location.hash).toContain("f.city=Zug");
    expect(window.location.search).toBe("");
  });
});

describe("DataTable in a right-to-left layout", () => {
  it("aligns logically, and reads a legacy text-right as the end of the line", () => {
    renderTable();
    const headerRow = screen.getAllByRole("row")[0];
    expect(headerRow).toHaveClass("text-start");
    expect(headerRow).not.toHaveClass("text-left");

    const amountHead = screen.getAllByRole("columnheader")[2];
    expect(amountHead).toHaveClass("text-end");
    expect(amountHead).not.toHaveClass("text-right");
    // The end-aligned header still puts its sort button at the aligned edge.
    expect(amountHead.firstElementChild).toHaveClass("flex-row-reverse");

    const amountCell = screen.getByText("40").closest("td")!;
    expect(amountCell).toHaveClass("text-end", "tabular-nums");
    expect(amountCell).not.toHaveClass("text-right");
  });

  it("leaves an alignment scoped to one direction alone", () => {
    renderTable({
      columns: [{ ...COLUMNS[0], className: "rtl:text-right md:text-left" }],
    });
    const cell = screen.getByText("Delta").closest("td")!;
    expect(cell).toHaveClass("rtl:text-right", "md:text-start");
  });

  it("widens a column when its handle is dragged toward the start (left)", () => {
    render(
      <div dir="rtl">
        <MemoryRouter>
          <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />
        </MemoryRouter>
      </div>,
    );
    const sep = screen.getAllByRole("separator")[0];
    // jsdom lays nothing out, so the column starts at 0px wide.
    fireEvent.pointerDown(sep, { pointerId: 1, button: 0, clientX: 200 });
    fireEvent.pointerMove(sep, { pointerId: 1, clientX: 80 });
    fireEvent.pointerUp(sep, { pointerId: 1 });
    // LTR arithmetic made this a narrowing drag, clamped to the 40px minimum.
    expect(screen.getAllByRole("columnheader")[0].style.width).toBe("120px");
    expect(sep).toHaveClass("end-0");
  });

  it("flips the pager's chevrons", () => {
    renderTable({ defaultPageSize: 2 });
    for (const name of ["Previous page", "Next page"]) {
      const svg = screen.getByRole("button", { name }).querySelector("svg")!;
      expect(svg.getAttribute("class")).toContain("rtl:-scale-x-100");
    }
  });

  describe("on a phone", () => {
    let restore: () => void;
    beforeEach(() => {
      restore = stubPhone();
    });
    afterEach(() => restore());

    const action = (label: string): SwipeAction => ({
      label,
      onCommit: () => {},
      className: "",
      armedClassName: "",
    });

    function renderSwipe(dir: "ltr" | "rtl") {
      render(
        <div dir={dir}>
          <MemoryRouter>
            <DataTable
              rows={ROWS.slice(0, 1)}
              columns={COLUMNS}
              rowKey={(r) => r.id}
              mobileSwipeActions={() => ({ start: [action("Back")], end: [action("Forward")] })}
            />
          </MemoryRouter>
        </div>,
      );
      // SwipeableRow lists the drag-RIGHT actions first, then the drag-LEFT ones.
      return within(screen.getByRole("group", { name: "Row actions" }))
        .getAllByRole("button")
        .map((b) => b.textContent);
    }

    it("maps logical swipe sides onto the physical drag in LTR", () => {
      expect(renderSwipe("ltr")).toEqual(["Forward", "Back"]);
    });

    it("maps them the other way round in RTL", () => {
      expect(renderSwipe("rtl")).toEqual(["Back", "Forward"]);
    });

    it("keeps the physical left/right meaning physical", () => {
      render(
        <div dir="rtl">
          <MemoryRouter>
            <DataTable
              rows={ROWS.slice(0, 1)}
              columns={COLUMNS}
              rowKey={(r) => r.id}
              mobileSwipeActions={() => ({ right: [action("R")], left: [action("L")] })}
            />
          </MemoryRouter>
        </div>,
      );
      const labels = within(screen.getByRole("group", { name: "Row actions" }))
        .getAllByRole("button")
        .map((b) => b.textContent);
      expect(labels).toEqual(["R", "L"]);
    });

    it("carries the direction into the portalled filter sheet", () => {
      render(
        <div dir="rtl">
          <MemoryRouter>
            <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />
          </MemoryRouter>
        </div>,
      );
      fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
      expect(screen.getByRole("dialog")).toHaveAttribute("dir", "rtl");
    });
  });
});

describe("standalone Pagination", () => {
  it("speaks the provider's dataTable labels", () => {
    render(
      <UiKitProvider labels={{ dataTable: { pageSize: "Zeilen pro Seite", nextPage: "Weiter" } }}>
        <Pagination page={0} totalPages={3} pageSize={10} total={30} onPage={() => {}} onPageSize={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Zeilen pro Seite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeInTheDocument();
    // Keys neither the provider nor the prop states fall back to English.
    expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
  });

  it("lets its own labels prop win over the provider", () => {
    render(
      <UiKitProvider labels={{ dataTable: { nextPage: "Weiter" } }}>
        <Pagination
          page={0}
          totalPages={3}
          pageSize={10}
          total={30}
          onPage={() => {}}
          labels={{ nextPage: "Suivant" }}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Suivant" })).toBeInTheDocument();
  });

  it("renders no page-size select without onPageSize", () => {
    render(<Pagination page={0} totalPages={3} pageSize={10} total={30} onPage={() => {}} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("server mode page-size select", () => {
  const base = { page: 0, pageSize: 2, total: 5, onPageChange: () => {} };

  it("is hidden when the owner cannot change the page size", () => {
    renderTable({ rows: ROWS.slice(0, 2), serverPagination: base });
    expect(screen.queryByRole("combobox", { name: "Rows per page" })).not.toBeInTheDocument();
  });

  it("is shown, and reports, when the owner can", () => {
    const onPageSizeChange = vi.fn();
    renderTable({ rows: ROWS.slice(0, 2), serverPagination: { ...base, onPageSizeChange } });
    fireEvent.change(screen.getByRole("combobox", { name: "Rows per page" }), {
      target: { value: "50" },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});

describe("paginated={false} on a phone", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = stubPhone();
  });
  afterEach(() => restore());

  const many: Row[] = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `Row ${i + 1}`,
    city: "Bern",
    amount: i,
  }));

  it("renders every row, with no reveal sentinel", () => {
    render(
      <MemoryRouter>
        <DataTable
          rows={many}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          defaultPageSize={10}
          paginated={false}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Row 30")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("still reveals in chunks when paginated", () => {
    render(
      <MemoryRouter>
        <DataTable rows={many} columns={COLUMNS} rowKey={(r) => r.id} defaultPageSize={10} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Row 10")).toBeInTheDocument();
    expect(screen.queryByText("Row 11")).not.toBeInTheDocument();
  });
});

describe("controlled filters reset the page", () => {
  const BERN: FilterState = { city: { type: "text", q: "Bern" } };

  function Owner() {
    const [filters, setFilters] = useState<FilterState>({});
    const [, bump] = useState(0);
    return (
      <MemoryRouter>
        <button onClick={() => setFilters(BERN)}>saved view</button>
        <button onClick={() => bump((n) => n + 1)}>unrelated</button>
        <DataTable
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          defaultPageSize={2}
          // A fresh object every render, equal in value.
          filters={{ ...filters }}
          onFiltersChange={setFilters}
        />
      </MemoryRouter>
    );
  }

  it("goes back to page 1 when the owner changes the filter from outside", () => {
    render(<Owner />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(namesOnScreen()).toEqual(["Charlie"]);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "saved view" }));
    });
    // Clamped instead, this was page 2 of 2 — ["Charlie"] again.
    expect(namesOnScreen()).toEqual(["Delta", "Echo"]);
  });

  it("keeps the page through a render that changed nothing", () => {
    render(<Owner />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "unrelated" }));
    expect(namesOnScreen()).toEqual(["Charlie"]);
  });
});
