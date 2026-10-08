import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";

/**
 * DataTable at Large and Extra large (docs/text-size-harmonization.md §4, §10.8): the
 * phone card's labels above their values, nothing truncating, more room per row;
 * `mobileDetailsInRow` putting the `mobileHidden` columns into the opened row; the
 * `rowActions` column collapsing into a "⋯" menu (RowActions). jsdom has no layout, so
 * the card tests pin the class and structure contract.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

/** A `matchMedia` answering `(min-width)` / `(width <)` for a fixed viewport, as
 *  use-breakpoint-032 does — 390 px is the phone layout at every size. */
function viewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /width\s*<\s*(\d+)px/.exec(query);
    const matches = min ? width >= Number(min[1]) : max ? width < Number(max[1]) : false;
    return { matches, media: query, addEventListener() {}, removeEventListener() {} };
  });
}

interface Row {
  id: number;
  name: string;
  city: string;
  note: string;
}

const ROWS: Row[] = [
  { id: 1, name: "Ada Example", city: "Basel", note: "Prefers the garden view" },
  { id: 2, name: "Ben Sample", city: "Zürich", note: "Second floor" },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, mobilePrimary: true },
  { key: "city", header: "City", cell: (r) => <span className="truncate">{r.city}</span> },
  { key: "note", header: "Note", cell: (r) => r.note, mobileHidden: true },
];

function renderTable(extra: Partial<DataTableProps<Row>> = {}) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} {...extra} />
    </MemoryRouter>,
  );
}

/** A table whose rows open on a tap, the way an app wires it. */
function OpeningTable(extra: Partial<DataTableProps<Row>>) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.id}
        onRowClick={(r) => setOpen((o) => (o === r.id ? null : r.id))}
        isExpanded={(r) => r.id === open}
        {...extra}
      />
    </MemoryRouter>
  );
}

const card = (name: string) => screen.getByText(name).closest('[role="button"], a, li') as HTMLElement;

describe("the phone card at Large (§4)", () => {
  it("keeps the side-by-side grid at Normal", () => {
    viewport(390);
    const { container } = renderTable();
    expect(container.querySelector('[data-card-fields="stacked"]')).toBeNull();
    const dl = container.querySelector("dl")!;
    expect(dl.className).toContain("grid-cols-[auto_1fr]");
  });

  it.each(["large", "xlarge"] as const)("puts each label above its value at %s", (size) => {
    document.documentElement.setAttribute("data-text-size", size);
    viewport(390);
    const { container } = renderTable();
    const stacked = container.querySelectorAll('[data-card-fields="stacked"]');
    expect(stacked).toHaveLength(2);
    const dl = stacked[0] as HTMLElement;
    expect(dl.className).not.toContain("grid-cols-[auto_1fr]");
    // One box per fact: the label, then its value, in reading order.
    const pair = dl.firstElementChild as HTMLElement;
    expect(pair.tagName).toBe("DIV");
    expect(pair.children[0].tagName).toBe("DT");
    expect(pair.children[0]).toHaveTextContent("City");
    expect(pair.children[1].tagName).toBe("DD");
    expect(pair.children[1]).toHaveTextContent("Basel");
    // The hidden column stays off the card.
    expect(within(dl).queryByText("Note")).toBeNull();
  });

  it("lets nothing in the card truncate at Large, and gives the row more room", () => {
    document.documentElement.setAttribute("data-text-size", "large");
    viewport(390);
    renderTable({ onRowClick: () => {} });
    const body = card("Ada Example");
    expect(body.className).toContain("large:py-4");
    const content = screen.getByText("Ada Example").parentElement!;
    expect(content.className).toContain("large:[&_.truncate]:whitespace-normal");
    // The primary line wraps rather than overflowing.
    expect(screen.getByText("Ada Example").className).toContain("break-words");
  });

  it("frames keyboard focus with the kit's focus ring, inset", () => {
    viewport(390);
    renderTable({ onRowClick: () => {} });
    const body = card("Ada Example");
    expect(body.className).toContain("focus-visible:ring-[length:var(--focus-ring-width)]");
    expect(body.className).toContain("focus-visible:ring-inset");
  });
});

