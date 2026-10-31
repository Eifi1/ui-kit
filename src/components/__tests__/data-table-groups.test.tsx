import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableGroupBy, DataTableLoadMore } from "../data-table";
import { stubPhone, stubResizeObserver, type ResizeObserverStub } from "../../test/viewport";
import { axeViolations } from "../../test/axe";

/**
 * 0.48 (keksdose dev #605, docs/transactions-by-period.md §6 there): the desktop table
 * grouped in up to two levels (period → day) — full-width band rows with a label and an
 * end slot, sticky under the header and stacked — and a "load more" footer in place of
 * the pager, observed (auto-load) and a button for the keyboard. jsdom lays nothing out,
 * so this pins the wiring and the measured offsets; headless Chromium checked the pixels
 * (docs/archive/adopt/adopt-0.48.md).
 */

interface Tx {
  id: number;
  month: string;
  day: string;
  payee: string;
  amount: number;
  note: string;
}

const TXS: Tx[] = [
  { id: 1, month: "2026-09", day: "2026-09-30", payee: "Migros", amount: -42.5, note: "a" },
  { id: 2, month: "2026-09", day: "2026-09-30", payee: "Coop", amount: -12, note: "b" },
  { id: 3, month: "2026-09", day: "2026-09-29", payee: "Salary", amount: 5000, note: "c" },
  { id: 4, month: "2026-08", day: "2026-08-31", payee: "Rent", amount: -1800, note: "d" },
];

const COLUMNS: DataTableColumn<Tx>[] = [
  { key: "payee", header: "Payee", cell: (r) => r.payee },
  { key: "amount", header: "Amount", cell: (r) => r.amount.toFixed(2) },
  { key: "note", header: "Note", cell: (r) => r.note, defaultHidden: true },
];

const PERIOD: DataTableGroupBy<Tx> = {
  key: (r) => r.month,
  label: (k) => `Month ${k}`,
  end: (_k, rows) => `${rows.length} · ${rows.reduce((s, r) => s + r.amount, 0).toFixed(2)}`,
};
const DAY: DataTableGroupBy<Tx> = { key: (r) => r.day, label: (k) => `Day ${k}` };

