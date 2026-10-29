import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Pencil } from "lucide-react";

import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps, MobileSwipeActions } from "../data-table";
import { rowActionsColumn } from "../row-actions";
import { TranslationReviewPanel } from "../translation-review";
import { translationRows } from "../../lib/translation-review";
import { UiKitProvider } from "../../i18n/kit-labels";
import { swipePlanRowActions } from "../../data-table";
import { userRosterColumns } from "../../admin/user-roster";

/**
 * 0.46.1 — keksdose dev#598 rework (Marcel 2026-10-20): every table with an actions
 * column shows a VISIBLE "Actions" heading. DataTable's `rowActions` column, the column
 * derived from `mobileSwipeActions`, `rowActionsColumn` and TranslationReviewPanel's
 * actions column all show it by default; `false` keeps the old screen-reader-only name,
 * a node replaces it.
 */

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
];
const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];
const plan = (): MobileSwipeActions => ({
  end: [{ id: "approve", label: "Approve", tone: "success", onCommit: vi.fn() }],
});

const wrap = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const table = (props: Partial<DataTableProps<Row>>) =>
  wrap(<DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} {...props} />);
/** The last header cell — where every actions column sits. */
const lastHead = () => screen.getAllByRole("columnheader").at(-1)!;
const visibleText = (el: HTMLElement) =>
  [...el.querySelectorAll<HTMLElement>("*")].filter((n) => n.classList.contains("sr-only")).length === 0
    ? el.textContent
    : null;

describe("the actions heading is visible (0.46.1, dev#598 rework)", () => {
  it("DataTable rowActions: 'Actions' on screen, end-aligned over the buttons", () => {
    table({ rowActions: [{ kind: "edit", onAction: vi.fn() }] });
    const head = lastHead();
    expect(visibleText(head)).toBe("Actions");
    expect(head).toHaveClass("w-px", "text-end");
  });

  it("DataTable rowActionsHeader: false keeps the screen-reader name, a node replaces it", () => {
    const { unmount } = table({ rowActions: [{ kind: "edit", onAction: vi.fn() }], rowActionsHeader: false });
    expect(within(lastHead()).getByText("Actions")).toHaveClass("sr-only");
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    unmount();
    table({ rowActions: [{ kind: "edit", onAction: vi.fn() }], rowActionsHeader: "Tools" });
    expect(visibleText(lastHead())).toBe("Tools");
  });

  it("the column from mobileSwipeActions: visible by default, `header` changes or hides it", () => {
    const { unmount } = table({ mobileSwipeActions: plan });
    expect(visibleText(lastHead())).toBe("Actions");
    expect(lastHead()).toHaveClass("text-end");
    unmount();
    const second = table({ mobileSwipeActions: plan, desktopSwipeActions: { header: false } });
    expect(within(lastHead()).getByText("Actions")).toHaveClass("sr-only");
    second.unmount();
    table({ mobileSwipeActions: plan, desktopSwipeActions: { header: <b>Do</b> } });
    expect(visibleText(lastHead())).toBe("Do");
  });

  it("follows the provider's word", () => {
    render(
      <UiKitProvider labels={{ dataTable: { actions: "Aktionen" } }}>
        <MemoryRouter>
          <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} mobileSwipeActions={plan} />
        </MemoryRouter>
      </UiKitProvider>,
    );
    expect(visibleText(lastHead())).toBe("Aktionen");
  });

  it("rowActionsColumn: visible by default, `header: false` hides it, a node replaces it", () => {
    const actions = () => [{ key: "edit", label: "Edit", icon: <Pencil />, onSelect: vi.fn() }];
    const { unmount } = table({ columns: [...COLUMNS, rowActionsColumn<Row>({ actions })] });
    expect(visibleText(lastHead())).toBe("Actions");
    expect(lastHead()).toHaveClass("text-end");
    unmount();
    const second = table({ columns: [...COLUMNS, rowActionsColumn<Row>({ actions, header: false })] });
    expect(within(lastHead()).getByText("Actions")).toHaveClass("sr-only");
    second.unmount();
    table({ columns: [...COLUMNS, rowActionsColumn<Row>({ actions, header: "Edit it" })] });
    expect(visibleText(lastHead())).toBe("Edit it");
  });

  it("TranslationReviewPanel: its actions column says 'Actions', bound or not", () => {
    const rows = translationRows({
      locale: "fr",
      strings: { "common.save": "Enregistrer" },
      reference: { "common.save": "Save" },
      reviews: [],
    });
    const props = { rows, localeLabel: "Français", referenceLabel: "English", onSave: vi.fn() };
    const { unmount } = wrap(<TranslationReviewPanel {...props} />);
    expect(visibleText(lastHead())).toBe("Actions");
    unmount();
    wrap(<TranslationReviewPanel {...props} swipe />);
    expect(visibleText(lastHead())).toBe("Actions");
  });
});

describe("userRosterColumns' actions column (0.46.1)", () => {
  const roster = (actionsHeader?: false | string) => {
    const columns = userRosterColumns<{ id: number; name: string; email: string; role: string }>({
      roles: { admin: { label: "Admin" } },
      actions: () => [{ label: "Resend", onSelect: vi.fn() }],
      actionsHeader,
    });
    return wrap(
      <DataTable
        rows={[{ id: 1, name: "Ada", email: "ada@example.com", role: "admin" }]}
        columns={columns}
        rowKey={(r) => r.id}
        paginated={false}
      />,
    );
  };
  it("shows 'Actions' by default; `actionsHeader: false` hides it, a node replaces it", () => {
    const { unmount } = roster();
    expect(visibleText(lastHead())).toBe("Actions");
    expect(lastHead()).toHaveClass("text-end");
    unmount();
    const second = roster(false);
    expect(within(lastHead()).getByText("Actions")).toHaveClass("sr-only");
    second.unmount();
    roster("Manage");
    expect(visibleText(lastHead())).toBe("Manage");
  });
});

describe("swipePlanRowActions (public since 0.46.1, keksdose N3)", () => {
  it("is on the /data-table entry: end side first, each once, omit honoured, null is []", () => {
    const onCommit = vi.fn();
    const actions = swipePlanRowActions(
      {
        end: [{ id: "a", label: "A", tone: "danger", onCommit }],
        start: [
          { id: "b", label: "B", tone: "neutral", onCommit: vi.fn() },
          { id: "a", label: "A", tone: "neutral", onCommit: vi.fn() },
          { id: "c", label: "C", tone: "neutral", onCommit: vi.fn() },
        ],
      },
      ROWS[0],
      { omit: (action) => action.id === "c" },
    );
    expect(actions.map((a) => [a.key, a.tone])).toEqual([
      ["a", "danger"],
      ["b", "muted"],
    ]);
    actions[0].onSelect?.();
    expect(onCommit).toHaveBeenCalled();
    expect(swipePlanRowActions(null, ROWS[0])).toEqual([]);
  });
});
