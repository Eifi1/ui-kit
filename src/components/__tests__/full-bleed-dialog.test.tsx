import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { FullBleedDialog } from "../full-bleed-dialog";

/**
 * The phone's full-screen dialog, extracted from `data-table.tsx` for Keksdose live
 * #307's follow-up: *"Is the creation window of the tx still different than the edit
 * window? Since the tx list still appears below when scrolling down?"*
 *
 * It was — the row EDITOR opened in this shell on a phone while the CREATE form pushed
 * the register down the page. The answer is one component, not a second copy of the
 * markup, because every previous convergence in that app drifted the moment a second
 * surface was written beside the first.
 *
 * What these pin is the behaviour a caller cannot see in the markup: the scroll lock,
 * and which Back press belongs to whom.
 */

/** The overlay sentinel on the history entry we are currently sitting on, if any —
 *  `use-overlay-history`'s own key, read the way its own tests read it. */
function liveSentinel(): string | null {
  const state = window.history.state as Record<string, unknown> | null;
  const id = state?.["__hbUiOverlayHistory"];
  return typeof id === "string" ? id : null;
}

/** jsdom fires popstate in a task, so every traversal needs a flush. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function back() {
  await act(async () => {
    const landed = new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        window.removeEventListener("popstate", done);
        resolve();
      }, 2000);
      window.addEventListener("popstate", done, { once: true });
    });
    window.history.back();
    await landed;
  });
}

function Harness({ backCloses }: { backCloses?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <FullBleedDialog
      open={open}
      onClose={() => setOpen(false)}
      closeLabel="Close"
      header={<span>Add a booking</span>}
      backCloses={backCloses}
    >
      <input aria-label="amount" />
    </FullBleedDialog>
  );
}

beforeEach(async () => {
  window.history.replaceState(null, "");
  document.body.style.overflow = "";
  await settle();
});

describe("FullBleedDialog", () => {
  it("renders a modal dialog with its header and its content", () => {
    render(<Harness />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Add a booking")).toBeInTheDocument();
    expect(screen.getByLabelText("amount")).toBeInTheDocument();
  });

  it("closes on the X", async () => {
    const onClose = vi.fn();
    render(
      <FullBleedDialog open onClose={onClose} closeLabel="Close">
        <p>body</p>
      </FullBleedDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    // Once, and only once — the count is the assertion that matters here, so it waits
    // for the exit animation rather than for the same frame (live #320 rework).
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("locks the page behind it and gives the scroll back on close", async () => {
    // Feedback #204: the table behind must not scroll or jump under the overlay.
    const view = render(<Harness />);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await settle();
    expect(document.body.style.overflow).not.toBe("hidden");
    view.unmount();
  });

  it("takes the Back press itself by default", async () => {
    render(<Harness />);
    await settle();
    await back();
    // `waitFor`, not a bare assertion: since the live #320 rework every dismissal runs
    // an exit animation first and `onClose` fires when it finishes, so "the dialog is
    // gone" is reached a frame later wherever motion is not suppressed. What this pins
    // is that Back closes it — not how many milliseconds that takes.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("leaves Back alone when the caller already owns it", async () => {
    // The transactions create card is `?action=new`, so the ROUTER already pops it.
    // A sentinel on top of that would cost two presses to close one dialog, which is
    // the bug `useOverlayHistory`'s own husk tests are about, manufactured on purpose.
    //
    // Asserted on the SENTINEL rather than on `history.length`, which jsdom does not
    // move for a `pushState` — so the weaker form passed against a dialog that had
    // pushed one, i.e. against the very thing it exists to refuse.
    render(<Harness backCloses={false} />);
    await settle();
    expect(liveSentinel()).toBeNull();
    // …and the dialog is still perfectly closable, just not by this route.
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("does push one when it does own it — the other side of the same rule", async () => {
    render(<Harness />);
    await settle();
    expect(liveSentinel()).not.toBeNull();
  });

  it("renders nothing at all while closed", () => {
    const { container } = render(
      <FullBleedDialog open={false} onClose={vi.fn()} closeLabel="Close">
        <p>body</p>
      </FullBleedDialog>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
