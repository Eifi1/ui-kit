import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CLIPS_ATTRIBUTE, Tooltip } from "../tooltip";
import { DataTable, type DataTableColumn } from "../data-table";
import { Table, TableBody, TableCell, TableRow } from "../table";
import { hasClippingAncestor } from "../../lib/clipping";

/**
 * keksdose 0.10 (D2): jsdom computes no Tailwind, so the kit's scrollers read
 * `overflow: visible` there and a table-cell tooltip stayed in place — its always-
 * mounted bubble doubled the cell's accessible name and textContent
 * ("CheckingChecking"), and the app pinned `portal` on every such tooltip. The kit's
 * scrollers now carry `data-clips`, which the auto-portal honours without a stylesheet.
 */

interface Row {
  id: number;
  account: string;
}

const ROWS: Row[] = [{ id: 1, account: "Checking" }];

const COLUMNS: DataTableColumn<Row>[] = [
  {
    key: "account",
    header: "Account",
    // No `portal`: the tooltip decides for itself.
    cell: (r) => (
      <Tooltip label={r.account}>
        <span>{r.account}</span>
      </Tooltip>
    ),
  },
];

function renderTable() {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} />
    </MemoryRouter>,
  );
}

describe("the clips marker", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is data-clips, and counts as clipping with no computed overflow", () => {
    expect(CLIPS_ATTRIBUTE).toBe("data-clips");
    const { container } = render(
      <div {...{ [CLIPS_ATTRIBUTE]: "" }}>
        <span data-testid="inside" />
      </div>,
    );
    expect(window.getComputedStyle(container.firstElementChild!).overflowX).toBe("visible");
    expect(hasClippingAncestor(screen.getByTestId("inside"))).toBe(true);
  });

  it("portals a DataTable cell's tooltip without `portal`, and the cell reads once", () => {
    renderTable();
    const cell = screen.getByRole("cell", { name: "Checking" });
    expect(cell.textContent).toBe("Checking");
    expect(screen.queryByRole("tooltip")).toBeNull();

    const trigger = within(cell).getByText("Checking");
    fireEvent.mouseEnter(trigger.parentElement!);
    const bubble = screen.getByRole("tooltip");
    expect(bubble).toHaveTextContent("Checking");
    expect(bubble.style.position).toBe("fixed");
    expect(cell).not.toContainElement(bubble);
    expect(trigger).toHaveAttribute("aria-describedby", bubble.id);
    // Still one "Checking" in the cell while the bubble is up.
    expect(cell.textContent).toBe("Checking");
  });

  it("portals in the phone card list too (the framed root clips)", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    renderTable();
    expect(screen.queryByRole("table")).toBeNull();
    // Once: the trigger, with no bubble beside it.
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("portals a static Table cell's tooltip", () => {
    render(
      <Table aria-label="Accounts">
        <TableBody>
          <TableRow>
            <TableCell>
              <Tooltip label="Checking">
                <span>Checking</span>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("cell", { name: "Checking" }).textContent).toBe("Checking");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("leaves a tooltip outside any marked container in place", () => {
    render(
      <Tooltip label="Delete">
        <button type="button">x</button>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
});
