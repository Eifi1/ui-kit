import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { RowActions, rowActionsColumn, type RowActionList } from "../row-actions";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";

/**
 * RowActions (docs/text-size-harmonization.md §10.8): a dense row's IconButtons are
 * inline icons at Normal and collapse into one "⋯" menu at Large and Extra large, where
 * every label at once would not fit — the roster's `UserRowActionList` pattern, made
 * generic. jsdom has no layout, so these pin the structure and the wiring.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

function setSize(size: "large" | "xlarge") {
  document.documentElement.setAttribute("data-text-size", size);
}

function actions(overrides: Partial<Record<"edit" | "archive" | "remove", () => void>> = {}): RowActionList {
  return [
    { label: "Edit", icon: Pencil, onSelect: overrides.edit ?? vi.fn() },
    { label: "Archive", icon: <Archive />, onSelect: overrides.archive ?? vi.fn() },
    false,
    null,
    { label: "Delete", icon: Trash2, tone: "danger", onSelect: overrides.remove ?? vi.fn() },
  ];
}

describe("RowActions at Normal", () => {
  it("draws each action as an inline icon named by its label, leaving out false and null", () => {
    render(<RowActions actions={actions()} name="Ada Example" />);
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Edit",
      "Archive",
      "Delete",
    ]);
    // The icons stay icons: no label drawn as text.
    expect(document.querySelector('[data-slot="icon-button-label"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Actions for/ })).toBeNull();
  });

  it("leaves out a hidden action and renders nothing for none", () => {
    const { container, rerender } = render(
      <RowActions actions={[{ label: "Edit", icon: Pencil, onSelect: vi.fn(), hidden: true }]} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<RowActions actions={[{ label: "Edit", icon: Pencil, onSelect: vi.fn() }, { label: "Copy", onSelect: vi.fn() }]} />);
    // An action without an icon is a small text button.
    expect(screen.getByRole("button", { name: "Copy" })).toHaveTextContent("Copy");
  });

  it("runs an action and keeps the click from the row", () => {
    const edit = vi.fn();
    const onRow = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a clickable row stand-in
      <div onClick={onRow}>
        <RowActions actions={actions({ edit })} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(edit).toHaveBeenCalledTimes(1);
    expect(onRow).not.toHaveBeenCalled();
  });

  it("keeps a locked inline action's reason in the tooltip, not a line (a row has no room)", () => {
    render(
      <RowActions
        actions={[{ label: "Delete", icon: Trash2, onSelect: vi.fn(), disabledReason: "Has bookings" }]}
      />,
    );
    const del = screen.getByRole("button", { name: "Delete" });
    expect(del).toHaveAttribute("aria-disabled", "true");
    expect(document.querySelector('[data-slot="disabled-reason"]')).toBeNull();
    expect(del).toHaveAccessibleDescription("Has bookings");
  });
});

describe("RowActions at Large (§10.8)", () => {
  it.each(["large", "xlarge"] as const)("collapses two or more into one ⋯ menu at %s", async (size) => {
    setSize(size);
    const remove = vi.fn();
    const user = userEvent.setup();
    render(<RowActions actions={actions({ remove })} name="Ada Example" />);
    const trigger = screen.getByRole("button", { name: "Actions for Ada Example" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    // The ⋯ glyph stays a glyph: "more actions" is read by everyone.
    expect(trigger.querySelector('[data-slot="icon-button-label"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();

    await user.click(trigger);
    const menu = await screen.findByRole("dialog", { name: "Actions for Ada Example" });
    expect(within(menu).getAllByRole("button").map((b) => b.textContent)).toEqual(["Edit", "Archive", "Delete"]);
    await user.click(within(menu).getByRole("button", { name: "Delete" }));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("names the button \"Actions\" without a row name", () => {
    setSize("large");
    render(<RowActions actions={actions()} />);
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
  });

  it("keeps a single action inline, its label drawn as text", () => {
    setSize("large");
    render(<RowActions actions={[{ label: "Edit", icon: Pencil, onSelect: vi.fn() }]} name="Ada" />);
    const edit = screen.getByRole("button", { name: "Edit" });
    expect(edit).toHaveTextContent("Edit");
    expect(screen.queryByRole("button", { name: "Actions for Ada" })).toBeNull();
  });

  it("lists a locked action in the menu, with its reason as a line under it", async () => {
    setSize("large");
    const user = userEvent.setup();
    const remove = vi.fn();
    render(
      <RowActions
        name="Ada"
        actions={[
          { label: "Edit", icon: Pencil, onSelect: vi.fn() },
          { label: "Delete", icon: Trash2, onSelect: remove, disabledReason: "Has bookings" },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Ada" }));
    const menu = await screen.findByRole("dialog", { name: "Actions for Ada" });
    const del = within(menu).getByRole("button", { name: "Delete" });
    expect(del).toHaveAttribute("aria-disabled", "true");
    expect(del).toHaveAccessibleDescription("Has bookings");
    // At Large the reason is in the layout (§4 "No fact only in a tooltip").
    expect(within(menu).getByText("Has bookings")).toBeVisible();
    await user.click(del);
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps the ⋯ click from the row", () => {
    setSize("large");
    const onRow = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a clickable row stand-in
      <div onClick={onRow}>
        <RowActions actions={actions()} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(onRow).not.toHaveBeenCalled();
  });
});

describe("RowActions collapse", () => {
  it("\"menu\" is the menu at Normal too (the roster's choice)", () => {
    render(<RowActions actions={actions()} name="Ada" collapse="menu" />);
    expect(screen.getByRole("button", { name: "Actions for Ada" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  it("\"menu\" is the menu even for a single action", () => {
    render(<RowActions actions={[{ label: "Edit", icon: Pencil, onSelect: vi.fn() }]} collapse="menu" />);
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
  });

  it("\"inline\" keeps the icons at Large, each showing its words", () => {
    setSize("large");
    render(<RowActions actions={actions()} collapse="inline" />);
    expect(screen.queryByRole("button", { name: "Actions" })).toBeNull();
    expect(screen.getByRole("button", { name: "Edit" })).toHaveTextContent("Edit");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveTextContent("Delete");
  });

  it("takes the menu's words from `labels`", () => {
    setSize("large");
    render(<RowActions actions={actions()} name="Ada" labels={{ actionsFor: (n) => `Aktionen für ${n}` }} />);
    expect(screen.getByRole("button", { name: "Aktionen für Ada" })).toBeInTheDocument();
  });
});

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
];
const NAME: DataTableColumn<Row> = { key: "name", header: "Name", cell: (r) => r.name };

describe("rowActionsColumn", () => {
  it("is an action column in one line: hidden header, no row link, hugging the end", () => {
    const col = rowActionsColumn<Row>({ actions: () => actions(), name: (r) => r.name, headerText: "Aktionen" });
    expect(col.key).toBe("actions");
    expect(col.noRowLink).toBe(true);
    expect(col.headerText).toBe("Aktionen");
    expect(col.className).toContain("w-px");
    expect(col.className).toContain("text-end");
    render(
      <MemoryRouter>
        <DataTable rows={ROWS} columns={[NAME, col]} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );
    // The header is there for a screen reader only.
    const head = screen.getAllByRole("columnheader")[1];
    expect(within(head).getByText("Aktionen")).toHaveClass("sr-only");
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);
  });

  it("collapses per row at Large, each menu named by the row", () => {
    setSize("large");
    render(
      <MemoryRouter>
        <DataTable
          rows={ROWS}
          columns={[NAME, rowActionsColumn<Row>({ actions: () => actions(), name: (r) => r.name })]}
          rowKey={(r) => r.id}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Actions for Alpha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actions for Bravo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  it("takes the column's other fields last", () => {
    const col = rowActionsColumn<Row>({ key: "ops", actions: () => [], column: { mobileHidden: true } });
    expect(col.key).toBe("ops");
    expect(col.mobileHidden).toBe(true);
  });
});
