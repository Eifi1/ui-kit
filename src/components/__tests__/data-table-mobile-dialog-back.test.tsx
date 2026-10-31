import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { useSearchParamState } from "../../hooks/use-search-param-state";
import { drainTasks } from "../../test/tasks";
import { stubPhone } from "../../test/viewport";

/**
 * `mobileDialogBackCloses` — the phone row dialog's Back sentinel, switchable
 * (keksdose dev #584). A row whose open state is a PUSHED `?row=` already has Back
 * answered by the router; the dialog's own entry on top of it made two owners of one
 * press, and Cancel's replace-on-clear landed on the sentinel's entry.
 */

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Bravo" },
];

const COLUMNS: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];

const SENTINEL_KEY = "__hbUiOverlayHistory";
const hasSentinel = () => typeof (window.history.state as Record<string, unknown> | null)?.[SENTINEL_KEY] === "string";

beforeEach(() => {
  stubPhone();
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await drainTasks();
});

function LocalTable(extra: Partial<DataTableProps<Row>>) {
  const [open, setOpen] = useState<string | null>("a");
  return (
    <DataTable
      rows={ROWS}
      columns={COLUMNS}
      rowKey={(r) => r.id}
      mobileExpandAsDialog
      onRowClick={(r) => setOpen((cur) => (cur === r.id ? null : r.id))}
      isExpanded={(r) => r.id === open}
      expandedRow={(r) => <p>editor {r.name}</p>}
      {...extra}
    />
  );
}

describe("DataTable mobileDialogBackCloses", () => {
  it("arms the dialog's Back entry by default (unchanged)", async () => {
    window.history.replaceState(null, "", "/local");
    const view = render(
      <MemoryRouter>
        <LocalTable />
      </MemoryRouter>,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("editor Alpha");
    expect(hasSentinel()).toBe(true);
    view.unmount();
  });

  it("pushes nothing when turned off", async () => {
    window.history.replaceState(null, "", "/local-off");
    const push = vi.spyOn(window.history, "pushState");
    const view = render(
      <MemoryRouter>
        <LocalTable mobileDialogBackCloses={false} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("editor Alpha");
    expect(push).not.toHaveBeenCalled();
    expect(hasSentinel()).toBe(false);
    push.mockRestore();
    view.unmount();
  });

  describe("with the open row in a pushed ?row= (the keksdose register shape)", () => {
    function RowPage() {
      const [row, setRow] = useSearchParamState<string | null>("row", null, { history: "replace-on-clear" });
      return (
        <DataTable
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r) => r.id}
          mobileExpandAsDialog
          mobileDialogBackCloses={false}
          onRowClick={(r) => setRow((cur) => (cur === r.id ? null : r.id))}
          isExpanded={(r) => r.id === row}
          expandedRow={(r) => (
            <div>
              <p>editor {r.name}</p>
              <button onClick={() => setRow(null)}>Cancel</button>
            </div>
          )}
        />
      );
    }

    function renderPage() {
      return render(
        <BrowserRouter>
          <Routes>
            <Route path="/register" element={<RowPage />} />
          </Routes>
        </BrowserRouter>,
      );
    }

    it("Cancel closes the editor and it stays closed", async () => {
      window.history.replaceState(null, "", "/register");
      const go = vi.spyOn(window.history, "go");
      const view = renderPage();
      fireEvent.click(screen.getByText("Alpha"));
      await drainTasks();
      expect(window.location.search).toBe("?row=a");
      expect(screen.getByRole("dialog")).toHaveTextContent("editor Alpha");

      fireEvent.pointerDown(screen.getByText("Cancel"));
      fireEvent.click(screen.getByText("Cancel"));
      // A `go(-n)` the overlay history might owe is scheduled on a 0 ms timer and lands a
      // task later (use-overlay-history.ts): counted turns let it, however loaded the
      // machine, where a fixed 30 ms sleep passed whether or not the bug was there
      // (refactor audit 2026-10-30, TST-3).
      await drainTasks(20);

      expect(go).not.toHaveBeenCalled();
      expect(window.location.search).toBe("");
      expect(screen.queryByRole("dialog")).toBeNull();
      go.mockRestore();
      view.unmount();
    });

    it("Back closes the editor through the router, in one press", async () => {
      window.history.replaceState(null, "", "/register");
      const view = renderPage();
      fireEvent.click(screen.getByText("Alpha"));
      await drainTasks();
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await act(async () => {
        const landed = new Promise((r) => window.addEventListener("popstate", r, { once: true }));
        window.history.back();
        await landed;
      });
      await drainTasks();
      expect(window.location.pathname).toBe("/register");
      expect(window.location.search).toBe("");
      expect(screen.queryByRole("dialog")).toBeNull();
      view.unmount();
    });
  });
});
