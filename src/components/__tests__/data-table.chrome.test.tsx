import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import {
  DEFAULT_DATA_TABLE_LABELS,
  missingDataTableLabels,
  resolveDataTableLabels,
  type DataTableLabels,
} from "../data-table-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * Round 0.34 Wave 2, BUG-7 (a) and (c): DataTable's own chrome, for the keyboard and a
 * screen reader. (b), the phone filter sheet, was Wave 0.
 *
 * (a) The closed "Columns" drawer was only `w-0 overflow-hidden`: its Close and
 *     Auto-size buttons and a checkbox per column stayed in the tab order and the
 *     accessibility tree, so Tab after the last cell walked into controls nobody could
 *     see — and closing the drawer with its X left focus on the now-invisible X.
 * (c) Every column's filter button and panel was named "Filter": a reader heard the same
 *     word once per column, "filtered" was a colour, and the button said nothing about
 *     the panel it opens.
 */

interface Row {
  id: number;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: 1, name: "Alpha", city: "Bern" },
  { id: 2, name: "Bravo", city: "Basel" },
];
const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, filterBy: (r) => r.name },
  { key: "city", header: "City", cell: (r) => r.city, filterBy: (r) => r.city },
];

function renderTable(labels?: Partial<DataTableLabels>) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} labels={labels} />
    </MemoryRouter>,
  );
}

describe("the Columns drawer while closed (BUG-7a)", () => {
  // By its text, not its role: a role query is exactly what an inert drawer should fail.
  const drawer = () => screen.getByText(DEFAULT_DATA_TABLE_LABELS.autoSize).closest(".shrink-0") as HTMLElement;

  it("is inert: none of its controls is a tab stop or in the accessibility tree", () => {
    renderTable();
    expect(drawer()).toHaveAttribute("inert");
  });

  it("opens live, and its X hands focus back to the rail button", async () => {
    const user = userEvent.setup();
    renderTable();
    const rail = screen.getAllByRole("button", { name: "Columns (2/2)" })[0];
    await user.click(rail);
    expect(drawer()).not.toHaveAttribute("inert");
    const close = within(drawer()).getByRole("button", { name: "Close" });
    await user.click(close);
    expect(drawer()).toHaveAttribute("inert");
    expect(rail).toHaveFocus();
  });
});

describe("each column's filter is named for its column (BUG-7c)", () => {
  it("the button names the column, says it opens a dialog, and whether it is open", async () => {
    const user = userEvent.setup();
    renderTable();
    const button = screen.getByRole("button", { name: "Filter Name" });
    expect(screen.getByRole("button", { name: "Filter City" })).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Filter Name" })).toBeInTheDocument();
  });

  it("says when the column is filtered, not by colour alone", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    fireEvent.change(screen.getByPlaceholderText("Filter…"), { target: { value: "Alp" } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole("button", { name: "Filter Name (active)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter City" })).toBeInTheDocument();
  });

  it("speaks the kit's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <MemoryRouter>
          <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />
        </MemoryRouter>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Name filtern" })).toBeInTheDocument();
  });

  it("an app that translated only `filter` keeps its word, with the column", () => {
    const labels = resolveDataTableLabels({ filter: "Filtern" });
    expect(labels.filterColumn("Betrag", false)).toBe("Filtern: Betrag");
    // …and is not told to translate a key its `filter` already covers.
    expect(missingDataTableLabels({ ...DEFAULT_DATA_TABLE_LABELS, filterColumn: undefined, filter: "Filtern" } as never)).toEqual([]);
  });
});
