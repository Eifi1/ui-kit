import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { Pagination } from "../data-table-pagination";

/**
 * `density="compact"` — lenkbank's five in-card tables (`text-xs`, `px-2 py-1` cells),
 * which at the default padding came out twice as tall. jsdom has no layout, so these
 * pin the classes that produce the height, on every part the density reaches.
 */
interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Row ${i}` }));
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];
const selection: DataTableProps<Row>["selection"] = {
  isSelected: () => false,
  onToggle: () => {},
  allSelected: false,
  someSelected: false,
  onToggleAll: () => {},
};

function table(extra: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} selection={selection} {...extra} />
    </MemoryRouter>,
  );
}

describe("DataTable density", () => {
  it("defaults to the comfortable table every caller has today", () => {
    const { container } = table();
    expect(container.querySelector("[data-density]")).toHaveAttribute("data-density", "comfortable");
    expect(screen.getByRole("table")).toHaveClass("text-sm");
    const cell = screen.getAllByRole("cell").find((c) => c.textContent === "Row 0")!;
    expect(cell).toHaveClass("px-3", "py-2");
  });

  it("compact tightens the header, the cells, the checkboxes and the pager together", () => {
    const { container } = table({ density: "compact" });
    expect(container.querySelector("[data-density]")).toHaveAttribute("data-density", "compact");
    const t = screen.getByRole("table");
    expect(t).toHaveClass("text-xs");
    expect(t).not.toHaveClass("text-sm");

    const header = screen.getAllByRole("columnheader").find((th) => th.textContent?.includes("Name"))!;
    expect(header).toHaveClass("px-2", "py-1");
    expect(header).not.toHaveClass("px-3");

    const cell = screen.getAllByRole("cell").find((c) => c.textContent === "Row 0")!;
    expect(cell).toHaveClass("px-2", "py-1");
    expect(cell).not.toHaveClass("py-2");

    const selectAll = screen.getByRole("checkbox", { name: /select all/i });
    expect(selectAll).toHaveClass("size-3.5");
    expect(selectAll.closest("th")).toHaveClass("w-8");
    const rowBox = within(cell.closest("tr")!).getByRole("checkbox");
    expect(rowBox).toHaveClass("size-3.5");

    const pager = container.querySelector('[data-density="compact"] [data-density="compact"]');
    expect(pager).toHaveClass("px-2", "py-1");
  });

  it("keeps a column's own className on top of the compact padding", () => {
    table({
      density: "compact",
      columns: [{ key: "name", header: "Name", cell: (r) => r.name, className: "text-end" }],
    });
    const cell = screen.getAllByRole("cell").find((c) => c.textContent === "Row 0")!;
    expect(cell).toHaveClass("px-2", "text-end");
  });
});

describe("Pagination density", () => {
  it("renders a slimmer footer and page buttons when compact", () => {
    const { container } = render(
      <Pagination page={0} totalPages={3} pageSize={10} total={30} onPage={() => {}} density="compact" />,
    );
    expect(container.firstChild).toHaveClass("px-2", "py-1");
    expect(screen.getByRole("button", { name: "1" })).toHaveClass("min-w-6", "px-1.5");
  });
});
