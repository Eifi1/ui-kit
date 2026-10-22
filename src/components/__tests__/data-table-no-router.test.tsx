import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * 0.49 KIT-3: a DataTable without `urlSync` needs no Router. It called
 * `useSearchParams()` unconditionally and threw outside a Router even with URL sync
 * off. With `urlSync` and no Router: a clear error in a development build, and in
 * production the table keeps its view in local state instead of crashing.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [
  { id: 1, name: "Charlie" },
  { id: 2, name: "Alpha" },
  { id: 3, name: "Bravo" },
];
const COLS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name }];

const names = () =>
  within(screen.getAllByRole("table")[0])
    .getAllByRole("row")
    .slice(1)
    .map((r) => r.textContent);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("DataTable without a Router (KIT-3)", () => {
  it("renders and sorts without a Router and without urlSync", () => {
    render(<DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} />);
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo"]);
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("with urlSync and no Router, a development build says what is missing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} urlSync />)).toThrow(
      /DataTable urlSync requires a Router/,
    );
  });

  it("with urlSync and no Router, a production build falls back to local state", () => {
    vi.stubEnv("DEV", false);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} urlSync />);
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(error).not.toHaveBeenCalled();
  });

  it("inside a Router, urlSync still reads the view from the URL", () => {
    render(
      <MemoryRouter initialEntries={["/list?sort=name"]}>
        <DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} urlSync />
      </MemoryRouter>,
    );
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });
});
