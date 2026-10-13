import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../data-table";
import { Pagination } from "../data-table-pagination";

/**
 * 0.25 (found while building the translation review's groups): a page size that is not
 * one of the select's steps (a `defaultPageSize` of 5) had no option, so the select
 * showed its first one — "10" — while the table paged by 5.
 */
describe("Pagination: the page-size select", () => {
  it("offers an off-step page size, in order, and shows it", () => {
    render(<Pagination page={0} totalPages={4} pageSize={5} total={20} onPage={() => {}} onPageSize={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Rows per page" }) as HTMLSelectElement;
    expect(select.value).toBe("5");
    const options = within(select)
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(["5", "10", "25", "50", "100", "200", "all"]);
  });

  it("keeps the plain steps for a size that is one of them", () => {
    render(<Pagination page={0} totalPages={3} pageSize={25} total={60} onPage={() => {}} onPageSize={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Rows per page" }) as HTMLSelectElement;
    expect(within(select).getAllByRole("option")).toHaveLength(6);
    expect(select.value).toBe("25");
  });
});

/**
 * 0.35 (Kurvenschmiede): `TranslationReviewPanel`'s groups share one page size, as they
 * share one sort, and store it — so the owner holds it, through `pageSize` and
 * `onPageSizeChange`, as it holds `sorts`.
 */
describe("DataTable: a page size held by the owner", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Row ${String(i).padStart(2, "0")}` }));
  const table = (pageSize: number, onPageSizeChange = vi.fn()) => (
    <MemoryRouter>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={[{ key: "name", header: "Name", cell: (r) => r.name }]}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
    </MemoryRouter>
  );
  const shown = () =>
    within(screen.getByRole("table"))
      .getAllByRole("row")
      .filter((r) => r.closest("tbody"))
      .map((r) => r.textContent);

  it("pages by it, and hands the pager's choice to the owner", () => {
    const onPageSizeChange = vi.fn();
    render(table(10, onPageSizeChange));
    expect(shown()).toHaveLength(10);
    fireEvent.change(screen.getByRole("combobox", { name: "Rows per page" }), { target: { value: "25" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
    // The owner's to apply: nothing moves until it does.
    expect(shown()).toHaveLength(10);
  });

  it("goes back to the first page when the owner's value changes", () => {
    const { rerender } = render(table(10));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(shown()[0]).toBe("Row 10");
    rerender(table(25));
    expect(shown()).toHaveLength(25);
    expect(shown()[0]).toBe("Row 00");
  });
});
