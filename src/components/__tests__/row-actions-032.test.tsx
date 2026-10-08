import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Archive, Pencil, Trash2 } from "lucide-react";
import { RowActions, rowActionsColumn, type RowActionList } from "../row-actions";
import { DataTable } from "../data-table";
import type { DataTableColumn } from "../data-table";
import { WriteLockProvider } from "../write-lock";

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

describe("RowActions — commit, pending, disabled (an admin panel's row, 0.32)", () => {
  /** InvitationsPanel's shape: resend and revoke, each a commit, one in flight. */
  function flight(onResend = vi.fn(), onRevoke = vi.fn()): RowActionList {
    return [
      { key: "resend", label: "Resend", icon: Pencil, commit: true, pending: true, disabled: true, onSelect: onResend },
      { key: "revoke", label: "Revoke", icon: Trash2, tone: "danger", commit: true, disabled: true, onSelect: onRevoke },
    ];
  }

  it("inline: the one in flight is busy, the rest disabled, and neither runs", () => {
    const onResend = vi.fn();
    const onRevoke = vi.fn();
    render(<RowActions actions={flight(onResend, onRevoke)} name="ada@example.com" />);
    const resend = screen.getByRole("button", { name: "Resend" });
    expect(resend).toHaveAttribute("aria-busy", "true");
    // Pending keeps its focus: `aria-disabled`, not `disabled`.
    expect(resend).not.toBeDisabled();
    fireEvent.click(resend);
    expect(onResend).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeDisabled();
  });

  it("collapsed: the ⋯ button is busy while one is in flight, and opens no menu", () => {
    setSize("large");
    render(<RowActions actions={flight()} name="ada@example.com" />);
    const trigger = screen.getByRole("button", { name: "Actions for ada@example.com" });
    expect(trigger).toHaveAttribute("aria-busy", "true");
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("commit: under a locked provider each is refused with the lock's reason, inline and in the menu", async () => {
    const onResend = vi.fn();
    const both: RowActionList = [
      { label: "Resend", icon: Pencil, commit: true, onSelect: onResend },
      { label: "Revoke", icon: Trash2, commit: true, onSelect: vi.fn() },
    ];
    const { unmount } = render(
      <WriteLockProvider locked reason="Read-only demo.">
        <RowActions actions={both} />
      </WriteLockProvider>,
    );
    const inline = screen.getByRole("button", { name: "Resend" });
    expect(inline).toHaveAttribute("aria-disabled", "true");
    expect(inline).toHaveAccessibleDescription("Read-only demo.");
    fireEvent.click(inline);
    expect(onResend).not.toHaveBeenCalled();
    unmount();

    setSize("large");
    const user = userEvent.setup();
    render(
      <WriteLockProvider locked reason="Read-only demo.">
        <RowActions actions={both} name="Ada" />
      </WriteLockProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Ada" }));
    const menu = await screen.findByRole("dialog", { name: "Actions for Ada" });
    const entry = within(menu).getByRole("button", { name: "Resend" });
    expect(entry).toHaveAttribute("aria-disabled", "true");
    expect(entry).toHaveAccessibleDescription("Read-only demo.");
    await user.click(entry);
    expect(onResend).not.toHaveBeenCalled();
  });

  it("an unlocked commit and no flight change nothing", async () => {
    setSize("large");
    const user = userEvent.setup();
    const onResend = vi.fn();
    render(
      <RowActions
        name="Ada"
        actions={[
          { label: "Resend", icon: Pencil, commit: true, pending: false, disabled: false, onSelect: onResend },
          { label: "Revoke", icon: Trash2, commit: true, onSelect: vi.fn() },
        ]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Actions for Ada" });
    expect(trigger).not.toHaveAttribute("aria-busy", "true");
    await user.click(trigger);
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Resend" }));
    expect(onResend).toHaveBeenCalledTimes(1);
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

describe("RowActions — an action that navigates (href, 0.32.1)", () => {
  const linkActions = (onEdit = vi.fn()): RowActionList => [
    { label: "Edit", icon: Pencil, href: "/leases/7/edit", onSelect: onEdit },
    { label: "Write to the tenant", href: "mailto:ada@example.com" },
    { label: "Delete", icon: Trash2, tone: "danger", onSelect: vi.fn() },
  ];

  it("is a link inline, icon or words, and onSelect still runs", () => {
    const onEdit = vi.fn();
    const onRow = vi.fn();
    render(
      <MemoryRouter>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a clickable row stand-in */}
        <div onClick={onRow}>
          <RowActions actions={linkActions(onEdit)} name="Ada Example" />
        </div>
      </MemoryRouter>,
    );
    const edit = screen.getByRole("link", { name: "Edit" });
    expect(edit).toHaveAttribute("href", "/leases/7/edit");
    expect(screen.getByRole("link", { name: "Write to the tenant" })).toHaveAttribute("href", "mailto:ada@example.com");
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    fireEvent.click(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
    // The row doesn't open as well.
    expect(onRow).not.toHaveBeenCalled();
  });

  it("is a link in the ⋯ menu at Large", async () => {
    setSize("large");
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RowActions actions={linkActions()} name="Ada Example" />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Ada Example" }));
    const menu = await screen.findByRole("dialog", { name: "Actions for Ada Example" });
    expect(within(menu).getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/leases/7/edit");
    expect(within(menu).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("stays a button while refused or pending, since a link can't say why", () => {
    render(
      <MemoryRouter>
        <WriteLockProvider locked reason="Your plan has ended.">
          <RowActions
            actions={[
              { label: "Edit", icon: Pencil, href: "/a", commit: true },
              { label: "Open", icon: Archive, href: "/b", disabledReason: "Archived." },
              { label: "Copy", icon: Trash2, href: "/c", pending: true },
            ]}
          />
        </WriteLockProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Edit", "Open", "Copy"]);
  });
});

describe("RowActions — a row name that is null (0.32.1)", () => {
  it("reads null as no name, here and in rowActionsColumn", () => {
    setSize("large");
    render(
      <MemoryRouter>
        <RowActions actions={actions()} name={null} />
        <DataTable
          rows={ROWS}
          columns={[NAME, rowActionsColumn<Row>({ actions: () => actions(), name: () => null })]}
          rowKey={(r) => r.id}
        />
      </MemoryRouter>,
    );
    // The lone RowActions and every row's menu are "Actions", never "Actions for null".
    expect(screen.getAllByRole("button", { name: "Actions" }).length).toBeGreaterThanOrEqual(1 + ROWS.length);
    expect(screen.queryByRole("button", { name: /Actions for/ })).toBeNull();
  });
});

describe("RowActions — the menu keeps its clicks from the row (0.32.1)", () => {
  it("stops a menu entry's click and Enter at the panel; Escape still closes", async () => {
    setSize("large");
    const onRow = vi.fn();
    const onRowKey = vi.fn();
    const remove = vi.fn();
    const user = userEvent.setup();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a clickable row stand-in
      <div onClick={onRow} onKeyDown={onRowKey}>
        <RowActions actions={actions({ remove })} name="Ada Example" />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Ada Example" }));
    const menu = await screen.findByRole("dialog", { name: "Actions for Ada Example" });
    fireEvent.keyDown(within(menu).getByRole("button", { name: "Edit" }), { key: "Enter" });
    await user.click(within(menu).getByRole("button", { name: "Delete" }));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(onRow).not.toHaveBeenCalled();
    expect(onRowKey).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Actions for Ada Example" }));
    const again = await screen.findByRole("dialog", { name: "Actions for Ada Example" });
    await user.keyboard("{Escape}");
    expect(again).not.toBeInTheDocument();
    expect(onRow).not.toHaveBeenCalled();
  });

  it("keeps a DataTable's onRowClick out of the menu", async () => {
    setSize("large");
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DataTable
          rows={ROWS}
          columns={[NAME, rowActionsColumn<Row>({ actions: () => actions(), name: (r) => r.name })]}
          rowKey={(r) => r.id}
          onRowClick={onRowClick}
        />
      </MemoryRouter>,
    );
    await user.click(screen.getAllByRole("button", { name: "Actions for Alpha" })[0]);
    const menu = await screen.findByRole("dialog", { name: "Actions for Alpha" });
    await user.click(within(menu).getByRole("button", { name: "Archive" }));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
