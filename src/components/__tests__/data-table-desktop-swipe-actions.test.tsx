import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps, MobileSwipeActions } from "../data-table";
import { WriteLockProvider } from "../write-lock";
import { stubPhone } from "../../test/viewport";

/**
 * keksdose dev#598 (Marcel 2026-10-19: every table whose phone cards swipe gets a
 * desktop actions column with the same actions). DataTable derives that column from
 * `mobileSwipeActions` itself — on by default, hidden on the phone, each button the
 * swipe's own `onCommit` — as keksdose's wrapper did (data-table.tsx, swipe-row-actions.tsx).
 */

interface Row {
  id: number;
  name: string;
  locked?: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo", locked: true },
];

const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

const approve = vi.fn();
const reject = vi.fn();
const archive = vi.fn();

const plan = (row: Row): MobileSwipeActions | null =>
  row.locked
    ? null
    : {
        end: [
          { id: "approve", label: "Approve", tone: "success", onCommit: () => approve(row.id) },
          { id: "archive", label: "Archive", tone: "neutral", onCommit: () => archive(row.id) },
        ],
        start: [
          { id: "reject", label: "Reject", tone: "danger", onCommit: () => reject(row.id) },
          // The same action on both sides is one button.
          { id: "approve", label: "Approve", tone: "success", onCommit: () => approve(row.id) },
        ],
      };

function renderTable(props: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} mobileSwipeActions={plan} {...props} />
    </MemoryRouter>,
  );
}

const rowOf = (name: string) => screen.getByText(name).closest("tr")!;
// A danger swipe's button is in the row's "⋯" menu (0.49 KIT-12).
const rejectIn = (name: string) => {
  fireEvent.click(within(rowOf(name)).getByRole("button", { name: "Actions" }));
  return screen.getByRole("button", { name: "Reject" });
};

afterEach(() => {
  vi.unstubAllGlobals();
  approve.mockReset();
  reject.mockReset();
  archive.mockReset();
});

describe("DataTable's desktop column from mobileSwipeActions (dev#598)", () => {
  it("is on by default: the swipes' actions, end side first, each once, running onCommit", () => {
    renderTable();
    const alpha = within(rowOf("Alpha"));
    const names = alpha.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(names).toEqual(["Approve", "Archive", "Actions"]);
    // No confirmation of the kit's: the swipe's onCommit asks, as a swipe does.
    fireEvent.click(rejectIn("Alpha"));
    expect(reject).toHaveBeenCalledWith(1);
    fireEvent.click(alpha.getByRole("button", { name: "Approve" }));
    expect(approve).toHaveBeenCalledWith(1);
    // A row without swipes has an empty cell, not a column of its own.
    expect(within(rowOf("Bravo")).queryAllByRole("button")).toHaveLength(0);
  });

  it("carries the swipe's tone where an icon button has one", () => {
    renderTable();
    expect(within(rowOf("Alpha")).getByRole("button", { name: "Archive" }).getAttribute("data-tone")).toBe("muted");
    expect(rejectIn("Alpha").className).toMatch(/danger/);
  });

  it("is left out with desktopSwipeActions={false}", () => {
    renderTable({ desktopSwipeActions: false });
    expect(within(rowOf("Alpha")).queryAllByRole("button")).toHaveLength(0);
  });

  it("omits what the row already has a button for, by the action's id", () => {
    renderTable({ desktopSwipeActions: { omit: (action) => action.id === "archive" } });
    expect(within(rowOf("Alpha")).queryByRole("button", { name: "Archive" })).toBeNull();
    expect(within(rowOf("Alpha")).getByRole("button", { name: "Approve" })).toBeTruthy();
  });

  it('collapses into the "⋯" menu named after the row when asked', () => {
    renderTable({ desktopSwipeActions: { collapse: "menu", name: (r) => r.name } });
    expect(within(rowOf("Alpha")).getByRole("button", { name: "Actions for Alpha" })).toBeTruthy();
  });

  it("is refused under a write lock with `commit`", () => {
    render(
      <MemoryRouter>
        <WriteLockProvider locked kind="demo" reason="Not in the demo.">
          <DataTable
            rows={ROWS}
            columns={COLUMNS}
            rowKey={(r) => r.id}
            mobileSwipeActions={plan}
            desktopSwipeActions={{ commit: true }}
          />
        </WriteLockProvider>
      </MemoryRouter>,
    );
    fireEvent.click(within(rowOf("Alpha")).getByRole("button", { name: "Approve" }));
    expect(approve).not.toHaveBeenCalled();
  });

  it("is not added beside rowActions' own column unless asked", () => {
    const rowActions = [{ label: "Open", icon: <span>o</span>, onAction: vi.fn() }];
    const { unmount } = renderTable({ rowActions });
    expect(within(rowOf("Alpha")).queryByRole("button", { name: "Approve" })).toBeNull();
    unmount();
    renderTable({ rowActions, desktopSwipeActions: true });
    expect(within(rowOf("Alpha")).getByRole("button", { name: "Approve" })).toBeTruthy();
  });

  it("is the table's own column: not in the column settings, not counted", () => {
    renderTable();
    const settings = screen.getByRole("button", { name: /Columns/ });
    expect(settings.textContent).toContain("1/1");
    fireEvent.click(settings);
    expect(screen.queryByRole("checkbox", { name: "Actions" })).toBeNull();
  });

  it("is hidden on the phone, where the same actions are the card's swipes", () => {
    stubPhone();
    renderTable();
    expect(document.querySelector('[data-slot="row-actions"]')).toBeNull();
  });
});
