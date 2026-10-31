import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Pencil, Trash2 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { RowActions } from "../row-actions";
import { HoverMenu } from "../hover-menu";
import { Modal } from "../modal";

/**
 * A menu item that closes its menu and opens a dialog in one handler hands focus back
 * to the menu's trigger once the dialog is answered (refactor audit 2026-10-30, INP-2).
 *
 * The dialog's focus trap records where focus was during the render that mounts it. The
 * menu's `close` only set state, so that was the menu item — which the same commit then
 * removed, and the trap restores only to a node still in the page. Focus fell to <body>:
 * a keyboard user deleting a row from its "⋯" menu was thrown to the top of the document,
 * in all three apps' tables.
 */

const moreButton = () => screen.getByRole("button", { name: "Actions for Ada Example" });

/** "⋯" from the keyboard: focused, pressed, and the menu's "Delete" taken. */
async function openDelete() {
  const more = moreButton();
  act(() => more.focus());
  fireEvent.click(more);
  const del = await screen.findByRole("button", { name: "Delete" });
  act(() => del.focus());
  fireEvent.click(del);
  return screen.findByRole("alertdialog");
}

function Row({ onDelete }: { onDelete: () => void }) {
  return (
    <div>
      <button type="button">Before</button>
      <RowActions
        actions={[
          { label: "Edit", icon: Pencil, onSelect: () => {} },
          { label: "Delete", icon: Trash2, tone: "danger" as const, onSelect: onDelete },
        ]}
        name="Ada Example"
      />
    </div>
  );
}

describe("a row's danger confirm returns focus to its ⋯", () => {
  it("after Cancel", async () => {
    const onDelete = vi.fn();
    render(<Row onDelete={onDelete} />);
    const dialog = await openDelete();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(moreButton());
  });

  it("after a confirm whose row stays", async () => {
    const onDelete = vi.fn();
    render(<Row onDelete={onDelete} />);
    const dialog = await openDelete();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(document.activeElement).toBe(moreButton());
  });
});

describe("HoverMenu's close hands focus back to its trigger", () => {
  function Host() {
    const [renaming, setRenaming] = useState(false);
    return (
      <>
        <HoverMenu
          aria-label="Gear"
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle}>
              Gear
            </button>
          )}
        >
          {(close) => (
            <ul>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setRenaming(true);
                  }}
                >
                  Rename
                </button>
              </li>
              <li>
                <button type="button" onClick={close}>
                  Hide
                </button>
              </li>
            </ul>
          )}
        </HoverMenu>
        {renaming && (
          <Modal title="Rename" onClose={() => setRenaming(false)}>
            <button type="button" onClick={() => setRenaming(false)}>
              Done
            </button>
          </Modal>
        )}
      </>
    );
  }

  it("so a dialog an item opens gives focus back to the trigger, not <body>", async () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Gear" });
    act(() => trigger.focus());
    // A keyboard open: Enter on the trigger, then the click the browser makes of it.
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    const rename = screen.getByRole("menuitem", { name: "Rename" });
    expect(rename).toHaveFocus();
    fireEvent.click(rename);
    const dialog = await screen.findByRole("dialog", { name: "Rename" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves focus alone when it was not in the menu", () => {
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Gear" });
    const outside = document.createElement("input");
    document.body.append(outside);
    try {
      fireEvent.click(trigger);
      act(() => outside.focus());
      // A pointer that never moved focus into the menu: the item's close must not pull
      // the caret out of the field the user is typing in.
      fireEvent.click(screen.getByRole("menuitem", { name: "Hide" }));
      expect(screen.queryByRole("menu")).toBeNull();
      expect(document.activeElement).toBe(outside);
    } finally {
      outside.remove();
    }
  });
});
