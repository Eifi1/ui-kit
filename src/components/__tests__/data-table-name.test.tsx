import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { stubPhone } from "../../test/viewport";
import { axeViolations } from "../../test/axe";

/**
 * The table's accessible name (0.66, DataTable naming). A DataTable was "Data table" unless a
 * call site re-labelled it through `labels.table`; keksdose wrapped its tables in a labelled
 * section to give them a name. `aria-labelledby`, `caption` and `aria-label` name it the way
 * the kit's other components are named, on the desktop table and the phone's card list alike.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [
  { id: 1, name: "Giro" },
  { id: 2, name: "Savings" },
];
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

function Page(props: Partial<DataTableProps<Row>>) {
  return (
    <MemoryRouter>
      <h2 id="accounts-heading">Accounts</h2>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} {...props} />
    </MemoryRouter>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe.each([
  ["a wide screen", "table"],
  ["a phone", "list"],
] as const)("DataTable's name on %s", (_where, role) => {
  const setUp = (): void => {
    if (role === "list") stubPhone();
  };
  it("is labels.table when nothing names it", () => {
    setUp();
    render(<Page />);
    expect(screen.getByRole(role, { name: "Data table" })).toBeInTheDocument();
  });

  it("is aria-label, over labels.table", () => {
    setUp();
    render(<Page aria-label="Accounts" labels={{ table: "Data" }} />);
    expect(screen.getByRole(role, { name: "Accounts" })).toBeInTheDocument();
  });

  it("is the heading aria-labelledby points at, over a caption and aria-label", () => {
    setUp();
    render(<Page aria-labelledby="accounts-heading" caption="All accounts" aria-label="Other" />);
    expect(screen.getByRole(role, { name: "Accounts" })).toBeInTheDocument();
  });

  it("is the caption, over aria-label, drawn", () => {
    setUp();
    render(<Page caption="Your accounts" aria-label="Other" />);
    expect(screen.getByRole(role, { name: "Your accounts" })).toBeInTheDocument();
    expect(screen.getByText("Your accounts")).not.toHaveClass("sr-only-fixed");
  });

  it("is a hidden caption, for screen readers only", () => {
    setUp();
    render(<Page caption="Your accounts" hideCaption />);
    expect(screen.getByRole(role, { name: "Your accounts" })).toBeInTheDocument();
    expect(screen.getByText("Your accounts")).toHaveClass("sr-only-fixed");
  });

  it("is axe-clean with a caption", async () => {
    setUp();
    const { container } = render(<Page caption="Your accounts" />);
    expect(await axeViolations(container)).toEqual([]);
  });
});

it("puts the caption first in the table, as HTML wants it", () => {
  render(<Page caption="Your accounts" />);
  expect(screen.getByRole("table").firstElementChild?.tagName).toBe("CAPTION");
});