let ro: ResizeObserverStub;
const realRect = HTMLElement.prototype.getBoundingClientRect;
const heights = { head: 40, lead: 30, band1: 28 };
beforeEach(() => {
  ro = stubResizeObserver();
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const h =
      this.tagName === "THEAD"
        ? heights.head
        : this.getAttribute("data-leading-row") === "sticky"
          ? heights.lead
          : this.getAttribute("data-group-band") === "1"
            ? heights.band1
            : null;
    if (h == null) return realRect.call(this);
    return { height: h, width: 500, top: 0, left: 0, bottom: h, right: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
});
afterEach(() => {
  ro.restore();
  HTMLElement.prototype.getBoundingClientRect = realRect;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const bands = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLTableCellElement>("th[data-group-band]"));

describe("DataTable groupBy (0.48, keksdose dev #605)", () => {
  it("draws a full-width row-header band per group, two levels, with the end slot", () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={TXS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          groupBy={[PERIOD, DAY]}
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
    const headers = screen.getAllByRole("rowheader");
    expect(headers.map((h) => h.getAttribute("data-group-band"))).toEqual(["1", "2", "2", "1", "2"]);
    expect(headers[0]).toHaveTextContent("Month 2026-09");
    expect(headers[0]).toHaveTextContent("3 · 4945.50");
    expect(headers[1]).toHaveTextContent("Day 2026-09-30");
    // Two visible columns (the hidden "note" is not counted) plus the selection column.
    for (const h of headers) {
      expect(h).toHaveAttribute("colspan", "3");
      expect(h).toHaveAttribute("scope", "rowgroup");
    }
    // One row group per day, the period band leading the first day of its period.
    const bodies = container.querySelectorAll("table > tbody");
    expect(bodies).toHaveLength(3);
    expect(within(bodies[0] as HTMLElement).getAllByRole("rowheader")).toHaveLength(2);
    expect(within(bodies[1] as HTMLElement).getAllByRole("rowheader")).toHaveLength(1);
    expect(within(bodies[0] as HTMLElement).getByText("Migros")).toBeInTheDocument();
  });

  it("takes a single level, and keeps the leadingRow above the first group", () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={TXS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          groupBy={PERIOD}
          leadingRow={<button type="button">Show upcoming</button>}
        />
      </MemoryRouter>,
    );
    const rows = Array.from(container.querySelectorAll("tbody tr"));
    expect(rows[0]).toContainElement(screen.getByRole("button", { name: "Show upcoming" }));
    expect(rows[1].querySelector("th[data-group-band='1']")).toHaveTextContent("Month 2026-09");
    expect(bands(container).map((b) => b.dataset.groupBand)).toEqual(["1", "1"]);
  });

  it("follows hidden columns in the band's span", () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={TXS}
          columns={COLUMNS.map((c) => ({ ...c, defaultHidden: false }))}
          rowKey={(r) => r.id}
          groupBy={PERIOD}
        />
      </MemoryRouter>,
    );
    expect(bands(container)[0]).toHaveAttribute("colspan", "3");
  });

  it("sticks the bands under the header and stacks them (period above day)", () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={[PERIOD, DAY]} />
      </MemoryRouter>,
    );
    const [period, day] = bands(container);
    expect(period).toHaveClass("sticky");
    expect(day).toHaveClass("sticky");
    expect(period.style.top).toBe("40px");
    expect(day.style.top).toBe("68px");
    // Period over day, both under the header's z-10 and the sticky leading row's z-[5].
    expect(period.className).toMatch(/z-\[4\]/);
    expect(day.className).toMatch(/z-\[3\]/);
  });

  it("stacks under a sticky leadingRow too, and follows a resized header", () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={TXS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          groupBy={[PERIOD, DAY]}
          leadingRow={<button type="button">Show upcoming</button>}
          leadingRowSticky
        />
      </MemoryRouter>,
    );
    const [period, day] = bands(container);
    expect(period.style.top).toBe("70px");
    expect(day.style.top).toBe("98px");
    const head = container.querySelector("thead")!;
    expect(ro.observed()).toContain(head);
    heights.head = 60;
    act(() => ro.resize(head, { width: 500, height: 60 }));
    expect(period.style.top).toBe("90px");
    expect(day.style.top).toBe("118px");
    heights.head = 40;
  });

  it("moves row focus with the arrows across the groups", () => {
    render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={[PERIOD, DAY]} onRowClick={() => {}} />
      </MemoryRouter>,
    );
    const row = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
    row("Coop").focus();
    fireEvent.keyDown(row("Coop"), { key: "ArrowDown" });
    expect(row("Salary")).toHaveFocus();
    fireEvent.keyDown(row("Salary"), { key: "ArrowDown" });
    expect(row("Rent")).toHaveFocus();
    fireEvent.keyDown(row("Rent"), { key: "Home" });
    expect(row("Migros")).toHaveFocus();
    fireEvent.keyDown(row("Migros"), { key: "End" });
    expect(row("Rent")).toHaveFocus();
  });

  it("is axe-clean", async () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={[PERIOD, DAY]} />
      </MemoryRouter>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("drives the phone's sections from the same level (mobileGroupBy takes it)", () => {
    stubPhone();
    render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={[PERIOD, DAY]} mobileGroupBy={PERIOD} />
      </MemoryRouter>,
    );
    const header = screen.getByText("Month 2026-09").closest("li")!;
    expect(header).toHaveTextContent("3 · 4945.50");
    expect(screen.getByText("Month 2026-08")).toBeInTheDocument();
  });
});

/* ── load more ─────────────────────────────────────────────────────────────── */

