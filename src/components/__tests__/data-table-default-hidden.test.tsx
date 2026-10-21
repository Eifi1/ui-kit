import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * 0.48 (keksdose dev #617): `defaultHidden` on a column. It applies while the persisted
 * view holds no entry for that column — on a first visit, and for a column an app adds
 * later — and a user's own choice in the Columns panel always wins. keksdose seeded its
 * register's view once per device by hand (register-default-columns.ts) to get this.
 */

interface Row {
  id: number;
  name: string;
  flag: string;
  note: string;
}
const ROWS: Row[] = [{ id: 1, name: "Alpha", flag: "red", note: "n" }];
const NAME: DataTableColumn<Row> = { key: "name", header: "Name", cell: (r) => r.name };
const FLAG: DataTableColumn<Row> = { key: "flag", header: "Flag", cell: (r) => r.flag, defaultHidden: true };
const NOTE: DataTableColumn<Row> = { key: "note", header: "Note", cell: (r) => r.note };

function renderTable(columns: DataTableColumn<Row>[], storageKey: string | undefined = "dh") {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={columns} rowKey={(r) => r.id} storageKey={storageKey} />
    </MemoryRouter>,
  );
}

const heads = () =>
  [...screen.getByRole("table").querySelectorAll<HTMLElement>("thead th")].map((th) => th.textContent ?? "");
const stored = () => JSON.parse(localStorage.getItem("hbui-table:dh") ?? "{}") as Record<string, unknown>;

describe("DataTable column defaultHidden (0.48, keksdose #617)", () => {
  beforeEach(() => localStorage.clear());

  it("starts hidden with no saved view, unticked in the panel and not 'hidden for width'", () => {
    renderTable([NAME, FLAG, NOTE]);
    expect(heads().join("|")).not.toMatch(/Flag/);
    const box = screen.getByRole("checkbox", { name: /Flag/ });
    expect(box).not.toBeChecked();
    expect(box.closest("label")).not.toHaveTextContent("hidden for width");
    expect(screen.getByRole("button", { name: "Columns (2/3)" })).toBeInTheDocument();
  });

  it("does not bake the default into the stored view", () => {
    renderTable([NAME, FLAG, NOTE]);
    expect(stored().hidden).toEqual([]);
    expect(stored()).not.toHaveProperty("shown");
  });

  it("applies to a saved view that has no entry for the column (a column added later)", () => {
    localStorage.setItem("hbui-table:dh", JSON.stringify({ sort: null, filters: {}, pageSize: 25, hidden: [] }));
    renderTable([NAME, FLAG, NOTE]);
    expect(heads().join("|")).not.toMatch(/Flag/);
  });

  it("a user's tick wins, and is remembered across mounts", () => {
    const { unmount } = renderTable([NAME, FLAG, NOTE]);
    fireEvent.click(screen.getByRole("checkbox", { name: /Flag/ }));
    expect(heads().join("|")).toMatch(/Flag/);
    expect(stored().shown).toEqual(["flag"]);
    unmount();
    renderTable([NAME, FLAG, NOTE]);
    expect(heads().join("|")).toMatch(/Flag/);
  });

  it("unticking it again stores it as the user's own hidden column", () => {
    const { unmount } = renderTable([NAME, FLAG, NOTE]);
    const box = () => screen.getByRole("checkbox", { name: /Flag/ });
    fireEvent.click(box());
    fireEvent.click(box());
    expect(heads().join("|")).not.toMatch(/Flag/);
    expect(stored().hidden).toEqual(["flag"]);
    expect(stored()).not.toHaveProperty("shown");
    unmount();
    // Dropping `defaultHidden` later does not undo the user's choice.
    renderTable([NAME, { ...FLAG, defaultHidden: false }, NOTE]);
    expect(heads().join("|")).not.toMatch(/Flag/);
  });

  it("hiding another column leaves the default out of the stored hidden list", () => {
    const { unmount } = renderTable([NAME, FLAG, NOTE]);
    fireEvent.click(screen.getByRole("checkbox", { name: /Note/ }));
    expect(stored().hidden).toEqual(["note"]);
    unmount();
    // So an app that drops the flag gets the column back on every device.
    renderTable([NAME, { ...FLAG, defaultHidden: false }, NOTE]);
    expect(heads().join("|")).toMatch(/Flag/);
  });

  it("works without a storageKey, and a column that appears later starts hidden", () => {
    const { rerender } = renderTable([NAME, NOTE], undefined);
    rerender(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={[NAME, FLAG, NOTE]} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );
    expect(heads().join("|")).not.toMatch(/Flag/);
    expect(screen.getByRole("checkbox", { name: /Flag/ })).not.toBeChecked();
  });

  it("is ignored with the Columns panel switched off: nothing could bring it back", () => {
    render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={[NAME, FLAG, NOTE]} rowKey={(r) => r.id} columnSettings={false} />
      </MemoryRouter>,
    );
    expect(heads().join("|")).toMatch(/Flag/);
  });
});
