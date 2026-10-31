import { useEffect, useMemo, useRef, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { stubPhone } from "../../test/viewport";

/**
 * When the row holding the focus leaves the table — its own delete, a status change that
 * filters it out, an approval — focus fell to `<body>`, and a keyboard or screen-reader
 * user started again from the top of the page (refactor audit 2026-10-30, DSP-4). The
 * table now puts it on the row that took the removed row's place, else the last row, else
 * the table itself, and says how many rows are left.
 */

interface Row {
  id: number;
  name: string;
}
const ABC: Row[] = [
  { id: 1, name: "A" },
  { id: 2, name: "B" },
  { id: 3, name: "C" },
];

function Host({
  initial = ABC,
  focusable = true,
  confirmFirst = false,
}: {
  initial?: Row[];
  focusable?: boolean;
  /** A confirm dialog outside the table asks first, as `useConfirm` does. */
  confirmFirst?: boolean;
}) {
  const [rows, setRows] = useState(initial);
  const [asking, setAsking] = useState<number | null>(null);
  const remove = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));
  const columns = useMemo<DataTableColumn<Row>[]>(
    () => [
      { key: "name", header: "Name", cell: (r) => r.name },
      {
        key: "del",
        header: "Delete",
        noRowLink: true,
        cell: (r) => (
          <button type="button" onClick={() => (confirmFirst ? setAsking(r.id) : remove(r.id))}>
            Delete {r.name}
          </button>
        ),
      },
    ],
    [confirmFirst],
  );
  return (
    <MemoryRouter>
      <button type="button">Outside</button>
      <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={focusable ? () => {} : undefined} />
      {asking !== null && (
        <ConfirmBox
          onYes={() => {
            remove(asking);
            setAsking(null);
          }}
        />
      )}
      <button type="button" onClick={() => remove(2)}>
        Remove B from outside
      </button>
    </MemoryRouter>
  );
}

function ConfirmBox({ onYes }: { onYes: () => void }) {
  const yes = useRef<HTMLButtonElement>(null);
  useEffect(() => yes.current?.focus(), []);
  return (
    <div role="alertdialog" aria-label="Delete?">
      <button type="button" ref={yes} onClick={onYes}>
        Yes
      </button>
    </div>
  );
}

const deleteButton = (name: string) => screen.getByRole("button", { name: `Delete ${name}` });
const rowOf = (name: string) => screen.getByRole("cell", { name }).closest("tr");

/** Focus a control the way a user's press does, then press it. */
function press(el: HTMLElement) {
  act(() => el.focus());
  fireEvent.click(el);
}

afterEach(() => vi.useRealTimers());

describe("DataTable keeps the focus when its row leaves (audit 2026-10-30 DSP-4)", () => {
  it("a focusable row's own delete: the row now in its place takes the focus", () => {
    render(<Host />);
    press(deleteButton("B"));
    expect(screen.queryByRole("cell", { name: "B" })).toBeNull();
    expect(document.activeElement).toBe(rowOf("C"));
  });

  it("rows without onRowClick: the next row's first control takes it", () => {
    render(<Host focusable={false} />);
    press(deleteButton("B"));
    expect(document.activeElement).toBe(deleteButton("C"));
  });

  it("the last row goes: the row now last takes it", () => {
    render(<Host />);
    press(deleteButton("C"));
    expect(document.activeElement).toBe(rowOf("B"));
  });

  it("the only row goes: the table itself, by its name", () => {
    render(<Host initial={[ABC[0]]} />);
    press(deleteButton("A"));
    expect(document.activeElement).toBe(screen.getByRole("table", { name: "Data table" }));
  });

  it("says how many rows are left", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Host />);
    press(deleteButton("B"));
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByRole("status")).toHaveTextContent("2 of 2 rows");
  });

  it("a confirm dialog that held the focus while the row went: back into the table", () => {
    render(<Host confirmFirst />);
    press(deleteButton("B"));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Yes" }));
    press(screen.getByRole("button", { name: "Yes" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(rowOf("C"));
  });

  it("leaves alone a focus the user has taken elsewhere", () => {
    render(<Host />);
    act(() => deleteButton("B").focus());
    act(() => screen.getByRole("button", { name: "Outside" }).focus());
    act(() => screen.getByRole("button", { name: "Outside" }).blur());
    fireEvent.click(screen.getByRole("button", { name: "Remove B from outside" }));
    expect(screen.queryByRole("cell", { name: "B" })).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it("on a phone: the card now in its place", () => {
    const restore = stubPhone();
    try {
      render(<Host />);
      press(deleteButton("B"));
      // The stretched card's title control is the card's way in (0.50 K4).
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "C" }));
    } finally {
      restore();
    }
  });

  it("on a phone, the only card goes: the list, by the table's name", () => {
    const restore = stubPhone();
    try {
      render(<Host initial={[ABC[0]]} />);
      press(deleteButton("A"));
      expect(document.activeElement).toBe(screen.getByRole("list", { name: "Data table" }));
    } finally {
      restore();
    }
  });
});
