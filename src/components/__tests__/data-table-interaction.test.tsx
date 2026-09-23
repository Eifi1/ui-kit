import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * The React-correctness wave (audit 2026-09-22, §react-correctness).
 *
 * `DataTable` is 1,449 lines behind 122 call sites and, until the a11y pass next
 * door, nothing in this repository rendered it — which is how a resize handler that
 * leaves `document.body` unselectable for the rest of the session, and a shift-range
 * that indexes into a list it does not control, lived as long as they did. Every
 * assertion here is about what a render DOES, not about what it looks like.
 *
 * Two facts about the environment, both load-bearing:
 *
 *  - `DataTable` calls `useSearchParams()` unconditionally, so every render needs a
 *    Router even with `urlSync` off. That is a finding against the component, not
 *    something a test may work around.
 *  - `window.matchMedia` is undefined here, so `useMediaQuery(_, true)` falls back to
 *    `true` and we get the DESKTOP table — the only branch with a header, a resize
 *    handle or a selection column at all.
 */

interface Row {
  id: number;
  name: string;
}

const FIVE: Row[] = ["Ada", "Bob", "Cy", "Dee", "Eve"].map((name, i) => ({ id: i + 1, name }));

/** Calls made from inside a column definition, so a memo that re-ran is visible. */
const sortCalls = vi.fn();
const cellCalls = vi.fn();

/** Built INLINE on every render, exactly as every call site does — that identity
 *  churn is what the memo signatures exist to survive. */
function columns(): DataTableColumn<Row>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (r) => {
        cellCalls();
        return r.name;
      },
      sortBy: (r) => {
        sortCalls();
        return r.name;
      },
    },
    { key: "id", header: "Id", cell: (r) => String(r.id) },
  ];
}

const SELECTION_BASE = {
  isSelected: () => false,
  allSelected: false,
  someSelected: false,
  onToggleAll: () => {},
};

/** A parent that re-renders for reasons of its own — a sibling field being typed
 *  into, a poll landing — without changing anything the table is showing. */
function Host({
  children,
}: {
  children: (bump: number) => React.ReactNode;
}) {
  const [bump, setBump] = useState(0);
  return (
    <MemoryRouter>
      <button onClick={() => setBump((b) => b + 1)}>unrelated</button>
      {children(bump)}
    </MemoryRouter>
  );
}

function rerenderParent(times = 3) {
  for (let i = 0; i < times; i += 1) {
    fireEvent.click(screen.getByRole("button", { name: "unrelated" }));
  }
}

