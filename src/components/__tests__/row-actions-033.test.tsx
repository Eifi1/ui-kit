import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Calculator, EyeOff, FolderOpen, Share2, Trash2 } from "lucide-react";
import { RowActions, rowActionsColumn, type RowActionList } from "../row-actions";
import { COMMIT_EXCEPT_BILLING, WriteLockProvider } from "../write-lock";

/**
 * A row action carries its state (docs/text-size-harmonization.md §10.16, §10.18):
 * keksdose kept hand-rolled IconButtons at Normal on three rows because a RowAction
 * could not say "on", "open", a tone other than danger, or a tour anchor. jsdom has no
 * layout, so these pin the attributes and the wiring, at both sizes.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
});

const openMenu = async (name = "Actions for Household") => {
  fireEvent.click(screen.getByRole("button", { name }));
  return screen.findByRole("dialog", { name });
};

describe("RowAction pressed — a toggle", () => {
  const actions = (pressed: boolean): RowActionList => [
    { label: "Share budget", icon: Share2, onSelect: vi.fn(), pressed },
    { label: "Delete", icon: Trash2, onSelect: vi.fn(), tone: "danger" },
  ];

  it("inline: aria-pressed and IconButton's on look, the same label in both states", () => {
    const { rerender } = render(<RowActions actions={actions(true)} name="Household" />);
    const share = screen.getByRole("button", { name: "Share budget" });
    expect(share).toHaveAttribute("aria-pressed", "true");
    expect(share.className).toContain("bg-[var(--brand-bg)]");
    rerender(<RowActions actions={actions(false)} name="Household" />);
    expect(screen.getByRole("button", { name: "Share budget" })).toHaveAttribute("aria-pressed", "false");
    // An action that is no toggle says nothing about pressing.
    expect(screen.getByRole("button", { name: "Delete" })).not.toHaveAttribute("aria-pressed");
  });

  it("in the menu: aria-pressed on the entry", async () => {
    render(<RowActions actions={actions(true)} name="Household" collapse="menu" />);
    const menu = await openMenu();
    expect(within(menu).getByRole("button", { name: "Share budget" })).toHaveAttribute("aria-pressed", "true");
    expect(within(menu).getByRole("button", { name: "Delete" })).not.toHaveAttribute("aria-pressed");
  });
});

describe("RowAction expanded / controls — a disclosure", () => {
  const actions: RowActionList = [
    { label: "Share budget", icon: Share2, onSelect: vi.fn(), expanded: true, controls: "share-card-7" },
    { label: "Add category", onSelect: vi.fn(), expanded: false, controls: "add-row-7" },
  ];

  it("inline: aria-expanded and aria-controls, on an icon and on a text button", () => {
    render(<RowActions actions={actions} name="Household" />);
    const share = screen.getByRole("button", { name: "Share budget" });
    expect(share).toHaveAttribute("aria-expanded", "true");
    expect(share).toHaveAttribute("aria-controls", "share-card-7");
    expect(share).not.toHaveAttribute("aria-pressed");
    const add = screen.getByRole("button", { name: "Add category" });
    expect(add).toHaveAttribute("aria-expanded", "false");
    expect(add).toHaveAttribute("aria-controls", "add-row-7");
  });

  it("in the menu at Large: the same on each entry", async () => {
    document.documentElement.setAttribute("data-text-size", "large");
    render(<RowActions actions={actions} name="Household" />);
    const menu = await openMenu();
    expect(within(menu).getByRole("button", { name: "Share budget" })).toHaveAttribute("aria-expanded", "true");
    expect(within(menu).getByRole("button", { name: "Share budget" })).toHaveAttribute("aria-controls", "share-card-7");
    expect(within(menu).getByRole("button", { name: "Add category" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("RowAction tones", () => {
  const actions: RowActionList = [
    { label: "Open", icon: FolderOpen, onSelect: vi.fn(), tone: "muted" },
    { label: "Reconcile", icon: Calculator, onSelect: vi.fn(), tone: "info" },
    { label: "Hide", icon: EyeOff, onSelect: vi.fn(), tone: "warning" },
    { label: "Delete", icon: Trash2, onSelect: vi.fn(), tone: "danger" },
    { label: "Edit", icon: Share2, onSelect: vi.fn() },
  ];

  it("inline: IconButton's tone, named in data-tone", () => {
    render(<RowActions actions={actions} name="Household" />);
    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("data-tone", "muted");
    const reconcile = screen.getByRole("button", { name: "Reconcile" });
    expect(reconcile).toHaveAttribute("data-tone", "info");
    // IconButton's toned look: the glyph in the tone's colour at rest.
    expect(reconcile.className).toMatch(/(^|\s)text-(info|\[var\(--info\)\])(\s|$)/);
    const hide = screen.getByRole("button", { name: "Hide" });
    expect(hide).toHaveAttribute("data-tone", "warning");
    expect(hide.className).toMatch(/(^|\s)text-(warning|\[var\(--warning\)\])(\s|$)/);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("data-tone", "danger");
    expect(screen.getByRole("button", { name: "Edit" })).not.toHaveAttribute("data-tone");
  });

  it("in the menu: the glyph takes info and warning, the words keep the text colour; danger keeps its danger text", async () => {
    render(<RowActions actions={actions} name="Household" collapse="menu" />);
    const menu = await openMenu();
    const glyphOf = (name: string) => within(menu).getByRole("button", { name }).querySelector("span[aria-hidden]")!;
    expect(glyphOf("Reconcile").className.split(" ")).toContain("text-info");
    expect(glyphOf("Hide").className.split(" ")).toContain("text-warning");
    expect(within(menu).getByRole("button", { name: "Reconcile" }).className).not.toMatch(/info/);
    // `muted` and `default` look the same in a menu.
    expect(glyphOf("Open").className).toBe(glyphOf("Edit").className);
    expect(within(menu).getByRole("button", { name: "Open" }).className).toBe(
      within(menu).getByRole("button", { name: "Edit" }).className,
    );
    expect(within(menu).getByRole("button", { name: "Delete" }).className).toMatch(/hover:text-(danger|\[var\(--danger\)\])/);
  });
});

describe("RowAction dataTour — one element per action at a time (§10.18)", () => {
  it("inline: on the action's own control — the IconButton, the text button, the link", () => {
    render(
      <MemoryRouter>
        <RowActions
          name="Savings"
          collapse="inline"
          actions={[
            { label: "Reconcile", icon: Calculator, onSelect: vi.fn(), dataTour: "account-reconcile" },
            { label: "Copy", onSelect: vi.fn(), dataTour: "account-copy" },
            { label: "Open", icon: FolderOpen, href: "/accounts/7", dataTour: "account-open" },
          ]}
        />
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-tour="account-reconcile"]')).toBe(
      screen.getByRole("button", { name: "Reconcile" }),
    );
    expect(document.querySelector('[data-tour="account-copy"]')).toBe(screen.getByRole("button", { name: "Copy" }));
    expect(document.querySelector('[data-tour="account-open"]')).toBe(screen.getByRole("link", { name: "Open" }));
  });

  it("collapsed: an overlay per anchored action in the ⋯ box, and nothing in the open menu", async () => {
    document.documentElement.setAttribute("data-text-size", "large");
    const user = userEvent.setup();
    const reconcile = vi.fn();
    render(
      <RowActions
        name="Savings"
        actions={[
          { label: "Reconcile", icon: Calculator, onSelect: reconcile, tone: "info", dataTour: "account-reconcile" },
          { label: "Hide", icon: EyeOff, onSelect: vi.fn(), dataTour: "account-hide" },
          { label: "Delete", icon: Trash2, onSelect: vi.fn(), tone: "danger" },
        ]}
      />,
    );
    const more = screen.getByRole("button", { name: "Actions for Savings" });
    for (const anchor of ["account-reconcile", "account-hide"]) {
      const box = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)!;
      expect(box.tagName).toBe("SPAN");
      expect(box).toHaveAttribute("aria-hidden", "true");
      expect(box.className).toContain("pointer-events-none");
      expect(box.className).toContain("absolute");
      expect(box.className).toContain("inset-0");
      expect(box.closest('[data-slot="row-actions"]')).toContainElement(more);
    }
    // Not on the ⋯ button itself.
    expect(more).not.toHaveAttribute("data-tour");
    await user.click(more);
    const menu = await screen.findByRole("dialog", { name: "Actions for Savings" });
    expect(menu.querySelector("[data-tour]")).toBeNull();
    // The selector still matches once, and the button behind it still opens the menu.
    expect(document.querySelectorAll('[data-tour="account-reconcile"]')).toHaveLength(1);
    await user.click(within(menu).getByRole("button", { name: "Reconcile" }));
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it("the ⋯ box takes className, as the inline strip does", () => {
    render(
      <RowActions
        name="Savings"
        collapse="menu"
        className="ms-auto"
        actions={[{ label: "Hide", icon: EyeOff, onSelect: vi.fn() }]}
      />,
    );
    const box = screen.getByRole("button", { name: "Actions for Savings" }).closest('[data-slot="row-actions"]')!;
    expect(box.className).toContain("ms-auto");
    expect(box.className).toContain("relative");
  });
});

describe("RowActions glyphSize and tooltipSide", () => {
  it("reach each inline IconButton", () => {
    render(
      <RowActions
        name="Groceries"
        glyphSize={14}
        tooltipSide="start"
        actions={[{ label: "Add category", icon: Share2, onSelect: vi.fn() }]}
      />,
    );
    const add = screen.getByRole("button", { name: "Add category" });
    expect(add.className.split(" ")).toContain("[&_svg]:size-3.5");
    fireEvent.mouseEnter(add.parentElement!);
    expect(screen.getByRole("tooltip").className).toContain("end-full");
  });

  it("pass through rowActionsColumn", () => {
    const col = rowActionsColumn<{ id: number }>({
      actions: () => [{ label: "Add category", icon: Share2, onSelect: vi.fn() }],
      glyphSize: 14,
      tooltipSide: "start",
    });
    render(<>{col.cell({ id: 1 })}</>);
    const add = screen.getByRole("button", { name: "Add category" });
    expect(add.className.split(" ")).toContain("[&_svg]:size-3.5");
    fireEvent.mouseEnter(add.parentElement!);
    expect(screen.getByRole("tooltip").className).toContain("end-full");
  });
});

describe("RowAction commit: COMMIT_EXCEPT_BILLING (billing §12.36)", () => {
  const PLAN = "Your plan has ended.";
  const DEMO = "Not possible in the demo.";

  it("stays live under a billing lock, inline and in the menu", async () => {
    const remove = vi.fn();
    const { unmount } = render(
      <WriteLockProvider locked kind="billing" reason={PLAN}>
        <RowActions name="Ada" actions={[{ label: "Remove", icon: Trash2, onSelect: remove, commit: COMMIT_EXCEPT_BILLING }]} />
      </WriteLockProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(remove).toHaveBeenCalledTimes(1);
    unmount();
    render(
      <WriteLockProvider locked kind="billing" reason={PLAN}>
        <RowActions
          name="Ada"
          collapse="menu"
          actions={[{ label: "Remove", icon: Trash2, onSelect: remove, commit: COMMIT_EXCEPT_BILLING }]}
        />
      </WriteLockProvider>,
    );
    const menu = await openMenu("Actions for Ada");
    const entry = within(menu).getByRole("button", { name: "Remove" });
    expect(entry).not.toHaveAttribute("aria-disabled");
    fireEvent.click(entry);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("is refused with the demo's reason under a demo lock beside it", () => {
    const remove = vi.fn();
    render(
      <WriteLockProvider
        locked
        holds={[
          { kind: "demo", reason: DEMO },
          { kind: "billing", reason: PLAN },
        ]}
      >
        <RowActions name="Ada" actions={[{ label: "Remove", icon: Trash2, onSelect: remove, commit: COMMIT_EXCEPT_BILLING }]} />
      </WriteLockProvider>,
    );
    const button = screen.getByRole("button", { name: "Remove" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleDescription(DEMO);
    fireEvent.click(button);
    expect(remove).not.toHaveBeenCalled();
  });
});