interface IOStub {
  intersect: (on: boolean) => void;
  count: () => number;
}
function stubIntersectionObserver(): IOStub {
  const instances: { cb: IntersectionObserverCallback; targets: Element[]; live: boolean }[] = [];
  class FakeIO {
    private rec: (typeof instances)[number];
    constructor(cb: IntersectionObserverCallback) {
      this.rec = { cb, targets: [], live: true };
      instances.push(this.rec);
    }
    observe(el: Element) {
      this.rec.targets.push(el);
    }
    unobserve() {}
    disconnect() {
      this.rec.live = false;
    }
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", FakeIO);
  return {
    intersect: (on) =>
      act(() => {
        for (const i of instances.filter((x) => x.live)) {
          i.cb(
            i.targets.map((target) => ({ target, isIntersecting: on }) as IntersectionObserverEntry),
            {} as IntersectionObserver,
          );
        }
      }),
    count: () => instances.filter((x) => x.live).length,
  };
}

function LoadMoreTable({ rows, loadMore }: { rows: Tx[]; loadMore: DataTableLoadMore }) {
  return (
    <MemoryRouter>
      <DataTable
        rows={rows}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        paginated={false}
        loadMore={loadMore}
        groupBy={PERIOD}
      />
    </MemoryRouter>
  );
}

describe("DataTable loadMore (0.48, keksdose dev #605)", () => {
  it("replaces the pager with a footer whose button names what it loads", () => {
    stubIntersectionObserver();
    const onLoadMore = vi.fn();
    render(<LoadMoreTable rows={TXS} loadMore={{ hasMore: true, onLoadMore, label: "Load July 2026" }} />);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("button", { name: /next page/i })).toBeNull();
    const button = screen.getByRole("button", { name: "Load July 2026" });
    fireEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("loads once as the footer scrolls into view, not again until the rows arrive", () => {
    const io = stubIntersectionObserver();
    const onLoadMore = vi.fn();
    const { rerender } = render(<LoadMoreTable rows={TXS.slice(0, 3)} loadMore={{ hasMore: true, onLoadMore }} />);
    expect(onLoadMore).not.toHaveBeenCalled();
    io.intersect(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    // In flight: the owner says so, and another intersection does nothing.
    rerender(<LoadMoreTable rows={TXS.slice(0, 3)} loadMore={{ hasMore: true, onLoadMore, loading: true }} />);
    io.intersect(false);
    io.intersect(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    // A repeat while the owner has not even flagged `loading` yet is dropped too.
    rerender(<LoadMoreTable rows={TXS.slice(0, 3)} loadMore={{ hasMore: true, onLoadMore }} />);
    io.intersect(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    // The next month arrived. Nothing loads on the strength of the old "in view": the
    // footer has moved down past the new rows (headless Chromium's double load)…
    rerender(<LoadMoreTable rows={TXS} loadMore={{ hasMore: true, onLoadMore }} />);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    io.intersect(false);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    // …and only a fresh report that it is in view again (a short slice) loads the next.
    io.intersect(true);
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it("does not auto-load with auto: false", () => {
    const io = stubIntersectionObserver();
    const onLoadMore = vi.fn();
    render(<LoadMoreTable rows={TXS} loadMore={{ hasMore: true, onLoadMore, auto: false }} />);
    io.intersect(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("says it is loading, keeps the button focusable, and ignores presses meanwhile", () => {
    stubIntersectionObserver();
    const onLoadMore = vi.fn();
    render(
      <LoadMoreTable rows={TXS} loadMore={{ hasMore: true, onLoadMore, loading: true, label: "Load July 2026" }} />,
    );
    const button = screen.getByRole("button", { name: /Loading/ });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onLoadMore).not.toHaveBeenCalled();
    const footer = button.closest("[data-table-load-more]") as HTMLElement;
    expect(within(footer).getByRole("status")).toHaveTextContent("Loading…");
  });

  it("ends with the kit's words, or the app's, and moves a focused button's focus there", () => {
    stubIntersectionObserver();
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <LoadMoreTable rows={TXS} loadMore={{ hasMore: true, onLoadMore, label: "Load July 2026" }} />,
    );
    screen.getByRole("button", { name: "Load July 2026" }).focus();
    rerender(<LoadMoreTable rows={TXS} loadMore={{ hasMore: false, onLoadMore }} />);
    const end = screen.getByText("All rows loaded");
    expect(end).toHaveFocus();
    expect(screen.queryByRole("button", { name: /Load/ })).toBeNull();
    rerender(<LoadMoreTable rows={TXS} loadMore={{ hasMore: false, onLoadMore, endLabel: "No older transactions" }} />);
    expect(screen.getByText("No older transactions")).toBeInTheDocument();
  });

  it("replaces a server pager too (keksdose's date sort keeps serverPagination for its filters)", () => {
    stubIntersectionObserver();
    const { container } = render(
      <MemoryRouter>
        <DataTable
          rows={TXS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          serverPagination={{ page: 0, pageSize: 25, total: 400, onPageChange: () => {}, onPageSizeChange: () => {} }}
          loadMore={{ hasMore: true, onLoadMore: () => {}, label: "Load August 2026" }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Load August 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next page/i })).toBeNull();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(TXS.length);
  });

  it("puts the footer at the end of the phone's card list", () => {
    stubPhone();
    stubIntersectionObserver();
    const onLoadMore = vi.fn();
    render(<LoadMoreTable rows={TXS} loadMore={{ hasMore: true, onLoadMore, label: "Load July 2026" }} />);
    const button = screen.getByRole("button", { name: "Load July 2026" });
    expect(button.closest("li")).not.toBeNull();
    fireEvent.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
