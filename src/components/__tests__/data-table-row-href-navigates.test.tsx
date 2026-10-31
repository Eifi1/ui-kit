import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { UiKitProvider, type KitLinkProps } from "../../i18n/kit-labels";
import { stubPhone } from "../../test/viewport";

/**
 * `rowHref` without `onRowClick`: RowLink cancelled the plain left click — its job when
 * the row's own handler opens the row — and with no handler nothing opened at all; the
 * phone card got no link either (refactor audit 2026-10-30, DSP-23 b). Without
 * `onRowClick` the link now navigates: through the provider's `linkComponent` when there
 * is one, as every kit link does, else as a plain anchor.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [{ id: 1, name: "Ada" }];
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

function renderTable(extra: Partial<DataTableProps<Row>> = {}, routed = false) {
  const table = (
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} rowHref={(r) => `/people/${r.id}`} {...extra} />
    </MemoryRouter>
  );
  const RouterLink = ({ children, ...props }: KitLinkProps) => (
    <a data-router-link="" {...props}>
      {children}
    </a>
  );
  render(routed ? <UiKitProvider linkComponent={RouterLink}>{table}</UiKitProvider> : table);
  return screen.getByRole("link", { name: "Ada" });
}

let restore: () => void = () => {};
afterEach(() => restore());

describe("DataTable rowHref without onRowClick navigates (audit 2026-10-30 DSP-23 b)", () => {
  it("desktop: a plain click is left to the link", () => {
    const link = renderTable();
    expect(link).toHaveAttribute("href", "/people/1");
    // `fireEvent` answers false when a handler cancelled the click.
    expect(fireEvent.click(link)).toBe(true);
  });

  it("desktop: through the provider's router link", () => {
    const link = renderTable({}, true);
    expect(link).toHaveAttribute("data-router-link");
    expect(fireEvent.click(link)).toBe(true);
  });

  it("with onRowClick the row opens in place, as before", () => {
    const link = renderTable({ onRowClick: () => {} });
    expect(fireEvent.click(link)).toBe(false);
  });

  it("phone: the card is the link", () => {
    restore = stubPhone();
    const link = renderTable();
    expect(link).toHaveAttribute("href", "/people/1");
    expect(link.closest("li")).not.toBeNull();
    expect(fireEvent.click(link)).toBe(true);
  });
});
