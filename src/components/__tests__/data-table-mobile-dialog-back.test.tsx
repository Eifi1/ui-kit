import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { useSearchParamState } from "../../hooks/use-search-param-state";

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
const hasSentinel = () =>
  typeof (window.history.state as Record<string, unknown> | null)?.[SENTINEL_KEY] === "string";

async function settle() {
  await act(async () => {
    for (let turn = 0; turn < 10; turn += 1) await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("width <"), // the phone layout's `(width < 768px)`
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await settle();
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
      await settle();
      expect(window.location.search).toBe("?row=a");
      expect(screen.getByRole("dialog")).toHaveTextContent("editor Alpha");

      fireEvent.pointerDown(screen.getByText("Cancel"));
      fireEvent.click(screen.getByText("Cancel"));
      await settle();
      await new Promise((r) => setTimeout(r, 30));
      await settle();

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
      await settle();
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await act(async () => {
        const landed = new Promise((r) => window.addEventListener("popstate", r, { once: true }));
        window.history.back();
        await landed;
      });
      await settle();
      expect(window.location.pathname).toBe("/register");
      expect(window.location.search).toBe("");
      expect(screen.queryByRole("dialog")).toBeNull();
      view.unmount();
    });
  });
});
