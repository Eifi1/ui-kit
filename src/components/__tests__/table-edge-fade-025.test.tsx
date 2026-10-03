import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeaderCell, TableRow } from "../table";
import type { TableProps } from "../table";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";

/**
 * 0.25: `edgeFade` on Table and DataTable — the measured edge fade ColumnRoleTable's
 * preview drew in 0.24 by reaching Table's wrapper as the `<table>`'s parentElement,
 * now the tables' own. jsdom lays nothing out, so the overflow is given by hand and
 * the mask is read where jsdom keeps it (its parser drops a gradient with a `calc()`
 * stop: only the START side's mask is readable here; the end side's is covered by
 * src/lib/__tests__/strip-fade.test.ts and by the browser check).
 */

afterEach(() => vi.restoreAllMocks());

const size = (el: HTMLElement, scrollWidth: number, clientWidth: number) => {
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
};

function Payments(props: Partial<TableProps>) {
  return (
    <Table {...props}>
      <TableCaption>Payments</TableCaption>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Payee</TableHeaderCell>
          <TableHeaderCell numeric>Net</TableHeaderCell>
          <TableHeaderCell>Action</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>Example Ltd</TableCell>
          <TableCell numeric>1,200.00</TableCell>
          <TableCell>
            <button type="button">Open</button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

const wrapperOf = () => screen.getByRole("table").parentElement!;

describe("Table edgeFade", () => {
  it("is off by default: an overflowing table paints and scrolls as before", () => {
    render(<Payments />);
    const wrapper = wrapperOf();
    size(wrapper, 600, 300);
    wrapper.scrollLeft = 100;
    fireEvent.scroll(wrapper);
    expect(wrapper).not.toHaveAttribute("data-overflow");
    expect(wrapper.getAttribute("style")).toBeNull();
    const scrollBy = vi.fn();
    wrapper.scrollBy = scrollBy as unknown as typeof wrapper.scrollBy;
    fireEvent.focus(screen.getByRole("button", { name: "Open" }));
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("paints nothing while the table fits", () => {
    render(<Payments edgeFade />);
    const wrapper = wrapperOf();
    size(wrapper, 300, 300);
    fireEvent.scroll(wrapper);
    expect(wrapper).not.toHaveAttribute("data-overflow");
    expect(wrapper.style.maskImage).toBe("");
  });

  it("fades the end with columns behind it, both ends in the middle, the start at the end", () => {
    render(<Payments edgeFade />);
    const wrapper = wrapperOf();
    size(wrapper, 600, 300);
    fireEvent.scroll(wrapper);
    expect(wrapper).toHaveAttribute("data-overflow", "end");
    wrapper.scrollLeft = 100;
    fireEvent.scroll(wrapper);
    expect(wrapper).toHaveAttribute("data-overflow", "both");
    wrapper.scrollLeft = 300;
    fireEvent.scroll(wrapper);
    expect(wrapper).toHaveAttribute("data-overflow", "start");
    expect(wrapper.style.maskImage).toMatch(/^linear-gradient\(to right, transparent, (#000|rgb\(0, 0, 0\)) 24px, /);
  });

  it("in RTL the hidden columns are at the end, which is the left", () => {
    render(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <Payments edgeFade />
      </div>,
    );
    const wrapper = wrapperOf();
    size(wrapper, 600, 300);
    fireEvent.scroll(wrapper);
    expect(wrapper).toHaveAttribute("data-overflow", "end");
    expect(wrapper.style.maskImage).toMatch(/^linear-gradient\(to right, transparent, /);
  });

  it("changes no class, so no layout: the wrapper and the table are classed alike either way", () => {
    const { rerender } = render(<Payments framed />);
    const before = [wrapperOf().className, screen.getByRole("table").className];
    rerender(<Payments framed edgeFade />);
    expect([wrapperOf().className, screen.getByRole("table").className]).toEqual(before);
  });

  it("scrolls a control focused behind the fade clear of it, cell and all", () => {
    render(<Payments edgeFade />);
    const wrapper = wrapperOf();
    size(wrapper, 600, 300);
    fireEvent.scroll(wrapper);
    const scrollBy = vi.fn();
    wrapper.scrollBy = scrollBy as unknown as typeof wrapper.scrollBy;
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue({ left: 0, right: 300, width: 300 } as DOMRect);
    const button = screen.getByRole("button", { name: "Open" });
    vi.spyOn(button.closest("td")!, "getBoundingClientRect").mockReturnValue({ left: 260, right: 340, width: 80 } as DOMRect);
    fireEvent.focus(button);
    expect(scrollBy).toHaveBeenCalledWith({ left: 64 });
  });

  it("lifts the fade while the scroll box itself shows the keyboard's focus outline", () => {
    render(<Payments edgeFade />);
    const wrapper = wrapperOf();
    size(wrapper, 600, 300);
    wrapper.scrollLeft = 300;
    fireEvent.scroll(wrapper);
    expect(screen.getByRole("region", { name: "Payments" })).toBe(wrapper);
    expect(wrapper.style.maskImage).not.toBe("");
    vi.spyOn(wrapper, "matches").mockImplementation((selector: string) => selector === ":focus-visible");
    fireEvent.focus(wrapper);
    expect(wrapper.style.maskImage).toBe("");
    // Still measured: the cue for a caller's own affordance does not lift with it.
    expect(wrapper).toHaveAttribute("data-overflow", "start");
    fireEvent.blur(wrapper);
    expect(wrapper.style.maskImage).not.toBe("");
  });

  it("keeps the fade when a click in the table's text focuses the box", () => {
    render(<Payments edgeFade />);
    const wrapper = wrapperOf();
    size(wrapper, 600, 300);
    wrapper.scrollLeft = 300;
    fireEvent.scroll(wrapper);
    vi.spyOn(wrapper, "matches").mockReturnValue(false);
    fireEvent.focus(wrapper);
    expect(wrapper.style.maskImage).not.toBe("");
  });
});

interface Row {
  id: string;
  payee: string;
}

const ROWS: Row[] = [
  { id: "P-0001", payee: "Example Ltd" },
  { id: "P-0002", payee: "Sample Shop" },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "id", header: "No.", cell: (r) => r.id },
  { key: "payee", header: "Payee", cell: (r) => r.payee },
];

function renderDataTable(props: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        chrome="minimal"
        paginated={false}
        rowActions={[{ kind: "edit", onAction: () => {} }]}
        {...props}
      />
    </MemoryRouter>,
  );
}

// DataTable draws its own `<table>`; the scroller is its parent.
const scrollerOf = () => screen.getByRole("table").parentElement!;

describe("DataTable edgeFade", () => {
  it("is off by default", () => {
    renderDataTable();
    const scroller = scrollerOf();
    size(scroller, 900, 400);
    fireEvent.scroll(scroller);
    expect(scroller).not.toHaveAttribute("data-overflow");
    expect(scroller.style.maskImage).toBe("");
  });

  it("fades the desktop scroller's cut edge and keeps its height bound", () => {
    renderDataTable({ edgeFade: true, maxBodyHeight: "20rem" });
    const scroller = scrollerOf();
    size(scroller, 900, 400);
    fireEvent.scroll(scroller);
    expect(scroller).toHaveAttribute("data-overflow", "end");
    scroller.scrollLeft = 500;
    fireEvent.scroll(scroller);
    expect(scroller).toHaveAttribute("data-overflow", "start");
    expect(scroller.style.maskImage).toMatch(/^linear-gradient\(to right, transparent, /);
    // The mask is merged with the bound, not in place of it.
    expect(scroller.style.maxHeight).toBe("20rem");
  });

  it("scrolls a row action focused behind the fade clear of it", () => {
    renderDataTable({ edgeFade: true });
    const scroller = scrollerOf();
    size(scroller, 900, 400);
    fireEvent.scroll(scroller);
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy as unknown as typeof scroller.scrollBy;
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({ left: 0, right: 400, width: 400 } as DOMRect);
    const edit = screen.getAllByRole("button", { name: "Edit" })[0];
    vi.spyOn(edit.closest("td")!, "getBoundingClientRect").mockReturnValue({ left: 380, right: 440, width: 60 } as DOMRect);
    fireEvent.focus(edit);
    expect(scrollBy).toHaveBeenCalledWith({ left: 64 });
  });
});
