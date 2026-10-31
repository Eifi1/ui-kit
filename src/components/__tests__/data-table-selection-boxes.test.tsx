import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * The desktop selection boxes carried `accent-indigo-600`, over the kit's
 * `accent-color: var(--brand)`: indigo on every palette preset and in dark mode, where a
 * checked box looked unchecked (feedback #219's problem), and unlike the phone card's
 * token-painted Checkbox (refactor audit 2026-10-30, DSP-14; open since 2026-09-22). Both
 * are the kit's Checkbox now; the header's still shows "some" as a dash.
 */

interface Row {
  id: number;
}
const COLUMNS: DataTableColumn<Row>[] = [{ key: "id", header: "Id", cell: (r) => String(r.id) }];

function renderTable(selected: Set<number>, compact = false) {
  render(
    <MemoryRouter>
      <DataTable
        rows={[{ id: 1 }, { id: 2 }]}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        density={compact ? "compact" : "comfortable"}
        selection={{
          isSelected: (r) => selected.has(r.id),
          onToggle: () => {},
          allSelected: selected.size === 2,
          someSelected: selected.size > 0,
          onToggleAll: () => {},
        }}
      />
    </MemoryRouter>,
  );
}

describe("DataTable selection boxes follow the palette (audit 2026-10-30 DSP-14)", () => {
  it("row and header boxes are the kit's Checkbox, not an indigo native box", () => {
    renderTable(new Set([1]));
    const boxes = [
      screen.getByRole("checkbox", { name: "Select all rows" }),
      ...screen.getAllByRole("checkbox", { name: "Select row" }),
    ];
    for (const box of boxes) {
      expect(box.className).not.toContain("accent-indigo-600");
      expect(box).toHaveClass("appearance-none", "checked:bg-brand");
    }
    expect(screen.getAllByRole("checkbox", { name: "Select row" })[0]).toBeChecked();
  });

  it("the header box shows 'some' as indeterminate, and 'all' as checked", () => {
    renderTable(new Set([1]));
    expect((screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement).indeterminate).toBe(true);
  });

  it("a compact table keeps its smaller boxes", () => {
    renderTable(new Set(), true);
    expect(screen.getByRole("checkbox", { name: "Select all rows" })).toHaveClass("size-3.5");
    expect(screen.getAllByRole("checkbox", { name: "Select row" })[0]).toHaveClass("size-3.5");
  });
});
