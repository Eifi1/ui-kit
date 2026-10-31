import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * Opening the Columns drawer left the focus on the rail button, which in the same render
 * became `aria-hidden`, `tabIndex=-1` and zero wide: focus inside hidden content, nothing
 * for a screen reader to say, no visible focus. The drawer had no name and no Escape
 * (refactor audit 2026-10-30, DSP-13; BUG-7a fixed the closing half). Now the focus moves
 * into the drawer, which is a group named "Columns (n/m)", and Escape closes it back onto
 * the rail, which says whether it is expanded.
 */

interface Row {
  id: number;
  name: string;
}
const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  { key: "id", header: "Id", cell: (r) => String(r.id) },
];

function renderTable() {
  render(
    <MemoryRouter>
      <DataTable rows={[{ id: 1, name: "A" }]} columns={COLUMNS} rowKey={(r) => r.id} />
    </MemoryRouter>,
  );
  return screen.getByRole("button", { name: "Columns (2/2)" });
}

describe("DataTable Columns drawer, the opening half (audit 2026-10-30 DSP-13)", () => {
  it("the rail says it is collapsed and is never hidden from a screen reader", () => {
    const rail = renderTable();
    expect(rail).toHaveAttribute("aria-expanded", "false");
    expect(rail).not.toHaveAttribute("aria-hidden");
  });

  it("opening moves the focus to the drawer's first column box, inside a named group", () => {
    const rail = renderTable();
    act(() => rail.focus());
    fireEvent.click(rail);
    const drawer = screen.getByRole("group", { name: "Columns (2/2)" });
    expect(document.activeElement).toBe(within(drawer).getByRole("checkbox", { name: "Name" }));
    expect(rail).toHaveAttribute("aria-expanded", "true");
    expect(rail).toHaveAttribute("aria-controls", drawer.id);
    expect(rail).not.toHaveAttribute("aria-hidden");
  });

  it("Escape closes it and hands the focus back to the rail", () => {
    const rail = renderTable();
    fireEvent.click(rail);
    const box = within(screen.getByRole("group", { name: "Columns (2/2)" })).getByRole("checkbox", { name: "Id" });
    act(() => box.focus());
    fireEvent.keyDown(box, { key: "Escape" });
    expect(rail).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(rail);
  });
});
