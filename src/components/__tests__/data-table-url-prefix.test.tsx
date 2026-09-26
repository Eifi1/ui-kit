import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { filterHref, textFilter } from "../data-table-filters";
import { readTableUrlState, useTableUrlState } from "../use-table-state";

/** Two URL-synced tables on one page: `urlSync={{ prefix }}` / `urlPrefix` keep their
 *  `sort` / `p` / `ps` / `f.*` apart. */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
  { id: 3, name: "Charlie" },
];
const COLS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, sortBy: (r) => r.name, filter: textFilter((r) => r.name) },
];

describe("URL state prefix", () => {
  it("useTableUrlState: a prefixed and an unprefixed table read and write their own keys", () => {
    let a: ReturnType<typeof useTableUrlState> | null = null;
    let b: ReturnType<typeof useTableUrlState> | null = null;
    let search = "";
    function Probe() {
      a = useTableUrlState({ columns: COLS, defaultPageSize: 10 });
      b = useTableUrlState({ columns: COLS, defaultPageSize: 10, urlPrefix: "b." });
      search = useLocation().search;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/list?sort=name.desc&p=3&b.sort=name&b.p=2&b.f.name=Br&b.ps=50"]}>
        <Probe />
      </MemoryRouter>,
    );
    expect(a!.sorts).toEqual([{ key: "name", dir: "desc" }]);
    expect(a!.page).toBe(2);
    expect(a!.filters).toEqual({});
    expect(b!.sorts).toEqual([{ key: "name", dir: "asc" }]);
    expect(b!.page).toBe(1);
    expect(b!.pageSize).toBe(50);
    expect(b!.filters).toEqual({ name: { type: "text", q: "Br" } });

    act(() => b!.setPage(4));
    let sp = new URLSearchParams(search);
    expect(sp.get("b.p")).toBe("5");
    expect(sp.get("p")).toBe("3");

    act(() => a!.setSorts([]));
    sp = new URLSearchParams(search);
    expect(sp.get("sort")).toBeNull();
    expect(sp.get("p")).toBeNull();
    expect(sp.get("b.sort")).toBe("name");
    expect(sp.get("b.p")).toBe("5");
  });

  it("the `urlSync: { prefix }` form works on the hook too", () => {
    let hook: ReturnType<typeof useTableUrlState> | null = null;
    function Probe() {
      hook = useTableUrlState({ columns: COLS, urlSync: { prefix: "x." } });
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/list?p=3&x.p=2"]}>
        <Probe />
      </MemoryRouter>,
    );
    expect(hook!.page).toBe(1);
  });

  it("DataTable urlSync={{ prefix }} reads only its own keys and writes them prefixed", () => {
    let search = "";
    function Where() {
      search = useLocation().search;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/list?sort=name&t.sort=name.desc"]}>
        <DataTable rows={ROWS} columns={COLS} rowKey={(r) => r.id} urlSync={{ prefix: "t." }} />
        <Where />
      </MemoryRouter>,
    );
    const names = screen.getAllByRole("row").slice(1).map((r) => r.textContent);
    expect(names[0]).toContain("Charlie");
    const sp = new URLSearchParams(search);
    expect(sp.get("t.sort")).toBe("name.desc");
    // The other table's key is left alone.
    expect(sp.get("sort")).toBe("name");
  });

  it("readTableUrlState and filterHref take the prefix", () => {
    const href = filterHref("/units", "name", "Al", { prefix: "u." });
    expect(href).toBe("/units?u.f.name=Al");
    const sp = new URLSearchParams(href.split("?")[1]);
    expect(readTableUrlState(sp, COLS, "u.").filters).toEqual({ name: { type: "text", q: "Al" } });
    expect(readTableUrlState(sp, COLS).filters).toBeUndefined();
  });
});
