import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * `cellProps` / `headProps` — keksdose's accounts page wanted `data-private` on the
 * `<td>` itself rather than on a span inside every cell renderer.
 */

interface Row {
  id: number;
  name: string;
  iban: string;
}

const ROWS: Row[] = [
  { id: 1, name: "Main", iban: "CH00 1" },
  { id: 2, name: "Savings", iban: "CH00 2" },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  {
    key: "iban",
    header: "IBAN",
    cell: (r) => r.iban,
    className: "text-right",
    cellProps: (r) => ({
      "data-private": "",
      "data-row": r.id,
      title: r.iban,
      // The kit's own: these must not survive.
      role: "button",
      "data-col": "hijacked",
      className: "text-start italic",
      style: { color: "red" },
    }),
    headProps: { "data-tour": "iban-head", scope: "row", className: "italic" },
  },
];

function renderTable() {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />
    </MemoryRouter>,
  );
}

describe("DataTable cellProps", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("puts the caller's attributes on the <td>, under the kit's own", () => {
    renderTable();
    const td = screen.getByText("CH00 1").closest("td")!;
    expect(td).toHaveAttribute("data-private", "");
    expect(td).toHaveAttribute("data-row", "1");
    expect(td).toHaveAttribute("title", "CH00 1");
    // The table's: the resize lookup key and the implicit cell role.
    expect(td).toHaveAttribute("data-col", "iban");
    expect(td).not.toHaveAttribute("role");
    // Merged class list; the column's alignment wins over the caller's.
    expect(td.className).toContain("italic");
    expect(td.className).toContain("align-top");
    expect(td.className).toContain("text-end");
    expect(td.className).not.toContain("text-start");
    expect(td.style.color).toBe("red");
    // A column without it is untouched.
    const plain = screen.getByText("Main").closest("td")!;
    expect(plain).not.toHaveAttribute("data-private");
  });

  it("puts headProps on the <th>, keeping scope", () => {
    renderTable();
    const th = screen.getByRole("columnheader", { name: /IBAN/ });
    expect(th).toHaveAttribute("data-tour", "iban-head");
    expect(th).toHaveAttribute("scope", "col");
    expect(th.className).toContain("italic");
    expect(th.className).toContain("sticky");
  });

  it("on a phone, only the data-* attributes reach the card field", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    renderTable();
    expect(screen.queryByRole("table")).toBeNull();
    const dd = screen.getByText("CH00 2").closest("dd")!;
    expect(dd).toHaveAttribute("data-private", "");
    expect(dd).toHaveAttribute("data-row", "2");
    expect(dd).not.toHaveAttribute("title");
    expect(dd).not.toHaveAttribute("data-col");
    expect(dd.className).not.toContain("italic");
    // Rendering and clicking a card still works as before.
    fireEvent.click(screen.getByText("Main"));
  });
});