describe("mobileDetailsInRow (§4)", () => {
  it("shows the mobileHidden columns in the opened row, label above value", () => {
    viewport(390);
    render(<OpeningTable mobileDetailsInRow />);
    expect(screen.queryByText("Prefers the garden view")).toBeNull();
    const first = card("Ada Example");
    expect(first).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    const value = screen.getByText("Prefers the garden view");
    const pair = value.closest("div")!;
    expect(pair.querySelector("dt")).toHaveTextContent("Note");
    expect(value.tagName).toBe("DD");
  });

  it("puts them before what expandedRow renders", () => {
    viewport(390);
    render(<OpeningTable mobileDetailsInRow expandedRow={(r) => <p>Editor for {r.name}</p>} />);
    fireEvent.click(card("Ada Example"));
    const details = document.querySelector("[data-row-details]")!;
    const fields = within(details as HTMLElement).getByText("Prefers the garden view");
    const editor = within(details as HTMLElement).getByText("Editor for Ada Example");
    expect(fields.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows them in the phone dialog with mobileExpandAsDialog", () => {
    viewport(390);
    render(<OpeningTable mobileDetailsInRow mobileExpandAsDialog />);
    fireEvent.click(card("Ben Sample"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Second floor")).toBeInTheDocument();
    expect(within(dialog).getByText("Note")).toBeInTheDocument();
  });

  it("leaves the opened row alone without it", () => {
    viewport(390);
    render(<OpeningTable expandedRow={(r) => <p>Editor for {r.name}</p>} />);
    fireEvent.click(card("Ada Example"));
    expect(screen.getByText("Editor for Ada Example")).toBeInTheDocument();
    expect(screen.queryByText("Prefers the garden view")).toBeNull();
  });

  it("offers rowActions in the opened row, where the card has only swipes", () => {
    viewport(390);
    const onEdit = vi.fn();
    render(<OpeningTable mobileDetailsInRow rowActions={[{ kind: "edit", onAction: onEdit }]} />);
    expect(document.querySelector("[data-row-details]")).toBeNull();
    fireEvent.click(card("Ada Example"));
    const details = document.querySelector("[data-row-details]") as HTMLElement;
    fireEvent.click(within(details).getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(ROWS[0]);
  });
});

/** The rows' "⋯" buttons — not the column's (disabled) header button of the same name. */
const menuButtons = () => screen.queryAllByRole("button").filter((b) => b.getAttribute("aria-haspopup") === "dialog");

describe("the rowActions column through RowActions (§10.8)", () => {
  const twoActions: DataTableProps<Row>["rowActions"] = [
    { kind: "edit", onAction: vi.fn() },
    { kind: "delete", onAction: vi.fn() },
  ];

  it("is inline icons at Normal", () => {
    renderTable({ rowActions: twoActions });
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
    expect(menuButtons()).toHaveLength(0);
  });

  it("is one ⋯ menu per row at Large, named by rowName, and runs the action", async () => {
    document.documentElement.setAttribute("data-text-size", "large");
    const onDelete = vi.fn();
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    renderTable({
      onRowClick,
      rowName: (r) => r.name,
      rowActions: [
        { kind: "edit", onAction: vi.fn() },
        { kind: "delete", onAction: onDelete },
      ],
    });
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Actions for Ben Sample" }));
    expect(onRowClick).not.toHaveBeenCalled();
    const menu = await screen.findByRole("dialog", { name: "Actions for Ben Sample" });
    await user.click(within(menu).getByRole("button", { name: "Delete" }));
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledWith(ROWS[1]));
  });

  it("names the menu with the table's own `actions` word without rowName", () => {
    document.documentElement.setAttribute("data-text-size", "large");
    renderTable({ rowActions: twoActions, labels: { actions: "Aktionen" } });
    expect(menuButtons().map((b) => b.getAttribute("aria-label"))).toEqual(["Aktionen", "Aktionen"]);
  });

  it("keeps one action inline at Large, its words on the button", () => {
    document.documentElement.setAttribute("data-text-size", "large");
    renderTable({ rowActions: [{ kind: "edit", onAction: vi.fn() }] });
    const [edit] = screen.getAllByRole("button", { name: "Edit" });
    expect(edit).toHaveTextContent("Edit");
  });
});