describe("DataTable does not redo its work for an unrelated render", () => {
  it("keeps the sorted rows it has when only the parent re-rendered", () => {
    render(
      <Host>
        {() => <DataTable rows={FIVE} columns={columns()} rowKey={(r) => r.id} />}
      </Host>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    const afterSort = sortCalls.mock.calls.length;
    expect(afterSort).toBeGreaterThan(0);

    rerenderParent();

    // Before the fix the memo was keyed on the `columns` ARRAY, which every call site
    // rebuilds inline — so a keystroke in a sibling field re-sorted the whole dataset.
    expect(sortCalls.mock.calls.length).toBe(afterSort);
  });
});

describe("DataTable column resize", () => {
  const handle = () => screen.getAllByRole("separator")[0];

  function drag(el: Element, to: number, pointerId = 1) {
    fireEvent.pointerMove(el, { pointerId, clientX: to });
  }

  it("writes the live width to the header and re-renders the rows once, at the end", () => {
    render(
      <MemoryRouter>
        <DataTable rows={FIVE} columns={columns()} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );
    const sep = handle();
    const th = screen.getAllByRole("columnheader")[0] as HTMLElement;

    fireEvent.pointerDown(sep, { pointerId: 1, button: 0, clientX: 0 });
    const duringDrag = cellCalls.mock.calls.length;
    drag(sep, 60);
    drag(sep, 120);
    drag(sep, 180);

    // The header follows the pointer, and so do the cells under it — a `<th>` on its
    // own cannot pull a column narrower than the `<td>`s already pinned beneath it.
    expect(th.style.width).toBe("180px");
    const firstCell = screen.getByText("Ada").closest("td") as HTMLElement;
    expect(firstCell.style.width).toBe("180px");
    // ...and not one row was re-rendered to do it. This was a `setWidths` per
    // `mousemove`: every row of the table, on every pixel.
    expect(cellCalls.mock.calls.length).toBe(duringDrag);

    fireEvent.pointerUp(sep, { pointerId: 1 });
    expect(cellCalls.mock.calls.length).toBeGreaterThan(duringDrag);
    expect(th.style.width).toBe("180px");
  });

  it("still clears the width on a double click", () => {
    // The handle is two controls in one, and the drag now cancels `pointerdown`'s
    // default. Per the pointer-events spec that suppresses the compatibility MOUSE
    // events and leaves `click`/`dblclick` alone — this is the assertion that says so
    // out loud, because the reset is the only way back to an auto-sized column.
    render(
      <MemoryRouter>
        <DataTable rows={FIVE} columns={columns()} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );
    const sep = handle();
    const th = () => screen.getAllByRole("columnheader")[0] as HTMLElement;

    fireEvent.pointerDown(sep, { pointerId: 1, button: 0, clientX: 0 });
    drag(sep, 200);
    fireEvent.pointerUp(sep, { pointerId: 1 });
    expect(th().style.width).toBe("200px");

    fireEvent.doubleClick(sep);
    expect(th().style.width).toBe("");
  });

  it("gives the page back its cursor and its text selection on every exit path", () => {
    const view = render(
      <MemoryRouter>
        <DataTable rows={FIVE} columns={columns()} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );

    fireEvent.pointerDown(handle(), { pointerId: 1, button: 0, clientX: 0 });
    expect(document.body.style.userSelect).toBe("none");
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(document.body.style.userSelect).toBe("");
    expect(document.body.style.cursor).toBe("");

    // Cancelled: the browser took the pointer for a system gesture.
    fireEvent.pointerDown(handle(), { pointerId: 2, button: 0, clientX: 0 });
    drag(handle(), 90, 2);
    fireEvent.pointerCancel(handle(), { pointerId: 2 });
    expect(document.body.style.userSelect).toBe("");
    expect(document.body.style.cursor).toBe("");
    // ...and the header is back where React last rendered it, which nothing else
    // could do: the width the drag wrote is invisible to React.
    expect((screen.getAllByRole("columnheader")[0] as HTMLElement).style.width).toBe("");

    // Unmounted mid-drag — the row beneath opened a route.
    fireEvent.pointerDown(handle(), { pointerId: 3, button: 0, clientX: 0 });
    expect(document.body.style.userSelect).toBe("none");
    view.unmount();
    expect(document.body.style.userSelect).toBe("");
    expect(document.body.style.cursor).toBe("");
  });
});

describe("DataTable shift-range selection", () => {
  // Driven through the ROW, which is the gesture feedback #289 added: ⌘/Ctrl-click
  // anchors, Shift-click draws the range. The checkbox runs the same `selectRange`,
  // but jsdom re-fires React's synthesised `change` for a click whose default was
  // prevented, which would add a phantom toggle to every assertion here.
  function rowOf(name: string) {
    return screen.getByText(name).closest("tr") as HTMLElement;
  }

  it("commits the whole range in one call when the owner offers onToggleMany", () => {
    const onToggle = vi.fn();
    const onToggleMany = vi.fn();
    render(
      <MemoryRouter>
        <DataTable
          rows={FIVE}
          columns={columns()}
          rowKey={(r) => r.id}
          selection={{ ...SELECTION_BASE, onToggle, onToggleMany }}
        />
      </MemoryRouter>,
    );
    fireEvent.click(rowOf("Bob"), { ctrlKey: true });
    onToggle.mockClear();

    fireEvent.click(rowOf("Eve"), { shiftKey: true });

    expect(onToggleMany).toHaveBeenCalledTimes(1);
    expect(onToggleMany.mock.calls[0][0].map((r: Row) => r.name)).toEqual([
      "Bob",
      "Cy",
      "Dee",
      "Eve",
    ]);
    expect(onToggleMany.mock.calls[0][1]).toBe(true);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("still walks the range row by row for an owner that has not adopted it", () => {
    const onToggle = vi.fn();
    render(
      <MemoryRouter>
        <DataTable
          rows={FIVE}
          columns={columns()}
          rowKey={(r) => r.id}
          selection={{ ...SELECTION_BASE, onToggle }}
        />
      </MemoryRouter>,
    );
    fireEvent.click(rowOf("Bob"), { ctrlKey: true });
    onToggle.mockClear();
    fireEvent.click(rowOf("Eve"), { shiftKey: true });
    expect(onToggle.mock.calls.map((c) => (c[0] as Row).name)).toEqual([
      "Bob",
      "Cy",
      "Dee",
      "Eve",
    ]);
  });

  it("anchors on the ROW, not on where that row happened to sit", () => {
    // The list reorders under the anchor: the user picks Bob, sorts the column, and
    // shift-clicks. Held as an index, the anchor then addressed whichever row had
    // moved into Bob's old slot — a range the user never drew.
    const onToggleMany = vi.fn();
    render(
      <MemoryRouter>
        <DataTable
          rows={FIVE}
          columns={columns()}
          rowKey={(r) => r.id}
          selection={{ ...SELECTION_BASE, onToggle: vi.fn(), onToggleMany }}
        />
      </MemoryRouter>,
    );
    fireEvent.click(rowOf("Bob"), { ctrlKey: true }); // index 1 of Ada,Bob,Cy,Dee,Eve

    fireEvent.click(screen.getByRole("button", { name: "Name" })); // asc — unchanged
    fireEvent.click(screen.getByRole("button", { name: "Name" })); // desc: Eve…Ada
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("Eve");

    fireEvent.click(rowOf("Dee"), { shiftKey: true }); // index 1 of the new order

    expect(onToggleMany).toHaveBeenCalledTimes(1);
    // Bob is at index 3 now, so the range is Dee…Bob. Keyed on the index it had, the
    // range would have been the single row Dee.
    expect(onToggleMany.mock.calls[0][0].map((r: Row) => r.name)).toEqual(["Dee", "Cy", "Bob"]);
  });
});

describe("DataTable view state is written out by value", () => {
  it("does not rewrite localStorage on a render that changed nothing", () => {
    const writes = vi.spyOn(Storage.prototype, "setItem");
    render(
      <Host>
        {() => (
          <DataTable
            rows={FIVE}
            columns={columns()}
            rowKey={(r) => r.id}
            storageKey="wave5"
            // CONTROLLED: a fresh object every render, which is the whole defect.
            filters={{}}
            onFiltersChange={() => {}}
          />
        )}
      </Host>,
    );
    const afterMount = writes.mock.calls.length;
    expect(afterMount).toBe(1);

    rerenderParent();

    // A synchronous main-thread write per render of the page around the table.
    expect(writes.mock.calls.length).toBe(afterMount);
    writes.mockRestore();
  });

  it("does not push a new location on a render that changed nothing", () => {
    const keys: string[] = [];
    function Probe() {
      keys.push(useLocation().key);
      return null;
    }
    render(
      <Host>
        {() => (
          <>
            <Probe />
            <DataTable
              rows={FIVE}
              columns={columns()}
              rowKey={(r) => r.id}
              urlSync
              filters={{}}
              onFiltersChange={() => {}}
            />
          </>
        )}
      </Host>,
    );
    const distinct = new Set(keys).size;

    rerenderParent();

    // Each `setSearchParams(…, { replace: true })` is a navigation the router answers
    // with a render — which re-entered the effect that issued it.
    expect(new Set(keys).size).toBe(distinct);
  });
});
