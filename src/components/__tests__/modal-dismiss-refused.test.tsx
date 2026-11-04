import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Modal } from "../modal";
import { DialogFrame } from "../dialog-frame";
import { useDismissLayer } from "../../hooks/use-dismiss";
import { drainTasks, pressBack } from "../../test/tasks";
import { stubDesktop } from "../../test/viewport";

/**
 * `onDismissRefused` (0.54 follow-up): `busy` and `held` refuse every dismissal before
 * `onClose`, silently. keksdose's recovery-code dialog (auth/recovery-code-pane.tsx)
 * showed a "why won't it close" banner from its own refusing `onClose`, and adopting
 * `held` lost it: the app no longer heard the press. Now it hears which one.
 */

function liveSentinel(): string | null {
  const state = window.history.state as Record<string, unknown> | null;
  const id = state?.["__hbUiOverlayHistory"];
  return typeof id === "string" ? id : null;
}

function pressBackdrop(panel: HTMLElement) {
  const backdrop = panel.parentElement as HTMLElement;
  fireEvent.mouseDown(backdrop);
  fireEvent.mouseUp(backdrop);
}

/** An Escape layer opened over the dialog, in a later commit (the order a press gives). */
function Above({ onEscape }: { onEscape: () => void }) {
  useDismissLayer(true, onEscape);
  return null;
}

beforeEach(async () => {
  window.history.replaceState(null, "", "/refused");
  await drainTasks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Modal onDismissRefused", () => {
  it('says "backdrop" for a refused backdrop press, once per press', () => {
    stubDesktop({ reducedMotion: false });
    const onClose = vi.fn();
    const refused = vi.fn();
    render(
      <Modal held onClose={onClose} onDismissRefused={refused} aria-label="Recovery code">
        <p>body</p>
      </Modal>,
    );
    const panel = screen.getByRole("dialog", { name: "Recovery code" });
    pressBackdrop(panel);
    expect(refused).toHaveBeenCalledTimes(1);
    expect(refused).toHaveBeenLastCalledWith("backdrop");
    pressBackdrop(panel);
    expect(refused).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();
    // A press that starts in the panel and ends on the backdrop is no dismissal at all.
    fireEvent.mouseDown(panel);
    fireEvent.mouseUp(panel.parentElement as HTMLElement);
    expect(refused).toHaveBeenCalledTimes(2);
  });

  it('says "escape" for an Escape the dialog\'s own layer takes, not for one a layer above or the owner takes', () => {
    const onClose = vi.fn();
    const refused = vi.fn();
    const above = vi.fn();
    const view = (withAbove: boolean, claim = false) => (
      <Modal
        busy
        onClose={onClose}
        onDismissRefused={refused}
        aria-label="Pay"
        onKeyDown={claim ? (e) => e.key === "Escape" && e.preventDefault() : undefined}
      >
        {withAbove && <Above onEscape={above} />}
      </Modal>
    );
    const { rerender } = render(view(false));
    rerender(view(true));
    const panel = screen.getByRole("dialog", { name: "Pay" });

    fireEvent.keyDown(panel, { key: "Escape" });
    expect(above).toHaveBeenCalledTimes(1);
    expect(refused).not.toHaveBeenCalled();

    rerender(view(false));
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(refused).toHaveBeenCalledTimes(1);
    expect(refused).toHaveBeenLastCalledWith("escape");

    // The owner's claim (a `preventDefault()` in `onKeyDown`) keeps the dialog open: no
    // dismissal was asked for, so none was refused.
    rerender(view(false, true));
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(refused).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says "back" for every Back it holds, after the entry is put back', async () => {
    const onClose = vi.fn();
    const seen: (string | null)[] = [];
    const refused = vi.fn(() => seen.push(liveSentinel()));
    render(
      <Modal held onClose={onClose} onDismissRefused={refused} aria-label="Recovery code">
        <p>body</p>
      </Modal>,
    );
    const entry = liveSentinel();
    for (let press = 1; press <= 2; press += 1) {
      await pressBack();
      await drainTasks();
      expect(refused).toHaveBeenCalledTimes(press);
      expect(refused).toHaveBeenLastCalledWith("back");
    }
    // Told once the dialog stands on its own entry again: a Back the app answers with a
    // banner is not the Back that leaves the page.
    expect(seen).toEqual([entry, entry]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says "close" for the frame\'s X under busy and for an actions(close) under held', () => {
    const refused = vi.fn();
    const onClose = vi.fn();
    const view = (hold: "busy" | "held") => (
      <DialogFrame
        busy={hold === "busy"}
        held={hold === "held"}
        closeButton
        title="Pay"
        onClose={onClose}
        onDismissRefused={refused}
        actions={(close) => (
          <button type="button" onClick={close}>
            Cancel
          </button>
        )}
      >
        <p>body</p>
      </DialogFrame>
    );
    const { rerender } = render(view("busy"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(refused).toHaveBeenCalledTimes(1);
    expect(refused).toHaveBeenLastCalledWith("close");

    rerender(view("held"));
    // Held, the X is disabled: no press, so nothing to refuse.
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(refused).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(refused).toHaveBeenCalledTimes(2);
    expect(refused).toHaveBeenLastCalledWith("close");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("is not called for a dismissal that goes through, nor for the caller's own close", async () => {
    const refused = vi.fn();
    function Page() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Modal open={open} onClose={() => setOpen(false)} onDismissRefused={refused} aria-label="Edit">
            <button type="button" onClick={() => setOpen(false)}>
              Done
            </button>
          </Modal>
        </>
      );
    }
    render(<Page />);
    pressBackdrop(screen.getByRole("dialog", { name: "Edit" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Edit" }), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(refused).not.toHaveBeenCalled();
  });

  it("is not called for a press while the caller's own close is lowering a held dialog", () => {
    stubDesktop({ reducedMotion: false });
    const refused = vi.fn();
    const view = (open: boolean) => (
      <DialogFrame
        open={open}
        held
        title="Recovery code"
        onClose={() => {}}
        onDismissRefused={refused}
        actions={(close) => (
          <button type="button" onClick={close}>
            Cancel
          </button>
        )}
      />
    );
    const { rerender } = render(view(true));
    rerender(view(false));
    // On its way out (aria-hidden, so not by role): the dialog is closing, not refusing.
    fireEvent.click(screen.getByText("Cancel"));
    pressBackdrop(screen.getByText("Recovery code").closest("[aria-modal]") as HTMLElement);
    expect(refused).not.toHaveBeenCalled();
  });
});
