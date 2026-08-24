import { useState } from "react";
import { act, render } from "@testing-library/react";
import { useOverlayHistory } from "../use-overlay-history";

/**
 * Refactor plan 2026-08-24, U-12.
 *
 * Nested overlays that close together leaked a history entry. A Modal and a
 * PickerSheet inside it each push a same-URL sentinel; when both unmount in one
 * commit the Modal's cleanup runs FIRST, finds the CURRENT sentinel is the picker's
 * rather than its own, and correctly declines to call `history.back()` — but it also
 * had no way to remove its now-buried entry. The picker's cleanup then popped,
 * landing on the Modal's dead sentinel.
 *
 * The user's next Back press consumed that dead entry: `handlePop` found an empty
 * stack and returned, so nothing visible happened. Back had to be pressed twice to
 * leave the page.
 */

const SENTINEL_KEY = "__hbUiOverlayHistory";

/** The overlay sentinel on the entry the browser is currently sitting on, if any. */
function liveSentinel(): string | null {
  const state = window.history.state as Record<string, unknown> | null;
  const id = state?.[SENTINEL_KEY];
  return typeof id === "string" ? id : null;
}

/** jsdom fires popstate in a task, so every history traversal needs a flush. */
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 25));
  });
}

function Overlay({ onClose }: { onClose?: () => void }) {
  useOverlayHistory(true, onClose ?? (() => {}));
  return null;
}

// The real composition: the sheet is a CHILD of the dialog, so both unmount in the
// same commit and React runs the dialog's cleanup first.
function Nested({ outer, inner, onCloseOuter, onCloseInner }: {
  outer: boolean;
  inner: boolean;
  onCloseOuter?: () => void;
  onCloseInner?: () => void;
}) {
  if (!outer) return null;
  return (
    <div>
      <Overlay onClose={onCloseOuter} />
      {inner ? <Overlay onClose={onCloseInner} /> : null}
    </div>
  );
}

beforeEach(async () => {
  // Start every test from a history entry with no sentinel on it.
  window.history.replaceState(null, "");
  await settle();
});

describe("useOverlayHistory", () => {
  it("pushes a sentinel while open and unwinds it on close", async () => {
    const view = render(<Nested outer inner={false} />);
    expect(liveSentinel()).not.toBeNull();
    view.unmount();
    await settle();
    expect(liveSentinel()).toBeNull();
  });

  it("closes the overlay when Back pops its entry", async () => {
    const onClose = vi.fn();
    render(<Nested outer inner={false} onCloseOuter={onClose} />);
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 25));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(liveSentinel()).toBeNull();
  });

  it("leaves no dead entry when nested overlays close together (U-12)", async () => {
    // Dialog opens, then the sheet inside it opens in a LATER commit (that ordering is
    // what makes the dialog's sentinel the buried one), then both unmount at once.
    const view = render(<Nested outer inner={false} />);
    const outerSentinel = liveSentinel();
    view.rerender(<Nested outer inner />);
    const innerSentinel = liveSentinel();
    expect(innerSentinel).not.toBe(outerSentinel);

    view.unmount();
    await settle();

    // Before the fix this was the DIALOG's sentinel — an entry no live overlay owned,
    // sitting between the user and the page they were on.
    expect(liveSentinel()).toBeNull();
  });

  it("does not leave a husk for the next overlay to sit on (U-12)", () => {
    // The user-visible half of the same defect. After the dialog+sheet close, the
    // leftover entry stays between the user and the page. Open one more overlay and
    // dismiss it with Back: we must land on the PAGE, not on the husk — otherwise the
    // next Back press is spent clearing something that is not on screen.
    return (async () => {
      const view = render(<Nested outer inner={false} />);
      view.rerender(<Nested outer inner />);
      view.unmount();
      await settle();

      const again = render(<Nested outer inner={false} />);
      await act(async () => {
        window.history.back();
        await new Promise((r) => setTimeout(r, 25));
      });
      expect(liveSentinel()).toBeNull();
      again.unmount();
      await settle();
    })();
  });

  it("closes only the top overlay when Back pops the inner sentinel", async () => {
    const onOuter = vi.fn();
    const onInner = vi.fn();
    const view = render(<Nested outer inner={false} onCloseOuter={onOuter} onCloseInner={onInner} />);
    view.rerender(<Nested outer inner onCloseOuter={onOuter} onCloseInner={onInner} />);
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 25));
    });
    expect(onInner).toHaveBeenCalledTimes(1);
    expect(onOuter).not.toHaveBeenCalled();
    // ...and we are back on the dialog's own sentinel, which it still owns.
    expect(liveSentinel()).not.toBeNull();
    view.unmount();
    await settle();
  });

  it("cleans up an overlay whose entry a Back press already consumed", async () => {
    // The inner overlay is closed BY Back, so its entry is gone before its cleanup
    // runs. Nothing must be marked as owed for it.
    function Host() {
      const [inner, setInner] = useState(true);
      return (
        <div>
          <Overlay />
          {inner ? <Overlay onClose={() => setInner(false)} /> : null}
        </div>
      );
    }
    const view = render(<Host />);
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 25));
    });
    view.unmount();
    await settle();
    expect(liveSentinel()).toBeNull();
  });
});
