import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * The client sort and the derived select-filter options order strings by the table's
 * locale (refactor audit 2026-10-30, DSP-3). They compared with `<` / `>` and
 * `Array.sort()` — UTF-16 code units: every lower-case initial after every capital,
 * Ä/Ö/Ü after Z, "Item 10" before "Item 2". All three apps sort payees, names, insurers
 * and titles this way. Now one `Intl.Collator(locale, { numeric: true, sensitivity:
 * "base" })` per table locale; numbers still compare as numbers, and a number sorts
 * before a string (ascending).
 */

interface Row {
  id: number;
  name: string | number | null;
  status: string;
}

const NAMES = ["Zürich Versicherung", "apple", "Ärztekasse", "Bern", "Österreich AG", "de Vries", "Zahnarzt"];
const rowsOf = (names: (string | number | null)[], status = (i: number) => `s${i}`): Row[] =>
  names.map((name, i) => ({ id: i + 1, name, status: status(i) }));

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => String(r.name ?? "—"), sortBy: (r) => r.name },
  {
    key: "status",
    header: "Status",
    cell: (r) => r.status,
    filter: { type: "select", getValue: (r) => r.status },
  },
];

function renderTable(rows: Row[], extra: Partial<DataTableProps<Row>> = {}, locale = "de-CH") {
  return render(
    <UiKitProvider locale={locale}>
      <MemoryRouter>
        <DataTable rows={rows} columns={COLUMNS} rowKey={(r) => r.id} paginated={false} {...extra} />
      </MemoryRouter>
    </UiKitProvider>,
  );
}

function namesOnScreen(): string[] {
  const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
  return rows.map((r) => within(r).getAllByRole("cell")[0]?.textContent ?? "");
}

const sortByName = () => fireEvent.click(screen.getByRole("button", { name: "Name" }));

describe("DataTable client sort collates strings (audit 2026-10-30 DSP-3)", () => {
  it("orders by the locale's collation: case and umlauts in place", () => {
    renderTable(rowsOf(NAMES));
    sortByName();
    expect(namesOnScreen()).toEqual([
      "apple",
      "Ärztekasse",
      "Bern",
      "de Vries",
      "Österreich AG",
      "Zahnarzt",
      "Zürich Versicherung",
    ]);
    sortByName();
    expect(namesOnScreen()).toEqual([
      "Zürich Versicherung",
      "Zahnarzt",
      "Österreich AG",
      "de Vries",
      "Bern",
      "Ärztekasse",
      "apple",
    ]);
  });

  it("compares the digits in a string as numbers", () => {
    renderTable(rowsOf(["Item 10", "Item 2", "Item 1"]));
    sortByName();
    expect(namesOnScreen()).toEqual(["Item 1", "Item 2", "Item 10"]);
  });

  it("collates in the table's locale: Swedish puts Ä after Z", () => {
    renderTable(rowsOf(["Ärla", "Zeta", "Alva"]), {}, "sv");
    sortByName();
    expect(namesOnScreen()).toEqual(["Alva", "Zeta", "Ärla"]);
  });

  it("still sorts numbers as numbers, a number before a string, and nulls last either way", () => {
    renderTable(rowsOf([10, "beta", null, 9, "Alpha", 100]));
    sortByName();
    expect(namesOnScreen()).toEqual(["9", "10", "100", "Alpha", "beta", "—"]);
    sortByName();
    expect(namesOnScreen()).toEqual(["beta", "Alpha", "100", "10", "9", "—"]);
  });

  it("orders a select filter's derived options the same way", () => {
    const statuses = ["Überfällig", "bezahlt", "Offen", "Abgelehnt"];
    renderTable(rowsOf(["a", "b", "c", "d"], (i) => statuses[i]));
    const statusHeader = screen.getAllByRole("columnheader").find((th) => th.textContent?.includes("Status"))!;
    fireEvent.click(within(statusHeader).getByRole("button", { name: "Filter Status" }));
    const options = screen.getByRole("checkbox", { name: "Offen" }).closest("ul")!;
    expect(
      within(options)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Abgelehnt", "bezahlt", "Offen", "Überfällig"]);
  });
});
