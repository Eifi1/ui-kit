import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { stubPhone } from "../../test/viewport";

/**
 * Keksdose live #428: a tap on a control inside a phone card's cell (its admin
 * roster's RoleSelect) bubbled to the card and opened the row — the detail sheet came
 * up instead of the picker. The desktop `<tr>` already left its cells' own controls
 * alone (`fromOwnControl`); the card does the same now, on every path that acts on a
 * tap: the plain card, the card that is a link (`rowHref`), the toggle in selection
 * mode, and the long press into it.
 */

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
];

const onRole = vi.fn();
const onEdit = vi.fn();
const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  {
    key: "role",
    header: "Role",
    cell: (r) => (
      <select aria-label={`Role of ${r.name}`} defaultValue="user" onChange={() => onRole(r.id)}>
        <option value="user">User</option>
        <option value="admin">Admin</option>
      </select>
    ),
  },
  {
    key: "edit",
    header: "Edit",
    cell: (r) => (
      <button type="button" onClick={() => onEdit(r.id)}>
        Edit {r.name}
      </button>
    ),
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  onRole.mockReset();
  onEdit.mockReset();
});

function renderTable(props: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} {...props} />
    </MemoryRouter>,
  );
}

describe("a control inside a phone card (keksdose live #428)", () => {
  it("does not open the row from a select or a button in a cell", () => {
    stubPhone();
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    fireEvent.click(screen.getByRole("combobox", { name: "Role of Alpha" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Alpha" }));
    expect(onEdit).toHaveBeenCalledWith(1);
    expect(onRowClick).not.toHaveBeenCalled();
    // The rest of the card still opens it.
    fireEvent.click(screen.getByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("does not open a linked card (rowHref) from a control in a cell", () => {
    stubPhone();
    const onRowClick = vi.fn();
    renderTable({ onRowClick, rowHref: (r) => `/rows/${r.id}` });
    fireEvent.click(screen.getByRole("button", { name: "Edit Bravo" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Role of Bravo" }));
    expect(onEdit).toHaveBeenCalledWith(2);
    expect(onRowClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Bravo"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  function Selectable(props: { onRowClick: (r: Row) => void }) {
    const [picked, setPicked] = useState<Set<number>>(new Set());
    return (
      <MemoryRouter>
        <DataTable
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          onRowClick={props.onRowClick}
          selection={{
            isSelected: (r) => picked.has(r.id),
            onToggle: (r, on) =>
              setPicked((prev) => {
                const next = new Set(prev);
                if (on) next.add(r.id);
                else next.delete(r.id);
                return next;
              }),
            allSelected: picked.size === ROWS.length,
            someSelected: picked.size > 0,
            onToggleAll: (on) => setPicked(on ? new Set(ROWS.map((r) => r.id)) : new Set()),
          }}
        />
      </MemoryRouter>
    );
  }

  const longPress = (el: HTMLElement) => {
    fireEvent.pointerDown(el, { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.click(el);
  };
  const pressed = () => screen.queryAllByRole("button", { pressed: true }).map((b) => b.textContent);

  it("does not enter selection mode from a long press on a control in a cell", () => {
    vi.useFakeTimers();
    stubPhone();
    const onRowClick = vi.fn();
    render(<Selectable onRowClick={onRowClick} />);
    longPress(screen.getByRole("button", { name: "Edit Alpha" }));
    expect(document.querySelector("[data-card-selecting]")).toBeNull();
    // The press was the button's: its click went through, the row did not open.
    expect(onEdit).toHaveBeenCalledWith(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("does not toggle a card in selection mode from a control in a cell", () => {
    vi.useFakeTimers();
    stubPhone();
    render(<Selectable onRowClick={vi.fn()} />);
    longPress(screen.getByText("Alpha"));
    expect(pressed()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Edit Bravo" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Role of Bravo" }));
    expect(pressed()).toHaveLength(1);
    expect(onEdit).toHaveBeenCalledWith(2);
    // The card itself still toggles.
    fireEvent.click(screen.getByText("Bravo"));
    expect(pressed()).toHaveLength(2);
  });
});
