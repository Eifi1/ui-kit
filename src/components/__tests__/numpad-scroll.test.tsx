import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NumberPadSheet } from "../numpad-sheet";
import { Modal } from "../modal";
import { PickerSheet } from "../picker-sheet";

/**
 * The numpad is a KEYBOARD, so it does not freeze the page.
 *
 * Keksdose live #317, filed from a receipt on a 406px phone: *"Background not
 * scrollable when the amount input calculator field is open"*.
 *
 * This sheet exists because a PWA cannot swap the system keyboard for its own — it
 * suppresses the OS keyboard with `inputMode="none"` on the host field and paints
 * its keys in the freed space. An OS keyboard takes the bottom of the screen and
 * leaves you free to scroll what is left; it is how you reach the thing you are
 * typing about when the keys cover it. Locking here took that away at exactly the
 * moment it matters most: correcting a receipt total against the running line sum,
 * where the figure being compared sits below the keypad (and which live #314, filed
 * three minutes earlier, is about making sticky).
 *
 * The distinction is modal-vs-not, not sheet-vs-not, so the two cases below are a
 * pair: the modal holders keep their lock, and this one does not have one.
 */
const noop = () => {};

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("NumberPadSheet and the page behind it (live #317)", () => {
  it("leaves the page scrollable while it is open", () => {
    render(<NumberPadSheet value="12" onChange={noop} onDone={noop} />);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("still leaves it scrollable once it unmounts", () => {
    // The guard against fixing this by releasing a lock that was never taken: a
    // count that goes negative would restore the wrong value for whoever holds one.
    const { unmount } = render(<NumberPadSheet value="12" onChange={noop} onDone={noop} />);
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("does not release a lock some MODAL above it is holding", () => {
    // The gesture that matters: a transaction dialog is open (locked), the user taps
    // the amount, the numpad opens inside it. The page must stay locked — the dialog
    // is what owns that decision — and it must still be locked after the pad closes.
    const { rerender } = render(
      <Modal onClose={noop}>
        <NumberPadSheet value="12" onChange={noop} onDone={noop} />
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <Modal onClose={noop}>
        <span />
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("is not vacuous: a MODAL sheet on the same hook still locks", () => {
    // If `useBodyScrollLock` itself broke, every assertion above would pass while
    // nothing in the package locked anything.
    render(
      <PickerSheet open onClose={noop} title="Account" query="" onQueryChange={noop}>
        <li />
      </PickerSheet>,
    );
    expect(document.body.style.overflow).toBe("hidden");
  });
});
