import { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { InlineEntityCombobox } from "../combobox";
import { useOverlayHistory } from "../../hooks/use-overlay-history";

/**
 * The mouse's BACK button over a picker — Keksdose live #309's rework.
 *
 * > *"When clicking the mouse back button now while hovering one of the selects it
 * > opens the select as long as I am holding the button down and closes select after
 * > releasing. It shall only close it if it is prior open, and not when I am seeing
 * > the dialog."*
 *
 * Two faults, one gesture, and the browser splits them across two events:
 *
 *  1. **mousedown focuses the field** — the browser reserves only the NAVIGATION for
 *     the back button, not the focus — and a field that opens its list on focus
 *     therefore opened one for a gesture that means "go back".
 *  2. **mouseup navigates**, and on a desktop the open list had no history entry of
 *     its own, so the press went past it to whatever is underneath. Round one gave
 *     the PHONE's shape of this list (a `PickerSheet`) an entry and left the pointer
 *     shape without one; measured on his own budget, Back with the transfer form's
 *     account list showing took the entire add card, amount and all.
 *
 * Reproduced in the browser before it was written here: `Input.dispatchMouseEvent`
 * with `button: "back"` over the account field left `aria-expanded="true"` on the
 * press and, on the release, `?action=new` and the whole card were gone.
 */

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

const options = [
  { value: "a1", label: "Giro" },
  { value: "a2", label: "Bargeld" },
];

/** The real composition: a dialog that owns a history entry, with an account field
 *  inside it — which is the form the report was filed from. */
function Dialog({ onCloseDialog }: { onCloseDialog: () => void }) {
  useOverlayHistory(true, onCloseDialog);
  const [value, setValue] = useState<string | null>(null);
  return (
    <div>
      <span>dialog</span>
      <InlineEntityCombobox<string>
        label="From account"
        value={value}
        onChange={setValue}
        options={options}
      />
    </div>
  );
}

beforeEach(async () => {
  window.history.replaceState(null, "");
  await settle();
});

describe("a mouse's back button over a combobox", () => {
  it("does not open the list when the press that focused it was not the left one", () => {
    render(<InlineEntityCombobox<string> label="From account" value={null} onChange={vi.fn()} options={options} />);
    const field = screen.getByRole("combobox");

    // The browser's own order: the press, then the focus it causes as a default
    // action. Both in one task, which is what the guard relies on.
    fireEvent.mouseDown(field, { button: 3 });
    fireEvent.focus(field);

    expect(field).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Giro")).not.toBeInTheDocument();
  });

  it("still opens on an ordinary left-button press", () => {
    render(<InlineEntityCombobox<string> label="From account" value={null} onChange={vi.fn()} options={options} />);
    const field = screen.getByRole("combobox");

    fireEvent.mouseDown(field, { button: 0 });
    fireEvent.focus(field);

    expect(field).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Giro")).toBeInTheDocument();
  });

  it("does not latch: a back press that focuses nothing leaves the next Tab alone", async () => {
    render(<InlineEntityCombobox<string> label="From account" value={null} onChange={vi.fn()} options={options} />);
    const field = screen.getByRole("combobox");

    // Pressed over the field, released somewhere else — so no focus follows it.
    fireEvent.mouseDown(field, { button: 3 });
    await settle();
    // …and later the user tabs in, which must behave exactly as it always did.
    fireEvent.focus(field);

    expect(field).toHaveAttribute("aria-expanded", "true");
  });

  it("closes an OPEN list and leaves the dialog standing", async () => {
    const onCloseDialog = vi.fn();
    render(<Dialog onCloseDialog={onCloseDialog} />);
    const field = screen.getByRole("combobox");

    fireEvent.mouseDown(field, { button: 0 });
    fireEvent.focus(field);
    await settle();
    expect(screen.getByText("Giro")).toBeInTheDocument();

    await back();

    expect(screen.queryByText("Giro")).not.toBeInTheDocument();
    // The half the report is about: *"not when I am seeing the dialog"*.
    expect(onCloseDialog).not.toHaveBeenCalled();
    expect(screen.getByText("dialog")).toBeInTheDocument();
  });

  it("hands the NEXT press to the dialog, with no dead entry in between", async () => {
    const onCloseDialog = vi.fn();
    render(<Dialog onCloseDialog={onCloseDialog} />);
    const field = screen.getByRole("combobox");

    fireEvent.mouseDown(field, { button: 0 });
    fireEvent.focus(field);
    await settle();
    await back();
    await settle();
    expect(onCloseDialog).not.toHaveBeenCalled();

    // Two overlays, two presses. A husk left behind by the list would swallow this
    // one silently — the failure `useOverlayHistory`'s own U-12 test is about.
    await back();
    expect(onCloseDialog).toHaveBeenCalledTimes(1);
  });
});
