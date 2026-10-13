import { StrictMode, useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AmountInput } from "../amount-input";
import { FullBleedDialog } from "../full-bleed-dialog";
import { Modal } from "../modal";
import { PHONE_WIDTH, stubViewportWidth } from "../../test/viewport";

/**
 * keksdose live #402 (0.33.1): the transactions create card autofocuses its amount, and
 * on a phone the field lost focus the instant it got it — and the numpad sheet with it,
 * which shows only while the field is focused. After opening, `document.activeElement`
 * was the `role="dialog"` container.
 *
 * React honours `autoFocus` while it commits; the focus trap engaged in an effect after
 * that commit and focused the dialog regardless. It now leaves focus alone when a child
 * already has it, and remembers the opener before the commit, so closing still goes
 * back to the button that opened the dialog rather than into the one that is closing.
 * Nothing changes for a dialog whose contents ask for nothing: it still takes focus
 * itself, so opening does not pull the phone keyboard up unasked.
 */

/** A press on a button, focus included — jsdom's `click` does not focus its target,
 *  and where focus was when the dialog opened is half of what is under test. */
function press(el: HTMLElement) {
  act(() => {
    el.focus();
  });
  fireEvent.click(el);
}

/** jsdom fires popstate in a task, and `useOverlayHistory` pushes one per overlay. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The field the app autofocuses on purpose. */
function Amount() {
  // eslint-disable-next-line jsx-a11y/no-autofocus -- the case under test
  return <input aria-label="amount" autoFocus />;
}

/* ── FullBleedDialog ───────────────────────────────────────────────────────── */

function CreateCard({
  plain = false,
  mountWhileOpen = false,
}: {
  /** A plain field that does not ask for focus. */
  plain?: boolean;
  /** Render the dialog only while it is open, rather than always with `open`. */
  mountWhileOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Add
      </button>
      {(open || !mountWhileOpen) && (
        <FullBleedDialog open={open} onClose={() => setOpen(false)} closeLabel="Close" title="New transaction">
          {plain ? <input aria-label="amount" /> : <Amount />}
          <input aria-label="payee" />
        </FullBleedDialog>
      )}
    </div>
  );
}

/** The sheet only exists on a phone, and jsdom's matchMedia is undefined (the desktop
 *  fallback), so the field never reaches its numpad branch otherwise. */
function asPhone() {
  stubViewportWidth(PHONE_WIDTH, { coarse: true, reducedMotion: true });
}

describe("FullBleedDialog and an autofocused field (0.33.1)", () => {
  afterEach(() => {
    // @ts-expect-error jsdom leaves it undefined by default; restore that.
    delete window.matchMedia;
  });

  it("leaves focus on the field", async () => {
    render(<CreateCard />);
    press(screen.getByRole("button", { name: "Add" }));
    await settle();
    expect(screen.getByLabelText("amount")).toHaveFocus();
    expect(screen.getByRole("dialog")).not.toHaveFocus();
  });

  it("keeps the numpad up on a phone — the create card as it ships", async () => {
    asPhone();
    function PhoneCard() {
      const [open, setOpen] = useState(false);
      const [amount, setAmount] = useState("");
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Add
          </button>
          <FullBleedDialog open={open} onClose={() => setOpen(false)} closeLabel="Close" title="New transaction">
            {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the case under test */}
            <AmountInput value={amount} onChange={setAmount} aria-label="amount" autoFocus />
          </FullBleedDialog>
        </div>
      );
    }
    render(<PhoneCard />);
    press(screen.getByRole("button", { name: "Add" }));
    await settle();
    expect(screen.getByLabelText("amount")).toHaveFocus();
    // The pad renders only while the field is focused; the trap taking focus away
    // unmounted it in the same frame it appeared.
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("still takes focus itself when nothing inside asks for it", async () => {
    render(<CreateCard plain />);
    press(screen.getByRole("button", { name: "Add" }));
    await settle();
    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("gives focus back to the button that opened it, not to the field", async () => {
    render(<CreateCard />);
    const trigger = screen.getByRole("button", { name: "Add" });
    press(trigger);
    await settle();
    expect(trigger).not.toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("holds under StrictMode, which keksdose develops in", async () => {
    // StrictMode rehearses a component's effects when it MOUNTS — cleanup, then the
    // effect again — so the shape where it bites is a dialog rendered only while open.
    // React does not autofocus again for the rehearsal; a trap that restored focus in
    // that cleanup would leave the field on the opener for good.
    render(
      <StrictMode>
        <CreateCard mountWhileOpen />
      </StrictMode>,
    );
    const trigger = screen.getByRole("button", { name: "Add" });
    press(trigger);
    await settle();
    expect(screen.getByLabelText("amount")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

/* ── Modal ─────────────────────────────────────────────────────────────────── */

/** With `open`: the panel stays mounted while it lowers, and the trap is released as
 *  `open` turns false — so the field that had focus is still in the DOM at that moment,
 *  and an opener read after the autofocus would have been handed focus straight back. */
function EditForm({ plain = false }: { plain?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal open={open} onClose={() => setOpen(false)} aria-label="Edit">
        {plain ? <input aria-label="amount" /> : <Amount />}
        <button type="button" onClick={() => setOpen(false)}>
          Save
        </button>
      </Modal>
    </>
  );
}

/** Without `open`: mounted means open, the shape most callers use. */
function MountedForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} aria-label="Edit">
          <Amount />
          <button type="button" onClick={() => setOpen(false)}>
            Save
          </button>
        </Modal>
      )}
    </>
  );
}

describe("Modal and an autofocused field (0.33.1)", () => {
  it("leaves focus on the field, and the trigger gets it back when `open` turns false", async () => {
    render(<EditForm />);
    const trigger = screen.getByRole("button", { name: "Open" });
    press(trigger);
    await settle();
    expect(screen.getByLabelText("amount")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(trigger).toHaveFocus();
  });

  it("the same when the caller mounts it only while open", async () => {
    render(<MountedForm />);
    const trigger = screen.getByRole("button", { name: "Open" });
    press(trigger);
    await settle();
    expect(screen.getByLabelText("amount")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(trigger).toHaveFocus();
  });

  it("still focuses the panel when nothing inside asks for it", async () => {
    render(<EditForm plain />);
    press(screen.getByRole("button", { name: "Open" }));
    await settle();
    expect(screen.getByRole("dialog", { name: "Edit" })).toHaveFocus();
  });

  it("holds under StrictMode, both shapes", async () => {
    // Mounted while open is the shape StrictMode rehearses (see FullBleedDialog's case);
    // `open` is the shape whose release happens with the panel still in the DOM.
    for (const Form of [MountedForm, EditForm]) {
      const { unmount } = render(
        <StrictMode>
          <Form />
        </StrictMode>,
      );
      const trigger = screen.getByRole("button", { name: "Open" });
      press(trigger);
      await settle();
      expect(screen.getByLabelText("amount")).toHaveFocus();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(trigger).toHaveFocus();
      unmount();
    }
  });
});
