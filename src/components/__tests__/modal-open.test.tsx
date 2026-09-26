import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Modal } from "../modal";
import { DialogFrame } from "../dialog-frame";
import { OVERLAY_EXIT_MS } from "../../hooks/use-close-transition";

/**
 * `open` on `Modal` / `DialogFrame` (kastlan 0.9 audit): kastlan's `FormModal` was only an
 * `if (!open) return null` gate, and that gate is exactly what throws away the exit —
 * a close the CALLER decides on unmounts the panel before anything can lower it.
 *
 * With `open`, the component stays mounted, plays the exit on `false`, and holds its
 * focus trap, scroll lock and history entry only while open. Without it, nothing
 * changes — the rest of the modal suites are that half.
 */

const motion = (reduced: boolean) =>
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? reduced : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });

function liveSentinel(): string | null {
  const state = window.history.state as Record<string, unknown> | null;
  const id = state?.["__hbUiOverlayHistory"];
  return typeof id === "string" ? id : null;
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function Harness({ frame = false }: { frame?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {/* A caller-driven close, from outside the dialog — the case the gate lost. */}
      <button type="button" data-testid="outside-close" onClick={() => setOpen(false)}>
        Close from outside
      </button>
      {frame ? (
        <DialogFrame open={open} onClose={() => setOpen(false)} title="Edit">
          <input aria-label="name" />
        </DialogFrame>
      ) : (
        <Modal open={open} onClose={() => setOpen(false)} aria-label="Edit">
          <input aria-label="name" />
          <button type="button" onClick={() => setOpen(false)}>
            Save
          </button>
        </Modal>
      )}
    </>
  );
}

beforeEach(async () => {
  motion(false);
  window.history.replaceState(null, "");
  document.body.style.overflow = "";
  await settle();
});
afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

describe("Modal open", () => {
  it("renders nothing, and holds nothing, while closed", async () => {
    render(<Harness />);
    await settle();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(liveSentinel()).toBeNull();
  });

  it("opens, then on false plays the exit, returns focus and unmounts after OVERLAY_EXIT_MS", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);
    await settle();

    const panel = screen.getByRole("dialog", { name: "Edit" });
    expect(panel).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    expect(liveSentinel()).not.toBeNull();

    // The caller closes it itself — a save, say. Before `open`, this unmounted at once.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const leaving = document.querySelector<HTMLElement>("[aria-modal='true']");
    expect(leaving).not.toBeNull();
    expect(leaving!.className).toContain("animate-sheet-out");
    expect((leaving!.parentElement as HTMLElement).className).toContain("animate-overlay-out");
    // Out of the accessibility tree while it lowers.
    expect(leaving!.parentElement).toHaveAttribute("aria-hidden", "true");
    // Trap, lock and history are released at once, not after the animation.
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(trigger).toHaveFocus();

    await waitFor(() => expect(document.querySelector("[aria-modal='true']")).toBeNull(), {
      timeout: OVERLAY_EXIT_MS * 5,
    });
    for (let i = 0; i < 3; i += 1) await settle();
    expect(liveSentinel()).toBeNull();
  });

  it("returns focus to the trigger when the caller closes it with focus inside", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);
    await settle();
    screen.getByLabelText("name").focus();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(trigger).toHaveFocus();
  });

  it("does not animate a dismissal twice", async () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      const view = render(
        <Modal open onClose={onClose} aria-label="Edit">
          <p>body</p>
        </Modal>,
      );
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(screen.getByRole("dialog").className).toContain("animate-sheet-out");
      act(() => void vi.advanceTimersByTime(OVERLAY_EXIT_MS));
      expect(onClose).toHaveBeenCalledTimes(1);
      // The caller answers the dismissal with `open={false}`: already lowered, so gone
      // now rather than lowered a second time.
      view.rerender(
        <Modal open={false} onClose={onClose} aria-label="Edit">
          <p>body</p>
        </Modal>,
      );
      expect(document.querySelector("[aria-modal='true']")).toBeNull();
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens fresh after a caller-driven close, and cancels an exit on re-open", async () => {
    vi.useFakeTimers();
    try {
      const modal = (open: boolean) => (
        <Modal open={open} onClose={() => {}} aria-label="Edit">
          <p>body</p>
        </Modal>
      );
      const view = render(modal(true));
      view.rerender(modal(false));
      expect(document.querySelector("[aria-modal='true']")!.className).toContain("animate-sheet-out");
      // Re-opened mid-exit: arriving, not leaving.
      view.rerender(modal(true));
      const panel = screen.getByRole("dialog");
      expect(panel.className.split(" ")).toContain("animate-sheet");
      expect(panel.parentElement).not.toHaveAttribute("aria-hidden");
      act(() => void vi.advanceTimersByTime(OVERLAY_EXIT_MS * 2));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("goes at once under reduced motion", () => {
    motion(true);
    const modal = (open: boolean) => (
      <Modal open={open} onClose={() => {}} aria-label="Edit">
        <p>body</p>
      </Modal>
    );
    const view = render(modal(true));
    view.rerender(modal(false));
    expect(document.querySelector("[aria-modal='true']")).toBeNull();
  });

  it("reaches the Modal through DialogFrame", async () => {
    render(<Harness frame />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await settle();
    expect(screen.getByRole("dialog", { name: "Edit" })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("outside-close"));
    expect(document.querySelector("[aria-modal='true']")!.className).toContain("animate-sheet-out");
    await waitFor(() => expect(document.querySelector("[aria-modal='true']")).toBeNull(), {
      timeout: OVERLAY_EXIT_MS * 5,
    });
  });

  it("without open, still mounts open and closes through onClose", async () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} aria-label="Edit">
        <p>body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: OVERLAY_EXIT_MS * 5 });
  });
});
