import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Plus } from "lucide-react";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableGroupBy } from "../data-table";
import { IconButton } from "../icon-button";
import { applyTextSize } from "../../theme/text-size";
import { stubPhone } from "../../test/viewport";
import { axeViolations } from "../../test/axe";

/**
 * 0.58: a group band's `action` — the "+" that adds a row to THAT group (keksdose live
 * #492: a transaction on the band's day, an account of the section's type), which
 * keksdose drew in three bands by hand (band-add-button.tsx): a wrapper span with a
 * negative margin and `align-top` round each IconButton, so the band kept its height.
 * The kit now places it (after `end`), sizes it (24px compact, 28px otherwise) and keeps
 * the band's height (the overhang into the band's padding); jsdom lays nothing out, so
 * the classes are the contract.
 */

interface Tx {
  id: number;
  month: string;
  day: string;
  payee: string;
}

const TXS: Tx[] = [
  { id: 1, month: "2026-09", day: "2026-09-30", payee: "Migros" },
  { id: 2, month: "2026-09", day: "2026-09-30", payee: "Coop" },
  { id: 3, month: "2026-09", day: "2026-09-29", payee: "Salary" },
];

const COLUMNS: DataTableColumn<Tx>[] = [{ key: "payee", header: "Payee", cell: (r) => r.payee }];

const PERIOD: DataTableGroupBy<Tx> = { key: (r) => r.month, label: (k) => `Month ${k}` };

function day(onAdd: (key: string) => void, size?: "sm"): DataTableGroupBy<Tx> {
  return {
    key: (r) => r.day,
    label: (k) => `Day ${k}`,
    end: (_k, rows) => `${rows.length} transactions`,
    action: (k) => (
      <IconButton label={`Add on ${k}`} size={size} onClick={() => onAdd(k)}>
        <Plus />
      </IconButton>
    ),
  };
}

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

const bandOf = (button: HTMLElement) => button.closest<HTMLElement>("th[data-group-band]")!;

describe("DataTable groupBy action (0.58)", () => {
  it("draws the level's action in each of its bands, for that group", () => {
    const onAdd = vi.fn();
    render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={[PERIOD, day(onAdd)]} />
      </MemoryRouter>,
    );
    const add = screen.getByRole("button", { name: "Add on 2026-09-29" });
    expect(bandOf(add)).toHaveAttribute("data-group-band", "2");
    expect(bandOf(add)).toHaveTextContent("Day 2026-09-29");
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalledWith("2026-09-29");
    // One per day band; none on the period band, whose level has no action.
    expect(screen.getAllByRole("button", { name: /^Add on/ })).toHaveLength(2);
  });

  it("stands at the band's very end, after `end`, the two wrapping together", () => {
    render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={day(() => {})} />
      </MemoryRouter>,
    );
    const add = screen.getByRole("button", { name: "Add on 2026-09-30" });
    const slot = add.closest<HTMLElement>("[data-group-action]")!;
    const group = slot.parentElement!;
    // [label] … [end, action]: one box at the end, the action its last child, so the
    // reading order, the focus order and the eye's order agree.
    expect(group).toHaveClass("ms-auto");
    expect(group.lastElementChild).toBe(slot);
    expect(group.firstElementChild).toHaveTextContent("2 transactions");
    expect(group.previousElementSibling).toHaveTextContent("Day 2026-09-30");
    // The band's words first, then the control, in document order.
    const end = within(bandOf(add)).getByText("2 transactions");
    expect(end.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sizes an IconButton without a size to the band, and keeps the band's height", () => {
    const { rerender } = render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={day(() => {})} />
      </MemoryRouter>,
    );
    let add = screen.getAllByRole("button", { name: /^Add on/ })[0];
    // 28px, overhanging the band's py-1.5 by as much: its margin box is the 16px line.
    expect(add).toHaveClass("size-7");
    expect(add.closest("[data-group-action]")).toHaveClass("-my-1.5", "-me-1.5");
    rerender(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={day(() => {})} density="compact" />
      </MemoryRouter>,
    );
    add = screen.getAllByRole("button", { name: /^Add on/ })[0];
    // 24px in a compact band (py-1).
    expect(add).toHaveClass("size-6");
    expect(add.closest("[data-group-action]")).toHaveClass("-my-1", "-me-1");
    // An app's own size still wins.
    rerender(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={day(() => {}, "sm")} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("button", { name: /^Add on/ })[0]).toHaveClass("size-8");
  });

  it("keeps the glyph alone at Large, the label its name and tooltip (a compact region)", () => {
    act(() => applyTextSize("large"));
    render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={day(() => {})} />
      </MemoryRouter>,
    );
    const add = screen.getAllByRole("button", { name: /^Add on/ })[0];
    expect(add.querySelector('[data-slot="icon-button-label"]')).toBeNull();
    expect(add).toHaveAccessibleName("Add on 2026-09-30");
  });

  it("sticks with the band and takes no part in the rows' arrow keys", () => {
    render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={day(() => {})} onRowClick={() => {}} />
      </MemoryRouter>,
    );
    const add = screen.getAllByRole("button", { name: /^Add on/ })[0];
    expect(bandOf(add)).toHaveClass("sticky");
    const row = (name: string) => screen.getByText(name).closest("tr") as HTMLElement;
    row("Coop").focus();
    fireEvent.keyDown(row("Coop"), { key: "ArrowDown" });
    expect(row("Salary")).toHaveFocus();
  });

  it("draws nothing for a group whose action returns null, and the end as before", () => {
    const level: DataTableGroupBy<Tx> = {
      key: (r) => r.day,
      end: () => "end",
      action: (k) =>
        k === "2026-09-30" ? (
          <IconButton label="Add" onClick={() => {}}>
            <Plus />
          </IconButton>
        ) : null,
    };
    const { container } = render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={level} />
      </MemoryRouter>,
    );
    const bands = Array.from(container.querySelectorAll<HTMLElement>("th[data-group-band]"));
    expect(bands[0].querySelector("[data-group-action]")).not.toBeNull();
    expect(bands[1].querySelector("[data-group-action]")).toBeNull();
    // Without an action the end slot is the span it always was.
    expect(within(bands[1]).getByText("end")).toHaveClass("ms-auto", "tabular-nums");
  });

  it("is axe-clean", async () => {
    const { container } = render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} groupBy={[PERIOD, day(() => {})]} />
      </MemoryRouter>,
    );
    expect(await axeViolations(container)).toEqual([]);
  });

  it("ends the phone's section header too, when mobileGroupBy is a level", () => {
    stubPhone();
    const onAdd = vi.fn();
    render(
      <MemoryRouter>
        <DataTable rows={TXS} columns={COLUMNS} rowKey={(r) => r.id} mobileGroupBy={day(onAdd)} />
      </MemoryRouter>,
    );
    const add = screen.getByRole("button", { name: "Add on 2026-09-30" });
    const header = add.closest("li")!;
    expect(header).toHaveTextContent("Day 2026-09-30");
    expect(header).toHaveTextContent("2 transactions");
    expect(header).toHaveClass("sticky");
    // 28px in the header's py-1.5, its height kept.
    expect(add).toHaveClass("size-7");
    expect(add.closest("[data-group-action]")).toHaveClass("-my-1.5");
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalledWith("2026-09-30");
  });
});
