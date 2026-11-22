import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { SortStrip } from "../sort-strip";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "../table";

/**
 * keksdose's budget page (dev #679, 2026-11-15): every category sorts by Available, on a
 * hand-built `Table`. A static table had no sortable header and `MobileSort` took only
 * DataTable columns, so the app copied DataTableHead's sort button and MobileSort's row.
 * `TableHeaderCell sort` and `SortStrip` are those two, for any table.
 */

function Budget({ dir, onToggle }: { dir: "asc" | "desc" | null; onToggle: () => void }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell numeric sort={{ dir, onToggle }}>
            Available
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>Food</TableCell>
          <TableCell numeric>12</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

describe("TableHeaderCell sort", () => {
  it("draws the header as DataTable's sort button and says the sort with aria-sort", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<Budget dir={null} onToggle={onToggle} />);
    const th = screen.getByRole("columnheader", { name: "Available" });
    expect(th).toHaveAttribute("aria-sort", "none");
    // A plain header claims no sort.
    expect(screen.getByRole("columnheader", { name: "Category" })).not.toHaveAttribute("aria-sort");

    const button = screen.getByRole("button", { name: "Available" });
    expect(th).toContainElement(button);
    expect(button).toHaveAttribute("type", "button");
    expect(button.querySelector("svg")).toHaveClass("lucide-arrow-up-down", "size-3", "opacity-40");

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<Budget dir="desc" onToggle={onToggle} />);
    expect(th).toHaveAttribute("aria-sort", "descending");
    expect(button.querySelector("svg")).toHaveClass("lucide-arrow-down", "opacity-100");

    rerender(<Budget dir="asc" onToggle={onToggle} />);
    expect(th).toHaveAttribute("aria-sort", "ascending");
    expect(button.querySelector("svg")).toHaveClass("lucide-arrow-up");
  });

  it("keeps an end-aligned header's button at the end of the cell", () => {
    render(<Budget dir={null} onToggle={() => {}} />);
    const th = screen.getByRole("columnheader", { name: "Available" });
    expect(th).toHaveClass("text-end");
    // Inline, so the cell's text-align places it.
    expect(screen.getByRole("button", { name: "Available" })).toHaveClass("inline-flex");
  });
});

const OPTIONS = [
  { value: "name", label: "Category" },
  { value: "available", label: "Available" },
];

describe("SortStrip", () => {
  it("is a labelled select and a direction button, each reporting its own change", () => {
    const onChange = vi.fn();
    const onFlip = vi.fn();
    render(<SortStrip options={OPTIONS} value="available" dir="desc" onChange={onChange} onFlip={onFlip} />);

    const select = screen.getByRole("combobox", { name: "Sort by" });
    expect(select).toHaveValue("available");
    // No "Default order" unless the caller offers it.
    expect(screen.queryByRole("option", { name: "Default order" })).toBeNull();

    fireEvent.change(select, { target: { value: "name" } });
    // The value, as every kit `onChange` (refactor audit 2026-11-22, API-4): once, not the event.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("name");

    const flip = screen.getByRole("button", { name: "Descending" });
    // Outside the label: a click on it must not also open the select.
    expect(flip.closest("label")).toBeNull();
    fireEvent.click(flip);
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it("offers the default order as null, and holds the direction while nothing is picked", () => {
    const onChange = vi.fn();
    render(<SortStrip options={OPTIONS} value={null} dir="asc" offerDefault onChange={onChange} onFlip={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Sort by" });
    expect(select).toHaveValue("");
    expect(screen.getByRole("button", { name: "Ascending" })).toBeDisabled();
    fireEvent.change(select, { target: { value: "name" } });
    fireEvent.change(select, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("still answers onPick, the deprecated name, when there is no onChange", () => {
    const onPick = vi.fn();
    render(<SortStrip options={OPTIONS} value="available" dir="desc" onPick={onPick} onFlip={() => {}} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), { target: { value: "name" } });
    expect(onPick).toHaveBeenCalledWith("name");
  });

  it("calls onChange alone when given both", () => {
    const onChange = vi.fn();
    const onPick = vi.fn();
    render(
      <SortStrip
        options={OPTIONS}
        value="available"
        dir="desc"
        onChange={onChange}
        onPick={onPick}
        onFlip={() => {}}
      />,
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Sort by" }), { target: { value: "name" } });
    expect(onChange).toHaveBeenCalledWith("name");
    expect(onPick).not.toHaveBeenCalled();
  });

  it("takes a ref to its root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SortStrip ref={ref} options={OPTIONS} value="name" dir="asc" onChange={() => {}} onFlip={() => {}} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toContainElement(screen.getByRole("combobox", { name: "Sort by" }));
  });

  it("reads the dataTable words from the provider, and a labels prop over them", () => {
    render(
      <UiKitProvider labels={{ dataTable: { sortBy: "Sortieren nach", sortDescending: "Absteigend" } }}>
        <SortStrip
          options={OPTIONS}
          value="name"
          dir="desc"
          labels={{ sortBy: "Ordnen" }}
          onChange={() => {}}
          onFlip={() => {}}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Ordnen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Absteigend" })).toBeInTheDocument();
  });
});
