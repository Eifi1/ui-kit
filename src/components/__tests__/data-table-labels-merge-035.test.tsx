import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { DEFAULT_DATA_TABLE_LABELS } from "../data-table-labels";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * Round 0.35 (found while removing `resolveDataTableLabels`): DataTable merged its labels
 * as `{ ...provider, ...labels }`, then over the English defaults. A key the caller set to
 * `undefined` — `labels={{ autoSize: t("…") }}` with the key missing from a catalogue —
 * spread as a value: it blanked the provider's word, and with no provider the English
 * one. `useKitLabels`, which every other component resolves through, skips `undefined`;
 * DataTable now does the same.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [{ id: 1, name: "Alpha" }];
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

describe("DataTable's labels skip an undefined key, as useKitLabels does", () => {
  it("keeps the provider's word under a prop key set to undefined", () => {
    render(
      <UiKitProvider labels={{ dataTable: { autoSize: "Spalten anpassen" } }}>
        <MemoryRouter>
          <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} labels={{ autoSize: undefined }} />
        </MemoryRouter>
      </UiKitProvider>,
    );
    expect(screen.getByText("Spalten anpassen")).toBeInTheDocument();
  });

  it("keeps the English default without a provider", () => {
    render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} labels={{ autoSize: undefined }} />
      </MemoryRouter>,
    );
    expect(screen.getByText(DEFAULT_DATA_TABLE_LABELS.autoSize)).toBeInTheDocument();
  });

  it("still lets the prop win over the provider", () => {
    render(
      <UiKitProvider labels={{ dataTable: { autoSize: "Spalten anpassen" } }}>
        <MemoryRouter>
          <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} labels={{ autoSize: "Breiten anpassen" }} />
        </MemoryRouter>
      </UiKitProvider>,
    );
    expect(screen.getByText("Breiten anpassen")).toBeInTheDocument();
    expect(screen.queryByText("Spalten anpassen")).not.toBeInTheDocument();
  });
});
